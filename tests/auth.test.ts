import { describe, it, expect, afterAll, beforeEach, vi } from "vitest";
import request from "supertest";
import { app } from "../src/app";
import crypto from "crypto";

const { prismaMock, redisMock, mockUsers, mockOrganizations, mockMembers } = vi.hoisted(() => {
  const users: any[] = [];
  const organizations: any[] = [];
  const members: any[] = [];

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
        const filtered = members.filter(x => x.userId === args?.where?.userId);
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

  return { prismaMock: pMock, redisMock: rMock, mockUsers: users, mockOrganizations: organizations, mockMembers: members };
});

vi.mock("../src/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("../src/lib/redis", () => ({ redis: redisMock }));

import { prisma } from "../src/lib/prisma";
import { redis } from "../src/lib/redis";

describe("Authentication & Registration (Phase 2)", () => {
  // Clear identity database tables before each test to guarantee strict isolation
  beforeEach(async () => {
    mockUsers.length = 0;
    mockOrganizations.length = 0;
    mockMembers.length = 0;
    redisMock.clear();
  });

  afterAll(async () => {
    // Close database pools and redis connection properly
    await prisma.$disconnect();
    await redis.quit();
  });

  describe("POST /api/v1/auth/register", () => {
    it("should successfully register a developer and automatically create a default organization as owner", async () => {
      const payload = {
        email: "Alex@Ricarut.com", // Pass with mixed case to verify email normalization
        password: "SecurePassword123",
        firstName: "Alexander",
        lastName: "Great",
      };

      const res = await request(app)
        .post("/api/v1/auth/register")
        .send(payload)
        .expect(201);

      // 1. Verify response shape
      expect(res.body).toHaveProperty("token");
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe("alex@ricarut.com"); // Assert email was normalized
      expect(res.body.user.firstName).toBe("Alexander");
      expect(res.body.user.lastName).toBe("Great");
      expect(res.body.user.passwordHash).toBeUndefined(); // Verify password hash is never leaked

      // 2. Verify database records
      const user = await prisma.user.findUnique({
        where: { email: "alex@ricarut.com" },
        include: {
          memberships: {
            include: {
              organization: true,
            },
          },
        },
      });

      expect(user).not.toBeNull();
      expect(user!.passwordHash).not.toBe("SecurePassword123"); // Assert hashing was performed

      // 3. Verify automatic organization onboarding
      expect(user!.memberships.length).toBe(1);
      const membership = user!.memberships[0];
      expect(membership.role).toBe("owner");
      expect(membership.organization.name).toBe("Alexander's Organization");
      expect(membership.organization.slug).toBe("alexanders-organization");
    });

    it("should reject duplicates and return 409 Conflict", async () => {
      const payload = {
        email: "duplicate@example.com",
        password: "SecurePassword123",
        firstName: "Duplicate",
        lastName: "Test",
      };

      // Register first time
      await request(app)
        .post("/api/v1/auth/register")
        .send(payload)
        .expect(201);

      // Attempt duplicate registration
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send(payload)
        .expect(409);

      expect(res.body.error.code).toBe("CONFLICT_ERROR");
      expect(res.body.error.message).toContain("exists");
    });

    it("should reject weak passwords and invalid email formats with 400 Bad Request", async () => {
      const badPayloads = [
        { email: "bad-email", password: "SecurePassword123", firstName: "A", lastName: "B" }, // Bad email
        { email: "test@example.com", password: "short", firstName: "A", lastName: "B" },       // Password too short
        { email: "test@example.com", password: "NoNumbersPassword", firstName: "A", lastName: "B" }, // No numbers
        { email: "test@example.com", password: "lowercaseonly123", firstName: "A", lastName: "B" },  // No uppercase
      ];

      for (const payload of badPayloads) {
        const res = await request(app)
          .post("/api/v1/auth/register")
          .send(payload)
          .expect(400);

        expect(res.body.error.code).toBe("VALIDATION_ERROR");
        expect(res.body.error.fields).toBeDefined();
      }
    });
  });

  describe("POST /api/v1/auth/login", () => {
    it("should log in user with correct credentials and return a session JWT", async () => {
      // Setup user
      const registerPayload = {
        email: "login@example.com",
        password: "SecurePassword123",
        firstName: "Login",
        lastName: "User",
      };

      await request(app)
        .post("/api/v1/auth/register")
        .send(registerPayload)
        .expect(201);

      // Attempt login
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "Login@Example.COM", // Mixed case normalization verify
          password: "SecurePassword123",
        })
        .expect(200);

      expect(res.body).toHaveProperty("token");
      expect(res.body.user.email).toBe("login@example.com");
    });

    it("should reject login attempts with incorrect password or unregistered email with 401 Unauthorized", async () => {
      const registerPayload = {
        email: "login@example.com",
        password: "SecurePassword123",
        firstName: "Login",
        lastName: "User",
      };

      await request(app)
        .post("/api/v1/auth/register")
        .send(registerPayload)
        .expect(201);

      // 1. Wrong password
      await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "login@example.com",
          password: "WrongPassword123",
        })
        .expect(401);

      // 2. Unregistered email
      await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "unknown@example.com",
          password: "SecurePassword123",
        })
        .expect(401);
    });
  });

  describe("GET /api/v1/auth/me & POST /auth/logout", () => {
    it("should protect me profile endpoint and retrieve details correctly under valid authorization session", async () => {
      const registerPayload = {
        email: "me@example.com",
        password: "SecurePassword123",
        firstName: "Me",
        lastName: "User",
      };

      const registerRes = await request(app)
        .post("/api/v1/auth/register")
        .send(registerPayload)
        .expect(201);

      const token = registerRes.body.token;

      // 1. Rejects profile fetch without Bearer header
      await request(app)
        .get("/api/v1/auth/me")
        .expect(401);

      // 2. Succeeds with valid token
      const meRes = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(meRes.body.user.email).toBe("me@example.com");
      expect(meRes.body.user.memberships).toBeDefined();
      expect(meRes.body.user.memberships.length).toBe(1);

      // 3. Logout completes successfully
      await request(app)
        .post("/api/v1/auth/logout")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
    });
  });
});
