import Redis from "ioredis";
import { env } from "../config/env";
import { logger } from "./logger";

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true, // Allow us to connect explicitly during server startup
  tls: env.REDIS_URL.startsWith("rediss://")
    ? { rejectUnauthorized: false }
    : undefined,
});

// Configure event listeners
redis.on("connect", () => {
  logger.info("Initiating connection to Redis...");
});

redis.on("ready", () => {
  logger.info("Redis connected successfully");
});

redis.on("error", (err) => {
  logger.error({ err }, "Redis connection error occurred");
});

redis.on("close", () => {
  logger.info("Redis connection closed");
});

export const connectRedis = async (): Promise<void> => {
  try {
    await redis.connect();
  } catch (err) {
    logger.error({ err }, "Failed to connect to Redis during startup");
    throw err;
  }
};

export const disconnectRedis = async (): Promise<void> => {
  logger.info("Shutting down Redis client...");
  try {
    await redis.quit();
  } catch (err) {
    logger.warn({ err }, "Error while disconnecting Redis client; forcing disconnect");
    redis.disconnect();
  }
};
