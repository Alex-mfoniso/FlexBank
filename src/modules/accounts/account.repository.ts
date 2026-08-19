import { prisma } from "../../lib/prisma";
import { Account, AccountStatus } from "@prisma/client";
import crypto from "crypto";

export class AccountRepository {
  /**
   * Generates a collision-resistant prefix-based identifier for an Account.
   */
  private generateAccountId(): string {
    const uuid = crypto.randomUUID().replace(/-/g, "");
    return `acc_${uuid}`;
  }

  async create(data: {
    customerId: string;
    projectId: string;
    currency: string;
    name: string;
  }): Promise<Account> {
    const id = this.generateAccountId();
    return prisma.account.create({
      data: {
        id,
        customerId: data.customerId,
        projectId: data.projectId,
        currency: data.currency,
        name: data.name,
        status: AccountStatus.active,
        available: 0,
        pending: 0,
      },
    });
  }

  async findById(id: string, projectId: string): Promise<Account | null> {
    return prisma.account.findFirst({
      where: {
        id,
        projectId,
      },
    });
  }

  async list(
    projectId: string,
    filters: {
      customerId?: string;
      status?: AccountStatus;
    },
    limit = 100,
    cursor?: string,
  ): Promise<Account[]> {
    return prisma.account.findMany({
      where: {
        projectId,
        customerId: filters.customerId || undefined,
        status: filters.status || undefined,
      },
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: "desc" },
    });
  }

  async update(
    id: string,
    _projectId: string,
    data: {
      name?: string;
      status?: AccountStatus;
    },
  ): Promise<Account> {
    return prisma.account.update({
      where: {
        id,
      },
      data,
    });
  }
}
