import crypto from "crypto";
import { getMpesaConfig, MpesaConfig } from "../../../config/mpesa.config";
import { logger } from "../../../lib/logger";
import {
  ProviderAuthenticationError,
  ProviderTimeoutError,
  ProviderUnavailableError,
  ProviderTransferFailedError,
} from "../provider.errors";
import {
  MpesaOAuthResponse,
  MpesaB2CPayload,
  MpesaB2CAcknowledgment,
  MpesaStatusQueryPayload,
  MpesaConnectivityResult,
} from "./mpesa.types";
import { sanitizeMpesaText } from "./mpesa.utils";

interface CachedToken {
  token: string;
  expiresAt: number;
}

/**
 * Dedicated Safaricom Daraja M-Pesa HTTP Client.
 * Handles OAuth token caching, credential lifecycle, HTTP timeouts, and raw communication.
 */
export class MpesaClient {
  private readonly config: MpesaConfig;
  private cachedToken: CachedToken | null = null;

  constructor(config?: MpesaConfig) {
    this.config = config ?? getMpesaConfig();
  }

  /**
   * Retrieves or refreshes a valid OAuth access token from Daraja.
   * Reuses unexpired tokens and refreshes automatically when within 60s of expiration.
   */
  async getAccessToken(forceRefresh = false): Promise<string> {
    const now = Date.now();

    if (!forceRefresh && this.cachedToken && this.cachedToken.expiresAt > now + 60000) {
      return this.cachedToken.token;
    }

    const authString = Buffer.from(
      `${this.config.consumerKey}:${this.config.consumerSecret}`,
    ).toString("base64");

    const url = `${this.config.baseUrl}/oauth/v1/generate?grant_type=client_credentials`;

    const startTime = Date.now();
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Basic ${authString}`,
          "Accept": "application/json",
          "User-Agent": "Ricarut-Mpesa-Client/1.0",
        },
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });

      const durationMs = Date.now() - startTime;

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        logger.error(
          {
            provider: "mpesa",
            status: response.status,
            durationMs,
          },
          "Daraja OAuth authentication request failed",
        );
        throw new ProviderAuthenticationError(
          "mpesa",
          `Safaricom Daraja OAuth authentication failed with status ${response.status}: ${sanitizeMpesaText(errorBody)}`,
        );
      }

      const data = (await response.json()) as MpesaOAuthResponse;

      if (!data?.access_token) {
        throw new ProviderAuthenticationError(
          "mpesa",
          "Daraja OAuth response missing access_token",
        );
      }

      const expiresInSeconds = Number(data.expires_in) || 3599;
      this.cachedToken = {
        token: data.access_token,
        expiresAt: now + expiresInSeconds * 1000,
      };

      logger.debug(
        { provider: "mpesa", durationMs, expiresInSeconds },
        "Acquired fresh Daraja OAuth token",
      );

      return data.access_token;
    } catch (err: any) {
      if (err.name === "TimeoutError" || err.name === "AbortError") {
        throw new ProviderTimeoutError(
          "mpesa",
          `Daraja OAuth request timed out after ${this.config.timeoutMs}ms`,
        );
      }
      if (err instanceof ProviderAuthenticationError || err instanceof ProviderTimeoutError) {
        throw err;
      }
      if (err.code === "ECONNREFUSED" || err.code === "ENOTFOUND") {
        throw new ProviderUnavailableError(
          "mpesa",
          `Cannot establish connection to Safaricom Daraja (${this.config.baseUrl})`,
        );
      }
      throw new ProviderAuthenticationError(
        "mpesa",
        `Failed to acquire Daraja OAuth token: ${sanitizeMpesaText(err.message)}`,
      );
    }
  }

  /**
   * Executes a B2C Payment request against Daraja API.
   */
  async sendB2CPayment(payload: MpesaB2CPayload): Promise<MpesaB2CAcknowledgment> {
    const token = await this.getAccessToken();
    const primaryUrl = `${this.config.baseUrl}/mpesa/b2c/v3/paymentrequest`;
    const fallbackUrl = `${this.config.baseUrl}/mpesa/b2c/v1/paymentrequest`;

    const requestId = `req_mpesa_${crypto.randomUUID().slice(0, 12)}`;
    const startTime = Date.now();

    const makeRequest = async (url: string) => {
      return fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
          "User-Agent": "Ricarut-Mpesa-Client/1.0",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });
    };

    try {
      let response = await makeRequest(primaryUrl);

      // If v3 endpoint returns 404, fallback to v1 endpoint
      if (response.status === 404) {
        logger.warn(
          { provider: "mpesa", primaryUrl, fallbackUrl },
          "Daraja B2C v3 endpoint not found, attempting v1 fallback",
        );
        response = await makeRequest(fallbackUrl);
      }

      const durationMs = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        let errorData: any = {};
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { errorMessage: errorText };
        }

        const errorMessage =
          errorData?.errorMessage ||
          errorData?.ResponseDescription ||
          errorData?.message ||
          `Daraja B2C request failed with status ${response.status}`;

        logger.error(
          {
            provider: "mpesa",
            requestId,
            status: response.status,
            errorCode: errorData?.errorCode,
            durationMs,
          },
          "Daraja B2C request rejected",
        );

        throw new ProviderTransferFailedError(
          "mpesa",
          sanitizeMpesaText(errorMessage),
          errorData?.errorCode,
          {
            httpStatus: response.status,
            originatorConversationId: payload.OriginatorConversationID,
          },
        );
      }

      const data = (await response.json()) as MpesaB2CAcknowledgment;

      logger.info(
        {
          provider: "mpesa",
          requestId,
          originatorConversationId: data.OriginatorConversationID || payload.OriginatorConversationID,
          conversationId: data.ConversationID,
          durationMs,
        },
        "Daraja accepted B2C disbursement request",
      );

      return data;
    } catch (err: any) {
      if (err.name === "TimeoutError" || err.name === "AbortError") {
        throw new ProviderTimeoutError(
          "mpesa",
          `Daraja B2C request timed out after ${this.config.timeoutMs}ms`,
        );
      }
      if (err instanceof ProviderTransferFailedError || err instanceof ProviderTimeoutError) {
        throw err;
      }
      if (err.code === "ECONNREFUSED" || err.code === "ENOTFOUND") {
        throw new ProviderUnavailableError(
          "mpesa",
          `Cannot reach Safaricom Daraja API at ${this.config.baseUrl}`,
        );
      }
      throw new ProviderTransferFailedError(
        "mpesa",
        `Failed to submit Daraja B2C transfer: ${sanitizeMpesaText(err.message)}`,
      );
    }
  }

  /**
   * Queries transaction status via Daraja Transaction Status API.
   */
  async queryTransactionStatus(payload: MpesaStatusQueryPayload): Promise<unknown> {
    const token = await this.getAccessToken();
    const url = `${this.config.baseUrl}/mpesa/transactionstatus/v1/query`;

    const startTime = Date.now();
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
          "User-Agent": "Ricarut-Mpesa-Client/1.0",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });

      const durationMs = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(`Daraja status query failed (${response.status}): ${sanitizeMpesaText(errorText)}`);
      }

      const data = await response.json();
      logger.info(
        { provider: "mpesa", durationMs },
        "Queried Daraja transaction status successfully",
      );
      return data;
    } catch (err: any) {
      if (err.name === "TimeoutError" || err.name === "AbortError") {
        throw new ProviderTimeoutError(
          "mpesa",
          `Daraja status query timed out after ${this.config.timeoutMs}ms`,
        );
      }
      throw err;
    }
  }

  /**
   * Diagnostic connectivity test to Safaricom Daraja sandbox.
   */
  async verifyConnectivity(): Promise<MpesaConnectivityResult> {
    const startTime = Date.now();
    try {
      await this.getAccessToken(true);
      return {
        connected: true,
        latencyMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return {
        connected: false,
        error: sanitizeMpesaText(err.message || "Failed to establish connection to Daraja"),
      };
    }
  }

  /**
   * Clears the in-memory token cache (useful for testing token renewal).
   */
  clearTokenCache(): void {
    this.cachedToken = null;
  }
}
