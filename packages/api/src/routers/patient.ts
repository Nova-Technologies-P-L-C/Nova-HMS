import prisma from "@my-better-t-app/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, tenantProcedure } from "../index";

function generateHealthId(tenantSlug: string, sequence: number) {
  const code = tenantSlug.slice(0, 3).toUpperCase();
  return `${code}-${String(sequence).padStart(5, "0")}`;
}

export const patientRouter = router({
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
