import { api } from "../lib/api";
import type { WebhookEndpoint, WebhookDelivery } from "../types";

export const webhookService = {
  async listEndpoints(): Promise<WebhookEndpoint[]> {
    const response = await api.get("/api/v1/webhooks/endpoints");
    return response.data.data || [];
  },

  async createEndpoint(url: string): Promise<WebhookEndpoint> {
    const response = await api.post("/api/v1/webhooks/endpoints", { url });
    return response.data;
  },

  async updateEndpoint(id: string, payload: { url?: string; status?: "active" | "disabled" }): Promise<WebhookEndpoint> {
    const response = await api.patch(`/api/v1/webhooks/endpoints/${id}`, payload);
    return response.data.data;
  },

  async deleteEndpoint(id: string): Promise<boolean> {
    await api.delete(`/api/v1/webhooks/endpoints/${id}`);
    return true;
  },

  async listDeliveries(endpointId: string): Promise<WebhookDelivery[]> {
    const response = await api.get(`/api/v1/webhooks/endpoints/${endpointId}/deliveries`);
    return response.data.data || [];
  },

  async triggerTestEvent(endpointId: string, eventType: string): Promise<any> {
    const response = await api.post(`/api/v1/webhooks/endpoints/${endpointId}/test-event`, { eventType });
    return response.data;
  },
};
