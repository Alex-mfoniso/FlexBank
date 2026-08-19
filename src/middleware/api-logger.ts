import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";

/**
 * Express middleware to record and persist metadata of all incoming developer API requests.
 * Runs non-blocking database queries to log performance, status codes, and environment context.
 */
export const apiLoggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const context = req.apiKeyContext;

    // Persist API request log in the background
    if (prisma.apiRequestLog) {
      prisma.apiRequestLog
        .create({
          data: {
            requestId: req.id,
            method: req.method,
            path: req.baseUrl + req.path, // Capture the full prefix path
            statusCode: res.statusCode,
            projectId: context?.projectId || null,
            environment: context?.environment || null,
            duration,
          },
        })
        .catch((err) => {
          // Prevent request logging database failures from affecting any clients
          logger.error({ err, requestId: req.id }, "Error saving apiRequestLog entry to database");
        });
    }
  });

  next();
};

export default apiLoggerMiddleware;
