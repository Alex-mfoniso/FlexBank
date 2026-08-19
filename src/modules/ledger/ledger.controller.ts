import { Request, Response, NextFunction } from "express";
import { prisma } from "../../lib/prisma";
import { LedgerService } from "./ledger.service";
import { internalTransferSchema, ledgerQuerySchema } from "./ledger.schema";
import { ValidationError, AccountNotFoundError, JournalNotFoundError } from "../../lib/errors";
import { IdempotencyService } from "./idempotency.service";

/**
 * Controller handling HTTP requests and routing for ledger features.
 * Integrates Zod parsing and Idempotency key evaluation.
 */
export class LedgerController {
  constructor(private readonly service = new LedgerService()) {}

  /**
   * GET /api/v1/accounts/:accountId/balance
   * Returns calculated ledger balance.
   */
  getAccountBalance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { accountId } = req.params;
      const { projectId } = req.apiKeyContext!;

      const account = await prisma.account.findFirst({
        where: { id: accountId, projectId },
      });
      if (!account) {
        return next(new AccountNotFoundError(`Financial account ${accountId} not found`));
      }

      const ledgerAcc = await this.service.resolveOrCreateLedgerAccount(accountId, projectId);
      const balance = await this.service.calculateBalance(ledgerAcc.id, projectId);

      return res.status(200).json({
        accountId,
        currency: account.currency,
        available: balance,
        pending: 0,
      });
    } catch (err) {
      return next(err);
    }
  };

  /**
   * GET /api/v1/accounts/:accountId/ledger
   * Returns paginated historical ledger entries.
   */
  getAccountLedger = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { accountId } = req.params;
      const { projectId } = req.apiKeyContext!;

      const validation = ledgerQuerySchema.safeParse(req.query);
      if (!validation.success) {
        return next(new ValidationError("Invalid query parameters", validation.error.format()));
      }

      const { limit, cursor } = validation.data;
      const result = await this.service.getAccountLedger(accountId, projectId, limit, cursor);

      return res.status(200).json(result);
    } catch (err) {
      return next(err);
    }
  };

  /**
   * GET /api/v1/transactions/:transactionId
   * Returns detailed Journal record and nested entry lines.
   */
  getTransaction = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { transactionId } = req.params;
      const { projectId } = req.apiKeyContext!;

      const transaction = await this.service["repo"].findJournalById(transactionId, projectId);
      if (!transaction) {
        return next(new JournalNotFoundError(`Transaction ${transactionId} not found`));
      }

      return res.status(200).json({ transaction });
    } catch (err) {
      return next(err);
    }
  };

  /**
   * POST /api/v1/ledger/transfers
   * Executes internal transfer primitive with strict idempotency processing.
   */
  executeTransfer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.apiKeyContext!;

      const validation = internalTransferSchema.safeParse(req.body);
      if (!validation.success) {
        return next(new ValidationError("Invalid transfer payload", validation.error.format()));
      }

      const rawKey = req.headers["idempotency-key"] || req.headers["Idempotency-Key"];
      if (!rawKey || typeof rawKey !== "string" || rawKey.trim() === "") {
        return next(new ValidationError("Idempotency-Key header is required for state-mutating ledger transactions"));
      }

      const key = rawKey.trim();

      const result = await IdempotencyService.runIdempotent(
        projectId,
        key,
        req.body,
        86400,
        async () => {
          return await this.service.transfer({
            projectId,
            ...validation.data,
          });
        },
      );

      return res.status(201).json({ transaction: result });
    } catch (err) {
      return next(err);
    }
  };

  /**
   * POST /api/v1/transactions/:transactionId/reverse
   * Reverses a posted Journal.
   */
  reverseTransaction = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { transactionId } = req.params;
      const { projectId } = req.apiKeyContext!;

      const result = await this.service.reverse(transactionId, projectId);

      return res.status(200).json({ transaction: result });
    } catch (err) {
      return next(err);
    }
  };
}
export default LedgerController;
