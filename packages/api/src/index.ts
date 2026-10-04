import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "./context";

export const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

// Requires valid session
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session || !ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
  }
  return next({ ctx: { ...ctx, session: ctx.session, userId: ctx.userId } });
});

// Requires valid session + tenantId + role
export const tenantProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session || !ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
  }
  if (!ctx.tenantId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Tenant ID required" });
  }
  if (!ctx.role) {
    throw new TRPCError({ code: "FORBIDDEN", message: "No role in this tenant" });
  }
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

// Role guard factory
export function requireRole(...roles: string[]) {
  return tenantProcedure.use(({ ctx, next }) => {
    const allowed = new Set(roles);
    if (allowed.has("Branch Admin") || allowed.has("Hospital Admin")) {
      allowed.add("Branch Admin");
      allowed.add("Hospital Admin");
    }
    if (!allowed.has(ctx.role!)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Role '${ctx.role}' is not allowed. Required: ${roles.join(", ")}`,
      });
    }
    return next({ ctx });
  });
}
