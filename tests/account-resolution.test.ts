import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { app } from "../src/app";
import { env } from "../src/config/env";
import { prisma } from "../src/lib/prisma";
import { providerRegistry, ProviderRegistry } from "../src/modules/providers/provider.registry";
import { AccountResolutionService } from "../src/modules/accounts/account-resolution.service";
import { AccountVerificationProvider, FinancialProvider } from "../src/modules/providers/contracts/provider.contracts";
import {
  ProviderInvalidAccountError,
  ProviderTimeoutError,
  ProviderUnavailableError,
  ProviderAuthenticationError,
  ProviderRateLimitedError,
} from "../src/modules/providers/provider.errors";
import { PaystackAdapter } from "../src/modules/providers/paystack/paystack.adapter";
import { PaystackClient } from "../src/modules/providers/paystack/paystack.client";

describe("Phase 3: Bank Account Resolution", () => {
  // Test Ricarut API Key credentials (matches /^(fb|rc)_(test|live)_([a-zA-Z0-9]{12})\.([a-zA-Z0-9]{32})$/)
  const testKeyPrefix = "rc_test_123456789012";
  const testSecret = "abcdefghijklmnopqrstuvwxyz012345";
  const validApiKey = `${testKeyPrefix}.${testSecret}`;
  const apiKeyHash = crypto.createHash("sha256").update(validApiKey).digest("hex");

  const mockProject = {
    id: "prj_test_acc_resolution",
    organizationId: "org_test_acc_resolution",
    environment: "test",
  };

  const mockApiKeyRecord = {
    id: "key_acc_res_1",
    keyPrefix: testKeyPrefix,
    keyHash: apiKeyHash,
    projectId: mockProject.id,
    environment: "test",
    revokedAt: null,
    expiresAt: null,
    project: mockProject,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // 1. Service-Level Provider Abstraction Unit Tests
  // ===========================================================================
  describe("AccountResolutionService (Provider Abstraction)", () => {
    it("should resolve account through AccountVerificationProvider without direct Paystack dependencies", async () => {
      const mockProvider: FinancialProvider & AccountVerificationProvider = {
        id: "mock_rail",
        name: "Mock Banking Rail",
        capabilities: ["account_verification"],
        hasCapability: (cap) => cap === "account_verification",
        verifyConnectivity: async () => ({ provider: "mock_rail", connected: true }),
        resolveAccount: vi.fn().mockResolvedValue({
          provider: "mock_rail",
          accountNumber: "0123456789",
          accountName: "CHUKWUDI EZE",
          bankCode: "058",
          currency: "NGN",
        }),
      };

      const customRegistry = new ProviderRegistry();
      customRegistry.register(mockProvider);

      const service = new AccountResolutionService(customRegistry);
      const result = await service.resolveAccount({
        bankCode: "058",
        accountNumber: "0123456789",
        providerId: "mock_rail",
      });

      expect(mockProvider.resolveAccount).toHaveBeenCalledWith({
        accountNumber: "0123456789",
        bankCode: "058",
      });

      expect(result).toEqual({
        account_number: "0123456789",
        account_name: "CHUKWUDI EZE",
        bank_code: "058",
        provider: "mock_rail",
      });
    });

    it("should propagate normalized provider errors faithfully", async () => {
      const failingProvider: FinancialProvider & AccountVerificationProvider = {
        id: "failing_rail",
        name: "Failing Rail",
        capabilities: ["account_verification"],
        hasCapability: (cap) => cap === "account_verification",
        verifyConnectivity: async () => ({ provider: "failing_rail", connected: false }),
        resolveAccount: vi.fn().mockRejectedValue(
          new ProviderInvalidAccountError("failing_rail", "Could not resolve account name"),
        ),
      };

      const customRegistry = new ProviderRegistry();
      customRegistry.register(failingProvider);

      const service = new AccountResolutionService(customRegistry);

      await expect(
        service.resolveAccount({
          bankCode: "000",
          accountNumber: "9999999999",
          providerId: "failing_rail",
        }),
      ).rejects.toThrowError(ProviderInvalidAccountError);
    });
  });

  // ===========================================================================
  // 2. Authentication & Authorization Tests
  // ===========================================================================
  describe("Endpoint Authentication (GET /api/v1/accounts/resolve)", () => {
    it("should reject unauthenticated requests with 401 Unauthorized", async () => {
      const res = await request(app)
        .get("/api/v1/accounts/resolve")
        .query({ bank_code: "058", account_number: "0123456789" });

      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("should reject requests with invalid or forged API keys with 401 Unauthorized", async () => {
      vi.spyOn(prisma.apiKey, "findUnique").mockResolvedValue(null);

      const res = await request(app)
        .get("/api/v1/accounts/resolve")
        .set("Authorization", `Bearer rc_test_invalid12345.12345678901234567890123456789012`)
        .query({ bank_code: "058", account_number: "0123456789" });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("should accept valid Ricarut API key bearer token", async () => {
      vi.spyOn(prisma.apiKey, "findUnique").mockResolvedValue(mockApiKeyRecord as any);
      vi.spyOn(prisma.apiKey, "update").mockResolvedValue({} as any);

      const mockClient = {
        get: vi.fn().mockResolvedValue({
          status: true,
          message: "Account number resolved",
          data: { account_number: "0123456789", account_name: "API KEY USER", bank_id: 9 },
        }),
        post: vi.fn(),
        verifyConnectivity: vi.fn(),
      };
      providerRegistry.register(new PaystackAdapter(mockClient as unknown as PaystackClient));

      const res = await request(app)
        .get("/api/v1/accounts/resolve")
        .set("Authorization", `Bearer ${validApiKey}`)
        .query({ bank_code: "058", account_number: "0123456789" });

      expect(res.status).toBe(200);
      expect(res.body.data.account_name).toBe("API KEY USER");
      expect(res.body.data.provider).toBe("paystack");
    });

    it("should accept valid session JWT bearer token with project context", async () => {
      const userId = "usr_acc_test_user";
      const validJwt = jwt.sign({ userId, email: "dev@example.com" }, env.JWT_SECRET, { expiresIn: "1h" });

      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: userId,
        email: "dev@example.com",
        firstName: "Dev",
        lastName: "User",
        status: "active",
      } as any);

      vi.spyOn(prisma.project, "findUnique").mockResolvedValue({
        id: "prj_default",
        organizationId: "org_default",
        environment: "test",
      } as any);

      vi.spyOn(prisma.organizationMember, "findUnique").mockResolvedValue({
        id: "mem_1",
        organizationId: "org_default",
        userId,
        role: "admin",
      } as any);

      const mockClient = {
        get: vi.fn().mockResolvedValue({
          status: true,
          message: "Account number resolved",
          data: { account_number: "0123456789", account_name: "TEST USER", bank_id: 9 },
        }),
        post: vi.fn(),
        verifyConnectivity: vi.fn(),
      };
      providerRegistry.register(new PaystackAdapter(mockClient as unknown as PaystackClient));

      const res = await request(app)
        .get("/api/v1/accounts/resolve")
        .set("Authorization", `Bearer ${validJwt}`)
        .set("x-project-id", "prj_default")
        .query({ bank_code: "058", account_number: "0123456789" });

      expect(res.status).toBe(200);
      expect(res.body.data.account_name).toBe("TEST USER");
    });
  });

  // ===========================================================================
  // 3. Request Input Validation Tests
  // ===========================================================================
  describe("Input Validation", () => {
    beforeEach(() => {
      vi.spyOn(prisma.apiKey, "findUnique").mockResolvedValue(mockApiKeyRecord as any);
      vi.spyOn(prisma.apiKey, "update").mockResolvedValue({} as any);
    });

    it("should reject when bank_code is missing", async () => {
      const res = await request(app)
        .get("/api/v1/accounts/resolve")
        .set("Authorization", `Bearer ${validApiKey}`)
        .query({ account_number: "0123456789" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.fields.bank_code).toBeDefined();
    });

    it("should reject when account_number is missing", async () => {
      const res = await request(app)
        .get("/api/v1/accounts/resolve")
        .set("Authorization", `Bearer ${validApiKey}`)
        .query({ bank_code: "058" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.fields.account_number).toBeDefined();
    });

    it("should reject malformed non-digit account_number", async () => {
      const res = await request(app)
        .get("/api/v1/accounts/resolve")
        .set("Authorization", `Bearer ${validApiKey}`)
        .query({ bank_code: "058", account_number: "01234ABCDE" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should reject account_number that is not exactly 10 digits", async () => {
      const res = await request(app)
        .get("/api/v1/accounts/resolve")
        .set("Authorization", `Bearer ${validApiKey}`)
        .query({ bank_code: "058", account_number: "12345" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should reject malformed non-digit bank_code", async () => {
      const res = await request(app)
        .get("/api/v1/accounts/resolve")
        .set("Authorization", `Bearer ${validApiKey}`)
        .query({ bank_code: "XYZ", account_number: "0123456789" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should accept camelCase query parameters (bankCode, accountNumber) as fallback", async () => {
      const mockClient = {
        get: vi.fn().mockResolvedValue({
          status: true,
          message: "Account number resolved",
          data: { account_number: "0123456789", account_name: "CAMEL CASE OK", bank_id: 9 },
        }),
        post: vi.fn(),
        verifyConnectivity: vi.fn(),
      };
      providerRegistry.register(new PaystackAdapter(mockClient as unknown as PaystackClient));

      const res = await request(app)
        .get("/api/v1/accounts/resolve")
        .set("Authorization", `Bearer ${validApiKey}`)
        .query({ bankCode: "058", accountNumber: "0123456789" });

      expect(res.status).toBe(200);
      expect(res.body.data.account_name).toBe("CAMEL CASE OK");
    });
  });

  // ===========================================================================
  // 4. Normalized Response & Leak Prevention
  // ===========================================================================
  describe("Normalized Response Format & Leak Prevention", () => {
    beforeEach(() => {
      vi.spyOn(prisma.apiKey, "findUnique").mockResolvedValue(mockApiKeyRecord as any);
      vi.spyOn(prisma.apiKey, "update").mockResolvedValue({} as any);
    });

    it("should return Ricarut-owned normalized data structure under data envelope", async () => {
      const mockClient = {
        get: vi.fn().mockResolvedValue({
          status: true,
          message: "Account number resolved",
          data: {
            account_number: "0001234567",
            account_name: "ALEXANDER RICARUT",
            bank_id: 9,
          },
        }),
        post: vi.fn(),
        verifyConnectivity: vi.fn(),
      };
      providerRegistry.register(new PaystackAdapter(mockClient as unknown as PaystackClient));

      const res = await request(app)
        .get("/api/v1/accounts/resolve")
        .set("Authorization", `Bearer ${validApiKey}`)
        .query({ bank_code: "058", account_number: "0001234567" });

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({
        account_number: "0001234567",
        account_name: "ALEXANDER RICARUT",
        bank_code: "058",
        provider: "paystack",
      });

      // Crucial: Paystack raw properties must NOT leak to the public API
      expect(res.body.data.bank_id).toBeUndefined();
      expect(res.body.status).toBeUndefined();
      expect(res.body.message).toBeUndefined();
      expect(res.body.requestId).toBeDefined();
    });

    it("should support the /v1/accounts/resolve alias identically", async () => {
      const mockClient = {
        get: vi.fn().mockResolvedValue({
          status: true,
          message: "Account number resolved",
          data: {
            account_number: "0001234567",
            account_name: "ALIAS ROUTE OK",
            bank_id: 9,
          },
        }),
        post: vi.fn(),
        verifyConnectivity: vi.fn(),
      };
      providerRegistry.register(new PaystackAdapter(mockClient as unknown as PaystackClient));

      const res = await request(app)
        .get("/v1/accounts/resolve")
        .set("Authorization", `Bearer ${validApiKey}`)
        .query({ bank_code: "058", account_number: "0001234567" });

      expect(res.status).toBe(200);
      expect(res.body.data.account_name).toBe("ALIAS ROUTE OK");
    });
  });

  // ===========================================================================
  // 5. Provider Error Normalization in HTTP Responses
  // ===========================================================================
  describe("Provider Error Normalization in API Responses", () => {
    beforeEach(() => {
      vi.spyOn(prisma.apiKey, "findUnique").mockResolvedValue(mockApiKeyRecord as any);
      vi.spyOn(prisma.apiKey, "update").mockResolvedValue({} as any);
    });

    it("should map account resolution failure / invalid bank code to 400 INVALID_ACCOUNT", async () => {
      const mockClient = {
        get: vi.fn().mockRejectedValue({
          message: "Could not resolve account name. Check parameters or try again.",
          statusCode: 422,
          providerCode: "invalid_bank_code",
        }),
        post: vi.fn(),
        verifyConnectivity: vi.fn(),
      };
      providerRegistry.register(new PaystackAdapter(mockClient as unknown as PaystackClient));

      const res = await request(app)
        .get("/api/v1/accounts/resolve")
        .set("Authorization", `Bearer ${validApiKey}`)
        .query({ bank_code: "999", account_number: "0123456789" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_ACCOUNT");
      expect(res.body.error.message).toContain("Could not resolve account name");
    });

    it("should map provider timeout to 504 PROVIDER_TIMEOUT", async () => {
      const mockClient = {
        get: vi.fn().mockRejectedValue({
          name: "TimeoutError",
          message: "Request timed out after 5000ms",
          code: "PAYSTACK_TIMEOUT",
          statusCode: 504,
        }),
        post: vi.fn(),
        verifyConnectivity: vi.fn(),
      };
      providerRegistry.register(new PaystackAdapter(mockClient as unknown as PaystackClient));

      const res = await request(app)
        .get("/api/v1/accounts/resolve")
        .set("Authorization", `Bearer ${validApiKey}`)
        .query({ bank_code: "058", account_number: "0123456789" });

      expect(res.status).toBe(504);
      expect(res.body.error.code).toBe("PROVIDER_TIMEOUT");
    });

    it("should map provider network failure to 503 PAYMENT_PROVIDER_UNAVAILABLE", async () => {
      const mockClient = {
        get: vi.fn().mockRejectedValue({
          message: "getaddrinfo ENOTFOUND api.paystack.co",
          code: "PAYSTACK_NETWORK_FAILURE",
          statusCode: 503,
        }),
        post: vi.fn(),
        verifyConnectivity: vi.fn(),
      };
      providerRegistry.register(new PaystackAdapter(mockClient as unknown as PaystackClient));

      const res = await request(app)
        .get("/api/v1/accounts/resolve")
        .set("Authorization", `Bearer ${validApiKey}`)
        .query({ bank_code: "058", account_number: "0123456789" });

      expect(res.status).toBe(503);
      expect(res.body.error.code).toBe("PAYMENT_PROVIDER_UNAVAILABLE");
    });

    it("should map provider authentication failure to 500 PROVIDER_AUTHENTICATION_FAILED", async () => {
      const mockClient = {
        get: vi.fn().mockRejectedValue({
          message: "Invalid Paystack API key",
          code: "PAYSTACK_AUTHENTICATION_FAILURE",
          statusCode: 401,
        }),
        post: vi.fn(),
        verifyConnectivity: vi.fn(),
      };
      providerRegistry.register(new PaystackAdapter(mockClient as unknown as PaystackClient));

      const res = await request(app)
        .get("/api/v1/accounts/resolve")
        .set("Authorization", `Bearer ${validApiKey}`)
        .query({ bank_code: "058", account_number: "0123456789" });

      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe("PROVIDER_AUTHENTICATION_FAILED");
    });

    it("should map provider rate limiting to 429 PROVIDER_RATE_LIMITED", async () => {
      const mockClient = {
        get: vi.fn().mockRejectedValue({
          message: "Too Many Requests",
          statusCode: 429,
        }),
        post: vi.fn(),
        verifyConnectivity: vi.fn(),
      };
      providerRegistry.register(new PaystackAdapter(mockClient as unknown as PaystackClient));

      const res = await request(app)
        .get("/api/v1/accounts/resolve")
        .set("Authorization", `Bearer ${validApiKey}`)
        .query({ bank_code: "058", account_number: "0123456789" });

      expect(res.status).toBe(429);
      expect(res.body.error.code).toBe("PROVIDER_RATE_LIMITED");
    });
  });

  // ===========================================================================
  // 6. Security & Credential Protection
  // ===========================================================================
  describe("Security & Redaction", () => {
    beforeEach(() => {
      vi.spyOn(prisma.apiKey, "findUnique").mockResolvedValue(mockApiKeyRecord as any);
      vi.spyOn(prisma.apiKey, "update").mockResolvedValue({} as any);
    });

    it("should scrub secret keys if an upstream error contains them", async () => {
      const secretKey = "sk_test_a3daa64cd60969870cbdf3ce3d6b2f22daa019a4";
      const mockClient = {
        get: vi.fn().mockRejectedValue(
          new Error(`Upstream failed with token ${secretKey}`),
        ),
        post: vi.fn(),
        verifyConnectivity: vi.fn(),
      };
      providerRegistry.register(new PaystackAdapter(mockClient as unknown as PaystackClient));

      const res = await request(app)
        .get("/api/v1/accounts/resolve")
        .set("Authorization", `Bearer ${validApiKey}`)
        .query({ bank_code: "058", account_number: "0123456789" });

      expect(res.body.error).toBeDefined();
      expect(JSON.stringify(res.body)).not.toContain(secretKey);
      expect(res.body.error.message).toContain("[REDACTED_SECRET_KEY]");
    });
  });
});
