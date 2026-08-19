import { vi } from "vitest";
import crypto from "crypto";

export interface MockStore {
  users: any[];
  organizations: any[];
  members: any[];
  projects: any[];
  apiKeys: any[];
  auditLogs: any[];
  customers: any[];
  accounts: any[];
  ledgerAccounts: any[];
  journals: any[];
  ledgerEntries: any[];
  idempotencyRecords: any[];
  transfers: any[];
  providerTransactions: any[];
  webhookEvents: any[];
  beneficiaries: any[];
}

export const store: MockStore = {
  users: [],
  organizations: [],
  members: [],
  projects: [],
  apiKeys: [],
  auditLogs: [],
  customers: [],
  accounts: [],
  ledgerAccounts: [],
  journals: [],
  ledgerEntries: [],
  idempotencyRecords: [],
  transfers: [],
  providerTransactions: [],
  webhookEvents: [],
  beneficiaries: [],
};

/**
 * Resets the in-memory database store back to clean, empty states.
 */
export const clearStore = () => {
  store.users = [];
  store.organizations = [];
  store.members = [];
  store.projects = [];
  store.apiKeys = [];
  store.auditLogs = [];
  store.customers = [];
  store.accounts = [];
  store.ledgerAccounts = [];
  store.journals = [];
  store.ledgerEntries = [];
  store.idempotencyRecords = [];
  store.transfers = [];
  store.providerTransactions = [];
  store.webhookEvents = [];
  store.beneficiaries = [];
};

/**
 * In-memory Mock implementation of Prisma Client.
 * Mirrors relational queries, transactions, and mutations.
 */
