import { auth } from "@my-better-t-app/auth";
import prisma from "@my-better-t-app/db";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { fromNodeHeaders } from "better-auth/node";

export async function createContext(opts: CreateExpressContextOptions) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(opts.req.headers),
  });

  // Resolve tenantId from header (set by frontend per workspace)
  const tenantId = opts.req.headers["x-tenant-id"] as string | undefined;

  let role: string | null = null;

  if (session?.user?.id && tenantId) {
    const userRole = await prisma.userTenantRole.findUnique({
      where: { userId_tenantId: { userId: session.user.id, tenantId } },
    });
    role = userRole?.role ?? null;
  }

  return {
    session,
    userId: session?.user?.id ?? null,
    tenantId: tenantId ?? null,
    role,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
