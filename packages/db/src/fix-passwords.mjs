// Fix password hashes to match Better Auth's format (salt:hash with scrypt)
import { createClient } from "@libsql/client";
import { scryptAsync } from "@noble/hashes/scrypt.js";

const db = createClient({ url: process.env.DATABASE_URL ?? "file:/home/yordanos/Desktop/clinic/my-better-t-app/local.db" });

function hexEncode(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password) {
  const saltBytes = new Uint8Array(16);
  crypto.getRandomValues(saltBytes);
  const salt = hexEncode(saltBytes);
  const key = await scryptAsync(password.normalize("NFKC"), salt, {
    N: 16384, r: 16, p: 1, dkLen: 64,
    maxmem: 128 * 16384 * 16 * 2,
  });
  return `${salt}:${hexEncode(key)}`;
}

const users = [
  "admin@dmrh.gov.et", "tigist@dmrh.gov.et", "yonas@dmrh.gov.et",
  "mekdes@dmrh.gov.et", "girma@dmrh.gov.et", "hiwot@dmrh.gov.et",
  "bereket@dmrh.gov.et", "selam@dmrh.gov.et", "solomon@dmrh.gov.et",
];

const hashed = await hashPassword("password123");
console.log("Generated hash:", hashed.slice(0, 40) + "...");

for (const email of users) {
  const newHash = await hashPassword("password123");
  await db.execute({
    sql: "UPDATE account SET password = ? WHERE accountId = ?",
    args: [newHash, email],
  });
  console.log(`✓ ${email}`);
}

console.log("\n✅ All passwords updated to Better Auth format (password123)");
db.close();
