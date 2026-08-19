import { Router } from "express";
import { TransferController } from "./transfer.controller";
import { authenticateUserOrApiKey, resolveProjectContext } from "../../middleware/auth";

const router = Router();
const controller = new TransferController();

// 1. Authorized financial transfer routes
router.post(
  "/transfers",
  authenticateUserOrApiKey,
  resolveProjectContext,
  controller.initiate,
);

router.get(
  "/transfers",
  authenticateUserOrApiKey,
  resolveProjectContext,
  controller.list,
);

router.get(
  "/transactions",
  authenticateUserOrApiKey,
  resolveProjectContext,
  controller.list,
);

router.get(
  "/transfers/:transferId",
  authenticateUserOrApiKey,
  resolveProjectContext,
  controller.get,
);

router.get(
  "/transactions/:transactionId",
  authenticateUserOrApiKey,
  resolveProjectContext,
  (req, res, next) => {
    req.params.transferId = req.params.transactionId; // Remap parameter name
    controller.get(req, res, next);
  },
);

router.get(
  "/transfers/:transferId/status",
  authenticateUserOrApiKey,
  resolveProjectContext,
  controller.syncStatus,
);

// 2. Public webhooks endpoint (unauthenticated, signature checked internally)
router.post(
  "/webhooks/:provider",
  controller.handleWebhook,
);

export default router;
