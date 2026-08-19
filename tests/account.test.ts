import { describe, it, expect, afterAll, beforeEach, vi } from "vitest";
import request from "supertest";
import crypto from "crypto";
import { app } from "../src/app";

const { prismaMock, redisMock, mockUsers, mockOrganizations, mockMembers, mockProjects, mockApiKeys, mockCustomers, mockAccounts } = vi.hoisted(() => {
  const users: any[] = [];
  const organizations: any[] = [];
  const members: any[] = [];
  const projects: any[] = [];
  const apiKeys: any[] = [];
  const customers: any[] = [];
  const accounts: any[] = [];

  const pMock = {
    $disconnect: vi.fn(async () => {}),
    $transaction: vi.fn(async (cb) => {
      if (typeof cb === "function") {
        return cb(pMock);
      }
      return Promise.all(cb);
    }),
    user: {
      create: vi.fn(async ({ data }) => {
        const u = { id: crypto.randomUUID(), status: "active", createdAt: new Date(), ...data };
        users.push(u);
        return u;
      }),
      findUnique: vi.fn(async (args) => {
        const { id, email } = args.where;
        const u = users.find(x => x.id === id || x.email === email);
        if (!u) return null;
        if (args.include?.memberships) {
          return {
            ...u,
            memberships: members
              .filter((m) => m.userId === u.id)
              .map((m) => ({
                ...m,
                organization: organizations.find((o) => o.id === m.organizationId),
              })),
          };
        }
        return u;
      }),
      deleteMany: vi.fn(async () => { users.length = 0; return { count: 0 }; }),
    },
    organization: {
      create: vi.fn(async ({ data }) => {
        const o = { id: crypto.randomUUID(), status: "active", createdAt: new Date(), ...data };
        organizations.push(o);
        return o;
      }),
      findUnique: vi.fn(async ({ where }) => {
        return organizations.find(x => x.id === where.id || x.slug === where.slug) || null;
      }),
      deleteMany: vi.fn(async () => { organizations.length = 0; return { count: 0 }; }),
    },
    organizationMember: {
      create: vi.fn(async ({ data }) => {
        const m = { id: crypto.randomUUID(), createdAt: new Date(), ...data };
        members.push(m);
        return m;
      }),
      findUnique: vi.fn(async (args) => {
        const { organizationId_userId } = args.where;
        const m = members.find(
          x => x.organizationId === organizationId_userId.organizationId && x.userId === organizationId_userId.userId
        );
        if (!m) return null;
        if (args.include?.organization) {
          return {
            ...m,
            organization: organizations.find(o => o.id === m.organizationId),
          };
        }
        return m;
      }),
      findMany: vi.fn(async (args) => {
        let filtered = members;
        if (args?.where?.userId) {
          filtered = filtered.filter((x) => x.userId === args.where.userId);
        }
        if (args?.include?.organization) {
          return filtered.map(m => ({
            ...m,
            organization: organizations.find(o => o.id === m.organizationId),
          }));
        }
        return filtered;
      }),
      deleteMany: vi.fn(async () => { members.length = 0; return { count: 0 }; }),
    },
    project: {
      create: vi.fn(async ({ data }) => {
        const p = { id: crypto.randomUUID(), status: "active", createdAt: new Date(), ...data };
        projects.push(p);
        return p;
      }),
      findUnique: vi.fn(async ({ where }) => {
        return projects.find((x) => x.id === where.id) || null;
      }),
      findMany: vi.fn(async (args) => {
        let filtered = projects;
        if (args?.where?.organizationId) {
          if (args.where.organizationId.in) {
            filtered = filtered.filter((x) => args.where.organizationId.in.includes(x.organizationId));
          } else {
            filtered = filtered.filter((x) => x.organizationId === args.where.organizationId);
          }
        }
        return filtered;
      }),
      deleteMany: vi.fn(async () => { projects.length = 0; return { count: 0 }; }),
    },
    apiKey: {
      create: vi.fn(async ({ data }) => {
        const k = {
          id: crypto.randomUUID(),
          createdAt: new Date(),
          updatedAt: new Date(),
          lastUsedAt: null,
          revokedAt: null,
          ...data,
        };
        apiKeys.push(k);
        return k;
      }),
      findUnique: vi.fn(async (args) => {
        const { id, keyPrefix } = args.where;
        const k = apiKeys.find((x) => x.id === id || x.keyPrefix === keyPrefix);
        if (!k) return null;
        if (args.include?.project) {
          return {
            ...k,
            project: projects.find((p) => p.id === k.projectId),
          };
        }
        return k;
      }),
      findMany: vi.fn(async (args) => {
        let filtered = apiKeys;
        if (args?.where?.projectId) {
          filtered = filtered.filter((x) => x.projectId === args.where.projectId);
        }
        return filtered;
      }),
      update: vi.fn(async ({ where, data }) => {
        const idx = apiKeys.findIndex((x) => x.id === where.id);
        if (idx !== -1) {
          apiKeys[idx] = { ...apiKeys[idx], ...data, updatedAt: new Date() };
          return apiKeys[idx];
        }
        return null;
      }),
      deleteMany: vi.fn(async () => { apiKeys.length = 0; return { count: 0 }; }),
    },
    customer: {
      create: vi.fn(async ({ data }) => {
        const c = {
          id: data.id,
          projectId: data.projectId,
          externalId: data.externalId,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone || null,
          status: data.status || "active",
          metadata: data.metadata || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        customers.push(c);
        return c;
      }),
      findFirst: vi.fn(async (args) => {
        const { id, projectId } = args.where;
        return customers.find((x) => x.id === id && x.projectId === projectId) || null;
      }),
      findUnique: vi.fn(async (args) => {
        const { externalId_projectId } = args.where;
        if (externalId_projectId) {
          return (
            customers.find(
              (x) =>
                x.externalId === externalId_projectId.externalId &&
                x.projectId === externalId_projectId.projectId,
            ) || null
          );
        }
        return null;
      }),
      findMany: vi.fn(async (args) => {
        let filtered = customers;
        if (args?.where?.projectId) {
          filtered = filtered.filter((x) => x.projectId === args.where.projectId);
        }
        return filtered;
      }),
      update: vi.fn(async ({ where, data }) => {
        const idx = customers.findIndex((x) => x.id === where.id);
        if (idx === -1) throw new Error("Customer not found");
        customers[idx] = { ...customers[idx], ...data, updatedAt: new Date() };
        return customers[idx];
      }),
      deleteMany: vi.fn(async () => { customers.length = 0; return { count: 0 }; }),
    },
    account: {
      create: vi.fn(async ({ data }) => {
        const a = {
          id: data.id,
          customerId: data.customerId,
          projectId: data.projectId,
          currency: data.currency,
          name: data.name,
          status: data.status || "active",
          available: data.available || 0,
          pending: data.pending || 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        accounts.push(a);
        return a;
      }),
      findFirst: vi.fn(async (args) => {
        const { id, projectId } = args.where;
        return accounts.find((x) => x.id === id && x.projectId === projectId) || null;
      }),
      findMany: vi.fn(async (args) => {
        let filtered = accounts;
        if (args?.where?.projectId) {
          filtered = filtered.filter((x) => x.projectId === args.where.projectId);
        }
        if (args?.where?.customerId) {
          filtered = filtered.filter((x) => x.customerId === args.where.customerId);
        }
        if (args?.where?.status) {
          filtered = filtered.filter((x) => x.status === args.where.status);
        }
        return filtered;
      }),
      update: vi.fn(async ({ where, data }) => {
        const idx = accounts.findIndex((x) => x.id === where.id);
        if (idx === -1) throw new Error("Account not found");
        accounts[idx] = { ...accounts[idx], ...data, updatedAt: new Date() };
        return accounts[idx];
      }),
      deleteMany: vi.fn(async () => { accounts.length = 0; return { count: 0 }; }),
    },
    auditLog: {
      create: vi.fn(async () => ({ id: "log" })),
    },
  };

  const redisStore = new Map<string, string>();
  const rMock = {
    ping: vi.fn(async () => "PONG"),
    incr: vi.fn(async (key: string) => {
      const val = parseInt(redisStore.get(key) || "0", 10) + 1;
      redisStore.set(key, val.toString());
      return val;
    }),
    expire: vi.fn(async () => 1),
    quit: vi.fn(async () => "OK"),
    clear: () => redisStore.clear(),
  };

  return { prismaMock: pMock, redisMock: rMock, mockUsers: users, mockOrganizations: organizations, mockMembers: members, mockProjects: projects, mockApiKeys: apiKeys, mockCustomers: customers, mockAccounts: accounts };
});

vi.mock("../src/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("../src/lib/redis", () => ({ redis: redisMock }));

import { prisma } from "../src/lib/prisma";
import { redis } from "../src/lib/redis";

describe("Accounts Integration Tests", () => {
  let token: string;
  let projectId: string;
  let apiKey: string;
  let customerId: string;

  beforeEach(async () => {
    mockUsers.length = 0;
    mockOrganizations.length = 0;
    mockMembers.length = 0;
    mockProjects.length = 0;
    mockApiKeys.length = 0;
    mockCustomers.length = 0;
    mockAccounts.length = 0;
    redisMock.clear();

    // 1. Setup user and organization
    const registerRes = await request(app)
      .post("/api/v1/auth/register")
      .send({
        email: "account-test@example.com",
        password: "SecurePassword123",
        firstName: "Finance",
        lastName: "Admin",
      })
      .expect(201);

    token = registerRes.body.token;

    // 2. Resolve organization and create project
    const meRes = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const orgId = meRes.body.user.memberships[0].organizationId;

    const projectRes = await request(app)
      .post("/api/v1/projects")
      .set("Authorization", `Bearer ${token}`)
      .send({
        organizationId: orgId,
        name: "Ledger Project",
        environment: "test",
      })
      .expect(201);

    projectId = projectRes.body.project.id;

    // 3. Generate API Key
    const keyRes = await request(app)
      .post(`/api/v1/projects/${projectId}/api-keys`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Finance Test Key" })
      .expect(201);

    apiKey = keyRes.body.key;

    // 4. Create a Customer for linking
    const customerRes = await request(app)
      .post("/api/v1/customers")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({
        externalId: "ext_linked_cust",
        firstName: "Charlie",
        lastName: "Brown",
        email: "charlie@example.com",
      })
      .expect(201);

    customerId = customerRes.body.customer.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await redis.quit();
  });

  it("should create, list, retrieve, and transition account status states strictly adhering to constraints", async () => {
    // 1. Create account under existing customer
    const createRes = await request(app)
      .post("/api/v1/accounts")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({
        customerId: customerId,
        currency: "USD",
        name: "USD Operational Wallet",
      })
      .expect(201);

    expect(createRes.body.account).toBeDefined();
    expect(createRes.body.account.id).toContain("acc_");
    expect(createRes.body.account.name).toBe("USD Operational Wallet");
    expect(createRes.body.account.currency).toBe("USD");
    expect(createRes.body.account.status).toBe("active");
    expect(createRes.body.account.available).toBe(0);

    const accountId = createRes.body.account.id;

    // 2. Reject creating an account under a non-existent customer context
    const badCustRes = await request(app)
      .post("/api/v1/accounts")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({
        customerId: "cus_fake_nonexistent_id",
        currency: "EUR",
        name: "EUR Operational Wallet",
      })
      .expect(404);

    expect(badCustRes.body.error.code).toBe("CUSTOMER_NOT_FOUND");

    // 3. List accounts scoped to the customerId filter
    const listRes = await request(app)
      .get("/api/v1/accounts")
      .set("Authorization", `Bearer ${apiKey}`)
      .query({ customerId })
      .expect(200);

    expect(listRes.body.accounts).toHaveLength(1);
    expect(listRes.body.accounts[0].id).toBe(accountId);

    // 4. Retrieve single account detail
    const getRes = await request(app)
      .get(`/api/v1/accounts/${accountId}`)
      .set("Authorization", `Bearer ${apiKey}`)
      .expect(200);

    expect(getRes.body.account.name).toBe("USD Operational Wallet");

    // 5. Transition: active -> frozen (Allowed)
    const freezeRes = await request(app)
      .patch(`/api/v1/accounts/${accountId}`)
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ status: "frozen" })
      .expect(200);

    expect(freezeRes.body.account.status).toBe("frozen");

    // 6. Transition: frozen -> active (Allowed)
    const reactivateRes = await request(app)
      .patch(`/api/v1/accounts/${accountId}`)
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ status: "active" })
      .expect(200);

    expect(reactivateRes.body.account.status).toBe("active");

    // 7. Transition: active -> closed (Allowed)
    const closeRes = await request(app)
      .patch(`/api/v1/accounts/${accountId}`)
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ status: "closed" })
      .expect(200);

    expect(closeRes.body.account.status).toBe("closed");

    // 8. Transition: closed -> active (Prohibited, closed is terminal)
    const reopenRes = await request(app)
      .patch(`/api/v1/accounts/${accountId}`)
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ status: "active" })
      .expect(400);

    expect(reopenRes.body.error.code).toBe("INVALID_ACCOUNT_STATE");
  });
});
