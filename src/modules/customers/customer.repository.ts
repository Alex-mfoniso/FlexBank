import { prisma } from "../../lib/prisma";
import { Customer, CustomerStatus, Prisma } from "@prisma/client";
import crypto from "crypto";

export class CustomerRepository {
  /**
   * Generates a collision-resistant prefix-based identifier for a Customer.
   */
  private generateCustomerId(): string {
    const uuid = crypto.randomUUID().replace(/-/g, "");
    return `cus_${uuid}`;
  }

  async create(data: {
    projectId: string;
    externalId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    metadata?: Prisma.InputJsonValue | null;
  }): Promise<Customer> {
    const id = this.generateCustomerId();
    return prisma.customer.create({
      data: {
        id,
        projectId: data.projectId,
        externalId: data.externalId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone || null,
        metadata: data.metadata ?? undefined,
      },
    });
  }

  async findById(id: string, projectId: string): Promise<Customer | null> {
    return prisma.customer.findFirst({
      where: {
        id,
        projectId,
      },
    });
  }

  async findByExternalId(externalId: string, projectId: string): Promise<Customer | null> {
    return prisma.customer.findUnique({
      where: {
        externalId_projectId: {
          externalId,
          projectId,
        },
      },
    });
  }

  async list(projectId: string, limit = 100, cursor?: string): Promise<Customer[]> {
    return prisma.customer.findMany({
      where: { projectId },
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
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string | null;
      status?: CustomerStatus;
      metadata?: Prisma.InputJsonValue | null;
    },
  ): Promise<Customer> {
    const { metadata, ...rest } = data;
    return prisma.customer.update({
      where: {
        id,
      },
      data: {
        ...rest,
        metadata: metadata ?? undefined,
      },
    });
  }
}
