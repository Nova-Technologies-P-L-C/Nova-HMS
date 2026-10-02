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

  // List staff in current tenant with complete person details & effective permissions
  staff: tenantProcedure.query(async ({ ctx }) => {
    const roles = await prisma.userTenantRole.findMany({
      where: { tenantId: ctx.tenantId },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
      orderBy: [{ role: "asc" }, { assignedAt: "desc" }],
    });

    const rolePerms = await prisma.rolePermission.findMany({
      where: { tenantId: ctx.tenantId },
    });
    const permMap: Record<string, string[]> = {};
    for (const rp of rolePerms) {
      try {
        permMap[rp.role] = JSON.parse(rp.permissions);
      } catch {
        permMap[rp.role] = [];
      }
    }

    return roles.map((r) => ({
      id: r.id,
      userId: r.userId,
      user: r.user,
      name: r.user.name,
      email: r.user.email,
      image: r.user.image,
      role: r.role,
      department: r.department,
      title: r.title,
      phone: r.phone,
      licenseNumber: r.licenseNumber,
      status: r.status,
      assignedAt: r.assignedAt,
      effectivePermissions: permMap[r.role] ?? [],
    }));
  }),

  // Add / invite staff member with complete profile metadata (Hospital Admin only)
  addStaff: tenantProcedure
    .input(
      z.object({
        name: z.string().min(2, "Name must be at least 2 characters"),
        email: z.string().email("Valid email required"),
        role: z.string().min(1, "Role is required"),
        department: z.string().default("General"),
        title: z.string().default(""),
        phone: z.string().default(""),
        licenseNumber: z.string().default(""),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.role !== "Hospital Admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only Hospital Admin can manage staff" });
      }

      // Find or create user
      let user = await prisma.user.findUnique({ where: { email: input.email } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            id: `u-${Date.now().toString(36)}`,
            email: input.email,
            name: input.name,
            emailVerified: false,
          },
        });
      } else {
        await prisma.user.update({
          where: { id: user.id },
          data: { name: input.name },
        });
      }

      const assignment = await prisma.userTenantRole.upsert({
        where: { userId_tenantId: { userId: user.id, tenantId: ctx.tenantId } },
        create: {
          userId: user.id,
          tenantId: ctx.tenantId,
          role: input.role,
          department: input.department,
          title: input.title,
          phone: input.phone,
          licenseNumber: input.licenseNumber,
          status: "active",
        },
        update: {
          role: input.role,
          department: input.department,
          title: input.title,
          phone: input.phone,
          licenseNumber: input.licenseNumber,
          status: "active",
        },
      });

      await prisma.auditLog.create({
        data: {
          tenantId: ctx.tenantId,
          userId: ctx.userId ?? "Hospital Admin",
          action: `Assigned role ${input.role} to ${input.name} (${input.email}) in ${input.department}`,
          entity: "UserTenantRole",
          entityId: assignment.id,
        },
      });

      return assignment;
    }),

  // Update existing staff member's role and profile data (Hospital Admin only)
  updateStaff: tenantProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        role: z.string().optional(),
        department: z.string().optional(),
        title: z.string().optional(),
        phone: z.string().optional(),
        licenseNumber: z.string().optional(),
        status: z.enum(["active", "suspended", "inactive"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.role !== "Hospital Admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only Hospital Admin can manage staff" });
      }

      const existing = await prisma.userTenantRole.findFirstOrThrow({
        where: { id: input.id, tenantId: ctx.tenantId },
        include: { user: true },
      });

      if (input.name && input.name !== existing.user.name) {
        await prisma.user.update({
          where: { id: existing.userId },
          data: { name: input.name },
        });
      }

      const updated = await prisma.userTenantRole.update({
        where: { id: input.id },
        data: {
          ...(input.role ? { role: input.role } : {}),
          ...(input.department !== undefined ? { department: input.department } : {}),
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.phone !== undefined ? { phone: input.phone } : {}),
          ...(input.licenseNumber !== undefined ? { licenseNumber: input.licenseNumber } : {}),
          ...(input.status ? { status: input.status } : {}),
        },
      });

      await prisma.auditLog.create({
        data: {
          tenantId: ctx.tenantId,
          userId: ctx.userId ?? "Hospital Admin",
          action: `Updated staff profile for ${existing.user.name} (Role: ${input.role ?? existing.role}, Status: ${input.status ?? existing.status})`,
          entity: "UserTenantRole",
          entityId: updated.id,
        },
      });

      return updated;
    }),

  // Remove staff member assignment from hospital (Hospital Admin only)
  removeStaff: tenantProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.role !== "Hospital Admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only Hospital Admin can remove staff" });
      }

      const assignment = await prisma.userTenantRole.findFirstOrThrow({
        where: { id: input.id, tenantId: ctx.tenantId },
        include: { user: true },
      });

      if (assignment.userId === ctx.userId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot remove your own admin assignment" });
      }

      await prisma.userTenantRole.delete({ where: { id: input.id } });

      await prisma.auditLog.create({
        data: {
          tenantId: ctx.tenantId,
          userId: ctx.userId ?? "Hospital Admin",
          action: `Removed staff member ${assignment.user.name} (${assignment.role}) from hospital`,
          entity: "UserTenantRole",
          entityId: assignment.id,
        },
      });

      return { success: true };
    }),

  // List all role permissions configured for this hospital
  rolePermissions: tenantProcedure.query(async ({ ctx }) => {
    const records = await prisma.rolePermission.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: { role: "asc" },
    });

    return records.map((r) => {
      let perms: string[] = [];
      try {
        perms = JSON.parse(r.permissions);
      } catch {
        perms = [];
      }
      return {
        id: r.id,
        role: r.role,
        permissions: perms,
        description: r.description,
        updatedAt: r.updatedAt,
      };
    });
  }),

  // Update permissions for a specific role (Hospital Admin only)
  updateRolePermissions: tenantProcedure
    .input(
      z.object({
        role: z.string(),
        permissions: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.role !== "Hospital Admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only Hospital Admin can configure role permissions" });
      }

      const updated = await prisma.rolePermission.upsert({
        where: { tenantId_role: { tenantId: ctx.tenantId, role: input.role } },
        create: {
          tenantId: ctx.tenantId,
          role: input.role,
          permissions: JSON.stringify(input.permissions),
        },
        update: {
          permissions: JSON.stringify(input.permissions),
        },
      });

      await prisma.auditLog.create({
        data: {
          tenantId: ctx.tenantId,
          userId: ctx.userId ?? "Hospital Admin",
          action: `Updated permission policies for role: ${input.role} (${input.permissions.length} permissions granted)`,
          entity: "RolePermission",
          entityId: updated.id,
        },
      });

      return updated;
    }),

  // Reset role permissions to system defaults (Hospital Admin only)
  resetRolePermissions: tenantProcedure
    .input(z.object({ role: z.string().optional() }).default({}))
    .mutation(async ({ ctx, input }) => {
      if (ctx.role !== "Hospital Admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only Hospital Admin can reset permissions" });
      }

      const defaults: Record<string, string[]> = {
        "Hospital Admin": [
          "clinical.notes.view", "clinical.notes.create", "clinical.vitals.record", "clinical.referral.create",
          "lab.order.create", "lab.results.enter", "lab.results.approve",
          "rx.prescribe", "rx.dispense", "inventory.manage",
          "billing.view", "billing.collect", "billing.waiver.request", "billing.waiver.approve", "tariff.manage",
          "ward.admit", "ward.discharge", "ward.mar.administer",
          "admin.staff.manage", "admin.audit.view", "admin.reports.view"
        ],
        "Doctor": [
          "clinical.notes.view", "clinical.notes.create", "clinical.vitals.record", "clinical.referral.create",
          "lab.order.create",
          "rx.prescribe",
          "billing.view", "billing.waiver.request",
          "ward.admit", "ward.discharge",
          "admin.reports.view"
        ],
        "Nurse": [
          "clinical.notes.view", "clinical.vitals.record",
          "ward.admit", "ward.discharge", "ward.mar.administer"
        ],
        "Receptionist": [
          "clinical.vitals.record", "clinical.referral.create",
          "billing.view", "billing.collect"
        ],
        "Lab Technician": [
          "clinical.notes.view",
          "lab.order.create", "lab.results.enter", "lab.results.approve"
        ],
        "Pharmacist": [
          "rx.dispense", "inventory.manage",
          "billing.view"
        ],
        "Billing Officer": [
          "billing.view", "billing.collect", "billing.waiver.request",
          "admin.reports.view"
        ],
        "Referral Coordinator": [
          "clinical.notes.view", "clinical.referral.create",
          "admin.reports.view"
        ],
        "Ward Manager": [
          "clinical.notes.view", "clinical.vitals.record",
          "ward.admit", "ward.discharge", "ward.mar.administer",
          "inventory.manage"
        ],
      };

      const rolesToReset = input.role ? [input.role] : Object.keys(defaults);
      for (const r of rolesToReset) {
        if (defaults[r]) {
          await prisma.rolePermission.upsert({
            where: { tenantId_role: { tenantId: ctx.tenantId, role: r } },
            create: {
              tenantId: ctx.tenantId,
              role: r,
              permissions: JSON.stringify(defaults[r]),
            },
            update: {
              permissions: JSON.stringify(defaults[r]),
            },
          });
        }
      }

      await prisma.auditLog.create({
        data: {
          tenantId: ctx.tenantId,
          userId: ctx.userId ?? "Hospital Admin",
          action: `Reset permissions to defaults for: ${input.role ?? "all roles"}`,
          entity: "RolePermission",
        },
      });

      return { success: true };
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

  // Update card fee and tariffs (Hospital Admin only)
  updateTariffs: tenantProcedure
    .input(z.object({
      cardFeeAmount: z.number().min(0),
      specialistFeeAmount: z.number().min(0).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.role !== "Hospital Admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only Hospital Admin can configure tariffs" });
      }
      return prisma.tenant.update({
        where: { id: ctx.tenantId },
        data: {
          cardFeeAmount: input.cardFeeAmount,
          ...(input.specialistFeeAmount !== undefined ? { specialistFeeAmount: input.specialistFeeAmount } : {}),
        },
      });
    }),
});
