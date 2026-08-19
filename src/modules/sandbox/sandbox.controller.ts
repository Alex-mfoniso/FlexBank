import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { SandboxService } from "./sandbox.service";
import { authenticateUserOrApiKey, resolveProjectContext } from "../../middleware/auth";
import { ValidationError, ForbiddenError } from "../../lib/errors";

const router = Router();

const fundSchema = z.object({
  amount: z.coerce.number().positive("Funding amount must be greater than zero"),
});

const simulateSchema = z.object({
  scenario: z.enum(["settled", "successful_transfer", "provider_rejected", "failed_transfer", "provider_timeout"]),
});

// Enforce Developer authentication globally for all sandbox routes supporting both user JWT and API keys
router.use(authenticateUserOrApiKey, resolveProjectContext);

// Global Sandbox Boundary guard
router.use((req: Request, _res: Response, next: NextFunction) => {
  const context = req.apiKeyContext!;
  if (context.environment !== "test") {
    return next(new ForbiddenError("Sandbox simulator operations are strictly forbidden in the live environment"));
  }
  next();
});

/**
 * POST /api/v1/test/accounts/:accountId/fund
 * Adds test minor unit currency to a customer's wallet using a double-entry ledger adjustment.
 */
router.post("/accounts/:accountId/fund", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accountId } = req.params;
    const context = req.apiKeyContext!;

    const validation = fundSchema.safeParse(req.body);
    if (!validation.success) {
      return next(new ValidationError("Invalid sandbox funding payload", validation.error.format() as any));
    }

    const account = await SandboxService.fundTestAccount(
      accountId,
      context.projectId,
      validation.data.amount,
    );

    return res.status(200).json({
      status: "success",
      message: "Sandbox test account successfully funded",
      data: account,
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/v1/test/transfers/:transferId/simulate
 * Simulates real financial network outcomes (settlement, failure, timeouts) for a pending transfer.
 */
router.post("/transfers/:transferId/simulate", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { transferId } = req.params;
    const context = req.apiKeyContext!;

    const validation = simulateSchema.safeParse(req.body);
    if (!validation.success) {
      return next(new ValidationError("Invalid sandbox simulation payload", validation.error.format() as any));
    }

    const transfer = await SandboxService.simulateTransferScenario(
      transferId,
      context.projectId,
      validation.data.scenario,
    );

    return res.status(200).json({
      status: "success",
      message: `Simulated transfer outcome '${validation.data.scenario}' successfully executed`,
      data: transfer,
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/v1/test/reset
 * Completely wipes sandbox test-only state for the authenticated developer project.
 */
router.post("/reset", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const context = req.apiKeyContext!;

    await SandboxService.resetSandbox(context.projectId);

    return res.status(200).json({
      status: "success",
      message: "Sandbox test project state reset successfully. All project data wiped.",
    });
  } catch (err) {
    return next(err);
  }
});

export const sandboxController = router;
export default sandboxController;
