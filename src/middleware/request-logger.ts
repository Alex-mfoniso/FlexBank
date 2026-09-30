import { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

/**
 * Sanitizes URLs to mask sensitive query parameters (e.g., account numbers).
 */
function sanitizeRequestPath(rawPath: string): string {
  if (!rawPath) return rawPath;
  return rawPath.replace(/(account_number|accountNumber)=([0-9a-zA-Z]{6})([0-9a-zA-Z]+)/gi, "$1=******$3");
}

export const requestLoggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Log on response completion to accurately calculate the execution duration
  res.on("finish", () => {
    const durationMs = Date.now() - startTime;
    logger.info({
      requestId: req.id,
      method: req.method,
      path: sanitizeRequestPath(req.originalUrl || req.url),
      statusCode: res.statusCode,
      durationMs,
    });
  });

  next();
};
