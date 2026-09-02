import { describe, it, expect, afterAll, beforeEach, vi } from "vitest";
import request from "supertest";
import crypto from "crypto";
import { app } from "../src/app";

const { prismaMock, redisMock, mockUsers, mockOrganizations, mockMembers, mockProjects, mockApiKeys } = vi.hoisted(() => {
  const users: any[] = [];
  const organizations: any[] = [];
  const members: any[] = [];
  const projects: any[] = [];
  const apiKeys: any[] = [];

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
        if (args?.select) {
          return filtered.map(x => {
            const projected: any = {};
            for (const key of Object.keys(args.select)) {
              if (args.select[key]) {
                projected[key] = x[key];
              }
            }
            return projected;
          });
        }
        return filtered;
      }),
      update: vi.fn(async ({ where, data }) => {
        const idx = apiKeys.findIndex((x) => x.id === where.id);
        if (idx === -1) throw new Error("ApiKey not found");
        apiKeys[idx] = { ...apiKeys[idx], ...data, updatedAt: new Date() };
        return apiKeys[idx];
      }),
      deleteMany: vi.fn(async () => { apiKeys.length = 0; return { count: 0 }; }),
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

  return { prismaMock: pMock, redisMock: rMock, mockUsers: users, mockOrganizations: organizations, mockMembers: members, mockProjects: projects, mockApiKeys: apiKeys };
});

vi.mock("../src/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("../src/lib/redis", () => ({ redis: redisMock }));

import { prisma } from "../src/lib/prisma";
import { redis } from "../src/lib/redis";

describe("API Key Authentication and Management (Phase 2)", () => {
  beforeEach(async () => {
    mockUsers.length = 0;
    mockOrganizations.length = 0;
    mockMembers.length = 0;
    mockProjects.length = 0;
    mockApiKeys.length = 0;
    redisMock.clear();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await redis.quit();
  });

  it("should enforce the complete secure API key lifecycle (generate, hash, authorize, revoke)", async () => {
    // 1. Setup User and retrieve Organization context
    const registerRes = await request(app)
      .post("/api/v1/auth/register")
      .send({
        email: "developer@example.com",
        password: "SecurePassword123",
        firstName: "Dev",
        lastName: "User",
      })
      .expect(201);

    const token = registerRes.body.token;

    const meRes = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const orgId = meRes.body.user.memberships[0].organizationId;

    // 2. Create Project
    const projectRes = await request(app)
      .post("/api/v1/projects")
      .set("Authorization", `Bearer ${token}`)
      .send({
        organizationId: orgId,
        name: "Acme Payments",
        environment: "test",
      })
      .expect(201);

    const projectId = projectRes.body.project.id;

    // 3. Generate API Key
    const keyRes = await request(app)
      .post(`/api/v1/projects/${projectId}/api-keys`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Integration Test Key",
      })
      .expect(201);

    // Assert plaintext key details are returned exactly ONCE
    const plaintextKey = keyRes.body.key;
    const keyId = keyRes.body.id;

    expect(plaintextKey).toBeDefined();
    expect(plaintextKey).toMatch(/^rc_test_[a-zA-Z0-9]{12}\.[a-zA-Z0-9]{32}$/);
    expect(keyRes.body.environment).toBe("test");

    // 4. Assert Database storage safety (No plaintext stored!)
    const parts = plaintextKey.split(".");
    const expectedPrefix = parts[0];

    const dbKey = await prisma.apiKey.findUnique({
      where: { keyPrefix: expectedPrefix },
    });

    expect(dbKey).not.toBeNull();
    expect(dbKey!.id).toBe(keyId);
    expect(dbKey!.keyPrefix).toBe(expectedPrefix);
    
    // Assert hash matches SHA256 of entire plaintext key
    const expectedHash = crypto.createHash("sha256").update(plaintextKey).digest("hex");
    expect(dbKey!.keyHash).toBe(expectedHash);

    // Verify plaintext string is absolutely absent from the database record
    const allDbRecords = await prisma.apiKey.findMany();
    const rawRecordString = JSON.stringify(allDbRecords);
    expect(rawRecordString).not.toContain(plaintextKey);
    expect(rawRecordString).not.toContain(parts[1]); // Assert second part entropy is never stored plain

    // 5. Authenticate Request using API Key (Success Case)
    const testKeyRes = await request(app)
      .get("/api/v1/auth/test-key")
      .set("Authorization", `Bearer ${plaintextKey}`)
      .expect(200);

    expect(testKeyRes.body.status).toBe("success");
    expect(testKeyRes.body.context.projectId).toBe(projectId);
    expect(testKeyRes.body.context.organizationId).toBe(orgId);
    expect(testKeyRes.body.context.environment).toBe("test");

    // Assert invalid Bearer format is rejected
    await request(app)
      .get("/api/v1/auth/test-key")
      .set("Authorization", "Bearer invalid-structure")
      .expect(401);

    // Assert fake/unregistered key is rejected
    const fakeKey = `fb_test_${crypto.randomBytes(6).toString("hex")}.${crypto.randomBytes(16).toString("hex")}`;
    await request(app)
      .get("/api/v1/auth/test-key")
      .set("Authorization", `Bearer ${fakeKey}`)
      .expect(401);

    // 6. List keys (Secrets should be redacted!)
    const listRes = await request(app)
      .get(`/api/v1/projects/${projectId}/api-keys`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(listRes.body.apiKeys.length).toBe(1);
    const listedKey = listRes.body.apiKeys[0];
    expect(listedKey.id).toBe(keyId);
    expect(listedKey.keyPrefix).toBe(expectedPrefix);
    expect(listedKey.keyHash).toBeUndefined(); // Confirm secret hash is never listed
    expect(listedKey.key).toBeUndefined();     // Confirm plaintext is never displayed

    // 7. Revoke API Key
    await request(app)
      .delete(`/api/v1/projects/${projectId}/api-keys/${keyId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    // 8. Assert Revoked Key is Rejected
    const revokedRequestRes = await request(app)
      .get("/api/v1/auth/test-key")
      .set("Authorization", `Bearer ${plaintextKey}`)
      .expect(401);

    expect(revokedRequestRes.body.error.message).toContain("revoked");
  });
});
