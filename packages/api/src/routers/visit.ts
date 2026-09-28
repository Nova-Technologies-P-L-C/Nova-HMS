import prisma from "@my-better-t-app/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, tenantProcedure } from "../index";

export const visitRouter = router({
  // Open a new visit and issue OPD ticket
  openVisit: tenantProcedure
    .input(z.object({
      patientId: z.string(),
      type: z.enum(["opd", "inpatient", "emergency"]).default("opd"),
    }))
    .mutation(async ({ ctx, input }) => {
      await prisma.patient.findFirstOrThrow({ where: { id: input.patientId, tenantId: ctx.tenantId } });

      const visit = await prisma.visit.create({
        data: { tenantId: ctx.tenantId, patientId: input.patientId, type: input.type },
      });

      // Count today's tickets for sequential numbering
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayCount = await prisma.oPDTicket.count({
        where: { tenantId: ctx.tenantId, issuedAt: { gte: today } },
      });
      const ticketNumber = `A-${String(todayCount + 1).padStart(3, "0")}`;

      const ticket = await prisma.oPDTicket.create({
        data: { tenantId: ctx.tenantId, visitId: visit.id, ticketNumber },
      });

      return { visit, ticket };
    }),

  // Get OPD queue for today (last 7 days for testing flexibility)
  queue: tenantProcedure.query(async ({ ctx }) => {
    const since = new Date();
    since.setDate(since.getDate() - 7);
    since.setHours(0, 0, 0, 0);

    return prisma.oPDTicket.findMany({
      where: {
        tenantId: ctx.tenantId,
        issuedAt: { gte: since },
      },
      include: {
        visit: {
          include: {
            patient: { select: { id: true, nameEn: true, nameAm: true, healthId: true, cbhiStatus: true } },
          },
        },
      },
      orderBy: { issuedAt: "asc" },
    });
  }),

  // Update ticket status
  updateTicketStatus: tenantProcedure
    .input(z.object({
      ticketId: z.string(),
      status: z.enum(["waiting", "being-seen", "done", "urgent", "no-show"]),
    }))
    .mutation(async ({ input }) => {
      return prisma.oPDTicket.update({
        where: { id: input.ticketId },
        data: {
          status: input.status,
          calledAt: input.status === "being-seen" ? new Date() : undefined,
          completedAt: input.status === "done" ? new Date() : undefined,
        },
      });
    }),

  // Record vitals
  recordVitals: tenantProcedure
    .input(z.object({
      visitId: z.string(),
      bpSystolic: z.number().optional(),
      bpDiastolic: z.number().optional(),
      heartRate: z.number().optional(),
      temperature: z.number().optional(),
      spo2: z.number().optional(),
      weight: z.number().optional(),
      height: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await prisma.visit.findFirstOrThrow({ where: { id: input.visitId, tenantId: ctx.tenantId } });
      return prisma.vitalSigns.create({
        data: { ...input, recordedBy: ctx.userId },
      });
    }),

  // Add clinical note
  addNote: tenantProcedure
    .input(z.object({
      visitId: z.string(),
      noteType: z.string().default("consultation"),
      chiefComplaint: z.string().default(""),
      history: z.string().default(""),
      examination: z.string().default(""),
      assessment: z.string().default(""),
      plan: z.string().default(""),
    }))
    .mutation(async ({ ctx, input }) => {
      await prisma.visit.findFirstOrThrow({ where: { id: input.visitId, tenantId: ctx.tenantId } });
      return prisma.clinicalNote.create({
        data: { ...input, authorId: ctx.userId },
      });
    }),

  // Add diagnosis
  addDiagnosis: tenantProcedure
    .input(z.object({
      visitId: z.string(),
      icdCode: z.string(),
      description: z.string(),
      notes: z.string().default(""),
    }))
    .mutation(async ({ ctx, input }) => {
      await prisma.visit.findFirstOrThrow({ where: { id: input.visitId, tenantId: ctx.tenantId } });
      return prisma.diagnosis.create({
        data: { ...input, diagnosedBy: ctx.userId },
      });
    }),

  // Close visit
  closeVisit: tenantProcedure
    .input(z.object({ visitId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await prisma.visit.findFirstOrThrow({ where: { id: input.visitId, tenantId: ctx.tenantId } });
      return prisma.visit.update({
        where: { id: input.visitId },
        data: { status: "completed", closedAt: new Date() },
      });
    }),

  // Get visit detail
  get: tenantProcedure
    .input(z.object({ visitId: z.string() }))
    .query(async ({ ctx, input }) => {
      const visit = await prisma.visit.findFirst({
        where: { id: input.visitId, tenantId: ctx.tenantId },
        include: {
          patient: true,
          ticket: true,
          vitals: { orderBy: { recordedAt: "desc" } },
          notes: { orderBy: { createdAt: "desc" } },
          diagnoses: true,
          labOrders: { include: { result: true } },
          prescriptions: { include: { lines: true } },
          invoice: { include: { lines: true } },
          referrals: true,
        },
      });
      if (!visit) throw new TRPCError({ code: "NOT_FOUND" });
      return visit;
    }),
});
