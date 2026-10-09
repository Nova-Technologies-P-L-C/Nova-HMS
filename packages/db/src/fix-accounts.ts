// Run: npx tsx src/fix-accounts.ts
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../prisma/generated/client";
import { hashPassword } from "@better-auth/utils/password";

const DB_PATH =
  process.env.DATABASE_URL ??
  "file:C:/Users/HP/OneDrive/Desktop/Nova HMS/Nova-HMS-main/packages/db/nova-hms.db";

const adapter = new PrismaLibSql({ url: DB_PATH });
const prisma = new PrismaClient({ adapter });

const PASSWORD = "password123";

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true },
  });
  console.log(`Found ${users.length} users\n`);

  // Delete all old wrong-format accounts
  const deleted = await prisma.account.deleteMany({
    where: { issuer: { in: ["credential", "local:credential"] } },
  });
  console.log(`Deleted ${deleted.count} old account rows\n`);

  // Generate hash once using better-auth's own hasher (same algo it uses to verify)
  const hash = await hashPassword(PASSWORD);
  const now = new Date();

  for (const u of users) {
    await prisma.account.create({
      data: {
        id: `ba-${u.id}`,
        issuer: "local:credential",  // createLocalAccountIssuer("credential") = "local:credential"
        accountId: u.id,             // better-auth uses user.id, NOT email
        providerId: "credential",
        userId: u.id,
        password: hash,
        createdAt: now,
        updatedAt: now,
      },
    });
    console.log(`  ✓  ${u.email}  (${u.name})`);
  }

  console.log(`\n✅ Done! All ${users.length} users → password: ${PASSWORD}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
