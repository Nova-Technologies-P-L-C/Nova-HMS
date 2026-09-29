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
      const visit = await prisma.visit.findFirstOrThrow({
        where: { id: input.visitId, tenantId: ctx.tenantId },
        include: { patient: true },
      });

      let linePaymentStatus = "unpaid";
      if (visit.patient.cbhiStatus) {
        linePaymentStatus = "cbhi_covered";
      } else if (visit.type === "emergency") {
        linePaymentStatus = "emergency_exempt";
      }

      const defaultDrugPrices: Record<string, number> = {
        "Amoxicillin 500mg caps": 45,
        "Metformin 500mg tabs": 30,
        "Artemether/Lumefantrine 80/480mg": 65,
        "Paracetamol 500mg tabs": 15,
        "ORS Sachets": 20,
        "IV Normal Saline 1L": 85,
      };

      const enrichedLines = input.lines.map((l) => {
        const unitPrice = defaultDrugPrices[l.itemName] ?? 40;
        const qtyFactor = l.durationDays * (l.frequency.includes("3x") ? 3 : l.frequency.includes("2x") ? 2 : 1);
        const totalPrice = Math.round(unitPrice * (qtyFactor > 10 ? Math.ceil(qtyFactor / 10) : 1));
        return {
          ...l,
          unitPrice,
          totalPrice,
          paymentStatus: linePaymentStatus,
        };
      });

      const prescription = await prisma.prescription.create({
        data: {
          tenantId: ctx.tenantId,
          visitId: input.visitId,
          prescribedBy: ctx.userId,
          lines: { create: enrichedLines },
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

      // Check payment status on lines
      const unpaidLines = prescription.lines.filter((l) => l.paymentStatus === "unpaid");
      if (unpaidLines.length > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Payment required: ${unpaidLines.length} medication(s) have not been paid for. Please collect payment before dispensing.`,
        });
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

  // Collect payment for prescription lines (Receptionist or Cashier)
  payPrescription: tenantProcedure
    .input(z.object({
      prescriptionId: z.string(),
      paymentMethod: z.enum(["cash", "telebirr", "cbe_birr", "card"]),
      reference: z.string().default(""),
    }))
    .mutation(async ({ ctx, input }) => {
      const rx = await prisma.prescription.findFirstOrThrow({
        where: { id: input.prescriptionId, tenantId: ctx.tenantId },
        include: { lines: true, visit: { include: { patient: true } } },
      });

      const total = rx.lines.reduce((s, l) => s + l.totalPrice, 0);

      const rcCount = await prisma.paymentReceipt.count({ where: { tenantId: ctx.tenantId } });
      const receiptNumber = `RCP-${new Date().getFullYear()}-${String(rcCount + 1).padStart(5, "0")}`;

      await prisma.paymentReceipt.create({
        data: {
          tenantId: ctx.tenantId,
          receiptNumber,
          patientId: rx.visit.patientId,
          visitId: rx.visitId,
          category: "pharmacy",
          amount: total,
          paymentMethod: input.paymentMethod,
          collectedBy: ctx.userId ?? "Cashier",
          reference: input.reference,
          notes: `Pharmacy Rx: ${rx.lines.map((l) => l.itemName).join(", ")}`,
        },
      });

      // Update lines
      await prisma.prescriptionLine.updateMany({
        where: { prescriptionId: rx.id },
        data: {
          paymentStatus: "paid",
          paidAt: new Date(),
          receiptNumber,
          paymentMethod: input.paymentMethod,
        },
      });

      return { success: true, receiptNumber, total };
    }),
});
