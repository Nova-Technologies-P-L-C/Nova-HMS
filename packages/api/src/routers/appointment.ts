import prisma from "@my-better-t-app/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, tenantProcedure } from "../index";
import { sendAppointmentConfirmationEmail, sendAppointmentStatusEmail } from "../services/email";

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

      const appointment = await prisma.appointment.create({
        data: { ...input, tenantId: ctx.tenantId },
        include: {
          patient: true,
          tenant: { select: { name: true } },
        },
      });

      // Send Brevo email if patient has an email registered
      if (appointment.patient?.email) {
        sendAppointmentConfirmationEmail({
          patientEmail: appointment.patient.email,
          patientName: appointment.patient.nameEn,
          healthId: appointment.patient.healthId,
          doctor: appointment.doctor,
          department: appointment.dept,
          date: appointment.date,
          time: appointment.time,
          hospitalName: appointment.tenant?.name,
        }).catch((err) => console.error("[Brevo Email Error]:", err));
      }

      // Record in-app notification
      if (ctx.userId) {
        prisma.notification.create({
          data: {
            tenantId: ctx.tenantId,
            userId: ctx.userId,
            type: "appointment",
            title: "Appointment Scheduled",
            body: `Appointment booked for ${appointment.patient?.nameEn || "patient"} with ${appointment.doctor} on ${appointment.date} at ${appointment.time}.`,
          },
        }).catch(() => {});
      }

      return appointment;
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

      const updated = await prisma.appointment.update({
        where: { id: appointment.id },
        data: { status: input.status },
        include: {
          patient: true,
          tenant: { select: { name: true } },
        },
      });

      // Send status change notification if patient has email
      if (updated.patient?.email && (input.status === "cancelled" || input.status === "confirmed")) {
        sendAppointmentStatusEmail({
          patientEmail: updated.patient.email,
          patientName: updated.patient.nameEn,
          doctor: updated.doctor,
          dept: updated.dept,
          date: updated.date,
          time: updated.time,
          status: input.status,
          hospitalName: updated.tenant?.name,
        }).catch((err) => console.error("[Brevo Status Email Error]:", err));
      }

      return updated;
    }),
});
