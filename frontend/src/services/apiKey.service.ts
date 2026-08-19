import { api } from "../lib/api";
import type { ApiKey } from "../types";

export const apiKeyService = {
  async list(projectId: string): Promise<ApiKey[]> {
    const response = await api.get(`/api/v1/projects/${projectId}/api-keys`);
    return response.data.apiKeys || [];
  },

  async create(projectId: string, payload: { name: string; expiresInDays?: number }): Promise<ApiKey> {
    const response = await api.post(`/api/v1/projects/${projectId}/api-keys`, payload);
    return response.data;
  },

  async delete(projectId: string, keyId: string): Promise<boolean> {
    await api.delete(`/api/v1/projects/${projectId}/api-keys/${keyId}`);
    return true;
  },
};
