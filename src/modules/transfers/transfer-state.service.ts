import { TransferStatus, Transfer } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { logger } from "../../lib/logger";
import { InvalidTransferStateError, TransferNotFoundError } from "../../lib/errors";
import { isValidTransferTransition } from "./transfer-state-machine";

export interface TransitionTransferOptions {
  failureCode?: string;
  failureMessage?: string;
  providerReference?: string;
  metadata?: Record<string, unknown>;
  eventId?: string;
  strict?: boolean;
}

export interface TransitionTransferResult {
  transfer: Transfer;
  transitioned: boolean;
  previousStatus: TransferStatus;
}

/**
 * Centralized service for executing transfer state transitions.
 * Enforces transaction invariants, prevents illegal regressions from terminal states,
 * and maintains structured transition logs across the entire system.
 */
export class TransferStateService {
  /**
   * Transitions a transfer record to a new status.
   * Runs within an atomic database transaction.
   *
   * @param transferId The ID of the transfer (e.g. txn_ric_...)
   * @param nextStatus The intended target status
   * @param options Failure context, provider references, metadata, and strictness
   */
  async transition(
    transferId: string,
    nextStatus: TransferStatus,
    options: TransitionTransferOptions = {},
  ): Promise<TransitionTransferResult> {
    const { strict = true, failureCode, failureMessage, providerReference, metadata, eventId } = options;

    return await prisma.$transaction(async (tx) => {
      const transfer = await tx.transfer.findUnique({
        where: { id: transferId },
      });

      if (!transfer) {
        throw new TransferNotFoundError(`Transfer with ID "${transferId}" not found`);
      }

      const currentStatus = transfer.status as TransferStatus;

      // Identity transition (no-op)
      if (currentStatus === nextStatus) {
        logger.info(
          { transferId, currentStatus, nextStatus },
          "State transition identity no-op; transfer already in target status",
        );
        return {
          transfer,
          transitioned: false,
          previousStatus: currentStatus,
        };
      }

      // Check transition validity
      if (!isValidTransferTransition(currentStatus, nextStatus)) {
        logger.warn(
          {
            transferId,
            currentStatus,
            nextStatus,
            strict,
            eventId,
          },
          "Rejected illegal transfer state transition; protecting transaction integrity",
        );

        if (strict) {
          throw new InvalidTransferStateError(
            `Illegal state transition: cannot transition transfer "${transferId}" from "${currentStatus}" to "${nextStatus}"`,
          );
        }

        return {
          transfer,
          transitioned: false,
          previousStatus: currentStatus,
        };
      }

      // Prepare updated metadata
      const existingMetadata = (transfer.metadata as Record<string, unknown>) || {};
      const updatedMetadata: Record<string, unknown> = {
        ...existingMetadata,
        ...(metadata || {}),
        lastTransition: {
          from: currentStatus,
          to: nextStatus,
          at: new Date().toISOString(),
          eventId: eventId || null,
        },
      };

      if (providerReference) {
        updatedMetadata.providerReference = providerReference;
      }
      if (failureCode) {
        updatedMetadata.failureCode = failureCode;
      }
      if (failureMessage) {
        updatedMetadata.failureReason = failureMessage;
      }

      // Update transfer within transaction
      const updatedTransfer = await tx.transfer.update({
        where: { id: transferId },
        data: {
          status: nextStatus,
          providerReference: providerReference || transfer.providerReference,
          completedAt: nextStatus === "successful" ? new Date() : transfer.completedAt,
          failureCode: nextStatus === "failed" ? failureCode || transfer.failureCode : transfer.failureCode,
          failureMessage:
            nextStatus === "failed" ? failureMessage || transfer.failureMessage : transfer.failureMessage,
          metadata: updatedMetadata as any,
        },
      });

      logger.info(
        {
          transferId,
          from: currentStatus,
          to: nextStatus,
          providerReference: updatedTransfer.providerReference,
        },
        "Transfer state transition committed successfully",
      );

      return {
        transfer: updatedTransfer,
        transitioned: true,
        previousStatus: currentStatus,
      };
    });
  }
}

export const transferStateService = new TransferStateService();
