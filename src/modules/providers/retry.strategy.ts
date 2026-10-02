import { logger } from "../../lib/logger";
import { ProviderTimeoutError, ProviderUnavailableError } from "./provider.errors";

export type ProviderOperationType =
  | "auth_token"
  | "account_resolution"
  | "transaction_query"
  | "transfer_dispatch"
  | "connectivity_check";

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
}

/**
 * Determines whether a given provider operation is intrinsically safe to retry.
 * Financial transfers ("transfer_dispatch") are NEVER safe to retry blindly
 * because an upstream provider may have already debited or queued the payout.
 */
export function isOperationSafelyRetryable(operation: ProviderOperationType): boolean {
  switch (operation) {
    case "auth_token":
    case "account_resolution":
    case "transaction_query":
    case "connectivity_check":
      return true;

    case "transfer_dispatch":
      // Unsafe: Money movement must respect idempotency & reconciliation instead of blind retries
      return false;

    default:
      return false;
  }
}

/**
 * Determines whether an encountered error indicates a transient condition suitable for retry.
 */
export function isTransientError(error: unknown): boolean {
  if (!error) return false;

  if (error instanceof ProviderTimeoutError || error instanceof ProviderUnavailableError) {
    return true;
  }

  const anyErr = error as any;
  const status = anyErr?.statusCode || anyErr?.status || anyErr?.response?.status;
  if (status === 429 || status === 502 || status === 503 || status === 504) {
    return true;
  }

  const code = anyErr?.code;
  if (
    code === "ECONNRESET" ||
    code === "ETIMEDOUT" ||
    code === "ECONNREFUSED" ||
    code === "EAI_AGAIN" ||
    code === "ENOTFOUND"
  ) {
    return true;
  }

  return false;
}

/**
 * Executes a read-only or idempotent provider operation with safe exponential backoff retries.
 * Strictly enforces that transfer dispatches are rejected from blind execution.
 */
export async function withSafeRetry<T>(
  operation: ProviderOperationType,
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 200,
    maxDelayMs = 2000,
    backoffFactor = 2,
  } = options;

  if (!isOperationSafelyRetryable(operation)) {
    // Execute exactly once without automated blind retries
    return await fn();
  }

  let attempt = 0;
  let delay = initialDelayMs;

  while (attempt <= maxRetries) {
    try {
      return await fn();
    } catch (err: unknown) {
      attempt++;
      const isTransient = isTransientError(err);

      if (attempt > maxRetries || !isTransient) {
        logger.warn(
          { operation, attempt, maxRetries, isTransient, err },
          "Retry exhausted or non-transient error encountered during provider operation",
        );
        throw err;
      }

      // Add small jitter (+/- 20%) to prevent thundering herd
      const jitter = delay * 0.2 * (Math.random() * 2 - 1);
      const sleepDuration = Math.min(maxDelayMs, Math.max(0, delay + jitter));

      logger.info(
        { operation, attempt, nextDelayMs: Math.round(sleepDuration) },
        "Transient error encountered in retryable provider operation; backing off",
      );

      await new Promise((resolve) => setTimeout(resolve, sleepDuration));
      delay *= backoffFactor;
    }
  }

  throw new Error("Unreachable retry loop exit");
}
