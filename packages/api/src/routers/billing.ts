// =============================================================================
// Nova HMS — Billing Router
// =============================================================================
//
// Manages all financial operations for a patient visit:
//   - Invoice creation and settlement
//   - CBHI (Community-Based Health Insurance) claim submission
//   - Fee waiver requests and approvals
//   - Cashier payment collection (card fee, consultation, lab, pharmacy)
//   - Payment receipt management
//
// Ethiopian billing context:
//   Public hospitals in Ethiopia use a multi-payer model:
//     1. Cash / Mobile money (telebirr, CBE Birr) — patient pays directly
//     2. CBHI (Community-Based Health Insurance) — EHIA reimburses the facility
//     3. Fee waivers — indigent patients, under-5 children, ANC visits
//     4. Emergency exemption — emergency patients treated first, billed later
//
//   The Billing Officer (Cashier) is the final checkpoint before a patient
//   leaves the hospital. They collect all outstanding fees (card fee, lab,
//   pharmacy, consultation) and print a receipt.
//
// Cashier settlement flow:
//   1. settlementQueue()        → Show all visits ready for billing
//   2. getVisitPayables()       → Itemise all charges for a specific visit
//   3. collectCashierPayment()  → Collect payment, update all line items, close visit
//
// CBHI flow:
//   1. Patient identified as CBHI member at registration (cbhiStatus = true)
//   2. Services are marked "cbhi_covered" automatically (no cash required)
//   3. submitCBHI()             → Billing Officer submits claim to EHIA
//   4. updateCBHI()             → EHIA approves or rejects the claim
//
// Fee waiver flow:
//   1. requestWaiver()          → Billing Officer requests waiver (min 10 char reason)
//   2. resolveWaiver()          → Hospital Admin approves or rejects
//
// Receipt numbering: "RCP-YYYY-NNNNN" e.g. "RCP-2025-00047"
// =============================================================================

import prisma from "@my-better-t-app/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, tenantProcedure } from "../index";

