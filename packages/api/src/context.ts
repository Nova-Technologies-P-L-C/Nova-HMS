// =============================================================================
// Nova HMS — tRPC Request Context
// =============================================================================
//
// This file builds the `context` object that is available on `ctx` inside
// every tRPC procedure handler. It runs once per HTTP request, before the
// router resolves the procedure.
//
// Context responsibilities:
//   1. Resolve the authenticated user session (via Better Auth cookie)
//   2. Extract the hospital tenant ID from the request header
//   3. Look up the user's role in that specific tenant from the database
//
// The resulting context shape:
//   ctx.session   — Full Better Auth session object (null if unauthenticated)
//   ctx.userId    — Authenticated user's ID string (null if unauthenticated)
//   ctx.tenantId  — Hospital tenant ID from x-tenant-id header (null if missing)
//   ctx.role      — User's role in this tenant: "Doctor", "Nurse", etc. (null if none)
//
// How the frontend sends tenant context:
//   After login, the frontend stores the tenantId in localStorage and injects
//   it into every tRPC batch request as the custom header:
//     x-tenant-id: <tenantId>
//   This is how Nova HMS achieves multi-tenancy at the API level — the same
//   authenticated user can switch hospitals by changing this header value.
//
// Security note:
//   tenantProcedure (in index.ts) validates that both tenantId and role are
//   present and non-null before any clinical data handler executes.
//   The context layer itself is intentionally permissive — it populates what
//   it can and leaves enforcement to the middleware layer.
// =============================================================================

import { auth } from "@my-better-t-app/auth";
import prisma from "@my-better-t-app/db";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { fromNodeHeaders } from "better-auth/node";

export async function createContext(opts: CreateExpressContextOptions) {
  // ── 1. Resolve authenticated session ──────────────────────────────────────
  // Better Auth reads the session cookie from the incoming request headers.
  // fromNodeHeaders() converts Express req.headers to the Web API Headers
  // format that Better Auth's getSession() expects.
  // Returns null if no valid session cookie is present (unauthenticated request).
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(opts.req.headers),
  });

  // ── 2. Extract tenant ID from request header ───────────────────────────────
  // The frontend sets this header after a successful login:
  //   x-tenant-id: <tenantId from the login response>
  // Undefined if the header is absent (unauthenticated or pre-login requests).
  const tenantId = opts.req.headers["x-tenant-id"] as string | undefined;

  // ── 3. Resolve the user's role in this tenant ─────────────────────────────
  // Looks up the UserTenantRole junction table to find what role this user
  // holds within the requested hospital.
  // Only attempted if both session and tenantId are present — avoids
  // unnecessary DB queries on unauthenticated or public route requests.
  let role: string | null = null;

  if (session?.user?.id && tenantId) {
    const userRole = await prisma.userTenantRole.findUnique({
      // Composite unique key: one role record per user-tenant pair
      where: { userId_tenantId: { userId: session.user.id, tenantId } },
    });
    // role will be null if the user exists but hasn't been assigned
    // to this particular hospital (e.g. wrong workspace slug at login)
    role = userRole?.role ?? null;
  }

  // Return the full context object — tenantProcedure enforces non-null
  // values for tenantId and role before any clinical handler runs.
  return {
    session,                              // Better Auth session | null
    userId: session?.user?.id ?? null,    // Authenticated user ID | null
    tenantId: tenantId ?? null,           // Hospital tenant ID | null
    role,                                 // User's role in this tenant | null
  };
}

// Export the inferred Context type for use in tRPC's initTRPC.context<Context>()
export type Context = Awaited<ReturnType<typeof createContext>>;
