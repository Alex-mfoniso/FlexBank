import { AppError } from "../../../lib/errors";

/**
 * Strips any sensitive credentials (API keys, authorization headers) from error messages.
 */
export function sanitizeProviderText(text: string): string {
  if (!text) return text;
  return text
    .replace(/sk_(test|live)_[a-zA-Z0-9]+/gi, "[REDACTED_SECRET_KEY]")
    .replace(/pk_(test|live)_[a-zA-Z0-9]+/gi, "[REDACTED_PUBLIC_KEY]")
    .replace(/Bearer\s+[^\s"']+/gi, "Bearer [REDACTED]");
}

/**
 * Base error class for all Paystack provider integration errors.
 */
export class PaystackError extends AppError {
  constructor(
    statusCode: number,
    code: string,
    message: string,
    public readonly providerDetails?: Record<string, unknown>,
  ) {
    super(statusCode, code, sanitizeProviderText(message));
    // Ensure the prototype chain is properly maintained
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when Paystack configuration (e.g. secret key or base URL) is missing or invalid.
 */
export class PaystackConfigurationError extends PaystackError {
  constructor(message: string = "Paystack configuration is incomplete or missing secret key") {
    super(500, "PAYSTACK_CONFIGURATION_ERROR", message);
  }
}

/**
 * Thrown when Paystack rejects authentication (e.g. invalid or revoked API credentials).
 */
export class PaystackAuthenticationError extends PaystackError {
  constructor(message: string = "Paystack authentication failed: invalid or unauthorized API credentials") {
    super(401, "PAYSTACK_AUTHENTICATION_FAILURE", message);
  }
}

/**
 * Thrown when Paystack responds with an application/API error (HTTP 4xx or 5xx).
 */
export class PaystackApiError extends PaystackError {
  constructor(
    message: string,
    public readonly httpStatus: number = 502,
    details?: Record<string, unknown>,
  ) {
    super(502, "PAYSTACK_API_ERROR", message, details);
  }
}

/**
 * Thrown when a network-level failure occurs while contacting the Paystack API (e.g. DNS failure, connection refused).
 */
export class PaystackNetworkError extends PaystackError {
  constructor(message: string = "Network failure connecting to Paystack API") {
    super(503, "PAYSTACK_NETWORK_FAILURE", message);
  }
}

/**
 * Thrown when an HTTP request to Paystack exceeds the configured timeout threshold.
 */
export class PaystackTimeoutError extends PaystackError {
  constructor(message: string = "Request to Paystack API timed out") {
    super(504, "PAYSTACK_TIMEOUT", message);
  }
}

/**
 * Thrown when Paystack returns an unexpected or malformed response (e.g. non-JSON or missing contract fields).
 */
export class PaystackUnexpectedResponseError extends PaystackError {
  constructor(message: string = "Paystack returned an unexpected or malformed response") {
    super(502, "PAYSTACK_UNEXPECTED_RESPONSE", message);
  }
}
