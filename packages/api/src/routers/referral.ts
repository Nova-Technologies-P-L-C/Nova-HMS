// =============================================================================
// Nova HMS — Referral Router
// =============================================================================
//
// Manages the formal inter-facility patient referral system.
// Aligns with Ethiopia's National Referral System guidelines and supports
// both outgoing referrals (this hospital refers out) and incoming referrals
// (this hospital receives a referred patient from another facility).
//
// Ethiopian referral system context:
//   Ethiopia operates a tiered healthcare system:
//     Health Post → Health Centre → Primary Hospital → General Hospital → Referral Hospital
//   Patients are referred upward when their condition exceeds the capacity
//   of the current facility (e.g. a health centre refers to a general hospital).
//   Referral Hospitals (like DMRH) receive from the entire catchment region.
//
//   Key challenges this module addresses:
//     - "Lost referrals" — patients referred but never confirmed as arrived
//     - Missing clinical summaries — referring facility sends inadequate information
//     - Urgency triage — emergency referrals must be tracked separately
//
// Business Rules (enforced at API level):
//   BR-18: Clinical summary must be ≥ 50 characters
//          Ensures receiving facility has enough context to act immediately
//          without calling back for information (which wastes critical time)
//
//   BR-19: Patient must have an ACTIVE visit on the SAME DAY as the referral
//          A referral without an active clinical encounter is administratively
//          invalid — the doctor must be actively seeing the patient
//
//   BR-20: Referrals not confirmed within 72 hours are auto-flagged as "lost"
//          The flagLost() mutation implements this rule — intended to be
//          called by a scheduled job (cron) every few hours
//          Currently must be triggered manually or via a scheduled API call
//
// Referral status lifecycle:
//   pending → in-transit → arrived  (normal path)
//   pending → lost                  (72h timeout via BR-20)
//   pending → in-transit → lost     (acknowledged but never arrived)
//
// Procedures exposed:
//   create          — Create an outgoing referral (Doctor/Referral Coordinator)
//   list            — List referrals (in/out/all) with patient and visit data
//   confirmArrival  — Mark a referred patient as arrived (Referral Coordinator)
//   flagLost        — Auto-flag stale referrals after 72h (scheduled job / admin)
//   updateStatus    — Manual status update (Referral Coordinator)
// =============================================================================

import prisma from "@my-better-t-app/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, tenantProcedure } from "../index";

