import { Request, Response, NextFunction } from "express";
import { AppError } from "../lib/errors";
import { logger } from "../lib/logger";
import { env } from "../config/env";

export const errorHandlerMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const requestId = req.id;

  if (err instanceof AppError) {
    logger.warn(
      {
        requestId,
        code: err.code,
        message: err.message,
        statusCode: err.statusCode,
      },
      "Application operational error",
    );

    const errorResponse: any = {
      code: err.code,
      message: err.message,
      requestId,
    };

    // Serialize Zod validation error fields to match schema standards
    if (err.code === "VALIDATION_ERROR" && (err as any).details) {
      errorResponse.fields = (err as any).details;
    }

    return res.status(err.statusCode).json({
      error: errorResponse,
    });
  }

  // Handle unexpected system errors
  logger.error(
    {
      requestId,
      err: {
        message: err.message,
        stack: env.NODE_ENV !== "production" ? err.stack : undefined,
      },
    },
    "Unhandled system error occurred",
  );

  return res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: env.NODE_ENV === "production" ? "An unexpected error occurred" : err.message,
      requestId,
    },
  });
};
