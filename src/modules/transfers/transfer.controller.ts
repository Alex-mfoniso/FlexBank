import { Request, Response, NextFunction } from "express";
import { TransferService } from "./transfer.service";
import { ricarutTransferService } from "./ricarut-transfer.service";
import { ricarutWebhookService } from "./ricarut-webhook.service";
import {
  CreateTransferSchema,
  CreateDeveloperTransferSchema,
  QueryTransfersSchema,
} from "./transfer.schema";
import { logger } from "../../lib/logger";
import { ValidationError, TransferNotFoundError } from "../../lib/errors";

function maskAccountNumber(accNum?: string): string {
  if (!accNum) return "";
  if (accNum.length <= 4) return "****";
  return "*".repeat(accNum.length - 4) + accNum.slice(-4);
}

export class TransferController {
  private service = new TransferService();
  private ricarutService = ricarutTransferService;
  private webhookService = ricarutWebhookService;

  initiate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const projectId = req.apiKeyContext!.projectId;
      const idempotencyKey = req.header("Idempotency-Key") || "";

      // Check whether this is a direct developer transfer or legacy ledger transfer
      const isDeveloperTransfer =
        "bank_code" in req.body ||
        "bankCode" in req.body ||
        "account_number" in req.body ||
        "accountNumber" in req.body ||
        (!("sourceAccountId" in req.body) && !("type" in req.body));

      if (isDeveloperTransfer) {
        const validation = CreateDeveloperTransferSchema.safeParse(req.body);
        if (!validation.success) {
          return next(
            new ValidationError("Invalid transfer request payload", validation.error.format()),
          );
        }
        const data = validation.data;

        logger.info(
          {
            requestId: req.id,
            projectId,
            action: "transfer.initiate_developer",
            bankCode: data.bankCode,
            maskedAccountNumber: maskAccountNumber(data.accountNumber),
            amount: data.amount,
            currency: data.currency,
          },
          "Initiating developer transfer",
        );

        const result = await this.ricarutService.initiateTransfer(projectId, idempotencyKey, data);
        res.status(201).json({ data: result });
        return;
      }

      // Legacy ledger transfer flow
      const validation = CreateTransferSchema.safeParse(req.body);
      if (!validation.success) {
        return next(
          new ValidationError(
            "Invalid transfer creation payload details",
            validation.error.format(),
          ),
        );
      }
      const body = validation.data;

      // Mask sensitive beneficiary details in logs (Section 24)
      if (body.beneficiary) {
        logger.info(
          {
            requestId: req.id,
            projectId,
            action: "transfer.initiate_external",
            bankCode: body.beneficiary.bankCode,
            maskedAccountNumber: maskAccountNumber(body.beneficiary.accountNumber),
          },
          "Initiating external transfer with masked beneficiary account details",
        );
      } else {
        logger.info(
          {
            requestId: req.id,
            projectId,
            action: "transfer.initiate_internal",
          },
          "Initiating internal transfer",
        );
      }

      const result = await this.service.initiateTransfer(projectId, idempotencyKey, body);
      res.status(201).json({ status: "success", transfer: result });
    } catch (err) {
      next(err);
    }
  };

  get = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const projectId = req.apiKeyContext!.projectId;
      const transferId = req.params.transferId;

      // Check if it's a normalized developer transfer
      try {
        const devTransfer = await this.ricarutService.getTransfer(projectId, transferId);
        res.status(200).json({ data: devTransfer });
        return;
      } catch {
        // Fallback to legacy transfer lookup
        const result = await this.service.getTransfer(transferId, projectId);
        res.status(200).json({ status: "success", transfer: result });
      }
    } catch (err) {
      next(err);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const projectId = req.apiKeyContext!.projectId;
      const validation = QueryTransfersSchema.safeParse(req.query);
      if (!validation.success) {
        return next(new ValidationError("Invalid transfer query filters", validation.error.format()));
      }
      const query = validation.data;

      const result = await this.service.listTransfers(projectId, query);
      res.status(200).json({ status: "success", ...result });
    } catch (err) {
      next(err);
    }
  };

  syncStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const projectId = req.apiKeyContext!.projectId;
      const transferId = req.params.transferId;

      try {
        const result = await this.ricarutService.synchronizeTransferStatus(projectId, transferId);
        res.status(200).json({ status: "success", data: result, transfer: result });
        return;
      } catch (err) {
        if (err instanceof TransferNotFoundError) {
          const result = await this.service.syncTransferStatus(transferId, projectId);
          res.status(200).json({ status: "success", transfer: result });
          return;
        }
        throw err;
      }
    } catch (err) {
      next(err);
    }
  };

  handleWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const providerId = req.params.provider;
      const signature =
        req.header("x-paystack-signature") ||
        req.header("x-webhook-signature") ||
        req.header("X-Paystack-Signature") ||
        req.header("X-Webhook-Signature") ||
        "";

      const rawPayload =
        req.rawBody ||
        (typeof req.body === "string" ? req.body : JSON.stringify(req.body));

      logger.info(
        {
          requestId: req.id,
          providerId,
          signature: signature ? "present" : "missing",
        },
        "Received incoming webhook payload from provider",
      );

      const result = await this.webhookService.processWebhook(
        providerId,
        signature,
        rawPayload,
        req.body,
      );

      res.status(200).json({ status: "success", result: result.action });
    } catch (err) {
      next(err);
    }
  };
}
export default TransferController;
