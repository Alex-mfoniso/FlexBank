import { Request, Response, NextFunction } from "express";

/**
 * Express middleware to automatically inject the root-level requestId correlation tag
 * into every standard JSON success and error response payload.
 * Fully compatible with existing Phase 1-5 response structures.
 */
export const standardResponseMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json;

  res.json = function (body: any) {
    if (body && typeof body === "object" && !Array.isArray(body)) {
      // Handle standard error payloads
      if (body.error) {
        body.requestId = req.id;
      } else {
        // Handle standard success payloads (single data or paginated)
        if (body.data) {
          body.requestId = req.id;
        } else {
          // Keep existing properties intact to avoid breaking Phase 1-5 tests,
          // while guaranteeing root-level requestId injection for perfect developer tracking.
          body.requestId = req.id;
        }
      }
    }
    return originalJson.call(this, body);
  };

  next();
};

export default standardResponseMiddleware;
