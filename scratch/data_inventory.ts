import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Connecting to database to count current records...\n");

  const [
    systemChecks,
    users,
    organizations,
    members,
    projects,
    apiKeys,
    auditLogs,
    customers,
    accounts,
    ledgerAccounts,
    journals,
    ledgerEntries,
    idempotency,
    transfers,
    beneficiaries,
    providerTx,
    webhookEvents,
    webhookEndpoints,
    webhookDeliveries,
    apiLogs,
    sandboxEvents,
  ] = await Promise.all([
    prisma.systemCheck.count(),
    prisma.user.count(),
    prisma.organization.count(),
    prisma.organizationMember.count(),
    prisma.project.count(),
    prisma.apiKey.count(),
    prisma.auditLog.count(),
    prisma.customer.count(),
    prisma.account.count(),
    prisma.ledgerAccount.count(),
    prisma.journal.count(),
    prisma.ledgerEntry.count(),
    prisma.idempotencyRecord.count(),
    prisma.transfer.count(),
    prisma.beneficiary.count(),
    prisma.providerTransaction.count(),
    prisma.webhookEvent.count(),
    prisma.webhookEndpoint.count(),
    prisma.webhookDelivery.count(),
    prisma.apiRequestLog.count(),
    prisma.sandboxEvent.count(),
  ]);

  console.log("==================================================");
  console.log("📊 CURRENT DATABASE RECORD INVENTORY CENSUS");
  console.log("==================================================");
  console.log(`System Checks       : ${systemChecks}`);
  console.log(`Users               : ${users}`);
  console.log(`Organizations       : ${organizations}`);
  console.log(`Organization Members: ${members}`);
  console.log(`Projects            : ${projects}`);
  console.log(`API Keys            : ${apiKeys}`);
  console.log(`Audit Logs          : ${auditLogs}`);
  console.log(`Customers           : ${customers}`);
  console.log(`Accounts (Wallets)  : ${accounts}`);
  console.log(`Ledger Accounts     : ${ledgerAccounts}`);
  console.log(`Journal Entries     : ${journals}`);
  console.log(`Ledger Entries      : ${ledgerEntries}`);
  console.log(`Idempotency Records : ${idempotency}`);
  console.log(`Transfers           : ${transfers}`);
  console.log(`Beneficiaries       : ${beneficiaries}`);
  console.log(`Provider Transactions: ${providerTx}`);
  console.log(`Webhook Events (In) : ${webhookEvents}`);
  console.log(`Webhook Endpoints   : ${webhookEndpoints}`);
  console.log(`Webhook Deliveries(Out): ${webhookDeliveries}`);
  console.log(`API Request Logs    : ${apiLogs}`);
  console.log(`Sandbox Events      : ${sandboxEvents}`);
  console.log("==================================================\n");
}

main()
  .catch(err => {
    console.error("❌ Error counting database records:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
