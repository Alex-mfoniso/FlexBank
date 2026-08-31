export interface UserMembership {
  organizationId: string;
  role: string;
  organizationName: string;
  organizationSlug: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  status: string;
  role?: string;
  createdAt: string;
  memberships?: UserMembership[];
}

export interface Organization {
  id: string;
  name: string;
  status: string;
  createdAt: string;
}

export interface Project {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  environment: "test" | "live";
  status: string;
  createdAt: string;
}

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  secret?: string; // Only present once on creation
  environment: "test" | "live";
  status: "active" | "revoked";
  lastUsedAt: string | null;
  createdAt: string;
}

export interface Customer {
  id: string;
  projectId: string;
  firstName: string;
  lastName: string;
  email: string;
  externalId: string | null;
  status: "active" | "suspended";
  createdAt: string;
}

export interface Account {
  id: string;
  projectId: string;
  customerId: string;
  currency: string;
  status: "active" | "frozen" | "closed";
  available: number;
  balance: number;
  pending: number;
  type: string;
  createdAt: string;
  customer?: Customer;
}

export interface Beneficiary {
  id: string;
  projectId: string;
  name: string;
  accountNumber: string;
  bankCode: string;
  bankName: string | null;
  createdAt: string;
}

export interface Transfer {
  id: string;
  projectId: string;
  customerId: string | null;
  sourceAccountId: string | null;
  destinationAccountId: string | null;
  beneficiaryId: string | null;
  amount: number;
  currency: string;
  reference: string;
  status: "pending" | "processing" | "successful" | "failed" | "reversed" | "cancelled";
  direction: "internal" | "inbound" | "outbound";
  type: "internal" | "external";
  providerId: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  completedAt: string | null;
  createdAt: string;
  sourceAccount?: Account;
  destinationAccount?: Account;
  beneficiary?: Beneficiary;
  customer?: Customer;
}

export interface Journal {
  id: string;
  projectId: string;
  reference: string;
  type: "adjustment" | "transfer" | "payout" | "deposit";
  status: "draft" | "posted" | "void";
  currency: string;
  description: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
  entries?: LedgerEntry[];
}

export interface LedgerEntry {
  id: string;
  journalId: string;
  ledgerAccountId: string;
  direction: "debit" | "credit";
  amount: number;
  currency: string;
  createdAt: string;
  journal?: Journal;
}

export interface WebhookEndpoint {
  id: string;
  projectId: string;
  url: string;
  status: "active" | "disabled";
  secret?: string; // Only present once on creation
  createdAt: string;
  updatedAt: string;
}

export interface WebhookDelivery {
  id: string;
  webhookEndpointId: string;
  eventId: string;
  eventType: string;
  status: "pending" | "delivered" | "failed";
  attempts: number;
  responseStatus: number | null;
  payload: string;
  deliveredAt: string | null;
  nextRetryAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiRequestLog {
  id: string;
  projectId: string | null;
  requestId: string;
  method: string;
  path: string;
  statusCode: number;
  environment: "test" | "live" | null;
  duration: number;
  createdAt: string;
}
