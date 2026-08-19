import { prisma } from "../../lib/prisma";
import {
  LedgerAccount,
  LedgerAccountType,
  LedgerAccountStatus,
  Journal,
  JournalType,
  JournalStatus,
  LedgerEntry,
  EntryDirection,
  Prisma,
} from "@prisma/client";
import crypto from "crypto";
import { WebhookService } from "../webhooks/webhook.service";

/**
 * Repository wrapper managing direct database queries and mutations for ledger and accounting entities.
 * Fully supports running inside transactional transaction clients for atomic executions.
 */
export class LedgerRepository {
  private generateId(prefix: string): string {
    const uuid = crypto.randomUUID().replace(/-/g, "");
    return `${prefix}_${uuid}`;
  }

  /**
   * Creates a new LedgerAccount linked to a project and an optional financial account context.
   */
  async createLedgerAccount(
    data: {
      id?: string;
      projectId: string;
      financialAccountId?: string | null;
      currency: string;
      type: LedgerAccountType;
      status?: LedgerAccountStatus;
    },
    tx: Prisma.TransactionClient = prisma,
  ): Promise<LedgerAccount> {
    const id = data.id || this.generateId("lga");
    return tx.ledgerAccount.create({
      data: {
        id,
        projectId: data.projectId,
        financialAccountId: data.financialAccountId || null,
        currency: data.currency.toUpperCase(),
        type: data.type,
        status: data.status || "active",
      },
    });
  }

  /**
   * Finds a LedgerAccount by ID within its project.
   */
  async findLedgerAccountById(
    id: string,
    projectId: string,
    tx: Prisma.TransactionClient = prisma,
  ): Promise<LedgerAccount | null> {
    return tx.ledgerAccount.findFirst({
      where: { id, projectId },
    });
  }

  /**
   * Finds a LedgerAccount associated with a given financial account ID.
   */
  async findLedgerAccountByFinancialAccountId(
    financialAccountId: string,
    projectId: string,
    tx: Prisma.TransactionClient = prisma,
  ): Promise<LedgerAccount | null> {
    return tx.ledgerAccount.findFirst({
      where: { financialAccountId, projectId },
    });
  }

  /**
   * Inserts a new Journal record representing a transaction draft or posted financial movement.
   */
  async createJournal(
    data: {
      projectId: string;
      reference: string;
      type: JournalType;
      status?: JournalStatus;
      currency: string;
      description?: string | null;
      metadata?: Prisma.InputJsonValue | null;
    },
    tx: Prisma.TransactionClient = prisma,
  ): Promise<Journal> {
    const id = this.generateId("txn");
    const journal = await tx.journal.create({
      data: {
        id,
        projectId: data.projectId,
        reference: data.reference,
        type: data.type,
        status: data.status || "draft",
        currency: data.currency.toUpperCase(),
        description: data.description || null,
        metadata: data.metadata ?? undefined,
      },
    });

    if (journal.status === "posted") {
      WebhookService.dispatch(data.projectId, "ledger.transaction.created", journal);
    }

    return journal;
  }

  /**
   * Finds a Journal by ID and eager-loads its ledger entries.
   * Supports retrieving a transaction if the project context is either the initiator or has a ledger entry party.
   */
  async findJournalById(
    id: string,
    projectId: string,
    tx: Prisma.TransactionClient = prisma,
  ): Promise<(Journal & { entries: LedgerEntry[] }) | null> {
    return tx.journal.findFirst({
      where: {
        id,
        OR: [
          { projectId },
          {
            entries: {
              some: {
                ledgerAccount: {
                  projectId,
                },
              },
            },
          },
        ],
      },
      include: {
        entries: true,
      },
    });
  }

  /**
   * Finds a Journal by unique client-provided reference inside a project context.
   * Also supports recipient projects finding the journal by its reference.
   */
  async findJournalByReference(
    reference: string,
    projectId: string,
    tx: Prisma.TransactionClient = prisma,
  ): Promise<(Journal & { entries: LedgerEntry[] }) | null> {
    return tx.journal.findFirst({
      where: {
        reference,
        OR: [
          { projectId },
          {
            entries: {
              some: {
                ledgerAccount: {
                  projectId,
                },
              },
            },
          },
        ],
      },
      include: {
        entries: true,
      },
    });
  }

  /**
   * Updates a Journal's status (e.g. from draft to posted).
   */
  async updateJournalStatus(
    id: string,
    status: JournalStatus,
    tx: Prisma.TransactionClient = prisma,
  ): Promise<Journal> {
    return tx.journal.update({
      where: { id },
      data: { status },
    });
  }

  /**
   * Updates reversal-specific linkages on a Journal record.
   */
  async updateJournalReversal(
    id: string,
    reversalData: { reversedJournalId?: string | null; reversalJournalId?: string | null },
    tx: Prisma.TransactionClient = prisma,
  ): Promise<Journal> {
    return tx.journal.update({
      where: { id },
      data: reversalData,
    });
  }

  /**
   * Appends an individual balanced line item to the LedgerEntry table.
   */
  async createLedgerEntry(
    data: {
      journalId: string;
      ledgerAccountId: string;
      direction: EntryDirection;
      amount: number;
      currency: string;
    },
    tx: Prisma.TransactionClient = prisma,
  ): Promise<LedgerEntry> {
    const id = this.generateId("lge");
    return tx.ledgerEntry.create({
      data: {
        id,
        journalId: data.journalId,
        ledgerAccountId: data.ledgerAccountId,
        direction: data.direction,
        amount: data.amount,
        currency: data.currency.toUpperCase(),
      },
    });
  }

  /**
   * Gets historical ledger lines with cursor-based pagination.
   */
  async getAccountLedgerEntries(
    ledgerAccountId: string,
    limit = 50,
    cursor?: string,
    tx: Prisma.TransactionClient = prisma,
  ): Promise<LedgerEntry[]> {
    return tx.ledgerEntry.findMany({
      where: { ledgerAccountId },
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Aggregate summation of ledger amounts grouped by transaction direction.
   */
  async sumLedgerEntries(
    ledgerAccountId: string,
    direction: EntryDirection,
    tx: Prisma.TransactionClient = prisma,
  ): Promise<number> {
    const aggregation = await tx.ledgerEntry.aggregate({
      where: { ledgerAccountId, direction },
      _sum: { amount: true },
    });
    return aggregation._sum.amount || 0;
  }
}
export default LedgerRepository;
