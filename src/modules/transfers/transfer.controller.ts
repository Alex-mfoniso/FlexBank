import { Request, Response, NextFunction } from "express";
import { TransferService } from "./transfer.service";
import { CreateTransferSchema, QueryTransfersSchema } from "./transfer.schema";
import { logger } from "../../lib/logger";

function maskAccountNumber(accNum?: string): string {
  if (!accNum) return "";
  if (accNum.length <= 4) return "****";
  return "*".repeat(accNum.length - 4) + accNum.slice(-4);
}

export class TransferController {
  private service = new TransferService();

  initiate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const projectId = req.apiKeyContext!.projectId;
      const idempotencyKey = req.header("Idempotency-Key") || "";

      const body = CreateTransferSchema.parse(req.body);

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

      const result = await this.service.getTransfer(transferId, projectId);
      res.status(200).json({ status: "success", transfer: result });
    } catch (err) {
      next(err);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const projectId = req.apiKeyContext!.projectId;
      const query = QueryTransfersSchema.parse(req.query);

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

      const result = await this.service.syncTransferStatus(transferId, projectId);
      res.status(200).json({ status: "success", transfer: result });
    } catch (err) {
      next(err);
    }
  };

  handleWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const providerId = req.params.provider;
      const signature = req.header("X-Webhook-Signature") || "";
      const rawBody = JSON.stringify(req.body);

      logger.info(
        {
          requestId: req.id,
          providerId,
          signature: signature ? "present" : "missing",
        },
        "Received incoming webhook payload from provider",
      );

      const result = await this.service.processWebhook(providerId, signature, rawBody, req.body);
      res.status(200).json({ status: "success", result: result.status });
    } catch (err) {
      next(err);
    }
  };
}
export default TransferController;
