import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";
import { providerRegistry, ProviderRegistry } from "../src/modules/providers/provider.registry";
import { FinancialService } from "../src/modules/providers/financial.service";
import { PaystackAdapter } from "../src/modules/providers/paystack/paystack.adapter";
import { PaystackClient } from "../src/modules/providers/paystack/paystack.client";
import {
  FinancialProvider,
  AccountVerificationProvider,
  TransferProvider,
  RecipientProvider,
  WebhookProvider,
} from "../src/modules/providers/contracts/provider.contracts";
import {
  ProviderAccount,
  ProviderRecipient,
  ProviderTransfer,
  ProviderWebhookEvent,
  ProviderConnectivityCheck,
} from "../src/modules/providers/contracts/provider.types";
import {
  ProviderError,
  ProviderUnavailableError,
  ProviderAuthenticationError,
  ProviderInvalidAccountError,
  ProviderTransferFailedError,
  ProviderTimeoutError,
  ProviderRateLimitedError,
  UnknownProviderError,
  normalizeProviderError,
} from "../src/modules/providers/provider.errors";
import {
  PaystackAuthenticationError,
  PaystackTimeoutError,
  PaystackNetworkError,
  PaystackApiError,
  PaystackUnexpectedResponseError,
} from "../src/modules/providers/paystack/paystack.errors";

