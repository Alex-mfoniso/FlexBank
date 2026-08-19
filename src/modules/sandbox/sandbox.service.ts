import { prisma } from "../../lib/prisma";
import { logger } from "../../lib/logger";
import { ValidationError, NotFoundError, ForbiddenError } from "../../lib/errors";
import { TransferService } from "../transfers/transfer.service";
import { Money } from "../../lib/money";
import crypto from "crypto";

const SANDBOX_MAX_FUNDING_AMOUNT = 1000000000; // 10,000,000.00 minor units
const SANDBOX_MAX_DAILY_FUNDING = 5000000000;  // 50,000,000.00 minor units

export class SandboxService {
  private static readonly transferService = new TransferService();

  /**
   * Funds a test account via ledger adjustments debited from a sandbox treasury account.
   * Enforces single transaction limits and 24-hour aggregate cumulative caps.
   */
  static async fundTestAccount(
    accountId: string,
    projectId: string,
    amount: number,
  ): Promise<any> {
    // 1. Verify project environment boundary
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project || project.environment !== "test") {
      throw new ForbiddenError("Funding operations are strictly isolated to test environment projects");
    }

    // 2. Validate single funding amount limits
    if (amount <= 0 || amount > SANDBOX_MAX_FUNDING_AMOUNT) {
      throw new ValidationError(
        `Sandbox funding single-transaction limit is ${SANDBOX_MAX_FUNDING_AMOUNT / 100} minor units. Requested: ${amount / 100}`,
      );
    }

    // 3. Verify target account exists and matches project context
    const account = await prisma.account.findFirst({
      where: { id: accountId, projectId },
    });
    if (!account) {
      throw new NotFoundError("Target customer account context for sandbox funding not found");
    }

    // 4. Validate daily aggregate caps
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const dailyFundingEvents = await prisma.sandboxEvent.findMany({
      where: {
        projectId,
        scenario: "funding",
        createdAt: { gte: twentyFourHoursAgo },
      },
    });

    const cumulativeDaily = dailyFundingEvents.reduce((sum, evt) => {
      const meta = evt.metadata as any;
      return sum + (meta?.amount || 0);
    }, 0);

    if (cumulativeDaily + amount > SANDBOX_MAX_DAILY_FUNDING) {
      throw new ValidationError(
        `Cumulative sandbox daily funding limit is ${SANDBOX_MAX_DAILY_FUNDING / 100} minor units. Current 24h utilization: ${cumulativeDaily / 100}`,
      );
    }

