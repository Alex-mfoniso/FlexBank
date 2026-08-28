import { prisma } from "../../lib/prisma";
import { LedgerRepository } from "../ledger/ledger.repository";
import { ProviderRouter } from "../providers/provider.router";
import { providerRegistry } from "../providers/provider.registry";
import { IdempotencyService } from "../ledger/idempotency.service";
import { WebhookService } from "../webhooks/webhook.service";
import crypto from "crypto";
import {
  AccountNotFoundError,
  AccountNotActiveError,
  InsufficientFundsError,
  TransferLimitExceededError,
  TransferNotFoundError,
  ConflictError,
  ValidationError,
  UnauthorizedError,
  ProviderUnavailableError,
} from "../../lib/errors";
import { Transfer, TransferStatus, Prisma } from "@prisma/client";
import { CreateTransferInput } from "./transfer.schema";
import { Money } from "../../lib/money";

const MAX_TRANSFER_AMOUNT = 100000000; // ₦1,000,000 equivalent in minor units (MVP limit configuration)

export class TransferService {
  private readonly ledgerRepo = new LedgerRepository();

  /**
   * Safe Dynamic Helper to resolve or auto-create ledger accounts.
   */
  private async resolveOrCreateLedgerAccount(
    financialAccountId: string,
    projectId: string,
    tx: Prisma.TransactionClient,
  ) {
    let ledgerAcc = await this.ledgerRepo.findLedgerAccountByFinancialAccountId(financialAccountId, projectId, tx);
    if (!ledgerAcc) {
      const account = await tx.account.findUnique({ where: { id: financialAccountId } });
      if (!account) throw new AccountNotFoundError(`Account ${financialAccountId} not found`);

      ledgerAcc = await this.ledgerRepo.createLedgerAccount(
        {
          projectId,
          financialAccountId,
          currency: account.currency,
          type: "customer",
        },
        tx,
      );
    }
    return ledgerAcc;
  }

  /**
   * Safe Dynamic Helper to resolve or auto-create system-level ledger accounts (transit, clearing, etc.)
   */
  private async resolveOrCreateSystemLedgerAccount(
    id: string,
    projectId: string,
    currency: string,
    type: "liability" | "asset",
    tx: Prisma.TransactionClient,
  ) {
    let ledgerAcc = await this.ledgerRepo.findLedgerAccountById(id, projectId, tx);
    if (!ledgerAcc) {
      ledgerAcc = await this.ledgerRepo.createLedgerAccount(
        {
          id,
          projectId,
          currency,
          type,
        },
        tx,
      );
    }
    return ledgerAcc;
  }