export const referralRouter = router({

  // ── create ─────────────────────────────────────────────────────────────────
  // Creates a new outgoing patient referral.
  // Called by the Doctor or Referral Coordinator during an active consultation.
  //
  // Enforces:
  //   BR-18: clinicalSummary ≥ 50 characters
  //   BR-19: patient must have an active (open) visit opened today
  //
  // urgency levels:
  //   "routine"   — Non-urgent; referral can be processed within normal working hours
  //   "urgent"    — Requires same-day or next-day action
  //   "emergency" — Life-threatening; patient should be transported immediately
  //
  // type values:
  //   "out" — This facility is referring the patient to another facility
  //   "in"  — This facility is registering receipt of a referred patient
  create: tenantProcedure
    .input(z.object({
      visitId:         z.string(),
      patientId:       z.string(),
      fromFacility:    z.string(),                                   // Referring facility name
      toFacility:      z.string(),                                   // Receiving facility name
      reason:          z.string().min(1),                            // Primary referral reason
      clinicalSummary: z.string().min(50, "Clinical summary must be at least 50 characters (BR-18)"),
      urgency:         z.enum(["routine", "urgent", "emergency"]).default("routine"),
      type:            z.enum(["out", "in"]).default("out"),
    }))
    .mutation(async ({ ctx, input }) => {
      // ── BR-19: Validate active same-day visit ─────────────────────────────
      // The referral must be tied to a visit that is:
      //   a) Open (not completed/closed)
      //   b) Opened on today's date (not a historical visit)
      // This prevents creating referrals for past encounters or phantom visits.
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today (midnight)

      const visit = await prisma.visit.findFirst({
        where: {
          id:         input.visitId,
          tenantId:   ctx.tenantId,
          status:     "open",                   // Must be an open (active) visit
          openedAt:   { gte: today },            // Must have been opened today
        },
      });

      if (!visit) {
        throw new TRPCError({
          code:    "BAD_REQUEST",
          message: "Patient must have an active visit today to create a referral (BR-19)",
        });
      }

      // Create the referral record
      const referral = await prisma.referral.create({
        data: { ...input, tenantId: ctx.tenantId, createdBy: ctx.userId },
      });

      // Audit log — referrals are tracked for MOH referral system reporting
      await prisma.auditLog.create({
        data: {
          tenantId: ctx.tenantId,
          userId:   ctx.userId,
          action:   "Created referral",
          entity:   "Referral",
          entityId: referral.id,
        },
      });

      return referral;
    }),

  // ── list ───────────────────────────────────────────────────────────────────
  // Returns all referrals for this tenant, optionally filtered by direction.
  //
  //   type = "out"  — Outgoing: this facility referred patients to other facilities
  //   type = "in"   — Incoming: patients referred to this facility from elsewhere
  //   type = "all"  — Both directions (default)
  //
  // Includes full patient demographics and visit data for the Referral
  // Coordinator's inbox/outbox screen.
  list: tenantProcedure
    .input(z.object({
      type: z.enum(["in", "out", "all"]).default("all"),
    }).default({ type: "all" }))
    .query(async ({ ctx, input }) => {
      return prisma.referral.findMany({
        where: {
          tenantId: ctx.tenantId,
          ...(input.type !== "all" ? { type: input.type } : {}),
        },
        include: { visit: { include: { patient: true } } },
        orderBy: { createdAt: "desc" }, // Newest referrals first
      });
    }),

  // ── confirmArrival ────────────────────────────────────────────────────────
  // Records that a referred patient has arrived at the receiving facility.
  // Called by the Referral Coordinator when the patient physically presents.
  //
  // This closes the "pending" loop and prevents the referral from being
  // flagged as "lost" by the BR-20 72-hour rule.
  //
  // Idempotency guard: throws if the referral is already in "arrived" status.
  confirmArrival: tenantProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const referral = await prisma.referral.findFirstOrThrow({
        where: { id: input.id, tenantId: ctx.tenantId },
      });

      if (referral.status === "arrived") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Already confirmed" });
      }

      return prisma.referral.update({
        where: { id: input.id },
        data:  {
          status:      "arrived",
          confirmedBy: ctx.userId,    // Records who confirmed the arrival
          confirmedAt: new Date(),    // Timestamp of confirmation
        },
      });
    }),

  // ── flagLost ───────────────────────────────────────────────────────────────
  // Implements BR-20: auto-flags referrals that have not been confirmed
  // as arrived within 72 hours of creation.
  //
  // A "lost" referral means the patient was referred but the outcome is unknown:
  //   - Patient may have gone to a different facility
  //   - Patient may have deteriorated en route
  //   - Referral may have been informally cancelled without system update
  //
  // The Referral Coordinator investigates "lost" referrals by contacting
  // the receiving facility or the patient's family directly.
  //
  // Intended to run as a scheduled job (cron every 1-4 hours).
  // Currently must be called manually via an admin action or API schedule.
  //
  // Returns: { flagged: number } — count of referrals newly flagged as lost
  flagLost: tenantProcedure.mutation(async ({ ctx }) => {
    // Cutoff = now - 72 hours
    const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000);

    const result = await prisma.referral.updateMany({
      where: {
        tenantId: ctx.tenantId,
        status:   { in: ["pending", "in-transit"] }, // Only unfinalised referrals
        createdAt: { lt: cutoff },                   // Created more than 72h ago
      },
      data: { status: "lost" },
    });

    return { flagged: result.count };
  }),

  // ── updateStatus ──────────────────────────────────────────────────────────
  // Manually updates the status of a referral.
  // Used by the Referral Coordinator to track a referral through its lifecycle:
  //
  //   pending    → in-transit  (patient has left the referring facility)
  //   in-transit → arrived     (or use confirmArrival() for a richer update with timestamps)
  //   any        → lost        (manually flagged after investigation)
  //
  // For arrival confirmation with full metadata (confirmedBy, confirmedAt),
  // use confirmArrival() instead of this mutation.
  updateStatus: tenantProcedure
    .input(z.object({
      id:     z.string(),
      status: z.enum(["pending", "in-transit", "arrived", "lost"]),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify referral belongs to this tenant
      const referral = await prisma.referral.findFirstOrThrow({
        where: { id: input.id, tenantId: ctx.tenantId },
      });

      return prisma.referral.update({
        where: { id: referral.id },
        data:  { status: input.status },
      });
    }),
});
