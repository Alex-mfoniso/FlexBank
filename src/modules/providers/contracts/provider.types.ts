/**
 * Provider Capability Identifiers
 */
export type ProviderCapability =
  | "account_verification"
  | "recipient_management"
  | "transfers"
  | "webhooks"
  | "connectivity";

/**
 * Normalized status of a financial transfer across any upstream provider.
 */
export type ProviderTransferStatus =
  | "pending"
  | "processing"
  | "successful"
  | "failed"
  | "reversed";

/**
 * Normalized account verification result.
 * Represents a resolved bank account, independent of upstream provider nuances.
 */
export interface ProviderAccount {
  /** Identifier of the provider that performed the resolution (e.g. "paystack") */
  readonly provider: string;
  /** Bank account number (e.g. 10-digit NUBAN) */
  readonly accountNumber: string;
  /** Resolved account holder name verified with financial institution */
  readonly accountName: string;
  /** Standardized bank code */
  readonly bankCode: string;
  /** Human-readable bank or institution name (if provided) */
  readonly bankName?: string;
  /** ISO 4217 Currency Code (e.g. "NGN") */
  readonly currency: string;
}

/**
 * Normalized transfer recipient result.
 * Counterparty registered with an upstream financial provider for outbound payouts.
 */
export interface ProviderRecipient {
  /** Identifier of the provider (e.g. "paystack") */
  readonly provider: string;
  /** Upstream provider recipient reference/token (e.g. Paystack recipient code) */
  readonly recipientReference: string;
  /** Destination bank account number */
  readonly accountNumber: string;
  /** Counterparty name */
  readonly accountName: string;
  /** Standardized bank code */
  readonly bankCode: string;
  /** ISO 4217 Currency Code */
  readonly currency: string;
  /** Recipient account type (e.g. "nuban", "mobile_money") */
  readonly type: string;
}

/**
 * Normalized transfer execution result.
 * Represents an outbound disbursement across any upstream provider.
 */
export interface ProviderTransfer {
  /** Identifier of the provider (e.g. "paystack") */
  readonly provider: string;
  /** Upstream provider transfer reference/identifier */
  readonly providerReference: string;
  /** Ricarut internal transfer reference */
  readonly transferReference?: string;
  /** Disbursed amount in minor units (e.g. kobo, cents) */
  readonly amount: number;
  /** ISO 4217 Currency Code */
  readonly currency: string;
  /** Normalized operational status */
  readonly status: ProviderTransferStatus;
  /** Provider fee incurred in minor units (if available) */
  readonly fee?: number;
  /** Normalized failure reason or error message if status is "failed" */
  readonly failureReason?: string;
  /** Timestamp when transfer was accepted by provider */
  readonly initiatedAt?: Date;
  /** Timestamp when transfer reached final terminal state */
  readonly completedAt?: Date;
}

/**
 * Normalized webhook event.
 * Represents an asynchronous notification delivered by an upstream provider.
 */
export interface ProviderWebhookEvent {
  /** Identifier of the provider (e.g. "paystack") */
  readonly provider: string;
  /** Unique provider event identifier (for deduplication/idempotency) */
  readonly eventId: string;
  /** Normalized event type */
  readonly eventType:
    | "transfer.success"
    | "transfer.failed"
    | "transfer.reversed"
    | "account.verified"
    | "unknown";
  /** Upstream provider reference (transfer code, transaction ID, etc.) */
  readonly providerReference: string;
  /** Ricarut internal transfer or transaction reference (if matched) */
  readonly transferReference?: string;
  /** Normalized status associated with the event */
  readonly status: ProviderTransferStatus;
  /** Disbursed or transferred amount in minor units (if applicable) */
  readonly amount?: number;
  /** ISO 4217 Currency Code */
  readonly currency?: string;
  /** Explanation if the event signifies a failure or reversal */
  readonly failureReason?: string;
  /** Timestamp of the event occurrence */
  readonly timestamp?: Date;
  /** Raw upstream payload preserved internally for auditing/debugging */
  readonly rawEvent?: unknown;
}

/**
 * Normalized connectivity diagnostic result.
 */
export interface ProviderConnectivityCheck {
  readonly provider: string;
  readonly connected: boolean;
  readonly latencyMs?: number;
  readonly error?: string;
}

// -------------------------------------------------------------------------
// Request Parameter Contracts
// -------------------------------------------------------------------------

export interface ResolveAccountParams {
  accountNumber: string;
  bankCode: string;
  currency?: string;
}

export interface CreateRecipientParams {
  name: string;
  accountNumber: string;
  bankCode: string;
  currency?: string;
  type?: string;
  description?: string;
}

export interface InitiateTransferParams {
  amount: number;
  reference: string;
  recipientReference?: string;
  bankCode?: string;
  accountNumber?: string;
  accountName?: string;
  phoneNumber?: string;
  destinationType?: "bank_account" | "mobile_money";
  destination?: {
    type?: string;
    country?: string;
    provider?: string;
    bank_code?: string;
    account_number?: string;
    account_name?: string;
    phone_number?: string;
  };
  reason?: string;
  currency?: string;
  source?: string;
  metadata?: Record<string, unknown>;
}

export interface VerifyTransferParams {
  providerReference?: string;
  reference?: string;
}
