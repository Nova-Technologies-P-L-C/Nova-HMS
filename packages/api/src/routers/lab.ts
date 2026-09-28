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
      priority: z.enum(["routine", "urgent"]).default("routine"),
      indication: z.string().default(""),
    }))
    .mutation(async ({ ctx, input }) => {
      await prisma.visit.findFirstOrThrow({ where: { id: input.visitId, tenantId: ctx.tenantId } });

      const order = await prisma.labOrder.create({
        data: { ...input, tenantId: ctx.tenantId, orderedBy: ctx.userId },
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
