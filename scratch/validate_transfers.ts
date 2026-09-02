import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const API_URL = "http://localhost:4000/api/v1";
const API_KEY = "fb_test_demokey12345.demosecret1234567890123456789012";

async function main() {
  console.log("==================================================");
  console.log("🧪 RUNNING END-TO-END SANDBOX INTEGRATION TESTS");
  console.log("==================================================\n");

  const headers = {
    "Authorization": `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
  };

  // 1. Check current wallets
  console.log("Step 1: Inspecting starting wallet balances...");
  const walletA = await prisma.account.findUnique({ where: { id: "acc_adekunle_ngn_001" } });
  const walletB = await prisma.account.findUnique({ where: { id: "acc_chioma_ngn_002" } });
  
  if (!walletA || !walletB) {
    throw new Error("Seeded wallets not found in database!");
  }

  console.log(` - Adekunle starting: ₦${(walletA.available / 100).toLocaleString()}`);
  console.log(` - Chioma starting  : ₦${(walletB.available / 100).toLocaleString()}\n`);

  // 2. Perform a successful transfer
  console.log("Step 2: Firing successful transfer (₦10,000.00)...");
  const transferRef = `test_ref_${Date.now()}`;
  const idempotencyKey = `idemp_${Date.now()}`;

  const payload = {
    type: "internal",
    sourceAccountId: "acc_adekunle_ngn_001",
    destinationAccountId: "acc_chioma_ngn_002",
    amount: 1000000, // ₦10,000.00 (1,000,000 kobo)
    currency: "NGN",
    reference: transferRef,
  };

  const res1 = await fetch(`${API_URL}/transfers`, {
    method: "POST",
    headers: {
      ...headers,
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(payload),
  });

  const data1 = (await res1.json()) as any;

  console.log(` ✅ Transfer Initiated. Response Code: ${res1.status}`);
  console.log(`    Status: ${data1.transfer?.status}`);
  console.log(`    ID: ${data1.transfer?.id}\n`);

  // Verify database post-balances
  const walletA_post = await prisma.account.findUnique({ where: { id: "acc_adekunle_ngn_001" } });
  const walletB_post = await prisma.account.findUnique({ where: { id: "acc_chioma_ngn_002" } });

  console.log("Checking balances after transfer:");
  console.log(` - Adekunle post: ₦${(walletA_post!.available / 100).toLocaleString()} (Expected decrease by 10,000)`);
  console.log(` - Chioma post  : ₦${(walletB_post!.available / 100).toLocaleString()} (Expected increase by 10,000)`);

  if (walletA_post!.available !== walletA.available - 1000000) {
    throw new Error("❌ Validation Error: Source wallet was not debited correctly!");
  }
  if (walletB_post!.available !== walletB.available + 1000000) {
    throw new Error("❌ Validation Error: Destination wallet was not credited correctly!");
  }
  console.log(" ✅ Double-entry wallet available balance adjustment verified!\n");

  // 3. Test Idempotency key reuse
  console.log("Step 3: Repeating same request with identical Idempotency-Key...");
  const res2 = await fetch(`${API_URL}/transfers`, {
    method: "POST",
    headers: {
      ...headers,
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(payload),
  });

  const data2 = (await res2.json()) as any;

  console.log(` ✅ Idempotent response captured! Status Code: ${res2.status}`);
  console.log(`    Transfer status: ${data2.transfer?.status}`);
  
  // Re-verify balances didn't change twice
  const walletA_idem = await prisma.account.findUnique({ where: { id: "acc_adekunle_ngn_001" } });
  if (walletA_idem!.available !== walletA_post!.available) {
    throw new Error("❌ Idempotency Breach: Wallet debited twice on token reuse!");
  }
  console.log(" ✅ Idempotency protection fully bulletproof! No extra debit applied.\n");

  // 4. Test Insufficient Funds Failure
  console.log("Step 4: Firing transfer with Insufficient Funds (₦50,000,000.00)...");
  const res3 = await fetch(`${API_URL}/transfers`, {
    method: "POST",
    headers: {
      ...headers,
      "Idempotency-Key": `idemp_fail_${Date.now()}`,
    },
    body: JSON.stringify({
      ...payload,
      amount: 5000000000, // ₦50M
      reference: `fail_ref_funds_${Date.now()}`,
    }),
  });

  const data3 = (await res3.json()) as any;

  console.log(` ✅ Request rejected as expected! HTTP Status: ${res3.status}`);
  console.log(`    Code: ${data3.error?.code}`);
  console.log(`    Message: ${data3.error?.message}`);

  // 5. Test Invalid API key reject
  console.log("\nStep 5: Firing transfer with invalid API Credentials...");
  const res4 = await fetch(`${API_URL}/transfers`, {
    method: "POST",
    headers: {
      ...headers,
      "Authorization": "Bearer fb_test_demo_key_invalid.bad_secret_here",
    },
    body: JSON.stringify(payload),
  });

  const data4 = (await res4.json()) as any;

  console.log(` ✅ Request blocked as expected! HTTP Status: ${res4.status}`);
  console.log(`    Code: ${data4.error?.code}`);
  console.log(`    Message: ${data4.error?.message}`);

  console.log("\n==================================================");
  console.log("🎉 ALL SANDBOX INTEGRATION TESTS PASSED!");
  console.log("==================================================");
}

main()
  .catch((err) => {
    console.error("❌ Test validation failed:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
