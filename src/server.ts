import { app } from "./app";
import { env } from "./config/env";
import { prisma } from "./lib/prisma";
import { connectRedis, disconnectRedis } from "./lib/redis";
import { backgroundWorker } from "./lib/worker";
import { logger } from "./lib/logger";
import { Server } from "http";

let server: Server;

const startServer = async () => {
  logger.info("Starting FlexBank API Service...");

  try {
    // 1. Establish Database Connection (Prisma)
    logger.info("Connecting to PostgreSQL database...");
    await prisma.$connect();
    logger.info("PostgreSQL connected successfully");

    // 2. Establish Redis Connection
    await connectRedis();

    // 3. Start Background Worker
    backgroundWorker.start();

    // 3. Start HTTP listener
    server = app.listen(env.PORT, () => {
      logger.info(
        { port: env.PORT, nodeEnv: env.NODE_ENV },
        "FlexBank API server listening for requests",
      );
    });
  } catch (err) {
    logger.fatal({ err }, "Fatal error during startup sequence. Terminating process...");
    process.exit(1);
  }
};

const handleGracefulShutdown = async (signal: string) => {
  logger.info({ signal }, `Received ${signal} signal; initiating graceful shutdown...`);

  // Enforce a hard timeout limit of 10s if graceful teardown is blocked
  const forceExitTimeout = setTimeout(() => {
    logger.error("Graceful shutdown timed out; forcing immediate exit");
    process.exit(1);
  }, 10000);

  // 1. Stop accepting new connections at HTTP level
  if (server) {
    logger.info("Closing HTTP server...");
    await new Promise<void>((resolve) => {
      server.close((err) => {
        if (err) {
          logger.error({ err }, "Error while closing HTTP server");
        } else {
          logger.info("HTTP server closed successfully");
        }
        resolve();
      });
    });
  }

  // 2. Teardown Prisma Client connection pool
  try {
    logger.info("Disconnecting PostgreSQL client pool...");
    await prisma.$disconnect();
    logger.info("PostgreSQL client disconnected");
  } catch (err) {
    logger.error({ err }, "Error disconnecting PostgreSQL client");
  }

  // 3. Teardown Background Worker and Redis client connection pool
  try {
    logger.info("Shutting down background worker...");
    await backgroundWorker.stop();
  } catch (err) {
    logger.error({ err }, "Error stopping background worker");
  }

  try {
    await disconnectRedis();
  } catch (err) {
    logger.error({ err }, "Error disconnecting Redis client");
  }

  clearTimeout(forceExitTimeout);
  logger.info("FlexBank API shutdown complete. Graceful termination complete.");
  process.exit(0);
};

// Listen for process termination signals
process.on("SIGINT", () => handleGracefulShutdown("SIGINT"));
process.on("SIGTERM", () => handleGracefulShutdown("SIGTERM"));

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason) => {
  logger.fatal({ reason }, "Unhandled Promise Rejection detected in runtime");
  process.exit(1);
});

// Boot the system
startServer();
export { server };
