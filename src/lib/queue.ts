import { redis } from "./redis";
import { logger } from "./logger";

/**
 * High-performance, lightweight Redis-backed job queue manager.
 * Supports immediate list-based task enqueuing and sorted set-based delayed scheduling.
 */
export class QueueManager {
  /**
   * Enqueues a job for immediate background processing.
   */
  static async enqueue(queueName: string, payload: any): Promise<void> {
    try {
      const queueKey = `flexbank:queue:${queueName}`;
      await redis.lpush(queueKey, JSON.stringify(payload));
      logger.debug({ queueKey, payload }, "Asynchronous job enqueued successfully");
    } catch (err) {
      logger.error({ err, queueName }, "Error enqueuing background job to Redis");
      throw err;
    }
  }

  /**
   * Enqueues a job to be processed after a specified delay.
   */
  static async enqueueDelayed(queueName: string, payload: any, delayMs: number): Promise<void> {
    try {
      const delayKey = `flexbank:delayed:${queueName}`;
      const executeAt = Date.now() + delayMs;
      await redis.zadd(delayKey, executeAt, JSON.stringify(payload));
      logger.debug({ delayKey, payload, executeAt }, "Delayed job scheduled successfully");
    } catch (err) {
      logger.error({ err, queueName }, "Error scheduling delayed background job to Redis");
      throw err;
    }
  }
}

export default QueueManager;
