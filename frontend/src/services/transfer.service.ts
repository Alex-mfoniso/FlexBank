import { api } from "../lib/api";
import type { Transfer, DeveloperTransferPayload } from "../types";

export interface InitiateTransferPayload {
  type: "internal" | "external";
  sourceAccountId: string;
  destinationAccountId?: string;
  amount: number;
  currency: string;
  reference: string;
  beneficiary?: {
    type: "bank_account";
    bankCode: string;
    accountNumber: string;
    accountName?: string;
  };
}

export const transferService = {
  async list(params?: {
    status?: string;
    type?: string;
    customerId?: string;
    sourceAccountId?: string;
    reference?: string;
  }): Promise<Transfer[]> {
    const response = await api.get("/api/v1/transfers", { params });
    return response.data.transfers || response.data.data || [];
  },

  async get(id: string): Promise<Transfer> {
    const response = await api.get(`/api/v1/transfers/${id}`);
    return response.data.data || response.data.transfer;
  },

  async initiate(payload: InitiateTransferPayload, idempotencyKey?: string): Promise<Transfer> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers["Idempotency-Key"] = idempotencyKey;
    }
    const response = await api.post("/api/v1/transfers", payload, { headers });
    return response.data.transfer || response.data.data;
  },

  async initiateDeveloperTransfer(payload: DeveloperTransferPayload, idempotencyKey?: string): Promise<Transfer> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers["Idempotency-Key"] = idempotencyKey;
    }
    const response = await api.post("/api/v1/transfers", payload, { headers });
    return response.data.data || response.data.transfer;
  },

  async syncStatus(id: string): Promise<Transfer> {
    const response = await api.get(`/api/v1/transfers/${id}/status`);
    return response.data.data || response.data.transfer;
  },
};
