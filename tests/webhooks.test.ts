import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import crypto from "crypto";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { providerRegistry } from "../src/modules/providers/provider.registry";
import { PaystackAdapter } from "../src/modules/providers/paystack/paystack.adapter";
import { PaystackClient } from "../src/modules/providers/paystack/paystack.client";
import { isValidTransferTransition } from "../src/modules/transfers/transfer-state-machine";
import { TransferStatus } from "@prisma/client";

describe("Phase 5: Provider Webhook Handling & Status Synchronization", () => {
  const TEST_SECRET_KEY = "sk_test_a3daa64cd60969870cbdf3ce3d6b2f22daa019a4";

  // Test Ricarut API Key credentials (matches /^(fb|rc)_(test|live)_([a-zA-Z0-9]{12})\.([a-zA-Z0-9]{32})$/)
  const testKeyPrefixA = "rc_test_111122223333";
  const testSecretA = "abcdefabcdefabcdefabcdefabcdef01";
  const validApiKeyA = `${testKeyPrefixA}.${testSecretA}`;
  const apiKeyHashA = crypto.createHash("sha256").update(validApiKeyA).digest("hex");

  const mockProjectA = {
    id: "prj_test_webhook_a",
    organizationId: "org_test_webhook_a",
    environment: "test",
  };

  const mockApiKeyRecordA = {
    id: "key_webhook_a",
    keyPrefix: testKeyPrefixA,
    keyHash: apiKeyHashA,
    projectId: mockProjectA.id,
    environment: "test",
    revokedAt: null,
    expiresAt: null,
    project: mockProjectA,
  };

  // Mock Stores
  let transferStore: Map<string, any>;
  let webhookEventStore: Map<string, any>;
  let providerTransactionStore: any[];

  function signPaystackPayload(payload: any, secretKey: string = TEST_SECRET_KEY): string {
    const raw = typeof payload === "string" ? payload : JSON.stringify(payload);
    return crypto.createHmac("sha512", secretKey).update(raw).digest("hex");
  }

  beforeEach(() => {
    transferStore = new Map();
    webhookEventStore = new Map();
    providerTransactionStore = [];

    process.env.PAYSTACK_SECRET_KEY = TEST_SECRET_KEY;
    process.env.PAYSTACK_PUBLIC_KEY = "pk_test_334f76f2e2b104123e66320753b83df130115db8";

    // Mock API key lookups
    vi.spyOn(prisma.apiKey, "findUnique").mockImplementation(async ({ where }: any) => {
      if (where?.keyPrefix === testKeyPrefixA) {
        return mockApiKeyRecordA as any;
      }
      return null;
    });
    vi.spyOn(prisma.apiKey, "update").mockResolvedValue({} as any);

    // Mock background API request logs
    if (prisma.apiRequestLog) {
      vi.spyOn(prisma.apiRequestLog, "create").mockResolvedValue({} as any);
    }

    vi.spyOn(prisma.project, "findUnique").mockImplementation(async (args: any) => {
      if (args?.where?.id === mockProjectA.id) {
        return mockProjectA as any;
      }
      return null;
    });

    vi.spyOn(prisma.transfer, "findFirst").mockImplementation(async (args: any) => {
      for (const transfer of transferStore.values()) {
        if (args?.where?.projectId && transfer.projectId !== args.where.projectId) {
          continue;
        }
        if (args?.where?.OR) {
          const match = args.where.OR.some((clause: any) => {
            if (clause.id && transfer.id === clause.id) return true;
            if (clause.reference && transfer.reference === clause.reference) return true;
            if (clause.providerReference && transfer.providerReference === clause.providerReference) return true;
            return false;
          });
          if (match) return { ...transfer };
        } else if (args?.where?.id && transfer.id === args.where.id) {
          return { ...transfer };
        } else if (args?.where?.reference && transfer.reference === args.where.reference) {
          return { ...transfer };
        } else if (args?.where?.providerReference && transfer.providerReference === args.where.providerReference) {
          return { ...transfer };
        }
      }
      return null;
    });

    vi.spyOn(prisma, "$transaction").mockImplementation(async (cb: any) => cb(prisma));

    vi.spyOn(prisma.transfer, "findUnique").mockImplementation(async (args: any) => {
      const existing = transferStore.get(args.where.id);
      return existing ? { ...existing } : null;
    });

    vi.spyOn(prisma.transfer, "update").mockImplementation(async (args: any) => {
      const existing = transferStore.get(args.where.id);
      if (!existing) throw new Error("Transfer not found");
      const updated = {
        ...existing,
        ...args.data,
        updatedAt: new Date(),
      };
      transferStore.set(args.where.id, updated);
      return { ...updated };
    });

    if (prisma.providerEvent) {
      vi.spyOn(prisma.providerEvent, "create").mockResolvedValue({} as any);
      vi.spyOn(prisma.providerEvent, "update").mockResolvedValue({} as any);
      vi.spyOn(prisma.providerEvent, "findUnique").mockResolvedValue(null);
    }

    vi.spyOn(prisma.webhookEvent, "findUnique").mockImplementation(async (args: any) => {
      const { provider_providerEventId } = args.where || {};
      if (!provider_providerEventId) return null;
      const key = `${provider_providerEventId.provider}:${provider_providerEventId.providerEventId}`;
      const found = webhookEventStore.get(key);
      return found ? { ...found } : null;
    });

    vi.spyOn(prisma.webhookEvent, "create").mockImplementation(async (args: any) => {
      const key = `${args.data.provider}:${args.data.providerEventId}`;
      if (webhookEventStore.has(key)) {
        const error: any = new Error("Unique constraint violation");
        error.code = "P2002";
        throw error;
      }
      const record = {
        id: `we_${crypto.randomUUID()}`,
        createdAt: new Date(),
        processedAt: null,
        ...args.data,
      };
      webhookEventStore.set(key, record);
      return { ...record };
    });

    vi.spyOn(prisma.webhookEvent, "update").mockImplementation(async (args: any) => {
      const { provider_providerEventId } = args.where || {};
      const key = `${provider_providerEventId.provider}:${provider_providerEventId.providerEventId}`;
      const existing = webhookEventStore.get(key);
      if (!existing) throw new Error("WebhookEvent not found");
      const updated = {
        ...existing,
        ...args.data,
      };
      webhookEventStore.set(key, updated);
      return { ...updated };
    });

    vi.spyOn(prisma.providerTransaction, "create").mockImplementation(async (args: any) => {
      const pt = {
        id: `pt_${crypto.randomUUID()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...args.data,
      };
      providerTransactionStore.push(pt);
      return { ...pt };
    });
  });

  // ===========================================================================
  // 1. Webhook Authentication & Security
  // ===========================================================================
  describe("Webhook Authentication & Security", () => {
    it("should reject webhook with 401 when signature header is missing", async () => {
      const payload = {
        event: "transfer.success",
        data: {
          id: 1001,
          transfer_code: "TRF_auth_test_1",
          status: "success",
        },
      };

      const res = await request(app)
        .post("/v1/webhooks/paystack")
        .send(payload)
        .expect(401);

      expect(res.body.error.code).toBe("UNAUTHORIZED");
      expect(res.body.error.message).toContain("signature");
    });

    it("should reject webhook with 401 when signature is invalid", async () => {
      const payload = {
        event: "transfer.success",
        data: {
          id: 1002,
          transfer_code: "TRF_auth_test_2",
          status: "success",
        },
      };

      const res = await request(app)
        .post("/v1/webhooks/paystack")
        .set("x-paystack-signature", "invalid_signature_hex_digest_1234567890")
        .send(payload)
        .expect(401);

      expect(res.body.error.code).toBe("UNAUTHORIZED");
      expect(res.body.error.message).toContain("signature");
    });

    it("should reject webhook signed with the wrong secret key", async () => {
      const payload = {
        event: "transfer.success",
        data: {
          id: 1003,
          transfer_code: "TRF_auth_test_3",
          status: "success",
        },
      };

      const invalidSig = signPaystackPayload(payload, "sk_test_wrong_secret_key_99999");

      const res = await request(app)
        .post("/v1/webhooks/paystack")
        .set("x-paystack-signature", invalidSig)
        .send(payload)
        .expect(401);

      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("should accept valid Paystack webhook without requiring a developer API key", async () => {
      const payload = {
        event: "transfer.success",
        data: {
          id: 1004,
          transfer_code: "TRF_non_existent",
          status: "success",
        },
      };

      const validSig = signPaystackPayload(payload);

      // Call without any Authorization header or ApiKey
      const res = await request(app)
        .post("/v1/webhooks/paystack")
        .set("x-paystack-signature", validSig)
        .send(payload)
        .expect(200);

      expect(res.body.status).toBe("success");
    });
  });

  // ===========================================================================
  // 2. Transfer Event Handling & Status Synchronization
  // ===========================================================================
  describe("Event Handling & Status Updates", () => {
    it("should update transfer status to 'successful' on transfer.success event", async () => {
      // 1. Seed a processing transfer
      const transferId = "txn_ric_success_test_01";
      const providerRef = "TRF_succ_001";
      transferStore.set(transferId, {
        id: transferId,
        projectId: mockProjectA.id,
        reference: "ref_succ_001",
        amount: 750000,
        currency: "NGN",
        status: "processing",
        providerId: "paystack",
        providerReference: providerRef,
        metadata: { bank_code: "058", account_number: "0123456789", account_name: "John Doe" },
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
      });

      // 2. Send transfer.success webhook
      const payload = {
        event: "transfer.success",
        data: {
          id: 2001,
          transfer_code: providerRef,
          reference: transferId,
          amount: 750000,
          currency: "NGN",
          status: "success",
          transferred_at: "2026-09-30T10:15:00.000Z",
        },
      };

      const signature = signPaystackPayload(payload);

      const res = await request(app)
        .post("/v1/webhooks/paystack")
        .set("x-paystack-signature", signature)
        .send(payload)
        .expect(200);

      expect(res.body.status).toBe("success");
      expect(res.body.result).toBe("processed");

      // 3. Assert database transfer was updated to successful
      const updated = transferStore.get(transferId);
      expect(updated.status).toBe("successful");
      expect(updated.completedAt).toBeDefined();

      // 4. Assert Developer can query updated status via GET /v1/transfers/:id
      const queryRes = await request(app)
        .get(`/v1/transfers/${transferId}`)
        .set("Authorization", `Bearer ${validApiKeyA}`)
        .expect(200);

      expect(queryRes.body.data.id).toBe(transferId);
      expect(queryRes.body.data.status).toBe("successful");
    });

    it("should update transfer status to 'failed' on transfer.failed event", async () => {
      // 1. Seed processing transfer
      const transferId = "txn_ric_failed_test_02";
      const providerRef = "TRF_fail_002";
      transferStore.set(transferId, {
        id: transferId,
        projectId: mockProjectA.id,
        reference: "ref_fail_002",
        amount: 200000,
        currency: "NGN",
        status: "processing",
        providerId: "paystack",
        providerReference: providerRef,
        metadata: { bank_code: "044", account_number: "9876543210", account_name: "Jane Doe" },
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
      });

      // 2. Send transfer.failed webhook
      const payload = {
        event: "transfer.failed",
        data: {
          id: 2002,
          transfer_code: providerRef,
          reference: transferId,
          amount: 200000,
          currency: "NGN",
          status: "failed",
          gateway_response: "Beneficiary bank unavailable",
          reason: "Bank network timeout",
        },
      };

      const signature = signPaystackPayload(payload);

      const res = await request(app)
        .post("/v1/webhooks/paystack")
        .set("x-paystack-signature", signature)
        .send(payload)
        .expect(200);

      expect(res.body.status).toBe("success");
      expect(res.body.result).toBe("processed");

      // 3. Assert database transfer was updated to failed with failure details
      const updated = transferStore.get(transferId);
      expect(updated.status).toBe("failed");
      expect(updated.failureMessage).toBe("Beneficiary bank unavailable");

      // 4. Query endpoint returns updated failed status
      const queryRes = await request(app)
        .get(`/v1/transfers/${transferId}`)
        .set("Authorization", `Bearer ${validApiKeyA}`)
        .expect(200);

      expect(queryRes.body.data.status).toBe("failed");
    });

    it("should update transfer status to 'reversed' on transfer.reversed event", async () => {
      // 1. Seed a previously successful transfer
      const transferId = "txn_ric_rev_test_03";
      const providerRef = "TRF_rev_003";
      transferStore.set(transferId, {
        id: transferId,
        projectId: mockProjectA.id,
        reference: "ref_rev_003",
        amount: 500000,
        currency: "NGN",
        status: "successful",
        providerId: "paystack",
        providerReference: providerRef,
        metadata: { bank_code: "058", account_number: "0123456789" },
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: new Date(),
      });

      // 2. Send transfer.reversed webhook
      const payload = {
        event: "transfer.reversed",
        data: {
          id: 2003,
          transfer_code: providerRef,
          reference: transferId,
          amount: 500000,
          currency: "NGN",
          status: "reversed",
          reason: "Destination bank returned funds",
        },
      };

      const signature = signPaystackPayload(payload);

      const res = await request(app)
        .post("/v1/webhooks/paystack")
        .set("x-paystack-signature", signature)
        .send(payload)
        .expect(200);

      expect(res.body.status).toBe("success");

      // 3. Assert status is reversed
      const updated = transferStore.get(transferId);
      expect(updated.status).toBe("reversed");

      // 4. Query endpoint returns reversed status
      const queryRes = await request(app)
        .get(`/v1/transfers/${transferId}`)
        .set("Authorization", `Bearer ${validApiKeyA}`)
        .expect(200);

      expect(queryRes.body.data.status).toBe("reversed");
    });

    it("should safely ignore non-transfer events with 200 OK without affecting transfers", async () => {
      const payload = {
        event: "charge.success",
        data: {
          id: 9999,
          reference: "charge_ref_123",
          amount: 100000,
        },
      };

      const signature = signPaystackPayload(payload);

      const res = await request(app)
        .post("/v1/webhooks/paystack")
        .set("x-paystack-signature", signature)
        .send(payload)
        .expect(200);

      expect(res.body.status).toBe("success");
      expect(res.body.result).toBe("ignored");
    });
  });

  // ===========================================================================
  // 3. Idempotency & Deduplication
  // ===========================================================================
  describe("Idempotent Webhook Processing", () => {
    it("should ignore duplicate webhook delivery without re-applying state transitions", async () => {
      const transferId = "txn_ric_idem_test_04";
      const providerRef = "TRF_idem_004";
      transferStore.set(transferId, {
        id: transferId,
        projectId: mockProjectA.id,
        reference: "ref_idem_004",
        amount: 300000,
        currency: "NGN",
        status: "processing",
        providerId: "paystack",
        providerReference: providerRef,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const payload = {
        event: "transfer.success",
        data: {
          id: 4004,
          transfer_code: providerRef,
          reference: transferId,
          status: "success",
        },
      };

      const signature = signPaystackPayload(payload);

      // First webhook delivery
      const res1 = await request(app)
        .post("/v1/webhooks/paystack")
        .set("x-paystack-signature", signature)
        .send(payload)
        .expect(200);

      expect(res1.body.status).toBe("success");
      expect(res1.body.result).toBe("processed");
      expect(providerTransactionStore.length).toBe(1);

      // Second webhook delivery (exact same event ID)
      const res2 = await request(app)
        .post("/v1/webhooks/paystack")
        .set("x-paystack-signature", signature)
        .send(payload)
        .expect(200);

      expect(res2.body.status).toBe("success");
      expect(res2.body.result).toBe("ignored"); // Safely ignored as duplicate!

      // Assert no duplicate provider transaction was written
      expect(providerTransactionStore.length).toBe(1);
    });
  });

  // ===========================================================================
  // 4. State Machine Integrity & Transitions
  // ===========================================================================
  describe("State Machine Transition Rules", () => {
    it("should validate all allowed transitions correctly", () => {
      expect(isValidTransferTransition("created", "pending")).toBe(true);
      expect(isValidTransferTransition("pending", "processing")).toBe(true);
      expect(isValidTransferTransition("processing", "successful")).toBe(true);
      expect(isValidTransferTransition("processing", "failed")).toBe(true);
      expect(isValidTransferTransition("successful", "reversed")).toBe(true);
      expect(isValidTransferTransition("successful", "successful")).toBe(true); // Idempotent identity
    });

    it("should prevent illegal state regressions such as successful -> pending or successful -> failed", async () => {
      expect(isValidTransferTransition("successful", "pending")).toBe(false);
      expect(isValidTransferTransition("successful", "processing")).toBe(false);
      expect(isValidTransferTransition("successful", "failed")).toBe(false);
      expect(isValidTransferTransition("failed", "successful")).toBe(false);
      expect(isValidTransferTransition("reversed", "successful")).toBe(false);

      // Seed a successful transfer
      const transferId = "txn_ric_regression_test_05";
      const providerRef = "TRF_regr_005";
      transferStore.set(transferId, {
        id: transferId,
        projectId: mockProjectA.id,
        reference: "ref_regr_005",
        amount: 100000,
        currency: "NGN",
        status: "successful",
        providerId: "paystack",
        providerReference: providerRef,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Attempt to send a delayed transfer.failed event
      const payload = {
        event: "transfer.failed",
        data: {
          id: 5005,
          transfer_code: providerRef,
          reference: transferId,
          status: "failed",
          reason: "Delayed failure report",
        },
      };

      const signature = signPaystackPayload(payload);

      const res = await request(app)
        .post("/v1/webhooks/paystack")
        .set("x-paystack-signature", signature)
        .send(payload)
        .expect(200);

      expect(res.body.status).toBe("success");
      expect(res.body.result).toBe("transition_rejected");

      // Verify status remained 'successful'
      const transfer = transferStore.get(transferId);
      expect(transfer.status).toBe("successful");
    });
  });

  // ===========================================================================
  // 5. Transfer Lookup & Unmatched Reference Resilience
  // ===========================================================================
  describe("Transfer Lookup & Error Resilience", () => {
    it("should resolve transfer by provider reference (transfer_code)", async () => {
      const transferId = "txn_ric_lookup_prov_06";
      const providerRef = "TRF_code_match_006";
      transferStore.set(transferId, {
        id: transferId,
        projectId: mockProjectA.id,
        reference: "order_unique_ref_006",
        amount: 450000,
        currency: "NGN",
        status: "processing",
        providerId: "paystack",
        providerReference: providerRef,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const payload = {
        event: "transfer.success",
        data: {
          id: 6006,
          transfer_code: providerRef,
          reference: "different_unmatched_external_reference",
          status: "success",
        },
      };

      const res = await request(app)
        .post("/v1/webhooks/paystack")
        .set("x-paystack-signature", signPaystackPayload(payload))
        .send(payload)
        .expect(200);

      expect(res.body.status).toBe("success");
      expect(res.body.result).toBe("processed");
      expect(transferStore.get(transferId).status).toBe("successful");
    });

    it("should resolve transfer by Ricarut transfer id when provider reference is absent", async () => {
      const transferId = "txn_ric_lookup_id_07";
      transferStore.set(transferId, {
        id: transferId,
        projectId: mockProjectA.id,
        reference: "order_id_ref_007",
        amount: 150000,
        currency: "NGN",
        status: "processing",
        providerId: "paystack",
        providerReference: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const payload = {
        event: "transfer.success",
        data: {
          id: 7007,
          reference: transferId,
          status: "success",
        },
      };

      const res = await request(app)
        .post("/v1/webhooks/paystack")
        .set("x-paystack-signature", signPaystackPayload(payload))
        .send(payload)
        .expect(200);

      expect(res.body.status).toBe("success");
      expect(res.body.result).toBe("processed");
      expect(transferStore.get(transferId).status).toBe("successful");
    });

    it("should handle unknown provider reference safely with 200 OK without crashing", async () => {
      const payload = {
        event: "transfer.success",
        data: {
          id: 8008,
          transfer_code: "TRF_completely_unknown_9999",
          reference: "non_existent_ricarut_reference",
          status: "success",
        },
      };

      const res = await request(app)
        .post("/v1/webhooks/paystack")
        .set("x-paystack-signature", signPaystackPayload(payload))
        .send(payload)
        .expect(200);

      expect(res.body.status).toBe("success");
      expect(res.body.result).toBe("unmatched");
    });
  });

  // ===========================================================================
  // 6. Tenant Security & Isolation
  // ===========================================================================
  describe("Tenant Isolation", () => {
    it("should only allow project owner to query transfer status via GET /v1/transfers/:id", async () => {
      const transferId = "txn_ric_tenant_08";
      transferStore.set(transferId, {
        id: transferId,
        projectId: mockProjectA.id,
        reference: "ref_tenant_08",
        amount: 100000,
        currency: "NGN",
        status: "successful",
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Authorized query with Project A key
      const resA = await request(app)
        .get(`/v1/transfers/${transferId}`)
        .set("Authorization", `Bearer ${validApiKeyA}`)
        .expect(200);

      expect(resA.body.data.id).toBe(transferId);

      // Attempted query without key
      await request(app)
        .get(`/v1/transfers/${transferId}`)
        .expect(401);
    });
  });

  // ===========================================================================
  // 7. Fallback Status Verification
  // ===========================================================================
  describe("Fallback Provider Status Verification", () => {
    it("should actively synchronize transfer status with provider verification", async () => {
      const transferId = "txn_ric_sync_test_09";
      const providerRef = "TRF_sync_009";
      transferStore.set(transferId, {
        id: transferId,
        projectId: mockProjectA.id,
        reference: "ref_sync_009",
        amount: 600000,
        currency: "NGN",
        status: "processing",
        providerId: "paystack",
        providerReference: providerRef,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Mock PaystackClient to return successful status
      const mockPaystackClient = {
        get: vi.fn().mockResolvedValue({
          status: true,
          message: "Transfer retrieved",
          data: {
            id: 9009,
            reference: transferId,
            transfer_code: providerRef,
            amount: 600000,
            currency: "NGN",
            status: "success",
            transferred_at: "2026-09-30T10:45:00.000Z",
          },
        }),
      };

      const adapter = new PaystackAdapter(mockPaystackClient as any);
      vi.spyOn(providerRegistry, "resolveTransfer").mockReturnValue(adapter as any);

      // Call POST /v1/transfers/:transferId/verify
      const res = await request(app)
        .post(`/v1/transfers/${transferId}/verify`)
        .set("Authorization", `Bearer ${validApiKeyA}`)
        .expect(200);

      expect(res.body.status).toBe("success");
      expect(res.body.data.status).toBe("successful");

      // Verify in-memory store was updated
      expect(transferStore.get(transferId).status).toBe("successful");
    });
  });
});
