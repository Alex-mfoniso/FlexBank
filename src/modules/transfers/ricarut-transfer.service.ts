import crypto from "crypto";
import { prisma } from "../../lib/prisma";
import { Money } from "../../lib/money";
import { logger } from "../../lib/logger";
import {
  ConflictError,
  IdempotencyKeyReusedError,
  TransferNotFoundError,
} from "../../lib/errors";
import { ProviderRegistry, providerRegistry } from "../providers/provider.registry";
import { CreateDeveloperTransferInput } from "./transfer.schema";
import { ProviderTransferStatus } from "../providers/contracts/provider.types";
import { isValidTransferTransition } from "./transfer-state-machine";
import { TransferStatus } from "@prisma/client";

export interface NormalizedTransfer {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: ProviderTransferStatus;
  bank_code: string;
  account_number: string;
  account_name?: string;
  destination: {
    bank_code: string;
    account_number: string;
    account_name?: string;
  };
  reason?: string;
  provider: string;
  environment: string;
  created_at: string;
  updated_at: string;
}

/**
 * Core Ricarut Transfer Service.
 * Decoupled from any specific financial provider.
 * Interacts exclusively with TransferProvider capability via ProviderRegistry.
 */
export class RicarutTransferService {
  constructor(private readonly registry: ProviderRegistry = providerRegistry) {}

  /**
   * Generates a deterministic SHA-256 hash representation of a given request payload.
   */
  private generatePayloadHash(payload: unknown): string {
    const str = typeof payload === "string" ? payload : JSON.stringify(payload || {});
    return crypto.createHash("sha256").update(str).digest("hex");
  }

  /**
   * Masks a bank account number for secure logging: "0123456789" -> "******6789"
   */
  private maskAccountNumber(accountNumber: string): string {
    if (!accountNumber || accountNumber.length < 4) return "******";
    return `******${accountNumber.slice(-4)}`;
  }

