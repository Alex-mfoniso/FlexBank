import {
  ProviderAccount,
  ProviderRecipient,
  ProviderTransfer,
  ProviderWebhookEvent,
  ProviderConnectivityCheck,
  ProviderCapability,
  ResolveAccountParams,
  CreateRecipientParams,
  InitiateTransferParams,
  VerifyTransferParams,
} from "./provider.types";

/**
 * Capability Provider: Bank account resolution and ownership validation.
 */
export interface AccountVerificationProvider {
  resolveAccount(params: ResolveAccountParams): Promise<ProviderAccount>;
}

/**
 * Capability Provider: Transfer recipient creation and counterparty management.
 */
export interface RecipientProvider {
  createRecipient(params: CreateRecipientParams): Promise<ProviderRecipient>;
}

/**
 * Capability Provider: Money movement, disbursements, and payout verification.
 */
export interface TransferProvider {
  initiateTransfer(params: InitiateTransferParams): Promise<ProviderTransfer>;
  verifyTransfer(params: VerifyTransferParams): Promise<ProviderTransfer>;
}

/**
 * Capability Provider: Upstream webhook signature authentication and event ingestion.
 */
export interface WebhookProvider {
  verifyWebhookSignature(signature: string, payload: string | Buffer): boolean;
  parseWebhookEvent(payload: unknown): ProviderWebhookEvent;
}

/**
 * Capability Provider: Live diagnostic health and connectivity testing.
 */
export interface ConnectivityProvider {
  verifyConnectivity(): Promise<ProviderConnectivityCheck>;
}

/**
 * Unified Financial Provider Contract.
 * Every provider adapter (Paystack, M-Pesa, etc.) implements this base abstraction.
 * Specific financial capabilities are queried via `hasCapability(...)` or cast to specific interfaces.
 */
export interface FinancialProvider extends ConnectivityProvider {
  /** Unique machine-readable identifier (e.g. "paystack") */
  readonly id: string;

  /** Human-readable provider brand name (e.g. "Paystack") */
  readonly name: string;

  /** List of financial capabilities supported by this provider adapter */
  readonly capabilities: readonly ProviderCapability[];

  /** Helper to verify whether this provider supports a specific capability */
  hasCapability(capability: ProviderCapability): boolean;
}
