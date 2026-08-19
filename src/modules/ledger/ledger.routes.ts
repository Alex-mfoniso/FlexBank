import { Router } from "express";
import { LedgerController } from "./ledger.controller";
import { authenticateUserOrApiKey, resolveProjectContext } from "../../middleware/auth";

const router = Router();
const controller = new LedgerController();

/**
 * State-mutating financial primitive routes
 */
router.post(
  "/ledger/transfers",
  authenticateUserOrApiKey,
  resolveProjectContext,
  controller.executeTransfer,
);

router.post(
  "/transactions/:transactionId/reverse",
  authenticateUserOrApiKey,
  resolveProjectContext,
  controller.reverseTransaction,
);

/**
 * Ledger history and balance retrieval routes
 */
router.get(
  "/accounts/:accountId/balance",
  authenticateUserOrApiKey,
  resolveProjectContext,
  controller.getAccountBalance,
);

router.get(
  "/accounts/:accountId/ledger",
  authenticateUserOrApiKey,
  resolveProjectContext,
  controller.getAccountLedger,
);

router.get(
  "/transactions/:transactionId",
  authenticateUserOrApiKey,
  resolveProjectContext,
  controller.getTransaction,
);

export default router;
