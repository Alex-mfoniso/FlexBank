import { prisma } from "../../lib/prisma";
import { LedgerRepository } from "./ledger.repository";
import { Money } from "../../lib/money";
import {
  AccountNotFoundError,
  AccountNotActiveError,
  InsufficientFundsError,
  JournalNotFoundError,
  JournalAlreadyReversedError,
  JournalNotBalancedError,
  ReconciliationFailureError,
  ConflictError,
} from "../../lib/errors";
import {
  LedgerAccount,
  Journal,
  LedgerEntry,
  EntryDirection,
  Prisma,
} from "@prisma/client";

/**
 * Service orchestrating high-integrity, atomic financial ledger actions.
 * Enforces accounting rules, row locking, and double-entry invariants.
 */
export class LedgerService {
  constructor(private readonly repo = new LedgerRepository()) {}

  /**
   * Helper to resolve or auto-create a ledger account for a given financial account.
   */
  async resolveOrCreateLedgerAccount(
    financialAccountId: string,
    projectId: string,
    tx: Prisma.TransactionClient = prisma,
  ): Promise<LedgerAccount> {
    const account = await tx.account.findFirst({
      where: { id: financialAccountId, projectId },
    });
    if (!account) {
      throw new AccountNotFoundError(`Financial account ${financialAccountId} not found`);
    }

    let ledgerAccount = await this.repo.findLedgerAccountByFinancialAccountId(financialAccountId, projectId, tx);
    if (!ledgerAccount) {
      ledgerAccount = await this.repo.createLedgerAccount(
        {
          projectId,
          financialAccountId,
          currency: account.currency,
          type: "customer", // Natural wallet-style accounts are customer liabilities
        },
        tx,
      );
    }
    return ledgerAccount;
  }

  /**
   * Calculates the current balance of a ledger account.
   * customer, liability, revenue, equity: Credit - Debit.
   * asset, expense: Debit - Credit.
   */
  async calculateBalance(
    ledgerAccountId: string,
    projectId: string,
    tx: Prisma.TransactionClient = prisma,
  ): Promise<number> {
    const ledgerAccount = await this.repo.findLedgerAccountById(ledgerAccountId, projectId, tx);
    if (!ledgerAccount) {
      throw new ReconciliationFailureError("Ledger account not found");
    }

    const credits = await this.repo.sumLedgerEntries(ledgerAccountId, "credit", tx);
    const debits = await this.repo.sumLedgerEntries(ledgerAccountId, "debit", tx);

    if (ledgerAccount.type === "asset" || ledgerAccount.type === "expense") {
      return Money.subtract(debits, credits);
    }
    return Money.subtract(credits, debits);
  }

  /**
   * Safe retrieval of ledger entries with pagination support.
   */
  async getAccountLedger(
    financialAccountId: string,
    projectId: string,
    limit = 50,
    cursor?: string,
  ): Promise<{ data: LedgerEntry[]; hasMore: boolean; nextCursor: string | null }> {
    const ledgerAccount = await this.resolveOrCreateLedgerAccount(financialAccountId, projectId);
    const entries = await this.repo.getAccountLedgerEntries(ledgerAccount.id, limit + 1, cursor);

    const hasMore = entries.length > limit;
    const data = hasMore ? entries.slice(0, limit) : entries;
    const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : null;

    return {
      data,
      hasMore,
      nextCursor,
    };
  }