  /**
   * Initiates a public Ricarut developer transfer.
   */
  async initiateTransfer(
    projectId: string,
    idempotencyKey: string | undefined,
    input: CreateDeveloperTransferInput,
    providerId?: string,
  ): Promise<NormalizedTransfer> {
    // 1. Money safety check (ensures positive integer in minor units)
    Money.validate(input.amount);

    const idempotencyKeyToUse = idempotencyKey || input.reference;
    const requestHash = this.generatePayloadHash(input);

    // 2. Check Idempotency Record scoped strictly to authenticated project
    const existingIdem = await prisma.idempotencyRecord.findUnique({
      where: {
        projectId_key: {
          projectId,
          key: idempotencyKeyToUse,
        },
      },
    });

    if (existingIdem) {
      if (existingIdem.requestHash !== requestHash) {
        throw new IdempotencyKeyReusedError(
          `Idempotency key "${idempotencyKeyToUse}" has already been used for a different request payload.`,
        );
      }
      if (existingIdem.status === "pending") {
        throw new ConflictError("An operation with this idempotency key is already in progress.");
      }
      if (existingIdem.status === "completed" && existingIdem.response) {
        if (existingIdem.resourceId) {
          try {
            return await this.getTransfer(projectId, existingIdem.resourceId);
          } catch {
            return existingIdem.response as unknown as NormalizedTransfer;
          }
        }
        return existingIdem.response as unknown as NormalizedTransfer;
      }
    }

    // 3. Check for developer reference uniqueness within the project
    const existingTransfer = await prisma.transfer.findFirst({
      where: {
        projectId,
        reference: input.reference,
      },
    });

    if (existingTransfer) {
      throw new ConflictError(
        `A transfer with reference "${input.reference}" already exists for this project.`,
      );
    }

    // 4. Resolve Transfer Provider capability via Registry (pure abstraction)
    const transferProvider = this.registry.resolveTransfer(providerId);

    // 5. Register or update idempotency record to pending
    const expiresAt = new Date(Date.now() + 86400 * 1000); // 24 hours
    await prisma.idempotencyRecord.upsert({
      where: {
        projectId_key: {
          projectId,
          key: idempotencyKeyToUse,
        },
      },
      create: {
        projectId,
        key: idempotencyKeyToUse,
        requestHash,
        status: "pending",
        expiresAt,
      },
      update: {
        requestHash,
        status: "pending",
        expiresAt,
      },
    });

    // 6. Generate Ricarut Transfer ID
    const transferId = `txn_ric_${crypto.randomUUID().replace(/-/g, "")}`;

    // 7. Persist initial Transfer record in PostgreSQL with pending status
    const transfer = await prisma.transfer.create({
      data: {
        id: transferId,
        projectId,
        reference: input.reference,
        amount: input.amount,
        currency: input.currency,
        status: "pending",
        direction: "outbound",
        type: "external",
        providerId: transferProvider.id,
        metadata: {
          bank_code: input.bankCode,
          account_number: input.accountNumber,
          account_name: input.accountName,
          reason: input.reason,
        },
      },
    });

    logger.info(
      {
        transferId: transfer.id,
        reference: input.reference,
        provider: transferProvider.id,
        bankCode: input.bankCode,
        accountNumber: this.maskAccountNumber(input.accountNumber),
        amount: input.amount,
        currency: input.currency,
      },
      "Initiating transfer through provider abstraction",
    );

    // 8. Execute Provider Transfer Initiation
    try {
      const providerTransfer = await transferProvider.initiateTransfer({
        amount: input.amount,
        reference: transfer.id,
        currency: input.currency,
        bankCode: input.bankCode,
        accountNumber: input.accountNumber,
        accountName: input.accountName,
        reason: input.reason,
      });

      // Update Transfer with provider details and normalized status
      const updatedTransfer = await prisma.transfer.update({
        where: { id: transfer.id },
        data: {
          status: providerTransfer.status,
          providerReference: providerTransfer.providerReference || null,
          completedAt: providerTransfer.status === "successful" ? new Date() : null,
          metadata: {
            bank_code: input.bankCode,
            account_number: input.accountNumber,
            account_name: input.accountName,
            reason: input.reason,
            fee: providerTransfer.fee,
          },
        },
      });

      // Record Provider Transaction audit entry
      await prisma.providerTransaction.create({
        data: {
          transferId: transfer.id,
          provider: transferProvider.id,
          providerReference: providerTransfer.providerReference || null,
          status: providerTransfer.status,
          responseMetadata: {
            fee: providerTransfer.fee,
            initiatedAt: providerTransfer.initiatedAt,
          },
        },
      });

      const normalizedResponse: NormalizedTransfer = {
        id: updatedTransfer.id,
        reference: updatedTransfer.reference,
        amount: updatedTransfer.amount,
        currency: updatedTransfer.currency,
        status: providerTransfer.status,
        bank_code: input.bankCode,
        account_number: input.accountNumber,
        account_name: input.accountName,
        destination: {
          bank_code: input.bankCode,
          account_number: input.accountNumber,
          account_name: input.accountName,
        },
        reason: input.reason,
        provider: transferProvider.id,
        environment: "test",
        created_at: updatedTransfer.createdAt.toISOString(),
        updated_at: updatedTransfer.updatedAt.toISOString(),
      };

      // Mark idempotency completed with normalized response payload
      await prisma.idempotencyRecord.update({
        where: {
          projectId_key: {
            projectId,
            key: idempotencyKeyToUse,
          },
        },
        data: {
          status: "completed",
          response: normalizedResponse as any,
          resourceId: transfer.id,
        },
      });

      return normalizedResponse;
    } catch (err: any) {
      // Check for timeout vs immediate failure
      const isTimeout = err?.code === "PROVIDER_TIMEOUT" || err?.statusCode === 504;
      const statusToSet = isTimeout ? "processing" : "failed";

      await prisma.transfer.update({
        where: { id: transfer.id },
        data: {
          status: statusToSet,
          failureCode: err?.code || "TRANSFER_FAILED",
          failureMessage: err?.message,
        },
      });

      // Mark idempotency failed so user can retry, or keep pending if in ambiguous timeout
      await prisma.idempotencyRecord.update({
        where: {
          projectId_key: {
            projectId,
            key: idempotencyKeyToUse,
          },
        },
        data: {
          status: isTimeout ? "pending" : "failed",
        },
      });

      throw err;
    }
  }

  /**
   * Retrieves a transfer by its Ricarut ID or reference, scoped strictly to the authenticated project.
   */
  async getTransfer(projectId: string, transferIdOrRef: string): Promise<NormalizedTransfer> {
    const transfer = await prisma.transfer.findFirst({
      where: {
        projectId,
        OR: [{ id: transferIdOrRef }, { reference: transferIdOrRef }],
      },
    });

    if (!transfer) {
      throw new TransferNotFoundError(`Transfer "${transferIdOrRef}" not found`);
    }

    const metadata = (transfer.metadata as any) || {};

    return {
      id: transfer.id,
      reference: transfer.reference,
      amount: transfer.amount,
      currency: transfer.currency,
      status: transfer.status as ProviderTransferStatus,
      bank_code: metadata.bank_code || "",
      account_number: metadata.account_number || "",
      account_name: metadata.account_name,
      destination: {
        bank_code: metadata.bank_code || "",
        account_number: metadata.account_number || "",
        account_name: metadata.account_name,
      },
      reason: metadata.reason,
      provider: transfer.providerId || "paystack",
      environment: "test",
      created_at: transfer.createdAt.toISOString(),
      updated_at: transfer.updatedAt.toISOString(),
    };
  }

