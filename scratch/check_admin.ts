import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

async function main() {
  console.log("Connecting to PostgreSQL database...");
  const admins = await prisma.user.findMany({
    where: { role: "admin" }
  });

  const email = "admin@ricarut.com";
  const password = "RicarutAdmin2026!";
  const passwordHash = await argon2.hash(password);

  const updatedAdmin = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: "admin",
      status: "active",
    },
    create: {
      email,
      passwordHash,
      firstName: "System",
      lastName: "Administrator",
      role: "admin",
      status: "active",
    },
  });

  console.log("\n==================================================");
  console.log("👑 ADMINISTRATOR ACCOUNT SYNCHRONIZED & READY");
  console.log("==================================================");
  console.log(`👉 Email   : ${updatedAdmin.email}`);
  console.log(`👉 Password: ${password}`);
  console.log(`   Status  : ${updatedAdmin.status}`);
  console.log(`   Role    : ${updatedAdmin.role}`);
  console.log("==================================================\n");
}

main()
  .catch(err => {
    console.error("❌ Error executing admin config check:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
