import prisma from "@my-better-t-app/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, tenantProcedure, publicProcedure } from "../index";

function generateHealthId(tenantSlug: string, sequence: number) {
  const code = tenantSlug.slice(0, 3).toUpperCase();
  return `${code}-${String(sequence).padStart(5, "0")}`;
}

export const patientRouter = router({
  // Patient Portal Login (public lookup by phone & name)
  portalLogin: publicProcedure
    .input(
      z.object({
        phone: z.string(),
        name: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const cleanPhone = input.phone.replace(/\D/g, "");
      const cleanName = input.name.trim().toLowerCase();

      const allPatients = await prisma.patient.findMany({
        include: {
          visits: {
            orderBy: { openedAt: "desc" },
            take: 1,
          },
        },
      });

      const matched = allPatients.find((p) => {
        const pPhone = (p.phone || "").replace(/\D/g, "");
        const pNameEn = (p.nameEn || "").toLowerCase();
        const pNameAm = (p.nameAm || "").toLowerCase();

        const phoneMatches =
          !cleanPhone ||
          pPhone === cleanPhone ||
          (pPhone && cleanPhone && (pPhone.endsWith(cleanPhone) || cleanPhone.endsWith(pPhone)));

        const nameMatches =
          pNameEn.includes(cleanName) ||
          cleanName.includes(pNameEn) ||
          pNameAm.includes(cleanName) ||
          cleanName.includes(pNameAm);

        return phoneMatches && nameMatches;
      });

      if (!matched) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No registered patient record found matching this name and phone number.",
        });
      }

      return {
        id: matched.id,
        name: matched.nameEn,
        nameAm: matched.nameAm,
        dob: matched.dob,
        sex: matched.sex,
        phone: matched.phone,
        healthId: matched.healthId,
        kebele: matched.kebele,
        cbhi: matched.cbhiStatus,
        visits: matched.visits.length,
        lastVisit: matched.visits[0]?.openedAt
          ? new Date(matched.visits[0].openedAt).toLocaleDateString()
          : "Today",
      };
    }),
  // Register new patient
  register: tenantProcedure
    .input(z.object({
      nameEn: z.string().min(2),
      nameAm: z.string().default(""),
      dob: z.string(),
      sex: z.enum(["M", "F"]),
      phone: z.string().default(""),
      email: z.string().default(""),
      kebele: z.string().default(""),
      cbhiStatus: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: ctx.tenantId } });
      const count = await prisma.patient.count({ where: { tenantId: ctx.tenantId } });
      const healthId = generateHealthId(tenant.slug, count + 1);

      const patient = await prisma.patient.create({
        data: { ...input, tenantId: ctx.tenantId, healthId },
      });

      await prisma.auditLog.create({
        data: {
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          action: "Registered new patient",
          entity: "Patient",
          entityId: patient.id,
        },
      });

      return patient;
    }),

  // Search patients
  search: tenantProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return prisma.patient.findMany({
        where: {
          tenantId: ctx.tenantId,
          OR: [
            { nameEn: { contains: input.query } },
            { nameAm: { contains: input.query } },
            { healthId: { contains: input.query } },
            { phone: { contains: input.query } },
            { email: { contains: input.query } },
          ],
        },
        take: 20,
        orderBy: { createdAt: "desc" },
      });
    }),

  // List all patients
  list: tenantProcedure
    .input(z.object({ page: z.number().default(1), limit: z.number().default(20) }))
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.limit;
      const [patients, total] = await Promise.all([
        prisma.patient.findMany({
          where: { tenantId: ctx.tenantId },
          skip,
          take: input.limit,
          orderBy: { createdAt: "desc" },
        }),
        prisma.patient.count({ where: { tenantId: ctx.tenantId } }),
      ]);
      return { patients, total, pages: Math.ceil(total / input.limit) };
    }),

  // Get single patient with full EMR
  get: tenantProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const patient = await prisma.patient.findFirst({
        where: { id: input.id, tenantId: ctx.tenantId },
        include: {
          allergies: true,
          visits: {
            orderBy: { openedAt: "desc" },
            take: 10,
            include: {
              vitals: { orderBy: { recordedAt: "desc" }, take: 1 },
              diagnoses: true,
              notes: { orderBy: { createdAt: "desc" }, take: 1 },
              labOrders: { include: { result: true } },
              prescriptions: { include: { lines: true } },
            },
          },
          appointments: {
            where: { status: "scheduled" },
            orderBy: { date: "asc" },
            take: 3,
          },
        },
      });

      if (!patient) throw new TRPCError({ code: "NOT_FOUND", message: "Patient not found" });

      await prisma.auditLog.create({
        data: {
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          action: "Viewed patient record",
          entity: "Patient",
          entityId: patient.id,
        },
      });

      return patient;
    }),

  // Get comprehensive longitudinal medical history for a patient (by patientId or visitId)
  getMedicalHistory: tenantProcedure
    .input(
      z.object({
        patientId: z.string().optional(),
        visitId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      let resolvedPatientId = input.patientId;
      const activeVisitId = input.visitId;

      if (!resolvedPatientId && !activeVisitId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Either patientId or visitId must be provided",
        });
      }

      if (!resolvedPatientId && activeVisitId) {
        const visit = await prisma.visit.findFirst({
          where: { id: activeVisitId, tenantId: ctx.tenantId },
          select: { patientId: true },
        });
        if (!visit) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Visit not found" });
        }
        resolvedPatientId = visit.patientId;
      }

      if (!resolvedPatientId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Could not resolve patient" });
      }

      const patient = await prisma.patient.findFirst({
        where: { id: resolvedPatientId, tenantId: ctx.tenantId },
        include: {
          allergies: {
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!patient) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Patient not found" });
      }

      // Check if patient is currently admitted to a ward
      const activeAdmission = await prisma.admission.findFirst({
        where: { patientId: patient.id, tenantId: ctx.tenantId, status: "active" },
        include: { bed: true },
      });

      // Get all visits for patient
      const allVisits = await prisma.visit.findMany({
        where: { patientId: patient.id, tenantId: ctx.tenantId },
        orderBy: { openedAt: "desc" },
        include: {
          ticket: true,
          vitals: { orderBy: { recordedAt: "desc" } },
          diagnoses: { orderBy: { diagnosedAt: "desc" } },
          notes: { orderBy: { createdAt: "desc" } },
          prescriptions: {
            orderBy: { createdAt: "desc" },
            include: { lines: true },
          },
          labOrders: {
            orderBy: { orderedAt: "desc" },
            include: { result: true },
          },
        },
      });

      // Flatten past prescriptions across all visits
      const allPrescriptions = allVisits.flatMap((v) =>
        v.prescriptions.map((rx) => ({
          prescriptionId: rx.id,
          visitId: v.id,
          visitType: v.type,
          visitDate: v.openedAt,
          prescribedAt: rx.createdAt,
          prescribedBy: rx.prescribedBy,
          status: rx.status,
          isCurrentVisit: v.id === activeVisitId,
          lines: rx.lines.map((l) => ({
            id: l.id,
            itemId: l.itemId,
            itemName: l.itemName,
            dose: l.dose,
            frequency: l.frequency,
            durationDays: l.durationDays,
            unitPrice: l.unitPrice,
            totalPrice: l.totalPrice,
            paymentStatus: l.paymentStatus,
            status: l.status,
            dispensedAt: l.dispensedAt,
          })),
        }))
      );

      // Flatten past diagnoses across all visits
      const allDiagnoses = allVisits.flatMap((v) =>
        v.diagnoses.map((d) => ({
          id: d.id,
          visitId: v.id,
          visitType: v.type,
          visitDate: v.openedAt,
          diagnosedAt: d.diagnosedAt,
          diagnosedBy: d.diagnosedBy,
          icdCode: d.icdCode,
          description: d.description,
          notes: d.notes,
          isCurrentVisit: v.id === activeVisitId,
        }))
      );

      // Flatten past clinical and nursing notes across all visits
      const allNotes = allVisits.flatMap((v) =>
        v.notes.map((n) => ({
          id: n.id,
          visitId: v.id,
          visitType: v.type,
          visitDate: v.openedAt,
          createdAt: n.createdAt,
          authorId: n.authorId,
          noteType: n.noteType,
          chiefComplaint: n.chiefComplaint,
          history: n.history,
          examination: n.examination,
          assessment: n.assessment,
          plan: n.plan,
          isCurrentVisit: v.id === activeVisitId,
        }))
      );

      // Flatten past lab orders and results across all visits
      const allLabOrders = allVisits.flatMap((v) =>
        v.labOrders.map((lo) => ({
          id: lo.id,
          visitId: v.id,
          visitDate: v.openedAt,
          orderedAt: lo.orderedAt,
          testName: lo.testName,
          priority: lo.priority,
          status: lo.status,
          price: lo.price,
          paymentStatus: lo.paymentStatus,
          result: lo.result
            ? {
                enteredAt: lo.result.enteredAt,
                interpretation: lo.result.interpretation,
                resultsJson: lo.result.resultsJson,
              }
            : null,
          isCurrentVisit: v.id === activeVisitId,
        }))
      );

      // Flatten vitals history across all visits
      const allVitals = allVisits.flatMap((v) =>
        v.vitals.map((vit) => ({
          id: vit.id,
          visitId: v.id,
          recordedAt: vit.recordedAt,
          bpSystolic: vit.bpSystolic,
          bpDiastolic: vit.bpDiastolic,
          heartRate: vit.heartRate,
          temperature: vit.temperature,
          spo2: vit.spo2,
          weight: vit.weight,
          height: vit.height,
          isCurrentVisit: v.id === activeVisitId,
        }))
      );

      return {
        patient: {
          id: patient.id,
          nameEn: patient.nameEn,
          nameAm: patient.nameAm,
          healthId: patient.healthId,
          dob: patient.dob,
          sex: patient.sex,
          phone: patient.phone,
          kebele: patient.kebele,
          cbhiStatus: patient.cbhiStatus,
        },
        allergies: patient.allergies,
        activeAdmission: activeAdmission
          ? {
              id: activeAdmission.id,
              ward: activeAdmission.bed.ward,
              room: activeAdmission.bed.room,
              bedId: activeAdmission.bedId,
              tariffCode: activeAdmission.bed.tariffCode,
              dailyRate: activeAdmission.dailyRate,
              nursingDailyFee: activeAdmission.nursingDailyFee,
              admittedAt: activeAdmission.admittedAt,
              assignedNurseName: activeAdmission.assignedNurseName || "Unassigned",
              paymentStatus: activeAdmission.paymentStatus,
            }
          : null,
        totalVisits: allVisits.length,
        visits: allVisits.map((v) => ({
          id: v.id,
          type: v.type,
          status: v.status,
          openedAt: v.openedAt,
          closedAt: v.closedAt,
          ticketNumber: v.ticket?.ticketNumber || null,
          diagnosesCount: v.diagnoses.length,
          prescriptionsCount: v.prescriptions.length,
          labOrdersCount: v.labOrders.length,
          notesCount: v.notes.length,
          vitalsCount: v.vitals.length,
          isCurrentVisit: v.id === activeVisitId,
        })),
        allPrescriptions,
        allDiagnoses,
        allNotes,
        allLabOrders,
        allVitals,
      };
    }),

  // Update patient
  update: tenantProcedure
    .input(z.object({
      id: z.string(),
      nameEn: z.string().optional(),
      nameAm: z.string().optional(),
      phone: z.string().optional(),
      kebele: z.string().optional(),
      cbhiStatus: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return prisma.patient.update({
        where: { id, tenantId: ctx.tenantId },
        data,
      });
    }),

  // Add allergy
  addAllergy: tenantProcedure
    .input(z.object({
      patientId: z.string(),
      substance: z.string(),
      reaction: z.string().default(""),
      severity: z.string().default("moderate"),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify patient belongs to tenant
      await prisma.patient.findFirstOrThrow({ where: { id: input.patientId, tenantId: ctx.tenantId } });
      return prisma.allergy.create({ data: input });
    }),
});
