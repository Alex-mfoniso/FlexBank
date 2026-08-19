import { describe, it, afterAll, beforeEach, vi } from "vitest";
import request from "supertest";
import { app } from "../src/app";
import { OrgRole } from "@prisma/client";
import crypto from "crypto";

const { prismaMock, redisMock, mockUsers, mockOrganizations, mockMembers, mockProjects } = vi.hoisted(() => {
  const users: any[] = [];
  const organizations: any[] = [];
  const members: any[] = [];
  const projects: any[] = [];

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
      update: vi.fn(async ({ where, data }) => {
        const idx = organizations.findIndex((x) => x.id === where.id);
        if (idx === -1) throw new Error("Organization not found");
        organizations[idx] = { ...organizations[idx], ...data, updatedAt: new Date() };
        return organizations[idx];
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
      deleteMany: vi.fn(async (args) => {
        if (args?.where?.userId) {
          const kept = members.filter(x => x.userId !== args.where.userId);
          members.length = 0;
          members.push(...kept);
        } else {
          members.length = 0;
        }
        return { count: 0 };
      }),
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
      update: vi.fn(async ({ where, data }) => {
        const idx = projects.findIndex((x) => x.id === where.id);
        if (idx === -1) throw new Error("Project not found");
        projects[idx] = { ...projects[idx], ...data, updatedAt: new Date() };
        return projects[idx];
      }),
      delete: vi.fn(async ({ where }) => {
        const kept = projects.filter((x) => x.id !== where.id);
        projects.length = 0;
        projects.push(...kept);
        return { id: where.id };
      }),
      deleteMany: vi.fn(async () => { projects.length = 0; return { count: 0 }; }),
    },
    apiKey: {
      create: vi.fn(async ({ data }) => {
        return { id: crypto.randomUUID(), ...data };
      }),
      deleteMany: vi.fn(async () => ({ count: 0 })),
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

  return { prismaMock: pMock, redisMock: rMock, mockUsers: users, mockOrganizations: organizations, mockMembers: members, mockProjects: projects };
});

vi.mock("../src/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("../src/lib/redis", () => ({ redis: redisMock }));

import { prisma } from "../src/lib/prisma";
import { redis } from "../src/lib/redis";

describe("Authorization & IDOR Prevention (Phase 2)", () => {
  beforeEach(async () => {
    mockUsers.length = 0;
    mockOrganizations.length = 0;
    mockMembers.length = 0;
    mockProjects.length = 0;
    redisMock.clear();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await redis.quit();
  });

  describe("IDOR Protection", () => {
    it("should prevent User A from accessing or mutating User B's organizations and projects", async () => {
      // 1. Create and authenticate User A (owns Org A & Project A)
      const registerResA = await request(app)
        .post("/api/v1/auth/register")
        .send({
          email: "usera@example.com",
          password: "SecurePassword123",
          firstName: "User",
          lastName: "A",
        })
        .expect(201);

      const tokenA = registerResA.body.token;
      
      const meResA = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${tokenA}`)
        .expect(200);

      const orgIdA = meResA.body.user.memberships[0].organizationId;

      // Create Project A inside Org A
      const projectResA = await request(app)
        .post("/api/v1/projects")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({
          organizationId: orgIdA,
          name: "Project A",
        })
        .expect(201);

      const projectIdA = projectResA.body.project.id;

      // 2. Create and authenticate User B (owns Org B & Project B)
      const registerResB = await request(app)
        .post("/api/v1/auth/register")
        .send({
          email: "userb@example.com",
          password: "SecurePassword123",
          firstName: "User",
          lastName: "B",
        })
        .expect(201);

      const tokenB = registerResB.body.token;
      
      await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${tokenB}`)
        .expect(200);

      // 3. ATTEMPT IDOR BREAK: User B attempts accessing Org A (Expect 403 Forbidden)
      await request(app)
        .get(`/api/v1/organizations/${orgIdA}`)
        .set("Authorization", `Bearer ${tokenB}`)
        .expect(403);

      // 4. ATTEMPT IDOR BREAK: User B attempts patching Org A (Expect 403 Forbidden)
      await request(app)
        .patch(`/api/v1/organizations/${orgIdA}`)
        .set("Authorization", `Bearer ${tokenB}`)
        .send({ name: "Hacked Name" })
        .expect(403);

      // 5. ATTEMPT IDOR BREAK: User B attempts creating project inside Org A (Expect 403 Forbidden)
      await request(app)
        .post("/api/v1/projects")
        .set("Authorization", `Bearer ${tokenB}`)
        .send({
          organizationId: orgIdA,
          name: "Malicious Project",
        })
        .expect(403);

      // 6. ATTEMPT IDOR BREAK: User B attempts retrieving details of Project A (Expect 403 Forbidden)
      await request(app)
        .get(`/api/v1/projects/${projectIdA}`)
        .set("Authorization", `Bearer ${tokenB}`)
        .expect(403);

      // 7. ATTEMPT IDOR BREAK: User B attempts editing Project A (Expect 403 Forbidden)
      await request(app)
        .patch(`/api/v1/projects/${projectIdA}`)
        .set("Authorization", `Bearer ${tokenB}`)
        .send({ name: "Hacked Project" })
        .expect(403);

      // 8. ATTEMPT IDOR BREAK: User B attempts deleting Project A (Expect 403 Forbidden)
      await request(app)
        .delete(`/api/v1/projects/${projectIdA}`)
        .set("Authorization", `Bearer ${tokenB}`)
        .expect(403);
    });
  });

  describe("Role-Based Access Control (RBAC)", () => {
    it("should restrict viewers from mutating projects and keys inside an organization", async () => {
      // 1. Establish Org and Owner User (User A)
      const registerResOwner = await request(app)
        .post("/api/v1/auth/register")
        .send({
          email: "owner@example.com",
          password: "SecurePassword123",
          firstName: "Owner",
          lastName: "User",
        })
        .expect(201);

      const tokenOwner = registerResOwner.body.token;
      
      const meResOwner = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${tokenOwner}`)
        .expect(200);

      const orgId = meResOwner.body.user.memberships[0].organizationId;

      // Create Project inside Org
      const projectRes = await request(app)
        .post("/api/v1/projects")
        .set("Authorization", `Bearer ${tokenOwner}`)
        .send({
          organizationId: orgId,
          name: "Production Ledger",
        })
        .expect(201);

      const projectId = projectRes.body.project.id;

      // 2. Create Viewer User (User B) and register them into Org as "viewer"
      const registerResViewer = await request(app)
        .post("/api/v1/auth/register")
        .send({
          email: "viewer@example.com",
          password: "SecurePassword123",
          firstName: "Viewer",
          lastName: "User",
        })
        .expect(201);

      const tokenViewer = registerResViewer.body.token;
      const viewerUser = registerResViewer.body.user;

      // Demote original User B auto-org membership and bind as "viewer" in User A's organization
      await prisma.$transaction([
        prisma.organizationMember.deleteMany({ where: { userId: viewerUser.id } }),
        prisma.organizationMember.create({
          data: {
            organizationId: orgId,
            userId: viewerUser.id,
            role: OrgRole.viewer,
          },
        }),
      ]);

      // 3. ASSERT: Viewer CAN read organization details
      await request(app)
        .get(`/api/v1/organizations/${orgId}`)
        .set("Authorization", `Bearer ${tokenViewer}`)
        .expect(200);

      // 4. ASSERT: Viewer CAN read project list and project details
      await request(app)
        .get("/api/v1/projects")
        .set("Authorization", `Bearer ${tokenViewer}`)
        .query({ organizationId: orgId })
        .expect(200);

      await request(app)
        .get(`/api/v1/projects/${projectId}`)
        .set("Authorization", `Bearer ${tokenViewer}`)
        .expect(200);

      // 5. ASSERT MUTATION REJECTIONS: Viewer CANNOT create project
      await request(app)
        .post("/api/v1/projects")
        .set("Authorization", `Bearer ${tokenViewer}`)
        .send({
          organizationId: orgId,
          name: "Unauthorized Creation",
        })
        .expect(403);

      // 6. ASSERT MUTATION REJECTIONS: Viewer CANNOT patch project
      await request(app)
        .patch(`/api/v1/projects/${projectId}`)
        .set("Authorization", `Bearer ${tokenViewer}`)
        .send({ name: "Tampered Name" })
        .expect(403);

      // 7. ASSERT MUTATION REJECTIONS: Viewer CANNOT delete project
      await request(app)
        .delete(`/api/v1/projects/${projectId}`)
        .set("Authorization", `Bearer ${tokenViewer}`)
        .expect(403);

      // 8. ASSERT MUTATION REJECTIONS: Viewer CANNOT create API keys
      await request(app)
        .post(`/api/v1/projects/${projectId}/api-keys`)
        .set("Authorization", `Bearer ${tokenViewer}`)
        .send({ name: "Intruder Key" })
        .expect(403);
    });
  });
});
