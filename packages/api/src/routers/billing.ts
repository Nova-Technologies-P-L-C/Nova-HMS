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

  // List all payment receipts (Cashier / Billing)
  receipts: tenantProcedure.query(async ({ ctx }) => {
    return prisma.paymentReceipt.findMany({
      where: { tenantId: ctx.tenantId },
      include: {
        patient: { select: { id: true, nameEn: true, nameAm: true, healthId: true, cbhiStatus: true } },
        visit: { select: { id: true, type: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }),

  // Queue of visits awaiting billing settlement (transferred from doctor or open with accrued fees)
  settlementQueue: tenantProcedure.query(async ({ ctx }) => {
    return prisma.visit.findMany({
      where: {
        tenantId: ctx.tenantId,
        OR: [
          { status: "ready_for_billing" },
          { status: "open" },
        ],
      },
      include: {
        patient: { select: { id: true, nameEn: true, nameAm: true, healthId: true, cbhiStatus: true, phone: true } },
        ticket: { select: { id: true, ticketNumber: true, feeAmount: true, paymentStatus: true, receiptNumber: true } },
        labOrders: { select: { id: true, testName: true, price: true, paymentStatus: true, status: true } },
        prescriptions: { include: { lines: { select: { id: true, itemName: true, totalPrice: true, paymentStatus: true } } } },
        receipts: { select: { id: true, receiptNumber: true, amount: true, category: true } },
        notes: { select: { id: true, noteType: true } },
        diagnoses: { select: { id: true, description: true } },
      },
      orderBy: [{ status: "asc" }, { openedAt: "desc" }],
      take: 50,
    });
  }),

  // Get all billable items for a visit (Cashier lookup)
  getVisitPayables: tenantProcedure
    .input(z.object({ visitId: z.string() }))
    .query(async ({ ctx, input }) => {
      const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: ctx.tenantId } });
      const visit = await prisma.visit.findFirstOrThrow({
        where: { id: input.visitId, tenantId: ctx.tenantId },
        include: {
          patient: true,
          ticket: true,
          labOrders: true,
          prescriptions: { include: { lines: true } },
          diagnoses: true,
          notes: true,
          receipts: { orderBy: { createdAt: "desc" } },
        },
      });

      const isCbhi = !!visit.patient.cbhiStatus;
      const unbilledItems: Array<{
        id: string;
        type: "card_fee" | "consultation" | "lab" | "drug";
        name: string;
        amount: number;
        paymentStatus: string;
        receiptNumber?: string;
      }> = [];

      // 1. Card fee (paid at card room or unpaid)
      if (visit.ticket) {
        unbilledItems.push({
          id: visit.ticket.id,
          type: "card_fee",
          name: `OPD Card & Registration (${visit.ticket.ticketNumber})`,
          amount: visit.ticket.feeAmount,
          paymentStatus: visit.ticket.paymentStatus,
          receiptNumber: visit.ticket.receiptNumber,
        });
      }

      // 2. Doctor Consultation Fee
      let consultFee = tenant.specialistFeeAmount ?? 100;
      const consultTariff = await prisma.hospitalServiceTariff.findFirst({
        where: { tenantId: ctx.tenantId, code: "CONSULT_SPECIALIST", isActive: true },
      });
      if (consultTariff) consultFee = consultTariff.price;
      const consultStatus = isCbhi ? "cbhi_covered" : (visit.status === "completed" ? "paid" : "unpaid");
      unbilledItems.push({
        id: `consult-${visit.id}`,
        type: "consultation",
        name: "Doctor Consultation & Clinical Assessment",
        amount: consultFee,
        paymentStatus: consultStatus,
      });

      // 3. Lab orders
      for (const lo of visit.labOrders) {
        unbilledItems.push({
          id: lo.id,
          type: "lab",
          name: `Lab: ${lo.testName} (${lo.status})`,
          amount: lo.price,
          paymentStatus: isCbhi ? "cbhi_covered" : lo.paymentStatus,
          receiptNumber: lo.receiptNumber,
        });
      }

      // 4. Prescription lines
      for (const rx of visit.prescriptions) {
        for (const line of rx.lines) {
          unbilledItems.push({
            id: line.id,
            type: "drug",
            name: `Rx: ${line.itemName} (${line.dose} × ${line.durationDays}d)`,
            amount: line.totalPrice,
            paymentStatus: isCbhi ? "cbhi_covered" : line.paymentStatus,
            receiptNumber: line.receiptNumber,
          });
        }
      }

      const totalUnpaid = unbilledItems
        .filter((i) => i.paymentStatus === "unpaid")
        .reduce((s, i) => s + i.amount, 0);

      const totalPaid = unbilledItems
        .filter((i) => i.paymentStatus === "paid")
        .reduce((s, i) => s + i.amount, 0);

      const totalCbhi = unbilledItems
        .filter((i) => i.paymentStatus === "cbhi_covered")
        .reduce((s, i) => s + i.amount, 0);

      const grossTotal = unbilledItems.reduce((s, i) => s + i.amount, 0);

      return {
        visit,
        patient: visit.patient,
        items: unbilledItems,
        totalUnpaid,
        totalPaid,
        totalCbhi,
        grossTotal,
        receipts: visit.receipts,
      };
    }),

  // Cashier bulk payment collection & visit discharge settlement
  collectCashierPayment: tenantProcedure
    .input(z.object({
      visitId: z.string(),
      payCardFee: z.boolean().default(false),
      payConsultation: z.boolean().default(true),
      labOrderIds: z.array(z.string()).default([]),
      prescriptionLineIds: z.array(z.string()).default([]),
      paymentMethod: z.enum(["cash", "telebirr", "cbe_birr", "card"]),
      reference: z.string().default(""),
      notes: z.string().default(""),
    }))
    .mutation(async ({ ctx, input }) => {
      const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: ctx.tenantId } });
      const visit = await prisma.visit.findFirstOrThrow({
        where: { id: input.visitId, tenantId: ctx.tenantId },
        include: { ticket: true, patient: true },
      });

      let total = 0;
      const descriptionList: string[] = [];

      // 1. Card Fee
      if (input.payCardFee && visit.ticket && visit.ticket.paymentStatus === "unpaid") {
        total += visit.ticket.feeAmount;
        descriptionList.push(`Card Fee (${visit.ticket.ticketNumber})`);
      }

      // 2. Doctor Consultation Fee
      if (input.payConsultation && !visit.patient.cbhiStatus) {
        let consultFee = tenant.specialistFeeAmount ?? 100;
        const consultTariff = await prisma.hospitalServiceTariff.findFirst({
          where: { tenantId: ctx.tenantId, code: "CONSULT_SPECIALIST", isActive: true },
        });
        if (consultTariff) consultFee = consultTariff.price;
        total += consultFee;
        descriptionList.push(`Doctor Consultation (ETB ${consultFee})`);
      }

      // 3. Labs
      if (input.labOrderIds.length > 0) {
        const labs = await prisma.labOrder.findMany({
          where: { id: { in: input.labOrderIds }, tenantId: ctx.tenantId, paymentStatus: "unpaid" },
        });
        for (const l of labs) {
          total += l.price;
          descriptionList.push(l.testName);
        }
      }

      // 4. Prescriptions
      if (input.prescriptionLineIds.length > 0) {
        const lines = await prisma.prescriptionLine.findMany({
          where: { id: { in: input.prescriptionLineIds }, paymentStatus: "unpaid" },
        });
        for (const l of lines) {
          total += l.totalPrice;
          descriptionList.push(l.itemName);
        }
      }

      if (total <= 0 && !visit.patient.cbhiStatus) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No unpaid items selected for payment" });
      }

      const rcCount = await prisma.paymentReceipt.count({ where: { tenantId: ctx.tenantId } });
      const receiptNumber = `RCP-${new Date().getFullYear()}-${String(rcCount + 1).padStart(5, "0")}`;

      const receipt = await prisma.paymentReceipt.create({
        data: {
          tenantId: ctx.tenantId,
          receiptNumber,
          patientId: visit.patientId,
          visitId: visit.id,
          category: "total_invoice",
          amount: total,
          paymentMethod: visit.patient.cbhiStatus ? "cbhi" : input.paymentMethod,
          collectedBy: ctx.userId ?? "Cashier",
          reference: input.reference,
          notes: descriptionList.join(", ") || "Final visit clearance settlement",
        },
      });

      // Update Card Fee
      if (input.payCardFee && visit.ticket && visit.ticket.paymentStatus === "unpaid") {
        await prisma.oPDTicket.update({
          where: { id: visit.ticket.id },
          data: {
            paymentStatus: "paid",
            paidAt: new Date(),
            receiptNumber,
            paymentMethod: input.paymentMethod,
          },
        });
      }

      // Update Labs to paid
      if (input.labOrderIds.length > 0) {
        await prisma.labOrder.updateMany({
          where: { id: { in: input.labOrderIds }, tenantId: ctx.tenantId },
          data: {
            paymentStatus: "paid",
            paidAt: new Date(),
            receiptNumber,
            paymentMethod: input.paymentMethod,
          },
        });
      }

      // Update Prescriptions to paid
      if (input.prescriptionLineIds.length > 0) {
        await prisma.prescriptionLine.updateMany({
          where: { id: { in: input.prescriptionLineIds } },
          data: {
            paymentStatus: "paid",
            paidAt: new Date(),
            receiptNumber,
            paymentMethod: input.paymentMethod,
          },
        });
      }

      // Create or update visit invoice
      const existingInvoice = await prisma.invoice.findFirst({
        where: { visitId: visit.id, tenantId: ctx.tenantId },
      });

      if (existingInvoice) {
        await prisma.invoice.update({
          where: { id: existingInvoice.id },
          data: {
            total: { increment: total },
            status: "paid",
            paidAt: new Date(),
          },
        });
      } else {
        await prisma.invoice.create({
          data: {
            tenantId: ctx.tenantId,
            visitId: visit.id,
            patientId: visit.patientId,
            total,
            status: "paid",
            paidAt: new Date(),
            lines: {
              create: descriptionList.map((d) => ({
                description: d,
                qty: 1,
                unitPrice: total > 0 ? total / descriptionList.length : 0,
                total: total > 0 ? total / descriptionList.length : 0,
              })),
            },
          },
        });
      }

      // Mark the visit as completed / cleared
      await prisma.visit.update({
        where: { id: visit.id },
        data: {
          status: "completed",
          closedAt: new Date(),
        },
      });

      return {
        receiptNumber,
        total,
        receipt,
        descriptionList,
      };
    }),
});
