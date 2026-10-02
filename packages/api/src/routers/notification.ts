import prisma from "@my-better-t-app/db";
import { z } from "zod";
import { publicProcedure, router, tenantProcedure } from "../index";

export const notificationRouter = router({
  // List notifications for current user
  list: tenantProcedure.query(async ({ ctx }) => {
    return prisma.notification.findMany({
      where: { tenantId: ctx.tenantId, userId: ctx.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }),

  // Unread count — public so topbar doesn't 401 when unauthenticated
  unreadCount: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.userId || !ctx.tenantId) return { count: 0 };
    const count = await prisma.notification.count({
      where: { tenantId: ctx.tenantId, userId: ctx.userId, read: false },
    });
    return { count };
  }),

  // Mark as read
  markRead: tenantProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const notification = await prisma.notification.findFirstOrThrow({
        where: { id: input.id, tenantId: ctx.tenantId, userId: ctx.userId },
      });

      return prisma.notification.update({
        where: { id: notification.id },
        data: { read: true },
      });
    }),

  // Mark all read
  markAllRead: tenantProcedure.mutation(async ({ ctx }) => {
    await prisma.notification.updateMany({
      where: { tenantId: ctx.tenantId, userId: ctx.userId, read: false },
      data: { read: true },
    });
    return { success: true };
  }),
});
