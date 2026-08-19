import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

// Extend Express Request interface to include a type-safe requestId property
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

// Regex to validate a safe, trace-friendly request ID (alphanumeric, hyphens, underscores, length 8-64)
const SAFE_REQUEST_ID_REGEX = /^[a-zA-Z0-9_-]{8,64}$/;

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const incomingId = req.headers["x-request-id"];
  let requestId: string;

  if (typeof incomingId === "string" && SAFE_REQUEST_ID_REGEX.test(incomingId)) {
    // Preserve valid incoming client request ID for distributed tracing
    requestId = incomingId;
  } else {
    // Generate new UUID-based request ID with "req_" prefix
    requestId = `req_${randomUUID()}`;
  }

  // Set on both Request object and Response headers
  req.id = requestId;
  res.setHeader("X-Request-ID", requestId);

  next();
};
