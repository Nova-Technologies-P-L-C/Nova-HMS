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
      isEmergency: z.boolean().default(false),
      paymentMethod: z.enum(["cash", "telebirr", "cbe_birr", "card", "unpaid"]).default("unpaid"),
      paymentReference: z.string().default(""),
    }))
    .mutation(async ({ ctx, input }) => {
      const patient = await prisma.patient.findFirstOrThrow({ where: { id: input.patientId, tenantId: ctx.tenantId } });
      const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: ctx.tenantId } });

      const isEmerg = input.type === "emergency" || input.isEmergency;
      const feeAmount = isEmerg ? 100 : (tenant.cardFeeAmount ?? 50);

      let paymentStatus = "unpaid";
      let status = "waiting";

      if (isEmerg) {
        paymentStatus = "emergency_exempt";
        status = "urgent";
      } else if (patient.cbhiStatus) {
        paymentStatus = "cbhi_covered";
      } else if (input.paymentMethod !== "unpaid") {
        paymentStatus = "paid";
      }

      const visit = await prisma.visit.create({
        data: {
          tenantId: ctx.tenantId,
          patientId: input.patientId,
          type: isEmerg ? "emergency" : input.type,
        },
      });

      // Count today's tickets for sequential numbering
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayCount = await prisma.oPDTicket.count({
        where: { tenantId: ctx.tenantId, issuedAt: { gte: today } },
      });
      const ticketNumber = `${isEmerg ? "E" : "A"}-${String(todayCount + 1).padStart(3, "0")}`;

      let receiptNumber = "";
      if (paymentStatus === "paid") {
        const rcCount = await prisma.paymentReceipt.count({ where: { tenantId: ctx.tenantId } });
        receiptNumber = `RCP-${new Date().getFullYear()}-${String(rcCount + 1).padStart(5, "0")}`;

        await prisma.paymentReceipt.create({
          data: {
            tenantId: ctx.tenantId,
            receiptNumber,
            patientId: patient.id,
            visitId: visit.id,
            category: "card_fee",
            amount: feeAmount,
            paymentMethod: input.paymentMethod,
            collectedBy: ctx.userId ?? "Receptionist",
            reference: input.paymentReference,
            notes: `Card Fee for ${ticketNumber}`,
          },
        });
      }

      const ticket = await prisma.oPDTicket.create({
        data: {
          tenantId: ctx.tenantId,
          visitId: visit.id,
          ticketNumber,
          status,
          feeAmount,
          paymentStatus,
          paidAt: paymentStatus === "paid" ? new Date() : undefined,
          receiptNumber,
          paymentMethod: paymentStatus === "paid" ? input.paymentMethod : (paymentStatus === "cbhi_covered" ? "cbhi" : (paymentStatus === "emergency_exempt" ? "emergency" : "")),
        },
      });

      return { visit, ticket, receiptNumber };
    }),

  // Pay card fee at reception or cashier
  payCardFee: tenantProcedure
    .input(z.object({
      ticketId: z.string(),
      paymentMethod: z.enum(["cash", "telebirr", "cbe_birr", "card"]),
      reference: z.string().default(""),
    }))
    .mutation(async ({ ctx, input }) => {
      const ticket = await prisma.oPDTicket.findFirstOrThrow({
        where: { id: input.ticketId, tenantId: ctx.tenantId },
        include: { visit: { include: { patient: true } } },
      });

      if (ticket.paymentStatus === "paid") {
        return ticket;
      }

      const rcCount = await prisma.paymentReceipt.count({ where: { tenantId: ctx.tenantId } });
      const receiptNumber = `RCP-${new Date().getFullYear()}-${String(rcCount + 1).padStart(5, "0")}`;

      await prisma.paymentReceipt.create({
        data: {
          tenantId: ctx.tenantId,
          receiptNumber,
          patientId: ticket.visit.patientId,
          visitId: ticket.visitId,
          category: "card_fee",
          amount: ticket.feeAmount,
          paymentMethod: input.paymentMethod,
          collectedBy: ctx.userId ?? "Receptionist",
          reference: input.reference,
          notes: `Card Fee for Ticket ${ticket.ticketNumber}`,
        },
      });

      return prisma.oPDTicket.update({
        where: { id: ticket.id },
        data: {
          paymentStatus: "paid",
          paidAt: new Date(),
          receiptNumber,
          paymentMethod: input.paymentMethod,
        },
      });
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

  // Transfer completed consultation to billing role for final settlement
  transferToBilling: tenantProcedure
    .input(z.object({
      visitId: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const visit = await prisma.visit.findFirstOrThrow({
        where: { id: input.visitId, tenantId: ctx.tenantId },
        include: { ticket: true, patient: true },
      });

      // Update visit status to ready_for_billing
      const updatedVisit = await prisma.visit.update({
        where: { id: input.visitId },
        data: { status: "ready_for_billing" },
      });

      // Mark doctor ticket as completed so queue updates
      if (visit.ticket) {
        await prisma.oPDTicket.update({
          where: { id: visit.ticket.id },
          data: {
            status: "done",
            completedAt: new Date(),
          },
        });
      }

      await prisma.notification.create({
        data: {
          tenantId: ctx.tenantId,
          userId: "cashier",
          type: "billing",
          title: "Patient Transferred to Billing",
          body: `${visit.patient.nameEn} (Ticket ${visit.ticket?.ticketNumber ?? "N/A"}) transferred for final checkout.`,
        },
      });

      return updatedVisit;
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
          receipts: { orderBy: { createdAt: "desc" } },
        },
      });
      if (!visit) throw new TRPCError({ code: "NOT_FOUND" });
      return visit;
    }),
});
