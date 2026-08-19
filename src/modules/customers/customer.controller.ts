import { Request, Response, NextFunction } from "express";
import { CustomerService } from "./customer.service";
import { createCustomerSchema, updateCustomerSchema } from "./customer.schema";
import { ValidationError } from "../../lib/errors";

export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validation = createCustomerSchema.safeParse(req.body);
      if (!validation.success) {
        return next(new ValidationError("Invalid customer creation payload details", validation.error.format()));
      }

      const { projectId } = req.apiKeyContext!;
      const customer = await this.customerService.createCustomer(projectId, validation.data);

      return res.status(201).json({ customer });
    } catch (err) {
      return next(err);
    }
  };

  get = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { projectId } = req.apiKeyContext!;
      const customer = await this.customerService.getCustomerById(id, projectId);

      return res.status(200).json({ customer });
    } catch (err) {
      return next(err);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.apiKeyContext!;
      const { limit, cursor } = req.query;

      const parsedLimit = limit ? parseInt(limit as string, 10) : undefined;
      const customers = await this.customerService.listCustomers(
        projectId,
        parsedLimit,
        cursor as string,
      );

      return res.status(200).json({ customers });
    } catch (err) {
      return next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { projectId } = req.apiKeyContext!;

      const validation = updateCustomerSchema.safeParse(req.body);
      if (!validation.success) {
        return next(new ValidationError("Invalid customer update payload details", validation.error.format()));
      }

      const customer = await this.customerService.updateCustomer(id, projectId, validation.data);

      return res.status(200).json({ customer });
    } catch (err) {
      return next(err);
    }
  };
}