  /**
   * Performs an internal transfer primitive between two FlexBank financial accounts.
   * Locks affected accounts atomically in sorted order to prevent deadlock issues.
   */
  async transfer(params: {
    projectId: string;
    sourceAccountId: string;
    destinationAccountId: string;
    amount: number;
    currency: string;
    reference: string;
    description?: string;
    metadata?: Prisma.InputJsonValue;
  }): Promise<Journal & { entries: LedgerEntry[] }> {
    Money.validate(params.amount);

    // 1. Fetch and validate source financial account
    const sourceAcc = await prisma.account.findFirst({
      where: { id: params.sourceAccountId, projectId: params.projectId },
    });
    if (!sourceAcc) {
      throw new AccountNotFoundError(`Source account ${params.sourceAccountId} not found`);
    }
    if (sourceAcc.status !== "active") {
      throw new AccountNotActiveError(`Source account is not active (status: ${sourceAcc.status})`);
    }
    Money.assertSameCurrency(sourceAcc.currency, params.currency);

    // 2. Fetch and validate destination financial account
    const destAcc = await prisma.account.findFirst({
      where: { id: params.destinationAccountId, projectId: params.projectId },
    });
    if (!destAcc) {
      throw new AccountNotFoundError(`Destination account ${params.destinationAccountId} not found`);
    }
    if (destAcc.status !== "active") {
      throw new AccountNotActiveError(`Destination account is not active (status: ${destAcc.status})`);
    }
    Money.assertSameCurrency(destAcc.currency, params.currency);

    // 3. Reject duplicate client reference up front
    const existingRef = await this.repo.findJournalByReference(params.reference, params.projectId);
    if (existingRef) {
      throw new ConflictError(`Reference ${params.reference} is already in use for this project`);
    }

    // 4. Run multi-record writes atomically in transaction
    return await prisma.$transaction(async (tx) => {
      // Sort IDs alphabetically to guarantee deadlock-free locking order
      const sortedIds = [params.sourceAccountId, params.destinationAccountId].sort();
      for (const id of sortedIds) {
        await tx.$queryRawUnsafe(`SELECT id FROM "Account" WHERE id = $1 FOR UPDATE`, id);
      }

      const sourceLedger = await this.resolveOrCreateLedgerAccount(params.sourceAccountId, params.projectId, tx);
      const destLedger = await this.resolveOrCreateLedgerAccount(params.destinationAccountId, params.projectId, tx);

      // Verify sufficient funds
      const availableBalance = await this.calculateBalance(sourceLedger.id, params.projectId, tx);
      if (availableBalance < params.amount) {
        throw new InsufficientFundsError();
      }

      // Create journal
      const journal = await this.repo.createJournal(
        {
          projectId: params.projectId,
          reference: params.reference,
          type: "internal_transfer",
          status: "posted", // Atomic direct posting for transfer primitive
          currency: params.currency,
          description: params.description || `Internal transfer of ${params.amount} ${params.currency}`,
          metadata: params.metadata,
        },
        tx,
      );

      // Create double-entry lines: Debit source (reducing liability), Credit destination (increasing liability)
      const debitEntry = await this.repo.createLedgerEntry(
        {
          journalId: journal.id,
          ledgerAccountId: sourceLedger.id,
          direction: "debit",
          amount: params.amount,
          currency: params.currency,
        },
        tx,
      );

      const creditEntry = await this.repo.createLedgerEntry(
        {
          journalId: journal.id,
          ledgerAccountId: destLedger.id,
          direction: "credit",
          amount: params.amount,
          currency: params.currency,
        },
        tx,
      );

      // Validate sum(debit) == sum(credit)
      if (debitEntry.amount !== creditEntry.amount) {
        throw new JournalNotBalancedError();
      }

      // Update projected available balances atomically on Account tables
      const newSourceAvail = Money.subtract(sourceAcc.available, params.amount);
      const newDestAvail = Money.add(destAcc.available, params.amount);

      await tx.account.update({
        where: { id: params.sourceAccountId },
        data: { available: newSourceAvail },
      });

      await tx.account.update({
        where: { id: params.destinationAccountId },
        data: { available: newDestAvail },
      });

      return {
        ...journal,
        entries: [debitEntry, creditEntry],
      };
    });
  }

