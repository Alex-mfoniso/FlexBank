import { api } from "../lib/api";
import type { Account } from "../types";

export const accountService = {
  async list(params?: { customerId?: string }): Promise<Account[]> {
    const response = await api.get("/api/v1/accounts", { params });
    return response.data.accounts || response.data.data || [];
  },

  async get(id: string): Promise<Account> {
    const response = await api.get(`/api/v1/accounts/${id}`);
    return response.data.account || response.data.data;
  },

  async create(payload: {
    customerId: string;
    currency: string;
    name: string;
  }): Promise<Account> {
    const response = await api.post("/api/v1/accounts", payload);
    return response.data.account || response.data.data;
  },

  async update(id: string, payload: { name?: string; status?: "active" | "frozen" | "closed" }): Promise<Account> {
    const response = await api.patch(`/api/v1/accounts/${id}`, payload);
    return response.data.account || response.data.data;
  },

  async getLedger(id: string): Promise<any[]> {
    const response = await api.get(`/api/v1/accounts/${id}/ledger`);
    return response.data.entries || response.data.data || [];
  },
};