  /**
   * Initiates a payment transfer (internal or external).
   * Guarded fully with PostgreSQL transactional idempotency logic.
   */
  async initiateTransfer(
    projectId: string,
    idempotencyKey: string,
    input: CreateTransferInput,
  ): Promise<Transfer> {
    if (!idempotencyKey) {
      throw new ValidationError("Idempotency-Key header is required for all transfer operations");
    }

    return await IdempotencyService.runIdempotent(projectId, idempotencyKey, input, 86400, async (tx) => {
      // 1. Validate Limit Constraints
      if (input.amount > MAX_TRANSFER_AMOUNT) {
        throw new TransferLimitExceededError(
          `Transfer amount exceeds the maximum limit of ${MAX_TRANSFER_AMOUNT} minor units`,
        );
      }

      // 2. Fetch and Validate Source Account
      const sourceAcc = await tx.account.findFirst({
        where: { id: input.sourceAccountId, projectId },
      });
      if (!sourceAcc) {
        throw new AccountNotFoundError(`Source account ${input.sourceAccountId} not found`);
      }
      if (sourceAcc.status !== "active") {
        throw new AccountNotActiveError(`Source account is not active (status: ${sourceAcc.status})`);
      }
      Money.assertSameCurrency(sourceAcc.currency, input.currency);

      // Lock the source account to guarantee deadlock-free concurrency protection
      await tx.$queryRawUnsafe(`SELECT id FROM "Account" WHERE id = $1 FOR UPDATE`, input.sourceAccountId);

      // 3. Handle Internal Transfer Flow
      if (input.type === "internal") {
        const destAccountId = input.destinationAccountId!;
        if (input.sourceAccountId === destAccountId) {
          throw new ValidationError("Source and destination accounts must be different");
        }
        const destAcc = await tx.account.findUnique({
          where: { id: destAccountId },
        });
        if (!destAcc) {
          throw new AccountNotFoundError(`Destination account ${destAccountId} not found`);
        }
        if (destAcc.status !== "active") {
          throw new AccountNotActiveError(`Destination account is not active (status: ${destAcc.status})`);
        }
        Money.assertSameCurrency(destAcc.currency, input.currency);

        // Sort IDs for multi-row locking
        const sortedIds = [input.sourceAccountId, destAccountId].sort();
        for (const id of sortedIds) {
          if (id !== input.sourceAccountId) {
            await tx.$queryRawUnsafe(`SELECT id FROM "Account" WHERE id = $1 FOR UPDATE`, id);
          }
        }

        const sourceLedger = await this.resolveOrCreateLedgerAccount(input.sourceAccountId, projectId, tx);
        const destLedger = await this.resolveOrCreateLedgerAccount(destAccountId, destAcc.projectId, tx);

        // Check sufficient available balance
        const credits = await this.ledgerRepo.sumLedgerEntries(sourceLedger.id, "credit", tx);
        const debits = await this.ledgerRepo.sumLedgerEntries(sourceLedger.id, "debit", tx);
        const availableBalance = Money.subtract(credits, debits);

        if (availableBalance < input.amount) {
          throw new InsufficientFundsError();
        }

        // Post Journal and balanced Ledger Entries
        const reference = input.reference;
        const existingRef = await tx.transfer.findFirst({ where: { projectId, reference } });
        if (existingRef) {
          throw new ConflictError(`Reference ${reference} is already in use for this project`);
        }

        const journal = await this.ledgerRepo.createJournal(
          {
            projectId,
            reference,
            type: "internal_transfer",
            status: "posted",
            currency: input.currency,
            description: `Internal transfer of ${input.amount} ${input.currency} to ${destAccountId}`,
          },
          tx,
        );

        await this.ledgerRepo.createLedgerEntry(
          {
            journalId: journal.id,
            ledgerAccountId: sourceLedger.id,
            direction: "debit",
            amount: input.amount,
            currency: input.currency,
          },
          tx,
        );

        await this.ledgerRepo.createLedgerEntry(
          {
            journalId: journal.id,
            ledgerAccountId: destLedger.id,
            direction: "credit",
            amount: input.amount,
            currency: input.currency,
          },
          tx,
        );

        // Update projected available balances on account cache columns
        await tx.account.update({
          where: { id: input.sourceAccountId },
          data: { available: Money.subtract(sourceAcc.available, input.amount) },
        });

        await tx.account.update({
          where: { id: destAccountId },
          data: { available: Money.add(destAcc.available, input.amount) },
        });

        const transferId = `trf_${crypto.randomUUID().replace(/-/g, "")}`;
        const transfer = await tx.transfer.create({
          data: {
            id: transferId,
            projectId,
            customerId: sourceAcc.customerId,
            sourceAccountId: input.sourceAccountId,
            destinationAccountId: destAccountId,
            amount: input.amount,
            currency: input.currency,
            reference,
            status: "successful",
            direction: "internal",
            type: "internal",
            completedAt: new Date(),
          },
        });

        // Dispatch webhooks asynchronously
        WebhookService.dispatch(projectId, "transfer.created", transfer);
        WebhookService.dispatch(projectId, "transfer.success", transfer);

        if (destAcc.projectId !== projectId) {
          WebhookService.dispatch(destAcc.projectId, "transfer.success", transfer);
          WebhookService.dispatch(destAcc.projectId, "ledger.transaction.created", journal);
        }

        return transfer;
      }

      // 4. Handle External Transfer Flow (Ledger Hold/Reservation phase)
      const benData = input.beneficiary!;
      const reference = input.reference;
      const existingRef = await tx.transfer.findFirst({ where: { projectId, reference } });
      if (existingRef) {
        throw new ConflictError(`Reference ${reference} is already in use for this project`);
      }

      const sourceLedger = await this.resolveOrCreateLedgerAccount(input.sourceAccountId, projectId, tx);

      // Check sufficient available balance
      const credits = await this.ledgerRepo.sumLedgerEntries(sourceLedger.id, "credit", tx);
      const debits = await this.ledgerRepo.sumLedgerEntries(sourceLedger.id, "debit", tx);
      const availableBalance = Money.subtract(credits, debits);

      if (availableBalance < input.amount) {
        throw new InsufficientFundsError();
      }

      // Create Beneficiary record
      const beneficiaryId = `ben_${crypto.randomUUID().replace(/-/g, "")}`;
      await tx.beneficiary.create({
        data: {
          id: beneficiaryId,
          projectId,
          type: benData.type,
          bankCode: benData.bankCode,
          accountNumber: benData.accountNumber,
          accountName: benData.accountName || null,
        },
      });

      // Fetch or Create System Transit Holding Account
      const transitId = `transit_holding_${input.currency}`;
      const transitLedger = await this.resolveOrCreateSystemLedgerAccount(
        transitId,
        projectId,
        input.currency,
        "liability",
        tx,
      );

      // Create hold journal & double-entry booking lines
      const holdJournal = await this.ledgerRepo.createJournal(
        {
          projectId,
          reference: `hold_${reference}_${crypto.randomUUID().substring(0, 8)}`,
          type: "adjustment",
          status: "posted",
          currency: input.currency,
          description: `Hold of ${input.amount} ${input.currency} for external transfer reference: ${reference}`,
        },
        tx,
      );

      await this.ledgerRepo.createLedgerEntry(
        {
          journalId: holdJournal.id,
          ledgerAccountId: sourceLedger.id,
          direction: "debit",
          amount: input.amount,
          currency: input.currency,
        },
        tx,
      );

      await this.ledgerRepo.createLedgerEntry(
        {
          journalId: holdJournal.id,
          ledgerAccountId: transitLedger.id,
          direction: "credit",
          amount: input.amount,
          currency: input.currency,
        },
        tx,
      );

      // Relocate wallet cache balances from available to pending
      await tx.account.update({
        where: { id: input.sourceAccountId },
        data: {
          available: Money.subtract(sourceAcc.available, input.amount),
          pending: Money.add(sourceAcc.pending, input.amount),
        },
      });

      // Select provider via Router
      const provider = ProviderRouter.select({
        operation: "transfer",
        currency: input.currency,
        amount: input.amount,
        projectId,
      });

      const transferId = `trf_${crypto.randomUUID().replace(/-/g, "")}`;

      // Initialize the pending transfer record in DB
      const transfer = await tx.transfer.create({
        data: {
          id: transferId,
          projectId,
          customerId: sourceAcc.customerId,
          sourceAccountId: input.sourceAccountId,
          beneficiaryId,
          amount: input.amount,
          currency: input.currency,
          reference,
          status: "processing",
          direction: "outbound",
          type: "external",
          providerId: provider.id,
        },
      });

      // Dispatch webhooks asynchronously
      WebhookService.dispatch(projectId, "transfer.created", transfer);
      WebhookService.dispatch(projectId, "transfer.processing", transfer);

      // Call external provider (using deferred execution checks inside test boundaries)
      try {
        const provResult = await provider.createTransfer({
          transferId,
          amount: input.amount,
          currency: input.currency,
          beneficiary: benData,
          reference,
        });

        // Store provider transaction logging record
        await tx.providerTransaction.create({
          data: {
            transferId,
            provider: provider.id,
            providerReference: provResult.providerReference,
            status: provResult.status,
            responseMetadata: provResult.rawResponse as Prisma.InputJsonValue,
          },
        });

        // Update provider reference first (keeping status as processing during transitions)
        await tx.transfer.update({
          where: { id: transferId },
          data: {
            providerReference: provResult.providerReference,
          },
        });

        // If provider succeeded immediately, settle ledger
        if (provResult.status === "successful") {
          await this.settleTransferInternal(transferId, projectId, tx);
          return await tx.transfer.findUniqueOrThrow({ where: { id: transferId } });
        } else if (provResult.status === "failed") {
          // If failed immediately, release hold
          await this.reverseTransferInternal(
            transferId,
            projectId,
            provResult.failureCode || "PROVIDER_REJECTED",
            provResult.failureMessage || "Provider rejected request",
            tx,
          );
          return await tx.transfer.findUniqueOrThrow({ where: { id: transferId } });
        }

        // For other processing states, update status and return
        return await tx.transfer.update({
          where: { id: transferId },
          data: {
            status: provResult.status as TransferStatus,
          },
        });
      } catch (err: any) {
        // Enforce: Network connection timeouts keep the transaction as PROCESSING (Section 32)
        const isTimeout = err.message === "PROVIDER_TIMEOUT" || err.message?.includes("timeout");
        if (isTimeout) {
          await tx.providerTransaction.create({
            data: {
              transferId,
              provider: provider.id,
              status: "processing",
              responseMetadata: { error: "Provider request timed out. Status remains processing." },
            },
          });

          // Remain in processing status without settling funds
          return await tx.transfer.update({
            where: { id: transferId },
            data: { status: "processing" },
          });
        }

        // Generic other errors result in immediate failure release
        await this.reverseTransferInternal(
          transferId,
          projectId,
          "PROVIDER_UNAVAILABLE",
          err.message || "Failed to reach provider",
          tx,
        );
        return await tx.transfer.findUniqueOrThrow({ where: { id: transferId } });
      }
    });
  }