  /**
   * Lists transfers scoped to the authenticated project.
   */
  async listTransfers(
    projectId: string,
    options?: { limit?: number; status?: string },
  ): Promise<NormalizedTransfer[]> {
    const transfers = await prisma.transfer.findMany({
      where: {
        projectId,
        ...(options?.status ? { status: options.status as any } : {}),
      },
      take: options?.limit || 50,
      orderBy: { createdAt: "desc" },
    });

    return transfers.map((t) => {
      const metadata = (t.metadata as any) || {};
      return {
        id: t.id,
        reference: t.reference,
        amount: t.amount,
        currency: t.currency,
        status: t.status as ProviderTransferStatus,
        bank_code: metadata.bank_code || "",
        account_number: metadata.account_number || "",
        account_name: metadata.account_name,
        destination: {
          bank_code: metadata.bank_code || "",
          account_number: metadata.account_number || "",
          account_name: metadata.account_name,
        },
        reason: metadata.reason,
        provider: t.providerId || "paystack",
        environment: "test",
        created_at: t.createdAt.toISOString(),
        updated_at: t.updatedAt.toISOString(),
      };
    });
  }

  /**
   * Actively synchronizes and reconciles a transfer status with the upstream financial provider.
   * Protects terminal states and enforces valid state machine transitions.
   */
  async synchronizeTransferStatus(
    projectId: string,
    transferIdOrRef: string,
  ): Promise<NormalizedTransfer> {
    const transfer = await prisma.transfer.findFirst({
      where: {
        projectId,
        OR: [{ id: transferIdOrRef }, { reference: transferIdOrRef }],
      },
    });

    if (!transfer) {
      throw new TransferNotFoundError(`Transfer "${transferIdOrRef}" not found`);
    }

    // Terminal states cannot regress or change via poll
    if (
      transfer.status === "successful" ||
      transfer.status === "failed" ||
      transfer.status === "reversed" ||
      transfer.status === "cancelled"
    ) {
      return this.getTransfer(projectId, transfer.id);
    }

    if (!transfer.providerId) {
      return this.getTransfer(projectId, transfer.id);
    }

    try {
      const provider = this.registry.resolveTransfer(transfer.providerId);
      const verified = await provider.verifyTransfer({
        providerReference: transfer.providerReference || undefined,
        reference: transfer.id,
      });

      const currentStatus = transfer.status as TransferStatus;
      const targetStatus = verified.status as TransferStatus;

      if (isValidTransferTransition(currentStatus, targetStatus)) {
        if (currentStatus !== targetStatus) {
          await prisma.transfer.update({
            where: { id: transfer.id },
            data: {
              status: targetStatus,
              completedAt:
                targetStatus === "successful"
                  ? verified.completedAt || new Date()
                  : transfer.completedAt,
              failureCode:
                targetStatus === "failed"
                  ? verified.failureReason || "TRANSFER_FAILED"
                  : transfer.failureCode,
              failureMessage:
                targetStatus === "failed" ? verified.failureReason : transfer.failureMessage,
            },
          });

          await prisma.providerTransaction.create({
            data: {
              transferId: transfer.id,
              provider: provider.id,
              providerReference: verified.providerReference || transfer.providerReference,
              status: targetStatus,
              responseMetadata: {
                fee: verified.fee,
                failureReason: verified.failureReason,
                synchronizedAt: new Date().toISOString(),
              },
            },
          });

          logger.info(
            {
              transferId: transfer.id,
              previousStatus: currentStatus,
              newStatus: targetStatus,
            },
            "Synchronized transfer status with provider verification",
          );
        }
      } else {
        logger.warn(
          {
            transferId: transfer.id,
            currentStatus,
            targetStatus,
          },
          "Ignoring provider status regression during status synchronization",
        );
      }
    } catch (err: any) {
      logger.error(
        { transferId: transfer.id, err: err?.message },
        "Provider verification inquiry failed; preserving existing transfer status",
      );
    }

    return this.getTransfer(projectId, transfer.id);
  }
}

export const ricarutTransferService = new RicarutTransferService();
