// =============================================================================
// Nova HMS — Visit Router
// =============================================================================
//
// Manages the full lifecycle of a patient visit — from opening a new OPD
// ticket at Reception through clinical documentation to billing handoff.
// The Visit is the central entity that all other clinical data attaches to.
//
// Visit lifecycle:
//   1. openVisit()        → Reception creates visit + OPD queue ticket
//   2. (patient waits)    → Queue board shows ticket status "waiting"
//   3. updateTicketStatus() → Doctor calls patient → "being-seen"
//   4. recordVitals()     → Nurse records BP, temperature, SpO2, etc.
//   5. addNote()          → Doctor writes SOAP consultation note
//   6. addDiagnosis()     → Doctor records ICD-10 diagnosis
//   7. (lab orders / prescriptions created via lab.ts & prescription.ts)
//   8. transferToBilling() → Doctor completes consultation, sends to cashier
//   9. (billing collects payments via billing.ts)
//  10. closeVisit()        → Visit marked "completed", closedAt set
//
// Payment flow for OPD card fee:
//   Regular patient:   Card fee due at reception (or cashier) — paymentStatus "unpaid"
//   CBHI member:       Fee billed to CBHI — paymentStatus "cbhi_covered"
//   Emergency patient: Fee deferred per MOH protocol — paymentStatus "emergency_exempt"
//
// Ticket numbering convention (Ethiopian hospital standard):
//   Regular OPD:  "A-001", "A-002", ... (resets midnight)
//   Emergency:    "E-001", "E-002", ... (resets midnight)
//
// Procedures exposed:
//   openVisit          — Create visit + OPD ticket + optional card fee receipt (Receptionist)
//   payCardFee         — Collect card fee for an existing unpaid ticket (Cashier/Reception)
//   queue              — Get today's OPD queue (all roles — displayed on queue board TV)
//   updateTicketStatus — Move ticket through queue states (Doctor calls patient, etc.)
//   recordVitals       — Record physiological measurements (Nurse)
//   addNote            — Write SOAP clinical note (Doctor)
//   addDiagnosis       — Add ICD-10 coded diagnosis (Doctor)
//   closeVisit         — Mark visit completed (Doctor/System)
//   transferToBilling  — Hand visit to cashier for payment collection (Doctor)
//   get                — Full visit detail with all nested clinical data (any role)
// =============================================================================

import prisma from "@my-better-t-app/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, tenantProcedure } from "../index";

