import { Request, Response, NextFunction } from "express";
import { redis } from "../lib/redis";
import { logger } from "../lib/logger";

export interface RateLimiterOptions {
  windowSeconds: number;
  maxRequests: number;
}

/**
 * Creates an Express rate-limiting middleware backed by Redis.
 * Rate limiting is enforced on a per-IP basis per endpoint path.
 * Runs with a fail-open design to prevent Redis outages from locking out legitimate traffic.
 * 
 * @param options Timing window and threshold constraints
 * @returns Express Middleware
 */
export const rateLimiterMiddleware = (options: RateLimiterOptions) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    // Construct rate limit bucket key specific to endpoint and user IP
    const rateKey = `rate_limit:${req.path}:${ip}`;

    try {
      // Atomic increment operation
      const currentCount = await redis.incr(rateKey);

      if (currentCount === 1) {
        // First increment initializes key expiration
        await redis.expire(rateKey, options.windowSeconds);
      }

      if (currentCount > options.maxRequests) {
        logger.warn(
          { ip, path: req.path, currentCount, maxRequests: options.maxRequests },
          "Rate limit exceeded",
        );

        return res.status(429).json({
          error: {
            code: "TOO_MANY_REQUESTS",
            message: "Too many requests. Please try again later.",
            requestId: req.id,
          },
        });
      }

      return next();
    } catch (err) {
      // Fail open: log the outage, but do not block the active endpoint cycle
      logger.error(
        { err, ip, path: req.path },
        "Redis rate limiting middleware error; failing open",
      );
      return next();
    }
  };
};
export default rateLimiterMiddleware;
