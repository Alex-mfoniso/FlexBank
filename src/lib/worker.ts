import Redis from "ioredis";
import crypto from "crypto";
import { prisma } from "./prisma";
import { logger } from "./logger";
import { env } from "../config/env";
import { redis } from "./redis";
import { QueueManager } from "./queue";

export interface WebhookJobPayload {
  deliveryId: string;
  endpointId: string;
  eventId: string;
  eventType: string;
  payloadStr: string;
  attempt: number;
}

/**
 * Background worker polling and processing asynchronous Redis tasks.
 * Manages webhook delivery, exponential backoff retries, and scheduled task promotion.
 */
export class BackgroundWorker {
  private client: Redis;
  private running = false;
  private intervalId?: NodeJS.Timeout;

  constructor() {
    this.client = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
  }

  /**
   * Starts the background task polling loop and scheduled delayed job promoter.
   */
  start(): void {
    if (this.running) return;
    this.running = true;
    logger.info("Initializing FlexBank background job worker...");

    // Spawn polling loop
    this.poll();

    // Promote delayed jobs from sorted sets to active queues every second
    this.intervalId = setInterval(() => {
      this.promoteDelayedJobs().catch((err) => {
        logger.error({ err }, "Error occurred while promoting delayed jobs");
      });
    }, 1000);
  }

  /**
   * Shuts down the background polling client and timer cleanly.
   */
  async stop(): Promise<void> {
    this.running = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    await this.client.quit();
    logger.info("Background job worker stopped successfully");
  }

  private async promoteDelayedJobs(): Promise<void> {
    const delayKey = "flexbank:delayed:webhooks";
    const queueKey = "flexbank:queue:webhooks";
    const now = Date.now();

    try {
      // Retrieve jobs ready to execute
      const readyJobs = await redis.zrangebyscore(delayKey, 0, now);
      if (readyJobs.length > 0) {
        // Remove from scheduler set
        await redis.zremrangebyscore(delayKey, 0, now);
        for (const jobStr of readyJobs) {
          await redis.lpush(queueKey, jobStr);
        }
        logger.debug({ count: readyJobs.length }, "Promoted delayed jobs to active webhook queue");
      }
    } catch (err) {
      logger.error({ err }, "Failed promoting delayed jobs in Redis");
    }
  }

  private async poll(): Promise<void> {
    const queueKey = "flexbank:queue:webhooks";

    while (this.running) {
      try {
        // Safe blocking pop with 5s timeout
        const result = await this.client.brpop(queueKey, 5);
        if (result) {
          const [_queue, payloadStr] = result;
          const job = JSON.parse(payloadStr) as WebhookJobPayload;
          await this.processWebhookDelivery(job);
        }
      } catch (err) {
        logger.error({ err }, "Worker polling iteration encountered an error");
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  private async processWebhookDelivery(job: WebhookJobPayload): Promise<void> {
    const { deliveryId, endpointId, eventId, eventType, payloadStr, attempt } = job;
    logger.info({ deliveryId, eventType, attempt }, "Executing webhook delivery job");

    try {
      const endpoint = await prisma.webhookEndpoint.findUnique({
        where: { id: endpointId },
      });

      if (!endpoint || endpoint.status === "disabled") {
        logger.warn({ endpointId, deliveryId }, "Webhook endpoint match not found or disabled. Aborting.");
        await prisma.webhookDelivery.update({
          where: { id: deliveryId },
          data: { status: "failed", attempts: attempt },
        });
        return;
      }

      const timestamp = Math.floor(Date.now() / 1000);
      // Stripe-style payload signing: timestamp.payload
      const signaturePayload = `${timestamp}.${payloadStr}`;
      const hmac = crypto
        .createHmac("sha256", endpoint.secret)
        .update(signaturePayload)
        .digest("hex");
      const signatureHeader = `t=${timestamp},v1=${hmac}`;

      const response = await fetch(endpoint.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-FlexBank-Event-Id": eventId,
          "X-FlexBank-Signature": signatureHeader,
          "User-Agent": "FlexBank-Webhook-Dispatcher/1.0",
        },
        body: payloadStr,
        signal: AbortSignal.timeout(10000), // Abort after 10 seconds timeout
      });

      const responseStatus = response.status;

      if (response.ok) {
        logger.info({ deliveryId, responseStatus }, "Webhook delivered successfully");
        await prisma.webhookDelivery.update({
          where: { id: deliveryId },
          data: {
            status: "delivered",
            attempts: attempt,
            responseStatus,
            deliveredAt: new Date(),
          },
        });
      } else {
        throw new Error(`Endpoint returned non-ok HTTP status: ${responseStatus}`);
      }
    } catch (err: any) {
      const errorMessage = err.message || "Network connection error";
      logger.warn({ deliveryId, err: errorMessage }, "Webhook delivery attempt failed");

      const maxAttempts = 5;
      if (attempt < maxAttempts) {
        const nextAttempt = attempt + 1;
        // Exponential backoff: 2^attempt * 10 seconds (e.g. 10s, 20s, 40s, 80s, etc.)
        const delayMs = Math.pow(2, attempt) * 10 * 1000;
        const nextRetryAt = new Date(Date.now() + delayMs);

        await prisma.webhookDelivery.update({
          where: { id: deliveryId },
          data: {
            status: "pending",
            attempts: attempt,
            responseStatus: err.status || 500,
            nextRetryAt,
          },
        });

        // Enqueue retry back into delayed scheduler
        await QueueManager.enqueueDelayed(
          "webhooks",
          { ...job, attempt: nextAttempt },
          delayMs,
        );
      } else {
        logger.error({ deliveryId }, "Webhook reached max retry limit. Marking delivery as failed.");
        await prisma.webhookDelivery.update({
          where: { id: deliveryId },
          data: {
            status: "failed",
            attempts: attempt,
            responseStatus: err.status || 500,
          },
        });
      }
    }
  }
}

// Single instance exports
export const backgroundWorker = new BackgroundWorker();
