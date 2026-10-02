// =============================================================================
// Nova HMS — Ward Router
// =============================================================================
//
// Manages inpatient bed allocation and admission/discharge workflows.
// Used by the Ward Manager to track bed occupancy and patient movements
// across all wards in the hospital.
//
// Ward module context (Ethiopian hospitals):
//   Ethiopian referral hospitals typically have named wards:
//     - Medical Ward (Internal Medicine)
//     - Surgical Ward
//     - Maternity / Labour Ward
//     - Paediatric Ward
//     - ICU (Intensive Care Unit)
//     - Private Ward
//
//   The bed board is the Ward Manager's primary screen — a visual grid
//   showing every bed in every ward with its current status (available,
//   occupied, maintenance, reserved).
//
// Admission workflow:
//   1. Doctor decides patient needs admission (during OPD or Emergency visit)
//   2. Doctor/Ward Manager calls ward.admit() — assigns patient to a specific bed
//   3. Bed status automatically changes to "occupied"
//   4. Patient receives inpatient care (vitals, nursing notes via nurse module)
//   5. Doctor orders discharge
//   6. Ward Manager calls ward.discharge() — bed returns to "available"
//
// Bed status values:
//   "available"   — Empty, ready to receive a new patient
//   "occupied"    — Patient currently admitted in this bed
//   "maintenance" — Bed out of service (cleaning, repair, infection control)
//   "reserved"    — Pre-booked for an incoming patient (e.g. post-op)
//
// Procedures exposed:
//   beds             — List all beds with occupancy status (Ward Manager)
//   addBed           — Register a new bed in the system (Hospital Admin)
//   updateBedStatus  — Change bed status manually (Ward Manager)
//   admit            — Admit a patient to a specific bed (Ward Manager/Doctor)
//   discharge        — Discharge a patient and free their bed (Ward Manager/Doctor)
//   admissions       — List all currently active admissions (Ward Manager)
// =============================================================================

import prisma from "@my-better-t-app/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, tenantProcedure } from "../index";

