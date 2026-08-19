import { AccountRepository } from "./account.repository";
import { CustomerRepository } from "../customers/customer.repository";
import { AccountNotFoundError, CustomerNotFoundError, InvalidAccountStateError } from "../../lib/errors";
import { Account, AccountStatus } from "@prisma/client";
import { WebhookService } from "../webhooks/webhook.service";

export class AccountService {
  constructor(
    private readonly accountRepo: AccountRepository,
    private readonly customerRepo: CustomerRepository,
  ) {}

  async createAccount(
    projectId: string,
    data: {
      customerId: string;
      currency: string;
      name: string;
    },
  ): Promise<Account> {
    // 1. Verify customer exists and is bound to the same project context
    const customer = await this.customerRepo.findById(data.customerId, projectId);
    if (!customer) {
      throw new CustomerNotFoundError("Target customer context for account creation does not exist in this project");
    }

    // 2. Perform creations
    const account = await this.accountRepo.create({
      projectId,
      ...data,
    });

    // Fire webhook asynchronously
    WebhookService.dispatch(projectId, "account.created", account);

    return account;
  }

  async getAccountById(id: string, projectId: string): Promise<Account> {
    const account = await this.accountRepo.findById(id, projectId);
    if (!account) {
      throw new AccountNotFoundError();
    }
    return account;
  }

  async listAccounts(
    projectId: string,
    filters: {
      customerId?: string;
      status?: AccountStatus;
    },
    limit?: number,
    cursor?: string,
  ): Promise<Account[]> {
    return this.accountRepo.list(projectId, filters, limit, cursor);
  }

  async updateAccount(
    id: string,
    projectId: string,
    data: {
      name?: string;
      status?: AccountStatus;
    },
  ): Promise<Account> {
    // 1. Verify existence in project
    const account = await this.accountRepo.findById(id, projectId);
    if (!account) {
      throw new AccountNotFoundError();
    }

    // 2. Enforce state machine constraints
    if (account.status === AccountStatus.closed) {
      throw new InvalidAccountStateError("Closed accounts are terminal and cannot be modified");
    }

    if (data.status && data.status !== account.status) {
      // Allowed transitions:
      // - active -> frozen OR closed
      // - frozen -> active OR closed
      // - closed -> none (handled above)
      const allowed =
        (account.status === AccountStatus.active &&
          (data.status === AccountStatus.frozen || data.status === AccountStatus.closed)) ||
        (account.status === AccountStatus.frozen &&
          (data.status === AccountStatus.active || data.status === AccountStatus.closed));

      if (!allowed) {
        throw new InvalidAccountStateError(
          `Unauthorized status transition from ${account.status} to ${data.status}`,
        );
      }
    }

    const updated = await this.accountRepo.update(id, projectId, data);

    // Fire webhooks on status changes asynchronously
    if (data.status && data.status !== account.status) {
      if (data.status === AccountStatus.frozen) {
        WebhookService.dispatch(projectId, "account.frozen", updated);
      } else if (data.status === AccountStatus.closed) {
        WebhookService.dispatch(projectId, "account.closed", updated);
      }
    }

    return updated;
  }
}
