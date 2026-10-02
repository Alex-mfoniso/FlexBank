import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import { providerRegistry } from "../src/modules/providers/provider.registry";
import { RicarutTransferService } from "../src/modules/transfers/ricarut-transfer.service";
import { AccountResolutionService } from "../src/modules/accounts/account-resolution.service";
import {
  AccountVerificationProvider,
  TransferProvider,
  FinancialProvider,
} from "../src/modules/providers/contracts/provider.contracts";
import {
  ProviderInvalidAccountError,
  ProviderTimeoutError,
  ProviderUnavailableError,
} from "../src/modules/providers/provider.errors";
import { prisma } from "../src/lib/prisma";

describe("Phase 6.5: Frontend Integration & Contract Verification", () => {
  const projectId = "prj_frontend_test_123";

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // Step 16: Security Review & Isolation Invariants
  // ===========================================================================
  describe("Security Review: Frontend Isolation", () => {
    it("frontend source files must not contain PAYSTACK_SECRET_KEY", () => {
      const frontendSrc = path.resolve(__dirname, "../frontend/src");
      const checkDir = (dir: string) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            checkDir(fullPath);
          } else if (/\.(ts|tsx|js|jsx|json|env)$/.test(entry.name)) {
            const content = fs.readFileSync(fullPath, "utf-8");
            expect(content).not.toContain("PAYSTACK_SECRET_KEY");
            expect(content).not.toContain("api.paystack.co");
          }
        }
      };

      checkDir(frontendSrc);
    });

    it("frontend .env file must not contain raw provider secrets", () => {
      const envPath = path.resolve(__dirname, "../frontend/.env");
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, "utf-8");
        expect(envContent).not.toContain("PAYSTACK_SECRET_KEY");
        expect(envContent).not.toContain("sk_live_");
        expect(envContent).not.toContain("sk_test_");
      }
    });

    it("frontend services should only call centralized Ricarut backend endpoints", () => {
      const accountServiceFile = fs.readFileSync(
        path.resolve(__dirname, "../frontend/src/services/account.service.ts"),
        "utf-8"
      );
      const transferServiceFile = fs.readFileSync(
        path.resolve(__dirname, "../frontend/src/services/transfer.service.ts"),
        "utf-8"
      );

      // Verify account resolution route
      expect(accountServiceFile).toContain("/api/v1/accounts/resolve");
      expect(accountServiceFile).not.toContain("paystack");

      // Verify transfer routes
      expect(transferServiceFile).toContain("/api/v1/transfers");
      expect(transferServiceFile).toContain("/status");
      expect(transferServiceFile).not.toContain("paystack");
    });
  });

  // ===========================================================================
  // Step 5: Account Resolution Flow
  // ===========================================================================
  describe("Bank Account Resolution Contract", () => {
    it("should resolve valid bank account successfully", async () => {
      const mockVerificationProvider: FinancialProvider & AccountVerificationProvider = {
        id: "paystack",
        name: "Paystack TEST Rail",
        capabilities: ["account_verification"],
        hasCapability: (cap) => cap === "account_verification",
        verifyConnectivity: async () => ({ provider: "paystack", connected: true }),
        resolveAccount: vi.fn().mockResolvedValue({
          account_number: "0123456789",
          account_name: "ADEBAYO TEST USER",
          bank_code: "058",
        }),
      };

      vi.spyOn(providerRegistry, "resolveAccountVerification").mockReturnValue(mockVerificationProvider);

      const resolutionService = new AccountResolutionService(providerRegistry);
      const result = await resolutionService.resolveAccount({
        bank_code: "058",
        account_number: "0123456789",
      });

      expect(result).toEqual({
        account_number: "0123456789",
        account_name: "ADEBAYO TEST USER",
        bank_code: "058",
      });
      expect(mockVerificationProvider.resolveAccount).toHaveBeenCalledWith("058", "0123456789");
    });

    it("should handle invalid bank account and throw ProviderInvalidAccountError", async () => {
      const mockVerificationProvider: FinancialProvider & AccountVerificationProvider = {
        id: "paystack",
        name: "Paystack TEST Rail",
        capabilities: ["account_verification"],
        hasCapability: (cap) => cap === "account_verification",
        verifyConnectivity: async () => ({ provider: "paystack", connected: true }),
        resolveAccount: vi.fn().mockRejectedValue(new ProviderInvalidAccountError("Account number could not be resolved")),
      };

      vi.spyOn(providerRegistry, "resolveAccountVerification").mockReturnValue(mockVerificationProvider);

      const resolutionService = new AccountResolutionService(providerRegistry);
      await expect(
        resolutionService.resolveAccount({
          bank_code: "058",
          account_number: "9999999999",
        })
      ).rejects.toThrow(ProviderInvalidAccountError);
    });

    it("should handle provider downtime gracefully", async () => {
      const mockVerificationProvider: FinancialProvider & AccountVerificationProvider = {
        id: "paystack",
        name: "Paystack TEST Rail",
        capabilities: ["account_verification"],
        hasCapability: (cap) => cap === "account_verification",
        verifyConnectivity: async () => ({ provider: "paystack", connected: false }),
        resolveAccount: vi.fn().mockRejectedValue(new ProviderUnavailableError("Payment rail temporarily unavailable")),
      };

      vi.spyOn(providerRegistry, "resolveAccountVerification").mockReturnValue(mockVerificationProvider);

      const resolutionService = new AccountResolutionService(providerRegistry);
      await expect(
        resolutionService.resolveAccount({
          bank_code: "058",
          account_number: "0123456789",
        })
      ).rejects.toThrow(ProviderUnavailableError);
    });
  });

  // ===========================================================================
  // Step 6 & 7: Transfer Creation & Idempotency Behavior
  // ===========================================================================
  describe("Transfer Initiation & Idempotency", () => {
    it("should initiate test transfer successfully via provider abstraction", async () => {
      const mockTransferProvider: FinancialProvider & TransferProvider = {
        id: "paystack",
        name: "Paystack TEST Rail",
        capabilities: ["transfers"],
        hasCapability: (cap) => cap === "transfers",
        verifyConnectivity: async () => ({ provider: "paystack", connected: true }),
        initiateTransfer: vi.fn().mockResolvedValue({
          providerTransferId: "TRF_pstk_test_123",
          status: "pending",
          reference: "ref_test_001",
          amount: 500000,
          currency: "NGN",
          fee: 1000,
          rawResponse: {},
        }),
        getTransferStatus: vi.fn(),
      };

      vi.spyOn(providerRegistry, "resolveTransfer").mockReturnValue(mockTransferProvider);

      // Mock Prisma calls
      vi.spyOn(prisma.idempotencyRecord, "findUnique").mockResolvedValue(null);
      vi.spyOn(prisma.idempotencyRecord, "create").mockResolvedValue({} as any);
      vi.spyOn(prisma.idempotencyRecord, "update").mockResolvedValue({} as any);

      vi.spyOn(prisma.beneficiary, "findFirst").mockResolvedValue(null);
      vi.spyOn(prisma.beneficiary, "create").mockResolvedValue({
        id: "ben_test_1",
        projectId,
        type: "bank_account",
        bankCode: "058",
        accountNumber: "0123456789",
        accountName: "TEST BENEFICIARY",
        providerRecipientId: "RCP_test_123",
        createdAt: new Date(),
      } as any);

      vi.spyOn(prisma.transfer, "create").mockResolvedValue({
        id: "txn_ric_test_1",
        projectId,
        reference: "ref_test_001",
        amount: 500000,
        currency: "NGN",
        status: "pending",
        providerId: "paystack",
        providerTransferId: "TRF_pstk_test_123",
        destinationAccountId: null,
        sourceAccountId: null,
        beneficiaryId: "ben_test_1",
        createdAt: new Date(),
        updatedAt: new Date(),
        beneficiary: {
          bankCode: "058",
          accountNumber: "0123456789",
          accountName: "TEST BENEFICIARY",
        },
      } as any);

      const transferService = new RicarutTransferService(providerRegistry);
      const idempotencyKey = "idem_test_key_001";

      const result = await transferService.initiateTransfer(projectId, idempotencyKey, {
        amount: 500000,
        currency: "NGN",
        bank_code: "058",
        account_number: "0123456789",
        account_name: "TEST BENEFICIARY",
        reference: "ref_test_001",
        reason: "Sandbox payout test",
      });

      expect(result).toBeDefined();
      expect(result.id).toBe("txn_ric_test_1");
      expect(result.status).toBe("pending");
      expect(result.amount).toBe(500000);
      expect(result.currency).toBe("NGN");
      expect(result.destination.bank_code).toBe("058");
      expect(result.destination.account_number).toBe("0123456789");
    });

    it("should return cached response for duplicate idempotency submission with same payload", async () => {
      const existingResponse = {
        id: "txn_ric_cached_1",
        reference: "ref_cached_001",
        amount: 250000,
        currency: "NGN",
        status: "successful",
        bank_code: "058",
        account_number: "0123456789",
        account_name: "TEST CACHED",
        destination: {
          bank_code: "058",
          account_number: "0123456789",
          account_name: "TEST CACHED",
        },
        provider: "paystack",
        environment: "test",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const payload = {
        amount: 250000,
        currency: "NGN" as const,
        bank_code: "058",
        account_number: "0123456789",
        account_name: "TEST CACHED",
        reference: "ref_cached_001",
      };

      // Mock existing idempotency record completed
      vi.spyOn(prisma.idempotencyRecord, "findUnique").mockResolvedValue({
        id: "idem_rec_1",
        projectId,
        key: "idem_dup_test",
        requestHash: "c0b852a36d29ec4da6718d7f7eeb88cf02611e3bceb7f13df65243851b2a265d", // Will be matched or stubbed
        status: "completed",
        response: existingResponse,
        resourceId: "txn_ric_cached_1",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const transferService = new RicarutTransferService(providerRegistry);
      vi.spyOn(transferService as any, "generatePayloadHash").mockReturnValue("c0b852a36d29ec4da6718d7f7eeb88cf02611e3bceb7f13df65243851b2a265d");
      vi.spyOn(transferService, "getTransfer").mockResolvedValue(existingResponse as any);

      const result = await transferService.initiateTransfer(projectId, "idem_dup_test", payload);

      expect(result.id).toBe("txn_ric_cached_1");
      expect(result.status).toBe("successful");
    });
  });

  // ===========================================================================
  // Step 8 & 9: Transfer Status Sync & Polling
  // ===========================================================================
  describe("Transfer Status Sync & Lifecycle Transitions", () => {
    it("should synchronize transfer status from pending to successful", async () => {
      const mockTransferProvider: FinancialProvider & TransferProvider = {
        id: "paystack",
        name: "Paystack TEST Rail",
        capabilities: ["transfers"],
        hasCapability: (cap) => cap === "transfers",
        verifyConnectivity: async () => ({ provider: "paystack", connected: true }),
        initiateTransfer: vi.fn(),
        getTransferStatus: vi.fn().mockResolvedValue({
          providerTransferId: "TRF_pstk_sync_1",
          status: "successful",
          reference: "ref_sync_001",
          amount: 500000,
          currency: "NGN",
          rawResponse: {},
        }),
      };

      vi.spyOn(providerRegistry, "resolveTransfer").mockReturnValue(mockTransferProvider);

      const mockExistingTransfer = {
        id: "txn_ric_sync_1",
        projectId,
        reference: "ref_sync_001",
        amount: 500000,
        currency: "NGN",
        status: "pending",
        providerId: "paystack",
        providerTransferId: "TRF_pstk_sync_1",
        destinationAccountId: null,
        sourceAccountId: null,
        beneficiaryId: "ben_1",
        createdAt: new Date(),
        updatedAt: new Date(),
        beneficiary: {
          bankCode: "058",
          accountNumber: "0123456789",
          accountName: "TEST BENEFICIARY",
        },
      };

      vi.spyOn(prisma.transfer, "findFirst").mockResolvedValue(mockExistingTransfer as any);
      vi.spyOn(prisma.transfer, "update").mockResolvedValue({
        ...mockExistingTransfer,
        status: "successful",
        completedAt: new Date(),
      } as any);

      const transferService = new RicarutTransferService(providerRegistry);
      const synced = await transferService.synchronizeTransferStatus(projectId, "txn_ric_sync_1");

      expect(synced.status).toBe("successful");
      expect(mockTransferProvider.getTransferStatus).toHaveBeenCalledWith("TRF_pstk_sync_1");
    });
  });
});