  /**
   * Finalizes external transfer settlement (debit transit hold account, credit bank asset).
   */
  async settleTransfer(transferId: string, projectId: string): Promise<Transfer> {
    return await prisma.$transaction(async (tx) => {
      return await this.settleTransferInternal(transferId, projectId, tx);
    });
  }

  private async settleTransferInternal(
    transferId: string,
    projectId: string,
    tx: Prisma.TransactionClient,
  ): Promise<Transfer> {
    const transfer = await tx.transfer.findFirst({ where: { id: transferId, projectId } });
    if (!transfer) throw new TransferNotFoundError(`Transfer ${transferId} not found`);

    if (
      transfer.status === "successful" ||
      transfer.status === "failed" ||
      transfer.status === "cancelled"
    ) {
      return transfer; // Already resolved
    }

    const transitId = `transit_holding_${transfer.currency}`;
    const clearedId = `transit_cleared_${transfer.currency}`;

    const transitLedger = await this.resolveOrCreateSystemLedgerAccount(
      transitId,
      projectId,
      transfer.currency,
      "liability",
      tx,
    );
    const clearedLedger = await this.resolveOrCreateSystemLedgerAccount(
      clearedId,
      projectId,
      transfer.currency,
      "asset",
      tx,
    );

    // Create balanced settlement journal
    const settleJournal = await this.ledgerRepo.createJournal(
      {
        projectId,
        reference: `settle_${transfer.reference}_${crypto.randomUUID().substring(0, 8)}`,
        type: "adjustment",
        status: "posted",
        currency: transfer.currency,
        description: `Settlement of external transfer reference: ${transfer.reference}`,
      },
      tx,
    );

    await this.ledgerRepo.createLedgerEntry(
      {
        journalId: settleJournal.id,
        ledgerAccountId: transitLedger.id,
        direction: "debit",
        amount: transfer.amount,
        currency: transfer.currency,
      },
      tx,
    );

    await this.ledgerRepo.createLedgerEntry(
      {
        journalId: settleJournal.id,
        ledgerAccountId: clearedLedger.id,
        direction: "credit",
        amount: transfer.amount,
        currency: transfer.currency,
      },
      tx,
    );

    // Clear source account's pending balance reservation
    if (transfer.sourceAccountId) {
      const sourceAcc = await tx.account.findUniqueOrThrow({ where: { id: transfer.sourceAccountId } });
      await tx.account.update({
        where: { id: transfer.sourceAccountId },
        data: { pending: Money.subtract(sourceAcc.pending, transfer.amount) },
      });
    }

    const successfulTransfer = await tx.transfer.update({
      where: { id: transferId },
      data: {
        status: "successful",
        completedAt: new Date(),
      },
    });

    // Dispatch webhook asynchronously
    WebhookService.dispatch(projectId, "transfer.success", successfulTransfer);

    return successfulTransfer;
  }

