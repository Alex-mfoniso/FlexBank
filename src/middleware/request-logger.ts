import { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

export const requestLoggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Log on response completion to accurately calculate the execution duration
  res.on("finish", () => {
    const durationMs = Date.now() - startTime;
    logger.info({
      requestId: req.id,
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode,
      durationMs,
    });
  });

  next();
};
