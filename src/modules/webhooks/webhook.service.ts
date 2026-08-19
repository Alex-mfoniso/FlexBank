import crypto from "crypto";
import { prisma } from "../../lib/prisma";
import { logger } from "../../lib/logger";
import { QueueManager } from "../../lib/queue";

/**
 * Service managing outbox webhook dispatch flows.
 * Generates unique, immutable event IDs, registers delivery attempt entries,
 * and enqueues tasks asynchronously onto the Redis background worker.
 */
export class WebhookService {
  /**
   * Dispatches a webhook event to all active endpoints registered for the project.
   */
  static async dispatch(projectId: string, eventType: string, data: any): Promise<void> {
    const eventId = `evt_${crypto.randomUUID().replace(/-/g, "")}`;
    const payload = {
      id: eventId,
      type: eventType,
      data,
      createdAt: new Date().toISOString(),
    };
    const payloadStr = JSON.stringify(payload);

    try {
      // Find all active endpoints for the target project
      const endpoints = await prisma.webhookEndpoint.findMany({
        where: {
          projectId,
          status: "active",
        },
      });

      if (endpoints.length === 0) {
        logger.debug({ projectId, eventType }, "No active webhook endpoints registered; skipping delivery");
        return;
      }

      logger.info(
        { projectId, eventType, eventId, endpointCount: endpoints.length },
        "Dispatching webhook event to registered endpoints",
      );

      for (const endpoint of endpoints) {
        const deliveryId = `whd_${crypto.randomUUID().replace(/-/g, "")}`;

        // 1. Persist the delivery attempt in PostgreSQL
        await prisma.webhookDelivery.create({
          data: {
            id: deliveryId,
            webhookEndpointId: endpoint.id,
            eventId,
            eventType,
            status: "pending",
            attempts: 0,
            payload: payloadStr,
          },
        });

        // 2. Queue the job asynchronously to keep core transactions fast and non-blocking
        await QueueManager.enqueue("webhooks", {
          deliveryId,
          endpointId: endpoint.id,
          eventId,
          eventType,
          payloadStr,
          attempt: 1,
        });
      }
    } catch (err) {
      logger.error({ err, projectId, eventType, eventId }, "Failed to dispatch webhook event");
      // Never crash core workflows due to background webhook scheduling issues
    }
  }
}

export default WebhookService;