  /**
   * Reverses external transfer hold, restoring funds to the customer account.
   */
  async reverseTransfer(
    transferId: string,
    projectId: string,
    failureCode = "PROVIDER_REJECTED",
    failureMessage = "Provider rejected transaction",
  ): Promise<Transfer> {
    return await prisma.$transaction(async (tx) => {
      return await this.reverseTransferInternal(transferId, projectId, failureCode, failureMessage, tx);
    });
  }

  private async reverseTransferInternal(
    transferId: string,
    projectId: string,
    failureCode: string,
    failureMessage: string,
    tx: Prisma.TransactionClient,
  ): Promise<Transfer> {
    const transfer = await tx.transfer.findFirst({ where: { id: transferId, projectId } });
    if (!transfer) throw new TransferNotFoundError(`Transfer ${transferId} not found`);

    if (
      transfer.status === "successful" ||
      transfer.status === "failed" ||
      transfer.status === "cancelled"
    ) {
      return transfer; // Already resolved
    }

    if (transfer.sourceAccountId) {
      const sourceLedger = await this.resolveOrCreateLedgerAccount(transfer.sourceAccountId, projectId, tx);
      const transitId = `transit_holding_${transfer.currency}`;
      const transitLedger = await this.resolveOrCreateSystemLedgerAccount(
        transitId,
        projectId,
        transfer.currency,
        "liability",
        tx,
      );

      // Create opposing reversal hold journal
      const reverseJournal = await this.ledgerRepo.createJournal(
        {
          projectId,
          reference: `rev_hold_${transfer.reference}_${crypto.randomUUID().substring(0, 8)}`,
          type: "adjustment",
          status: "posted",
          currency: transfer.currency,
          description: `Reversal hold release of ${transfer.amount} ${transfer.currency} for failed reference: ${transfer.reference}`,
        },
        tx,
      );

      await this.ledgerRepo.createLedgerEntry(
        {
          journalId: reverseJournal.id,
          ledgerAccountId: transitLedger.id,
          direction: "debit",
          amount: transfer.amount,
          currency: transfer.currency,
        },
        tx,
      );

      await this.ledgerRepo.createLedgerEntry(
        {
          journalId: reverseJournal.id,
          ledgerAccountId: sourceLedger.id,
          direction: "credit",
          amount: transfer.amount,
          currency: transfer.currency,
        },
        tx,
      );

      // Restore wallet available cache balances, clear pending reservation hold
      const sourceAcc = await tx.account.findUniqueOrThrow({ where: { id: transfer.sourceAccountId } });
      await tx.account.update({
        where: { id: transfer.sourceAccountId },
        data: {
          available: Money.add(sourceAcc.available, transfer.amount),
          pending: Money.subtract(sourceAcc.pending, transfer.amount),
        },
      });
    }

    const failedTransfer = await tx.transfer.update({
      where: { id: transferId },
      data: {
        status: "failed",
        failureCode,
        failureMessage,
      },
    });

    // Dispatch webhook asynchronously
    WebhookService.dispatch(projectId, "transfer.failed", failedTransfer);

    return failedTransfer;
  }

