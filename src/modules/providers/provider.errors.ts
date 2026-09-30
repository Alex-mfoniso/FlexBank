import { AppError } from "../../lib/errors";
import { sanitizeProviderText } from "./paystack/paystack.errors";

/**
 * Base error class for all normalized Ricarut financial provider operations.
 * Represents an operational error originating from or interacting with an upstream provider.
 */
export class ProviderError extends AppError {
  constructor(
    statusCode: number,
    code: string,
    message: string,
    public readonly provider: string,
    public readonly providerCode?: string,
    public readonly providerDetails?: Record<string, unknown>,
    public readonly originalError?: unknown,
  ) {
    super(statusCode, code, sanitizeProviderText(message));
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when the requested provider is unreachable, down, or returning network connectivity errors.
 */
export class ProviderUnavailableError extends ProviderError {
  constructor(
    provider: string,
    message: string = `Payment provider '${provider}' is currently unavailable`,
    details?: Record<string, unknown>,
    originalError?: unknown,
  ) {
    super(503, "PAYMENT_PROVIDER_UNAVAILABLE", message, provider, undefined, details, originalError);
  }
}

/**
 * Thrown when upstream provider authentication or credential verification fails.
 */
export class ProviderAuthenticationError extends ProviderError {
  constructor(
    provider: string,
    message: string = `Authentication failed with provider '${provider}'`,
    details?: Record<string, unknown>,
    originalError?: unknown,
  ) {
    super(500, "PROVIDER_AUTHENTICATION_FAILED", message, provider, undefined, details, originalError);
  }
}

/**
 * Thrown when an account resolution operation fails due to invalid bank code or non-existent account number.
 */
export class ProviderInvalidAccountError extends ProviderError {
  constructor(
    provider: string,
    message: string = "The specified bank account could not be resolved or is invalid",
    providerCode?: string,
    details?: Record<string, unknown>,
    originalError?: unknown,
  ) {
    super(400, "INVALID_ACCOUNT", message, provider, providerCode, details, originalError);
  }
}

/**
 * Thrown when an upstream provider rejects a transfer initiation or execution.
 */
export class ProviderTransferFailedError extends ProviderError {
  constructor(
    provider: string,
    message: string = "Transfer execution failed at the upstream provider",
    providerCode?: string,
    details?: Record<string, unknown>,
    originalError?: unknown,
  ) {
    super(400, "TRANSFER_FAILED", message, provider, providerCode, details, originalError);
  }
}

/**
 * Thrown when an upstream provider indicates insufficient funds or balance to execute a transfer.
 */
export class ProviderInsufficientBalanceError extends ProviderTransferFailedError {
  constructor(
    provider: string,
    message: string = "Insufficient balance with upstream provider to complete transfer",
    providerCode?: string,
    details?: Record<string, unknown>,
    originalError?: unknown,
  ) {
    super(provider, message, providerCode || "insufficient_balance", details, originalError);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown or signaled when a transfer has been received and is pending upstream settlement.
 */
export class ProviderTransferPendingError extends ProviderError {
  constructor(
    provider: string,
    message: string = "Transfer is currently pending processing at provider",
    details?: Record<string, unknown>,
  ) {
    super(202, "TRANSFER_PENDING", message, provider, undefined, details);
  }
}

/**
 * Thrown when an upstream provider request exceeds timeout thresholds.
 */
export class ProviderTimeoutError extends ProviderError {
  constructor(
    provider: string,
    message: string = `Operation timed out while communicating with provider '${provider}'`,
    details?: Record<string, unknown>,
    originalError?: unknown,
  ) {
    super(504, "PROVIDER_TIMEOUT", message, provider, undefined, details, originalError);
  }
}

/**
 * Thrown when upstream provider rate limits or throttling are encountered.
 */
export class ProviderRateLimitedError extends ProviderError {
  constructor(
    provider: string,
    message: string = `Rate limit exceeded for provider '${provider}'`,
    details?: Record<string, unknown>,
    originalError?: unknown,
  ) {
    super(429, "PROVIDER_RATE_LIMITED", message, provider, undefined, details, originalError);
  }
}

/**
 * Thrown when an unexpected, unhandled, or malformed response is returned by a provider.
 */
export class UnknownProviderError extends ProviderError {
  constructor(
    provider: string,
    message: string = `An unexpected error occurred with provider '${provider}'`,
    providerCode?: string,
    details?: Record<string, unknown>,
    originalError?: unknown,
  ) {
    super(502, "UNKNOWN_PROVIDER_ERROR", message, provider, providerCode, details, originalError);
  }
}

/**
 * Helper to normalize any caught upstream provider error into a standard Ricarut ProviderError.
 */
export function normalizeProviderError(provider: string, err: unknown): ProviderError {
  if (err instanceof ProviderError) {
    return err;
  }

  const anyErr = err as any;
  const message = sanitizeProviderText(anyErr?.message || "Provider operation failed");
  const code = anyErr?.code || anyErr?.statusCode;

  // Check for authentication failures
  if (
    code === "PAYSTACK_AUTHENTICATION_FAILURE" ||
    anyErr?.httpStatus === 401 ||
    anyErr?.statusCode === 401
  ) {
    return new ProviderAuthenticationError(provider, message, anyErr?.providerDetails, err);
  }

  // Check for timeout
  if (
    code === "PAYSTACK_TIMEOUT" ||
    code === "ETIMEDOUT" ||
    anyErr?.name === "TimeoutError" ||
    anyErr?.httpStatus === 504
  ) {
    return new ProviderTimeoutError(provider, message, anyErr?.providerDetails, err);
  }

  // Check for network unreachable
  if (
    code === "PAYSTACK_NETWORK_FAILURE" ||
    code === "ECONNREFUSED" ||
    code === "ENOTFOUND" ||
    anyErr?.httpStatus === 503
  ) {
    return new ProviderUnavailableError(provider, message, anyErr?.providerDetails, err);
  }

  // Check for rate limiting
  if (anyErr?.httpStatus === 429 || anyErr?.statusCode === 429) {
    return new ProviderRateLimitedError(provider, message, anyErr?.providerDetails, err);
  }

  // Check for account resolution or recipient creation error
  if (
    message.toLowerCase().includes("account number") ||
    message.toLowerCase().includes("bank code") ||
    message.toLowerCase().includes("could not resolve") ||
    message.toLowerCase().includes("cannot resolve") ||
    anyErr?.providerCode === "account_not_found" ||
    anyErr?.providerCode === "invalid_bank_code"
  ) {
    return new ProviderInvalidAccountError(provider, message, anyErr?.providerCode, anyErr?.providerDetails, err);
  }

  // Check for insufficient balance
  if (
    message.toLowerCase().includes("insufficient") ||
    message.toLowerCase().includes("balance")
  ) {
    return new ProviderInsufficientBalanceError(provider, message, anyErr?.providerCode, anyErr?.providerDetails, err);
  }

  // Check for transfer rejection or failure
  if (
    message.toLowerCase().includes("transfer") ||
    message.toLowerCase().includes("payout") ||
    message.toLowerCase().includes("cannot initiate") ||
    message.toLowerCase().includes("recipient") ||
    message.toLowerCase().includes("rejected")
  ) {
    return new ProviderTransferFailedError(provider, message, anyErr?.providerCode, anyErr?.providerDetails, err);
  }

  return new UnknownProviderError(provider, message, anyErr?.providerCode, anyErr?.providerDetails, err);
}
