import { env } from "./env";
import { PaystackConfigurationError } from "../modules/providers/paystack/paystack.errors";

export interface PaystackConfig {
  secretKey: string;
  publicKey?: string;
  baseUrl: string;
  timeoutMs: number;
}

const DEFAULT_PAYSTACK_BASE_URL = "https://api.paystack.co";
const DEFAULT_TIMEOUT_MS = 10000;

/**
 * Validates and retrieves the Paystack provider configuration.
 * Throws a PaystackConfigurationError if the secret key is missing or invalid.
 */
export function getPaystackConfig(overrides?: Partial<PaystackConfig>): PaystackConfig {
  const secretKey =
    overrides?.secretKey ??
    process.env.PAYSTACK_SECRET_KEY ??
    env.PAYSTACK_SECRET_KEY;

  if (!secretKey || secretKey.trim() === "") {
    throw new PaystackConfigurationError(
      "Missing Paystack secret key. Please configure PAYSTACK_SECRET_KEY in your environment.",
    );
  }

  const publicKey =
    overrides?.publicKey ??
    process.env.PAYSTACK_PUBLIC_KEY ??
    env.PAYSTACK_PUBLIC_KEY;

  let baseUrl =
    overrides?.baseUrl ??
    process.env.PAYSTACK_BASE_URL ??
    env.PAYSTACK_BASE_URL ??
    DEFAULT_PAYSTACK_BASE_URL;

  // Trim any trailing slash
  baseUrl = baseUrl.replace(/\/+$/, "");

  // Security check: Base URL must use HTTPS in production and development environments
  const isTestEnv = (process.env.NODE_ENV ?? env.NODE_ENV) === "test";
  const isLocalhost = baseUrl.startsWith("http://localhost") || baseUrl.startsWith("http://127.0.0.1");

  if (!baseUrl.startsWith("https://") && !isTestEnv && !isLocalhost) {
    throw new PaystackConfigurationError(
      `Paystack base URL must use HTTPS for secure provider communications. Received: ${baseUrl}`,
    );
  }

  const timeoutMs = overrides?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return {
    secretKey: secretKey.trim(),
    publicKey: publicKey ? publicKey.trim() : undefined,
    baseUrl,
    timeoutMs,
  };
}

/**
 * Checks whether Paystack environment variables are configured without throwing.
 */
export function isPaystackConfigured(): boolean {
  const key = process.env.PAYSTACK_SECRET_KEY ?? env.PAYSTACK_SECRET_KEY;
  return typeof key === "string" && key.trim().length > 0;
}
