import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { redis } from "../lib/redis";
import { providerService } from "../modules/providers/provider.service";

const router = Router();

// Liveness probe (GET /health)
router.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    service: "ricarut-api",
    version: "0.1.0",
  });
});

// Readiness probe handler (GET /health/ready and GET /ready)
const readinessHandler = async (_req: Request, res: Response) => {
  let databaseStatus = "ok";
  let redisStatus = "ok";
  let isReady = true;

  // 1. Verify PostgreSQL connection health
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    databaseStatus = "down";
    isReady = false;
  }

  // 2. Verify Redis connection health
  try {
    const pingResponse = await redis.ping();
    if (pingResponse !== "PONG") {
      redisStatus = "down";
      isReady = false;
    }
  } catch {
    redisStatus = "down";
    isReady = false;
  }

  const result = {
    status: isReady ? "ready" : "down",
    checks: {
      database: databaseStatus,
      redis: redisStatus,
    },
  };

  if (isReady) {
    return res.status(200).json(result);
  } else {
    // Return 503 Service Unavailable if any core infrastructure check fails
    return res.status(503).json(result);
  }
};

router.get("/health/ready", readinessHandler);
router.get("/ready", readinessHandler);

// Provider connectivity diagnostic checks (e.g. GET /health/providers/paystack)
router.get("/health/providers/:providerId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const providerId = req.params.providerId.toLowerCase();
    const result = await providerService.verifyProvider(providerId);

    const statusCode = result.connected ? 200 : 503;
    res.status(statusCode).json({
      provider: result.provider,
      connected: result.connected,
      ...(result.error ? { error: result.error } : {}),
    });
  } catch (err) {
    next(err);
  }
});

// Overall financial providers diagnostic check
router.get("/health/providers", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const results = await providerService.verifyAllProviders();
    const allConnected = results.every((r) => r.connected);

    const statusCode = allConnected ? 200 : 503;
    res.status(statusCode).json({
      status: allConnected ? "ok" : "degraded",
      providers: results.map((r) => ({
        provider: r.provider,
        connected: r.connected,
        ...(r.error ? { error: r.error } : {}),
      })),
    });
  } catch (err) {
    next(err);
  }
});

export const healthRoutes = router;
export default healthRoutes;
