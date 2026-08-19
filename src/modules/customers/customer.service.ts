import { CustomerRepository } from "./customer.repository";
import { DuplicateExternalIdError, CustomerNotFoundError } from "../../lib/errors";
import { Customer, CustomerStatus, Prisma } from "@prisma/client";
import { WebhookService } from "../webhooks/webhook.service";

export class CustomerService {
  constructor(private readonly customerRepo: CustomerRepository) {}

  async createCustomer(
    projectId: string,
    data: {
      externalId: string;
      firstName: string;
      lastName: string;
      email: string;
      phone?: string | null;
      metadata?: Prisma.InputJsonValue | null;
    },
  ): Promise<Customer> {
    // Check for duplicate external ID inside the project context
    const existing = await this.customerRepo.findByExternalId(data.externalId, projectId);
    if (existing) {
      throw new DuplicateExternalIdError();
    }

    const customer = await this.customerRepo.create({
      projectId,
      ...data,
    });

    // Fire webhook asynchronously
    WebhookService.dispatch(projectId, "customer.created", customer);

    return customer;
  }

  async getCustomerById(id: string, projectId: string): Promise<Customer> {
    const customer = await this.customerRepo.findById(id, projectId);
    if (!customer) {
      throw new CustomerNotFoundError();
    }
    return customer;
  }

  async listCustomers(projectId: string, limit?: number, cursor?: string): Promise<Customer[]> {
    return this.customerRepo.list(projectId, limit, cursor);
  }

  async updateCustomer(
    id: string,
    projectId: string,
    data: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string | null;
      status?: CustomerStatus;
      metadata?: Prisma.InputJsonValue | null;
    },
  ): Promise<Customer> {
    // Verify existence and project context before updating
    const existing = await this.customerRepo.findById(id, projectId);
    if (!existing) {
      throw new CustomerNotFoundError();
    }

    const customer = await this.customerRepo.update(id, projectId, data);

    // Fire webhook asynchronously
    WebhookService.dispatch(projectId, "customer.updated", customer);

    return customer;
  }
}
