import prisma from "@my-better-t-app/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router, tenantProcedure } from "../index";

export const tenantRouter = router({
  // Create a new tenant (called during onboarding)
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(2),
      slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
      region: z.string().default(""),
      facilityType: z.string().default("hospital"),
      plan: z.string().default("basic"),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await prisma.tenant.findUnique({ where: { slug: input.slug } });
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "Workspace slug already taken" });

      const tenant = await prisma.tenant.create({ data: input });

      // Assign creator as Hospital Admin
      await prisma.userTenantRole.create({
        data: { userId: ctx.userId!, tenantId: tenant.id, role: "Hospital Admin" },
      });

      return tenant;
    }),

  // Get current tenant details
  get: tenantProcedure.query(async ({ ctx }) => {
    return prisma.tenant.findUniqueOrThrow({ where: { id: ctx.tenantId } });
  }),

  // Get tenant by slug (used at login to resolve tenantId + user role)
  getBySlug: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const tenant = await prisma.tenant.findUnique({ where: { slug: input.slug } });
      if (!tenant) throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" });

      const userRole = await prisma.userTenantRole.findUnique({
        where: { userId_tenantId: { userId: ctx.userId!, tenantId: tenant.id } },
      });

      return { ...tenant, role: userRole?.role ?? null };
    }),

  // List all tenants for the current user
  myTenants: protectedProcedure.query(async ({ ctx }) => {
    return prisma.userTenantRole.findMany({
      where: { userId: ctx.userId!, status: "active" },
      include: { tenant: true },
    });
  }),

  // List staff in current tenant
  staff: tenantProcedure.query(async ({ ctx }) => {
    return prisma.userTenantRole.findMany({
      where: { tenantId: ctx.tenantId },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  }),

  // Invite / add staff member
  addStaff: tenantProcedure
    .input(z.object({ userId: z.string(), role: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.role !== "Hospital Admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only Hospital Admin can manage staff" });
      }
      return prisma.userTenantRole.upsert({
        where: { userId_tenantId: { userId: input.userId, tenantId: ctx.tenantId } },
        create: { userId: input.userId, tenantId: ctx.tenantId, role: input.role },
        update: { role: input.role, status: "active" },
      });
    }),

  // Audit log
  auditLog: tenantProcedure.query(async ({ ctx }) => {
    return prisma.auditLog.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }),

  // Dashboard stats
  dashboardStats: tenantProcedure.query(async ({ ctx }) => {
    const [patients, todayVisits, beds, occupiedBeds, criticalStock] = await Promise.all([
      prisma.patient.count({ where: { tenantId: ctx.tenantId } }),
      prisma.visit.count({
        where: {
          tenantId: ctx.tenantId,
          openedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      prisma.bed.count({ where: { tenantId: ctx.tenantId } }),
      prisma.bed.count({ where: { tenantId: ctx.tenantId, status: "occupied" } }),
      prisma.inventoryItem.count({ where: { tenantId: ctx.tenantId, status: "critical" } }),
    ]);

    return { patients, todayVisits, beds, occupiedBeds, criticalStock };
  }),
});
