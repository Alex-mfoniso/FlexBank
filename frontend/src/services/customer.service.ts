import { api } from "../lib/api";
import type { Customer } from "../types";

export const customerService = {
  async list(): Promise<Customer[]> {
    const response = await api.get("/api/v1/customers");
    return response.data.customers || response.data.data || [];
  },

  async get(id: string): Promise<Customer> {
    const response = await api.get(`/api/v1/customers/${id}`);
    return response.data.customer || response.data.data;
  },

  async create(payload: {
    externalId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
  }): Promise<Customer> {
    const response = await api.post("/api/v1/customers", payload);
    return response.data.customer || response.data.data;
  },

  async update(id: string, payload: Partial<Customer>): Promise<Customer> {
    const response = await api.patch(`/api/v1/customers/${id}`, payload);
    return response.data.customer || response.data.data;
  },
};
