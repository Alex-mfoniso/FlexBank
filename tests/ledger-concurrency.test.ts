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

describe("Ledger Concurrency and Double-Spend Protection", () => {
  let projectAId: string;
  let apiKeyA: string;
  let accountA1Id: string;
  let accountA2Id: string;

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

    const tokenA = registerRes.body.token;

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

    // 4. Create Customer A under Project A
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

    const customerAId = custRes.body.customer.id;

    // 5. Create Financial Accounts under Project A
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

    // 6. Seed Wallet 1 with starting available balance
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

    const ledgerAcc = await mockPrisma.ledgerAccount.findFirst({
      where: { financialAccountId: accountA1Id, projectId: projectAId },
    });

    await mockPrisma.ledgerEntry.create({
      data: {
        id: "lge_seed",
        journalId: seedJournal.id,
        ledgerAccountId: ledgerAcc.id,
        direction: "credit",
        amount: 3000,
        currency: "NGN",
      },
    });

    // Update starting balance in MockStore
    const idx = mockStore.accounts.findIndex((x) => x.id === accountA1Id);
    mockStore.accounts[idx].available = 3000;
  });

  it("should prevent concurrent double-spend transfers from creating a negative balance", async () => {
    // Attempt 4 concurrent transfers of 1000 each (Total requested = 4000, balance = 3000).
    // Exactly 3 should succeed (3000), and 1 should fail with INSUFFICIENT_FUNDS.
    const requests = Array.from({ length: 4 }).map((_, index) => {
      return request(app)
        .post("/api/v1/ledger/transfers")
        .set("Authorization", `Bearer ${apiKeyA}`)
        .set("Idempotency-Key", `idemp_conc_${index}`)
        .send({
          sourceAccountId: accountA1Id,
          destinationAccountId: accountA2Id,
          amount: 1000, // ₦10 each
          currency: "NGN",
          reference: `ref_conc_${index}`,
        });
    });

    const responses = await Promise.all(requests);

    const successes = responses.filter((r) => r.status === 201);
    const failures = responses.filter((r) => r.status === 400);

    expect(successes.length).toBe(3);
    expect(failures.length).toBe(1);
    expect(failures[0].body.error.code).toBe("INSUFFICIENT_FUNDS");

    // Final balance states must be perfectly correct
    const updatedA1 = mockStore.accounts.find((x) => x.id === accountA1Id);
    const updatedA2 = mockStore.accounts.find((x) => x.id === accountA2Id);

    expect(updatedA1.available).toBe(0);
    expect(updatedA2.available).toBe(3000);
  });
});
