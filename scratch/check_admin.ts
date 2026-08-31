import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

async function main() {
  console.log("Connecting to PostgreSQL database...");
  const admins = await prisma.user.findMany({
    where: { role: "admin" }
  });

  if (admins.length > 0) {
    console.log("\n==================================================");
    console.log("👑 FOUND ADMINISTRATOR ACCOUNTS IN DATABASE");
    console.log("==================================================");
    admins.forEach(a => {
      console.log(`👉 Email : ${a.email}`);
      console.log(`   Name  : ${a.firstName} ${a.lastName}`);
      console.log(`   Status: ${a.status}`);
      console.log(`   Role  : ${a.role}`);
      console.log("--------------------------------------------------");
    });
    console.log("\n(Note: If you need to log in with a new account or reset credentials, you can modify this script.)");
  } else {
    console.log("\n==================================================");
    console.log("⚙️ SEEDING DEFAULT ADMINISTRATOR ACCOUNT");
    console.log("==================================================");
    const email = "admin@ricarut.com";
    const password = "RicarutAdmin2026!";
    const passwordHash = await argon2.hash(password);

    const newAdmin = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: "System",
        lastName: "Administrator",
        role: "admin",
        status: "active",
      }
    });

    console.log(`✅ Default administrator created successfully!`);
    console.log(`👉 Email   : ${email}`);
    console.log(`👉 Password: ${password}`);
    console.log("==================================================\n");
  }
}

main()
  .catch(err => {
    console.error("❌ Error executing admin config check:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