  /**
   * Reverses a posted Journal atomically by appending opposing ledger entry lines.
   */
  async reverse(journalId: string, projectId: string): Promise<Journal & { entries: LedgerEntry[] }> {
    const originalJournal = await this.repo.findJournalById(journalId, projectId);
    if (!originalJournal) {
      throw new JournalNotFoundError(`Journal ${journalId} not found`);
    }
    if (originalJournal.status !== "posted") {
      throw new ConflictError(`Only posted transactions can be reversed. Status is ${originalJournal.status}`);
    }
    if (originalJournal.reversalJournalId) {
      throw new JournalAlreadyReversedError();
    }

    const originalEntries = originalJournal.entries;
    if (originalEntries.length < 2) {
      throw new ReconciliationFailureError("Original journal has invalid number of entries");
    }

    // Resolve financial account ids and verify they are active
    const ledgerAccountIds = originalEntries.map((e) => e.ledgerAccountId);
    return await prisma.$transaction(async (tx) => {
      const ledgerAccounts = await tx.ledgerAccount.findMany({
        where: { id: { in: ledgerAccountIds } },
        include: { financialAccount: true },
      });

      for (const la of ledgerAccounts) {
        if (!la.financialAccount) {
          throw new ReconciliationFailureError(`Ledger account ${la.id} has no linked financial account`);
        }
        if (la.financialAccount.status !== "active") {
          throw new AccountNotActiveError(`Financial account ${la.financialAccount.id} is not active`);
        }
      }

      // Sort linked financial account IDs for deadlock prevention
      const financialAccountIds = ledgerAccounts.map((la) => la.financialAccountId as string);
      const sortedIds = [...financialAccountIds].sort();
      for (const id of sortedIds) {
        await tx.$queryRawUnsafe(`SELECT id FROM "Account" WHERE id = $1 FOR UPDATE`, id);
      }

      // If original journal is a transfer, verify that the credited account has sufficient funds to refund the debit
      const sourceCredit = originalEntries.find((e) => e.direction === "credit");
      if (sourceCredit) {
        const balance = await this.calculateBalance(sourceCredit.ledgerAccountId, projectId, tx);
        if (balance < sourceCredit.amount) {
          throw new InsufficientFundsError("Insufficient funds to reverse this transaction");
        }
      }

      const reversalRef = `rev_${originalJournal.reference}`;

      // Create Reversal Journal
      const reversalJournal = await this.repo.createJournal(
        {
          projectId,
          reference: reversalRef,
          type: "adjustment",
          status: "posted",
          currency: originalJournal.currency,
          description: `Reversal of transaction ${originalJournal.id}`,
        },
        tx,
      );

      const reversalEntries: LedgerEntry[] = [];
      let totalDebits = 0;
      let totalCredits = 0;

      // Create inverted entries
      for (const entry of originalEntries) {
        const invertedDirection: EntryDirection = entry.direction === "credit" ? "debit" : "credit";
        const revEntry = await this.repo.createLedgerEntry(
          {
            journalId: reversalJournal.id,
            ledgerAccountId: entry.ledgerAccountId,
            direction: invertedDirection,
            amount: entry.amount,
            currency: entry.currency,
          },
          tx,
        );
        reversalEntries.push(revEntry);

        if (invertedDirection === "debit") {
          totalDebits = Money.add(totalDebits, entry.amount);
        } else {
          totalCredits = Money.add(totalCredits, entry.amount);
        }

        // Apply available balance updates on Account projections
        const la = ledgerAccounts.find((l) => l.id === entry.ledgerAccountId);
        if (la?.financialAccount) {
          const change = entry.amount;
          let newAvailable = la.financialAccount.available;
          if (invertedDirection === "credit") {
            newAvailable = Money.add(newAvailable, change);
          } else {
            newAvailable = Money.subtract(newAvailable, change);
          }

          await tx.account.update({
            where: { id: la.financialAccount.id },
            data: { available: newAvailable },
          });
        }
      }

      if (totalDebits !== totalCredits) {
        throw new JournalNotBalancedError();
      }

      // Bind original and reversal journals together
      await this.repo.updateJournalReversal(originalJournal.id, { reversalJournalId: reversalJournal.id }, tx);
      await this.repo.updateJournalReversal(reversalJournal.id, { reversedJournalId: originalJournal.id }, tx);

      return {
        ...reversalJournal,
        entries: reversalEntries,
      };
    });
  }

  /**
   * Internal reconciliation check asserting ledger-to-projection consistency.
   */
  async runReconciliationCheck(projectId: string): Promise<{
    reconciled: boolean;
    issues: Array<{ accountId: string; calculated: number; projected: number }>;
  }> {
    const accounts = await prisma.account.findMany({
      where: { projectId },
    });

    const issues: Array<{ accountId: string; calculated: number; projected: number }> = [];

    for (const acc of accounts) {
      const ledgerAcc = await this.repo.findLedgerAccountByFinancialAccountId(acc.id, projectId);
      if (!ledgerAcc) {
        // Unused accounts with 0 balance are reconciled
        if (acc.available !== 0) {
          issues.push({ accountId: acc.id, calculated: 0, projected: acc.available });
        }
        continue;
      }

      const calculated = await this.calculateBalance(ledgerAcc.id, projectId);
      if (calculated !== acc.available) {
        issues.push({ accountId: acc.id, calculated, projected: acc.available });
      }
    }

    return {
      reconciled: issues.length === 0,
      issues,
    };
  }
}
export default LedgerService;