export const visitRouter = router({

  // ── openVisit ──────────────────────────────────────────────────────────────
  // Opens a new patient visit and issues an OPD queue ticket.
  // This is the first action in every OPD encounter — called by the Receptionist
  // when a patient presents at the front desk with their health ID card.
  //
  // Fee resolution order (most specific wins):
  //   1. HospitalServiceTariff (tenant-configured fee schedule)
  //   2. Tenant.cardFeeAmount (facility-wide default)
  //   3. Hardcoded: 100 ETB (emergency) / 50 ETB (regular)
  //
  // Payment status logic:
  //   Emergency patient    → "emergency_exempt" (deferred per MOH protocol)
  //   CBHI member          → "cbhi_covered" (billed to EHIA, not patient)
  //   Cash/mobile payment  → "paid" + receipt generated immediately
  //   No payment at desk   → "unpaid" (patient pays at cashier later)
  openVisit: tenantProcedure
    .input(z.object({
      patientId:        z.string(),
      type:             z.enum(["opd", "inpatient", "emergency"]).default("opd"),
      isEmergency:      z.boolean().default(false),                        // Explicit emergency flag (overrides type)
      paymentMethod:    z.enum(["cash", "telebirr", "cbe_birr", "card", "unpaid"]).default("unpaid"),
      paymentReference: z.string().default(""),                            // Mobile money transaction ref
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify patient belongs to this tenant (prevents cross-hospital data mixing)
      const patient = await prisma.patient.findFirstOrThrow({
        where: { id: input.patientId, tenantId: ctx.tenantId },
      });
      const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: ctx.tenantId } });

      // Determine if this is an emergency visit
      const isEmerg = input.type === "emergency" || input.isEmergency;

      // Default fee from tenant settings
      let feeAmount = isEmerg ? 100 : (tenant.cardFeeAmount ?? 50);

      // Override with tenant-configured tariff if one exists (takes precedence)
      const tariffCode = isEmerg ? "OPD_REG_EMERGENCY" : "OPD_REG_GENERAL";
      const configuredTariff = await prisma.hospitalServiceTariff.findFirst({
        where: { tenantId: ctx.tenantId, code: tariffCode, isActive: true },
      });
      if (configuredTariff) feeAmount = configuredTariff.price;

      // Determine payment and ticket status
      let paymentStatus = "unpaid";
      let status = "waiting";

      if (isEmerg) {
        paymentStatus = "emergency_exempt"; // Emergency visits bypass payment at reception
        status = "urgent";                  // Emergency tickets go to the front of the queue
      } else if (patient.cbhiStatus) {
        paymentStatus = "cbhi_covered";     // CBHI covers the card fee
      } else if (input.paymentMethod !== "unpaid") {
        paymentStatus = "paid";             // Payment collected at reception desk
      }

      // Create the Visit record — anchor for all clinical data
      const visit = await prisma.visit.create({
        data: {
          tenantId:  ctx.tenantId,
          patientId: input.patientId,
          type:      isEmerg ? "emergency" : input.type,
        },
      });

      // Generate today's sequential ticket number
      // Count tickets issued today for this tenant to get the next number
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayCount = await prisma.oPDTicket.count({
        where: { tenantId: ctx.tenantId, issuedAt: { gte: today } },
      });
      // "A-001" for regular OPD; "E-001" for emergency
      const ticketNumber = `${isEmerg ? "E" : "A"}-${String(todayCount + 1).padStart(3, "0")}`;

      // Generate payment receipt if card fee was collected at reception
      let receiptNumber = "";
      if (paymentStatus === "paid") {
        // PRODUCTION BLOCKER (P6 — Race Condition): COUNT+1 is not safe under concurrent cashiers.
        // Fix with a PostgreSQL sequence before production deployment — see billing.ts for details.
        const rcCount = await prisma.paymentReceipt.count({ where: { tenantId: ctx.tenantId } });
        receiptNumber = `RCP-${new Date().getFullYear()}-${String(rcCount + 1).padStart(5, "0")}`;

        await prisma.paymentReceipt.create({
          data: {
            tenantId:      ctx.tenantId,
            receiptNumber,
            patientId:     patient.id,
            visitId:       visit.id,
            category:      "card_fee",
            amount:        feeAmount,
            paymentMethod: input.paymentMethod,
            collectedBy:   ctx.userId ?? "Receptionist",
            reference:     input.paymentReference,
            notes:         `Card Fee for ${ticketNumber}`,
          },
        });
      }

      // Create the OPD queue ticket
      const ticket = await prisma.oPDTicket.create({
        data: {
          tenantId:      ctx.tenantId,
          visitId:       visit.id,
          ticketNumber,
          status,
          feeAmount,
          paymentStatus,
          paidAt:        paymentStatus === "paid" ? new Date() : undefined,
          receiptNumber,
          paymentMethod: paymentStatus === "paid"             ? input.paymentMethod  :
                         paymentStatus === "cbhi_covered"     ? "cbhi"               :
                         paymentStatus === "emergency_exempt" ? "emergency"          : "",
        },
      });

      return { visit, ticket, receiptNumber };
    }),

  // ── payCardFee ─────────────────────────────────────────────────────────────
  // Collects the OPD card/registration fee for an existing unpaid ticket.
  // Called by the cashier when a patient pays their card fee after being triaged.
  // Idempotent — returns the ticket unchanged if already paid.
  payCardFee: tenantProcedure
    .input(z.object({
      ticketId:      z.string(),
      paymentMethod: z.enum(["cash", "telebirr", "cbe_birr", "card"]),
      reference:     z.string().default(""),   // Mobile money transaction reference
    }))
    .mutation(async ({ ctx, input }) => {
      const ticket = await prisma.oPDTicket.findFirstOrThrow({
        where:   { id: input.ticketId, tenantId: ctx.tenantId },
        include: { visit: { include: { patient: true } } },
      });

      // Idempotency guard — do not double-charge
      if (ticket.paymentStatus === "paid") return ticket;

      // PRODUCTION BLOCKER (P6 — Race Condition): COUNT+1 is not safe under concurrent cashiers.
      // Fix with a PostgreSQL sequence before production deployment — see billing.ts for details.
      const rcCount = await prisma.paymentReceipt.count({ where: { tenantId: ctx.tenantId } });
      const receiptNumber = `RCP-${new Date().getFullYear()}-${String(rcCount + 1).padStart(5, "0")}`;

      await prisma.paymentReceipt.create({
        data: {
          tenantId:      ctx.tenantId,
          receiptNumber,
          patientId:     ticket.visit.patientId,
          visitId:       ticket.visitId,
          category:      "card_fee",
          amount:        ticket.feeAmount,
          paymentMethod: input.paymentMethod,
          collectedBy:   ctx.userId ?? "Receptionist",
          reference:     input.reference,
          notes:         `Card Fee for Ticket ${ticket.ticketNumber}`,
        },
      });

      // Update ticket to paid status
      return prisma.oPDTicket.update({
        where: { id: ticket.id },
        data:  {
          paymentStatus: "paid",
          paidAt:        new Date(),
          receiptNumber,
          paymentMethod: input.paymentMethod,
        },
      });
    }),

  // ── queue ──────────────────────────────────────────────────────────────────
  // Returns all OPD tickets for today (last 7 days for dev/testing flexibility).
  // Displayed on the OPD Queue Board — a TV/monitor in the waiting area showing
  // which ticket numbers are being called.
  //
  // Includes patient name (EN+AM) and CBHI status for the receptionist/nurse view.
  // Ordered by issuedAt ASC — first-come-first-served queue order.
  queue: tenantProcedure.query(async ({ ctx }) => {
    const since = new Date();
    since.setDate(since.getDate() - 7);
    since.setHours(0, 0, 0, 0);

    return prisma.oPDTicket.findMany({
      where: {
        tenantId: ctx.tenantId,
        issuedAt: { gte: since },
      },
      include: {
        visit: {
          include: {
            // Select only what the queue board needs — avoids over-fetching clinical data
            patient: { select: { id: true, nameEn: true, nameAm: true, healthId: true, cbhiStatus: true } },
          },
        },
      },
      orderBy: { issuedAt: "asc" }, // FCFS order — earliest ticket first
    });
  }),

  // ── updateTicketStatus ─────────────────────────────────────────────────────
  // Advances a ticket through the OPD queue workflow states.
  // Called by:
  //   Doctor      → "being-seen" (patient entered consultation room)
  //   Doctor      → "done" (consultation complete)
  //   Receptionist → "no-show" (patient called but did not respond)
  //
  // Automatically sets calledAt / completedAt timestamps for wait-time KPI tracking.
  updateTicketStatus: tenantProcedure
    .input(z.object({
      ticketId: z.string(),
      status:   z.enum(["waiting", "being-seen", "done", "urgent", "no-show"]),
    }))
    .mutation(async ({ input }) => {
      // SECURITY BUG (P7): This update does NOT verify that the ticket belongs to
      // the caller's tenant. A doctor from hospital A could change the ticket status
      // of a patient in hospital B by supplying a ticketId from another tenant.
      // Fix: add a findFirstOrThrow with { id: input.ticketId, tenantId: ctx.tenantId }
      // before the update, or use:
      //   prisma.oPDTicket.update({ where: { id: input.ticketId, tenantId: ctx.tenantId }, ... })
      // Note: Prisma update() does not support compound where with non-@id fields
      // directly without a @unique constraint — use findFirstOrThrow as guard.
      return prisma.oPDTicket.update({
        where: { id: input.ticketId },
        data: {
          status:      input.status,
          calledAt:    input.status === "being-seen" ? new Date() : undefined, // Timestamp when patient was called
          completedAt: input.status === "done"       ? new Date() : undefined, // Timestamp when consultation ended
        },
      });
    }),

  // ── recordVitals ───────────────────────────────────────────────────────────
  // Records a set of physiological measurements for a visit.
  // Called by the Nurse at triage or at the bedside.
  // Multiple vital sets can be recorded per visit (e.g. triage + 1h follow-up).
  //
  // All measurements are optional — nurses record only what equipment is available
  // (some Ethiopian health centres lack pulse oximeters or scales).
  recordVitals: tenantProcedure
    .input(z.object({
      visitId:    z.string(),
      bpSystolic:  z.number().optional(),   // mmHg
      bpDiastolic: z.number().optional(),   // mmHg
      heartRate:   z.number().optional(),   // bpm
      temperature: z.number().optional(),   // °C
      spo2:        z.number().optional(),   // % (pulse oximetry)
      weight:      z.number().optional(),   // kg
      height:      z.number().optional(),   // cm
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify visit belongs to this tenant
      await prisma.visit.findFirstOrThrow({ where: { id: input.visitId, tenantId: ctx.tenantId } });
      return prisma.vitalSigns.create({
        data: { ...input, recordedBy: ctx.userId }, // recordedBy = userId of the nurse
      });
    }),

  // ── addNote ────────────────────────────────────────────────────────────────
  // Writes a structured SOAP clinical note for a visit.
  // This is the primary documentation tool for the Doctor's consultation.
  //
  // SOAP structure maps to Ethiopian MOH Form 2B (OPD case note):
  //   chiefComplaint → S: Subjective (patient's own words)
  //   history        → S: History of Present Illness (HPI)
  //   examination    → O: Objective (physical exam findings)
  //   assessment     → A: Clinical impression / differentials
  //   plan           → P: Management plan (investigations, treatment, follow-up)
  //
  // Multiple notes can be added per visit (initial + progress + discharge notes).
  addNote: tenantProcedure
    .input(z.object({
      visitId:       z.string(),
      noteType:      z.string().default("consultation"),  // consultation | progress | discharge | referral
      chiefComplaint: z.string().default(""),
      history:       z.string().default(""),
      examination:   z.string().default(""),
      assessment:    z.string().default(""),
      plan:          z.string().default(""),
    }))
    .mutation(async ({ ctx, input }) => {
      await prisma.visit.findFirstOrThrow({ where: { id: input.visitId, tenantId: ctx.tenantId } });
      return prisma.clinicalNote.create({
        data: { ...input, authorId: ctx.userId }, // authorId = doctor's userId
      });
    }),

  // ── addDiagnosis ───────────────────────────────────────────────────────────
  // Records an ICD-10 coded diagnosis for a visit.
  // Separated from clinical notes to enable structured HMIS reporting.
  //
  // icdCode must follow ICD-10 format (e.g. "J18.9" for pneumonia).
  // This data feeds directly into:
  //   - Monthly MOH morbidity reports
  //   - CBHI claim submissions (EHIA requires ICD-10 codes)
  //   - Hospital disease burden analytics
  addDiagnosis: tenantProcedure
    .input(z.object({
      visitId:     z.string(),
      icdCode:     z.string(),               // ICD-10 code e.g. "A09", "J06.9", "J18.9"
      description: z.string(),               // Human-readable name e.g. "Pneumonia, unspecified"
      notes:       z.string().default(""),   // Additional clinical notes
    }))
    .mutation(async ({ ctx, input }) => {
      await prisma.visit.findFirstOrThrow({ where: { id: input.visitId, tenantId: ctx.tenantId } });
      return prisma.diagnosis.create({
        data: { ...input, diagnosedBy: ctx.userId },
      });
    }),

  // ── closeVisit ─────────────────────────────────────────────────────────────
  // Marks a visit as completed and records the closure timestamp.
  // Used for visits that do not require a billing handoff
  // (e.g. emergency visits where billing is deferred, follow-up consultations).
  //
  // For standard OPD visits, prefer transferToBilling() which also notifies
  // the cashier and updates the queue ticket.
  closeVisit: tenantProcedure
    .input(z.object({ visitId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await prisma.visit.findFirstOrThrow({ where: { id: input.visitId, tenantId: ctx.tenantId } });
      return prisma.visit.update({
        where: { id: input.visitId },
        data:  { status: "completed", closedAt: new Date() },
      });
    }),

  // ── transferToBilling ──────────────────────────────────────────────────────
  // Transfers a completed consultation to the Billing Officer / Cashier.
  // Called by the Doctor at the end of a consultation.
  //
  // Actions performed:
  //   1. Update visit status to "ready_for_billing"
  //   2. Mark OPD ticket as "done" (removes from active queue display)
  //   3. Send in-app notification to cashier ("Patient ready for checkout")
  //
  // The cashier then uses billing.settlementQueue to see all patients waiting
  // and billing.collectCashierPayment to process payment and close the visit.
  transferToBilling: tenantProcedure
    .input(z.object({
      visitId: z.string(),
      notes:   z.string().optional(), // Optional handoff note from doctor to cashier
    }))
    .mutation(async ({ ctx, input }) => {
      const visit = await prisma.visit.findFirstOrThrow({
        where:   { id: input.visitId, tenantId: ctx.tenantId },
        include: { ticket: true, patient: true },
      });

      // Transition visit to billing queue
      const updatedVisit = await prisma.visit.update({
        where: { id: input.visitId },
        data:  { status: "ready_for_billing" },
      });

      // Mark queue ticket as done so the board stops showing this patient
      if (visit.ticket) {
        await prisma.oPDTicket.update({
          where: { id: visit.ticket.id },
          data:  { status: "done", completedAt: new Date() },
        });
      }

      // Notify cashier — in-app notification appears in their notification bell
      await prisma.notification.create({
        data: {
          tenantId: ctx.tenantId,
          // BUG (P10): userId "cashier" is a hardcoded literal string — not a real user ID.
          // Notifications sent with this userId will never appear in any staff member's
          // notification inbox because no user has the ID "cashier".
          // Fix: query UserTenantRole for role "Billing Officer" within this tenant and
          // notify all active billing staff, same pattern as lab.ts does for Lab Technicians:
          //   const billingStaff = await prisma.userTenantRole.findMany({
          //     where: { tenantId: ctx.tenantId, role: "Billing Officer", status: "active" }
          //   });
          //   await Promise.all(billingStaff.map((s) => prisma.notification.create({ data: { ...n, userId: s.userId } })));
          userId:   "cashier",                    // TODO (P10): replace with real Billing Officer userIds
          type:     "billing",
          title:    "Patient Transferred to Billing",
          body:     `${visit.patient.nameEn} (Ticket ${visit.ticket?.ticketNumber ?? "N/A"}) transferred for final checkout.`,
        },
      });

      return updatedVisit;
    }),

  // ── get ────────────────────────────────────────────────────────────────────
  // Returns the full detail of a single visit with all nested clinical data.
  // Used on the Doctor's consultation screen, the Billing Officer's invoice view,
  // and the patient portal visit history.
  //
  // Includes everything: vitals, notes, diagnoses, lab orders (with results),
  // prescriptions (with lines), invoice, referrals, and payment receipts.
  get: tenantProcedure
    .input(z.object({ visitId: z.string() }))
    .query(async ({ ctx, input }) => {
      const visit = await prisma.visit.findFirst({
        where:   { id: input.visitId, tenantId: ctx.tenantId },
        include: {
          patient:       true,
          ticket:        true,
          vitals:        { orderBy: { recordedAt: "desc" } },
          notes:         { orderBy: { createdAt: "desc" } },
          diagnoses:     true,
          labOrders:     { include: { result: true } },
          prescriptions: { include: { lines: true } },
          invoice:       { include: { lines: true } },
          referrals:     true,
          receipts:      { orderBy: { createdAt: "desc" } },
        },
      });

      if (!visit) throw new TRPCError({ code: "NOT_FOUND" });
      return visit;
    }),
});
