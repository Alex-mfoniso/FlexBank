import crypto from "crypto";
import {
  FinancialProvider,
  AccountVerificationProvider,
  RecipientProvider,
  TransferProvider,
  WebhookProvider,
} from "../contracts/provider.contracts";
import {
  ProviderAccount,
  ProviderRecipient,
  ProviderTransfer,
  ProviderWebhookEvent,
  ProviderConnectivityCheck,
  ProviderCapability,
  ProviderTransferStatus,
  ResolveAccountParams,
  CreateRecipientParams,
  InitiateTransferParams,
  VerifyTransferParams,
} from "../contracts/provider.types";
import { PaystackClient } from "./paystack.client";
import { getPaystackConfig, isPaystackConfigured } from "../../../config/paystack.config";
import { normalizeProviderError } from "../provider.errors";
import { sanitizeProviderText } from "./paystack.errors";

/**
 * Paystack Provider Adapter.
 * Translates between Ricarut's normalized provider contracts and Paystack's API.
 * Encapsulates all Paystack-specific endpoints, request formatting, and response normalization.
 */
export class PaystackAdapter
  implements
    FinancialProvider,
    AccountVerificationProvider,
    RecipientProvider,
    TransferProvider,
    WebhookProvider
{
  readonly id = "paystack";
  readonly name = "Paystack";

  readonly capabilities: readonly ProviderCapability[] = [
    "account_verification",
    "bank_account_resolution",
    "recipient_management",
    "transfers",
    "bank_transfer",
    "webhooks",
    "webhook_status",
    "connectivity",
  ] as const;

  private client?: PaystackClient;
  private readonly recipientCache = new Map<string, string>();

  constructor(client?: PaystackClient) {
    this.client = client;
  }

  private getClient(): PaystackClient {
    if (!this.client) {
      this.client = new PaystackClient();
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
    if (!isPaystackConfigured()) {
      return {
        provider: this.id,
        connected: false,
        error: "Paystack secret key is not configured in the environment",
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
        error: sanitizeProviderText(err.message || "Failed to establish connection to Paystack"),
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Account Verification (Resolve NUBAN Bank Account)
  // ---------------------------------------------------------------------------

  async resolveAccount(params: ResolveAccountParams): Promise<ProviderAccount> {
    const query = new URLSearchParams({
      account_number: params.accountNumber,
      bank_code: params.bankCode,
    });

    try {
      const response = await this.getClient().get<{
        account_number: string;
        account_name: string;
        bank_id?: number;
      }>(`/bank/resolve?${query.toString()}`);

      if (!response.data) {
        throw new Error("Paystack did not return account resolution data");
      }

      return {
        provider: this.id,
        accountNumber: response.data.account_number,
        accountName: response.data.account_name,
        bankCode: params.bankCode,
        currency: params.currency || "NGN",
      };
    } catch (err: unknown) {
      throw normalizeProviderError(this.id, err);
    }
  }

  // ---------------------------------------------------------------------------
  // Recipient Management (Register Counterparty for Payouts)
  // ---------------------------------------------------------------------------

  async createRecipient(params: CreateRecipientParams): Promise<ProviderRecipient> {
    const payload = {
      type: params.type || "nuban",
      name: params.name,
      account_number: params.accountNumber,
      bank_code: params.bankCode,
      currency: params.currency || "NGN",
      description: params.description,
    };

    try {
      const response = await this.getClient().post<{
        recipient_code: string;
        type: string;
        name: string;
        currency: string;
        details?: {
          account_number?: string;
          account_name?: string;
          bank_code?: string;
          bank_name?: string;
        };
      }>("/transferrecipient", payload);

      if (!response.data?.recipient_code) {
        throw new Error("Paystack did not return a valid recipient reference");
      }

      const data = response.data;
      return {
        provider: this.id,
        recipientReference: data.recipient_code,
        accountNumber: data.details?.account_number || params.accountNumber,
        accountName: data.details?.account_name || data.name || params.name,
        bankCode: data.details?.bank_code || params.bankCode,
        currency: data.currency || params.currency || "NGN",
        type: data.type || params.type || "nuban",
      };
    } catch (err: unknown) {
      throw normalizeProviderError(this.id, err);
    }
  }

  // ---------------------------------------------------------------------------
  // Transfer Initiation & Verification
  // ---------------------------------------------------------------------------

  async initiateTransfer(params: InitiateTransferParams): Promise<ProviderTransfer> {
    try {
      let recipientCode = params.recipientReference;

      // Handle internal recipient resolution if no recipientReference was provided directly
      if (!recipientCode) {
        if (!params.bankCode || !params.accountNumber) {
          throw new Error("Destination bankCode and accountNumber are required to initiate transfer");
        }

        const cacheKey = `${params.bankCode}:${params.accountNumber}`;
        recipientCode = this.recipientCache.get(cacheKey);

        if (!recipientCode) {
          // Resolve account holder name if not supplied
          let name = params.accountName;
          if (!name) {
            try {
              const resolved = await this.resolveAccount({
                accountNumber: params.accountNumber,
                bankCode: params.bankCode,
                currency: params.currency || "NGN",
              });
              name = resolved.accountName;
            } catch {
              name = `Account ${params.accountNumber}`;
            }
          }

          const recipient = await this.createRecipient({
            name: name || `Account ${params.accountNumber}`,
            accountNumber: params.accountNumber,
            bankCode: params.bankCode,
            currency: params.currency || "NGN",
            type: "nuban",
          });

          recipientCode = recipient.recipientReference;
          this.recipientCache.set(cacheKey, recipientCode);
        }
      }

      const payload = {
        source: params.source || "balance",
        amount: params.amount,
        recipient: recipientCode,
        reference: params.reference,
        reason: params.reason,
      };

      const response = await this.getClient().post<{
        reference?: string;
        transfer_code?: string;
        amount: number;
        currency: string;
        status: string;
        fee?: number;
        createdAt?: string;
      }>("/transfer", payload);

      if (!response.data) {
        throw new Error("Paystack did not return transfer response data");
      }

      const data = response.data;
      return {
        provider: this.id,
        providerReference: data.transfer_code || "",
        transferReference: data.reference || params.reference,
        amount: data.amount,
        currency: data.currency || params.currency || "NGN",
        status: this.mapTransferStatus(data.status),
        fee: data.fee,
        initiatedAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      };
    } catch (err: unknown) {
      throw normalizeProviderError(this.id, err);
    }
  }

  async verifyTransfer(params: VerifyTransferParams): Promise<ProviderTransfer> {
    if (!params.reference && !params.providerReference) {
      throw normalizeProviderError(
        this.id,
        new Error("Either reference or providerReference must be provided for transfer verification"),
      );
    }

    const endpoint = params.reference
      ? `/transfer/verify/${encodeURIComponent(params.reference)}`
      : `/transfer/${encodeURIComponent(params.providerReference!)}`;

    try {
      const response = await this.getClient().get<{
        reference?: string;
        transfer_code?: string;
        amount: number;
        currency: string;
        status: string;
        fee?: number;
        createdAt?: string;
        updatedAt?: string;
        failures?: unknown;
        gateway_response?: string;
      }>(endpoint);

      if (!response.data) {
        throw new Error("Paystack did not return transfer verification data");
      }

      const data = response.data;
      return {
        provider: this.id,
        providerReference: data.transfer_code || params.providerReference || "",
        transferReference: data.reference || params.reference,
        amount: data.amount,
        currency: data.currency || "NGN",
        status: this.mapTransferStatus(data.status),
        fee: data.fee,
        failureReason: data.gateway_response || (data.failures ? String(data.failures) : undefined),
        initiatedAt: data.createdAt ? new Date(data.createdAt) : undefined,
        completedAt: data.updatedAt ? new Date(data.updatedAt) : undefined,
      };
    } catch (err: unknown) {
      throw normalizeProviderError(this.id, err);
    }
  }

  // ---------------------------------------------------------------------------
  // Webhook Authentication & Event Parsing
  // ---------------------------------------------------------------------------

  verifyWebhookSignature(signature: string, payload: string | Buffer): boolean {
    if (!signature || !payload) return false;

    try {
      const config = getPaystackConfig();
      const hmac = crypto.createHmac("sha512", config.secretKey);
      hmac.update(payload);
      const computed = hmac.digest("hex");

      const sigBuffer = Buffer.from(signature, "utf8");
      const computedBuffer = Buffer.from(computed, "utf8");

      if (sigBuffer.length !== computedBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(sigBuffer, computedBuffer);
    } catch {
      return false;
    }
  }

  parseWebhookEvent(payload: any): ProviderWebhookEvent {
    if (!payload || typeof payload !== "object") {
      throw new Error("Malformed Paystack webhook payload");
    }

    const eventName: string = payload.event || "";
    const data = payload.data || {};

    let eventType: ProviderWebhookEvent["eventType"] = "unknown";
    if (eventName === "transfer.success") eventType = "transfer.success";
    else if (eventName === "transfer.failed") eventType = "transfer.failed";
    else if (eventName === "transfer.reversed") eventType = "transfer.reversed";

    let status: ProviderTransferStatus;
    if (eventName === "transfer.success") {
      status = "successful";
    } else if (eventName === "transfer.failed") {
      status = "failed";
    } else if (eventName === "transfer.reversed") {
      status = "reversed";
    } else {
      status = this.mapTransferStatus(data.status);
    }

    const eventId = String(
      data.id ??
        payload.id ??
        (data.transfer_code
          ? `${eventName}:${data.transfer_code}`
          : data.reference
          ? `${eventName}:${data.reference}`
          : crypto.randomUUID()),
    );

    const failureReason =
      data.gateway_response ||
      data.reason ||
      (data.failures ? (typeof data.failures === "string" ? data.failures : JSON.stringify(data.failures)) : undefined);

    return {
      provider: this.id,
      eventId,
      eventType,
      providerReference: data.transfer_code || "",
      transferReference: data.reference,
      status,
      amount: data.amount,
      currency: data.currency,
      failureReason,
      timestamp: data.transferred_at ? new Date(data.transferred_at) : new Date(),
      rawEvent: payload,
    };
  }

  // ---------------------------------------------------------------------------
  // Internal Mapping Helpers
  // ---------------------------------------------------------------------------

  private mapTransferStatus(status: string | undefined): ProviderTransferStatus {
    if (!status) return "pending";

    const normalized = status.toLowerCase();
    switch (normalized) {
      case "success":
      case "successful":
        return "successful";
      case "failed":
      case "rejected":
        return "failed";
      case "reversed":
        return "reversed";
      case "processing":
      case "pending":
      case "queued":
      case "received":
        return "processing";
      default:
        return "pending";
    }
  }
}
