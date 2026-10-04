import prisma from "@my-better-t-app/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router, tenantProcedure } from "../index";

const isBranchOrHospitalAdmin = (role?: string) => role === "Branch Admin" || role === "Hospital Admin";

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

      // Assign creator as Branch Admin
      await prisma.userTenantRole.create({
        data: { userId: ctx.userId!, tenantId: tenant.id, role: "Branch Admin" },
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
      if (!isBranchOrHospitalAdmin(ctx.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only Branch Admin can manage staff" });
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
      if (!isBranchOrHospitalAdmin(ctx.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only Branch Admin can manage staff" });
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
      if (!isBranchOrHospitalAdmin(ctx.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only Branch Admin can remove staff" });
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

  // List all role permissions configured for this hospital/branch
  rolePermissions: tenantProcedure.query(async ({ ctx }) => {
    const records = await prisma.rolePermission.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: [{ isSystem: "desc" }, { role: "asc" }],
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
        isSystem: r.isSystem,
        icon: r.icon,
        color: r.color,
        updatedAt: r.updatedAt,
      };
    });
  }),

  // Dynamic RBAC: Get all roles with member counts and active members
  getRolesWithStats: tenantProcedure.query(async ({ ctx }) => {
    const [roles, userRoles] = await Promise.all([
      prisma.rolePermission.findMany({
        where: { tenantId: ctx.tenantId },
        orderBy: [{ isSystem: "desc" }, { role: "asc" }],
      }),
      prisma.userTenantRole.findMany({
        where: { tenantId: ctx.tenantId },
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
      }),
    ]);

    const membersByRole: Record<string, { id: string; name: string; email: string }[]> = {};
    for (const ur of userRoles) {
      const list = membersByRole[ur.role] ?? [];
      list.push({
        id: ur.user.id,
        name: ur.user.name,
        email: ur.user.email,
      });
      membersByRole[ur.role] = list;
    }

    return roles.map((r) => {
      let perms: string[] = [];
      try {
        perms = JSON.parse(r.permissions);
      } catch {
        perms = [];
      }
      const assigned = membersByRole[r.role] ?? [];
      return {
        id: r.id,
        role: r.role,
        permissions: perms,
        description: r.description,
        isSystem: r.isSystem,
        icon: r.icon,
        color: r.color,
        memberCount: assigned.length,
        members: assigned.slice(0, 5),
        updatedAt: r.updatedAt,
      };
    });
  }),

  // Dynamic RBAC: Create new custom role (Branch Admin only)
  createRole: tenantProcedure
    .input(
      z.object({
        role: z.string().min(2, "Role name must be at least 2 characters"),
        description: z.string().default(""),
        icon: z.string().default("🛡️"),
        color: z.string().default("blue"),
        permissions: z.array(z.string()).default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!isBranchOrHospitalAdmin(ctx.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only Branch Admin can create roles" });
      }

      const existing = await prisma.rolePermission.findUnique({
        where: { tenantId_role: { tenantId: ctx.tenantId, role: input.role } },
      });
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: `A role named '${input.role}' already exists` });
      }

      const created = await prisma.rolePermission.create({
        data: {
          tenantId: ctx.tenantId,
          role: input.role,
          description: input.description,
          icon: input.icon,
          color: input.color,
          isSystem: false,
          permissions: JSON.stringify(input.permissions),
        },
      });

      await prisma.auditLog.create({
        data: {
          tenantId: ctx.tenantId,
          userId: ctx.userId ?? "Branch Admin",
          action: `Created new custom role: ${input.role} (${input.permissions.length} permissions)`,
          entity: "RolePermission",
          entityId: created.id,
        },
      });

      return created;
    }),

  // Dynamic RBAC: Update role details and permissions (Branch Admin only)
  updateRole: tenantProcedure
    .input(
      z.object({
        id: z.string(),
        role: z.string().min(2),
        description: z.string().optional(),
        icon: z.string().optional(),
        color: z.string().optional(),
        permissions: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!isBranchOrHospitalAdmin(ctx.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only Branch Admin can update roles" });
      }

      const existing = await prisma.rolePermission.findUnique({
        where: { id: input.id },
      });
      if (!existing || existing.tenantId !== ctx.tenantId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Role not found" });
      }

      // If renaming, check conflicts and migrate user tenant roles
      if (input.role !== existing.role) {
        if (existing.isSystem) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "System core role names cannot be renamed" });
        }
        const duplicate = await prisma.rolePermission.findUnique({
          where: { tenantId_role: { tenantId: ctx.tenantId, role: input.role } },
        });
        if (duplicate) {
          throw new TRPCError({ code: "CONFLICT", message: `A role named '${input.role}' already exists` });
        }

        // Update all users who had the old role name
        await prisma.userTenantRole.updateMany({
          where: { tenantId: ctx.tenantId, role: existing.role },
          data: { role: input.role },
        });
      }

      const updated = await prisma.rolePermission.update({
        where: { id: input.id },
        data: {
          role: input.role,
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.icon !== undefined ? { icon: input.icon } : {}),
          ...(input.color !== undefined ? { color: input.color } : {}),
          ...(input.permissions !== undefined ? { permissions: JSON.stringify(input.permissions) } : {}),
        },
      });

      await prisma.auditLog.create({
        data: {
          tenantId: ctx.tenantId,
          userId: ctx.userId ?? "Branch Admin",
          action: `Updated role: ${existing.role} ${input.role !== existing.role ? `(renamed to ${input.role})` : ""}`,
          entity: "RolePermission",
          entityId: updated.id,
        },
      });

      return updated;
    }),

  // Dynamic RBAC: Delete custom role with safety guard (Branch Admin only)
  deleteRole: tenantProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!isBranchOrHospitalAdmin(ctx.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only Branch Admin can delete roles" });
      }

      const role = await prisma.rolePermission.findUnique({
        where: { id: input.id },
      });
      if (!role || role.tenantId !== ctx.tenantId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Role not found" });
      }

      if (role.isSystem) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "System core roles cannot be deleted" });
      }

      const assignedUsersCount = await prisma.userTenantRole.count({
        where: { tenantId: ctx.tenantId, role: role.role },
      });
      if (assignedUsersCount > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Cannot delete '${role.role}' because ${assignedUsersCount} staff member(s) are assigned to it. Please reassign or merge them first.`,
        });
      }

      await prisma.rolePermission.delete({ where: { id: input.id } });

      await prisma.auditLog.create({
        data: {
          tenantId: ctx.tenantId,
          userId: ctx.userId ?? "Branch Admin",
          action: `Deleted custom role: ${role.role}`,
          entity: "RolePermission",
          entityId: role.id,
        },
      });

      return { success: true };
    }),

  // Dynamic RBAC: Merge/combine roles (Branch Admin only)
  mergeRoles: tenantProcedure
    .input(
      z.object({
        sourceRoleId: z.string(),
        targetRoleId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!isBranchOrHospitalAdmin(ctx.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only Branch Admin can merge roles" });
      }

      if (input.sourceRoleId === input.targetRoleId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Source and target roles cannot be the same" });
      }

      const [sourceRole, targetRole] = await Promise.all([
        prisma.rolePermission.findUnique({ where: { id: input.sourceRoleId } }),
        prisma.rolePermission.findUnique({ where: { id: input.targetRoleId } }),
      ]);

      if (!sourceRole || sourceRole.tenantId !== ctx.tenantId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Source role not found" });
      }
      if (!targetRole || targetRole.tenantId !== ctx.tenantId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Target role not found" });
      }

      if (sourceRole.isSystem) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `System role '${sourceRole.role}' cannot be merged away` });
      }

      let sourcePerms: string[] = [];
      let targetPerms: string[] = [];
      try { sourcePerms = JSON.parse(sourceRole.permissions); } catch {}
      try { targetPerms = JSON.parse(targetRole.permissions); } catch {}

      const mergedPerms = Array.from(new Set([...targetPerms, ...sourcePerms]));

      // 1. Update target role permissions
      await prisma.rolePermission.update({
        where: { id: targetRole.id },
        data: { permissions: JSON.stringify(mergedPerms) },
      });

      // 2. Reassign all staff from sourceRole to targetRole
      const reassignResult = await prisma.userTenantRole.updateMany({
        where: { tenantId: ctx.tenantId, role: sourceRole.role },
        data: { role: targetRole.role },
      });

      // 3. Delete source role
      await prisma.rolePermission.delete({ where: { id: sourceRole.id } });

      // 4. Audit log
      await prisma.auditLog.create({
        data: {
          tenantId: ctx.tenantId,
          userId: ctx.userId ?? "Branch Admin",
          action: `Merged role '${sourceRole.role}' into '${targetRole.role}': migrated ${reassignResult.count} staff members and consolidated ${mergedPerms.length} permissions`,
          entity: "RolePermission",
          entityId: targetRole.id,
        },
      });

      return {
        success: true,
        migratedStaffCount: reassignResult.count,
        targetRole: targetRole.role,
        totalPermissions: mergedPerms.length,
      };
    }),

  // Update permissions for a specific role (Branch Admin only)
  updateRolePermissions: tenantProcedure
    .input(
      z.object({
        role: z.string(),
        permissions: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!isBranchOrHospitalAdmin(ctx.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only Branch Admin can configure role permissions" });
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
          userId: ctx.userId ?? "Branch Admin",
          action: `Updated permission policies for role: ${input.role} (${input.permissions.length} permissions granted)`,
          entity: "RolePermission",
          entityId: updated.id,
        },
      });

      return updated;
    }),

  // Reset role permissions to system defaults (Branch Admin only)
  resetRolePermissions: tenantProcedure
    .input(z.object({ role: z.string().optional() }).default({}))
    .mutation(async ({ ctx, input }) => {
      if (!isBranchOrHospitalAdmin(ctx.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only Branch Admin can reset permissions" });
      }

      const defaults: Record<string, { perms: string[]; description: string; icon: string; color: string }> = {
        "Branch Admin": {
          perms: [
            "clinical.notes.view", "clinical.notes.create", "clinical.vitals.record", "clinical.referral.create",
            "lab.order.create", "lab.results.enter", "lab.results.approve",
            "rx.prescribe", "rx.dispense", "inventory.manage",
            "billing.view", "billing.collect", "billing.waiver.request", "billing.waiver.approve", "tariff.manage",
            "ward.admit", "ward.discharge", "ward.mar.administer",
            "admin.staff.manage", "admin.roles.manage", "admin.audit.view", "admin.reports.view"
          ],
          description: "Full clinical, operational, and administrative control over this branch",
          icon: "🛡️",
          color: "rose",
        },
        "Hospital Admin": {
          perms: [
            "clinical.notes.view", "clinical.notes.create", "clinical.vitals.record", "clinical.referral.create",
            "lab.order.create", "lab.results.enter", "lab.results.approve",
            "rx.prescribe", "rx.dispense", "inventory.manage",
            "billing.view", "billing.collect", "billing.waiver.request", "billing.waiver.approve", "tariff.manage",
            "ward.admit", "ward.discharge", "ward.mar.administer",
            "admin.staff.manage", "admin.roles.manage", "admin.audit.view", "admin.reports.view"
          ],
          description: "Legacy administrative alias for Branch Admin",
          icon: "🛡️",
          color: "rose",
        },
        "Doctor": {
          perms: [
            "clinical.notes.view", "clinical.notes.create", "clinical.vitals.record", "clinical.referral.create",
            "lab.order.create",
            "rx.prescribe",
            "billing.view", "billing.waiver.request",
            "ward.admit", "ward.discharge",
            "admin.reports.view"
          ],
          description: "Licensed medical doctor, consultation, diagnosis, and prescription management",
          icon: "🩺",
          color: "blue",
        },
        "Nurse": {
          perms: [
            "clinical.notes.view", "clinical.vitals.record",
            "ward.admit", "ward.discharge", "ward.mar.administer"
          ],
          description: "Triage, bedside care, medication administration record (MAR), and nurse notes",
          icon: "💉",
          color: "emerald",
        },
        "Receptionist": {
          perms: [
            "clinical.vitals.record", "clinical.referral.create",
            "billing.view", "billing.collect"
          ],
          description: "Patient registration, triage queue check-in, appointments, and front-desk collection",
          icon: "📋",
          color: "amber",
        },
        "Lab Technician": {
          perms: [
            "clinical.notes.view",
            "lab.order.create", "lab.results.enter", "lab.results.approve"
          ],
          description: "Specimen intake, lab testing, results entry, and reference validation",
          icon: "🔬",
          color: "purple",
        },
        "Pharmacist": {
          perms: [
            "rx.dispense", "inventory.manage",
            "billing.view"
          ],
          description: "Prescription dispensing, drug inventory ledger, batch tracking, and requisitions",
          icon: "💊",
          color: "teal",
        },
        "Billing Officer": {
          perms: [
            "billing.view", "billing.collect", "billing.waiver.request",
            "admin.reports.view"
          ],
          description: "Point-of-sale cashier, invoice generation, and CBHI claims clearance",
          icon: "💳",
          color: "indigo",
        },
        "Referral Coordinator": {
          perms: [
            "clinical.notes.view", "clinical.referral.create",
            "admin.reports.view"
          ],
          description: "Outbound and inbound inter-facility referral coordination and tracking",
          icon: "🔄",
          color: "cyan",
        },
        "Ward Manager": {
          perms: [
            "clinical.notes.view", "clinical.vitals.record",
            "ward.admit", "ward.discharge", "ward.mar.administer",
            "inventory.manage"
          ],
          description: "Inpatient admission, bed occupancy board, and ward stock management",
          icon: "🛏️",
          color: "orange",
        },
      };

      const rolesToReset = input.role ? [input.role] : Object.keys(defaults);
      for (const r of rolesToReset) {
        if (defaults[r]) {
          const def = defaults[r];
          await prisma.rolePermission.upsert({
            where: { tenantId_role: { tenantId: ctx.tenantId, role: r } },
            create: {
              tenantId: ctx.tenantId,
              role: r,
              permissions: JSON.stringify(def.perms),
              description: def.description,
              icon: def.icon,
              color: def.color,
              isSystem: true,
            },
            update: {
              permissions: JSON.stringify(def.perms),
              description: def.description,
              icon: def.icon,
              color: def.color,
              isSystem: true,
            },
          });
        }
      }

      await prisma.auditLog.create({
        data: {
          tenantId: ctx.tenantId,
          userId: ctx.userId ?? "Branch Admin",
          action: `Reset permissions to defaults for: ${input.role ?? "all system roles"}`,
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

  // Update card fee and tariffs (Branch Admin only)
  updateTariffs: tenantProcedure
    .input(z.object({
      cardFeeAmount: z.number().min(0),
      specialistFeeAmount: z.number().min(0).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!isBranchOrHospitalAdmin(ctx.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only Branch Admin can configure tariffs" });
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
