import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { redis } from "../lib/redis";

const router = Router();

// Liveness probe (GET /health)
router.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    service: "flexbank-api",
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

export const healthRoutes = router;
export default healthRoutes;
