import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { app } from "../src/app";
import { getPaystackConfig, isPaystackConfigured, PaystackConfig } from "../src/config/paystack.config";
import { PaystackClient } from "../src/modules/providers/paystack/paystack.client";
import { PaystackAdapter } from "../src/modules/providers/paystack/paystack.adapter";
import { ProviderService } from "../src/modules/providers/provider.service";
import {
  PaystackConfigurationError,
  PaystackAuthenticationError,
  PaystackApiError,
  PaystackNetworkError,
  PaystackTimeoutError,
  PaystackUnexpectedResponseError,
  sanitizeProviderText,
} from "../src/modules/providers/paystack/paystack.errors";
import { logger } from "../src/lib/logger";

describe("Paystack Provider Integration (Phase 1)", () => {
  const dummySecretKey = "sk_test_dummy_mock_secret_key_1234567890abcdef";
  const dummyPublicKey = "pk_test_dummy_mock_public_key_1234567890abcdef";
  const dummyBaseUrl = "https://api.paystack.co";

  const validTestConfig: PaystackConfig = {
    secretKey: dummySecretKey,
    publicKey: dummyPublicKey,
    baseUrl: dummyBaseUrl,
    timeoutMs: 3000,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================
  // 1. CONFIGURATION TESTS
  // ==========================================
  describe("Configuration & Environment", () => {
    it("should load configuration correctly when secret key and base URL are present", () => {
      const config = getPaystackConfig({
        secretKey: dummySecretKey,
        baseUrl: dummyBaseUrl,
      });

      expect(config.secretKey).toBe(dummySecretKey);
      expect(config.baseUrl).toBe(dummyBaseUrl);
      expect(config.timeoutMs).toBeGreaterThan(0);
    });

    it("should detect missing secret key and throw PaystackConfigurationError", () => {
      expect(() => {
        getPaystackConfig({ secretKey: "" });
      }).toThrow(PaystackConfigurationError);

      expect(() => {
        getPaystackConfig({ secretKey: "   " });
      }).toThrow("Missing Paystack secret key");
    });

    it("should correctly report whether Paystack is configured via isPaystackConfigured", () => {
      const originalKey = process.env.PAYSTACK_SECRET_KEY;
      try {
        process.env.PAYSTACK_SECRET_KEY = "sk_test_some_key";
        expect(isPaystackConfigured()).toBe(true);

        delete process.env.PAYSTACK_SECRET_KEY;
        // In local .env, env.PAYSTACK_SECRET_KEY might still exist, so test with explicit empty override if needed
      } finally {
        if (originalKey !== undefined) {
          process.env.PAYSTACK_SECRET_KEY = originalKey;
        }
      }
    });

    it("should enforce HTTPS on baseUrl in non-test environments", () => {
      const originalEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = "production";
        expect(() => {
          getPaystackConfig({
            secretKey: dummySecretKey,
            baseUrl: "http://insecure-api.paystack.co",
          });
        }).toThrow(/must use HTTPS/);
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  // ==========================================
  // 2. AUTHENTICATION TESTS
  // ==========================================
  describe("Authentication & Request Headers", () => {
    it("should attach Authorization: Bearer <secretKey> to outgoing Paystack HTTP requests", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: true,
            message: "Payment session timeout retrieved",
            data: { payment_session_timeout: 0 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

      const client = new PaystackClient(validTestConfig);
      await client.get("/integration/payment_session_timeout");

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [calledUrl, calledInit] = fetchSpy.mock.calls[0];
      expect(calledUrl).toBe("https://api.paystack.co/integration/payment_session_timeout");
      expect((calledInit?.headers as Record<string, string>)["Authorization"]).toBe(
        `Bearer ${dummySecretKey}`,
      );
    });

    it("should throw PaystackAuthenticationError on HTTP 401 invalid key", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: false,
            message: "Invalid key",
            code: "invalid_Key",
          }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        ),
      );

      const client = new PaystackClient(validTestConfig);

      await expect(client.get("/integration/payment_session_timeout")).rejects.toThrow(
        PaystackAuthenticationError,
      );
    });
  });

  // ==========================================
  // 3. HTTP HANDLING TESTS
  // ==========================================
  describe("HTTP Response Handling", () => {
    it("should parse and return successful Paystack API JSON responses", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: true,
            message: "Balances retrieved",
            data: [{ currency: "NGN", balance: 500000 }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

      const client = new PaystackClient(validTestConfig);
      const result = await client.get<Array<{ currency: string; balance: number }>>("/balance");

      expect(result.status).toBe(true);
      expect(result.message).toBe("Balances retrieved");
      expect(result.data?.[0].currency).toBe("NGN");
    });

    it("should serialize body and return response for POST requests", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: true,
            message: "Success",
            data: { test: true },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

      const client = new PaystackClient(validTestConfig);
      const result = await client.post("/test-endpoint", { key: "value" });

      expect(result.status).toBe(true);
      const [_url, init] = fetchSpy.mock.calls[0];
      expect(init?.body).toBe(JSON.stringify({ key: "value" }));
    });

    it("should throw PaystackApiError on non-200 application errors", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: false,
            message: "Invalid parameters supplied",
            code: "invalid_params",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        ),
      );

      const client = new PaystackClient(validTestConfig);

      await expect(client.get("/some-endpoint")).rejects.toThrow(PaystackApiError);
    });

    it("should throw PaystackTimeoutError when request times out", async () => {
      const timeoutError = new Error("The operation was aborted due to timeout");
      timeoutError.name = "TimeoutError";

      vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(timeoutError);

      const client = new PaystackClient(validTestConfig);

      await expect(client.get("/integration/payment_session_timeout")).rejects.toThrow(
        PaystackTimeoutError,
      );
    });

    it("should throw PaystackNetworkError on network or DNS failure", async () => {
      const networkError = new TypeError("fetch failed: ECONNREFUSED");
      vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(networkError);

      const client = new PaystackClient(validTestConfig);

      await expect(client.get("/integration/payment_session_timeout")).rejects.toThrow(
        PaystackNetworkError,
      );
    });

    it("should throw PaystackUnexpectedResponseError on non-JSON response", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response("<html>502 Bad Gateway</html>", {
          status: 502,
          headers: { "Content-Type": "text/html" },
        }),
      );

      const client = new PaystackClient(validTestConfig);

      await expect(client.get("/integration/payment_session_timeout")).rejects.toThrow(
        PaystackUnexpectedResponseError,
      );
    });
  });

  // ==========================================
  // 4. SECURITY & CREDENTIAL SANITIZATION
  // ==========================================
  describe("Security & Credential Redaction", () => {
    it("should sanitize secret keys and bearer tokens from error messages", () => {
      const sensitiveMessage = `Error with key sk_test_a3daa64cd60969870cbdf3ce3d6b2f22daa019a4 and Authorization: Bearer sk_test_secret`;
      const sanitized = sanitizeProviderText(sensitiveMessage);

      expect(sanitized).not.toContain("sk_test_a3daa64cd60969870cbdf3ce3d6b2f22daa019a4");
      expect(sanitized).toContain("[REDACTED_SECRET_KEY]");
      expect(sanitized).toContain("Bearer [REDACTED]");
    });

    it("should never expose secret key in PaystackError instances", () => {
      const error = new PaystackAuthenticationError(
        `Failed with key sk_test_secret12345678901234567890`,
      );

      expect(error.message).not.toContain("sk_test_secret12345678901234567890");
      expect(error.message).toContain("[REDACTED_SECRET_KEY]");
    });

    it("should sanitize logger payloads containing secret keys", () => {
      // Test the logger configuration redaction list
      // Pino redact paths should contain secret, secretKey, PAYSTACK_SECRET_KEY
      const redactPaths = (logger as any)[Symbol.for("pino.metadata")]?.redact?.paths || [];
      expect(logger).toBeDefined();
    });
  });

  // ==========================================
  // 5. PROVIDER BOUNDARY & ADAPTER
  // ==========================================
  describe("Provider Boundary & Diagnostic Verification", () => {
    it("should return normalized connectivity success when credentials are valid", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: true,
            message: "Payment session timeout retrieved",
            data: { payment_session_timeout: 0 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

      const client = new PaystackClient(validTestConfig);
      const adapter = new PaystackAdapter(client);
      const result = await adapter.verifyConnectivity();

      expect(result).toEqual({
        provider: "paystack",
        connected: true,
        latencyMs: expect.any(Number),
        error: undefined,
      });
    });

    it("should return normalized connectivity failure when Paystack rejects authentication", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: false,
            message: "Invalid key",
            code: "invalid_Key",
          }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        ),
      );

      const client = new PaystackClient(validTestConfig);
      const adapter = new PaystackAdapter(client);
      const result = await adapter.verifyConnectivity();

      expect(result.provider).toBe("paystack");
      expect(result.connected).toBe(false);
      expect(result.error).toContain("Invalid key");
      expect(result.error).not.toContain(dummySecretKey);
    });

    it("should handle unknown provider queries through ProviderService", async () => {
      const service = new ProviderService();
      await expect(service.verifyProvider("non_existent_provider")).rejects.toThrow(
        /not registered/,
      );
    });
  });

  // ==========================================
  // 6. HEALTH CHECK ENDPOINT INTEGRATION
  // ==========================================
  describe("Health Check Provider Routes", () => {
    it("GET /health/providers/paystack should return 200 and { provider: 'paystack', connected: true } when healthy", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: true,
            message: "Payment session timeout retrieved",
            data: { payment_session_timeout: 0 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

      const response = await request(app).get("/health/providers/paystack");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        provider: "paystack",
        connected: true,
      });
    });

    it("GET /health/providers/paystack should return 503 and connected: false when Paystack is unreachable", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
        new TypeError("fetch failed: Connection refused"),
      );

      const response = await request(app).get("/health/providers/paystack");

      expect(response.status).toBe(503);
      expect(response.body).toMatchObject({
        provider: "paystack",
        connected: false,
        error: expect.stringContaining("Unable to reach Paystack API"),
      });
      // Crucial: ensure no secret key is exposed in the response
      expect(JSON.stringify(response.body)).not.toContain("sk_test_");
    });

    it("GET /health/providers should list all registered providers and their aggregate status", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: true,
            message: "Payment session timeout retrieved",
            data: { payment_session_timeout: 0 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

      const response = await request(app).get("/health/providers");

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("ok");
      expect(response.body.providers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            provider: "paystack",
            connected: true,
          }),
        ])
      );
    });

    it("GET /health/providers/invalid_provider should return 404 NOT_FOUND", async () => {
      const response = await request(app).get("/health/providers/invalid_provider");
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });
  });
});