    // 5. Execute ledger-balanced atomic double-entry funding transaction
    return await prisma.$transaction(async (tx) => {
      const currency = account.currency.toUpperCase();
      const treasuryId = `sandbox_treasury_${currency}`;

      // Resolve treasury ledger account (asset/equity source)
      let treasuryLedger = await tx.ledgerAccount.findFirst({
        where: { id: treasuryId, projectId },
      });
      if (!treasuryLedger) {
        treasuryLedger = await tx.ledgerAccount.create({
          data: {
            id: treasuryId,
            projectId,
            currency,
            type: "asset",
            status: "active",
          },
        });
      }

      // Resolve customer wallet ledger account
      let customerLedger = await tx.ledgerAccount.findFirst({
        where: { financialAccountId: accountId, projectId },
      });
      if (!customerLedger) {
        customerLedger = await tx.ledgerAccount.create({
          data: {
            id: `ledger_${accountId}`,
            projectId,
            financialAccountId: accountId,
            currency,
            type: "customer",
            status: "active",
          },
        });
      }

      // Create standard balanced double-entry funding Journal (status "posted" fires webhooks automatically)
      const journalId = `txn_${crypto.randomUUID().replace(/-/g, "")}`;
      await tx.journal.create({
        data: {
          id: journalId,
          projectId,
          reference: `sandbox_fund_${crypto.randomUUID().substring(0, 8)}`,
          type: "adjustment",
          status: "posted",
          currency,
          description: `Sandbox test funding credit of ${amount} ${currency} to account ${accountId}`,
        },
      });

      // Debit Treasury Account
      await tx.ledgerEntry.create({
        data: {
          id: `ent_${crypto.randomUUID().replace(/-/g, "")}`,
          journalId,
          ledgerAccountId: treasuryId,
          direction: "debit",
          amount,
          currency,
        },
      });

      // Credit Customer Account
      await tx.ledgerEntry.create({
        data: {
          id: `ent_${crypto.randomUUID().replace(/-/g, "")}`,
          journalId,
          ledgerAccountId: customerLedger.id,
          direction: "credit",
          amount,
          currency,
        },
      });

      // Atomically update balance caches of target account projection columns
      const updatedAccount = await tx.account.update({
        where: { id: accountId },
        data: {
          available: Money.add(account.available, amount),
        },
      });

      // Log Sandbox Event
      await tx.sandboxEvent.create({
        data: {
          id: `evs_${crypto.randomUUID().replace(/-/g, "")}`,
          projectId,
          scenario: "funding",
          metadata: {
            accountId,
            amount,
            currency,
          },
        },
      });

      return updatedAccount;
    });
  }

  /**
   * Forces state transitions on a pending external transfer.
   */
  static async simulateTransferScenario(
    transferId: string,
    projectId: string,
    scenario: string,
  ): Promise<any> {
    const transfer = await prisma.transfer.findFirst({
      where: { id: transferId, projectId },
    });
    if (!transfer) {
      throw new NotFoundError("Target transfer record not found");
    }

    if (transfer.status !== "processing") {
      throw new ValidationError(`Simulation scenario cannot be run on a terminal ${transfer.status} transfer`);
    }

    logger.info({ transferId, scenario }, "Simulating transfer outcome scenario");

    switch (scenario) {
      case "settled":
      case "successful_transfer":
        // Settle transfer (releases pending hold and increments cleared accounts)
        return await this.transferService.settleTransfer(transferId, projectId);

      case "provider_rejected":
      case "failed_transfer":
        // Reverse transfer (releases hold, restores funds to customer available balance)
        return await this.transferService.reverseTransfer(
          transferId,
          projectId,
          "SIMULATED_FAILURE",
          "This transfer was simulated as failed by the developer sandbox platform",
        );

      case "provider_timeout":
        // Maintain processing status, append a provider transaction log
        await prisma.providerTransaction.create({
          data: {
            id: `prv_${crypto.randomUUID().replace(/-/g, "")}`,
            transferId,
            provider: transfer.providerId || "sandbox",
            status: "processing",
            responseMetadata: {
              error: "Simulated timeout during sandbox execution flow",
              simulated: true,
            },
          },
        });
        return transfer;

      default:
        throw new ValidationError(`Unsupported sandbox simulator scenario: ${scenario}`);
    }
  }

  /**
   * Thoroughly resets all test-only project-specific records inside a secure database transaction scope.
   */
  static async resetSandbox(projectId: string): Promise<void> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project || project.environment !== "test") {
      throw new ForbiddenError("Reset operation is strictly forbidden on non-sandbox/production projects");
    }

    logger.info({ projectId }, "Executing full sandboxed project database reset");

    await prisma.$transaction(async (tx) => {
      // 1. Wipe Webhook Deliveries associated with project endpoints
      const endpoints = await tx.webhookEndpoint.findMany({ where: { projectId } });
      const endpointIds = endpoints.map((e) => e.id);
      if (endpointIds.length > 0) {
        await tx.webhookDelivery.deleteMany({
          where: { webhookEndpointId: { in: endpointIds } },
        });
      }

      // 2. Wipe Webhook Endpoints
      await tx.webhookEndpoint.deleteMany({ where: { projectId } });

      // 3. Wipe Api Request Logs & Sandbox events
      await tx.apiRequestLog.deleteMany({ where: { projectId } });
      await tx.sandboxEvent.deleteMany({ where: { projectId } });

      // 4. Wipe Provider Transactions
      const transfers = await tx.transfer.findMany({ where: { projectId } });
      const transferIds = transfers.map((t) => t.id);
      if (transferIds.length > 0) {
        await tx.providerTransaction.deleteMany({
          where: { transferId: { in: transferIds } },
        });
      }

      // 5. Wipe Transfers
      await tx.transfer.deleteMany({ where: { projectId } });

      // 6. Wipe Beneficiaries
      await tx.beneficiary.deleteMany({ where: { projectId } });

      // 7. Wipe Ledger Entries & Journals (must delete entries first)
      const journals = await tx.journal.findMany({ where: { projectId } });
      const journalIds = journals.map((j) => j.id);
      if (journalIds.length > 0) {
        await tx.ledgerEntry.deleteMany({
          where: { journalId: { in: journalIds } },
        });
      }
      await tx.journal.deleteMany({ where: { projectId } });

      // 8. Wipe Ledger Accounts
      await tx.ledgerAccount.deleteMany({ where: { projectId } });

      // 9. Wipe Financial Accounts
      await tx.account.deleteMany({ where: { projectId } });

      // 10. Wipe Customers
      await tx.customer.deleteMany({ where: { projectId } });
    });

    logger.info({ projectId }, "Sandboxed project reset completed successfully");
  }
}

export default SandboxService;
