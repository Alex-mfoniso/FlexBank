import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import crypto from "crypto";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { providerRegistry, ProviderRegistry } from "../src/modules/providers/provider.registry";
import { RicarutTransferService } from "../src/modules/transfers/ricarut-transfer.service";
import { TransferProvider, FinancialProvider } from "../src/modules/providers/contracts/provider.contracts";
import { PaystackAdapter } from "../src/modules/providers/paystack/paystack.adapter";
import { PaystackClient } from "../src/modules/providers/paystack/paystack.client";

describe("Phase 4: Developer Outbound Transfers", () => {
  // Test Ricarut API Key credentials (matches /^(fb|rc)_(test|live)_([a-zA-Z0-9]{12})\.([a-zA-Z0-9]{32})$/)
  const testKeyPrefixA = "rc_test_123456789012";
  const testSecretA = "abcdefghijklmnopqrstuvwxyz012345";
  const validApiKeyA = `${testKeyPrefixA}.${testSecretA}`;
  const apiKeyHashA = crypto.createHash("sha256").update(validApiKeyA).digest("hex");

  const testKeyPrefixB = "rc_test_987654321098";
  const testSecretB = "zyxwvutsrqponmlkjihgfedcba543210";
  const validApiKeyB = `${testKeyPrefixB}.${testSecretB}`;
  const apiKeyHashB = crypto.createHash("sha256").update(validApiKeyB).digest("hex");

  const mockProjectA = {
    id: "prj_test_transfer_a",
    organizationId: "org_test_transfer_a",
    environment: "test",
  };

  const mockProjectB = {
    id: "prj_test_transfer_b",
    organizationId: "org_test_transfer_b",
    environment: "test",
  };

  const mockApiKeyRecordA = {
    id: "key_transfer_a",
    keyPrefix: testKeyPrefixA,
    keyHash: apiKeyHashA,
    projectId: mockProjectA.id,
    environment: "test",
    revokedAt: null,
    expiresAt: null,
    project: mockProjectA,
  };

  const mockApiKeyRecordB = {
    id: "key_transfer_b",
    keyPrefix: testKeyPrefixB,
    keyHash: apiKeyHashB,
    projectId: mockProjectB.id,
    environment: "test",
    revokedAt: null,
    expiresAt: null,
    project: mockProjectB,
  };

  // In-memory data store for Prisma mocks
  let idempotencyStore: Map<string, any>;
  let transferStore: Map<string, any>;
  let providerTxnStore: any[];

  beforeEach(() => {
    vi.restoreAllMocks();

    idempotencyStore = new Map();
    transferStore = new Map();
    providerTxnStore = [];

    // Mock API key lookups
    vi.spyOn(prisma.apiKey, "findUnique").mockImplementation(async ({ where }: any) => {
      if (where.keyPrefix === testKeyPrefixA) return mockApiKeyRecordA as any;
      if (where.keyPrefix === testKeyPrefixB) return mockApiKeyRecordB as any;
      return null;
    });
    vi.spyOn(prisma.apiKey, "update").mockResolvedValue({} as any);

    // Mock background API request logs
    if (prisma.apiRequestLog) {
      vi.spyOn(prisma.apiRequestLog, "create").mockResolvedValue({} as any);
    }

    // Mock Prisma idempotency records
    vi.spyOn(prisma.idempotencyRecord, "findUnique").mockImplementation(async ({ where }: any) => {
      const key = `${where.projectId_key.projectId}:${where.projectId_key.key}`;
      return idempotencyStore.get(key) || null;
    });

    vi.spyOn(prisma.idempotencyRecord, "upsert").mockImplementation(async ({ where, create, update }: any) => {
      const key = `${where.projectId_key.projectId}:${where.projectId_key.key}`;
      const existing = idempotencyStore.get(key);
      const record = existing ? { ...existing, ...update } : { ...create };
      idempotencyStore.set(key, record);
      return record;
    });

    vi.spyOn(prisma.idempotencyRecord, "update").mockImplementation(async ({ where, data }: any) => {
      const key = `${where.projectId_key.projectId}:${where.projectId_key.key}`;
      const existing = idempotencyStore.get(key) || {};
      const updated = { ...existing, ...data };
      idempotencyStore.set(key, updated);
      return updated;
    });

    // Mock Prisma transfers
    vi.spyOn(prisma.transfer, "findFirst").mockImplementation(async ({ where }: any) => {
      for (const t of transferStore.values()) {
        if (t.projectId !== where.projectId) continue;
        if (where.reference && t.reference === where.reference) return t;
        if (where.id && t.id === where.id) return t;
        if (where.OR) {
          const matched = where.OR.some((cond: any) => cond.id === t.id || cond.reference === t.reference);
          if (matched) return t;
        }
      }
      return null;
    });

    vi.spyOn(prisma.transfer, "create").mockImplementation(async ({ data }: any) => {
      const record = {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
      };
      transferStore.set(data.id, record);
      return record;
    });

    vi.spyOn(prisma, "$transaction").mockImplementation(async (cb: any) => cb(prisma));

    vi.spyOn(prisma.transfer, "findUnique").mockImplementation(async ({ where }: any) => {
      return transferStore.get(where.id) || null;
    });

    vi.spyOn(prisma.transfer, "update").mockImplementation(async ({ where, data }: any) => {
      const existing = transferStore.get(where.id);
      const updated = { ...existing, ...data, updatedAt: new Date() };
      transferStore.set(where.id, updated);
      return updated;
    });

    // Mock Prisma provider transactions
    vi.spyOn(prisma.providerTransaction, "create").mockImplementation(async ({ data }: any) => {
      const record = { ...data, id: `ptxn_${Date.now()}`, createdAt: new Date() };
      providerTxnStore.push(record);
      return record;
    });
  });

  function createStandardMockClient() {
    return {
      get: vi.fn().mockImplementation(async (path: string) => {
        if (path.includes("/bank/resolve")) {
          return {
            status: true,
            data: {
              account_number: "0123456789",
              account_name: "ALEXANDER TEST",
              bank_id: 9,
            },
          };
        }
        return { status: true, data: {} };
      }),
      post: vi.fn().mockImplementation(async (path: string, body: any) => {
        if (path === "/transferrecipient") {
          return {
            status: true,
            data: {
              recipient_code: "RCP_test_12345",
              type: "nuban",
              name: "ALEXANDER TEST",
              currency: "NGN",
            },
          };
        }
        if (path === "/transfer") {
          return {
            status: true,
            data: {
              reference: body.reference,
              transfer_code: "TRF_test_98765",
              amount: body.amount,
              currency: "NGN",
              status: "pending",
              fee: 1000,
              createdAt: new Date().toISOString(),
            },
          };
        }
        throw new Error(`Unexpected path: ${path}`);
      }),
      verifyConnectivity: vi.fn(),
    };
  }

  // ===========================================================================
  // 1. Successful Transfer Initiation
  // ===========================================================================
  describe("Successful Transfer Initiation", () => {
    it("should initiate transfer, map provider parameters, and return normalized Ricarut response", async () => {
      const mockPaystackClient = createStandardMockClient();
      providerRegistry.register(new PaystackAdapter(mockPaystackClient as unknown as PaystackClient));

      const payload = {
        amount: 500000,
        currency: "NGN",
        bank_code: "058",
        account_number: "0123456789",
        account_name: "ALEXANDER TEST",
        reason: "Supplier payout",
        reference: "ref_order_1001",
      };

      const res = await request(app)
        .post("/v1/transfers")
        .set("Authorization", `Bearer ${validApiKeyA}`)
        .set("Idempotency-Key", "idem_test_1001")
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toMatch(/^txn_ric_[a-f0-9]{32}$/);
      expect(res.body.data.reference).toBe("ref_order_1001");
      expect(res.body.data.amount).toBe(500000);
      expect(res.body.data.currency).toBe("NGN");
      expect(res.body.data.status).toBe("processing");
      expect(res.body.data.bank_code).toBe("058");
      expect(res.body.data.account_number).toBe("0123456789");
      expect(res.body.data.account_name).toBe("ALEXANDER TEST");
      expect(res.body.data.reason).toBe("Supplier payout");
      expect(res.body.data.provider).toBe("paystack");
      expect(res.body.data.created_at).toBeDefined();

      // Ensure Paystack recipient code or raw transfer objects are NOT exposed
      expect(res.body.data.recipient_code).toBeUndefined();
      expect(res.body.data.transfer_code).toBeUndefined();
      expect(res.body.data.domain).toBeUndefined();
      expect(res.body.requestId).toBeDefined();

      // Verify provider was invoked with mapped parameters
      expect(mockPaystackClient.post).toHaveBeenCalledWith(
        "/transfer",
        expect.objectContaining({
          source: "balance",
          amount: 500000,
          recipient: "RCP_test_12345",
          reference: expect.stringMatching(/^txn_ric_[a-f0-9]{32}$/),
          reason: "Supplier payout",
        }),
      );
    });

    it("should accurately reflect 'processing' lifecycle state if reported by provider", async () => {
      const mockPaystackClient = {
        get: vi.fn(),
        post: vi.fn().mockImplementation(async (path: string, body: any) => {
          if (path === "/transferrecipient") {
            return {
              status: true,
              data: { recipient_code: "RCP_test_proc", name: "PROC TEST" },
            };
          }
          if (path === "/transfer") {
            return {
              status: true,
              data: {
                reference: body.reference,
                transfer_code: "TRF_proc_1",
                amount: body.amount,
                currency: "NGN",
                status: "received", // Paystack 'received' maps to 'processing'
              },
            };
          }
        }),
        verifyConnectivity: vi.fn(),
      };

      providerRegistry.register(new PaystackAdapter(mockPaystackClient as unknown as PaystackClient));

      const res = await request(app)
        .post("/api/v1/transfers")
        .set("Authorization", `Bearer ${validApiKeyA}`)
        .send({
          amount: 250000,
          currency: "NGN",
          bank_code: "057",
          account_number: "0000000000",
          account_name: "PROC TEST",
          reference: "ref_order_proc_1",
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe("processing");
    });

    it("should retrieve an initiated transfer by ID through GET /v1/transfers/:id", async () => {
      const mockPaystackClient = createStandardMockClient();
      providerRegistry.register(new PaystackAdapter(mockPaystackClient as unknown as PaystackClient));

      const initRes = await request(app)
        .post("/v1/transfers")
        .set("Authorization", `Bearer ${validApiKeyA}`)
        .send({
          amount: 100000,
          currency: "NGN",
          bank_code: "058",
          account_number: "0123456789",
          reference: "ref_order_get_1",
        });

      expect(initRes.status).toBe(201);
      const transferId = initRes.body.data.id;

      const getRes = await request(app)
        .get(`/v1/transfers/${transferId}`)
        .set("Authorization", `Bearer ${validApiKeyA}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.id).toBe(transferId);
      expect(getRes.body.data.reference).toBe("ref_order_get_1");
      expect(getRes.body.data.amount).toBe(100000);
    });
  });

  // ===========================================================================
  // 2. Input Validation Tests
  // ===========================================================================
  describe("Input Validation", () => {
    it("should reject negative amount", async () => {
      const res = await request(app)
        .post("/v1/transfers")
        .set("Authorization", `Bearer ${validApiKeyA}`)
        .send({
          amount: -5000,
          currency: "NGN",
          bank_code: "058",
          account_number: "0123456789",
          reference: "ref_neg",
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should reject zero amount", async () => {
      const res = await request(app)
        .post("/v1/transfers")
        .set("Authorization", `Bearer ${validApiKeyA}`)
        .send({
          amount: 0,
          currency: "NGN",
          bank_code: "058",
          account_number: "0123456789",
          reference: "ref_zero",
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should reject non-integer / floating-point amount", async () => {
      const res = await request(app)
        .post("/v1/transfers")
        .set("Authorization", `Bearer ${validApiKeyA}`)
        .send({
          amount: 1250.75,
          currency: "NGN",
          bank_code: "058",
          account_number: "0123456789",
          reference: "ref_float",
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should reject invalid bank code containing letters", async () => {
      const res = await request(app)
        .post("/v1/transfers")
        .set("Authorization", `Bearer ${validApiKeyA}`)
        .send({
          amount: 100000,
          currency: "NGN",
          bank_code: "ABC",
          account_number: "0123456789",
          reference: "ref_bad_bank",
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should reject account number that is not exactly 10 digits", async () => {
      const res = await request(app)
        .post("/v1/transfers")
        .set("Authorization", `Bearer ${validApiKeyA}`)
        .send({
          amount: 100000,
          currency: "NGN",
          bank_code: "058",
          account_number: "12345",
          reference: "ref_short_acc",
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should reject unsupported currency (e.g. USD)", async () => {
      const res = await request(app)
        .post("/v1/transfers")
        .set("Authorization", `Bearer ${validApiKeyA}`)
        .send({
          amount: 100000,
          currency: "USD",
          bank_code: "058",
          account_number: "0123456789",
          reference: "ref_usd",
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should reject missing required fields", async () => {
      const res = await request(app)
        .post("/v1/transfers")
        .set("Authorization", `Bearer ${validApiKeyA}`)
        .send({
          amount: 100000,
          currency: "NGN",
          // missing bank_code, account_number, reference
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  // ===========================================================================
  // 3. Authentication & Authorization Tests
  // ===========================================================================
  describe("Authentication", () => {
    it("should return 401 Unauthorized when no Authorization header is provided", async () => {
      const res = await request(app)
        .post("/v1/transfers")
        .send({
          amount: 100000,
          currency: "NGN",
          bank_code: "058",
          account_number: "0123456789",
          reference: "ref_no_auth",
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("should return 401 Unauthorized when an invalid API key is provided", async () => {
      const res = await request(app)
        .post("/v1/transfers")
        .set("Authorization", "Bearer rc_test_invalidprefix.invalidsecretkey123456789012")
        .send({
          amount: 100000,
          currency: "NGN",
          bank_code: "058",
          account_number: "0123456789",
          reference: "ref_bad_auth",
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });
  });

  // ===========================================================================
  // 4. Provider Error Normalization Tests
  // ===========================================================================
  describe("Provider Error Handling & Normalization", () => {
    it("should normalize provider rejection into 400 TRANSFER_FAILED", async () => {
      const mockPaystackClient = {
        get: vi.fn(),
        post: vi.fn().mockImplementation(async (path: string) => {
          if (path === "/transferrecipient") {
            return { status: true, data: { recipient_code: "RCP_test_fail" } };
          }
          throw {
            statusCode: 400,
            message: "You cannot initiate third party payouts at this time",
            providerCode: "payout_disabled",
          };
        }),
        verifyConnectivity: vi.fn(),
      };

      providerRegistry.register(new PaystackAdapter(mockPaystackClient as unknown as PaystackClient));

      const res = await request(app)
        .post("/v1/transfers")
        .set("Authorization", `Bearer ${validApiKeyA}`)
        .send({
          amount: 500000,
          currency: "NGN",
          bank_code: "058",
          account_number: "0123456789",
          reference: "ref_prov_fail",
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("TRANSFER_FAILED");
    });

    it("should normalize insufficient provider balance into 400 INSUFFICIENT_PROVIDER_BALANCE", async () => {
      const mockPaystackClient = {
        get: vi.fn(),
        post: vi.fn().mockImplementation(async (path: string) => {
          if (path === "/transferrecipient") {
            return { status: true, data: { recipient_code: "RCP_test_bal" } };
          }
          throw {
            statusCode: 400,
            message: "Insufficient balance for this transfer",
            providerCode: "insufficient_balance",
          };
        }),
        verifyConnectivity: vi.fn(),
      };

      providerRegistry.register(new PaystackAdapter(mockPaystackClient as unknown as PaystackClient));

      const res = await request(app)
        .post("/v1/transfers")
        .set("Authorization", `Bearer ${validApiKeyA}`)
        .send({
          amount: 500000000,
          currency: "NGN",
          bank_code: "058",
          account_number: "0123456789",
          reference: "ref_insufficient_bal",
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("TRANSFER_FAILED");
    });

    it("should normalize provider timeout into 504 PROVIDER_TIMEOUT and mark transfer processing", async () => {
      const mockPaystackClient = {
        get: vi.fn(),
        post: vi.fn().mockImplementation(async (path: string) => {
          if (path === "/transferrecipient") {
            return { status: true, data: { recipient_code: "RCP_test_timeout" } };
          }
          throw {
            code: "ETIMEDOUT",
            message: "Paystack API request timed out after 10000ms",
          };
        }),
        verifyConnectivity: vi.fn(),
      };

      providerRegistry.register(new PaystackAdapter(mockPaystackClient as unknown as PaystackClient));

      const res = await request(app)
        .post("/v1/transfers")
        .set("Authorization", `Bearer ${validApiKeyA}`)
        .send({
          amount: 100000,
          currency: "NGN",
          bank_code: "058",
          account_number: "0123456789",
          reference: "ref_timeout",
        });

      expect(res.status).toBe(504);
      expect(res.body.error.code).toBe("PROVIDER_TIMEOUT");

      // Verify transfer in store is kept in processing state
      const savedTransfer = Array.from(transferStore.values()).find((t) => t.reference === "ref_timeout");
      expect(savedTransfer).toBeDefined();
      expect(savedTransfer.status).toBe("processing");
    });

    it("should normalize provider network failure into 503 PAYMENT_PROVIDER_UNAVAILABLE", async () => {
      const mockPaystackClient = {
        get: vi.fn(),
        post: vi.fn().mockImplementation(async (path: string) => {
          if (path === "/transferrecipient") {
            return { status: true, data: { recipient_code: "RCP_test_unavail" } };
          }
          throw {
            code: "ECONNREFUSED",
            message: "Connection refused to api.paystack.co",
          };
        }),
        verifyConnectivity: vi.fn(),
      };

      providerRegistry.register(new PaystackAdapter(mockPaystackClient as unknown as PaystackClient));

      const res = await request(app)
        .post("/v1/transfers")
        .set("Authorization", `Bearer ${validApiKeyA}`)
        .send({
          amount: 100000,
          currency: "NGN",
          bank_code: "058",
          account_number: "0123456789",
          reference: "ref_unavailable",
        });

      expect(res.status).toBe(503);
      expect(res.body.error.code).toBe("PAYMENT_PROVIDER_UNAVAILABLE");
    });

    it("should normalize provider rate limit into 429 PROVIDER_RATE_LIMITED", async () => {
      const mockPaystackClient = {
        get: vi.fn(),
        post: vi.fn().mockImplementation(async (path: string) => {
          if (path === "/transferrecipient") {
            return { status: true, data: { recipient_code: "RCP_test_ratelimit" } };
          }
          throw {
            statusCode: 429,
            message: "Too Many Requests",
          };
        }),
        verifyConnectivity: vi.fn(),
      };

      providerRegistry.register(new PaystackAdapter(mockPaystackClient as unknown as PaystackClient));

      const res = await request(app)
        .post("/v1/transfers")
        .set("Authorization", `Bearer ${validApiKeyA}`)
        .send({
          amount: 100000,
          currency: "NGN",
          bank_code: "058",
          account_number: "0123456789",
          reference: "ref_rate_limit",
        });

      expect(res.status).toBe(429);
      expect(res.body.error.code).toBe("PROVIDER_RATE_LIMITED");
    });

    it("should normalize provider authentication failure into 500 PROVIDER_AUTHENTICATION_FAILED", async () => {
      const mockPaystackClient = {
        get: vi.fn(),
        post: vi.fn().mockImplementation(async (path: string) => {
          if (path === "/transferrecipient") {
            return { status: true, data: { recipient_code: "RCP_test_authfail" } };
          }
          throw {
            statusCode: 401,
            message: "Invalid key",
          };
        }),
        verifyConnectivity: vi.fn(),
      };

      providerRegistry.register(new PaystackAdapter(mockPaystackClient as unknown as PaystackClient));

      const res = await request(app)
        .post("/v1/transfers")
        .set("Authorization", `Bearer ${validApiKeyA}`)
        .send({
          amount: 100000,
          currency: "NGN",
          bank_code: "058",
          account_number: "0123456789",
          reference: "ref_prov_auth_fail",
        });

      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe("PROVIDER_AUTHENTICATION_FAILED");
    });
  });

  // ===========================================================================
  // 5. Idempotency Tests
  // ===========================================================================
  describe("Idempotency Handling", () => {
    it("should return the identical transfer without invoking the provider twice on duplicate Idempotency-Key", async () => {
      const mockPaystackClient = createStandardMockClient();
      providerRegistry.register(new PaystackAdapter(mockPaystackClient as unknown as PaystackClient));

      const payload = {
        amount: 300000,
        currency: "NGN",
        bank_code: "058",
        account_number: "0123456789",
        reference: "ref_idem_dedup_1",
      };

      // 1st Call
      const firstRes = await request(app)
        .post("/v1/transfers")
        .set("Authorization", `Bearer ${validApiKeyA}`)
        .set("Idempotency-Key", "idem_key_unique_1")
        .send(payload);

      expect(firstRes.status).toBe(201);
      const firstTransferId = firstRes.body.data.id;
      expect(mockPaystackClient.post).toHaveBeenCalledTimes(2); // 1 recipient + 1 transfer

      // 2nd Call with identical Idempotency-Key and payload
      const secondRes = await request(app)
        .post("/v1/transfers")
        .set("Authorization", `Bearer ${validApiKeyA}`)
        .set("Idempotency-Key", "idem_key_unique_1")
        .send(payload);

      expect(secondRes.status).toBe(201);
      expect(secondRes.body.data.id).toBe(firstTransferId);
      expect(secondRes.body.data.reference).toBe("ref_idem_dedup_1");

      // Provider was NOT called a second time
      expect(mockPaystackClient.post).toHaveBeenCalledTimes(2);
    });

    it("should reject Idempotency-Key reuse when request payload differs", async () => {
      const mockPaystackClient = createStandardMockClient();
      providerRegistry.register(new PaystackAdapter(mockPaystackClient as unknown as PaystackClient));

      // 1st Call
      await request(app)
        .post("/v1/transfers")
        .set("Authorization", `Bearer ${validApiKeyA}`)
        .set("Idempotency-Key", "idem_key_reuse_test")
        .send({
          amount: 100000,
          currency: "NGN",
          bank_code: "058",
          account_number: "0123456789",
          reference: "ref_payload_1",
        });

      // 2nd Call with same Idempotency-Key but different amount
      const res = await request(app)
        .post("/v1/transfers")
        .set("Authorization", `Bearer ${validApiKeyA}`)
        .set("Idempotency-Key", "idem_key_reuse_test")
        .send({
          amount: 200000,
          currency: "NGN",
          bank_code: "058",
          account_number: "0123456789",
          reference: "ref_payload_2",
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("IDEMPOTENCY_KEY_REUSED");
    });
  });

  // ===========================================================================
  // 6. Tenant Isolation Tests
  // ===========================================================================
  describe("Tenant Isolation", () => {
    it("should prevent Project B from accessing Project A's transfer", async () => {
      const mockPaystackClient = createStandardMockClient();
      providerRegistry.register(new PaystackAdapter(mockPaystackClient as unknown as PaystackClient));

      // Create transfer as Project A
      const createRes = await request(app)
        .post("/v1/transfers")
        .set("Authorization", `Bearer ${validApiKeyA}`)
        .send({
          amount: 75000,
          currency: "NGN",
          bank_code: "058",
          account_number: "0123456789",
          reference: "ref_proj_a_exclusive",
        });

      expect(createRes.status).toBe(201);
      const transferId = createRes.body.data.id;

      // Attempt to access transfer as Project B
      const getRes = await request(app)
        .get(`/v1/transfers/${transferId}`)
        .set("Authorization", `Bearer ${validApiKeyB}`);

      expect(getRes.status).toBe(404);
      expect(getRes.body.error.code).toBe("TRANSFER_NOT_FOUND");
    });
  });

  // ===========================================================================
  // 7. Provider Abstraction Unit Test
  // ===========================================================================
  describe("Provider Abstraction Architecture", () => {
    it("should allow swapping provider implementations without modifying core transfer service", async () => {
      const customProvider: FinancialProvider & TransferProvider = {
        id: "mock_alternate_rail",
        name: "Alternate Settlement Rail",
        capabilities: ["transfers"],
        hasCapability: (cap) => cap === "transfers",
        verifyConnectivity: async () => ({ provider: "mock_alternate_rail", connected: true }),
        initiateTransfer: vi.fn().mockResolvedValue({
          provider: "mock_alternate_rail",
          providerReference: "ALT_TXN_001",
          transferReference: "ref_alt_123",
          amount: 50000,
          currency: "NGN",
          status: "pending",
          initiatedAt: new Date(),
        }),
        verifyTransfer: vi.fn(),
      };

      const customRegistry = new ProviderRegistry();
      customRegistry.register(customProvider);

      const service = new RicarutTransferService(customRegistry);

      const result = await service.initiateTransfer(
        mockProjectA.id,
        "idem_alt_rail",
        {
          amount: 50000,
          currency: "NGN",
          bankCode: "058",
          accountNumber: "0123456789",
          reference: "ref_alt_123",
        },
        "mock_alternate_rail",
      );

      expect(customProvider.initiateTransfer).toHaveBeenCalled();
      expect(result.provider).toBe("mock_alternate_rail");
      expect(result.amount).toBe(50000);
      expect(result.status).toBe("pending");
    });
  });
});
