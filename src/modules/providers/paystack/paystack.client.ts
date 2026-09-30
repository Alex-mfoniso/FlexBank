import crypto from "crypto";
import { getPaystackConfig, PaystackConfig } from "../../../config/paystack.config";
import { logger } from "../../../lib/logger";
import {
  PaystackError,
  PaystackAuthenticationError,
  PaystackApiError,
  PaystackNetworkError,
  PaystackTimeoutError,
  PaystackUnexpectedResponseError,
  sanitizeProviderText,
} from "./paystack.errors";
import {
  PaystackApiResponse,
  PaystackRequestOptions,
  PaystackConnectivityResult,
} from "./paystack.types";

export class PaystackClient {
  private readonly config: PaystackConfig;

  constructor(config?: PaystackConfig) {
    this.config = config ?? getPaystackConfig();
  }

  /**
   * Internal HTTP execution engine for Paystack API calls.
   * Enforces HTTPS, attaches Bearer auth, handles timeouts, and normalizes errors.
   */
  private async executeRequest<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    body?: unknown,
    options?: PaystackRequestOptions,
  ): Promise<PaystackApiResponse<T>> {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    const url = `${this.config.baseUrl}${cleanPath}`;
    const requestId = options?.requestId ?? `req_prov_${crypto.randomUUID().slice(0, 12)}`;
    const timeoutMs = options?.timeoutMs ?? this.config.timeoutMs;
    const startTime = Date.now();

    const headers: Record<string, string> = {
      "Authorization": `Bearer ${this.config.secretKey}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
      "User-Agent": "Ricarut-Paystack-Client/1.0",
      ...(options?.headers ?? {}),
    };

    let response: Response;

    try {
      response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err: any) {
      const durationMs = Date.now() - startTime;

      if (err.name === "TimeoutError" || err.name === "AbortError") {
        logger.warn(
          {
            provider: "paystack",
            operation: `${method} ${cleanPath}`,
            durationMs,
            requestId,
          },
          "Paystack API request timed out",
        );
        throw new PaystackTimeoutError(
          `Paystack request to ${cleanPath} timed out after ${timeoutMs}ms`,
        );
      }

      logger.error(
        {
          provider: "paystack",
          operation: `${method} ${cleanPath}`,
          durationMs,
          requestId,
          errorType: err.name,
        },
        "Paystack API network failure",
      );
      throw new PaystackNetworkError(
        `Unable to reach Paystack API: ${sanitizeProviderText(err.message || "Network error")}`,
      );
    }

    const durationMs = Date.now() - startTime;
    const statusCode = response.status;

    // Read and parse raw response
    let responseText: string;
    try {
      responseText = await response.text();
    } catch {
      logger.error(
        {
          provider: "paystack",
          operation: `${method} ${cleanPath}`,
          statusCode,
          durationMs,
          requestId,
        },
        "Failed to read Paystack response stream",
      );
      throw new PaystackUnexpectedResponseError("Failed to read Paystack response stream");
    }

    let parsedJson: PaystackApiResponse<T>;
    try {
      parsedJson = JSON.parse(responseText);
    } catch {
      logger.error(
        {
          provider: "paystack",
          operation: `${method} ${cleanPath}`,
          statusCode,
          durationMs,
          requestId,
        },
        "Paystack returned non-JSON response",
      );
      throw new PaystackUnexpectedResponseError(
        `Paystack returned an invalid non-JSON response (HTTP ${statusCode})`,
      );
    }

    // Handle authentication failure (HTTP 401)
    if (statusCode === 401) {
      logger.warn(
        {
          provider: "paystack",
          operation: `${method} ${cleanPath}`,
          statusCode,
          durationMs,
          requestId,
        },
        "Paystack authentication failed",
      );
      throw new PaystackAuthenticationError(
        sanitizeProviderText(parsedJson.message || "Invalid or unauthorized Paystack API key"),
      );
    }

    // Handle other non-successful HTTP status codes
    if (!response.ok || parsedJson.status === false) {
      const sanitizedMessage = sanitizeProviderText(
        parsedJson.message || `Paystack API responded with HTTP status ${statusCode}`,
      );

      logger.warn(
        {
          provider: "paystack",
          operation: `${method} ${cleanPath}`,
          statusCode,
          durationMs,
          requestId,
          providerCode: parsedJson.code,
        },
        "Paystack API returned an error response",
      );

      throw new PaystackApiError(sanitizedMessage, statusCode, {
        providerCode: parsedJson.code,
        providerType: parsedJson.type,
      });
    }

    // Success log
    logger.info(
      {
        provider: "paystack",
        operation: `${method} ${cleanPath}`,
        statusCode,
        durationMs,
        requestId,
      },
      "Paystack API request completed successfully",
    );

    return parsedJson;
  }

  /**
   * Performs an authenticated GET request against the Paystack API.
   */
  public async get<T>(path: string, options?: PaystackRequestOptions): Promise<PaystackApiResponse<T>> {
    return this.executeRequest<T>("GET", path, undefined, options);
  }

  /**
   * Performs an authenticated POST request against the Paystack API.
   */
  public async post<T>(
    path: string,
    body?: unknown,
    options?: PaystackRequestOptions,
  ): Promise<PaystackApiResponse<T>> {
    return this.executeRequest<T>("POST", path, body, options);
  }

  /**
   * Diagnostic verification: verifies that credentials are valid and Paystack can be reached.
   * Uses the lightweight authenticated endpoint /integration/payment_session_timeout.
   * Never exposes raw responses or secret keys.
   */
  public async verifyConnectivity(options?: PaystackRequestOptions): Promise<PaystackConnectivityResult> {
    const startTime = Date.now();
    try {
      const response = await this.get<{ payment_session_timeout?: number }>(
        "/integration/payment_session_timeout",
        {
          ...options,
          timeoutMs: options?.timeoutMs ?? 5000, // Quick timeout for connectivity check
        },
      );

      const latencyMs = Date.now() - startTime;

      if (response.status === true) {
        return {
          provider: "paystack",
          connected: true,
          latencyMs,
        };
      }

      return {
        provider: "paystack",
        connected: false,
        latencyMs,
        error: sanitizeProviderText(response.message || "Unexpected Paystack response status"),
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      const sanitizedError =
        err instanceof PaystackError
          ? err.message
          : sanitizeProviderText(err.message || "Unknown connectivity failure");

      return {
        provider: "paystack",
        connected: false,
        latencyMs,
        error: sanitizedError,
      };
    }
  }
}
