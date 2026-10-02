import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import crypto from "crypto";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { transferStateService } from "../src/modules/transfers/transfer-state.service";
import { providerRouter } from "../src/modules/providers/provider.router";
import { TransferStatus } from "@prisma/client";

// Mock external provider network calls
vi.mock("../src/modules/providers/paystack/paystack.adapter", () => {
  return {
    PaystackAdapter: vi.fn().mockImplementation(() => ({
      id: "paystack",
      name: "Paystack",
      capabilities: [
        "transfers",
        "bank_account_resolution",
        "bank_transfer",
        "transaction_status",
        "webhook_status",
      ],
      hasCapability: vi.fn().mockReturnValue(true),
      initiateTransfer: vi.fn().mockResolvedValue({
        status: "processing",
        providerReference: "pstk_ref_test_123",
        fee: 1000,
        initiatedAt: new Date().toISOString(),
      }),
      verifyTransfer: vi.fn().mockResolvedValue({
        status: "successful",
        providerReference: "pstk_ref_test_123",
      }),
      verifyWebhookSignature: vi.fn().mockReturnValue(true),
      parseWebhookEvent: vi.fn().mockReturnValue({
        eventId: "evt_test_123",
        eventType: "transfer.success",
        transferReference: "ref_alpha_1",
      }),
    })),
  };
});

vi.mock("../src/modules/providers/mpesa/mpesa.adapter", () => {
  return {
    MpesaB2CAdapter: vi.fn().mockImplementation(() => ({
      id: "mpesa",
      name: "Safaricom M-Pesa",
      capabilities: [
        "transfers",
        "mobile_money_transfer",
        "transaction_status",
        "webhook_status",
      ],
      hasCapability: vi.fn().mockReturnValue(true),
      initiateTransfer: vi.fn().mockResolvedValue({
        status: "processing",
        providerReference: "mpesa_ref_test_123",
        fee: 0,
        initiatedAt: new Date().toISOString(),
      }),
      verifyTransfer: vi.fn().mockResolvedValue({
        status: "successful",
        providerReference: "mpesa_ref_test_123",
      }),
      verifyWebhookSignature: vi.fn().mockReturnValue(true),
      parseWebhookEvent: vi.fn().mockReturnValue({
        eventId: "evt_mpesa_123",
        eventType: "transfer.success",
        transferReference: "ref_alpha_1",
      }),
    })),
  };
});

