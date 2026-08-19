import { api } from "../lib/api";
import type { ApiRequestLog } from "../types";

export const logService = {
  async list(params?: {
    environment?: "test" | "live";
    statusCode?: number;
    method?: string;
  }): Promise<ApiRequestLog[]> {
    const response = await api.get("/api/v1/logs", { params });
    return response.data.data || [];
  },

  async get(requestId: string): Promise<any> {
    const response = await api.get(`/api/v1/logs/${requestId}`);
    return response.data.data;
  },
};
