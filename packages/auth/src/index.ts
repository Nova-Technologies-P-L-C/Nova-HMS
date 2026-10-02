// =============================================================================
// Nova HMS — Better Auth Configuration
// =============================================================================
//
// This file configures Better Auth — the authentication library used across
// the entire Nova HMS platform. It is consumed by:
//   - The Express server (apps/server/src/index.ts) — mounts /api/auth/* routes
//   - The tRPC context (packages/api/src/context.ts) — validates session cookies
//   - The Next.js frontend (apps/web/src/lib/auth-client.ts) — client-side auth
//
// Authentication strategy:
//   Nova HMS uses email + password authentication only.
//   Staff accounts are created by the Hospital Admin or Nova Admin.
//   Patients use a separate QR-code-based self-service portal (no password).
//
// Session management:
//   Better Auth issues an HTTP-only session cookie after successful login.
//   The cookie is scoped to lax SameSite policy for cross-origin dev setups
//   (Next.js :3001 ↔ Express :3000). In production this should be tightened
//   to the same domain with secure: true.
//
// Multi-tenancy:
//   Authentication itself is NOT tenant-specific — a single user account can
//   belong to multiple hospitals. Tenant resolution happens after login via
//   the x-tenant-id header and UserTenantRole lookup in the tRPC context.
//
// Database adapter:
//   Uses the Prisma adapter backed by the shared SQLite (dev) / PostgreSQL (prod)
//   database. Better Auth manages its own tables (User, Session, Account)
//   defined in packages/db/prisma/schema/auth.prisma.
//
// Environment variables required (from @my-better-t-app/env/server):
//   BETTER_AUTH_SECRET — Random 32+ char secret for session signing/encryption
//   BETTER_AUTH_URL    — Base URL of the auth server (e.g. http://localhost:3000)
//   CORS_ORIGIN        — Allowed frontend origin (e.g. http://localhost:3001)
// =============================================================================

import { createPrismaClient } from "@my-better-t-app/db";
import { env } from "@my-better-t-app/env/server";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

// Factory function — creates a new auth instance with a fresh Prisma client.
// Exported as a function (rather than a singleton) to support environments
// where the database connection needs to be re-established (e.g. serverless cold starts).
export function createAuth() {
  // Create a dedicated Prisma client for the auth adapter.
  // This keeps auth DB operations isolated from the clinical data client
  // and avoids connection pool exhaustion in high-traffic scenarios.
  const prisma = createPrismaClient();

  return betterAuth({
    // ── Database adapter ───────────────────────────────────────────────────
    // Prisma adapter reads/writes the Better Auth managed tables:
    //   user, session, account, verification
    // These are defined in packages/db/prisma/schema/auth.prisma
    database: prismaAdapter(prisma, {
      provider: "sqlite", // Change to "postgresql" for production
    }),

    // ── CORS trusted origins ───────────────────────────────────────────────
    // Only origins in this list are allowed to make cross-origin auth requests.
    // In production set CORS_ORIGIN to the exact hospital subdomain,
    // e.g. "https://dmrh.novahms.et"
    trustedOrigins: [env.CORS_ORIGIN],

    // ── Authentication methods ─────────────────────────────────────────────
    // Email + password is the only auth method enabled.
    // Hospital staff accounts are created by admins — no self-registration.
    // Patient portal uses QR code + health ID lookup (separate flow, no password).
    emailAndPassword: {
      enabled: true,
    },

    // ── Security settings ──────────────────────────────────────────────────
    secret:  env.BETTER_AUTH_SECRET, // Used for session cookie signing and CSRF protection
    baseURL: env.BETTER_AUTH_URL,    // Must match the Express server's public URL

    advanced: {
      defaultCookieAttributes: {
        // sameSite: "lax" allows the cookie to be sent on top-level navigation
        // and same-site requests. Use "strict" for maximum security in production.
        sameSite: "lax",
        // PRODUCTION BLOCKER (P5): set secure: true to enforce HTTPS-only cookie transmission.
        // Keep false during local HTTP development (localhost).
        // Use an environment variable to switch automatically:
        //   secure: process.env.NODE_ENV === "production"
        // Without this, session cookies can be transmitted over HTTP in production,
        // exposing staff credentials to network interception.
        secure: false,
        // httpOnly: true prevents JavaScript from reading the session cookie,
        // protecting against XSS-based session theft.
        httpOnly: true,
      },
    },

    // ── Plugins ───────────────────────────────────────────────────────────
    // No plugins active currently.
    // Future considerations:
    //   - Two-factor authentication (OTP via email/SMS) for sensitive roles
    //   - Audit logging plugin for session events
    //   - Ethiopia NHID (National Health ID) SSO when the MOH API becomes available
    plugins: [],
  });
}

// Singleton auth instance — used throughout the server and API packages.
// Import this directly for session validation and user lookup.
export const auth = createAuth();
