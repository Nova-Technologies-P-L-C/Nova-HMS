// =============================================================================
// Nova HMS — tRPC Procedure Factory & Middleware
// =============================================================================
//
// This file is the entry point for the tRPC layer. It defines three
// procedure types that act as middleware tiers, each adding progressively
// stricter access control:
//
//   publicProcedure    → No authentication required (public endpoints)
//   protectedProcedure → Valid session required (logged-in user)
//   tenantProcedure    → Session + tenantId + role required (clinical staff)
//
// All routers (patient, visit, billing, lab, etc.) use `tenantProcedure`
// as their base — this ensures every clinical API call is:
//   1. Authenticated (valid Better Auth session cookie)
//   2. Tenant-scoped (x-tenant-id header present and resolved)
//   3. Role-assigned (user has a role in that specific hospital)
//
// The `requireRole()` factory builds role-specific guards on top of
// tenantProcedure, e.g. only Pharmacists can dispense prescriptions.
//
// Context shape (from context.ts):
//   ctx.session   — Better Auth session object
//   ctx.userId    — Authenticated user's ID string
//   ctx.tenantId  — Hospital tenant ID (from x-tenant-id request header)
//   ctx.role      — User's role in this tenant (e.g. "Doctor", "Pharmacist")
// =============================================================================

import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "./context";

// Initialise tRPC with the full request Context type.
// This gives every procedure access to ctx.session, ctx.userId,
// ctx.tenantId, and ctx.role without any casting.
export const t = initTRPC.context<Context>().create();

// ─── EXPORTS ──────────────────────────────────────────────
// Re-export the router builder and base procedure types so all
// router files can import from one central place.
export const router = t.router;

// publicProcedure — no authentication gate.
// Use for: health-check endpoints, public marketing API calls, etc.
// Currently not used for any clinical data — kept for future use.
export const publicProcedure = t.procedure;

// ─── PROTECTED PROCEDURE ──────────────────────────────────
// Requires a valid Better Auth session cookie.
// Throws UNAUTHORIZED (401) if the user is not logged in.
//
// Use for: user profile reads, notification fetches — anything that
// needs a user identity but does not require a specific hospital context.
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session || !ctx.userId) {
    // 401 — client must redirect to /nova/login
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
  }
  // Narrow ctx types: session and userId are guaranteed non-null from here
  return next({ ctx: { ...ctx, session: ctx.session, userId: ctx.userId } });
});

// ─── TENANT PROCEDURE ─────────────────────────────────────
// The primary procedure type for ALL clinical API calls.
// Stacks three checks:
//   1. Valid session / userId (user is logged in)
//   2. tenantId present (frontend sent x-tenant-id header after login)
//   3. role present (user has been assigned a role in this hospital)
//
// Throws:
//   UNAUTHORIZED (401) — no valid session
//   BAD_REQUEST  (400) — missing x-tenant-id header
//   FORBIDDEN    (403) — user has no role in the requested tenant
//
// After this middleware, downstream handlers receive:
//   ctx.userId   : string  (non-null)
//   ctx.tenantId : string  (non-null)
//   ctx.role     : string  (non-null, e.g. "Doctor", "Pharmacist")
export const tenantProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session || !ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
  }
  if (!ctx.tenantId) {
    // x-tenant-id header was not sent — likely a frontend bug or missing login step
    throw new TRPCError({ code: "BAD_REQUEST", message: "Tenant ID required" });
  }
  if (!ctx.role) {
    // User is authenticated but has no role assigned in this hospital.
    // Hospital Admin must onboard the user before they can access the system.
    throw new TRPCError({ code: "FORBIDDEN", message: "No role in this tenant" });
  }
  // All three checks passed — narrow all optional types to required strings
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      userId: ctx.userId,
      tenantId: ctx.tenantId,
      role: ctx.role,
    },
  });
});

// ─── REQUIRE ROLE FACTORY ─────────────────────────────────
// Creates a role-specific procedure guard for sensitive operations.
// Layered on top of tenantProcedure — inherits all three checks above.
//
// Usage:
//   const doctorProcedure = requireRole("Doctor", "Hospital Admin");
//   const pharmacistProcedure = requireRole("Pharmacist");
//
// Throws FORBIDDEN (403) if the authenticated user's role is not in
// the allowed roles list for that specific operation.
//
// Example usage in a router:
//   dispense: requireRole("Pharmacist")
//     .mutation(async ({ ctx, input }) => { ... })
//
// SECURITY NOTE (P8 — PRODUCTION BLOCKER):
// requireRole() exists but is NOT YET APPLIED to any clinical mutation.
// All sensitive mutations (addDiagnosis, dispense, resolveWaiver, etc.) currently
// use tenantProcedure which only checks session + tenantId + role but allows ANY
// role to call ANY procedure.
//
// Required before production — wrap these procedures:
//   visit.addNote / addDiagnosis         → requireRole("Doctor")
//   visit.recordVitals                   → requireRole("Doctor", "Nurse")
//   prescription.create                  → requireRole("Doctor")
//   prescription.dispense                → requireRole("Pharmacist")
//   lab.enterResult                      → requireRole("Lab Technician")
//   billing.collectCashierPayment        → requireRole("Billing Officer", "Receptionist")
//   billing.resolveWaiver / updateCBHI   → requireRole("Hospital Admin", "Billing Officer")
//   ward.admit / discharge               → requireRole("Ward Manager", "Doctor")
//   inventory.receiveGoods               → requireRole("Pharmacist", "Hospital Admin")
//   referral.flagLost                    → requireRole("Referral Coordinator", "Hospital Admin")
export function requireRole(...roles: string[]) {
  return tenantProcedure.use(({ ctx, next }) => {
    if (!roles.includes(ctx.role!)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        // Explicit message helps frontend display the correct error banner
        // rather than a generic "Access denied" message.
        message: `Role '${ctx.role}' is not allowed. Required: ${roles.join(", ")}`,
      });
    }
    return next({ ctx });
  });
}
