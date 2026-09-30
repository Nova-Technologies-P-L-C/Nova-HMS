import prisma from "@my-better-t-app/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, tenantProcedure } from "../index";

export const labRouter = router({
  // Doctor orders a lab test
  order: tenantProcedure
    .input(z.object({
      visitId: z.string(),
      testName: z.string().min(1),
      price: z.number().optional(),
      priority: z.enum(["routine", "urgent"]).default("routine"),
      indication: z.string().default(""),
    }))
    .mutation(async ({ ctx, input }) => {
      const visit = await prisma.visit.findFirstOrThrow({
        where: { id: input.visitId, tenantId: ctx.tenantId },
        include: { patient: true },
      });

      let price = input.price;
      if (price === undefined) {
        const tariff = await prisma.hospitalServiceTariff.findFirst({
          where: {
            tenantId: ctx.tenantId,
            isActive: true,
            OR: [
              { name: input.testName },
              { name: { contains: input.testName } },
            ],
          },
        });
        if (tariff) {
          price = tariff.price;
        } else {
          const defaultPrices: Record<string, number> = {
            "CBC (Complete Blood Count)": 150,
            "Malaria RDT": 80,
            "Fasting Blood Sugar": 90,
            "Urinalysis": 70,
            "Lipid Panel": 220,
            "Liver Function Tests": 250,
            "Renal Function Test": 200,
            "Stool Examination": 60,
          };
          price = defaultPrices[input.testName] ?? 120;
        }
      }

      let paymentStatus = "unpaid";
      if (visit.patient.cbhiStatus) {
        paymentStatus = "cbhi_covered";
      } else if (visit.type === "emergency" || input.priority === "urgent") {
        paymentStatus = "emergency_exempt";
      }

      const order = await prisma.labOrder.create({
        data: {
          visitId: input.visitId,
          testName: input.testName,
          priority: input.priority,
          indication: input.indication,
          price,
          paymentStatus,
          tenantId: ctx.tenantId,
          orderedBy: ctx.userId,
        },
      });

      // Notify lab technicians
      const labStaff = await prisma.userTenantRole.findMany({
        where: { tenantId: ctx.tenantId, role: "Lab Technician", status: "active" },
      });
      await Promise.all(labStaff.map((s) =>
        prisma.notification.create({
          data: {
            tenantId: ctx.tenantId,
            userId: s.userId,
            type: "in-app",
            title: "New lab order",
            body: `${input.priority === "urgent" ? "URGENT: " : ""}${input.testName} ordered`,
          },
        })
      ));

      return order;
    }),

  // Lab tech queue (pending + in-progress)
  queue: tenantProcedure.query(async ({ ctx }) => {
    return prisma.labOrder.findMany({
      where: { tenantId: ctx.tenantId, status: { in: ["pending", "in-progress"] } },
      include: {
        visit: {
          include: {
            patient: { select: { nameEn: true, nameAm: true, healthId: true } },
          },
        },
      },
      orderBy: [{ priority: "desc" }, { orderedAt: "asc" }],
    });
  }),

  // Completed results (for doctor review)
  completed: tenantProcedure.query(async ({ ctx }) => {
    return prisma.labOrder.findMany({
      where: { tenantId: ctx.tenantId, status: "completed" },
      include: {
        result: true,
        visit: {
          include: {
            patient: { select: { id: true, nameEn: true, nameAm: true, healthId: true } },
          },
        },
      },
      orderBy: { orderedAt: "desc" },
      take: 50,
    });
  }),

  // Update order status
  updateStatus: tenantProcedure
    .input(z.object({
      orderId: z.string(),
      status: z.enum(["pending", "in-progress", "completed", "cancelled"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const order = await prisma.labOrder.findFirstOrThrow({
        where: { id: input.orderId, tenantId: ctx.tenantId },
      });
      if (order.status === "completed") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot change status of completed order" });
      }
      return prisma.labOrder.update({ where: { id: input.orderId }, data: { status: input.status } });
    }),

  // Enter results
  enterResult: tenantProcedure
    .input(z.object({
      orderId: z.string(),
      results: z.array(z.object({
        name: z.string(),
        value: z.string(),
        unit: z.string(),
        refRange: z.string(),
        flag: z.enum(["normal", "high", "low", "critical"]).default("normal"),
      })),
      interpretation: z.string().default(""),
    }))
    .mutation(async ({ ctx, input }) => {
      const order = await prisma.labOrder.findFirstOrThrow({
        where: { id: input.orderId, tenantId: ctx.tenantId },
      });

      // Lab results can be entered during care; diagnostic fee will be settled at Billing upon visit completion
      const result = await prisma.labResult.create({
        data: {
          labOrderId: input.orderId,
          enteredBy: ctx.userId,
          resultsJson: JSON.stringify(input.results),
          interpretation: input.interpretation,
        },
      });

      await prisma.labOrder.update({ where: { id: input.orderId }, data: { status: "completed" } });

      // Notify ordering doctor
      const hasCritical = input.results.some((r) => r.flag === "critical");
      await prisma.notification.create({
        data: {
          tenantId: ctx.tenantId,
          userId: order.orderedBy,
          type: "in-app",
          title: hasCritical ? "⚠ CRITICAL lab result" : "Lab result ready",
          body: `Result for ${order.testName} is ready`,
        },
      });

      return result;
    }),

  // Collect payment for a lab test (Receptionist or Cashier)
  payOrder: tenantProcedure
    .input(z.object({
      orderId: z.string(),
      paymentMethod: z.enum(["cash", "telebirr", "cbe_birr", "card"]),
      reference: z.string().default(""),
    }))
    .mutation(async ({ ctx, input }) => {
      const order = await prisma.labOrder.findFirstOrThrow({
        where: { id: input.orderId, tenantId: ctx.tenantId },
        include: { visit: { include: { patient: true } } },
      });

      if (order.paymentStatus === "paid") return order;

      const rcCount = await prisma.paymentReceipt.count({ where: { tenantId: ctx.tenantId } });
      const receiptNumber = `RCP-${new Date().getFullYear()}-${String(rcCount + 1).padStart(5, "0")}`;

      await prisma.paymentReceipt.create({
        data: {
          tenantId: ctx.tenantId,
          receiptNumber,
          patientId: order.visit.patientId,
          visitId: order.visitId,
          category: "lab",
          amount: order.price,
          paymentMethod: input.paymentMethod,
          collectedBy: ctx.userId ?? "Cashier",
          reference: input.reference,
          notes: `Lab Test: ${order.testName}`,
        },
      });

      return prisma.labOrder.update({
        where: { id: order.id },
        data: {
          paymentStatus: "paid",
          paidAt: new Date(),
          receiptNumber,
          paymentMethod: input.paymentMethod,
        },
      });
    }),

  // Get results for a visit
  byVisit: tenantProcedure
    .input(z.object({ visitId: z.string() }))
    .query(async ({ ctx, input }) => {
      return prisma.labOrder.findMany({
        where: { visitId: input.visitId, tenantId: ctx.tenantId },
        include: { result: true },
        orderBy: { orderedAt: "desc" },
      });
    }),
});
