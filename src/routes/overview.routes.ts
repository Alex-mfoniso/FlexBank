import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { authenticateUserOrApiKey, resolveProjectContext } from "../middleware/auth";
import { ForbiddenError } from "../lib/errors";

const router = Router();

/**
 * GET /api/v1/projects/:projectId/overview
 * Exposes aggregated operational performance indicators for a given project.
 * Uses high-performance database aggregations and secures access for both developers (API keys)
 * and dashboard users (Organization membership verification).
 */
router.get(
  "/:projectId/overview",
  authenticateUserOrApiKey,
  async (req: Request, _res: Response, next: NextFunction) => {
    // Map path parameter to query parameter so resolveProjectContext can read it seamlessly
    req.query.projectId = req.params.projectId;
    next();
  },
  resolveProjectContext,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.params;
      const context = req.apiKeyContext!;

      // Enforce strict project context boundary isolation
      if (context.projectId !== projectId) {
        throw new ForbiddenError("Access to this project context is unauthorized");
      }

      // Execute high-performance parallel aggregations
      const [
        customersCount,
        accountsCount,
        transfersCount,
        successfulTransfersCount,
        failedTransfersCount,
        volumeAggregate,
      ] = await Promise.all([
        prisma.customer.count({ where: { projectId } }),
        prisma.account.count({ where: { projectId } }),
        prisma.transfer.count({ where: { projectId } }),
        prisma.transfer.count({ where: { projectId, status: "successful" } }),
        prisma.transfer.count({ where: { projectId, status: "failed" } }),
        prisma.transfer.aggregate({
          where: { projectId, status: "successful" },
          _sum: { amount: true },
        }),
      ]);

      const totalVolume = volumeAggregate._sum.amount || 0;

      return res.status(200).json({
        projectId,
        metrics: {
          customersCount,
          accountsCount,
          transfersCount,
          successfulTransfersCount,
          failedTransfersCount,
          totalVolume,
        },
      });
    } catch (err) {
      return next(err);
    }
  },
);

export const overviewRoutes = router;
export default overviewRoutes;
