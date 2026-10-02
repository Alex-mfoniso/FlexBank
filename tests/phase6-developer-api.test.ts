import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import crypto from "crypto";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { providerRegistry } from "../src/modules/providers/provider.registry";
import { AccountVerificationProvider, TransferProvider } from "../src/modules/providers/contracts/provider.contracts";

describe("Phase 6: Developer Financial Infrastructure & Public API Experience", () => {
  // Test Ricarut API keys for Tenant A and Tenant B (format: rc_test_[12 chars].[32 chars])
  const testPrefixA = "rc_test_phase6proj0a";
  const testSecretA = "abcdefghijklmnopqrstuvwxyz123456";
  const validApiKeyA = `${testPrefixA}.${testSecretA}`;
  const apiKeyHashA = crypto.createHash("sha256").update(validApiKeyA).digest("hex");

  const testPrefixB = "rc_test_phase6proj0b";
  const testSecretB = "654321zyxwvutsrqponmlkjihgfedcba";
  const validApiKeyB = `${testPrefixB}.${testSecretB}`;
  const apiKeyHashB = crypto.createHash("sha256").update(validApiKeyB).digest("hex");

  const revokedPrefix = "rc_test_phase6revokd";
  const revokedSecret = "11112222333344445555666677778888";
  const revokedApiKey = `${revokedPrefix}.${revokedSecret}`;
  const revokedKeyHash = crypto.createHash("sha256").update(revokedApiKey).digest("hex");

  const mockProjectA = {
    id: "prj_phase6_test_a",
    organizationId: "org_phase6_test_a",
    environment: "test",
  };

  const mockProjectB = {
    id: "prj_phase6_test_b",
    organizationId: "org_phase6_test_b",
    environment: "test",
  };

  const mockApiKeyRecordA = {
    id: "key_phase6_a",
    keyPrefix: testPrefixA,
    keyHash: apiKeyHashA,
    projectId: mockProjectA.id,
    environment: "test",
    revokedAt: null,
    expiresAt: null,
    project: mockProjectA,
  };

  const mockApiKeyRecordB = {
    id: "key_phase6_b",
    keyPrefix: testPrefixB,
    keyHash: apiKeyHashB,
    projectId: mockProjectB.id,
    environment: "test",
    revokedAt: null,
    expiresAt: null,
    project: mockProjectB,
  };

  const mockRevokedApiKeyRecord = {
    id: "key_phase6_revoked",
    keyPrefix: revokedPrefix,
    keyHash: revokedKeyHash,
    projectId: mockProjectA.id,
    environment: "test",
    revokedAt: new Date(),
    expiresAt: null,
    project: mockProjectA,
  };

  const idempotencyStore = new Map<string, any>();
  const transferStore = new Map<string, any>();
  let mockProvider: AccountVerificationProvider & TransferProvider;

  beforeEach(() => {
    vi.restoreAllMocks();

    mockProvider = {
      id: "paystack",
      resolveAccount: vi.fn().mockImplementation(async ({ accountNumber, bankCode }) => {
        if (bankCode === "058" && accountNumber === "0123456789") {
          return {
            accountNumber: "0123456789",
            accountName: "PHASE6 TEST USER",
            bankCode: "058",
            provider: "paystack",
          };
        }
        throw {
          statusCode: 400,
          providerCode: "account_not_found",
          message: "Could not resolve account name",
        };
      }),
      initiateTransfer: vi.fn().mockImplementation(async (params) => {
        return {
          id: `trf_mock_${Date.now()}`,
          status: "processing",
          providerReference: `prov_ref_${Date.now()}`,
          fee: 1000,
          initiatedAt: new Date().toISOString(),
        };
      }),
      verifyTransfer: vi.fn().mockResolvedValue({
        id: "trf_mock_1",
        status: "successful",
        amount: 500000,
        currency: "NGN",
        reference: "mock_ref",
        updatedAt: new Date().toISOString(),
      }),
    };

    // Register mock provider into registry
    providerRegistry.register(mockProvider);

    // Mock Prisma API key lookup
    vi.spyOn(prisma.apiKey, "findUnique").mockImplementation(async ({ where }: any) => {
      if (where.keyPrefix === testPrefixA) return mockApiKeyRecordA as any;
      if (where.keyPrefix === testPrefixB) return mockApiKeyRecordB as any;
      if (where.keyPrefix === revokedPrefix) return mockRevokedApiKeyRecord as any;
      return null;
    });
    vi.spyOn(prisma.apiKey, "update").mockResolvedValue({} as any);

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

    // Mock Prisma Transfer operations
    vi.spyOn(prisma.transfer, "findUnique").mockImplementation(async ({ where }: any) => {
      if (where.projectId_reference) {
        for (const t of transferStore.values()) {
          if (t.projectId === where.projectId_reference.projectId && t.reference === where.projectId_reference.reference) {
            return t;
          }
        }
      }
      return null;
    });

    vi.spyOn(prisma.transfer, "findFirst").mockImplementation(async ({ where }: any) => {
      const { projectId, OR } = where;
      for (const t of transferStore.values()) {
        if (t.projectId !== projectId) continue;
        if (OR) {
          const match = OR.some((cond: any) => cond.id === t.id || cond.reference === t.reference);
          if (match) return t;
        }
      }
      return null;
    });

    vi.spyOn(prisma.transfer, "create").mockImplementation(async ({ data }: any) => {
      const record = {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      transferStore.set(data.id, record);
      return record;
    });

    vi.spyOn(prisma.transfer, "update").mockImplementation(async ({ where, data }: any) => {
      const existing = transferStore.get(where.id);
      if (!existing) throw new Error("Transfer not found");
      const updated = {
        ...existing,
        ...data,
        updatedAt: new Date(),
      };
      transferStore.set(where.id, updated);
      return updated;
    });

    vi.spyOn(prisma.providerTransaction, "create").mockImplementation(async ({ data }: any) => {
      return { id: `ptxn_${Date.now()}`, ...data } as any;
    });
  });

  // ===========================================================================
  // Step 3: API Key Experience & Authentication Headers
  // ===========================================================================
  describe("Step 3: API Key Experience & Authentication Headers", () => {
    it("should authenticate using Authorization: Bearer <API_KEY>", async () => {
      const res = await request(app)
        .get("/v1/accounts/resolve?bank_code=058&account_number=0123456789")
        .set("Authorization", `Bearer ${validApiKeyA}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
    });

    it("should authenticate using X-API-Key: <API_KEY>", async () => {
      const res = await request(app)
        .get("/v1/accounts/resolve?bank_code=058&account_number=0123456789")
        .set("X-API-Key", validApiKeyA);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.account_name).toBe("PHASE6 TEST USER");
    });

    it("should reject request when neither Authorization nor X-API-Key is provided", async () => {
      const res = await request(app)
        .get("/v1/accounts/resolve?bank_code=058&account_number=0123456789");

      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("should reject request when an invalid API key format is provided", async () => {
      const res = await request(app)
        .get("/v1/accounts/resolve?bank_code=058&account_number=0123456789")
        .set("Authorization", "Bearer invalid_key_format_123");

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("should reject request when a revoked API key is provided", async () => {
      const res = await request(app)
        .get("/v1/accounts/resolve?bank_code=058&account_number=0123456789")
        .set("Authorization", `Bearer ${revokedApiKey}`);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
      expect(res.body.error.message).toContain("revoked");
    });
  });

  // ===========================================================================
  // Step 6: Account Resolution
  // ===========================================================================
  describe("Step 6: Developer Account Resolution", () => {
    it("should resolve bank account and return normalized payload without leaking provider internals", async () => {
      const res = await request(app)
        .get("/v1/accounts/resolve?bank_code=058&account_number=0123456789")
        .set("Authorization", `Bearer ${validApiKeyA}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({
        account_number: "0123456789",
        account_name: "PHASE6 TEST USER",
        bank_code: "058",
        provider: "paystack",
      });
      expect(res.body.requestId).toBeDefined();
    });

    it("should reject missing query parameters with 400 VALIDATION_ERROR", async () => {
      const res = await request(app)
        .get("/v1/accounts/resolve?bank_code=058")
        .set("Authorization", `Bearer ${validApiKeyA}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  // ===========================================================================
  // Steps 4, 5, 8: Transfers & Retrieval
  // ===========================================================================
  describe("Steps 4, 5, 8: Developer Outbound Transfers & Retrieval", () => {
    it("should initiate transfer and return normalized response with destination, environment, and timestamps", async () => {
      const res = await request(app)
        .post("/v1/transfers")
        .set("Authorization", `Bearer ${validApiKeyA}`)
        .set("Idempotency-Key", "idem_phase6_test_01")
        .send({
          amount: 500000,
          currency: "NGN",
          bank_code: "058",
          account_number: "0123456789",
          reference: "ref_phase6_test_01",
          reason: "Phase 6 Integration payout",
        });

      expect(res.status).toBe(201);
      const transfer = res.body.data;
      expect(transfer.id).toMatch(/^txn_ric_/);
      expect(transfer.reference).toBe("ref_phase6_test_01");
      expect(transfer.amount).toBe(500000);
      expect(transfer.currency).toBe("NGN");
      expect(transfer.status).toBe("processing");
      expect(transfer.environment).toBe("test");
      expect(transfer.destination).toEqual({
        bank_code: "058",
        account_number: "0123456789",
        account_name: undefined,
      });
      expect(transfer.created_at).toBeDefined();
      expect(transfer.updated_at).toBeDefined();
      expect(res.body.requestId).toBeDefined();
    });

    it("should retrieve transfer by Ricarut ID using GET /v1/transfers/:id", async () => {
      // First initiate a transfer
      const initRes = await request(app)
        .post("/v1/transfers")
        .set("X-API-Key", validApiKeyA)
        .set("Idempotency-Key", "idem_phase6_retrieve_01")
        .send({
          amount: 250000,
          currency: "NGN",
          bank_code: "058",
          account_number: "0123456789",
          reference: "ref_phase6_retrieve_01",
        });

      expect(initRes.status).toBe(201);
      const transferId = initRes.body.data.id;

      // Retrieve by ID
      const getRes = await request(app)
        .get(`/v1/transfers/${transferId}`)
        .set("Authorization", `Bearer ${validApiKeyA}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.id).toBe(transferId);
      expect(getRes.body.data.reference).toBe("ref_phase6_retrieve_01");
      expect(getRes.body.data.amount).toBe(250000);
      expect(getRes.body.data.status).toBe("processing");
      expect(getRes.body.data.environment).toBe("test");
      expect(getRes.body.data.destination).toBeDefined();
      expect(getRes.body.data.destination.bank_code).toBe("058");
      expect(getRes.body.data.destination.account_number).toBe("0123456789");
    });

    it("should retrieve transfer by developer reference using GET /v1/transfers/:id", async () => {
      const getRes = await request(app)
        .get("/v1/transfers/ref_phase6_retrieve_01")
        .set("Authorization", `Bearer ${validApiKeyA}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.reference).toBe("ref_phase6_retrieve_01");
    });

    it("should return 404 TRANSFER_NOT_FOUND when retrieving a non-existent transfer", async () => {
      const res = await request(app)
        .get("/v1/transfers/txn_ric_non_existent")
        .set("Authorization", `Bearer ${validApiKeyA}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("TRANSFER_NOT_FOUND");
    });
  });

  // ===========================================================================
  // Step 12: Tenant Isolation & IDOR Protection
  // ===========================================================================
  describe("Step 12: Tenant Isolation & Security", () => {
    it("should prevent Tenant B from accessing transfers created by Tenant A", async () => {
      // Tenant A creates a transfer
      const initRes = await request(app)
        .post("/v1/transfers")
        .set("Authorization", `Bearer ${validApiKeyA}`)
        .send({
          amount: 100000,
          currency: "NGN",
          bank_code: "058",
          account_number: "0123456789",
          reference: "ref_tenant_a_secret",
        });

      expect(initRes.status).toBe(201);
      const transferId = initRes.body.data.id;

      // Tenant B tries to retrieve Tenant A's transfer
      const attemptRes = await request(app)
        .get(`/v1/transfers/${transferId}`)
        .set("Authorization", `Bearer ${validApiKeyB}`);

      // Must be 404 to avoid leaking existence of another tenant's resource
      expect(attemptRes.status).toBe(404);
      expect(attemptRes.body.error.code).toBe("TRANSFER_NOT_FOUND");
    });
  });

  // ===========================================================================
  // Idempotency Guarantees
  // ===========================================================================
  describe("Idempotency Guarantees", () => {
    it("should return original cached transfer when retrying with identical payload", async () => {
      const payload = {
        amount: 300000,
        currency: "NGN",
        bank_code: "058",
        account_number: "0123456789",
        reference: "ref_idem_retry_same",
      };

      const res1 = await request(app)
        .post("/v1/transfers")
        .set("Authorization", `Bearer ${validApiKeyA}`)
        .set("Idempotency-Key", "idem_key_retry_test")
        .send(payload);

      expect(res1.status).toBe(201);

      // Retry exact same request
      const res2 = await request(app)
        .post("/v1/transfers")
        .set("Authorization", `Bearer ${validApiKeyA}`)
        .set("Idempotency-Key", "idem_key_retry_test")
        .send(payload);

      expect(res2.status).toBe(201);
      expect(res2.body.data.id).toBe(res1.body.data.id);
    });

    it("should reject reused Idempotency-Key when payload is modified", async () => {
      const res = await request(app)
        .post("/v1/transfers")
        .set("Authorization", `Bearer ${validApiKeyA}`)
        .set("Idempotency-Key", "idem_key_retry_test")
        .send({
          amount: 999999, // different amount!
          currency: "NGN",
          bank_code: "058",
          account_number: "0123456789",
          reference: "ref_idem_retry_altered",
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("IDEMPOTENCY_KEY_REUSED");
    });
  });

  // ===========================================================================
  // Step 10: API Versioning Consistency
  // ===========================================================================
  describe("Step 10: API Versioning Consistency (/v1 and /api/v1)", () => {
    it("should resolve identical responses under /v1 and /api/v1", async () => {
      const resV1 = await request(app)
        .get("/v1/accounts/resolve?bank_code=058&account_number=0123456789")
        .set("Authorization", `Bearer ${validApiKeyA}`);

      const resApiV1 = await request(app)
        .get("/api/v1/accounts/resolve?bank_code=058&account_number=0123456789")
        .set("Authorization", `Bearer ${validApiKeyA}`);

      expect(resV1.status).toBe(200);
      expect(resApiV1.status).toBe(200);
      expect(resV1.body.data.account_name).toBe(resApiV1.body.data.account_name);
    });
  });
});
