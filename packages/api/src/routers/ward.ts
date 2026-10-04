import prisma from "@my-better-t-app/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, tenantProcedure } from "../index";

export const wardRouter = router({
  // List all beds with tariff and active admissions
  beds: tenantProcedure.query(async ({ ctx }) => {
    return prisma.bed.findMany({
      where: { tenantId: ctx.tenantId },
      include: {
        admissions: {
          where: { status: "active" },
          include: {
            patient: { select: { id: true, nameEn: true, nameAm: true, healthId: true, cbhiStatus: true } },
          },
          take: 1,
        },
      },
      orderBy: [{ ward: "asc" }, { room: "asc" }],
    });
  }),

  // List all nurses in the tenant
  nurses: tenantProcedure.query(async ({ ctx }) => {
    const roles = await prisma.userTenantRole.findMany({
      where: {
        tenantId: ctx.tenantId,
        OR: [{ role: "Nurse" }, { department: { contains: "Nurs" } }],
      },
    });

    const userIds = roles.map((r) => r.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));
    return roles.map((r) => ({
      id: r.id,
      userId: r.userId,
      role: r.role,
      department: r.department,
      title: r.title,
      name: userMap.get(r.userId)?.name || "Nurse Staff",
      email: userMap.get(r.userId)?.email || "",
    }));
  }),

  // Add bed with tariff
  addBed: tenantProcedure
    .input(
      z.object({
        ward: z.string(),
        room: z.string(),
        tariffCode: z.string().default("BED_GEN_WARD"),
        dailyRate: z.number().default(120.0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return prisma.bed.create({ data: { ...input, tenantId: ctx.tenantId } });
    }),

  // Update bed status
  updateBedStatus: tenantProcedure
    .input(z.object({ id: z.string(), status: z.enum(["available", "occupied", "maintenance", "reserved"]) }))
    .mutation(async ({ input }) => {
      return prisma.bed.update({ where: { id: input.id }, data: { status: input.status } });
    }),

  // Admit patient with nurse assignment and bed tariffs
  admit: tenantProcedure
    .input(
      z.object({
        patientId: z.string(),
        visitId: z.string().optional(),
        bedId: z.string(),
        assignedNurseId: z.string().optional(),
        assignedNurseName: z.string().optional(),
        tariffCode: z.string().optional(),
        dailyRate: z.number().optional(),
        nursingDailyFee: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const bed = await prisma.bed.findFirstOrThrow({ where: { id: input.bedId, tenantId: ctx.tenantId } });
      if (bed.status !== "available") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Bed is not available" });
      }

      // Determine daily rate: input override > bed.dailyRate > tariff lookup
      let bedRate = input.dailyRate ?? bed.dailyRate ?? 120.0;
      if (input.tariffCode) {
        const tariff = await prisma.hospitalServiceTariff.findFirst({
          where: { tenantId: ctx.tenantId, code: input.tariffCode, isActive: true },
        });
        if (tariff) bedRate = tariff.price;
      }

      // Determine nursing care rate
      let nursingFee = input.nursingDailyFee ?? 70.0;
      const nursingTariff = await prisma.hospitalServiceTariff.findFirst({
        where: { tenantId: ctx.tenantId, code: "CARE_NURSING_DAILY", isActive: true },
      });
      if (nursingTariff) nursingFee = nursingTariff.price;

      // Find active open visit if visitId not explicitly provided
      let visitId = input.visitId;
      if (!visitId) {
        const openVisit = await prisma.visit.findFirst({
          where: { tenantId: ctx.tenantId, patientId: input.patientId, status: "open" },
          orderBy: { openedAt: "desc" },
        });
        if (openVisit) visitId = openVisit.id;
      }

      const admission = await prisma.admission.create({
        data: {
          tenantId: ctx.tenantId,
          patientId: input.patientId,
          visitId,
          bedId: input.bedId,
          assignedNurseId: input.assignedNurseId,
          assignedNurseName: input.assignedNurseName,
          dailyRate: bedRate,
          nursingDailyFee: nursingFee,
          status: "active",
          paymentStatus: "unpaid",
        },
      });

      await prisma.bed.update({ where: { id: input.bedId }, data: { status: "occupied" } });

      return admission;
    }),

  // Assign or reassign primary nurse to an admission
  assignNurse: tenantProcedure
    .input(
      z.object({
        admissionId: z.string(),
        assignedNurseId: z.string(),
        assignedNurseName: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return prisma.admission.update({
        where: { id: input.admissionId, tenantId: ctx.tenantId },
        data: {
          assignedNurseId: input.assignedNurseId,
          assignedNurseName: input.assignedNurseName,
        },
      });
    }),

  // Assign duty nurse to OPD Triage Ticket
  assignNurseToTicket: tenantProcedure
    .input(
      z.object({
        ticketId: z.string(),
        assignedNurseId: z.string(),
        assignedNurseName: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return prisma.oPDTicket.update({
        where: { id: input.ticketId, tenantId: ctx.tenantId },
        data: {
          assignedNurseId: input.assignedNurseId,
          assignedNurseName: input.assignedNurseName,
        },
      });
    }),

  // Discharge patient
  discharge: tenantProcedure
    .input(
      z.object({
        admissionId: z.string(),
        dischargeCondition: z.string().default("Improved"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const admission = await prisma.admission.findFirstOrThrow({
        where: { id: input.admissionId, tenantId: ctx.tenantId },
      });

      const dischargedAt = new Date();
      await prisma.admission.update({
        where: { id: input.admissionId },
        data: {
          status: "discharged",
          dischargedAt,
          dischargeCondition: input.dischargeCondition,
        },
      });

      await prisma.bed.update({ where: { id: admission.bedId }, data: { status: "available" } });

      return { success: true };
    }),

  // Active admissions with live accrued bed & nursing stay charges
  admissions: tenantProcedure.query(async ({ ctx }) => {
    const list = await prisma.admission.findMany({
      where: { tenantId: ctx.tenantId, status: "active" },
      include: {
        patient: { select: { id: true, nameEn: true, nameAm: true, healthId: true, cbhiStatus: true } },
        bed: true,
      },
      orderBy: { admittedAt: "desc" },
    });

    const now = Date.now();
    return list.map((a) => {
      const diffMs = Math.max(0, now - new Date(a.admittedAt).getTime());
      const daysElapsed = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      const bedChargeAccrued = daysElapsed * a.dailyRate;
      const nursingChargeAccrued = daysElapsed * a.nursingDailyFee;
      const totalAccrued = bedChargeAccrued + nursingChargeAccrued;

      return {
        ...a,
        daysElapsed,
        bedChargeAccrued,
        nursingChargeAccrued,
        totalAccrued,
      };
    });
  }),
});
