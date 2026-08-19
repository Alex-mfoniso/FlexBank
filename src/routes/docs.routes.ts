import { Router, Request, Response } from "express";
import openapiSpec from "../docs/openapi.json";

const router = Router();

/**
 * GET /api/v1/docs
 * Exposes the raw, structured OpenAPI 3.0 specification JSON for developer onboarding.
 */
router.get("/", (_req: Request, res: Response) => {
  return res.status(200).json(openapiSpec);
});

export const docsRoutes = router;
export default docsRoutes;
