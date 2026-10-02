import { Router } from "express";
import { TransferController } from "./transfer.controller";
import { authenticateUserOrApiKey, resolveProjectContext } from "../../middleware/auth";
import {
  createTransferRateLimiter,
  getTransferRateLimiter,
  webhookRateLimiter,
} from "../../middleware/rate-limiter";

const router = Router();
const controller = new TransferController();

// 1. Authorized financial transfer routes
router.post(
  "/transfers",
  createTransferRateLimiter,
  authenticateUserOrApiKey,
  resolveProjectContext,
  controller.initiate,
);

router.get(
  "/transfers",
  getTransferRateLimiter,
  authenticateUserOrApiKey,
  resolveProjectContext,
  controller.list,
);

router.get(
  "/transactions",
  getTransferRateLimiter,
  authenticateUserOrApiKey,
  resolveProjectContext,
  controller.list,
);

router.get(
  "/transfers/:transferId",
  getTransferRateLimiter,
  authenticateUserOrApiKey,
  resolveProjectContext,
  controller.get,
);

router.get(
  "/transactions/:transactionId",
  getTransferRateLimiter,
  authenticateUserOrApiKey,
  resolveProjectContext,
  (req, res, next) => {
    req.params.transferId = req.params.transactionId; // Remap parameter name
    controller.get(req, res, next);
  },
);

router.get(
  "/transfers/:transferId/status",
  getTransferRateLimiter,
  authenticateUserOrApiKey,
  resolveProjectContext,
  controller.syncStatus,
);

router.post(
  "/transfers/:transferId/verify",
  authenticateUserOrApiKey,
  resolveProjectContext,
  controller.syncStatus,
);

// 2. Reconciliation endpoints
router.post(
  "/transfers/:transferId/reconcile",
  authenticateUserOrApiKey,
  resolveProjectContext,
  controller.reconcile,
);

router.get(
  "/transfers/:transferId/reconciliations",
  authenticateUserOrApiKey,
  resolveProjectContext,
  controller.getReconciliations,
);

// 3. Public webhooks endpoints (unauthenticated, signature checked internally, generous rate limit)
router.post(
  "/webhooks/paystack",
  webhookRateLimiter,
  (req, res, next) => {
    (req.params as any).provider = "paystack";
    controller.handleWebhook(req, res, next);
  },
);

router.post(
  "/webhooks/mpesa/b2c",
  webhookRateLimiter,
  (req, res, next) => {
    (req.params as any).provider = "mpesa";
    controller.handleWebhook(req, res, next);
  },
);

router.post(
  "/webhooks/mpesa/b2c/timeout",
  webhookRateLimiter,
  (req, res, next) => {
    (req.params as any).provider = "mpesa";
    (req as any).isTimeout = true;
    controller.handleWebhook(req, res, next);
  },
);

router.post(
  "/webhooks/:provider",
  webhookRateLimiter,
  controller.handleWebhook,
);

export default router;