describe("Phase 2: Provider Abstraction & Paystack Adapter", () => {
  const dummySecretKey = "sk_test_a3daa64cd60969870cbdf3ce3d6b2f22daa019a4";

  // Mock PaystackClient instance
  let mockClient: any;
  let adapter: PaystackAdapter;

  beforeEach(() => {
    mockClient = {
      get: vi.fn(),
      post: vi.fn(),
      verifyConnectivity: vi.fn(),
    };
    adapter = new PaystackAdapter(mockClient as unknown as PaystackClient);
  });

  // ---------------------------------------------------------------------------
  // 1. Provider Registry & Resolution
  // ---------------------------------------------------------------------------
  describe("ProviderRegistry & Service Resolution", () => {
    it("should resolve PaystackAdapter as the registered financial provider", () => {
      const provider = providerRegistry.resolve("paystack");
      expect(provider).toBeDefined();
      expect(provider.id).toBe("paystack");
      expect(provider.name).toBe("Paystack");
      expect(provider.hasCapability("transfers")).toBe(true);
      expect(provider.hasCapability("account_verification")).toBe(true);
    });

    it("should resolve the default provider when no provider ID is specified", () => {
      const defaultProvider = providerRegistry.resolve();
      expect(defaultProvider).toBeDefined();
      expect(defaultProvider.id).toBe("paystack");
    });

    it("should safely reject resolution of an unregistered provider with ProviderUnavailableError", () => {
      expect(() => {
        providerRegistry.resolve("unregistered_bank_provider");
      }).toThrowError(ProviderUnavailableError);
    });

    it("should resolve capability-specific providers cleanly", () => {
      const accountResolver = providerRegistry.resolveAccountVerification("paystack");
      expect(typeof accountResolver.resolveAccount).toBe("function");

      const recipientCreator = providerRegistry.resolveRecipient("paystack");
      expect(typeof recipientCreator.createRecipient).toBe("function");

      const transferExec = providerRegistry.resolveTransfer("paystack");
      expect(typeof transferExec.initiateTransfer).toBe("function");
      expect(typeof transferExec.verifyTransfer).toBe("function");

      const webhookHandler = providerRegistry.resolveWebhook("paystack");
      expect(typeof webhookHandler.verifyWebhookSignature).toBe("function");
      expect(typeof webhookHandler.parseWebhookEvent).toBe("function");
    });

    it("should allow dynamic registration of custom or future financial providers", () => {
      const customRegistry = new ProviderRegistry();
      const mockFutureProvider: FinancialProvider = {
        id: "future_provider",
        name: "Future Banking Rail",
        capabilities: ["connectivity"],
        hasCapability: (cap) => cap === "connectivity",
        verifyConnectivity: async () => ({ provider: "future_provider", connected: true }),
      };

      customRegistry.register(mockFutureProvider);
      const resolved = customRegistry.resolve("future_provider");
      expect(resolved.id).toBe("future_provider");
      expect(resolved.name).toBe("Future Banking Rail");
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Decoupled Financial Service Interaction
  // ---------------------------------------------------------------------------
  describe("FinancialService Agnostic Layer", () => {
    it("should execute operations through FinancialService without business logic depending on Paystack", async () => {
      const mockCustomProvider: FinancialProvider & AccountVerificationProvider = {
        id: "test_rail",
        name: "Test Rail",
        capabilities: ["account_verification", "connectivity"],
        hasCapability: (cap) => cap === "account_verification" || cap === "connectivity",
        verifyConnectivity: async () => ({ provider: "test_rail", connected: true }),
        resolveAccount: async (params) => ({
          provider: "test_rail",
          accountNumber: params.accountNumber,
          accountName: "ADA LOVELACE",
          bankCode: params.bankCode,
          currency: "NGN",
        }),
      };

      const testRegistry = new ProviderRegistry();
      testRegistry.register(mockCustomProvider);
      const svc = new FinancialService(testRegistry);

      const result = await svc.resolveAccount(
        { accountNumber: "0123456789", bankCode: "058" },
        "test_rail",
      );

      expect(result.provider).toBe("test_rail");
      expect(result.accountName).toBe("ADA LOVELACE");
      expect(result.accountNumber).toBe("0123456789");
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Response Normalization
  // ---------------------------------------------------------------------------
  describe("Paystack Response Normalization", () => {
    it("should normalize Paystack account resolution into ProviderAccount", async () => {
      mockClient.get.mockResolvedValueOnce({
        status: true,
        message: "Account number resolved",
        data: {
          account_number: "0001234567",
          account_name: "ALEXANDER TEST",
          bank_id: 9,
        },
      });

      const result: ProviderAccount = await adapter.resolveAccount({
        accountNumber: "0001234567",
        bankCode: "058",
      });

      expect(result).toEqual({
        provider: "paystack",
        accountNumber: "0001234567",
        accountName: "ALEXANDER TEST",
        bankCode: "058",
        currency: "NGN",
      });
      expect((result as any).bank_id).toBeUndefined(); // Upstream leak prevented
    });

    it("should normalize Paystack recipient creation into ProviderRecipient", async () => {
      mockClient.post.mockResolvedValueOnce({
        status: true,
        message: "Transfer recipient created",
        data: {
          recipient_code: "RCP_2x5j67oqb1g5n0v",
          type: "nuban",
          name: "ALEXANDER TEST",
          currency: "NGN",
          details: {
            account_number: "0001234567",
            account_name: "ALEXANDER TEST",
            bank_code: "058",
            bank_name: "Guaranty Trust Bank",
          },
        },
      });

      const result: ProviderRecipient = await adapter.createRecipient({
        name: "ALEXANDER TEST",
        accountNumber: "0001234567",
        bankCode: "058",
      });

      expect(result).toEqual({
        provider: "paystack",
        recipientReference: "RCP_2x5j67oqb1g5n0v",
        accountNumber: "0001234567",
        accountName: "ALEXANDER TEST",
        bankCode: "058",
        currency: "NGN",
        type: "nuban",
      });
    });

    it("should normalize Paystack transfer initiation into ProviderTransfer", async () => {
      mockClient.post.mockResolvedValueOnce({
        status: true,
        message: "Transfer has been queued",
        data: {
          reference: "txn_ric_9999",
          transfer_code: "TRF_1ptvuv3ixieets7",
          amount: 500000,
          currency: "NGN",
          status: "success",
          fee: 1000,
          createdAt: "2026-09-30T10:00:00.000Z",
        },
      });

      const result: ProviderTransfer = await adapter.initiateTransfer({
        amount: 500000,
        recipientReference: "RCP_2x5j67oqb1g5n0v",
        reference: "txn_ric_9999",
        reason: "Contractor Payout",
      });

      expect(result.provider).toBe("paystack");
      expect(result.providerReference).toBe("TRF_1ptvuv3ixieets7");
      expect(result.transferReference).toBe("txn_ric_9999");
      expect(result.amount).toBe(500000);
      expect(result.currency).toBe("NGN");
      expect(result.status).toBe("successful");
      expect(result.fee).toBe(1000);
      expect(result.initiatedAt).toBeInstanceOf(Date);
    });

    it("should normalize Paystack transfer verification into ProviderTransfer", async () => {
      mockClient.get.mockResolvedValueOnce({
        status: true,
        message: "Transfer retrieved",
        data: {
          reference: "txn_ric_8888",
          transfer_code: "TRF_8888_code",
          amount: 150000,
          currency: "NGN",
          status: "pending",
          createdAt: "2026-09-30T10:00:00.000Z",
        },
      });

      const result: ProviderTransfer = await adapter.verifyTransfer({
        reference: "txn_ric_8888",
      });

      expect(result.provider).toBe("paystack");
      expect(result.providerReference).toBe("TRF_8888_code");
      expect(result.transferReference).toBe("txn_ric_8888");
      expect(result.status).toBe("processing");
    });

    it("should normalize Paystack webhook payload into ProviderWebhookEvent", () => {
      const rawPayload = {
        event: "transfer.success",
        data: {
          id: 998877,
          reference: "txn_ric_7777",
          transfer_code: "TRF_7777_code",
          amount: 250000,
          currency: "NGN",
          status: "success",
          transferred_at: "2026-09-30T10:05:00.000Z",
        },
      };

      const result: ProviderWebhookEvent = adapter.parseWebhookEvent(rawPayload);

      expect(result.provider).toBe("paystack");
      expect(result.eventId).toBe("998877");
      expect(result.eventType).toBe("transfer.success");
      expect(result.providerReference).toBe("TRF_7777_code");
      expect(result.transferReference).toBe("txn_ric_7777");
      expect(result.status).toBe("successful");
      expect(result.amount).toBe(250000);
      expect(result.currency).toBe("NGN");
      expect(result.rawEvent).toEqual(rawPayload);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Provider Error Normalization
  // ---------------------------------------------------------------------------
  describe("Provider Error Normalization", () => {
    it("should map PaystackAuthenticationError to ProviderAuthenticationError", () => {
      const paystackErr = new PaystackAuthenticationError("Invalid API key");
      const normalized = normalizeProviderError("paystack", paystackErr);

      expect(normalized).toBeInstanceOf(ProviderAuthenticationError);
      expect(normalized.statusCode).toBe(500);
      expect(normalized.code).toBe("PROVIDER_AUTHENTICATION_FAILED");
      expect(normalized.provider).toBe("paystack");
    });

    it("should map PaystackTimeoutError to ProviderTimeoutError", () => {
      const paystackErr = new PaystackTimeoutError("Request timed out");
      const normalized = normalizeProviderError("paystack", paystackErr);

      expect(normalized).toBeInstanceOf(ProviderTimeoutError);
      expect(normalized.statusCode).toBe(504);
      expect(normalized.code).toBe("PROVIDER_TIMEOUT");
    });

    it("should map PaystackNetworkError to ProviderUnavailableError", () => {
      const paystackErr = new PaystackNetworkError("Connection refused");
      const normalized = normalizeProviderError("paystack", paystackErr);

      expect(normalized).toBeInstanceOf(ProviderUnavailableError);
      expect(normalized.statusCode).toBe(503);
      expect(normalized.code).toBe("PAYMENT_PROVIDER_UNAVAILABLE");
    });

    it("should map account resolution failures to ProviderInvalidAccountError", () => {
      const paystackErr = new PaystackApiError("Could not resolve account name", 400);
      const normalized = normalizeProviderError("paystack", paystackErr);

      expect(normalized).toBeInstanceOf(ProviderInvalidAccountError);
      expect(normalized.statusCode).toBe(400);
      expect(normalized.code).toBe("INVALID_ACCOUNT");
    });

    it("should map rate limit HTTP 429 to ProviderRateLimitedError", () => {
      const paystackErr = new PaystackApiError("Too many requests", 429);
      const normalized = normalizeProviderError("paystack", paystackErr);

      expect(normalized).toBeInstanceOf(ProviderRateLimitedError);
      expect(normalized.statusCode).toBe(429);
      expect(normalized.code).toBe("PROVIDER_RATE_LIMITED");
    });

    it("should map transfer balance/rejections to ProviderTransferFailedError", () => {
      const paystackErr = new PaystackApiError("Insufficient balance for transfer", 400);
      const normalized = normalizeProviderError("paystack", paystackErr);

      expect(normalized).toBeInstanceOf(ProviderTransferFailedError);
      expect(normalized.statusCode).toBe(400);
      expect(normalized.code).toBe("TRANSFER_FAILED");
    });

    it("should wrap unclassified provider errors in UnknownProviderError", () => {
      const unexpectedErr = new Error("Something strange occurred upstream");
      const normalized = normalizeProviderError("paystack", unexpectedErr);

      expect(normalized).toBeInstanceOf(UnknownProviderError);
      expect(normalized.statusCode).toBe(502);
      expect(normalized.code).toBe("UNKNOWN_PROVIDER_ERROR");
    });

    it("should catch and normalize errors inside PaystackAdapter methods", async () => {
      mockClient.get.mockRejectedValueOnce(
        new PaystackApiError("Could not resolve bank code", 400),
      );

      await expect(
        adapter.resolveAccount({ accountNumber: "9999999999", bankCode: "000" }),
      ).rejects.toThrowError(ProviderInvalidAccountError);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Webhook Signature Verification
  // ---------------------------------------------------------------------------
  describe("Webhook Signature Verification", () => {
    it("should verify valid Paystack HMAC-SHA512 signatures", () => {
      const payload = JSON.stringify({ event: "transfer.success", id: 12345 });
      const validSignature = crypto
        .createHmac("sha512", dummySecretKey)
        .update(payload)
        .digest("hex");

      const isValid = adapter.verifyWebhookSignature(validSignature, payload);
      expect(isValid).toBe(true);
    });

    it("should reject tampered or invalid signatures safely", () => {
      const payload = JSON.stringify({ event: "transfer.success", id: 12345 });
      const invalidSignature = "invalid_forged_signature_hex_value";

      const isValid = adapter.verifyWebhookSignature(invalidSignature, payload);
      expect(isValid).toBe(false);
    });

    it("should return false on empty inputs without throwing unhandled errors", () => {
      expect(adapter.verifyWebhookSignature("", "")).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Security & Credential Protection
  // ---------------------------------------------------------------------------
  describe("Security & Credential Protection", () => {
    it("should sanitize and scrub secret keys if upstream errors leak them", () => {
      const errorWithSecret = new Error(
        `Failed with key sk_test_a3daa64cd60969870cbdf3ce3d6b2f22daa019a4 and Bearer token123`,
      );
      const normalized = normalizeProviderError("paystack", errorWithSecret);

      expect(normalized.message).not.toContain("sk_test_a3daa64cd60969870cbdf3ce3d6b2f22daa019a4");
      expect(normalized.message).toContain("[REDACTED_SECRET_KEY]");
      expect(normalized.message).toContain("Bearer [REDACTED]");
    });
  });
});