export const wardRouter = router({

  // ── beds ───────────────────────────────────────────────────────────────────
  // Returns all beds for this tenant, including the currently admitted patient
  // (if any) for occupied beds.
  //
  // Ordered by ward name then room — matches the physical layout of the ward
  // as a nurse or manager would walk through it.
  //
  // The UI renders this as a bed board grid:
  //   ┌────────────┐ ┌────────────┐ ┌────────────┐
  //   │ Medical    │ │ Medical    │ │ Medical    │
  //   │ Room 1     │ │ Room 2     │ │ Room 3     │
  //   │ Tigist A.  │ │ AVAILABLE  │ │ Maintenance│
  //   │ (occupied) │ │            │ │            │
  //   └────────────┘ └────────────┘ └────────────┘
  beds: tenantProcedure.query(async ({ ctx }) => {
    return prisma.bed.findMany({
      where:   { tenantId: ctx.tenantId },
      include: {
        admissions: {
          where:   { status: "active" },                    // Only the active (current) admission
          include: { patient: { select: { nameEn: true, nameAm: true, healthId: true } } },
          take:    1,                                        // At most one active admission per bed
        },
      },
      orderBy: [{ ward: "asc" }, { room: "asc" }],         // Ward A → B → C, then Room 1 → 2 → 3
    });
  }),

  // ── addBed ─────────────────────────────────────────────────────────────────
  // Registers a new physical bed in the system.
  // Called by Hospital Admin when expanding bed capacity or adding a new ward.
  //
  // New beds default to "available" status — ready to receive patients immediately.
  addBed: tenantProcedure
    .input(z.object({
      ward: z.string(),   // Ward name e.g. "Medical Ward", "Maternity", "ICU"
      room: z.string(),   // Room/bay identifier e.g. "Room 3", "Bay B", "Bed 12"
    }))
    .mutation(async ({ ctx, input }) => {
      return prisma.bed.create({ data: { ...input, tenantId: ctx.tenantId } });
      // Status defaults to "available" (schema default)
    }),

  // ── updateBedStatus ────────────────────────────────────────────────────────
  // Manually changes the status of a bed.
  // Used by Ward Manager for operational status changes:
  //   available → maintenance  (cleaning after discharge, equipment repair)
  //   maintenance → available  (bed returned to service)
  //   available → reserved     (pre-booking for a known incoming patient)
  //
  // NOTE: "occupied" status is set automatically by the admit() mutation —
  // it should not normally be set manually here.
  updateBedStatus: tenantProcedure
    .input(z.object({
      id:     z.string(),
      status: z.enum(["available", "occupied", "maintenance", "reserved"]),
    }))
    .mutation(async ({ input }) => {
      return prisma.bed.update({ where: { id: input.id }, data: { status: input.status } });
    }),

  // ── admit ──────────────────────────────────────────────────────────────────
  // Admits a patient to a specific bed.
  // Creates an Admission record and marks the bed as "occupied".
  //
  // Precondition: bed must be "available" — you cannot admit to an occupied,
  // reserved, or maintenance bed. This prevents double-booking.
  //
  // In a full workflow, this is called after the Doctor completes a clinical
  // decision to admit the patient from OPD or Emergency.
  admit: tenantProcedure
    .input(z.object({
      patientId: z.string(),
      bedId:     z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const bed = await prisma.bed.findFirstOrThrow({
        where: { id: input.bedId, tenantId: ctx.tenantId },
      });

      // Hard guard — prevents admitting to a non-available bed
      if (bed.status !== "available") {
        throw new TRPCError({
          code:    "BAD_REQUEST",
          message: "Bed is not available",
          // e.g. "Bed is not available" if bed is occupied, in maintenance, or reserved
        });
      }

      // Create the inpatient admission record
      const admission = await prisma.admission.create({
        data: { tenantId: ctx.tenantId, patientId: input.patientId, bedId: input.bedId },
        // status defaults to "active" (schema default)
      });

      // Mark bed as occupied — prevents another admission to the same bed
      await prisma.bed.update({ where: { id: input.bedId }, data: { status: "occupied" } });

      return admission;
    }),

  // ── discharge ─────────────────────────────────────────────────────────────
  // Discharges a patient from their bed.
  // Sets the admission status to "discharged" and records the discharge timestamp.
  // Releases the bed back to "available" so new patients can be admitted.
  //
  // PRODUCTION ENHANCEMENT: Before allowing discharge, check that:
  //   - The visit invoice is settled (no outstanding balance)
  //   - A discharge summary (clinical note) has been written by the doctor
  //   - Nursing notes are complete and signed
  //   These checks should be added as preconditions in a future version.
  discharge: tenantProcedure
    .input(z.object({ admissionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const admission = await prisma.admission.findFirstOrThrow({
        where: { id: input.admissionId, tenantId: ctx.tenantId },
      });

      // Mark admission as discharged with timestamp
      await prisma.admission.update({
        where: { id: input.admissionId },
        data:  { status: "discharged", dischargedAt: new Date() },
      });

      // Return the bed to available status for the next patient
      await prisma.bed.update({
        where: { id: admission.bedId },
        data:  { status: "available" },
      });

      return { success: true };
    }),

  // ── admissions ─────────────────────────────────────────────────────────────
  // Returns all currently active (non-discharged) admissions.
  // Used on the Ward Manager's admissions list screen to see:
  //   - Which patients are currently admitted
  //   - Which bed they are in
  //   - When they were admitted (for length-of-stay tracking)
  //
  // Ordered newest first — most recently admitted patients appear at the top.
  admissions: tenantProcedure.query(async ({ ctx }) => {
    return prisma.admission.findMany({
      where:   { tenantId: ctx.tenantId, status: "active" },
      include: {
        patient: { select: { nameEn: true, nameAm: true, healthId: true } },
        bed:     true,                          // Full bed record (ward, room, status)
      },
      orderBy: { admittedAt: "desc" },           // Newest admission first
    });
  }),
});