  /**
   * Retrieves detail logs of a specific transfer with strict project checks.
   */
  async getTransfer(transferId: string, projectId: string): Promise<Transfer> {
    const transfer = await prisma.transfer.findFirst({
      where: {
        id: transferId,
        OR: [
          { projectId },
          {
            destinationAccount: {
              projectId,
            },
          },
        ],
      },
      include: { beneficiary: true },
    });
    if (!transfer) {
      throw new TransferNotFoundError(`Transfer ${transferId} not found`);
    }
    return transfer;
  }

  /**
   * Safe list retrieval of transfers with pagination support.
   */
  async listTransfers(
    projectId: string,
    filters: {
      limit?: number;
      cursor?: string;
      status?: TransferStatus;
      type?: "internal" | "external";
      customerId?: string;
      sourceAccountId?: string;
      reference?: string;
    },
  ) {
    const limit = filters.limit || 50;
    const whereClause: Prisma.TransferWhereInput = {
      projectId,
      ...(filters.status && { status: filters.status }),
      ...(filters.type && { type: filters.type }),
      ...(filters.customerId && { customerId: filters.customerId }),
      ...(filters.sourceAccountId && { sourceAccountId: filters.sourceAccountId }),
      ...(filters.reference && { reference: filters.reference }),
    };

    const transfers = await prisma.transfer.findMany({
      where: whereClause,
      take: limit + 1,
      cursor: filters.cursor ? { id: filters.cursor } : undefined,
      orderBy: { createdAt: "desc" },
      include: { beneficiary: true },
    });

    const hasMore = transfers.length > limit;
    const data = hasMore ? transfers.slice(0, limit) : transfers;
    const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : null;

    return {
      data,
      hasMore,
      nextCursor,
    };
  }

