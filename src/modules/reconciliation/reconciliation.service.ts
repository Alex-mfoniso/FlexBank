import { TransferStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { logger } from "../../lib/logger";
import { TransferNotFoundError, ProviderUnavailableError } from "../../lib/errors";
import { ProviderRegistry, providerRegistry } from "../providers/provider.registry";
import { TransferStateService, transferStateService } from "../transfers/transfer-state.service";
import { isValidTransferTransition } from "../transfers/transfer-state-machine";
import { ProviderTransfer } from "../providers/contracts/provider.types";
import { providerMetrics } from "../providers/provider-metrics";

export type ReconciliationOutcome =
  | "matched"
  | "reconciled"
  | "mismatch"
  | "unresolvable"
  | "error";

export interface ReconciliationResult {
  transferId: string;
  projectId: string;
  provider: string;
  providerReference: string | null;
  previousStatus: string;
  providerStatus: string;
  resultingStatus: string;
  outcome: ReconciliationOutcome;
  details?: Record<string, unknown>;
  checkedAt: Date;
}

export interface ReconcileBatchSummary {
  totalChecked: number;
  matched: number;
  reconciled: number;
  mismatch: number;
  unresolvable: number;
  errors: number;
}

/**
 * Service for cross-checking and reconciling Ricarut transfer states against upstream providers.
 * Audits discrepancy records in the database and applies verified transitions safely.
 */
export class ReconciliationService {
  constructor(
    private readonly registry: ProviderRegistry = providerRegistry,
    private readonly stateService: TransferStateService = transferStateService,
  ) {}

  /**
   * Reconciles a single transfer by actively querying the upstream provider.
   */
  async reconcileTransfer(transferId: string): Promise<ReconciliationResult> {
    const transfer = await prisma.transfer.findUnique({
      where: { id: transferId },
    });

    if (!transfer) {
      throw new TransferNotFoundError(`Transfer with ID "${transferId}" not found`);
    }

    const providerId =
      transfer.providerId ||
      ((transfer.metadata as any)?.rail === "mpesa" || transfer.currency === "KES"
        ? "mpesa"
        : "paystack");

    const transferProvider = this.registry.resolveTransfer(providerId);
    if (!transferProvider) {
      throw new ProviderUnavailableError(`Provider "${providerId}" unavailable for transfer reconciliation`);
    }

    let providerTransfer: ProviderTransfer | null = null;
    let queryError: string | null = null;

    try {
      // Query upstream provider status
      providerTransfer = await transferProvider.verifyTransfer({
        transferReference: transfer.providerReference || transfer.reference || transfer.id,
      });
    } catch (err: any) {
      logger.warn(
        { transferId, providerId, err: err?.message },
        "Error querying provider during transfer reconciliation",
      );
      queryError = err?.message || "Failed to query upstream provider";
    }

    const checkedAt = new Date();
    const previousStatus = transfer.status;

    if (!providerTransfer) {
      // Upstream provider query failed or returned no response
      const outcome: ReconciliationOutcome = "unresolvable";
      await prisma.reconciliationRecord.create({
        data: {
          transferId: transfer.id,
          projectId: transfer.projectId,
          provider: providerId,
          providerReference: transfer.providerReference,
          previousStatus,
          providerStatus: "unknown",
          resultingStatus: previousStatus,
          outcome,
          details: { error: queryError },
          checkedAt,
        },
      });

      return {
        transferId: transfer.id,
        projectId: transfer.projectId,
        provider: providerId,
        providerReference: transfer.providerReference,
        previousStatus,
        providerStatus: "unknown",
        resultingStatus: previousStatus,
        outcome,
        details: { error: queryError },
        checkedAt,
      };
    }

    const providerStatus = providerTransfer.status;
    let resultingStatus = previousStatus;
    let outcome: ReconciliationOutcome = "matched";

    if (previousStatus === providerStatus) {
      outcome = "matched";
      resultingStatus = previousStatus;
    } else {
      // Status discrepancy detected! Check if transition is legally permitted
      const isValidTransition = isValidTransferTransition(
        previousStatus as TransferStatus,
        providerStatus as TransferStatus,
      );

      if (isValidTransition) {
        // Safe progression forward (e.g. pending -> successful or processing -> failed)
        await this.stateService.transition(transfer.id, providerStatus as TransferStatus, {
          providerReference: providerTransfer.providerReference || transfer.providerReference || undefined,
          strict: false,
          metadata: {
            reconciledBy: "reconciliation_service",
            providerFee: providerTransfer.fee,
          },
        });

        resultingStatus = providerStatus;
        outcome = "reconciled";

        logger.info(
          {
            transferId: transfer.id,
            previousStatus,
            newStatus: providerStatus,
            provider: providerId,
          },
          "Reconciliation successfully updated transfer state from upstream provider",
        );
      } else {
        // Illegal transition: e.g. Ricarut is already 'successful', but provider says 'pending'
        // Terminal state protected! Do not downgrade.
        outcome = "mismatch";
        resultingStatus = previousStatus;
        providerMetrics.recordReconciliationMismatch(providerId);

        logger.warn(
          {
            transferId: transfer.id,
            currentStatus: previousStatus,
            providerStatus,
          },
          "Reconciliation mismatch: upstream provider status would violate state machine; retaining current state",
        );
      }
    }

    // Persist reconciliation audit record in database
    await prisma.reconciliationRecord.create({
      data: {
        transferId: transfer.id,
        projectId: transfer.projectId,
        provider: providerId,
        providerReference: providerTransfer.providerReference || transfer.providerReference,
        previousStatus,
        providerStatus,
        resultingStatus,
        outcome,
        details: {
          fee: providerTransfer.fee,
          initiatedAt: providerTransfer.initiatedAt,
        },
        checkedAt,
      },
    });

    return {
      transferId: transfer.id,
      projectId: transfer.projectId,
      provider: providerId,
      providerReference: providerTransfer.providerReference || transfer.providerReference,
      previousStatus,
      providerStatus,
      resultingStatus,
      outcome,
      details: {
        fee: providerTransfer.fee,
      },
      checkedAt,
    };
  }

  /**
   * Reconciles all pending/processing transfers older than a specified duration.
   */
  async reconcilePendingTransfers(
    projectId?: string,
    olderThanMinutes: number = 5,
    limit: number = 50,
  ): Promise<ReconcileBatchSummary> {
    const cutoffDate = new Date(Date.now() - olderThanMinutes * 60 * 1000);

    const pendingTransfers = await prisma.transfer.findMany({
      where: {
        ...(projectId ? { projectId } : {}),
        status: { in: ["pending", "processing"] },
        createdAt: { lte: cutoffDate },
      },
      take: limit,
      orderBy: { createdAt: "asc" },
    });

    const summary: ReconcileBatchSummary = {
      totalChecked: pendingTransfers.length,
      matched: 0,
      reconciled: 0,
      mismatch: 0,
      unresolvable: 0,
      errors: 0,
    };

    for (const transfer of pendingTransfers) {
      try {
        const result = await this.reconcileTransfer(transfer.id);
        if (result.outcome === "matched") summary.matched++;
        else if (result.outcome === "reconciled") summary.reconciled++;
        else if (result.outcome === "mismatch") summary.mismatch++;
        else if (result.outcome === "unresolvable") summary.unresolvable++;
      } catch (err: any) {
        logger.error(
          { transferId: transfer.id, err: err?.message },
          "Failed to reconcile transfer during batch sweep",
        );
        summary.errors++;
      }
    }

    return summary;
  }

  /**
   * Retrieves the reconciliation audit history for a given transfer.
   */
  async getReconciliationHistory(transferId: string) {
    return await prisma.reconciliationRecord.findMany({
      where: { transferId },
      orderBy: { checkedAt: "desc" },
    });
  }
}

export const reconciliationService = new ReconciliationService();
