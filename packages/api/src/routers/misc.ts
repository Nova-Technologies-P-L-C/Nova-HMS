import prisma from "@my-better-t-app/db";
import { z } from "zod";
import { router, tenantProcedure } from "../index";

export const auditRouter = router({
  list: tenantProcedure
    .input(z.object({ page: z.number().default(1) }).default({ page: 1 }))
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * 50;
      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where: { tenantId: ctx.tenantId },
          orderBy: { createdAt: "desc" },
          skip,
          take: 50,
        }),
        prisma.auditLog.count({ where: { tenantId: ctx.tenantId } }),
      ]);
      return { logs, total };
    }),
});
