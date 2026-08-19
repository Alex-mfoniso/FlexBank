import { Request, Response, NextFunction } from "express";
import { NotFoundError } from "../lib/errors";

export const notFoundMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl || req.url} not found`));
};
