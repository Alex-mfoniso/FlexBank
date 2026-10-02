import { env } from "./env";
import { ProviderConfigurationError } from "../modules/providers/provider.errors";

export interface MpesaConfig {
  env: "sandbox" | "production";
  consumerKey: string;
  consumerSecret: string;
  initiatorName: string;
  initiatorPassword?: string;
  securityCredential: string;
  shortcode: string;
  baseUrl: string;
  resultUrl: string;
  queueTimeoutUrl: string;
  webhookSecret?: string;
  timeoutMs: number;
}

const DEFAULT_SANDBOX_BASE_URL = "https://sandbox.safaricom.co.ke";
const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_SANDBOX_SHORTCODE = "600988";
const DEFAULT_INITIATOR_NAME = "testapi";

/**
 * Validates and retrieves the Safaricom M-Pesa provider configuration.
 * Throws a ProviderConfigurationError if mandatory credentials are missing or invalid.
 */
export function getMpesaConfig(overrides?: Partial<MpesaConfig>): MpesaConfig {
  const mpesaEnv =
    overrides?.env ??
    (process.env.MPESA_ENV as "sandbox" | "production") ??
    env.MPESA_ENV ??
    "sandbox";

  if (mpesaEnv === "production") {
    throw new ProviderConfigurationError(
      "mpesa",
      "Production M-Pesa environment is explicitly disabled in Phase 7. Only sandbox mode is supported.",
    );
  }

  const consumerKey =
    overrides?.consumerKey ??
    process.env.MPESA_CONSUMER_KEY ??
    env.MPESA_CONSUMER_KEY;

  if (!consumerKey || consumerKey.trim() === "") {
    throw new ProviderConfigurationError(
      "mpesa",
      "Missing M-Pesa Consumer Key. Please configure MPESA_CONSUMER_KEY in your environment.",
    );
  }

  const consumerSecret =
    overrides?.consumerSecret ??
    process.env.MPESA_CONSUMER_SECRET ??
    env.MPESA_CONSUMER_SECRET;

  if (!consumerSecret || consumerSecret.trim() === "") {
    throw new ProviderConfigurationError(
      "mpesa",
      "Missing M-Pesa Consumer Secret. Please configure MPESA_CONSUMER_SECRET in your environment.",
    );
  }

  const initiatorName =
    overrides?.initiatorName ??
    process.env.MPESA_INITIATOR_NAME ??
    env.MPESA_INITIATOR_NAME ??
    DEFAULT_INITIATOR_NAME;

  const initiatorPassword =
    overrides?.initiatorPassword ??
    process.env.MPESA_INITIATOR_PASSWORD ??
    env.MPESA_INITIATOR_PASSWORD;

  const securityCredential =
    overrides?.securityCredential ??
    process.env.MPESA_SECURITY_CREDENTIAL ??
    env.MPESA_SECURITY_CREDENTIAL;

  if (!securityCredential || securityCredential.trim() === "") {
    throw new ProviderConfigurationError(
      "mpesa",
      "Missing M-Pesa Security Credential. Please configure MPESA_SECURITY_CREDENTIAL in your environment.",
    );
  }

  const shortcode =
    overrides?.shortcode ??
    process.env.MPESA_SHORTCODE ??
    env.MPESA_SHORTCODE ??
    DEFAULT_SANDBOX_SHORTCODE;

  let baseUrl =
    overrides?.baseUrl ??
    process.env.MPESA_BASE_URL ??
    env.MPESA_BASE_URL ??
    DEFAULT_SANDBOX_BASE_URL;

  // Trim trailing slash
  baseUrl = baseUrl.replace(/\/+$/, "");

  // Security check: Base URL must use HTTPS in production and development environments
  const isTestEnv = (process.env.NODE_ENV ?? env.NODE_ENV) === "test";
  const isLocalhost = baseUrl.startsWith("http://localhost") || baseUrl.startsWith("http://127.0.0.1");

  if (!baseUrl.startsWith("https://") && !isTestEnv && !isLocalhost) {
    throw new ProviderConfigurationError(
      "mpesa",
      `M-Pesa base URL must use HTTPS for secure provider communications. Received: ${baseUrl}`,
    );
  }

  const resultUrl =
    overrides?.resultUrl ??
    process.env.MPESA_RESULT_URL ??
    env.MPESA_RESULT_URL ??
    "https://flexbank.onrender.com/api/v1/webhooks/mpesa/b2c";

  const queueTimeoutUrl =
    overrides?.queueTimeoutUrl ??
    process.env.MPESA_QUEUE_TIMEOUT_URL ??
    env.MPESA_QUEUE_TIMEOUT_URL ??
    "https://flexbank.onrender.com/api/v1/webhooks/mpesa/b2c/timeout";

  const webhookSecret =
    overrides?.webhookSecret ??
    process.env.MPESA_WEBHOOK_SECRET ??
    env.MPESA_WEBHOOK_SECRET;

  const timeoutMs = overrides?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return {
    env: mpesaEnv,
    consumerKey: consumerKey.trim(),
    consumerSecret: consumerSecret.trim(),
    initiatorName: initiatorName.trim(),
    initiatorPassword: initiatorPassword ? initiatorPassword.trim() : undefined,
    securityCredential: securityCredential.trim(),
    shortcode: shortcode.trim(),
    baseUrl,
    resultUrl,
    queueTimeoutUrl,
    webhookSecret: webhookSecret ? webhookSecret.trim() : undefined,
    timeoutMs,
  };
}

/**
 * Checks if M-Pesa provider has the minimal required credentials configured.
 */
export function isMpesaConfigured(): boolean {
  try {
    const key = process.env.MPESA_CONSUMER_KEY ?? env.MPESA_CONSUMER_KEY;
    const secret = process.env.MPESA_CONSUMER_SECRET ?? env.MPESA_CONSUMER_SECRET;
    const cred = process.env.MPESA_SECURITY_CREDENTIAL ?? env.MPESA_SECURITY_CREDENTIAL;
    return Boolean(key && secret && cred);
  } catch {
    return false;
  }
}
