import { Request, Response, NextFunction } from "express";
import { AccountService } from "./account.service";
import { createAccountSchema, updateAccountSchema } from "./account.schema";
import { ValidationError } from "../../lib/errors";
import { AccountStatus } from "@prisma/client";

export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validation = createAccountSchema.safeParse(req.body);
      if (!validation.success) {
        return next(new ValidationError("Invalid account creation payload details", validation.error.format()));
      }

      const { projectId } = req.apiKeyContext!;
      const account = await this.accountService.createAccount(projectId, validation.data);

      return res.status(201).json({ account });
    } catch (err) {
      return next(err);
    }
  };

  get = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { projectId } = req.apiKeyContext!;
      const account = await this.accountService.getAccountById(id, projectId);

      return res.status(200).json({ account });
    } catch (err) {
      return next(err);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.apiKeyContext!;
      const { customerId, status, limit, cursor } = req.query;

      const parsedLimit = limit ? parseInt(limit as string, 10) : undefined;
      const parsedStatus = status ? (status as AccountStatus) : undefined;

      const accounts = await this.accountService.listAccounts(
        projectId,
        {
          customerId: customerId as string,
          status: parsedStatus,
        },
        parsedLimit,
        cursor as string,
      );

      return res.status(200).json({ accounts });
    } catch (err) {
      return next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { projectId } = req.apiKeyContext!;

      const validation = updateAccountSchema.safeParse(req.body);
      if (!validation.success) {
        return next(new ValidationError("Invalid account update payload details", validation.error.format()));
      }

      const account = await this.accountService.updateAccount(id, projectId, validation.data);

      return res.status(200).json({ account });
    } catch (err) {
      return next(err);
    }
  };
}
