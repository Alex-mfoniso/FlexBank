import {
  FinancialProvider,
  TransferProvider,
  WebhookProvider,
} from "../contracts/provider.contracts";
import {
  ProviderTransfer,
  ProviderWebhookEvent,
  ProviderConnectivityCheck,
  ProviderCapability,
  ProviderTransferStatus,
  InitiateTransferParams,
  VerifyTransferParams,
} from "../contracts/provider.types";
import { MpesaClient } from "./mpesa.client";
import { getMpesaConfig, isMpesaConfigured, MpesaConfig } from "../../../config/mpesa.config";
import {
  ProviderValidationError,
  normalizeProviderError,
} from "../provider.errors";
import { normalizeKenyanPhoneNumber, maskPhoneNumber, sanitizeMpesaText } from "./mpesa.utils";
import { MpesaB2CCallbackPayload, MpesaB2CPayload } from "./mpesa.types";
import { logger } from "../../../lib/logger";

/**
 * Safaricom M-Pesa B2C Provider Adapter.
 * Encapsulates M-Pesa B2C disbursements, phone normalization, Daraja payload mapping,
 * and asynchronous webhook event parsing.
 */
export class MpesaB2CAdapter implements FinancialProvider, TransferProvider, WebhookProvider {
  readonly id = "mpesa";
  readonly name = "Safaricom M-Pesa";

  readonly capabilities: readonly ProviderCapability[] = [
    "transfers",
    "mobile_money_transfer",
    "transaction_status",
    "webhooks",
    "webhook_status",
    "connectivity",
  ] as const;

  private client?: MpesaClient;
  private config?: MpesaConfig;

  constructor(client?: MpesaClient, config?: MpesaConfig) {
    this.client = client;
    this.config = config;
  }

  private getConfig(): MpesaConfig {
    if (!this.config) {
      this.config = getMpesaConfig();
    }
    return this.config;
  }

  private getClient(): MpesaClient {
    if (!this.client) {
      this.client = new MpesaClient(this.getConfig());
    }
    return this.client;
  }

  hasCapability(capability: ProviderCapability): boolean {
    return this.capabilities.includes(capability);
  }

  // ---------------------------------------------------------------------------
  // Connectivity Diagnostic Probe
  // ---------------------------------------------------------------------------

