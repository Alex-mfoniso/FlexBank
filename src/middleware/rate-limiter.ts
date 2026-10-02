import { Request, Response, NextFunction } from "express";
import { redis } from "../lib/redis";
import { logger } from "../lib/logger";

export interface RateLimiterOptions {
  windowSeconds: number;
  maxRequests: number;
  keyPrefix?: string;
  scope?: "ip" | "apiKey" | "global";
}

// In-memory fallback map when Redis is disconnected or during local test executions
const memoryBuckets = new Map<string, { count: number; resetAt: number }>();

/**
 * Creates an Express rate-limiting middleware backed by Redis with local in-memory fallback.
 * Runs with a fail-open design on critical system faults to prevent outages from locking out legitimate traffic.
 */
export const rateLimiterMiddleware = (options: RateLimiterOptions) => {
  const { windowSeconds, maxRequests, keyPrefix = "rate_limit" } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    // In automated unit/integration test environments without explicit rate testing, pass through
    if (process.env.NODE_ENV === "test" && !process.env.TEST_RATE_LIMITER) {
      return next();
    }

    const ip = req.ip || req.socket.remoteAddress || "127.0.0.1";
    const apiKeyPrefix = (req as any).apiKeyContext?.keyPrefix || "";
    const identifier = apiKeyPrefix ? `key_${apiKeyPrefix}` : `ip_${ip}`;
    const rateKey = `${keyPrefix}:${req.baseUrl || ""}${req.path}:${identifier}`;

    try {
      if (redis && redis.status === "ready") {
        const currentCount = await redis.incr(rateKey);

        if (currentCount === 1) {
          await redis.expire(rateKey, windowSeconds);
        }

        if (currentCount > maxRequests) {
          logger.warn(
            { identifier, path: req.path, currentCount, maxRequests },
            "API rate limit exceeded via Redis store",
          );

          res.set("Retry-After", String(windowSeconds));
          return res.status(429).json({
            error: {
              code: "TOO_MANY_REQUESTS",
              message: "Rate limit exceeded. Please retry after delay.",
              requestId: (req as any).id,
            },
          });
        }

        return next();
      }
    } catch (err) {
      logger.debug({ err }, "Redis rate limiter unavailable; using in-memory tracker");
    }

    // In-Memory Fallback
    const now = Date.now();
    const bucket = memoryBuckets.get(rateKey);

    if (!bucket || bucket.resetAt <= now) {
      memoryBuckets.set(rateKey, { count: 1, resetAt: now + windowSeconds * 1000 });
      return next();
    }

    bucket.count += 1;
    if (bucket.count > maxRequests) {
      logger.warn(
        { identifier, path: req.path, currentCount: bucket.count, maxRequests },
        "API rate limit exceeded via in-memory store",
      );

      res.set("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
      return res.status(429).json({
        error: {
          code: "TOO_MANY_REQUESTS",
          message: "Rate limit exceeded. Please retry after delay.",
          requestId: (req as any).id,
        },
      });
    }

    return next();
  };
};

/** Predefined Rate Limiters scoped to endpoint sensitivity */
export const authRateLimiter = rateLimiterMiddleware({
  windowSeconds: 60,
  maxRequests: 10,
  keyPrefix: "rate:auth",
});

export const resolveAccountRateLimiter = rateLimiterMiddleware({
  windowSeconds: 60,
  maxRequests: 30,
  keyPrefix: "rate:resolve",
});

export const createTransferRateLimiter = rateLimiterMiddleware({
  windowSeconds: 60,
  maxRequests: 60,
  keyPrefix: "rate:transfer_create",
});

export const getTransferRateLimiter = rateLimiterMiddleware({
  windowSeconds: 60,
  maxRequests: 120,
  keyPrefix: "rate:transfer_get",
});

export const webhookRateLimiter = rateLimiterMiddleware({
  windowSeconds: 60,
  maxRequests: 600, // Very generous ceiling: provider callbacks must never be blocked
  keyPrefix: "rate:webhooks",
});

export default rateLimiterMiddleware;
