// Run with: npx tsx src/create-passwords.ts
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../prisma/generated/client";
import { randomBytes, scrypt } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

const adapter = new PrismaLibSql({ url: "file:../../local.db" });
const prisma = new PrismaClient({ adapter });

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

const users = [
  { id: "u-admin", email: "admin@dmrh.gov.et" },
  { id: "u-tigist", email: "tigist@dmrh.gov.et" },
  { id: "u-yonas", email: "yonas@dmrh.gov.et" },
  { id: "u-mekdes", email: "mekdes@dmrh.gov.et" },
  { id: "u-girma", email: "girma@dmrh.gov.et" },
  { id: "u-hiwot", email: "hiwot@dmrh.gov.et" },
  { id: "u-bereket", email: "bereket@dmrh.gov.et" },
  { id: "u-selam", email: "selam@dmrh.gov.et" },
  { id: "u-solomon", email: "solomon@dmrh.gov.et" },
];

async function main() {
  const hashed = await hashPassword("password123");
  for (const u of users) {
    await prisma.account.upsert({
      where: { issuer_accountId: { issuer: "credential", accountId: u.email } },
      update: { password: hashed },
      create: {
        id: `${u.id}-cred`,
        issuer: "credential",
        accountId: u.email,
        providerId: "credential",
        userId: u.id,
        password: hashed,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    console.log(`✓ ${u.email}`);
  }
  console.log("\n✅ All passwords set to: password123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
