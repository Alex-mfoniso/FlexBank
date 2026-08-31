import {
  PrismaClient,
  ProjectEnvironment,
  UserStatus,
  OrgRole,
  CustomerStatus,
  AccountStatus,
  LedgerAccountType,
  LedgerAccountStatus,
  JournalStatus,
  JournalType,
  EntryDirection,
} from "@prisma/client";
import argon2 from "argon2";
import crypto from "crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("==================================================");
  console.log("🛡️ STARTING TRANSACTIONAL DATABASE RESET & SEED");
  console.log("==================================================");

  // 1. Cascading wipe
  console.log("Step 1: Cascading deletion of dependent tables...");
  
  console.log(" - WebhookDelivery...");
  await prisma.webhookDelivery.deleteMany();
  
  console.log(" - WebhookEndpoint...");
  await prisma.webhookEndpoint.deleteMany();
  
  console.log(" - SandboxEvent...");
  await prisma.sandboxEvent.deleteMany();
  
  console.log(" - ProviderTransaction...");
  await prisma.providerTransaction.deleteMany();
  
  console.log(" - Transfer...");
  await prisma.transfer.deleteMany();
  
  console.log(" - Beneficiary...");
  await prisma.beneficiary.deleteMany();
  
  console.log(" - LedgerEntry...");
  await prisma.ledgerEntry.deleteMany();
  
  console.log(" - Journal...");
  await prisma.journal.deleteMany();
  
  console.log(" - LedgerAccount...");
  await prisma.ledgerAccount.deleteMany();
  
  console.log(" - Account...");
  await prisma.account.deleteMany();
  
  console.log(" - Customer...");
  await prisma.customer.deleteMany();
  
  console.log(" - IdempotencyRecord...");
  await prisma.idempotencyRecord.deleteMany();
  
  console.log(" - ApiKey...");
  await prisma.apiKey.deleteMany();
  
  console.log(" - Project...");
  await prisma.project.deleteMany();
  
  console.log(" - OrganizationMember...");
  await prisma.organizationMember.deleteMany();
  
  console.log(" - Organization...");
  await prisma.organization.deleteMany();
  
  console.log(" - AuditLog...");
  await prisma.auditLog.deleteMany();
  
  console.log(" - ApiRequestLog...");
  await prisma.apiRequestLog.deleteMany();
  
  console.log(" - SystemCheck...");
  await prisma.systemCheck.deleteMany();

  console.log("Step 2: Removing all non-administrative users...");
  const userWipe = await prisma.user.deleteMany({
    where: {
      email: {
        not: "admin@ricarut.com",
      },
    },
  });
  console.log(` ✅ Removed ${userWipe.count} stale developer users.`);

  console.log("\n==================================================");
  console.log("⚙️ SEEDING CLEAN DEMO WORKSPACE & SANDBOX DATA");
  console.log("==================================================");

  // 1. Create Demo Developer
  console.log("Creating Demo Developer user account...");
  const devEmail = "demo.developer@ricarut.com";
  const devPassword = "RicarutDemo2026!";
  const passwordHash = await argon2.hash(devPassword);

  const demoDev = await prisma.user.create({
    data: {
      email: devEmail,
      passwordHash,
      firstName: "Demo",
      lastName: "Developer",
      status: UserStatus.active,
      role: "user",
    },
  });
  console.log(` ✅ Demo Developer: ${devEmail}`);

  // 2. Create Demo Organization
  console.log("Creating Ricarut Demo Organization...");
  const demoOrg = await prisma.organization.create({
    data: {
      name: "Ricarut Demo Org",
      slug: "ricarut-demo-org",
      status: "active",
    },
  });
  console.log(` ✅ Demo Organization: ${demoOrg.name}`);

  // 3. Link user to organization
  await prisma.organizationMember.create({
    data: {
      organizationId: demoOrg.id,
      userId: demoDev.id,
      role: OrgRole.owner,
    },
  });
  console.log(" ✅ Linked Demo Developer as Organization Owner");

  // 4. Create Project
  console.log("Creating Demo Project...");
  const demoProject = await prisma.project.create({
    data: {
      organizationId: demoOrg.id,
      name: "Demo Sandbox Project",
      description: "Default sandbox project for verifying core payment integrations",
      environment: ProjectEnvironment.test,
      status: "active",
    },
  });
  console.log(` ✅ Demo Project: ${demoProject.name} (test)`);

  // 5. Seed API Key
  console.log("Generating static, secure developer API Key...");
  const plaintextKey = "fb_test_demokey12345.demosecret1234567890123456789012";
  const keyPrefix = "fb_test_demokey12345";
  const keyHash = crypto.createHash("sha256").update(plaintextKey).digest("hex");

  const demoApiKey = await prisma.apiKey.create({
    data: {
      projectId: demoProject.id,
      name: "Demo Verification Secret Key",
      keyPrefix,
      keyHash,
      environment: ProjectEnvironment.test,
    },
  });
  console.log(" ✅ API Key Seeded Successfully");
  console.log(`    - Key Prefix: ${demoApiKey.keyPrefix}`);
  console.log(`    - Plaintext : ${plaintextKey}`);

  // 6. Seed Demo Customers
  console.log("Creating Demo End-Customers...");
  const custA = await prisma.customer.create({
    data: {
      id: "cust_adekunle_001",
      projectId: demoProject.id,
      externalId: "demo_cust_001",
      firstName: "Adekunle",
      lastName: "Alabi",
      email: "adekunle.alabi@example.com",
      status: CustomerStatus.active,
    },
  });

  const custB = await prisma.customer.create({
    data: {
      id: "cust_chioma_002",
      projectId: demoProject.id,
      externalId: "demo_cust_002",
      firstName: "Chioma",
      lastName: "Nwachukwu",
      email: "chioma.nwachukwu@example.com",
      status: CustomerStatus.active,
    },
  });
  console.log(` ✅ Customer A: ${custA.firstName} ${custA.lastName}`);
  console.log(` ✅ Customer B: ${custB.firstName} ${custB.lastName}`);

  // 7. Seed Wallet Accounts (in Cents/Kobo)
  console.log("Creating End-Customer Virtual Wallet Accounts...");
  const accAId = "acc_adekunle_ngn_001";
  const accBId = "acc_chioma_ngn_002";

  // Available amounts: 10,000,000 NGN and 5,000,000 NGN in Kobo/Cents
  const amountACents = 1000000000; 
  const amountBCents = 500000000;

  const accA = await prisma.account.create({
    data: {
      id: accAId,
      customerId: custA.id,
      projectId: demoProject.id,
      currency: "NGN",
      status: AccountStatus.active,
      name: "Adekunle Alabi NGN Wallet",
      available: amountACents,
      pending: 0,
    },
  });

  const accB = await prisma.account.create({
    data: {
      id: accBId,
      customerId: custB.id,
      projectId: demoProject.id,
      currency: "NGN",
      status: AccountStatus.active,
      name: "Chioma Nwachukwu NGN Wallet",
      available: amountBCents,
      pending: 0,
    },
  });
  console.log(` ✅ Wallet Adekunle: ₦${(accA.available / 100).toLocaleString()} NGN`);
  console.log(` ✅ Wallet Chioma  : ₦${(accB.available / 100).toLocaleString()} NGN`);

  // 8. Create Ledger Accounts
  console.log("Setting up double-entry ledger accounts...");
  
  // Liability account representing customer deposits
  const laA = await prisma.ledgerAccount.create({
    data: {
      id: "la_adekunle_ngn_001",
      financialAccountId: accAId,
      projectId: demoProject.id,
      currency: "NGN",
      type: LedgerAccountType.customer,
      status: LedgerAccountStatus.active,
    },
  });

  const laB = await prisma.ledgerAccount.create({
    data: {
      id: "la_chioma_ngn_002",
      financialAccountId: accBId,
      projectId: demoProject.id,
      currency: "NGN",
      type: LedgerAccountType.customer,
      status: LedgerAccountStatus.active,
    },
  });

  // Central platform asset clearing account representing vault liquidity
  const laCentral = await prisma.ledgerAccount.create({
    data: {
      id: "la_central_vault_ngn_001",
      projectId: demoProject.id,
      currency: "NGN",
      type: LedgerAccountType.asset,
      status: LedgerAccountStatus.active,
    },
  });
  console.log(" ✅ Ledger accounts mapped.");

  // 9. Post Opening Funding Journals & Balanced Splits
  console.log("Posting balanced opening ledger journal entries...");
  const openingJournalId = "jr_opening_funding_001";
  
  const openingJournal = await prisma.journal.create({
    data: {
      id: openingJournalId,
      projectId: demoProject.id,
      reference: "opening_liquidity_funding_demo",
      type: JournalType.adjustment,
      status: JournalStatus.posted,
      currency: "NGN",
      description: "Balanced initial sandbox wallet opening liquidity seeding",
    },
  });

  // Balanced Double Entry Splits:
  // - Vault Liquidity Asset (Debit increases asset) => 1.5 Billion cents (₦15,000,000)
  // - Adekunle Liability Deposit (Credit increases customer deposit) => 1.0 Billion cents (₦10,000,000)
  // - Chioma Liability Deposit (Credit increases customer deposit) => 0.5 Billion cents (₦5,000,000)
  // Sum of Debits (1.5B) === Sum of Credits (1.0B + 0.5B). Perfect balance!

  await prisma.ledgerEntry.createMany({
    data: [
      {
        id: "le_central_vault_debit_001",
        journalId: openingJournalId,
        ledgerAccountId: laCentral.id,
        direction: EntryDirection.debit,
        amount: amountACents + amountBCents,
        currency: "NGN",
      },
      {
        id: "le_adekunle_credit_001",
        journalId: openingJournalId,
        ledgerAccountId: laA.id,
        direction: EntryDirection.credit,
        amount: amountACents,
        currency: "NGN",
      },
      {
        id: "le_chioma_credit_002",
        journalId: openingJournalId,
        ledgerAccountId: laB.id,
        direction: EntryDirection.credit,
        amount: amountBCents,
        currency: "NGN",
      },
    ],
  });

  console.log(" ✅ Double-Entry journal posted successfully (Balance factor verified).");
  console.log("==================================================");
  console.log("🎉 DATABASE CLEAN RESET AND SEEDING COMPLETED!");
  console.log("==================================================");
}

main()
  .catch((err) => {
    console.error("❌ Reset script failure error trace:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
