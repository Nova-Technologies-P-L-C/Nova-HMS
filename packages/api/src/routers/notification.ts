import prisma from "@my-better-t-app/db";
import { z } from "zod";
import { publicProcedure, router } from "../index";

/**
 * Enterprise Notification Broadcaster
 * Sends notifications to a specific user, all active users holding a specific role,
 * and records a role-level broadcast key so active station tabs immediately receive it.
 */
export async function createHospitalNotification({
  tenantId,
  targetUserId,
  targetRole,
  type = "in-app",
  title,
  body,
}: {
  tenantId: string;
  targetUserId?: string | null;
  targetRole?: string;
  type?: string;
  title: string;
  body: string;
}) {
  const userIds = new Set<string>();

  if (targetUserId) {
    userIds.add(targetUserId);
  }

  if (targetRole) {
    // 1. Role broadcast key
    userIds.add(`role:${targetRole}`);

    // 2. Specific staff assigned to this role in this tenant
    try {
      const staff = await prisma.userTenantRole.findMany({
        where: { tenantId, role: targetRole, status: "active" },
        select: { userId: true },
      });
      for (const s of staff) {
        if (s.userId) userIds.add(s.userId);
      }
    } catch {
      // In case of lookup fallback, role:targetRole ensures delivery
    }
  }

  if (userIds.size === 0) {
    userIds.add("all");
  }

  const creates = Array.from(userIds).map((uId) =>
    prisma.notification.create({
      data: {
        tenantId,
        userId: uId,
        type,
        title,
        body,
      },
    }).catch(() => null)
  );

  return Promise.all(creates);
}

export const notificationRouter = router({
  // List notifications for current user & station role (safely returns empty array if not signed in)
  list: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.tenantId) return [];

    return prisma.notification.findMany({
      where: {
        tenantId: ctx.tenantId,
        OR: [
          ...(ctx.userId ? [{ userId: ctx.userId }] : []),
          ...(ctx.role ? [{ userId: `role:${ctx.role}` }] : []),
          { userId: "all" },
          // Cashier legacy compatibility
          ...(ctx.role === "Billing Officer" || ctx.role === "Accountant"
            ? [{ userId: "cashier" }]
            : []),
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }),

  // Unread count — public so topbar doesn't 401 when unauthenticated
  unreadCount: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.tenantId) return { count: 0 };
    const count = await prisma.notification.count({
      where: {
        tenantId: ctx.tenantId,
        read: false,
        OR: [
          ...(ctx.userId ? [{ userId: ctx.userId }] : []),
          ...(ctx.role ? [{ userId: `role:${ctx.role}` }] : []),
          { userId: "all" },
          // Cashier legacy compatibility
          ...(ctx.role === "Billing Officer" || ctx.role === "Accountant"
            ? [{ userId: "cashier" }]
            : []),
        ],
      },
    });
    return { count };
  }),

  // Mark single notification as read
  markRead: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      try {
        return await prisma.notification.update({
          where: { id: input.id },
          data: { read: true },
        });
      } catch {
        return null;
      }
    }),

  // Mark all unread notifications as read for current user & station role
  markAllRead: publicProcedure.mutation(async ({ ctx }) => {
    if (!ctx.tenantId) return { success: true };
    await prisma.notification.updateMany({
      where: {
        tenantId: ctx.tenantId,
        read: false,
        OR: [
          ...(ctx.userId ? [{ userId: ctx.userId }] : []),
          ...(ctx.role ? [{ userId: `role:${ctx.role}` }] : []),
          { userId: "all" },
          ...(ctx.role === "Billing Officer" || ctx.role === "Accountant"
            ? [{ userId: "cashier" }]
            : []),
        ],
      },
      data: { read: true },
    });
    return { success: true };
  }),

  // Send an instant test notification (for verifying the toast & notification pipeline end-to-end)
  sendTest: publicProcedure
    .input(
      z.object({
        title: z.string().default("System Notification Test"),
        body: z.string().default("Verification alert: Notifications and live toasts are functioning 100%."),
        type: z.enum(["clinical", "billing", "lab", "pharmacy", "in-app", "emergency"]).default("in-app"),
        targetRole: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let tenantId = ctx.tenantId;
      if (!tenantId) {
        const firstTenant = await prisma.tenant.findFirst({ select: { id: true } });
        tenantId = firstTenant?.id ?? "cmu9m3he00000ziw15uon7u87";
      }

      if (input.targetRole) {
        await createHospitalNotification({
          tenantId,
          targetRole: input.targetRole,
          type: input.type,
          title: input.title,
          body: input.body,
        });
        return { success: true };
      }

      const targetUserId = ctx.userId ?? "all";
      const created = await prisma.notification.create({
        data: {
          tenantId,
          userId: targetUserId,
          type: input.type,
          title: input.title,
          body: input.body,
        },
      });
      return created;
    }),
});
