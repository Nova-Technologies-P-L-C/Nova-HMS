import { auth } from "@my-better-t-app/auth";
import prisma from "@my-better-t-app/db";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { fromNodeHeaders } from "better-auth/node";

const VALID_ROLES = new Set([
  "Organizational Admin",
  "Branch Admin",
  "Hospital Admin",
  "Receptionist",
  "Triage Nurse",
  "Doctor",
  "Ward Nurse",
  "Nurse",
  "Lab Technician",
  "Pharmacist",
  "Billing Officer",
  "Accountant",
  "Referral Coordinator",
  "Ward Manager",
  "Nova Admin",
]);

export async function createContext(opts: CreateExpressContextOptions) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(opts.req.headers),
  });

  // Resolve tenantId from header (set by frontend per workspace)
  const tenantId = opts.req.headers["x-tenant-id"] as string | undefined;
  const requestedRole = opts.req.headers["x-user-role"] as string | undefined;

  let role: string | null = null;

  if (session?.user?.id && tenantId) {
    const userRole = await prisma.userTenantRole.findUnique({
      where: { userId_tenantId: { userId: session.user.id, tenantId } },
    });
    // If client requested a valid station role (per-tab multi-role testing/usage), use it; otherwise fallback to DB role
    if (requestedRole && VALID_ROLES.has(requestedRole)) {
      role = requestedRole;
    } else {
      role = userRole?.role ?? null;
    }
  }

  return {
    session,
    userId: session?.user?.id ?? null,
    tenantId: tenantId ?? null,
    role,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
