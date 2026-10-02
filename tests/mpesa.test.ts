import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getMpesaConfig, isMpesaConfigured, MpesaConfig } from "../src/config/mpesa.config";
import { MpesaClient } from "../src/modules/providers/mpesa/mpesa.client";
import { MpesaB2CAdapter } from "../src/modules/providers/mpesa/mpesa.adapter";
import { providerRegistry } from "../src/modules/providers/provider.registry";
import {
  normalizeKenyanPhoneNumber,
  maskPhoneNumber,
  sanitizeMpesaText,
  formatKesAmount,
} from "../src/modules/providers/mpesa/mpesa.utils";
import {
  MpesaConfigurationError,
  MpesaAuthenticationError,
  MpesaTimeoutError,
} from "../src/modules/providers/mpesa/mpesa.types";
import {
  ProviderValidationError,
  ProviderInvalidAccountError,
  ProviderTransferFailedError,
} from "../src/modules/providers/provider.errors";

describe("Phase 7: Safaricom M-Pesa B2C Provider Integration", () => {
  const dummyConsumerKey = "s6mCHkvcx59yMyASfAHahUTCq8Ga1BOcASub378W5P4B8Y15";
  const dummyConsumerSecret = "dJ9nUhGlw3Q4otkzKz3t2GcONgrQxdcynUO9bIsPHqDkXaTMNOLLAuYLNkgPk5Rp";
  const dummyInitiatorName = "testapi";
  const dummyInitiatorPassword = "mfoniso2005";
  const dummySecurityCredential = "mock_encrypted_security_credential_base64==";
  const dummyShortcode = "600982";
  const dummyResultUrl = "https://ricarut.test/api/v1/webhooks/mpesa/b2c";
  const dummyQueueTimeoutUrl = "https://ricarut.test/api/v1/webhooks/mpesa/b2c/timeout";

  const validConfig: MpesaConfig = {
    env: "sandbox",
    consumerKey: dummyConsumerKey,
    consumerSecret: dummyConsumerSecret,
    initiatorName: dummyInitiatorName,
    initiatorPassword: dummyInitiatorPassword,
    securityCredential: dummySecurityCredential,
    shortcode: dummyShortcode,
    resultUrl: dummyResultUrl,
    queueTimeoutUrl: dummyQueueTimeoutUrl,
    baseUrl: "https://sandbox.safaricom.co.ke",
    timeoutMs: 15000,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // 1. CONFIGURATION & CREDENTIAL MANAGEMENT
  // ===========================================================================
  describe("1. Configuration & Security", () => {
    it("should load sandbox configuration correctly with all required credentials", () => {
      const config = getMpesaConfig(validConfig);
      expect(config.consumerKey).toBe(dummyConsumerKey);
      expect(config.consumerSecret).toBe(dummyConsumerSecret);
      expect(config.initiatorName).toBe(dummyInitiatorName);
      expect(config.securityCredential).toBe(dummySecurityCredential);
      expect(config.shortcode).toBe(dummyShortcode);
      expect(config.baseUrl).toBe("https://sandbox.safaricom.co.ke");
    });

    it("should detect missing credentials and throw MpesaConfigurationError", () => {
      expect(() => {
        getMpesaConfig({
          ...validConfig,
          consumerKey: "",
        });
      }).toThrow(MpesaConfigurationError);

      expect(() => {
        getMpesaConfig({
          ...validConfig,
          consumerSecret: "",
        });
      }).toThrow(/consumer secret/i);

      expect(() => {
        getMpesaConfig({
          ...validConfig,
          securityCredential: "",
        });
      }).toThrow(/security credential/i);
    });

    it("should enforce sandbox endpoints in sandbox mode", () => {
      const config = getMpesaConfig({
        ...validConfig,
        baseUrl: "https://sandbox.safaricom.co.ke",
      });
      expect(config.baseUrl).toContain("sandbox.safaricom.co.ke");
    });
  });

  // ===========================================================================
  // 2. KENYAN PHONE NUMBER NORMALIZATION & SANITIZATION
  // ===========================================================================
  describe("2. Phone Number Normalization & Sanitization", () => {
    it("should normalize local 07... numbers to 2547...", () => {
      expect(normalizeKenyanPhoneNumber("0712345678")).toBe("254712345678");
      expect(normalizeKenyanPhoneNumber("0722000000")).toBe("254722000000");
    });

    it("should normalize local 01... numbers to 2541...", () => {
      expect(normalizeKenyanPhoneNumber("0112345678")).toBe("254112345678");
    });

    it("should normalize numbers with international +254 prefix", () => {
      expect(normalizeKenyanPhoneNumber("+254712345678")).toBe("254712345678");
      expect(normalizeKenyanPhoneNumber("+254 712 345 678")).toBe("254712345678");
      expect(normalizeKenyanPhoneNumber("+254-712-345-678")).toBe("254712345678");
    });

    it("should pass through already normalized 2547... numbers", () => {
      expect(normalizeKenyanPhoneNumber("254712345678")).toBe("254712345678");
    });

    it("should reject invalid phone numbers that cannot be Kenyan mobile MSISDNs", () => {
      expect(() => normalizeKenyanPhoneNumber("12345")).toThrow(ProviderInvalidAccountError);
      expect(() => normalizeKenyanPhoneNumber("08012345678")).toThrow(ProviderInvalidAccountError); // Nigerian format
      expect(() => normalizeKenyanPhoneNumber("abc")).toThrow(ProviderInvalidAccountError);
    });

    it("should safely mask phone numbers for logs and user interfaces", () => {
      expect(maskPhoneNumber("254712345678")).toBe("2547****5678");
      expect(maskPhoneNumber("0712345678")).toBe("0712****5678");
    });

    it("should sanitize provider text and redact sensitive credentials", () => {
      const sensitive = "Authorization: Bearer secret_token_123 with password: my_password_456";
      const sanitized = sanitizeMpesaText(sensitive);
      expect(sanitized).not.toContain("secret_token_123");
      expect(sanitized).not.toContain("my_password_456");
      expect(sanitized).toContain("[REDACTED]");
    });

    it("should convert minor currency units to major KES units correctly", () => {
      expect(formatKesAmount(100000)).toBe(1000); // 100000 minor cents = 1000 KES
      expect(formatKesAmount(15050)).toBe(150.5);
    });
  });

  // ===========================================================================
  // 3. MPESA CLIENT & OAUTH TOKEN MANAGEMENT
  // ===========================================================================
  describe("3. M-Pesa Client & OAuth Token Management", () => {
    it("should request and cache access tokens from the sandbox OAuth endpoint", async () => {
      const client = new MpesaClient(validConfig);

      let fetchCallCount = 0;
      vi.spyOn(global, "fetch").mockImplementation(async (url: any) => {
        fetchCallCount++;
        if (url.toString().includes("/oauth/v1/generate")) {
          return new Response(
            JSON.stringify({
              access_token: "mock_daraja_access_token_abc123",
              expires_in: "3599",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
        return new Response("{}", { status: 200 });
      });

      // First call fetches token
      const token1 = await client.getAccessToken();
      expect(token1).toBe("mock_daraja_access_token_abc123");
      expect(fetchCallCount).toBe(1);

      // Second call reuses cached token without making another HTTP request
      const token2 = await client.getAccessToken();
      expect(token2).toBe("mock_daraja_access_token_abc123");
      expect(fetchCallCount).toBe(1);
    });

    it("should throw MpesaAuthenticationError when Daraja credentials are invalid", async () => {
      const client = new MpesaClient(validConfig);

      vi.spyOn(global, "fetch").mockResolvedValue(
        new Response(
          JSON.stringify({
            errorCode: "400.002.02",
            errorMessage: "Bad Request - Invalid Credentials",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        )
      );

      await expect(client.getAccessToken()).rejects.toThrow(MpesaAuthenticationError);
    });

    it("should handle network timeouts safely", async () => {
      const client = new MpesaClient({
        ...validConfig,
        timeoutMs: 10,
      });

      vi.spyOn(global, "fetch").mockImplementation(
        () =>
          new Promise((_, reject) => {
            const err = new Error("The operation was aborted");
            err.name = "AbortError";
            reject(err);
          })
      );

      await expect(client.getAccessToken()).rejects.toThrow(MpesaTimeoutError);
    });
  });

  // ===========================================================================
  // 4. MPESA B2C ADAPTER & TRANSFER CONTRACT
  // ===========================================================================
  describe("4. MpesaB2CAdapter Transfer Provider Implementation", () => {
    let mockClient: any;
    let adapter: MpesaB2CAdapter;

    beforeEach(() => {
      mockClient = {
        getConfig: vi.fn().mockReturnValue(validConfig),
        sendB2CPayment: vi.fn(),
        queryTransactionStatus: vi.fn(),
        verifyConnectivity: vi.fn().mockResolvedValue({ connected: true, latencyMs: 50 }),
      };
      adapter = new MpesaB2CAdapter(mockClient as unknown as MpesaClient, validConfig);
    });

    it("should translate Ricarut transfer to Daraja B2C request and return pending status", async () => {
      mockClient.sendB2CPayment.mockResolvedValue({
        ConversationID: "AG_20261002_00001",
        OriginatorConversationID: "ricarut-trf-12345",
        ResponseCode: "0",
        ResponseDescription: "Accept the service request successfully.",
      });

      const result = await adapter.initiateTransfer({
        amount: 250000, // 2,500 KES in minor units (cents)
        currency: "KES",
        reference: "ricarut-trf-12345",
        destinationType: "mobile_money",
        phoneNumber: "0712345678",
        reason: "Contractor Payout",
        idempotencyKey: "idem-key-999",
      });

      expect(mockClient.sendB2CPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          Amount: 2500,
          PartyB: "254712345678",
          Occasion: "ricarut-trf-12345",
          Remarks: "Contractor Payout",
        })
      );

      expect(result.status).toBe("pending");
      expect(result.providerReference).toBe("AG_20261002_00001");
      expect(result.currency).toBe("KES");
      expect(result.amount).toBe(250000);
    });

    it("should reject non-KES currencies with ProviderValidationError", async () => {
      await expect(
        adapter.initiateTransfer({
          amount: 500000,
          currency: "NGN", // Invalid currency for M-Pesa B2C
          reference: "ref-ngn-invalid",
          phoneNumber: "0712345678",
        })
      ).rejects.toThrow(ProviderValidationError);
    });

    it("should reject transfers missing a destination phone number", async () => {
      await expect(
        adapter.initiateTransfer({
          amount: 100000,
          currency: "KES",
          reference: "ref-no-phone",
        })
      ).rejects.toThrow(ProviderValidationError);
    });

    it("should handle Daraja synchronous rejection", async () => {
      mockClient.sendB2CPayment.mockRejectedValue(
        new ProviderTransferFailedError("mpesa", "Initiator information is invalid")
      );

      await expect(
        adapter.initiateTransfer({
          amount: 100000,
          currency: "KES",
          reference: "ref-err-1",
          phoneNumber: "0712345678",
        })
      ).rejects.toThrow(ProviderTransferFailedError);
    });
  });

  // ===========================================================================
  // 5. PROVIDER REGISTRY & MULTI-RAIL CAPABILITIES
  // ===========================================================================
  describe("5. Provider Registry Multi-Rail Registration", () => {
    it("should have both Paystack and M-Pesa registered in providerRegistry", () => {
      const paystack = providerRegistry.resolve("paystack");
      expect(paystack).toBeDefined();
      expect(paystack.id).toBe("paystack");
      expect(paystack.hasCapability("transfers")).toBe(true);
      expect(paystack.hasCapability("account_verification")).toBe(true);

      const mpesa = providerRegistry.resolve("mpesa");
      expect(mpesa).toBeDefined();
      expect(mpesa.id).toBe("mpesa");
      expect(mpesa.name).toBe("Safaricom M-Pesa");
      expect(mpesa.hasCapability("transfers")).toBe(true);
      expect(mpesa.hasCapability("webhooks")).toBe(true);
      // M-Pesa does not implement NUBAN account verification
      expect(mpesa.hasCapability("account_verification")).toBe(false);
    });

    it("should list both registered providers cleanly via listProviders()", () => {
      const providers = providerRegistry.listProviders();
      const ids = providers.map((p) => p.id);
      expect(ids).toContain("paystack");
      expect(ids).toContain("mpesa");
    });
  });

  // ===========================================================================
  // 6. ASYNCHRONOUS WEBHOOK CALLBACK PROCESSING
  // ===========================================================================
  describe("6. Asynchronous Callback & ResultURL Processing", () => {
    let adapter: MpesaB2CAdapter;

    beforeEach(() => {
      const mockClient = {
        getConfig: vi.fn().mockReturnValue(validConfig),
        sendB2CPayment: vi.fn(),
        queryTransactionStatus: vi.fn(),
        verifyConnectivity: vi.fn(),
      };
      adapter = new MpesaB2CAdapter(mockClient as unknown as MpesaClient, validConfig);
    });

    it("should parse successful B2C Result callback (ResultCode: 0)", async () => {
      const sampleCallback = {
        Result: {
          ResultType: 0,
          ResultCode: 0,
          ResultDesc: "The service request is processed successfully.",
          OriginatorConversationID: "ricarut-trf-998877",
          ConversationID: "AG_20261002_00002",
          TransactionID: "QKH1234567",
          ResultParameters: {
            ResultParameter: [
              { Key: "TransactionAmount", Value: 1000 },
              { Key: "TransactionReceipt", Value: "QKH1234567" },
              { Key: "B2CRecipientIsRegisteredCustomer", Value: "Y" },
              { Key: "ReceiverPartyPublicName", Value: "254712345678 - Jane Doe" },
            ],
          },
        },
      };

      const event = adapter.parseWebhookEvent(sampleCallback);
      expect(event.eventType).toBe("transfer.success");
      expect(event.transferReference).toBe("ricarut-trf-998877");
      expect(event.status).toBe("successful");
      expect(event.rawEvent).toEqual(sampleCallback);
    });

    it("should parse failed B2C Result callback (ResultCode !== 0)", async () => {
      const sampleFailedCallback = {
        Result: {
          ResultType: 0,
          ResultCode: 2001,
          ResultDesc: "The initiator account balance is insufficient.",
          OriginatorConversationID: "ricarut-trf-failed-1",
          ConversationID: "AG_20261002_00003",
          TransactionID: "NONE",
        },
      };

      const event = adapter.parseWebhookEvent(sampleFailedCallback);
      expect(event.eventType).toBe("transfer.failed");
      expect(event.transferReference).toBe("ricarut-trf-failed-1");
      expect(event.status).toBe("failed");
      expect(event.failureReason).toContain("insufficient");
    });

    it("should verify webhook signature/token safely", () => {
      const payload = { Result: { ResultCode: 0 } };
      // Valid JSON payload passes structural verification
      expect(adapter.verifyWebhookSignature("", JSON.stringify(payload))).toBe(true);

      // Empty or non-object returns false
      expect(adapter.verifyWebhookSignature("", "")).toBe(false);
      expect(adapter.verifyWebhookSignature("", "not a json")).toBe(false);
    });
  });

  // ===========================================================================
  // 7. STATUS INQUIRY RECONCILIATION
  // ===========================================================================
  describe("7. Status Reconciliation (verifyTransfer)", () => {
    it("should query Daraja and normalize status response", async () => {
      const mockClient = {
        getConfig: vi.fn().mockReturnValue(validConfig),
        sendB2CPayment: vi.fn(),
        queryTransactionStatus: vi.fn().mockResolvedValue({
          ConversationID: "AG_QUERY_1",
          OriginatorConversationID: "trf-query-123",
          ResponseCode: "0",
          ResponseDescription: "Accept the service request successfully.",
        }),
        verifyConnectivity: vi.fn(),
      };
      const adapter = new MpesaB2CAdapter(mockClient as unknown as MpesaClient, validConfig);

      const status = await adapter.verifyTransfer({ reference: "trf-query-123" });
      expect(status.transferReference).toBe("trf-query-123");
      expect(status.status).toBe("processing");
      expect(mockClient.queryTransactionStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          OriginatorConversationID: "trf-query-123",
        })
      );
    });
  });
});
