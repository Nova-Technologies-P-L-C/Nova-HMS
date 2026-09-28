import prisma from "@my-better-t-app/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, tenantProcedure } from "../index";

export const prescriptionRouter = router({
  // Doctor creates prescription
  create: tenantProcedure
    .input(z.object({
      visitId: z.string(),
      lines: z.array(z.object({
        itemId: z.string().default(""),
        itemName: z.string(),
        dose: z.string(),
        frequency: z.string(),
        durationDays: z.number().int().positive(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      await prisma.visit.findFirstOrThrow({ where: { id: input.visitId, tenantId: ctx.tenantId } });

      const prescription = await prisma.prescription.create({
        data: {
          tenantId: ctx.tenantId,
          visitId: input.visitId,
          prescribedBy: ctx.userId,
          lines: { create: input.lines },
        },
        include: { lines: true },
      });

      // Notify pharmacists
      const pharmacists = await prisma.userTenantRole.findMany({
        where: { tenantId: ctx.tenantId, role: "Pharmacist", status: "active" },
      });
      await Promise.all(pharmacists.map((p) =>
        prisma.notification.create({
          data: {
            tenantId: ctx.tenantId,
            userId: p.userId,
            type: "in-app",
            title: "New prescription",
            body: `${input.lines.length} medication(s) to dispense`,
          },
        })
      ));

      return prescription;
    }),

  // Pharmacist queue (pending only)
  queue: tenantProcedure.query(async ({ ctx }) => {
    return prisma.prescription.findMany({
      where: { tenantId: ctx.tenantId, status: "pending" },
      include: {
        lines: true,
        visit: {
          include: {
            patient: { select: { nameEn: true, nameAm: true, healthId: true, cbhiStatus: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  }),

  // Dispensed prescriptions (recent history)
  dispensed: tenantProcedure.query(async ({ ctx }) => {
    const since = new Date();
    since.setDate(since.getDate() - 7);
    return prisma.prescription.findMany({
      where: { tenantId: ctx.tenantId, status: "dispensed", createdAt: { gte: since } },
      include: {
        lines: true,
        visit: {
          include: {
            patient: { select: { nameEn: true, nameAm: true, healthId: true, cbhiStatus: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }),

  // Dispense — FEFO stock deduction
  dispense: tenantProcedure
    .input(z.object({ prescriptionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const prescription = await prisma.prescription.findFirstOrThrow({
        where: { id: input.prescriptionId, tenantId: ctx.tenantId },
        include: { lines: true },
      });

      if (prescription.status === "dispensed") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Already dispensed" });
      }

      // For each line, find FEFO batch and deduct stock
      for (const line of prescription.lines) {
        // Skip stock deduction if no itemId linked (manually entered drug)
        if (!line.itemId) {
          await prisma.prescriptionLine.update({
            where: { id: line.id },
            data: { status: "dispensed", dispensedAt: new Date(), dispensedBy: ctx.userId },
          });
          continue;
        }

        const totalNeeded = line.durationDays * (
          line.frequency.includes("3x") ? 3 : line.frequency.includes("2x") ? 2 : 1
        );

        // FEFO: earliest expiry first
        const batches = await prisma.inventoryBatch.findMany({
          where: { itemId: line.itemId, tenantId: ctx.tenantId, qty: { gt: 0 }, status: "active" },
          orderBy: { expiryDate: "asc" },
        });

        const totalAvailable = batches.reduce((s, b) => s + b.qty, 0);
        if (totalAvailable < totalNeeded) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Insufficient stock for ${line.itemName}. Need ${totalNeeded}, have ${totalAvailable}`,
          });
        }

        let remaining = totalNeeded;
        for (const batch of batches) {
          if (remaining <= 0) break;
          const deduct = Math.min(batch.qty, remaining);

          await prisma.inventoryBatch.update({
            where: { id: batch.id },
            data: { qty: { decrement: deduct } },
          });

          await prisma.stockMovement.create({
            data: {
              tenantId: ctx.tenantId,
              itemId: line.itemId,
              batchId: batch.id,
              type: "dispensed",
              qty: -deduct,
              locationId: batch.locationId,
              userId: ctx.userId,
              reference: prescription.id,
              note: `Rx dispense: ${line.itemName}`,
            },
          });

          // Update location stock
          await prisma.locationStock.updateMany({
            where: { itemId: line.itemId, locationId: batch.locationId },
            data: { qty: { decrement: deduct } },
          });

          remaining -= deduct;
        }

        // Update total item qty via location stock sum (already done per-location above)
        // Mark line dispensed
        await prisma.prescriptionLine.update({
          where: { id: line.id },
          data: { status: "dispensed", dispensedAt: new Date(), dispensedBy: ctx.userId },
        });
      }

      // Mark prescription dispensed
      return prisma.prescription.update({
        where: { id: input.prescriptionId },
        data: { status: "dispensed" },
      });
    }),
});
