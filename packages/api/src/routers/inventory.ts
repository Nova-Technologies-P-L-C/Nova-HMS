import prisma from "@my-better-t-app/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, tenantProcedure } from "../index";

export const inventoryRouter = router({
  items: tenantProcedure
    .input(z.object({ category: z.string().optional(), status: z.string().optional() }).default({}))
    .query(async ({ ctx, input }) => {
      return prisma.inventoryItem.findMany({
        where: {
          tenantId: ctx.tenantId,
          ...(input.category ? { category: input.category } : {}),
          ...(input.status ? { status: input.status } : {}),
        },
        include: {
          supplier: true,
          locationStock: { include: { location: true } },
          batches: { where: { qty: { gt: 0 } }, orderBy: { expiryDate: "asc" } },
        },
        orderBy: { name: "asc" },
      });
    }),

  item: tenantProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return prisma.inventoryItem.findFirstOrThrow({
        where: { id: input.id, tenantId: ctx.tenantId },
        include: {
          supplier: true,
          batches: { orderBy: { expiryDate: "asc" } },
          locationStock: { include: { location: true } },
          movements: { orderBy: { createdAt: "desc" }, take: 50, include: { location: true } },
          consumption: { orderBy: { month: "desc" }, take: 12 },
        },
      });
    }),

  addItem: tenantProcedure
    .input(z.object({
      name: z.string().min(1),
      nameAm: z.string().default(""),
      category: z.string(),
      uomBase: z.string(),
      uomBox: z.string().default("box"),
      uomBoxQty: z.number().int().default(1),
      rop: z.number().int().default(0),
      maxLevel: z.number().int().default(0),
      supplierId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return prisma.inventoryItem.create({ data: { ...input, tenantId: ctx.tenantId } });
    }),

  receiveGoods: tenantProcedure
    .input(z.object({
      supplierId: z.string(),
      locationId: z.string(),
      deliveryDate: z.string(),
      invoiceRef: z.string().default(""),
      lines: z.array(z.object({
        itemId: z.string(),
        lotNumber: z.string(),
        qty: z.number().int().positive(),
        expiryDate: z.string(),
        unitCost: z.number().default(0),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const results = [];
      for (const line of input.lines) {
        const batch = await prisma.inventoryBatch.create({
          data: {
            itemId: line.itemId,
            tenantId: ctx.tenantId,
            lotNumber: line.lotNumber,
            qty: line.qty,
            expiryDate: line.expiryDate,
            receivedDate: input.deliveryDate,
            supplierId: input.supplierId,
            locationId: input.locationId,
          },
        });

        await prisma.locationStock.upsert({
          where: { itemId_locationId: { itemId: line.itemId, locationId: input.locationId } },
          create: { itemId: line.itemId, locationId: input.locationId, tenantId: ctx.tenantId, qty: line.qty },
          update: { qty: { increment: line.qty } },
        });

        await prisma.stockMovement.create({
          data: {
            tenantId: ctx.tenantId,
            itemId: line.itemId,
            batchId: batch.id,
            type: "received",
            qty: line.qty,
            locationId: input.locationId,
            userId: ctx.userId,
            reference: input.invoiceRef,
            note: "Goods receipt",
          },
        });

        await recomputeItemStatus(line.itemId);
        results.push(batch);
      }
      return results;
    }),

  adjust: tenantProcedure
    .input(z.object({
      itemId: z.string(),
      locationId: z.string(),
      type: z.enum(["received", "expired", "damaged", "correction"]),
      qty: z.number().int(),
      note: z.string().default(""),
      batchId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const delta = ["expired", "damaged"].includes(input.type) ? -Math.abs(input.qty) : input.qty;

      await prisma.locationStock.upsert({
        where: { itemId_locationId: { itemId: input.itemId, locationId: input.locationId } },
        create: { itemId: input.itemId, locationId: input.locationId, tenantId: ctx.tenantId, qty: Math.max(0, delta) },
        update: { qty: { increment: delta } },
      });

      if (input.batchId) {
        await prisma.inventoryBatch.update({
          where: { id: input.batchId },
          data: { qty: { increment: delta } },
        });
      }

      const movement = await prisma.stockMovement.create({
        data: {
          tenantId: ctx.tenantId,
          itemId: input.itemId,
          batchId: input.batchId,
          type: input.type,
          qty: delta,
          locationId: input.locationId,
          userId: ctx.userId,
          note: input.note,
        },
      });

      await recomputeItemStatus(input.itemId);
      return movement;
    }),

  transfer: tenantProcedure
    .input(z.object({
      itemId: z.string(),
      fromLocationId: z.string(),
      toLocationId: z.string(),
      qty: z.number().int().positive(),
      note: z.string().default(""),
    }))
    .mutation(async ({ ctx, input }) => {
      await prisma.locationStock.update({
        where: { itemId_locationId: { itemId: input.itemId, locationId: input.fromLocationId } },
        data: { qty: { decrement: input.qty } },
      });
      await prisma.locationStock.upsert({
        where: { itemId_locationId: { itemId: input.itemId, locationId: input.toLocationId } },
        create: { itemId: input.itemId, locationId: input.toLocationId, tenantId: ctx.tenantId, qty: input.qty },
        update: { qty: { increment: input.qty } },
      });
      return prisma.stockMovement.create({
        data: {
          tenantId: ctx.tenantId,
          itemId: input.itemId,
          type: "transferred",
          qty: -input.qty,
          locationId: input.fromLocationId,
          toLocationId: input.toLocationId,
          userId: ctx.userId,
          note: input.note,
        },
      });
    }),

  locations: tenantProcedure.query(async ({ ctx }) => {
    return prisma.inventoryLocation.findMany({
      where: { tenantId: ctx.tenantId },
      include: { stock: { include: { item: true } } },
      orderBy: { name: "asc" },
    });
  }),

  addLocation: tenantProcedure
    .input(z.object({ name: z.string().min(1), type: z.string(), managerId: z.string().default("") }))
    .mutation(async ({ ctx, input }) => {
      return prisma.inventoryLocation.create({ data: { ...input, tenantId: ctx.tenantId } });
    }),

  updateLocation: tenantProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1),
      type: z.string(),
      managerId: z.string().default(""),
    }))
    .mutation(async ({ ctx, input }) => {
      const loc = await prisma.inventoryLocation.findFirstOrThrow({
        where: { id: input.id, tenantId: ctx.tenantId },
      });
      return prisma.inventoryLocation.update({
        where: { id: loc.id },
        data: { name: input.name, type: input.type, managerId: input.managerId },
      });
    }),

  deleteLocation: tenantProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const loc = await prisma.inventoryLocation.findFirstOrThrow({
        where: { id: input.id, tenantId: ctx.tenantId },
        include: { stock: { where: { qty: { gt: 0 } } } },
      });
      if (loc.stock.length > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Cannot delete a location that still holds active stock. Transfer or write-off stock first.",
        });
      }
      return prisma.inventoryLocation.delete({ where: { id: loc.id } });
    }),

  suppliers: tenantProcedure.query(async ({ ctx }) => {
    return prisma.supplier.findMany({ where: { tenantId: ctx.tenantId } });
  }),

  addSupplier: tenantProcedure
    .input(z.object({
      name: z.string(),
      fullName: z.string().default(""),
      contact: z.string().default(""),
      phone: z.string().default(""),
      leadDays: z.number().int().default(14),
    }))
    .mutation(async ({ ctx, input }) => {
      return prisma.supplier.create({ data: { ...input, tenantId: ctx.tenantId } });
    }),

  ropAlerts: tenantProcedure.query(async ({ ctx }) => {
    return prisma.inventoryItem.findMany({
      where: { tenantId: ctx.tenantId, status: { in: ["critical", "low"] } },
      include: {
        supplier: true,
        locationStock: { include: { location: true } },
      },
      orderBy: { status: "asc" },
    });
  }),

  expiryAlerts: tenantProcedure.query(async ({ ctx }) => {
    const ninetyDays = new Date();
    ninetyDays.setDate(ninetyDays.getDate() + 90);
    return prisma.inventoryBatch.findMany({
      where: {
        tenantId: ctx.tenantId,
        qty: { gt: 0 },
        expiryDate: { lte: ninetyDays.toISOString().split("T")[0] },
      },
      include: { item: true, location: true },
      orderBy: { expiryDate: "asc" },
    });
  }),

  requisitions: tenantProcedure.query(async ({ ctx }) => {
    return prisma.requisition.findMany({
      where: { tenantId: ctx.tenantId },
      include: { supplier: true, lines: { include: { item: true } } },
      orderBy: { createdAt: "desc" },
    });
  }),

  createRequisition: tenantProcedure
    .input(z.object({
      supplierId: z.string(),
      type: z.enum(["routine", "emergency"]).default("routine"),
      justification: z.string().default(""),
      lines: z.array(z.object({
        itemId: z.string(),
        qtyRequested: z.number().int().positive(),
        unitCost: z.number().default(0),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const { lines, ...header } = input;
      return prisma.requisition.create({
        data: {
          ...header,
          tenantId: ctx.tenantId,
          requestedBy: ctx.userId,
          status: input.type === "emergency" ? "approved" : "pending",
          lines: { create: lines },
        },
        include: { lines: { include: { item: true } }, supplier: true },
      });
    }),

  approveRequisition: tenantProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return prisma.requisition.update({
        where: { id: input.id, tenantId: ctx.tenantId },
        data: { status: "approved", approvedBy: ctx.userId },
      });
    }),

  cycleCounts: tenantProcedure.query(async ({ ctx }) => {
    return prisma.cycleCount.findMany({
      where: { tenantId: ctx.tenantId },
      include: { lines: { include: { item: true } } },
      orderBy: { date: "desc" },
    });
  }),

  submitCycleCount: tenantProcedure
    .input(z.object({
      lines: z.array(z.object({
        itemId: z.string(),
        systemQty: z.number().int(),
        countedQty: z.number().int(),
        varianceReason: z.string().default(""),
        lossCategory: z.string().default(""),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const lines = input.lines.map((l) => ({ ...l, variance: l.countedQty - l.systemQty }));
      return prisma.cycleCount.create({
        data: {
          tenantId: ctx.tenantId,
          conductedBy: ctx.userId,
          status: "completed",
          lines: { create: lines },
        },
        include: { lines: true },
      });
    }),

  consumption: tenantProcedure
    .input(z.object({ itemId: z.string() }))
    .query(async ({ ctx, input }) => {
      return prisma.consumptionRecord.findMany({
        where: { itemId: input.itemId, tenantId: ctx.tenantId },
        orderBy: { month: "asc" },
      });
    }),
});

async function recomputeItemStatus(itemId: string) {
  const agg = await prisma.locationStock.aggregate({
    where: { itemId },
    _sum: { qty: true },
  });
  const total = agg._sum.qty ?? 0;
  const item = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: itemId } });
  const status = total <= item.rop * 0.5 ? "critical" : total <= item.rop ? "low" : "ok";
  await prisma.inventoryItem.update({ where: { id: itemId }, data: { status } });
}
