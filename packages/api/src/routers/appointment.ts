import prisma from "@my-better-t-app/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, tenantProcedure } from "../index";

export const appointmentRouter = router({
  // Book appointment
  create: tenantProcedure
    .input(z.object({
      patientId: z.string(),
      doctor: z.string(),
      dept: z.string(),
      date: z.string(),
      time: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // SCH-02: prevent double-booking
      const conflict = await prisma.appointment.findFirst({
        where: {
          tenantId: ctx.tenantId,
          doctor: input.doctor,
          date: input.date,
          time: input.time,
          status: { in: ["scheduled", "confirmed"] },
        },
      });
      if (conflict) {
        throw new TRPCError({ code: "CONFLICT", message: "Doctor already has an appointment at this time (SCH-02)" });
      }

      return prisma.appointment.create({
        data: { ...input, tenantId: ctx.tenantId },
      });
    }),

  // List appointments
  list: tenantProcedure
    .input(z.object({
      patientId: z.string().optional(),
      date: z.string().optional(),
      status: z.string().optional(),
    }).default({}))
    .query(async ({ ctx, input }) => {
      return prisma.appointment.findMany({
        where: {
          tenantId: ctx.tenantId,
          ...(input.patientId ? { patientId: input.patientId } : {}),
          ...(input.date ? { date: input.date } : {}),
          ...(input.status ? { status: input.status } : {}),
        },
        include: { patient: { select: { nameEn: true, nameAm: true, healthId: true } } },
        orderBy: [{ date: "asc" }, { time: "asc" }],
      });
    }),

  // Update status
  updateStatus: tenantProcedure
    .input(z.object({
      id: z.string(),
      status: z.enum(["scheduled", "confirmed", "completed", "cancelled", "no-show"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const appointment = await prisma.appointment.findFirstOrThrow({
        where: { id: input.id, tenantId: ctx.tenantId },
      });

      return prisma.appointment.update({
        where: { id: appointment.id },
        data: { status: input.status },
      });
    }),
});
