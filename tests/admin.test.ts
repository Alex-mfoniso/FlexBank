import { describe, it, afterAll, beforeEach, vi, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app";
import jwt from "jsonwebtoken";
import { env } from "../src/config/env";
import crypto from "crypto";

const { prismaMock, redisMock, mockDb } = vi.hoisted(() => {
  const db = {
    users: [] as any[],
    projects: [] as any[],
    customers: [] as any[],
    accounts: [] as any[],
    transfers: [] as any[],
    journals: [] as any[],
    logs: [] as any[],
    sandboxEvents: [] as any[],
    auditLogs: [] as any[],
    apiKeys: [] as any[],
  };

  const pMock = {
    $disconnect: vi.fn(async () => {}),
    $queryRaw: vi.fn(async () => [{ liveness: 1 }]),
    user: {
      count: vi.fn(async () => db.users.length),
      findMany: vi.fn(async () => db.users),
      findUnique: vi.fn(async ({ where }) => {
        const u = db.users.find(x => x.id === where.id || x.email === where.email);
        if (!u) return null;
        return {
          ...u,
          memberships: [],
        };
      }),
      update: vi.fn(async ({ where, data }) => {
        const u = db.users.find(x => x.id === where.id);
        if (!u) throw new Error("User not found");
        Object.assign(u, data);
        return u;
      }),
    },
    project: {
      count: vi.fn(async () => db.projects.length),
      findMany: vi.fn(async () => db.projects),
      findUnique: vi.fn(async ({ where }) => {
        const p = db.projects.find(x => x.id === where.id);
        if (!p) return null;
        return {
          ...p,
          organization: { members: [] },
          _count: { customers: 0, accounts: 0, transfers: 0, journals: 0 },
        };
      }),
      update: vi.fn(async ({ where, data }) => {
        const p = db.projects.find(x => x.id === where.id);
        if (!p) throw new Error("Project not found");
        Object.assign(p, data);
        return p;
      }),
    },
    customer: {
      count: vi.fn(async () => db.customers.length),
      findMany: vi.fn(async () => db.customers),
      findUnique: vi.fn(async ({ where }) => db.customers.find(x => x.id === where.id) || null),
    },
    account: {
      count: vi.fn(async () => db.accounts.length),
      findMany: vi.fn(async () => db.accounts),
      findUnique: vi.fn(async ({ where }) => db.accounts.find(x => x.id === where.id) || null),
    },
    transfer: {
      count: vi.fn(async () => db.transfers.length),
      findMany: vi.fn(async () => db.transfers),
      findUnique: vi.fn(async ({ where }) => db.transfers.find(x => x.id === where.id) || null),
      aggregate: vi.fn(async () => ({ _sum: { amount: 500000 } })),
    },
    journal: {
      count: vi.fn(async () => db.journals.length),
      findMany: vi.fn(async () => db.journals),
      findUnique: vi.fn(async ({ where }) => db.journals.find(x => x.id === where.id) || null),
    },
    apiRequestLog: {
      count: vi.fn(async () => db.logs.length),
      findMany: vi.fn(async () => db.logs),
      create: vi.fn(async ({ data }) => {
        const log = { id: crypto.randomUUID(), createdAt: new Date(), ...data };
        db.logs.push(log);
        return log;
      }),
    },
    sandboxEvent: {
      findMany: vi.fn(async () => db.sandboxEvents),
    },
    providerTransaction: {
      count: vi.fn(async () => 10),
    },
    auditLog: {
      create: vi.fn(async ({ data }) => {
        const al = { id: crypto.randomUUID(), createdAt: new Date(), ...data };
        db.auditLogs.push(al);
        return al;
      }),
    },
    apiKey: {
      findUnique: vi.fn(async ({ where }) => db.apiKeys.find(x => x.id === where.id || x.keyPrefix === where.keyPrefix) || null),
      update: vi.fn(async ({ where, data }) => {
        const k = db.apiKeys.find(x => x.id === where.id);
        if (!k) throw new Error("Key not found");
        Object.assign(k, data);
        return k;
      }),
    },
  };

  return { prismaMock: pMock, redisMock: {}, mockDb: db };
});

vi.mock("../src/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("../src/lib/redis", () => ({ redis: redisMock }));

import { prisma } from "../src/lib/prisma";

describe("Internal Admin Panel Operations & Security Tests (Phase 7.8B)", () => {
  let adminToken: string;
  let devToken: string;
  let adminUser: any;
  let devUser: any;

  beforeEach(async () => {
    mockDb.users.length = 0;
    mockDb.projects.length = 0;
    mockDb.customers.length = 0;
    mockDb.accounts.length = 0;
    mockDb.transfers.length = 0;
    mockDb.journals.length = 0;
    mockDb.logs.length = 0;
    mockDb.auditLogs.length = 0;
    mockDb.apiKeys.length = 0;

    // Initialize mock admin
    adminUser = {
      id: "usr_admin_1",
      email: "admin@ricarut.com",
      firstName: "Admin",
      lastName: "Ricarut",
      role: "admin",
      status: "active",
      createdAt: new Date(),
    };
    mockDb.users.push(adminUser);

    // Initialize mock developer
    devUser = {
      id: "usr_dev_1",
      email: "developer@startup.com",
      firstName: "Dev",
      lastName: "Kofi",
      role: "user",
      status: "active",
      createdAt: new Date(),
    };
    mockDb.users.push(devUser);

    // Generate JWT tokens
    adminToken = jwt.sign({ userId: adminUser.id, email: adminUser.email }, env.JWT_SECRET);
    devToken = jwt.sign({ userId: devUser.id, email: devUser.email }, env.JWT_SECRET);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("Admin Authorization & Gatekeeping Protection", () => {
    it("should allow an authenticated administrator to access the admin endpoints", async () => {
      const res = await request(app)
        .get("/api/v1/admin/stats")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.status).toBe("success");
      expect(res.body.data.totalUsers).toBe(2);
    });

    it("should reject standard developers with a 403 Forbidden status code", async () => {
      const res = await request(app)
        .get("/api/v1/admin/stats")
        .set("Authorization", `Bearer ${devToken}`)
        .expect(403);

      expect(res.body.error.message).toContain("privileges required");
    });

    it("should reject requests authenticated via developer API key with 401/403 status codes", async () => {
      // Simulate developer API key request on admin API
      const res = await request(app)
        .get("/api/v1/admin/stats")
        .set("Authorization", "Bearer fb_test_1234567890ab.1234567890abcdef1234567890abcdef")
        .expect(401); // API keys go through authenticateUser session checks which checks JWT first, throwing 401

      expect(res.body.error.message).toBeDefined();
    });

    it("should reject expired or invalid tokens", async () => {
      await request(app)
        .get("/api/v1/admin/stats")
        .set("Authorization", "Bearer invalid-jwt-signature")
        .expect(401);
    });
  });

  describe("Admin Dashboard & Metrics Aggregations", () => {
    it("should aggregate database-backed totals dynamically with no fake metrics", async () => {
      mockDb.projects.push({ id: "proj_1", name: "Project 1", status: "active" });
      mockDb.customers.push({ id: "cust_1", name: "Fatima Diallo", status: "active" });
      mockDb.accounts.push({ id: "acct_1", balance: 150000, currency: "NGN" });

      const res = await request(app)
        .get("/api/v1/admin/stats")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.totalUsers).toBe(2);
      expect(res.body.data.totalProjects).toBe(1);
      expect(res.body.data.totalCustomers).toBe(1);
      expect(res.body.data.totalAccounts).toBe(1);
      expect(res.body.data.sandboxTransactionVolume).toBe(500000); // Mocked sum
    });
  });

  describe("Administrative Listing, Searching, and Pagination", () => {
    it("should list users with pagination schema and search filtering", async () => {
      const res = await request(app)
        .get("/api/v1/admin/users?page=1&limit=2&search=admin")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.status).toBe("success");
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.page).toBe(1);
    });

    it("should protect developer credentials, never returning password hashes in search results", async () => {
      const res = await request(app)
        .get("/api/v1/admin/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      const returnedUser = res.body.data[0];
      expect(returnedUser.passwordHash).toBeUndefined();
      expect(returnedUser.password).toBeUndefined();
    });

    it("should detail specific users and aggregates", async () => {
      const res = await request(app)
        .get(`/api/v1/admin/users/${devUser.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.id).toBe(devUser.id);
      expect(res.body.data.aggregates).toBeDefined();
      expect(res.body.data.aggregates.customerCount).toBeTypeOf("number");
    });
  });

  describe("Safe Administrative Actions & Auditing Integrity", () => {
    it("should toggle user suspension status and record the change in AuditLog table", async () => {
      const res = await request(app)
        .post(`/api/v1/admin/users/${devUser.id}/toggle-status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.status).toBe("success");
      expect(res.body.data.status).toBe("suspended");

      // Verify AuditLog creation
      expect(mockDb.auditLogs.length).toBe(1);
      expect(mockDb.auditLogs[0].action).toBe("admin.user.suspended");
      expect(mockDb.auditLogs[0].userId).toBe(adminUser.id);
    });

    it("should reject administrative self-suspension to maintain session security", async () => {
      await request(app)
        .post(`/api/v1/admin/users/${adminUser.id}/toggle-status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(400); // Self-suspension throws ValidationError
    });

    it("should revoke API Keys dynamically and log the security audit footprint", async () => {
      const mockKey = {
        id: "key_1",
        projectId: "proj_1",
        name: "Mock Key",
        keyPrefix: "fb_test_12345",
        revokedAt: null,
      };
      mockDb.apiKeys.push(mockKey);

      const res = await request(app)
        .post(`/api/v1/admin/api-keys/${mockKey.id}/revoke`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.status).toBe("success");
      expect(res.body.data.revokedAt).toBeDefined();

      // Verify Audit Log
      const revokeLog = mockDb.auditLogs.find(x => x.action === "admin.api_key.revoked");
      expect(revokeLog).toBeDefined();
      expect(revokeLog?.userId).toBe(adminUser.id);
    });
  });

  describe("System Diagnostics Monitoring", () => {
    it("should display standard platform-level diagnostic states with zero secret exposures", async () => {
      const res = await request(app)
        .get("/api/v1/admin/system")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.apiStatus).toBe("ONLINE");
      expect(res.body.data.databaseStatus).toBe("ONLINE");
      expect(res.body.data.JWT_SECRET).toBeUndefined(); // Secrets hidden
    });
  });
});