  /**
   * Synchronizes transaction state with provider actively (status verification poll).
   */
  async syncTransferStatus(transferId: string, projectId: string): Promise<Transfer> {
    const transfer = await this.getTransfer(transferId, projectId);
    if (
      transfer.status === "successful" ||
      transfer.status === "failed" ||
      transfer.status === "cancelled"
    ) {
      return transfer;
    }

    if (!transfer.providerId || !transfer.providerReference) {
      return transfer;
    }

    const provider = ProviderRouter.select({
      operation: "transfer",
      currency: transfer.currency,
      amount: transfer.amount,
      projectId,
    });

    try {
      const result = await provider.getTransfer(transfer.providerReference, transfer.reference);

      return await prisma.$transaction(async (tx) => {
        // Record status synchronizing attempts
        await tx.providerTransaction.create({
          data: {
            transferId,
            provider: provider.id,
            providerReference: transfer.providerReference,
            status: result.status,
            responseMetadata: result.rawResponse as Prisma.InputJsonValue,
          },
        });

        if (result.status === "successful") {
          return await this.settleTransferInternal(transferId, projectId, tx);
        } else if (result.status === "failed") {
          return await this.reverseTransferInternal(
            transferId,
            projectId,
            result.failureCode || "PROVIDER_REJECTED",
            result.failureMessage || "Provider failed transaction",
            tx,
          );
        }

        return await tx.transfer.update({
          where: { id: transferId },
          data: { status: result.status as TransferStatus },
        });
      });
    } catch {
      // In case status inquiry fails, preserve processing state rather than altering funds
      return transfer;
    }
  }

  /**
   * Idempotent webhook event processor verifying event uniqueness and performing ledger settle.
   */
  async processWebhook(
    providerId: string,
    signature: string,
    rawBody: string,
    body: any,
  ): Promise<{ status: "processed" | "ignored" }> {
    const provider = providerRegistry.get(providerId);
    if (!provider) {
      throw new ProviderUnavailableError(`Provider ${providerId} is not registered`);
    }

    // Webhook Signature verification
    if (!provider.verifyWebhookSignature(signature, rawBody)) {
      throw new UnauthorizedError("Invalid webhook cryptographic signature");
    }

    const event = provider.parseWebhookEvent(body);

    // Check duplicate delivery
    const existingEvent = await prisma.webhookEvent.findUnique({
      where: {
        provider_providerEventId: {
          provider: providerId,
          providerEventId: event.providerEventId,
        },
      },
    });

    if (existingEvent) {
      return { status: "ignored" }; // Idempotent repeat delivery
    }

    // Create unique webhook event record to ensure single processing execution
    await prisma.webhookEvent.create({
      data: {
        provider: providerId,
        providerEventId: event.providerEventId,
        eventType: event.eventType,
        payloadHash: crypto.createHash("sha256").update(rawBody).digest("hex"),
        status: "received",
      },
    });

    // Find linked transfer using custom reference or provider reference
    const transfer = await prisma.transfer.findFirst({
      where: {
        OR: [
          { providerReference: event.providerReference },
          { reference: event.reference },
        ],
      },
    });

    if (!transfer) {
      // If transfer is not found, log event received but mark complete to avoid provider retry spam
      await prisma.webhookEvent.update({
        where: {
          provider_providerEventId: {
            provider: providerId,
            providerEventId: event.providerEventId,
          },
        },
        data: { status: "processed", processedAt: new Date() },
      });
      return { status: "processed" };
    }

    // Process State Mutation
    await prisma.$transaction(async (tx) => {
      // Log event linkage
      await tx.providerTransaction.create({
        data: {
          transferId: transfer.id,
          provider: providerId,
          providerReference: event.providerReference,
          status: event.status,
          responseMetadata: event.rawPayload as Prisma.InputJsonValue,
        },
      });

      if (event.status === "successful") {
        await this.settleTransferInternal(transfer.id, transfer.projectId, tx);
      } else if (event.status === "failed") {
        await this.reverseTransferInternal(
          transfer.id,
          transfer.projectId,
          event.failureCode || "PROVIDER_REJECTED",
          event.failureMessage || "Provider rejected via webhook",
          tx,
        );
      }
    });

    await prisma.webhookEvent.update({
      where: {
        provider_providerEventId: {
          provider: providerId,
          providerEventId: event.providerEventId,
        },
      },
      data: { status: "processed", processedAt: new Date() },
    });

    return { status: "processed" };
  }
}