describe("Phase 8: Tenant Isolation & State Machine Invariants", () => {
  const projectAlphaId = "proj_alpha_123456";
  const projectBetaId = "proj_beta_123456";

  // Valid formatted API keys: rc_test_[12 chars].[32 chars]
  const apiKeyAlpha = "rc_test_alphaprefix1.alphakeyalphakeyalphakeyalphakey";
  const keyPrefixAlpha = "rc_test_alphaprefix1";
  const keyHashAlpha = crypto.createHash("sha256").update(apiKeyAlpha).digest("hex");

  const apiKeyBeta = "rc_test_betaprefixx1.betakeybetakeybetakeybetakeybeta";
  const keyPrefixBeta = "rc_test_betaprefixx1";
  const keyHashBeta = crypto.createHash("sha256").update(apiKeyBeta).digest("hex");

  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure prisma.$transaction invokes callback with prisma client
    vi.spyOn(prisma, "$transaction").mockImplementation(async (cb: any) => cb(prisma));
  });

  describe("Section 2: Transaction State Machine Invariants", () => {
    it("should allow valid forward transitions (pending -> processing -> successful)", async () => {
      const mockTransfer = {
        id: "txn_state_test_1",
        status: TransferStatus.pending,
        reference: "ref_state_1",
        projectId: projectAlphaId,
        metadata: {},
      };

      vi.spyOn(prisma.transfer, "findUnique").mockResolvedValue(mockTransfer as any);
      vi.spyOn(prisma.transfer, "update").mockResolvedValue({
        ...mockTransfer,
        status: TransferStatus.processing,
      } as any);

      // pending -> processing
      const res = await transferStateService.transition("txn_state_test_1", "processing");
      expect(res.transitioned).toBe(true);
      expect(res.transfer.status).toBe("processing");
    });

    it("should strictly reject illegal backward transitions (successful -> pending)", async () => {
      const mockSuccessfulTransfer = {
        id: "txn_state_test_2",
        status: TransferStatus.successful,
        reference: "ref_state_2",
        projectId: projectAlphaId,
        metadata: {},
      };

      vi.spyOn(prisma.transfer, "findUnique").mockResolvedValue(mockSuccessfulTransfer as any);

      await expect(
        transferStateService.transition("txn_state_test_2", "pending", { strict: true }),
      ).rejects.toThrow(/Illegal state transition/);
    });

    it("should safely drop illegal transitions when strict mode is disabled (webhook safety)", async () => {
      const mockSuccessfulTransfer = {
        id: "txn_state_test_3",
        status: TransferStatus.successful,
        reference: "ref_state_3",
        projectId: projectAlphaId,
        metadata: {},
      };

      vi.spyOn(prisma.transfer, "findUnique").mockResolvedValue(mockSuccessfulTransfer as any);

      const res = await transferStateService.transition("txn_state_test_3", "pending", {
        strict: false,
      });

      expect(res.transitioned).toBe(false);
      expect(res.transfer.status).toBe(TransferStatus.successful);
    });
  });

  describe("Section 4 & 5: Centralized Provider Routing & Capabilities", () => {
    it("should route Nigerian NGN bank transfers to Paystack", () => {
      const route = providerRouter.resolveRoute({
        country: "NG",
        currency: "NGN",
        destinationType: "bank_account",
        bankCode: "058",
        accountNumber: "0123456789",
      });

      expect(route.providerId).toBe("paystack");
      expect(route.country).toBe("NG");
      expect(route.currency).toBe("NGN");
    });

    it("should route Kenyan KES mobile money transfers to M-Pesa", () => {
      const route = providerRouter.resolveRoute({
        country: "KE",
        currency: "KES",
        destinationType: "mobile_money",
        phoneNumber: "+254712345678",
      });

      expect(route.providerId).toBe("mpesa");
      expect(route.country).toBe("KE");
      expect(route.currency).toBe("KES");
    });

    it("should reject unsupported currency combinations with clean error", () => {
      expect(() => {
        providerRouter.resolveRoute({
          country: "NG",
          currency: "USD",
          destinationType: "bank_account",
        });
      }).toThrow(/Nigerian bank transfer rail only supports NGN/);
    });
  });

  describe("Section 14: Tenant Isolation & IDOR Protection", () => {
    it("should reject Project Beta trying to access Project Alpha's transfer (404 Not Found)", async () => {
      // Mock API key for Beta
      vi.spyOn(prisma.apiKey, "findUnique").mockResolvedValue({
        id: "key_beta",
        projectId: projectBetaId,
        keyPrefix: keyPrefixBeta,
        keyHash: keyHashBeta,
        environment: "test",
        isActive: true,
        expiresAt: null,
        project: { organizationId: "org_beta" },
      } as any);

      // Scoped query for beta project returns null
      vi.spyOn(prisma.transfer, "findFirst").mockResolvedValue(null);

      const res = await request(app)
        .get("/v1/transfers/txn_alpha_private_transfer")
        .set("Authorization", `Bearer ${apiKeyBeta}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("TRANSFER_NOT_FOUND");
    });

    it("should scope transfer listings strictly to authenticated project ID", async () => {
      // Mock API key for Alpha
      vi.spyOn(prisma.apiKey, "findUnique").mockResolvedValue({
        id: "key_alpha",
        projectId: projectAlphaId,
        keyPrefix: keyPrefixAlpha,
        keyHash: keyHashAlpha,
        environment: "test",
        isActive: true,
        expiresAt: null,
        project: { organizationId: "org_alpha" },
      } as any);

      const findManySpy = vi.spyOn(prisma.transfer, "findMany").mockResolvedValue([
        {
          id: "txn_alpha_1",
          projectId: projectAlphaId,
          reference: "ref_alpha_1",
          amount: 50000,
          currency: "NGN",
          status: "successful",
          direction: "outbound",
          type: "external",
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: {},
        } as any,
      ]);

      const res = await request(app)
        .get("/v1/transfers")
        .set("Authorization", `Bearer ${apiKeyAlpha}`);

      expect(res.status).toBe(200);
      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            projectId: projectAlphaId,
          }),
        }),
      );
    });
  });
});