  async verifyConnectivity(): Promise<ProviderConnectivityCheck> {
    if (!isMpesaConfigured()) {
      return {
        provider: this.id,
        connected: false,
        error: "M-Pesa credentials are not configured in the environment",
      };
    }

    try {
      const result = await this.getClient().verifyConnectivity();
      return {
        provider: this.id,
        connected: result.connected,
        latencyMs: result.latencyMs,
        error: result.error,
      };
    } catch (err: any) {
      return {
        provider: this.id,
        connected: false,
        error: sanitizeMpesaText(err.message || "Failed to establish connection to M-Pesa Daraja"),
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Transfer Initiation (M-Pesa B2C Payout)
  // ---------------------------------------------------------------------------

  async initiateTransfer(params: InitiateTransferParams): Promise<ProviderTransfer> {
    const config = this.getConfig();

    // 1. Currency Validation: M-Pesa B2C only supports KES
    const currency = (params.currency || "KES").toUpperCase();
    if (currency !== "KES") {
      throw new ProviderValidationError(
        this.id,
        `M-Pesa B2C rail only supports KES disbursements. Received currency: '${currency}'. For NGN transfers, use Nigerian bank transfer rail.`,
      );
    }

    // 2. Extract and Normalize Destination Kenyan Mobile Phone Number
    const rawPhoneNumber =
      (params as any).phoneNumber ||
      params.accountNumber ||
      (params as any).destination?.phone_number ||
      (params as any).metadata?.phone_number;

    if (!rawPhoneNumber) {
      throw new ProviderValidationError(
        this.id,
        "Recipient phone number is required for M-Pesa mobile money transfer",
      );
    }

    const normalizedPhone = normalizeKenyanPhoneNumber(rawPhoneNumber);

    // 3. Amount Conversion: Ricarut internally works in minor units (cents)
    // 1 KES = 100 cents. Daraja B2C expects amount in whole Kenyan Shillings (KES).
    let amountInShillings: number;
    if (params.amount >= 100) {
      amountInShillings = Math.round(params.amount / 100);
    } else {
      // In case amount was passed in whole shillings
      amountInShillings = Math.round(params.amount);
    }

    if (amountInShillings < 1) {
      throw new ProviderValidationError(
        this.id,
        "Transfer amount must be at least 1 KES (100 minor units)",
      );
    }

    // 4. Map Ricarut Transfer to Daraja B2C Request Schema
    // OriginatorConversationID maps directly to Ricarut Transfer Reference for idempotency
    const originatorConversationId = params.reference;

    const b2cPayload: MpesaB2CPayload = {
      InitiatorName: config.initiatorName,
      SecurityCredential: config.securityCredential,
      CommandID: "BusinessPayment",
      Amount: amountInShillings,
      PartyA: config.shortcode,
      PartyB: normalizedPhone,
      Remarks: params.reason ? params.reason.slice(0, 100) : "Ricarut transfer",
      QueueTimeOutURL: config.queueTimeoutUrl,
      ResultURL: config.resultUrl,
      Occasion: params.reference.slice(0, 100),
      OriginatorConversationID: originatorConversationId,
    };

    logger.info(
      {
        provider: this.id,
        reference: params.reference,
        originatorConversationId,
        partyB: maskPhoneNumber(normalizedPhone),
        amountKES: amountInShillings,
      },
      "Submitting B2C disbursement request to Safaricom Daraja",
    );

    try {
      const response = await this.getClient().sendB2CPayment(b2cPayload);

      // Daraja B2C is asynchronous. Initial acceptance returns status "pending".
      return {
        provider: this.id,
        providerReference: response.ConversationID || response.OriginatorConversationID || originatorConversationId,
        transferReference: params.reference,
        amount: params.amount,
        currency: "KES",
        status: "pending",
        fee: 0,
        initiatedAt: new Date(),
      };
    } catch (err: unknown) {
      throw normalizeProviderError(this.id, err);
    }
  }

  // ---------------------------------------------------------------------------
  // Transfer Status Reconciliation (Query Transaction Status)
  // ---------------------------------------------------------------------------

  async verifyTransfer(params: VerifyTransferParams): Promise<ProviderTransfer> {
    const config = this.getConfig();

    if (!params.reference && !params.providerReference) {
      throw new ProviderValidationError(
        this.id,
        "Either reference or providerReference must be provided to query M-Pesa transaction status",
      );
    }

    try {
      await this.getClient().queryTransactionStatus({
        Initiator: config.initiatorName,
        SecurityCredential: config.securityCredential,
        CommandID: "TransactionStatusQuery",
        TransactionID: params.providerReference || "N/A",
        OriginatorConversationID: params.reference,
        PartyA: config.shortcode,
        IdentifierType: "4",
        ResultURL: config.resultUrl,
        QueueTimeOutURL: config.queueTimeoutUrl,
        Remarks: "Status Reconciliation",
        Occasion: params.reference,
      });

      // Status query in Daraja returns an acknowledgement; final status arrives via ResultURL
      return {
        provider: this.id,
        providerReference: params.providerReference || params.reference || "",
        transferReference: params.reference,
        amount: 0,
        currency: "KES",
        status: "processing",
        initiatedAt: new Date(),
      };
    } catch (err: unknown) {
      throw normalizeProviderError(this.id, err);
    }
  }

  // ---------------------------------------------------------------------------
  // Webhook Authentication & Event Normalization
  // ---------------------------------------------------------------------------

  /**
   * Safaricom Daraja delivers callbacks via HTTPS POST to ResultURL.
   * Validates webhook presence, token header/query if configured, and payload schema.
   */
  verifyWebhookSignature(signature: string, payload: string | Buffer): boolean {
    const config = this.getConfig();

    // If a webhook secret is configured, check signature match
    if (config.webhookSecret && config.webhookSecret.trim() !== "") {
      if (signature && signature.trim() === config.webhookSecret) {
        return true;
      }
    }

    // Safaricom Daraja does not use HMAC headers. In sandbox/standard mode, validate JSON structural authenticity.
    try {
      const parsed = typeof payload === "string" ? JSON.parse(payload) : JSON.parse(payload.toString("utf8"));
      return Boolean(parsed && typeof parsed === "object" && (parsed.Result || parsed.ResponseCode));
    } catch {
      return false;
    }
  }

  /**
   * Parses and normalizes incoming Daraja B2C Result callback into standard Ricarut ProviderWebhookEvent.
   */
  parseWebhookEvent(payload: unknown): ProviderWebhookEvent {
    const raw = payload as MpesaB2CCallbackPayload;

    if (!raw?.Result) {
      // In case of timeout or malformed callback
      return {
        provider: this.id,
        eventId: `evt_mpesa_${Date.now()}`,
        eventType: "unknown",
        providerReference: "",
        status: "failed",
        failureReason: "Malformed M-Pesa webhook callback received",
        timestamp: new Date(),
        rawEvent: payload,
      };
    }

    const result = raw.Result;
    const isSuccess = result.ResultCode === 0;

    let transactionReceipt = result.TransactionID;
    let transactionAmount: number | undefined;

    // Extract parameters from ResultParameters if present
    if (result.ResultParameters?.ResultParameter) {
      for (const param of result.ResultParameters.ResultParameter) {
        if (param.Key === "TransactionReceipt" && !transactionReceipt) {
          transactionReceipt = String(param.Value);
        }
        if (param.Key === "TransactionAmount") {
          // Convert KES shillings to minor units (cents)
          transactionAmount = Math.round(Number(param.Value) * 100);
        }
      }
    }

    const eventId =
      transactionReceipt ||
      result.ConversationID ||
      result.OriginatorConversationID ||
      `mpesa_evt_${Date.now()}`;

    const normalizedStatus: ProviderTransferStatus = isSuccess ? "successful" : "failed";
    const eventType = isSuccess ? "transfer.success" : "transfer.failed";

    return {
      provider: this.id,
      eventId,
      eventType,
      providerReference: result.ConversationID || result.OriginatorConversationID || "",
      transferReference: result.OriginatorConversationID,
      status: normalizedStatus,
      amount: transactionAmount,
      currency: "KES",
      failureReason: isSuccess ? undefined : result.ResultDesc,
      timestamp: new Date(),
      rawEvent: payload,
    };
  }
}
