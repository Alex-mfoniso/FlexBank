import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { authenticateApiKey } from "../middleware/auth";
import { z } from "zod";
import { ValidationError, NotFoundError } from "../lib/errors";

const router = Router();

const querySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

/**
 * GET /api/v1/accounts/:accountId/ledger
 * Exposes a detailed list of double-entry ledger bookings for a specific wallet.
 * Scoped securely to the authenticated project. Includes parent transaction details.
 */
router.get("/accounts/:accountId/ledger", authenticateApiKey, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accountId } = req.params;
    const context = req.apiKeyContext!;

    const validation = querySchema.safeParse(req.query);
    if (!validation.success) {
      return next(new ValidationError("Invalid query parameters", validation.error.format() as any));
    }

    const { limit, cursor } = validation.data;

    // 1. Verify target account exists and matches project context
    const financialAccount = await prisma.account.findFirst({
      where: { id: accountId, projectId: context.projectId },
    });
    if (!financialAccount) {
      return next(new NotFoundError("Target customer account context not found"));
    }

    // 2. Resolve matching Ledger Account
    const ledgerAccount = await prisma.ledgerAccount.findFirst({
      where: { financialAccountId: accountId, projectId: context.projectId },
    });

    if (!ledgerAccount) {
      // Return empty ledger list if no financial operations have occurred yet
      return res.status(200).json({
        data: [],
        pagination: { nextCursor: undefined },
      });
    }

    // 3. Fetch detailed double-entry credit/debit history
    const entries = await prisma.ledgerEntry.findMany({
      where: { ledgerAccountId: ledgerAccount.id },
      take: limit + 1,
      orderBy: { createdAt: "desc" },
      include: {
        journal: {
          select: {
            id: true,
            reference: true,
            type: true,
            description: true,
            status: true,
            createdAt: true,
          },
        },
      },
      ...(cursor && {
        skip: 1,
        cursor: { id: cursor },
      }),
    });

    let nextCursor: string | undefined = undefined;
    if (entries.length > limit) {
      const nextItem = entries.pop();
      nextCursor = nextItem?.id;
    }

    return res.status(200).json({
      data: entries,
      pagination: {
        nextCursor,
      },
    });
  } catch (err) {
    return next(err);
  }
});

export const ledgerExplorerRoutes = router;
export default ledgerExplorerRoutes;
