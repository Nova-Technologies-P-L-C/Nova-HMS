import prisma from "@my-better-t-app/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, tenantProcedure } from "../index";

export const referralRouter = router({
  // Create outgoing referral
  create: tenantProcedure
    .input(z.object({
      visitId: z.string(),
      patientId: z.string(),
      fromFacility: z.string(),
      toFacility: z.string(),
      reason: z.string().min(1),
      clinicalSummary: z.string().min(50, "Clinical summary must be at least 50 characters (BR-18)"),
      urgency: z.enum(["routine", "urgent", "emergency"]).default("routine"),
      type: z.enum(["out", "in"]).default("out"),
    }))
    .mutation(async ({ ctx, input }) => {
      // BR-19: patient must have an active visit today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const visit = await prisma.visit.findFirst({
        where: { id: input.visitId, tenantId: ctx.tenantId, status: "open", openedAt: { gte: today } },
      });
      if (!visit) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Patient must have an active visit today to create a referral (BR-19)" });
      }

      const referral = await prisma.referral.create({
        data: { ...input, tenantId: ctx.tenantId, createdBy: ctx.userId },
      });

      await prisma.auditLog.create({
        data: { tenantId: ctx.tenantId, userId: ctx.userId, action: "Created referral", entity: "Referral", entityId: referral.id },
      });

      return referral;
    }),

  // List referrals
  list: tenantProcedure
    .input(z.object({ type: z.enum(["in", "out", "all"]).default("all") }).default({ type: "all" }))
    .query(async ({ ctx, input }) => {
      return prisma.referral.findMany({
        where: {
          tenantId: ctx.tenantId,
          ...(input.type !== "all" ? { type: input.type } : {}),
        },
        include: { visit: { include: { patient: true } } },
        orderBy: { createdAt: "desc" },
      });
    }),

  // Confirm arrival
  confirmArrival: tenantProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const referral = await prisma.referral.findFirstOrThrow({ where: { id: input.id, tenantId: ctx.tenantId } });
      if (referral.status === "arrived") throw new TRPCError({ code: "BAD_REQUEST", message: "Already confirmed" });

      return prisma.referral.update({
        where: { id: input.id },
        data: { status: "arrived", confirmedBy: ctx.userId, confirmedAt: new Date() },
      });
    }),

  // Flag lost referrals (BR-20: 72h timeout)
  flagLost: tenantProcedure.mutation(async ({ ctx }) => {
    const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000);
    const result = await prisma.referral.updateMany({
      where: {
        tenantId: ctx.tenantId,
        status: { in: ["pending", "in-transit"] },
        createdAt: { lt: cutoff },
      },
      data: { status: "lost" },
    });
    return { flagged: result.count };
  }),

  // Update status
  updateStatus: tenantProcedure
    .input(z.object({ id: z.string(), status: z.enum(["pending", "in-transit", "arrived", "lost"]) }))
    .mutation(async ({ ctx, input }) => {
      const referral = await prisma.referral.findFirstOrThrow({
        where: { id: input.id, tenantId: ctx.tenantId },
      });

      return prisma.referral.update({
        where: { id: referral.id },
        data: { status: input.status },
      });
    }),
});
