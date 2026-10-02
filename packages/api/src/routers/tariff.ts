import prisma from "@my-better-t-app/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, tenantProcedure } from "../index";

export const tariffRouter = router({
  // List all hospital service tariffs with optional filtering
  list: tenantProcedure
    .input(
      z.object({
        category: z.string().optional(),
        search: z.string().optional(),
        activeOnly: z.boolean().default(false),
      }).default({ activeOnly: false })
    )
    .query(async ({ ctx, input }) => {
      return prisma.hospitalServiceTariff.findMany({
        where: {
          tenantId: ctx.tenantId,
          ...(input.category && input.category !== "all" ? { category: input.category } : {}),
          ...(input.activeOnly ? { isActive: true } : {}),
          ...(input.search ? {
            OR: [
              { name: { contains: input.search } },
              { code: { contains: input.search } },
              { department: { contains: input.search } },
              { description: { contains: input.search } },
            ],
          } : {}),
        },
        orderBy: [{ category: "asc" }, { department: "asc" }, { name: "asc" }],
      });
    }),

  // Get service categories with counts
  categories: tenantProcedure.query(async ({ ctx }) => {
    const items = await prisma.hospitalServiceTariff.findMany({
      where: { tenantId: ctx.tenantId },
      select: { category: true, isActive: true },
    });

    const categoryMap: Record<string, { total: number; active: number }> = {};
    for (const item of items) {
      const current = categoryMap[item.category] ?? { total: 0, active: 0 };
      current.total += 1;
      if (item.isActive) {
        current.active += 1;
      }
      categoryMap[item.category] = current;
    }

    return Object.entries(categoryMap).map(([category, stats]) => ({
      category,
      total: stats.total,
      active: stats.active,
    }));
  }),

  // Update a single service price (Hospital Admin only)
  updatePrice: tenantProcedure
    .input(
      z.object({
        id: z.string(),
        price: z.number().min(0, "Price must be 0 or higher"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.role !== "Hospital Admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only Hospital Administrators can edit service prices",
        });
      }

      const existing = await prisma.hospitalServiceTariff.findFirstOrThrow({
        where: { id: input.id, tenantId: ctx.tenantId },
      });

      const updated = await prisma.hospitalServiceTariff.update({
        where: { id: input.id },
        data: { price: input.price },
      });

      // Synchronize with tenant card fee / specialist fee if this is the core OPD tariff
      if (existing.code === "OPD_REG_GENERAL") {
        await prisma.tenant.update({
          where: { id: ctx.tenantId },
          data: { cardFeeAmount: input.price },
        });
      } else if (existing.code === "CONSULT_SPECIALIST") {
        await prisma.tenant.update({
          where: { id: ctx.tenantId },
          data: { specialistFeeAmount: input.price },
        });
      }

      // Record audit log
      await prisma.auditLog.create({
        data: {
          tenantId: ctx.tenantId,
          userId: ctx.userId ?? "Hospital Admin",
          action: `Updated price for ${existing.name} (${existing.code}) from ETB ${existing.price} to ETB ${input.price}`,
          entity: "HospitalServiceTariff",
          entityId: existing.id,
          metadata: JSON.stringify({
            previousPrice: existing.price,
            newPrice: input.price,
            category: existing.category,
          }),
        },
      });

      return updated;
    }),

  // Batch update prices (Hospital Admin only)
  batchUpdatePrices: tenantProcedure
    .input(
      z.object({
        updates: z.array(
          z.object({
            id: z.string(),
            price: z.number().min(0),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.role !== "Hospital Admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only Hospital Administrators can edit service prices",
        });
      }

      const results = [];
      for (const u of input.updates) {
        const item = await prisma.hospitalServiceTariff.findFirst({
          where: { id: u.id, tenantId: ctx.tenantId },
        });
        if (item) {
          const res = await prisma.hospitalServiceTariff.update({
            where: { id: u.id },
            data: { price: u.price },
          });

          if (item.code === "OPD_REG_GENERAL") {
            await prisma.tenant.update({
              where: { id: ctx.tenantId },
              data: { cardFeeAmount: u.price },
            });
          } else if (item.code === "CONSULT_SPECIALIST") {
            await prisma.tenant.update({
              where: { id: ctx.tenantId },
              data: { specialistFeeAmount: u.price },
            });
          }

          results.push(res);
        }
      }

      await prisma.auditLog.create({
        data: {
          tenantId: ctx.tenantId,
          userId: ctx.userId ?? "Hospital Admin",
          action: `Batch updated ${results.length} service tariff prices`,
          entity: "HospitalServiceTariff",
        },
      });

      return results;
    }),

  // Toggle active status (Hospital Admin only)
  toggleActive: tenantProcedure
    .input(
      z.object({
        id: z.string(),
        isActive: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.role !== "Hospital Admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only Hospital Administrators can change service status",
        });
      }

      const item = await prisma.hospitalServiceTariff.findFirstOrThrow({
        where: { id: input.id, tenantId: ctx.tenantId },
      });

      const updated = await prisma.hospitalServiceTariff.update({
        where: { id: input.id },
        data: { isActive: input.isActive },
      });

      await prisma.auditLog.create({
        data: {
          tenantId: ctx.tenantId,
          userId: ctx.userId ?? "Hospital Admin",
          action: `${input.isActive ? "Activated" : "Deactivated"} service tariff: ${item.name}`,
          entity: "HospitalServiceTariff",
          entityId: item.id,
        },
      });

      return updated;
    }),

  // Add or update a hospital service (Hospital Admin only)
  upsert: tenantProcedure
    .input(
      z.object({
        id: z.string().optional(),
        code: z.string().min(2),
        name: z.string().min(2),
        category: z.string().min(2),
        department: z.string().default("General"),
        price: z.number().min(0),
        description: z.string().default(""),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.role !== "Hospital Admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only Hospital Administrators can configure services",
        });
      }

      if (input.id) {
        const updated = await prisma.hospitalServiceTariff.update({
          where: { id: input.id },
          data: {
            code: input.code,
            name: input.name,
            category: input.category,
            department: input.department,
            price: input.price,
            description: input.description,
            isActive: input.isActive,
          },
        });

        if (input.code === "OPD_REG_GENERAL") {
          await prisma.tenant.update({
            where: { id: ctx.tenantId },
            data: { cardFeeAmount: input.price },
          });
        }

        await prisma.auditLog.create({
          data: {
            tenantId: ctx.tenantId,
            userId: ctx.userId ?? "Hospital Admin",
            action: `Modified service tariff: ${input.name}`,
            entity: "HospitalServiceTariff",
            entityId: input.id,
          },
        });

        return updated;
      }

      const created = await prisma.hospitalServiceTariff.create({
        data: {
          tenantId: ctx.tenantId,
          code: input.code,
          name: input.name,
          category: input.category,
          department: input.department,
          price: input.price,
          description: input.description,
          isActive: input.isActive,
        },
      });

      await prisma.auditLog.create({
        data: {
          tenantId: ctx.tenantId,
          userId: ctx.userId ?? "Hospital Admin",
          action: `Created new service tariff: ${input.name} (${input.code}) at ETB ${input.price}`,
          entity: "HospitalServiceTariff",
          entityId: created.id,
        },
      });

      return created;
    }),

  // Delete a service tariff (Hospital Admin only)
  delete: tenantProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.role !== "Hospital Admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only Hospital Administrators can delete services",
        });
      }

      const item = await prisma.hospitalServiceTariff.findFirstOrThrow({
        where: { id: input.id, tenantId: ctx.tenantId },
      });

      await prisma.hospitalServiceTariff.delete({
        where: { id: input.id },
      });

      await prisma.auditLog.create({
        data: {
          tenantId: ctx.tenantId,
          userId: ctx.userId ?? "Hospital Admin",
          action: `Deleted service tariff: ${item.name} (${item.code})`,
          entity: "HospitalServiceTariff",
        },
      });

      return { success: true };
    }),

  // Quick lookup dictionary of active prices by test/drug/service name or code
  pricingMap: tenantProcedure.query(async ({ ctx }) => {
    const tariffs = await prisma.hospitalServiceTariff.findMany({
      where: { tenantId: ctx.tenantId, isActive: true },
      select: { code: true, name: true, category: true, price: true, department: true },
    });

    const byName: Record<string, number> = {};
    const byCode: Record<string, number> = {};

    for (const t of tariffs) {
      byName[t.name.toLowerCase().trim()] = t.price;
      byCode[t.code] = t.price;
    }

    return { tariffs, byName, byCode };
  }),
});
