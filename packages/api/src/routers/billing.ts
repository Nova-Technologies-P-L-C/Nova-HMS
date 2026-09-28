import prisma from "@my-better-t-app/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, tenantProcedure } from "../index";

export const billingRouter = router({
  // Create invoice for a visit
  createInvoice: tenantProcedure
    .input(z.object({
      visitId: z.string(),
      lines: z.array(z.object({
        description: z.string(),
        qty: z.number().int().default(1),
        unitPrice: z.number(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const visit = await prisma.visit.findFirstOrThrow({
        where: { id: input.visitId, tenantId: ctx.tenantId },
      });

      const total = input.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);

      return prisma.invoice.create({
        data: {
          tenantId: ctx.tenantId,
          visitId: input.visitId,
          patientId: visit.patientId,
          total,
          lines: {
            create: input.lines.map((l) => ({ ...l, total: l.qty * l.unitPrice })),
          },
        },
        include: { lines: true },
      });
    }),

  // Get invoice for a visit
  byVisit: tenantProcedure
    .input(z.object({ visitId: z.string() }))
    .query(async ({ ctx, input }) => {
      return prisma.invoice.findFirst({
        where: { visitId: input.visitId, tenantId: ctx.tenantId },
        include: { lines: true, cbhiClaim: true, feeWaiver: true },
      });
    }),

  // List invoices
  list: tenantProcedure
    .input(z.object({ status: z.string().optional() }).default({}))
    .query(async ({ ctx, input }) => {
      return prisma.invoice.findMany({
        where: {
          tenantId: ctx.tenantId,
          ...(input.status ? { status: input.status } : {}),
        },
        include: {
          lines: true,
          cbhiClaim: true,
          feeWaiver: true,
          visit: { include: { patient: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
    }),

  // Mark invoice paid
  markPaid: tenantProcedure
    .input(z.object({ invoiceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invoice = await prisma.invoice.findFirstOrThrow({
        where: { id: input.invoiceId, tenantId: ctx.tenantId },
      });

      return prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: "paid", paidAt: new Date() },
      });
    }),

  // Submit CBHI claim
  submitCBHI: tenantProcedure
    .input(z.object({ invoiceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invoice = await prisma.invoice.findFirstOrThrow({
        where: { id: input.invoiceId, tenantId: ctx.tenantId },
      });

      const patient = await prisma.patient.findUniqueOrThrow({ where: { id: invoice.patientId } });
      if (!patient.cbhiStatus) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Patient is not enrolled in CBHI" });
      }

      const existing = await prisma.cBHIClaim.findUnique({ where: { invoiceId: input.invoiceId } });
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "Claim already submitted" });

      return prisma.cBHIClaim.create({
        data: {
          tenantId: ctx.tenantId,
          invoiceId: input.invoiceId,
          patientId: invoice.patientId,
          amount: invoice.total,
        },
      });
    }),

  // Update CBHI claim status
  updateCBHI: tenantProcedure
    .input(z.object({
      claimId: z.string(),
      status: z.enum(["approved", "rejected"]),
      rejectionReason: z.string().default(""),
    }))
    .mutation(async ({ ctx, input }) => {
      return prisma.cBHIClaim.update({
        where: { id: input.claimId, tenantId: ctx.tenantId },
        data: {
          status: input.status,
          resolvedAt: new Date(),
          rejectionReason: input.rejectionReason,
        },
      });
    }),

  // List CBHI claims
  cbhiClaims: tenantProcedure
    .input(z.object({ status: z.string().optional() }).default({}))
    .query(async ({ ctx, input }) => {
      return prisma.cBHIClaim.findMany({
        where: {
          tenantId: ctx.tenantId,
          ...(input.status ? { status: input.status } : {}),
        },
        include: {
          invoice: {
            include: {
              lines: true,
              visit: { include: { patient: true } },
            },
          },
        },
        orderBy: { submittedAt: "desc" },
      });
    }),

  // Request fee waiver
  requestWaiver: tenantProcedure
    .input(z.object({
      invoiceId: z.string(),
      amount: z.number(),
      reason: z.string().min(10),
    }))
    .mutation(async ({ ctx, input }) => {
      const invoice = await prisma.invoice.findFirstOrThrow({
        where: { id: input.invoiceId, tenantId: ctx.tenantId },
      });

      await prisma.invoice.update({
        where: { id: input.invoiceId },
        data: { status: "waiver-requested" },
      });

      return prisma.feeWaiver.create({
        data: {
          tenantId: ctx.tenantId,
          invoiceId: input.invoiceId,
          patientId: invoice.patientId,
          amount: input.amount,
          reason: input.reason,
          requestedBy: ctx.userId,
        },
      });
    }),

  // Approve / reject fee waiver
  resolveWaiver: tenantProcedure
    .input(z.object({
      waiverId: z.string(),
      approved: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const waiver = await prisma.feeWaiver.update({
        where: { id: input.waiverId, tenantId: ctx.tenantId },
        data: {
          status: input.approved ? "approved" : "rejected",
          approvedBy: ctx.userId,
        },
      });

      if (input.approved) {
        await prisma.invoice.update({
          where: { id: waiver.invoiceId },
          data: { status: "waived" },
        });
      } else {
        await prisma.invoice.update({
          where: { id: waiver.invoiceId },
          data: { status: "pending" },
        });
      }

      return waiver;
    }),

  // List fee waivers
  waivers: tenantProcedure.query(async ({ ctx }) => {
    return prisma.feeWaiver.findMany({
      where: { tenantId: ctx.tenantId },
      include: {
        invoice: {
          include: {
            visit: { include: { patient: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }),
});
