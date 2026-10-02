import crypto from "crypto";
import { prisma } from "../../lib/prisma";
import { logger } from "../../lib/logger";
import { UnauthorizedError, ProviderUnavailableError } from "../../lib/errors";
import { ProviderRegistry, providerRegistry } from "../providers/provider.registry";
import { isValidTransferTransition } from "./transfer-state-machine";
import { transferStateService } from "./transfer-state.service";
import { providerMetrics } from "../providers/provider-metrics";
import { TransferService } from "./transfer.service";
import { TransferStatus } from "@prisma/client";

export interface ProcessWebhookResult {
  status: "success" | "ignored" | "rejected";
  duplicate?: boolean;
  action: "processed" | "ignored" | "unmatched" | "transition_rejected";
  transferId?: string;
  previousStatus?: string;
  newStatus?: string;
  reason?: string;
}

/**
 * Service managing incoming external provider webhook callbacks.
 * Encapsulates cryptographic verification, deduplication, event normalization,
 * and safe transfer state transitions.
 */
export class RicarutWebhookService {
  constructor(private readonly registry: ProviderRegistry = providerRegistry) {}

  /**
   * Processes an incoming provider webhook callback.
   */
  async processWebhook(
    providerId: string,
    signature: string,
    rawPayload: string | Buffer,
    parsedPayload: unknown,
  ): Promise<ProcessWebhookResult> {
    // 1. Resolve Provider Webhook Capability
    let provider: any;
    try {
      provider = this.registry.resolveWebhook(providerId);
    } catch {
      // Fallback for registered legacy providers if applicable
      provider = this.registry.get(providerId);
      if (!provider || !("verifyWebhookSignature" in provider)) {
        throw new ProviderUnavailableError(`Provider '${providerId}' does not support webhooks`);
      }
    }

    // 2. Cryptographic Signature / Security Verification
    const rawString = Buffer.isBuffer(rawPayload)
      ? rawPayload.toString("utf8")
      : typeof rawPayload === "string"
      ? rawPayload
      : JSON.stringify(rawPayload);

    // Call provider-specific signature verification according to provider's security model
    const isValidSignature =
      provider.verifyWebhookSignature(signature, rawPayload) ||
      provider.verifyWebhookSignature(signature, rawString);

    if (!isValidSignature) {
      providerMetrics.recordWebhook(providerId, false);
      logger.warn(
        { provider: providerId },
        "Rejected provider webhook request: invalid cryptographic signature or verification failed",
      );
      throw new UnauthorizedError("Invalid webhook cryptographic signature");
    }

    providerMetrics.recordWebhook(providerId, true);

    // 3. Parse and Normalize Provider Event
    const event = provider.parseWebhookEvent(parsedPayload);
    const eventId = String(
      (event as any).eventId || (event as any).providerEventId || crypto.randomUUID(),
    );
    const eventType = (event as any).eventType || "unknown";
    const payloadHash = crypto.createHash("sha256").update(rawString).digest("hex");

    // 4. Idempotency Deduplication Check
    const existingEvent = await prisma.webhookEvent.findUnique({
      where: {
        provider_providerEventId: {
          provider: providerId,
          providerEventId: eventId,
        },
      },
    });

    if (existingEvent && (existingEvent.status === "processed" || existingEvent.status === "ignored")) {
      logger.info(
        { provider: providerId, eventId, eventType },
        "Duplicate provider webhook event received; skipping duplicate execution",
      );
      return {
        status: "success",
        duplicate: true,
        action: "ignored",
        reason: "Duplicate event already processed",
      };
    }

    // Record Event Receipt in database (both ProviderEvent and WebhookEvent)
    if (!existingEvent) {
      try {
        await prisma.webhookEvent.create({
          data: {
            provider: providerId,
            providerEventId: eventId,
            eventType,
            status: "received",
            payloadHash,
          },
        });

        // Also record in ProviderEvent store for comprehensive provider auditability
        try {
          await prisma.providerEvent.create({
            data: {
              provider: providerId,
              eventId,
              eventType,
              providerReference: (event as any).providerReference || null,
              status: "received",
              payloadHash,
              payload: (parsedPayload as any) || {},
            },
          });
        } catch {
          // Ignore non-fatal ProviderEvent errors (e.g. duplicate eventId)
        }
      } catch (err: any) {
        if (err?.code === "P2002") {
          logger.info(
            { provider: providerId, eventId },
            "Concurrent duplicate webhook delivery detected; skipping duplicate execution",
          );
          return {
            status: "success",
            duplicate: true,
            action: "ignored",
            reason: "Concurrent duplicate event",
          };
        }
        throw err;
      }
    }

    // 5. Filter for supported transfer lifecycle events
    if (
      eventType !== "transfer.success" &&
      eventType !== "transfer.successful" &&
      eventType !== "transfer.failed" &&
      eventType !== "transfer.reversed"
    ) {
      logger.info(
        { provider: providerId, eventType },
        "Ignored non-transfer provider webhook event",
      );
      await this.markEventStatus(providerId, eventId, "ignored");
      return {
        status: "success",
        action: "ignored",
        reason: `Ignored unsupported event type: ${eventType}`,
      };
    }

    // 6. Locate Target Ricarut Transfer via Provider References
    const transferReference = (event as any).transferReference || (event as any).reference;
    const providerReference = (event as any).providerReference;

    const transfer = await prisma.transfer.findFirst({
      where: {
        OR: [
          ...(providerReference ? [{ providerReference }] : []),
          ...(transferReference ? [{ id: transferReference }, { reference: transferReference }] : []),
        ],
      },
    });

    if (!transfer) {
      logger.warn(
        {
          provider: providerId,
          providerReference,
          transferReference,
        },
        "Webhook received for unknown or unreferenced transfer; acknowledging safely",
      );
      await this.markEventStatus(providerId, eventId, "unmatched");
      return {
        status: "success",
        action: "unmatched",
        reason: "Referenced transfer not found",
      };
    }

    // 7. State Machine Transition Validation
    const currentStatus = transfer.status as TransferStatus;
    const targetStatus = (event as any).status as TransferStatus;

    if (!isValidTransferTransition(currentStatus, targetStatus)) {
      logger.warn(
        {
          transferId: transfer.id,
          currentStatus,
          targetStatus,
          eventType,
        },
        "Rejected invalid transfer state transition; retaining terminal state",
      );
      await this.markEventStatus(providerId, eventId, "ignored");
      return {
        status: "success",
        action: "transition_rejected",
        transferId: transfer.id,
        previousStatus: currentStatus,
        reason: `Cannot transition transfer from '${currentStatus}' to '${targetStatus}'`,
      };
    }

    // 8. Apply State Transition Mutation
    if (currentStatus !== targetStatus) {
      const failureReason = (event as any).failureReason || (event as any).failureMessage;

      // Check whether this transfer has legacy ledger hold reservations
      if (transfer.sourceAccountId && (transfer as any).type === "external") {
        const legacyService = new TransferService();
        if (targetStatus === "successful") {
          await legacyService.settleTransfer(transfer.id, transfer.projectId);
        } else if (targetStatus === "failed") {
          await legacyService.reverseTransfer(
            transfer.id,
            transfer.projectId,
            (event as any).failureCode || "TRANSFER_FAILED",
            failureReason || "Provider rejected transaction via webhook",
          );
        }
      } else {
        // Direct developer transfer mutation via centralized state machine
        const failureReason = (event as any).failureReason || (event as any).failureMessage;
        await transferStateService.transition(transfer.id, targetStatus, {
          providerReference: providerReference || transfer.providerReference || undefined,
          failureCode: targetStatus === "failed" ? (event as any).failureCode || "TRANSFER_FAILED" : undefined,
          failureMessage: targetStatus === "failed" ? failureReason : undefined,
          eventId,
          strict: false,
          metadata: {
            eventId,
            webhookReceivedAt: new Date().toISOString(),
          },
        });
      }

      // Record Provider Transaction Audit Entry
      await prisma.providerTransaction.create({
        data: {
          transferId: transfer.id,
          provider: providerId,
          providerReference: providerReference || transfer.providerReference,
          status: targetStatus,
          responseMetadata: {
            eventId,
            eventType,
            failureReason,
            webhookReceivedAt: new Date().toISOString(),
          },
        },
      });

      logger.info(
        {
          transferId: transfer.id,
          previousStatus: currentStatus,
          newStatus: targetStatus,
          provider: providerId,
        },
        "Successfully updated transfer status from verified provider webhook",
      );
    }

    // 9. Mark WebhookEvent as Processed
    await this.markEventStatus(providerId, eventId, "processed");

    return {
      status: "success",
      action: "processed",
      transferId: transfer.id,
      previousStatus: currentStatus,
      newStatus: targetStatus,
    };
  }

  private async markEventStatus(
    provider: string,
    providerEventId: string,
    status: string,
  ): Promise<void> {
    try {
      await prisma.webhookEvent.update({
        where: {
          provider_providerEventId: {
            provider,
            providerEventId,
          },
        },
        data: {
          status,
          processedAt: new Date(),
        },
      });
    } catch {
      // Ignore update errors during teardown/mocking
    }

    try {
      await prisma.providerEvent.update({
        where: {
          provider_eventId: {
            provider,
            eventId: providerEventId,
          },
        },
        data: {
          status,
          processedAt: new Date(),
        },
      });
    } catch {
      // Ignore update errors during teardown/mocking
    }
  }
}

export const ricarutWebhookService = new RicarutWebhookService();
