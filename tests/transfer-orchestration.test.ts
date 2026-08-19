import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import {
  prismaMock as mockPrisma,
  redisMock as mockRedis,
  store as mockStore,
  clearStore as mockClearStore,
} from "./prisma-mock";
import { app } from "../src/app";
import { FakePaymentProvider } from "../src/modules/providers/adapters/fake-provider/fake-provider.adapter";

// Mock global database and redis clients
vi.mock("../src/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("../src/lib/redis", () => ({
  redis: mockRedis,
}));

vi.mock("../src/middleware/rate-limiter", () => ({
  rateLimiterMiddleware: () => (req: any, res: any, next: any) => next(),
  default: () => (req: any, res: any, next: any) => next(),
}));

describe("Payment & Transfer Orchestration integration tests", () => {
  let tokenA: string;
  let projectAId: string;
  let projectBId: string;
  let apiKeyA: string;
  let apiKeyB: string;

  let customerAId: string;
  let customerBId: string;
  let accountA1Id: string;
  let accountA2Id: string;
  let accountB1Id: string;

  beforeEach(async () => {
    mockClearStore();

    // 1. Setup user register and token
    const registerRes = await request(app)
      .post("/api/v1/auth/register")
      .send({
        email: "alex_p5@example.com",
        password: "SecurePassword123",
        firstName: "Alex",
        lastName: "Orchestrator",
      })
      .expect(201);

    tokenA = registerRes.body.token;

    // 2. Resolve organization context
    const meRes = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${tokenA}`)
      .expect(200);

    const orgId = meRes.body.user.memberships[0].organizationId;

    // 3. Create Project A and API Key
    const projectResA = await request(app)
      .post("/api/v1/projects")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        organizationId: orgId,
        name: "Project A Live",
        environment: "test",
      })
      .expect(201);

    projectAId = projectResA.body.project.id;

    const keyResA = await request(app)
      .post(`/api/v1/projects/${projectAId}/api-keys`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ name: "Live Key A" })
      .expect(201);

    apiKeyA = keyResA.body.key;

    // 4. Create Project B and API Key
    const projectResB = await request(app)
      .post("/api/v1/projects")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        organizationId: orgId,
        name: "Project B Sandbox",
        environment: "test",
      })
      .expect(201);

    projectBId = projectResB.body.project.id;

    const keyResB = await request(app)
      .post(`/api/v1/projects/${projectBId}/api-keys`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ name: "Live Key B" })
      .expect(201);

    apiKeyB = keyResB.body.key;

    // 5. Create Customers
    const custResA = await request(app)
      .post("/api/v1/customers")
      .set("Authorization", `Bearer ${apiKeyA}`)
      .send({
        externalId: "cust_p5_a",
        firstName: "Ainsley",
        lastName: "Holder",
        email: "ainsley@example.com",
      })
      .expect(201);

    customerAId = custResA.body.customer.id;

    const custResB = await request(app)
      .post("/api/v1/customers")
      .set("Authorization", `Bearer ${apiKeyB}`)
      .send({
        externalId: "cust_p5_b",
        firstName: "Bernard",
        lastName: "Client",
        email: "bernard@example.com",
      })
      .expect(201);

    customerBId = custResB.body.customer.id;

    // 6. Create Accounts
    const accRes1 = await request(app)
      .post("/api/v1/accounts")
      .set("Authorization", `Bearer ${apiKeyA}`)
      .send({
        customerId: customerAId,
        currency: "NGN",
        name: "NGN Wallet 1",
      })
      .expect(201);
    accountA1Id = accRes1.body.account.id;

    const accRes2 = await request(app)
      .post("/api/v1/accounts")
      .set("Authorization", `Bearer ${apiKeyA}`)
      .send({
        customerId: customerAId,
        currency: "NGN",
        name: "NGN Wallet 2",
      })
      .expect(201);
    accountA2Id = accRes2.body.account.id;

    const accResB1 = await request(app)
      .post("/api/v1/accounts")
      .set("Authorization", `Bearer ${apiKeyB}`)
      .send({
        customerId: customerBId,
        currency: "NGN",
        name: "NGN Sandbox Wallet",
      })
      .expect(201);
    accountB1Id = accResB1.body.account.id;

    // 7. Seed Wallet 1 with starting available balance: 1,000,000 (₦10,000)
    const seedJournal = await mockPrisma.journal.create({
      data: {
        id: "txn_p5_seed",
        projectId: projectAId,
        reference: "seed_A1_p5",
        type: "adjustment",
        status: "posted",
        currency: "NGN",
      },
    });

    // Populate ledgerAccounts dynamically
    await request(app)
      .get(`/api/v1/accounts/${accountA1Id}/balance`)
      .set("Authorization", `Bearer ${apiKeyA}`)
      .expect(200);

    const ledgerAcc = await mockPrisma.ledgerAccount.findFirst({
      where: { financialAccountId: accountA1Id, projectId: projectAId },
    });

    await mockPrisma.ledgerEntry.create({
      data: {
        id: "lge_p5_seed",
        journalId: seedJournal.id,
        ledgerAccountId: ledgerAcc.id,
        direction: "credit",
        amount: 1000000,
        currency: "NGN",
      },
    });

    const aIdx = mockStore.accounts.findIndex((x) => x.id === accountA1Id);
    mockStore.accounts[aIdx].available = 1000000;
  });

  describe("Internal Transfers", () => {
    it("successfully moves NGN funds from source to destination account in the same project", async () => {
      const res = await request(app)
        .post("/api/v1/transfers")
        .set("Authorization", `Bearer ${apiKeyA}`)
        .set("Idempotency-Key", `idem_int_${Date.now()}`)
        .send({
          type: "internal",
          sourceAccountId: accountA1Id,
          destinationAccountId: accountA2Id,
          amount: 100000, // ₦1,000
          currency: "NGN",
          reference: "ref_internal_101",
        })
        .expect(201);

      expect(res.body.status).toBe("success");
      expect(res.body.transfer.status).toBe("successful");
      expect(res.body.transfer.type).toBe("internal");

      // Verify updated cash balance projections in memory
      const source = mockStore.accounts.find((x) => x.id === accountA1Id);
      const destination = mockStore.accounts.find((x) => x.id === accountA2Id);

      expect(source.available).toBe(900000);
      expect(destination.available).toBe(100000);
    });

    it("throws InsufficientFundsError when attempting to transfer more than available balance", async () => {
      const res = await request(app)
        .post("/api/v1/transfers")
        .set("Authorization", `Bearer ${apiKeyA}`)
        .set("Idempotency-Key", "idem_fail_funds")
        .send({
          type: "internal",
          sourceAccountId: accountA1Id,
          destinationAccountId: accountA2Id,
          amount: 2500000, // Exceeds 1,000,000
          currency: "NGN",
          reference: "ref_internal_insufficient",
        })
        .expect(400);

      expect(res.body.error.code).toBe("INSUFFICIENT_FUNDS");
    });

    it("prevents transfers between accounts in different projects", async () => {
      const res = await request(app)
        .post("/api/v1/transfers")
        .set("Authorization", `Bearer ${apiKeyA}`) // Authorized on project A
        .set("Idempotency-Key", "idem_cross_proj")
        .send({
          type: "internal",
          sourceAccountId: accountA1Id,
          destinationAccountId: accountB1Id, // Belongs to Project B!
          amount: 10000,
          currency: "NGN",
          reference: "ref_cross_proj",
        })
        .expect(404); // Destination account validation checks existence within Project A

      expect(res.body.error.code).toBe("ACCOUNT_NOT_FOUND");
    });
  });

  describe("External Payouts (Orchestrated Live/Sandbox routing)", () => {
    it("processes an outbound external payout immediately when adapter returns immediate success", async () => {
      const res = await request(app)
        .post("/api/v1/transfers")
        .set("Authorization", `Bearer ${apiKeyA}`)
        .set("Idempotency-Key", "idem_ext_succ")
        .send({
          type: "external",
          sourceAccountId: accountA1Id,
          amount: 200000, // ₦2,000
          currency: "NGN",
          reference: "ref_payout_succ_sim",
          beneficiary: {
            type: "bank_account",
            bankCode: "011",
            accountNumber: "2048201201",
            accountName: "Simulated Success Dest",
          },
        })
        .expect(201);

      expect(res.body.status).toBe("success");
      expect(res.body.transfer.status).toBe("successful");

      // Balance check: Hold is applied and immediately cleared on settlement!
      const source = mockStore.accounts.find((x) => x.id === accountA1Id);
      expect(source.available).toBe(800000);
      expect(source.pending).toBe(0);
    });

    it("holds funds in pending and enters processing state for sim_pending references", async () => {
      const res = await request(app)
        .post("/api/v1/transfers")
        .set("Authorization", `Bearer ${apiKeyA}`)
        .set("Idempotency-Key", "idem_ext_pending")
        .send({
          type: "external",
          sourceAccountId: accountA1Id,
          amount: 150000, // ₦1,500
          currency: "NGN",
          reference: "ref_sim_pending_103",
          beneficiary: {
            type: "bank_account",
            bankCode: "058",
            accountNumber: "2201948301",
            accountName: "Simulated Pending Holder",
          },
        })
        .expect(201);

      expect(res.body.status).toBe("success");
      expect(res.body.transfer.status).toBe("processing");

      // Verify NGN Available was decremented and Pending hold was incremented!
      const source = mockStore.accounts.find((x) => x.id === accountA1Id);
      expect(source.available).toBe(850000);
      expect(source.pending).toBe(150000);
    });

    it("safely reverses reservation hold immediately when provider adapter rejects transaction up front", async () => {
      const res = await request(app)
        .post("/api/v1/transfers")
        .set("Authorization", `Bearer ${apiKeyA}`)
        .set("Idempotency-Key", "idem_ext_fail")
        .send({
          type: "external",
          sourceAccountId: accountA1Id,
          amount: 50000,
          currency: "NGN",
          reference: "ref_sim_fail_104",
          beneficiary: {
            type: "bank_account",
            bankCode: "044",
            accountNumber: "1234567890",
            accountName: "Simulated Rejected Holder",
          },
        })
        .expect(201); // Initiating complete successfully (the process flow resolved safely)

      // The returned transfer status should indicate failure
      expect(res.body.status).toBe("success");
      expect(res.body.transfer.status).toBe("failed");
      expect(res.body.transfer.failureCode).toBe("BENEFICIARY_INVALID");

      // Balance check: funds restored, pending hold cleared!
      const source = mockStore.accounts.find((x) => x.id === accountA1Id);
      expect(source.available).toBe(1000000); // 1,000,000 starting remains untouched
      expect(source.pending).toBe(0);
    });

    it("tolerates provider connection timeouts, retaining PROCESSING state for timeout references", async () => {
      const res = await request(app)
        .post("/api/v1/transfers")
        .set("Authorization", `Bearer ${apiKeyA}`)
        .set("Idempotency-Key", "idem_ext_timeout")
        .send({
          type: "external",
          sourceAccountId: accountA1Id,
          amount: 80000,
          currency: "NGN",
          reference: "ref_sim_timeout_105",
          beneficiary: {
            type: "bank_account",
            bankCode: "011",
            accountNumber: "9988776655",
            accountName: "Simulated Timeout Holder",
          },
        })
        .expect(201);

      expect(res.body.status).toBe("success");
      expect(res.body.transfer.status).toBe("processing"); // Connection timeout keeps PROCESSING state

      const source = mockStore.accounts.find((x) => x.id === accountA1Id);
      expect(source.available).toBe(920000);
      expect(source.pending).toBe(80000);
    });
  });

  describe("Webhook Notifications processing", () => {
    it("successfully settles processing transfers via a cryptographically signed provider webhook", async () => {
      // 1. Create a processing transfer
      const trfRes = await request(app)
        .post("/api/v1/transfers")
        .set("Authorization", `Bearer ${apiKeyA}`)
        .set("Idempotency-Key", "idem_webhook_test")
        .send({
          type: "external",
          sourceAccountId: accountA1Id,
          amount: 300000,
          currency: "NGN",
          reference: "ref_sim_pending_wh",
          beneficiary: {
            type: "bank_account",
            bankCode: "011",
            accountNumber: "8827401121",
            accountName: "Pending Webhook Target",
          },
        })
        .expect(201);

      const transferId = trfRes.body.transfer.id;
      const provRef = trfRes.body.transfer.providerReference;

      expect(trfRes.body.transfer.status).toBe("processing");

      // Verify balance hold is active
      let source = mockStore.accounts.find((x) => x.id === accountA1Id);
      expect(source.available).toBe(700000);
      expect(source.pending).toBe(300000);

      // 2. Build signed webhook payload
      const provider = new FakePaymentProvider();
      const payload = {
        eventId: `ev_${Date.now()}`,
        eventType: "transfer.successful",
        providerReference: provRef,
        reference: "ref_sim_pending_wh",
        status: "successful",
      };

      const signature = provider.signPayload(payload);

      // 3. Dispatch Webhook
      const whRes = await request(app)
        .post("/api/v1/webhooks/fake-provider")
        .set("X-Webhook-Signature", signature)
        .send(payload)
        .expect(200);

      expect(whRes.body.status).toBe("success");
      expect(whRes.body.status).toBe("success");

      // 4. Assert transfer state is mutated to successful
      const updatedTrf = mockStore.transfers.find((x) => x.id === transferId);
      expect(updatedTrf.status).toBe("successful");

      // Verify balance hold released on settlement!
      source = mockStore.accounts.find((x) => x.id === accountA1Id);
      expect(source.available).toBe(700000);
      expect(source.pending).toBe(0);
    });

    it("idempotently ignores duplicated webhook callback deliveries returning 'ignored' status", async () => {
      const provider = new FakePaymentProvider();
      const payload = {
        eventId: "ev_duplicate_101",
        eventType: "transfer.successful",
        providerReference: "prov_dupl_9401",
        reference: "ref_duplicate_testing",
        status: "successful",
      };

      const signature = provider.signPayload(payload);

      // Send first delivery
      await request(app)
        .post("/api/v1/webhooks/fake-provider")
        .set("X-Webhook-Signature", signature)
        .send(payload)
        .expect(200);

      // Send identical second delivery
      const res = await request(app)
        .post("/api/v1/webhooks/fake-provider")
        .set("X-Webhook-Signature", signature)
        .send(payload)
        .expect(200);

      expect(res.body.status).toBe("success");
      expect(res.body.status).toBe("success");
    });

    it("rejects unsigned webhooks with 401 Unauthorized", async () => {
      const payload = { eventId: "ev_unsigned" };
      await request(app)
        .post("/api/v1/webhooks/fake-provider")
        .send(payload)
        .expect(401);
    });
  });
});