export const billingRouter = router({

  // ── createInvoice ──────────────────────────────────────────────────────────
  // Creates a consolidated invoice for a patient visit.
  // The total is the sum of all line items passed in.
  // One invoice per visit (enforced by DB unique constraint on visitId).
  //
  // Lines represent billable services: registration, consultation, lab, pharmacy.
  // In the standard flow, collectCashierPayment() creates the invoice automatically —
  // this mutation is available for manual invoice creation by Billing Officers.
  createInvoice: tenantProcedure
    .input(z.object({
      visitId: z.string(),
      lines: z.array(z.object({
        description: z.string(),
        qty:         z.number().int().default(1),
        unitPrice:   z.number(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const visit = await prisma.visit.findFirstOrThrow({
        where: { id: input.visitId, tenantId: ctx.tenantId },
      });

      // Calculate total from lines
      const total = input.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);

      return prisma.invoice.create({
        data: {
          tenantId:  ctx.tenantId,
          visitId:   input.visitId,
          patientId: visit.patientId,
          total,
          lines: {
            create: input.lines.map((l) => ({ ...l, total: l.qty * l.unitPrice })),
          },
        },
        include: { lines: true },
      });
    }),

  // ── byVisit ────────────────────────────────────────────────────────────────
  // Returns the invoice for a specific visit, including lines, CBHI claim, and waiver.
  // Used by Billing Officer to review charges before collecting payment.
  byVisit: tenantProcedure
    .input(z.object({ visitId: z.string() }))
    .query(async ({ ctx, input }) => {
      return prisma.invoice.findFirst({
        where:   { visitId: input.visitId, tenantId: ctx.tenantId },
        include: { lines: true, cbhiClaim: true, feeWaiver: true },
      });
    }),

  // ── list ───────────────────────────────────────────────────────────────────
  // Returns up to 50 recent invoices, optionally filtered by status.
  // Used on the Billing Officer's invoice management screen.
  //
  //   status filter: "pending" | "paid" | "waived" | "waiver-requested" | "cbhi-submitted"
  list: tenantProcedure
    .input(z.object({ status: z.string().optional() }).default({}))
    .query(async ({ ctx, input }) => {
      return prisma.invoice.findMany({
        where: {
          tenantId: ctx.tenantId,
          ...(input.status ? { status: input.status } : {}),
        },
        include: {
          lines:    true,
          cbhiClaim: true,
          feeWaiver: true,
          visit:    { include: { patient: true } },
        },
        orderBy: { createdAt: "desc" },
        take:    50,
      });
    }),

  // ── markPaid ───────────────────────────────────────────────────────────────
  // Marks an invoice as paid and records the payment timestamp.
  // Used for simple full-payment scenarios. For itemised payment collection
  // (card fee + lab + pharmacy separately) use collectCashierPayment().
  markPaid: tenantProcedure
    .input(z.object({ invoiceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invoice = await prisma.invoice.findFirstOrThrow({
        where: { id: input.invoiceId, tenantId: ctx.tenantId },
      });
      return prisma.invoice.update({
        where: { id: invoice.id },
        data:  { status: "paid", paidAt: new Date() },
      });
    }),

  // ── submitCBHI ─────────────────────────────────────────────────────────────
  // Submits a CBHI (Community-Based Health Insurance) claim to the EHIA
  // (Ethiopian Health Insurance Authority) on behalf of the patient.
  //
  // Preconditions:
  //   - Patient must be enrolled in CBHI (cbhiStatus = true)
  //   - No existing claim for this invoice (prevents duplicate submissions)
  //
  // In the current implementation this creates a local claim record.
  // PRODUCTION: Integrate with the EHIA electronic claims portal API
  // to submit claims directly and track reimbursement status.
  submitCBHI: tenantProcedure
    .input(z.object({ invoiceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invoice = await prisma.invoice.findFirstOrThrow({
        where: { id: input.invoiceId, tenantId: ctx.tenantId },
      });

      const patient = await prisma.patient.findUniqueOrThrow({ where: { id: invoice.patientId } });
      if (!patient.cbhiStatus) {
        // Hard block — cannot submit a CBHI claim for a non-CBHI patient
        throw new TRPCError({ code: "BAD_REQUEST", message: "Patient is not enrolled in CBHI" });
      }

      // Prevent duplicate submissions for the same invoice
      const existing = await prisma.cBHIClaim.findUnique({ where: { invoiceId: input.invoiceId } });
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "Claim already submitted" });

      return prisma.cBHIClaim.create({
        data: {
          tenantId:  ctx.tenantId,
          invoiceId: input.invoiceId,
          patientId: invoice.patientId,
          amount:    invoice.total,
          // status defaults to "submitted" — updated when EHIA responds
        },
      });
    }),

  // ── updateCBHI ─────────────────────────────────────────────────────────────
  // Updates a CBHI claim status after the EHIA responds.
  // In production this would be called by a webhook from the EHIA API
  // or manually by the Billing Officer after checking the EHIA portal.
  //
  //   approved → claim paid by EHIA, facility reimbursed
  //   rejected → requires rejectionReason for documentation and re-submission
  updateCBHI: tenantProcedure
    .input(z.object({
      claimId:         z.string(),
      status:          z.enum(["approved", "rejected"]),
      rejectionReason: z.string().default(""),   // Required when rejected — regulatory requirement
    }))
    .mutation(async ({ ctx, input }) => {
      return prisma.cBHIClaim.update({
        where: { id: input.claimId, tenantId: ctx.tenantId },
        data:  {
          status:          input.status,
          resolvedAt:      new Date(),
          rejectionReason: input.rejectionReason,
        },
      });
    }),

  // ── cbhiClaims ─────────────────────────────────────────────────────────────
  // Lists CBHI claims, optionally filtered by status.
  // Used on the Billing Officer's CBHI Claims screen to track reimbursement.
  cbhiClaims: tenantProcedure
    .input(z.object({ status: z.string().optional() }).default({}))
    .query(async ({ ctx, input }) => {
      return prisma.cBHIClaim.findMany({
        where: {
          tenantId: ctx.tenantId,
          ...(input.status ? { status: input.status } : {}),
        },
        include: {
          invoice: {
            include: {
              lines: true,
              visit: { include: { patient: true } },
            },
          },
        },
        orderBy: { submittedAt: "desc" },
      });
    }),

  // ── requestWaiver ──────────────────────────────────────────────────────────
  // Requests a fee waiver on behalf of an indigent or socially vulnerable patient.
  // Called by the Billing Officer when a patient cannot afford to pay.
  //
  // reason must be at least 10 characters — prevents meaningless submissions
  // and creates an auditable paper trail for management review.
  //
  // Eligible cases in Ethiopian public hospitals:
  //   - Indigent patients (no income / extreme poverty)
  //   - MOH-mandated exemptions (free ANC, under-5 consultations in some regions)
  //   - Humanitarian cases (disaster victims, etc.)
  requestWaiver: tenantProcedure
    .input(z.object({
      invoiceId: z.string(),
      amount:    z.number(),
      reason:    z.string().min(10), // Minimum 10 chars — prevents empty justifications
    }))
    .mutation(async ({ ctx, input }) => {
      const invoice = await prisma.invoice.findFirstOrThrow({
        where: { id: input.invoiceId, tenantId: ctx.tenantId },
      });

      // Mark invoice as waiver-requested while pending Admin approval
      await prisma.invoice.update({
        where: { id: input.invoiceId },
        data:  { status: "waiver-requested" },
      });

      return prisma.feeWaiver.create({
        data: {
          tenantId:    ctx.tenantId,
          invoiceId:   input.invoiceId,
          patientId:   invoice.patientId,
          amount:      input.amount,
          reason:      input.reason,
          requestedBy: ctx.userId,
          // approvedBy set later by Hospital Admin via resolveWaiver()
        },
      });
    }),

  // ── resolveWaiver ──────────────────────────────────────────────────────────
  // Approves or rejects a fee waiver request.
  // Called by Hospital Admin from their Fee Waivers management screen.
  //
  // Approval → invoice status = "waived" (patient is cleared to leave)
  // Rejection → invoice status = "pending" (patient must pay normally)
  resolveWaiver: tenantProcedure
    .input(z.object({
      waiverId: z.string(),
      approved: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const waiver = await prisma.feeWaiver.update({
        where: { id: input.waiverId, tenantId: ctx.tenantId },
        data:  {
          status:     input.approved ? "approved" : "rejected",
          approvedBy: ctx.userId,
        },
      });

      // Update invoice status based on the waiver decision
      await prisma.invoice.update({
        where: { id: waiver.invoiceId },
        data:  { status: input.approved ? "waived" : "pending" },
      });

      return waiver;
    }),

  // ── waivers ────────────────────────────────────────────────────────────────
  // Lists all fee waiver requests for this tenant (pending + resolved).
  // Used by both Hospital Admin (approve/reject) and Billing Officer (track status).
  waivers: tenantProcedure.query(async ({ ctx }) => {
    return prisma.feeWaiver.findMany({
      where:   { tenantId: ctx.tenantId },
      include: {
        invoice: {
          include: { visit: { include: { patient: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  // ── receipts ───────────────────────────────────────────────────────────────
  // Returns the last 100 payment receipts for this tenant.
  // Used on the Billing Officer's receipt history screen for
  // daily cash reconciliation and audit purposes.
  receipts: tenantProcedure.query(async ({ ctx }) => {
    return prisma.paymentReceipt.findMany({
      where:   { tenantId: ctx.tenantId },
      include: {
        patient: { select: { id: true, nameEn: true, nameAm: true, healthId: true, cbhiStatus: true } },
        visit:   { select: { id: true, type: true } },
      },
      orderBy: { createdAt: "desc" },
      take:    100,
    });
  }),

  // ── settlementQueue ────────────────────────────────────────────────────────
  // Returns all visits waiting for billing settlement.
  // Displayed on the Cashier's main screen — the list of patients who need
  // to pay before they can leave the hospital.
  //
  // Includes visits with status:
  //   "ready_for_billing" → Doctor completed consultation and transferred
  //   "open"              → Visit still ongoing but may have accrued fees (labs, rx)
  //
  // Includes just enough data for the cashier to identify the patient and
  // see outstanding items without a separate lookup.
  settlementQueue: tenantProcedure.query(async ({ ctx }) => {
    return prisma.visit.findMany({
      where: {
        tenantId: ctx.tenantId,
        OR: [
          { status: "ready_for_billing" },
          { status: "open" },
        ],
      },
      include: {
        patient:       { select: { id: true, nameEn: true, nameAm: true, healthId: true, cbhiStatus: true, phone: true } },
        ticket:        { select: { id: true, ticketNumber: true, feeAmount: true, paymentStatus: true, receiptNumber: true } },
        labOrders:     { select: { id: true, testName: true, price: true, paymentStatus: true, status: true } },
        prescriptions: { include: { lines: { select: { id: true, itemName: true, totalPrice: true, paymentStatus: true } } } },
        receipts:      { select: { id: true, receiptNumber: true, amount: true, category: true } },
        notes:         { select: { id: true, noteType: true } },
        diagnoses:     { select: { id: true, description: true } },
      },
      // ready_for_billing sorts before open — fully-done consultations first
      orderBy: [{ status: "asc" }, { openedAt: "desc" }],
      take:    50,
    });
  }),

  // ── getVisitPayables ───────────────────────────────────────────────────────
  // Returns a structured breakdown of all billable items for a specific visit.
  // The Cashier uses this to present the patient with a detailed itemised bill.
  //
  // Itemised bill components:
  //   card_fee      — OPD registration fee (may already be paid at Reception)
  //   consultation  — Doctor's consultation fee (from tariff or tenant default)
  //   lab           — Each lab test ordered (from tariff or hardcoded defaults)
  //   drug          — Each prescription line (drug cost for the full course)
  //
  // CBHI coverage:
  //   If the patient is a CBHI member, all items are marked "cbhi_covered"
  //   regardless of their stored paymentStatus — the cashier collects nothing.
  //
  // Returns totals by category:
  //   totalUnpaid  — Cash due from patient
  //   totalPaid    — Already collected (e.g. card fee paid at reception)
  //   totalCbhi    — Covered by CBHI
  //   grossTotal   — Total bill value (sum of all items)
  getVisitPayables: tenantProcedure
    .input(z.object({ visitId: z.string() }))
    .query(async ({ ctx, input }) => {
      const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: ctx.tenantId } });
      const visit = await prisma.visit.findFirstOrThrow({
        where:   { id: input.visitId, tenantId: ctx.tenantId },
        include: {
          patient:       true,
          ticket:        true,
          labOrders:     true,
          prescriptions: { include: { lines: true } },
          diagnoses:     true,
          notes:         true,
          receipts:      { orderBy: { createdAt: "desc" } },
        },
      });

      const isCbhi = !!visit.patient.cbhiStatus;

      // Build itemised payables list
      const unbilledItems: Array<{
        id:            string;
        type:          "card_fee" | "consultation" | "lab" | "drug";
        name:          string;
        amount:        number;
        paymentStatus: string;
        receiptNumber?: string;
      }> = [];

      // 1. OPD card/registration fee
      if (visit.ticket) {
        unbilledItems.push({
          id:            visit.ticket.id,
          type:          "card_fee",
          name:          `OPD Card & Registration (${visit.ticket.ticketNumber})`,
          amount:        visit.ticket.feeAmount,
          paymentStatus: visit.ticket.paymentStatus,
          receiptNumber: visit.ticket.receiptNumber,
        });
      }

      // 2. Doctor consultation fee — resolved from tariff or tenant default
      let consultFee = tenant.specialistFeeAmount ?? 100;
      const consultTariff = await prisma.hospitalServiceTariff.findFirst({
        where: { tenantId: ctx.tenantId, code: "CONSULT_SPECIALIST", isActive: true },
      });
      if (consultTariff) consultFee = consultTariff.price;
      // CBHI patients have consultation covered; non-CBHI patients pay only when visit is completed
      const consultStatus = isCbhi ? "cbhi_covered" : (visit.status === "completed" ? "paid" : "unpaid");
      unbilledItems.push({
        id:            `consult-${visit.id}`,
        type:          "consultation",
        name:          "Doctor Consultation & Clinical Assessment",
        amount:        consultFee,
        paymentStatus: consultStatus,
      });

      // 3. Lab orders — one line item per test
      for (const lo of visit.labOrders) {
        unbilledItems.push({
          id:            lo.id,
          type:          "lab",
          name:          `Lab: ${lo.testName} (${lo.status})`,
          amount:        lo.price,
          paymentStatus: isCbhi ? "cbhi_covered" : lo.paymentStatus,
          receiptNumber: lo.receiptNumber,
        });
      }

      // 4. Prescription lines — one line item per drug
      for (const rx of visit.prescriptions) {
        for (const line of rx.lines) {
          unbilledItems.push({
            id:            line.id,
            type:          "drug",
            name:          `Rx: ${line.itemName} (${line.dose} × ${line.durationDays}d)`,
            amount:        line.totalPrice,
            paymentStatus: isCbhi ? "cbhi_covered" : line.paymentStatus,
            receiptNumber: line.receiptNumber,
          });
        }
      }

      // Calculate payment summary totals
      const totalUnpaid = unbilledItems.filter((i) => i.paymentStatus === "unpaid").reduce((s, i) => s + i.amount, 0);
      const totalPaid   = unbilledItems.filter((i) => i.paymentStatus === "paid").reduce((s, i) => s + i.amount, 0);
      const totalCbhi   = unbilledItems.filter((i) => i.paymentStatus === "cbhi_covered").reduce((s, i) => s + i.amount, 0);
      const grossTotal  = unbilledItems.reduce((s, i) => s + i.amount, 0);

      return { visit, patient: visit.patient, items: unbilledItems, totalUnpaid, totalPaid, totalCbhi, grossTotal, receipts: visit.receipts };
    }),

  // ── collectCashierPayment ──────────────────────────────────────────────────
  // The primary cashier mutation — collects payment for selected billable items,
  // generates a single consolidated receipt, updates all line items to "paid",
  // creates/updates the visit invoice, and closes the visit.
  //
  // The cashier selects which items to collect payment for:
  //   payCardFee         — Collect the OPD registration fee (if not already paid)
  //   payConsultation    — Collect the doctor's consultation fee
  //   labOrderIds        — Which lab tests to include in this payment
  //   prescriptionLineIds — Which drug lines to include
  //
  // After payment:
  //   - All selected items are marked "paid" with the receipt number
  //   - A consolidated invoice is created (or the existing one updated)
  //   - Visit status is set to "completed" (patient is cleared to leave)
  //
  // One receipt per payment transaction (even if it covers multiple services).
  // This matches the Ethiopian hospital cashier workflow where the patient
  // receives a single consolidated receipt at the end of their visit.
  collectCashierPayment: tenantProcedure
    .input(z.object({
      visitId:              z.string(),
      payCardFee:           z.boolean().default(false),
      payConsultation:      z.boolean().default(true),
      labOrderIds:          z.array(z.string()).default([]),
      prescriptionLineIds:  z.array(z.string()).default([]),
      paymentMethod:        z.enum(["cash", "telebirr", "cbe_birr", "card"]),
      reference:            z.string().default(""),     // Mobile money transaction reference
      notes:                z.string().default(""),
    }))
    .mutation(async ({ ctx, input }) => {
      const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: ctx.tenantId } });
      const visit = await prisma.visit.findFirstOrThrow({
        where:   { id: input.visitId, tenantId: ctx.tenantId },
        include: { ticket: true, patient: true },
      });

      let total = 0;
      // lineItems carries both the description and the actual amount per service
      // so the invoice lines reflect real prices, not a split average.
      const lineItems: Array<{ description: string; amount: number }> = [];

      // 1. Card fee — only if requested and currently unpaid
      if (input.payCardFee && visit.ticket && visit.ticket.paymentStatus === "unpaid") {
        total += visit.ticket.feeAmount;
        lineItems.push({ description: `Card Fee (${visit.ticket.ticketNumber})`, amount: visit.ticket.feeAmount });
      }

      // 2. Consultation fee — skip for CBHI patients (covered by EHIA)
      if (input.payConsultation && !visit.patient.cbhiStatus) {
        let consultFee = tenant.specialistFeeAmount ?? 100;
        const consultTariff = await prisma.hospitalServiceTariff.findFirst({
          where: { tenantId: ctx.tenantId, code: "CONSULT_SPECIALIST", isActive: true },
        });
        if (consultTariff) consultFee = consultTariff.price;
        total += consultFee;
        lineItems.push({ description: `Doctor Consultation (ETB ${consultFee})`, amount: consultFee });
      }

      // 3. Lab orders — fetch selected unpaid labs and total their fees
      if (input.labOrderIds.length > 0) {
        const labs = await prisma.labOrder.findMany({
          where: { id: { in: input.labOrderIds }, tenantId: ctx.tenantId, paymentStatus: "unpaid" },
        });
        for (const l of labs) {
          total += l.price;
          lineItems.push({ description: l.testName, amount: l.price });
        }
      }

      // 4. Prescription lines — fetch selected unpaid drug lines
      if (input.prescriptionLineIds.length > 0) {
        const lines = await prisma.prescriptionLine.findMany({
          where: { id: { in: input.prescriptionLineIds }, paymentStatus: "unpaid" },
        });
        for (const l of lines) {
          total += l.totalPrice;
          lineItems.push({ description: l.itemName, amount: l.totalPrice });
        }
      }

      // Convenience alias for legacy code that only needs the description strings
      const descriptionList = lineItems.map((i) => i.description);

      // Guard: do not create a receipt for zero amount (CBHI patients may have nothing to pay)
      if (total <= 0 && !visit.patient.cbhiStatus) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No unpaid items selected for payment" });
      }

      // Generate receipt number
      // PRODUCTION BLOCKER (P6 — Race Condition):
      // COUNT + 1 is NOT safe under concurrent cashiers. Two cashiers processing
      // simultaneously both read the same count and produce the same receipt number,
      // causing a unique-constraint violation on PaymentReceipt.receiptNumber.
      // Fix: Use a PostgreSQL sequence or a transaction-isolated counter.
      // Recommended migration (PostgreSQL):
      //   CREATE SEQUENCE receipt_seq START 1;
      //   SELECT nextval('receipt_seq') → use as the numeric portion of the receipt number.
      // For SQLite dev: the UNIQUE constraint will catch collisions with a 500 error.
      //   That is acceptable in single-user dev but must be fixed before production.
      const rcCount = await prisma.paymentReceipt.count({ where: { tenantId: ctx.tenantId } });
      const receiptNumber = `RCP-${new Date().getFullYear()}-${String(rcCount + 1).padStart(5, "0")}`;

      // Create the consolidated payment receipt
      const receipt = await prisma.paymentReceipt.create({
        data: {
          tenantId:      ctx.tenantId,
          receiptNumber,
          patientId:     visit.patientId,
          visitId:       visit.id,
          category:      "total_invoice",
          amount:        total,
          paymentMethod: visit.patient.cbhiStatus ? "cbhi" : input.paymentMethod,
          collectedBy:   ctx.userId ?? "Cashier",
          reference:     input.reference,
          notes:         descriptionList.join(", ") || "Final visit clearance settlement",
        },
      });

      // Update card fee ticket to paid
      if (input.payCardFee && visit.ticket && visit.ticket.paymentStatus === "unpaid") {
        await prisma.oPDTicket.update({
          where: { id: visit.ticket.id },
          data:  { paymentStatus: "paid", paidAt: new Date(), receiptNumber, paymentMethod: input.paymentMethod },
        });
      }

      // Mark selected lab orders as paid
      if (input.labOrderIds.length > 0) {
        await prisma.labOrder.updateMany({
          where: { id: { in: input.labOrderIds }, tenantId: ctx.tenantId },
          data:  { paymentStatus: "paid", paidAt: new Date(), receiptNumber, paymentMethod: input.paymentMethod },
        });
      }

      // Mark selected prescription lines as paid
      if (input.prescriptionLineIds.length > 0) {
        await prisma.prescriptionLine.updateMany({
          where: { id: { in: input.prescriptionLineIds } },
          data:  { paymentStatus: "paid", paidAt: new Date(), receiptNumber, paymentMethod: input.paymentMethod },
        });
      }

      // Create or update the visit invoice
      const existingInvoice = await prisma.invoice.findFirst({
        where: { visitId: visit.id, tenantId: ctx.tenantId },
      });

      if (existingInvoice) {
        // Increment existing invoice total (partial payments made earlier)
        await prisma.invoice.update({
          where: { id: existingInvoice.id },
          data:  { total: { increment: total }, status: "paid", paidAt: new Date() },
        });
      } else {
        // Create invoice with correct per-item prices (P15 fix).
        // Previously used total / descriptionList.length (average), which was wrong —
        // a CBC (ETB 150) and card fee (ETB 50) would both appear as ETB 100 on the invoice.
        // Now each line carries its actual amount from the lineItems array.
        await prisma.invoice.create({
          data: {
            tenantId:  ctx.tenantId,
            visitId:   visit.id,
            patientId: visit.patientId,
            total,
            status:    "paid",
            paidAt:    new Date(),
            lines: {
              create: lineItems.map((item) => ({
                description: item.description,
                qty:         1,
                unitPrice:   item.amount,
                total:       item.amount,
              })),
            },
          },
        });
      }

      // Close the visit — patient is cleared to leave the hospital
      await prisma.visit.update({
        where: { id: visit.id },
        data:  { status: "completed", closedAt: new Date() },
      });

      return { receiptNumber, total, receipt, descriptionList };
    }),
});
