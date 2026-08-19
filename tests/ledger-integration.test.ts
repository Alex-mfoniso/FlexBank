import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { prismaMock as mockPrisma, redisMock as mockRedis, store as mockStore, clearStore as mockClearStore } from "./prisma-mock";
import { app } from "../src/app";

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

describe("Ledger double-entry integration tests", () => {
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

    // 1. Setup default user and organization and sign standard session JWT token
    const registerRes = await request(app)
      .post("/api/v1/auth/register")
      .send({
        email: "test@example.com",
        password: "SecurePassword123",
        firstName: "Test",
        lastName: "User",
      })
      .expect(201);

    tokenA = registerRes.body.token;

    // 2. Resolve organization context and create Project A
    const meRes = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${tokenA}`)
      .expect(200);

    const orgId = meRes.body.user.memberships[0].organizationId;

    const projectResA = await request(app)
      .post("/api/v1/projects")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        organizationId: orgId,
        name: "Test Project A",
        environment: "test",
      })
      .expect(201);

    projectAId = projectResA.body.project.id;

    // 3. Generate API Key for standard Developer access for Project A
    const keyResA = await request(app)
      .post(`/api/v1/projects/${projectAId}/api-keys`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ name: "Default Test Key A" })
      .expect(201);

    apiKeyA = keyResA.body.key;

    // 4. Create Project B and its API Key
    const projectResB = await request(app)
      .post("/api/v1/projects")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        organizationId: orgId,
        name: "Test Project B",
        environment: "test",
      })
      .expect(201);

    projectBId = projectResB.body.project.id;

    const keyResB = await request(app)
      .post(`/api/v1/projects/${projectBId}/api-keys`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ name: "Default Test Key B" })
      .expect(201);

    apiKeyB = keyResB.body.key;

    // 5. Create Customer A under Project A
    const custRes = await request(app)
      .post("/api/v1/customers")
      .set("Authorization", `Bearer ${apiKeyA}`)
      .send({
        externalId: "ext_custA",
        firstName: "Alex",
        lastName: "Owner",
        email: "alex@example.com",
      })
      .expect(201);

    customerAId = custRes.body.customer.id;

    // 6. Create Customer B under Project B
    const custResB = await request(app)
      .post("/api/v1/customers")
      .set("Authorization", `Bearer ${apiKeyB}`)
      .send({
        externalId: "ext_custB",
        firstName: "Bob",
        lastName: "Client",
        email: "bob@example.com",
      })
      .expect(201);

    customerBId = custResB.body.customer.id;

    // 7. Create Financial Accounts under Project A
    const accRes1 = await request(app)
      .post("/api/v1/accounts")
      .set("Authorization", `Bearer ${apiKeyA}`)
      .send({
        customerId: customerAId,
        currency: "NGN",
        name: "Wallet 1",
      })
      .expect(201);
    accountA1Id = accRes1.body.account.id;

    const accRes2 = await request(app)
      .post("/api/v1/accounts")
      .set("Authorization", `Bearer ${apiKeyA}`)
      .send({
        customerId: customerAId,
        currency: "NGN",
        name: "Wallet 2",
      })
      .expect(201);
    accountA2Id = accRes2.body.account.id;

    // 8. Create Financial Account under Project B
    const accResB1 = await request(app)
      .post("/api/v1/accounts")
      .set("Authorization", `Bearer ${apiKeyB}`)
      .send({
        customerId: customerBId,
        currency: "NGN",
        name: "Wallet B1",
      })
      .expect(201);
    accountB1Id = accResB1.body.account.id;

    // 9. Seed Wallet 1 with starting available balance
    const seedJournal = await mockPrisma.journal.create({
      data: {
        id: "txn_seed",
        projectId: projectAId,
        reference: "seed_A1",
        type: "adjustment",
        status: "posted",
        currency: "NGN",
      },
    });

    // Trigger auto-creation of ledger account by invoking balance check
    await request(app)
      .get(`/api/v1/accounts/${accountA1Id}/balance`)
      .set("Authorization", `Bearer ${apiKeyA}`)
      .expect(200);

    // Retrieve ledger account to find resolved dynamic id
    const ledgerAcc = await mockPrisma.ledgerAccount.findFirst({
      where: { financialAccountId: accountA1Id, projectId: projectAId },
    });

    await mockPrisma.ledgerEntry.create({
      data: {
        id: "lge_seed",
        journalId: seedJournal.id,
        ledgerAccountId: ledgerAcc.id,
        direction: "credit",
        amount: 1000000,
        currency: "NGN",
      },
    });

    // Update starting balance in MockStore
    const idx = mockStore.accounts.findIndex((x) => x.id === accountA1Id);
    mockStore.accounts[idx].available = 1000000;
  });

  describe("POST /api/v1/ledger/transfers", () => {
    it("should execute an internal double-entry transfer and update projected balances", async () => {
      const response = await request(app)
        .post("/api/v1/ledger/transfers")
        .set("Authorization", `Bearer ${apiKeyA}`)
        .set("Idempotency-Key", "idemp_trans_1")
        .send({
          sourceAccountId: accountA1Id,
          destinationAccountId: accountA2Id,
          amount: 100000, // ₦1,000
          currency: "NGN",
          reference: "ref_transfer_1",
          description: "Internal payment",
        });

      expect(response.status).toBe(201);
      expect(response.body.transaction).toBeDefined();
      expect(response.body.transaction.status).toBe("posted");

      // Verify DB updates
      const updatedA1 = mockStore.accounts.find((x) => x.id === accountA1Id);
      const updatedA2 = mockStore.accounts.find((x) => x.id === accountA2Id);

      expect(updatedA1.available).toBe(900000);
      expect(updatedA2.available).toBe(100000);
    });

    it("should reject transfer if source has insufficient funds", async () => {
      const response = await request(app)
        .post("/api/v1/ledger/transfers")
        .set("Authorization", `Bearer ${apiKeyA}`)
        .set("Idempotency-Key", "idemp_trans_over")
        .send({
          sourceAccountId: accountA1Id,
          destinationAccountId: accountA2Id,
          amount: 5000000, // ₦50,000 (exceeds ₦10,000)
          currency: "NGN",
          reference: "ref_over",
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("INSUFFICIENT_FUNDS");
    });

    it("should reject transfer if currency code mismatches financial accounts", async () => {
      const response = await request(app)
        .post("/api/v1/ledger/transfers")
        .set("Authorization", `Bearer ${apiKeyA}`)
        .set("Idempotency-Key", "idemp_trans_cur")
        .send({
          sourceAccountId: accountA1Id,
          destinationAccountId: accountA2Id,
          amount: 1000,
          currency: "USD",
          reference: "ref_cur",
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("CURRENCY_MISMATCH");
    });
  });

  describe("GET /api/v1/accounts/:accountId/balance", () => {
    it("should dynamically fetch ledger balance", async () => {
      const response = await request(app)
        .get(`/api/v1/accounts/${accountA1Id}/balance`)
        .set("Authorization", `Bearer ${apiKeyA}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        accountId: accountA1Id,
        currency: "NGN",
        available: 1000000,
        pending: 0,
      });
    });
  });

  describe("POST /api/v1/transactions/:id/reverse", () => {
    it("should reverse a posted transfer atomically, creating inverted entries", async () => {
      // 1. Post a transfer
      const transResponse = await request(app)
        .post("/api/v1/ledger/transfers")
        .set("Authorization", `Bearer ${apiKeyA}`)
        .set("Idempotency-Key", "idemp_to_rev")
        .send({
          sourceAccountId: accountA1Id,
          destinationAccountId: accountA2Id,
          amount: 200000, // ₦2,000
          currency: "NGN",
          reference: "ref_to_rev",
        });

      expect(transResponse.status).toBe(201);
      const txnId = transResponse.body.transaction.id;

      // 2. Reverse the transfer
      const revResponse = await request(app)
        .post(`/api/v1/transactions/${txnId}/reverse`)
        .set("Authorization", `Bearer ${apiKeyA}`);

      expect(revResponse.status).toBe(200);
      expect(revResponse.body.transaction.status).toBe("posted");

      // Balance must be fully restored
      const updatedA1 = mockStore.accounts.find((x) => x.id === accountA1Id);
      const updatedA2 = mockStore.accounts.find((x) => x.id === accountA2Id);

      expect(updatedA1.available).toBe(1000000);
      expect(updatedA2.available).toBe(0);

      // Reversal second attempt must be rejected
      const dupRevResponse = await request(app)
        .post(`/api/v1/transactions/${txnId}/reverse`)
        .set("Authorization", `Bearer ${apiKeyA}`);

      expect(dupRevResponse.status).toBe(400);
      expect(dupRevResponse.body.error.code).toBe("JOURNAL_ALREADY_REVERSED");
    });
  });

  describe("Strict multi-tenant IDOR bounds safety", () => {
    it("should prevent Project A from fetching Project B account balance", async () => {
      const response = await request(app)
        .get(`/api/v1/accounts/${accountB1Id}/balance`)
        .set("Authorization", `Bearer ${apiKeyA}`);

      expect(response.status).toBe(404);
    });

    it("should prevent cross-project transfers", async () => {
      const response = await request(app)
        .post("/api/v1/ledger/transfers")
        .set("Authorization", `Bearer ${apiKeyA}`)
        .set("Idempotency-Key", "idemp_cross")
        .send({
          sourceAccountId: accountA1Id,
          destinationAccountId: accountB1Id, // Belongs to Project B!
          amount: 1000,
          currency: "NGN",
          reference: "ref_cross",
        });

      expect(response.status).toBe(404);
    });
  });
});
