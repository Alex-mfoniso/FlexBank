import { api } from "../lib/api";
import type { Transfer } from "../types";

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
    return response.data.transfer || response.data.data;
  },

  async initiate(payload: InitiateTransferPayload): Promise<Transfer> {
    const response = await api.post("/api/v1/transfers", payload);
    return response.data.transfer || response.data.data;
  },

  async syncStatus(id: string): Promise<Transfer> {
    const response = await api.get(`/api/v1/transfers/${id}/status`);
    return response.data.transfer || response.data.data;
  },
};