export const prismaMock = {
  $transaction: vi.fn(async (callback) => {
    return await callback(prismaMock);
  }),
  user: {
    create: vi.fn(async ({ data }) => {
      const u = {
        id: `usr_${crypto.randomUUID()}`,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      };
      store.users.push(u);
      return u;
    }),
    findUnique: vi.fn(async (args) => {
      const { id, email } = args.where;
      const u = store.users.find((x) => x.id === id || x.email === email);
      if (!u) return null;
      if (args.include?.memberships) {
        return {
          ...u,
          memberships: store.members
            .filter((m) => m.userId === u.id)
            .map((m) => ({
              ...m,
              organization: store.organizations.find((o) => o.id === m.organizationId),
            })),
        };
      }
      return u;
    }),
    findMany: vi.fn(async () => store.users),
    deleteMany: vi.fn(async () => {
      store.users = [];
      return { count: 0 };
    }),
  },
  organization: {
    create: vi.fn(async ({ data }) => {
      const o = {
        id: crypto.randomUUID(),
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      };
      store.organizations.push(o);
      return o;
    }),
    findUnique: vi.fn(async ({ where }) => {
      return store.organizations.find((x) => x.id === where.id || x.slug === where.slug) || null;
    }),
    findMany: vi.fn(async () => store.organizations),
    update: vi.fn(async ({ where, data }) => {
      const idx = store.organizations.findIndex((x) => x.id === where.id);
      if (idx === -1) throw new Error("Organization not found");
      store.organizations[idx] = { ...store.organizations[idx], ...data, updatedAt: new Date() };
      return store.organizations[idx];
    }),
    deleteMany: vi.fn(async () => {
      store.organizations = [];
      return { count: 0 };
    }),
  },
  organizationMember: {
    create: vi.fn(async ({ data }) => {
      const m = {
        id: `mb_${crypto.randomUUID()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      };
      store.members.push(m);
      return m;
    }),
    findUnique: vi.fn(async (args) => {
      const { organizationId_userId } = args.where;
      const m = store.members.find(
        (x) =>
          x.organizationId === organizationId_userId.organizationId &&
          x.userId === organizationId_userId.userId,
      );
      if (!m) return null;
      if (args.include?.organization) {
        return {
          ...m,
          organization: store.organizations.find((o) => o.id === m.organizationId),
        };
      }
      return m;
    }),
    findMany: vi.fn(async (args) => {
      let filtered = store.members;
      if (args?.where?.userId) {
        filtered = filtered.filter((x) => x.userId === args.where.userId);
      }
      if (args?.include?.organization) {
        return filtered.map((m) => ({
          ...m,
          organization: store.organizations.find((o) => o.id === m.organizationId),
        }));
      }
      return filtered;
    }),
    deleteMany: vi.fn(async (args) => {
      if (args?.where?.userId) {
        store.members = store.members.filter((x) => x.userId !== args.where.userId);
      } else {
        store.members = [];
      }
      return { count: 0 };
    }),
  },
  project: {
    create: vi.fn(async ({ data }) => {
      const p = {
        id: `prj_${crypto.randomUUID()}`,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      };
      store.projects.push(p);
      return p;
    }),
    findUnique: vi.fn(async ({ where }) => {
      return store.projects.find((x) => x.id === where.id) || null;
    }),
    findMany: vi.fn(async (args) => {
      let filtered = store.projects;
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
      const idx = store.projects.findIndex((x) => x.id === where.id);
      if (idx === -1) throw new Error("Project not found");
      store.projects[idx] = { ...store.projects[idx], ...data, updatedAt: new Date() };
      return store.projects[idx];
    }),
    delete: vi.fn(async ({ where }) => {
      store.projects = store.projects.filter((x) => x.id !== where.id);
      return { id: where.id };
    }),
    deleteMany: vi.fn(async () => {
      store.projects = [];
      return { count: 0 };
    }),
  },
  apiKey: {
    create: vi.fn(async ({ data }) => {
      const k = {
        id: `key_${crypto.randomUUID()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastUsedAt: null,
        revokedAt: null,
        ...data,
      };
      store.apiKeys.push(k);
      return k;
    }),
    findUnique: vi.fn(async (args) => {
      const { id, keyPrefix } = args.where;
      const k = store.apiKeys.find((x) => x.id === id || x.keyPrefix === keyPrefix);
      if (!k) return null;
      if (args.include?.project) {
        return {
          ...k,
          project: store.projects.find((p) => p.id === k.projectId),
        };
      }
      return k;
    }),
    findMany: vi.fn(async (args) => {
      let filtered = store.apiKeys;
      if (args?.where?.projectId) {
        filtered = filtered.filter((x) => x.projectId === args.where.projectId);
      }
      return filtered;
    }),
    update: vi.fn(async ({ where, data }) => {
      const idx = store.apiKeys.findIndex((x) => x.id === where.id);
      if (idx === -1) throw new Error("ApiKey not found");
      store.apiKeys[idx] = { ...store.apiKeys[idx], ...data, updatedAt: new Date() };
      return store.apiKeys[idx];
    }),
    deleteMany: vi.fn(async () => {
      store.apiKeys = [];
      return { count: 0 };
    }),
  },
  auditLog: {
    create: vi.fn(async ({ data }) => {
      const log = {
        id: `log_${crypto.randomUUID()}`,
        createdAt: new Date(),
        ...data,
      };
      store.auditLogs.push(log);
      return log;
    }),
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
      store.customers.push(c);
      return c;
    }),
    findFirst: vi.fn(async (args) => {
      const { id, projectId } = args.where;
      return store.customers.find((x) => x.id === id && x.projectId === projectId) || null;
    }),
    findUnique: vi.fn(async (args) => {
      const { externalId_projectId } = args.where;
      if (externalId_projectId) {
        return (
          store.customers.find(
            (x) =>
              x.externalId === externalId_projectId.externalId &&
              x.projectId === externalId_projectId.projectId,
          ) || null
        );
      }
      return null;
    }),
    findMany: vi.fn(async (args) => {
      let filtered = store.customers;
      if (args?.where?.projectId) {
        filtered = filtered.filter((x) => x.projectId === args.where.projectId);
      }
      return filtered;
    }),
    update: vi.fn(async ({ where, data }) => {
      const idx = store.customers.findIndex((x) => x.id === where.id);
      if (idx === -1) throw new Error("Customer not found");
      store.customers[idx] = { ...store.customers[idx], ...data, updatedAt: new Date() };
      return store.customers[idx];
    }),
    deleteMany: vi.fn(async () => {
      store.customers = [];
      return { count: 0 };
    }),
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
      store.accounts.push(a);
      return a;
    }),
    findFirst: vi.fn(async (args) => {
      const { id, projectId } = args.where;
      return store.accounts.find((x) => x.id === id && x.projectId === projectId) || null;
    }),
    findUnique: vi.fn(async (args) => {
      const { id } = args.where;
      return store.accounts.find((x) => x.id === id) || null;
    }),
    findUniqueOrThrow: vi.fn(async (args) => {
      const { id } = args.where;
      const a = store.accounts.find((x) => x.id === id);
      if (!a) throw new Error("Account not found");
      return a;
    }),
    findMany: vi.fn(async (args) => {
      let filtered = store.accounts;
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
      const idx = store.accounts.findIndex((x) => x.id === where.id);
      if (idx === -1) throw new Error("Account not found");
      store.accounts[idx] = { ...store.accounts[idx], ...data, updatedAt: new Date() };
      return store.accounts[idx];
    }),
    deleteMany: vi.fn(async () => {
      store.accounts = [];
      return { count: 0 };
    }),
  },
  $queryRawUnsafe: vi.fn(async () => []),
  $executeRaw: vi.fn(async () => 1),
  $queryRaw: vi.fn(async () => []),
  ledgerAccount: {
    create: vi.fn(async ({ data }) => {
      const la = {
        id: data.id,
        financialAccountId: data.financialAccountId || null,
        projectId: data.projectId,
        currency: data.currency,
        type: data.type,
        status: data.status || "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.ledgerAccounts.push(la);
      return la;
    }),
    findFirst: vi.fn(async (args) => {
      const { id, financialAccountId, projectId } = args?.where || {};
      const la = store.ledgerAccounts.find(
        (x) =>
          (id === undefined || x.id === id) &&
          (financialAccountId === undefined || x.financialAccountId === financialAccountId) &&
          (projectId === undefined || x.projectId === projectId),
      );
      if (!la) return null;
      if (args?.include?.financialAccount) {
        return {
          ...la,
          financialAccount: store.accounts.find((a) => a.id === la.financialAccountId) || null,
        };
      }
      return la;
    }),
    findMany: vi.fn(async (args) => {
      let filtered = store.ledgerAccounts;
      if (args?.where?.id?.in) {
        filtered = filtered.filter((x) => args.where.id.in.includes(x.id));
      }
      if (args?.include?.financialAccount) {
        return filtered.map((la) => ({
          ...la,
          financialAccount: store.accounts.find((a) => a.id === la.financialAccountId) || null,
        }));
      }
      return filtered;
    }),
  },
  journal: {
    create: vi.fn(async ({ data }) => {
      const j = {
        id: data.id,
        projectId: data.projectId,
        reference: data.reference,
        type: data.type,
        status: data.status || "draft",
        currency: data.currency,
        description: data.description || null,
        metadata: data.metadata || null,
        createdAt: new Date(),
        updatedAt: new Date(),
        reversedJournalId: null,
        reversalJournalId: null,
      };
      store.journals.push(j);
      return j;
    }),
    findFirst: vi.fn(async (args) => {
      const { id, projectId } = args.where;
      const j = store.journals.find((x) => x.id === id && x.projectId === projectId);
      if (!j) return null;
      if (args.include?.entries) {
        return {
          ...j,
          entries: store.ledgerEntries.filter((e) => e.journalId === j.id),
        };
      }
      return j;
    }),
    findUnique: vi.fn(async (args) => {
      const { projectId_reference } = args.where;
      if (projectId_reference) {
        const j = store.journals.find(
          (x) => x.projectId === projectId_reference.projectId && x.reference === projectId_reference.reference,
        );
        if (!j) return null;
        if (args.include?.entries) {
          return {
            ...j,
            entries: store.ledgerEntries.filter((e) => e.journalId === j.id),
          };
        }
        return j;
      }
      return null;
    }),
    update: vi.fn(async ({ where, data }) => {
      const idx = store.journals.findIndex((x) => x.id === where.id);
      if (idx === -1) throw new Error("Journal not found");
      store.journals[idx] = { ...store.journals[idx], ...data, updatedAt: new Date() };
      return store.journals[idx];
    }),
  },
  ledgerEntry: {
    create: vi.fn(async ({ data }) => {
      const e = {
        id: data.id,
        journalId: data.journalId,
        ledgerAccountId: data.ledgerAccountId,
        direction: data.direction,
        amount: data.amount,
        currency: data.currency,
        createdAt: new Date(),
      };
      store.ledgerEntries.push(e);
      return e;
    }),
    findMany: vi.fn(async (args) => {
      let filtered = store.ledgerEntries;
      if (args?.where?.ledgerAccountId) {
        filtered = filtered.filter((x) => x.ledgerAccountId === args.where.ledgerAccountId);
      }
      return filtered;
    }),
    aggregate: vi.fn(async (args) => {
      const { ledgerAccountId, direction } = args.where;
      const filtered = store.ledgerEntries.filter(
        (x) => x.ledgerAccountId === ledgerAccountId && x.direction === direction,
      );
      const sum = filtered.reduce((acc, x) => acc + x.amount, 0);
      return {
        _sum: { amount: sum },
      };
    }),
  },
  idempotencyRecord: {
    create: vi.fn(async ({ data }) => {
      const rec = {
        id: `idemp_${crypto.randomUUID()}`,
        status: "completed",
        createdAt: new Date(),
        ...data,
      };
      store.idempotencyRecords.push(rec);
      return rec;
    }),
    findUnique: vi.fn(async (args) => {
      const { projectId_key } = args.where;
      return (
        store.idempotencyRecords.find(
          (x) => x.projectId === projectId_key.projectId && x.key === projectId_key.key,
        ) || null
      );
    }),
    upsert: vi.fn(async ({ where, create, update }) => {
      const { projectId_key } = where;
      const idx = store.idempotencyRecords.findIndex(
        (x) => x.projectId === projectId_key.projectId && x.key === projectId_key.key,
      );
      if (idx !== -1) {
        store.idempotencyRecords[idx] = { ...store.idempotencyRecords[idx], ...update };
        return store.idempotencyRecords[idx];
      } else {
        const rec = {
          id: `idemp_${crypto.randomUUID()}`,
          projectId: projectId_key.projectId,
          key: projectId_key.key,
          status: "pending",
          createdAt: new Date(),
          ...create,
        };
        store.idempotencyRecords.push(rec);
        return rec;
      }
    }),
    update: vi.fn(async ({ where, data }) => {
      const { projectId_key } = where;
      const idx = store.idempotencyRecords.findIndex(
        (x) => x.projectId === projectId_key.projectId && x.key === projectId_key.key,
      );
      if (idx === -1) throw new Error("Idempotency record not found");
      store.idempotencyRecords[idx] = { ...store.idempotencyRecords[idx], ...data };
      return store.idempotencyRecords[idx];
    }),
  },
  transfer: {
    create: vi.fn(async ({ data }) => {
      const t = {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.transfers.push(t);
      return t;
    }),
    findFirst: vi.fn(async (args) => {
      const { id, reference, providerReference, projectId } = args?.where || {};
      const OR = args?.where?.OR;
      const t = store.transfers.find((x) => {
        if (projectId && x.projectId !== projectId) return false;
        if (id && x.id === id) return true;
        if (reference && x.reference === reference) return true;
        if (providerReference && x.providerReference === providerReference) return true;
        if (OR) {
          return OR.some((cond: any) => {
            if (cond.providerReference && x.providerReference === cond.providerReference) return true;
            if (cond.reference && x.reference === cond.reference) return true;
            return false;
          });
        }
        return false;
      });
      if (!t) return null;
      if (args?.include?.beneficiary) {
        return {
          ...t,
          beneficiary: store.beneficiaries.find((b) => b.id === t.beneficiaryId) || null,
        };
      }
      return t;
    }),
    findUniqueOrThrow: vi.fn(async (args) => {
      const { id } = args.where;
      const t = store.transfers.find((x) => x.id === id);
      if (!t) throw new Error("Transfer not found");
      return t;
    }),
    findUnique: vi.fn(async (args) => {
      const { id } = args.where;
      return store.transfers.find((x) => x.id === id) || null;
    }),
    findMany: vi.fn(async (args) => {
      let filtered = store.transfers;
      if (args?.where?.projectId) {
        filtered = filtered.filter((x) => x.projectId === args.where.projectId);
      }
      if (args?.where?.status) {
        filtered = filtered.filter((x) => x.status === args.where.status);
      }
      if (args?.where?.type) {
        filtered = filtered.filter((x) => x.type === args.where.type);
      }
      if (args?.where?.customerId) {
        filtered = filtered.filter((x) => x.customerId === args.where.customerId);
      }
      if (args?.where?.sourceAccountId) {
        filtered = filtered.filter((x) => x.sourceAccountId === args.where.sourceAccountId);
      }
      if (args?.where?.reference) {
        filtered = filtered.filter((x) => x.reference === args.where.reference);
      }
      if (args?.include?.beneficiary) {
        filtered = filtered.map((t) => ({
          ...t,
          beneficiary: store.beneficiaries.find((b) => b.id === t.beneficiaryId) || null,
        }));
      }
      return filtered;
    }),
    update: vi.fn(async (args) => {
      const { id } = args.where;
      const idx = store.transfers.findIndex((x) => x.id === id);
      if (idx === -1) throw new Error("Transfer not found");
      store.transfers[idx] = {
        ...store.transfers[idx],
        ...args.data,
        updatedAt: new Date(),
      };
      return store.transfers[idx];
    }),
  },
  beneficiary: {
    create: vi.fn(async ({ data }) => {
      const b = {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.beneficiaries.push(b);
      return b;
    }),
    findUnique: vi.fn(async (args) => {
      const { id } = args.where;
      return store.beneficiaries.find((x) => x.id === id) || null;
    }),
  },
  providerTransaction: {
    create: vi.fn(async ({ data }) => {
      const pt = {
        id: `pt_${crypto.randomUUID()}`,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.providerTransactions.push(pt);
      return pt;
    }),
  },
  webhookEvent: {
    create: vi.fn(async ({ data }) => {
      const we = {
        id: `we_${crypto.randomUUID()}`,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.webhookEvents.push(we);
      return we;
    }),
    findUnique: vi.fn(async (args) => {
      const { provider_providerEventId } = args.where || {};
      if (!provider_providerEventId) return null;
      return (
        store.webhookEvents.find(
          (x) =>
            x.provider === provider_providerEventId.provider &&
            x.providerEventId === provider_providerEventId.providerEventId,
        ) || null
      );
    }),
    update: vi.fn(async (args) => {
      const { provider_providerEventId } = args.where || {};
      if (!provider_providerEventId) throw new Error("Unique constraint missing");
      const idx = store.webhookEvents.findIndex(
        (x) =>
          x.provider === provider_providerEventId.provider &&
          x.providerEventId === provider_providerEventId.providerEventId,
      );
      if (idx === -1) throw new Error("Webhook event not found");
      store.webhookEvents[idx] = {
        ...store.webhookEvents[idx],
        ...args.data,
      };
      return store.webhookEvents[idx];
    }),
  },
};

// In-memory key-value map simulating Redis command structures
const redisStore = new Map<string, string>();

export const redisMock = {
  ping: vi.fn(async () => "PONG"),
  incr: vi.fn(async (key: string) => {
    const val = parseInt(redisStore.get(key) || "0", 10) + 1;
    redisStore.set(key, val.toString());
    return val;
  }),
  expire: vi.fn(async (_key: string, _seconds: number) => 1),
  quit: vi.fn(async () => "OK"),
  clear: () => redisStore.clear(),
};
