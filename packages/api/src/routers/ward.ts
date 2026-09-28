import prisma from "@my-better-t-app/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, tenantProcedure } from "../index";

export const wardRouter = router({
  // List all beds
  beds: tenantProcedure.query(async ({ ctx }) => {
    return prisma.bed.findMany({
      where: { tenantId: ctx.tenantId },
      include: {
        admissions: {
          where: { status: "active" },
          include: { patient: { select: { nameEn: true, nameAm: true, healthId: true } } },
          take: 1,
        },
      },
      orderBy: [{ ward: "asc" }, { room: "asc" }],
    });
  }),

  // Add bed
  addBed: tenantProcedure
    .input(z.object({ ward: z.string(), room: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return prisma.bed.create({ data: { ...input, tenantId: ctx.tenantId } });
    }),

  // Update bed status
  updateBedStatus: tenantProcedure
    .input(z.object({ id: z.string(), status: z.enum(["available", "occupied", "maintenance", "reserved"]) }))
    .mutation(async ({ input }) => {
      return prisma.bed.update({ where: { id: input.id }, data: { status: input.status } });
    }),

  // Admit patient
  admit: tenantProcedure
    .input(z.object({ patientId: z.string(), bedId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const bed = await prisma.bed.findFirstOrThrow({ where: { id: input.bedId, tenantId: ctx.tenantId } });
      if (bed.status !== "available") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Bed is not available" });
      }

      const admission = await prisma.admission.create({
        data: { tenantId: ctx.tenantId, patientId: input.patientId, bedId: input.bedId },
      });

      await prisma.bed.update({ where: { id: input.bedId }, data: { status: "occupied" } });

      return admission;
    }),

  // Discharge patient
  discharge: tenantProcedure
    .input(z.object({ admissionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const admission = await prisma.admission.findFirstOrThrow({ where: { id: input.admissionId, tenantId: ctx.tenantId } });

      await prisma.admission.update({
        where: { id: input.admissionId },
        data: { status: "discharged", dischargedAt: new Date() },
      });

      await prisma.bed.update({ where: { id: admission.bedId }, data: { status: "available" } });

      return { success: true };
    }),

  // Active admissions
  admissions: tenantProcedure.query(async ({ ctx }) => {
    return prisma.admission.findMany({
      where: { tenantId: ctx.tenantId, status: "active" },
      include: {
        patient: { select: { nameEn: true, nameAm: true, healthId: true } },
        bed: true,
      },
      orderBy: { admittedAt: "desc" },
    });
  }),
});
