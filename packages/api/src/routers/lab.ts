// =============================================================================
// Nova HMS — Laboratory Router
// =============================================================================
//
// Manages the full lifecycle of laboratory investigations — from doctor order
// to result delivery and notification.
//
// Lab workflow:
//   1. Doctor orders a test (order)
//   2. Lab Technician sees it in the pending queue (queue)
//   3. Sample collected, status updated to "in-progress" (updateStatus)
//   4. Results analysed and entered (enterResult)
//   5. Doctor receives in-app notification (automatic)
//   6. Doctor reviews results on EMR screen (byVisit / completed)
//
// Payment integration:
//   Lab fees can be collected at two points:
//     a) Upfront at Reception/Cashier before sample collection (payOrder)
//     b) As part of the final visit settlement (billing.collectCashierPayment)
//   Dispense/processing is NOT blocked by payment status — lab work continues
//   regardless, but the fee is tracked and collected at billing.
//
// Fee resolution order (most specific wins):
//   1. HospitalServiceTariff for this tenant (if active tariff matches test name)
//   2. Hardcoded defaults (CBC: 150 ETB, Malaria RDT: 80 ETB, etc.)
//   3. Fallback default: 120 ETB
//
// Priority system:
//   "urgent" orders:
//     - Sorted to the top of the lab queue
//     - Send immediate in-app notification to all active Lab Technicians
//     - Displayed with a visual warning flag in the UI
//
// Result flags:
//   "normal"   — Within reference range
//   "high"     — Above upper reference limit
//   "low"      — Below lower reference limit
//   "critical" — Critically abnormal — triggers urgent notification to ordering doctor
//
// Common tests in Ethiopian hospitals:
//   CBC (Complete Blood Count)   — 150 ETB
//   Malaria RDT                  — 80 ETB  (high volume, endemic in most regions)
//   Fasting Blood Sugar          — 90 ETB
//   Urinalysis                   — 70 ETB
//   Lipid Panel                  — 220 ETB
//   Liver Function Tests (LFTs)  — 250 ETB
//   Renal Function Test (RFT)    — 200 ETB
//   Stool Examination            — 60 ETB
// =============================================================================

import prisma from "@my-better-t-app/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, tenantProcedure } from "../index";

export const labRouter = router({

  // ── order ──────────────────────────────────────────────────────────────────
  // Creates a new lab test order for a patient visit.
  // Called by the Doctor during consultation.
  //
  // Price resolution:
  //   1. If price provided explicitly → use it
  //   2. Else → query HospitalServiceTariff for matching test name
  //   3. Else → look up hardcoded Ethiopian hospital defaults
  //   4. Else → 120 ETB fallback
  //
  // Payment status:
  //   CBHI patient    → "cbhi_covered" (EHIA will reimburse)
  //   Emergency/urgent → "emergency_exempt" (deferred billing)
  //   Otherwise       → "unpaid" (must pay at cashier before/after visit)
  //
  // After creating the order, all active Lab Technicians for this tenant
  // receive an in-app notification. Urgent orders include "URGENT:" prefix.
  order: tenantProcedure
    .input(z.object({
      visitId:   z.string(),
      testName:  z.string().min(1),                          // e.g. "CBC", "Malaria RDT"
      price:     z.number().optional(),                       // Override price (optional — auto-resolved otherwise)
      priority:  z.enum(["routine", "urgent"]).default("routine"),
      indication: z.string().default(""),                    // Clinical reason for ordering
    }))
    .mutation(async ({ ctx, input }) => {
      const visit = await prisma.visit.findFirstOrThrow({
        where:   { id: input.visitId, tenantId: ctx.tenantId },
        include: { patient: true },
      });

      // ── Price resolution ───────────────────────────────────────────────────
      let price = input.price;
      if (price === undefined) {
        // Try to find a tariff matching this test name in the tenant's fee schedule
        const tariff = await prisma.hospitalServiceTariff.findFirst({
          where: {
            tenantId: ctx.tenantId,
            isActive: true,
            OR: [
              { name: input.testName },
              { name: { contains: input.testName } },
            ],
          },
        });
        if (tariff) {
          price = tariff.price;
        } else {
          // Hardcoded defaults based on typical Ethiopian public hospital rates (ETB)
          const defaultPrices: Record<string, number> = {
            "CBC (Complete Blood Count)":          150,
            "Malaria RDT":                          80,
            "Fasting Blood Sugar":                  90,
            "Urinalysis":                           70,
            "Lipid Panel":                         220,
            "Liver Function Tests":                250,
            "Renal Function Test":                 200,
            "Stool Examination":                    60,
          };
          price = defaultPrices[input.testName] ?? 120; // 120 ETB ultimate fallback
        }
      }

      // ── Payment status resolution ──────────────────────────────────────────
      let paymentStatus = "unpaid";
      if (visit.patient.cbhiStatus) {
        paymentStatus = "cbhi_covered";           // CBHI members pay nothing directly
      } else if (visit.type === "emergency" || input.priority === "urgent") {
        paymentStatus = "emergency_exempt";        // Emergency/urgent tests billed later
      }

      const order = await prisma.labOrder.create({
        data: {
          visitId:   input.visitId,
          testName:  input.testName,
          priority:  input.priority,
          indication: input.indication,
          price,
          paymentStatus,
          tenantId:  ctx.tenantId,
          orderedBy: ctx.userId,
        },
      });

      // ── Notify Lab Technicians ─────────────────────────────────────────────
      // All active Lab Technicians in this hospital receive an in-app notification.
      // Urgent orders include a prefix to draw immediate attention.
      const labStaff = await prisma.userTenantRole.findMany({
        where: { tenantId: ctx.tenantId, role: "Lab Technician", status: "active" },
      });
      await Promise.all(labStaff.map((s) =>
        prisma.notification.create({
          data: {
            tenantId: ctx.tenantId,
            userId:   s.userId,
            type:     "in-app",
            title:    "New lab order",
            body:     `${input.priority === "urgent" ? "URGENT: " : ""}${input.testName} ordered`,
          },
        })
      ));

      return order;
    }),

  // ── queue ──────────────────────────────────────────────────────────────────
  // Returns all pending and in-progress lab orders for this tenant.
  // This is the Lab Technician's primary work screen.
  //
  // Ordering:
  //   "urgent" orders sort first (priority DESC in Prisma: "urgent" > "routine")
  //   Within the same priority, oldest orders first (FCFS)
  queue: tenantProcedure.query(async ({ ctx }) => {
    return prisma.labOrder.findMany({
      where:   { tenantId: ctx.tenantId, status: { in: ["pending", "in-progress"] } },
      include: {
        visit: {
          include: {
            patient: { select: { nameEn: true, nameAm: true, healthId: true } },
          },
        },
      },
      orderBy: [{ priority: "desc" }, { orderedAt: "asc" }], // Urgent first, then FCFS
    });
  }),

  // ── completed ─────────────────────────────────────────────────────────────
  // Returns the last 50 completed lab orders with results.
  // Used by the Doctor to review recent results and by the Lab Tech for reference.
  completed: tenantProcedure.query(async ({ ctx }) => {
    return prisma.labOrder.findMany({
      where:   { tenantId: ctx.tenantId, status: "completed" },
      include: {
        result: true,
        visit:  {
          include: {
            patient: { select: { id: true, nameEn: true, nameAm: true, healthId: true } },
          },
        },
      },
      orderBy: { orderedAt: "desc" },
      take:    50,
    });
  }),

  // ── updateStatus ──────────────────────────────────────────────────────────
  // Moves a lab order through its workflow states.
  // Called by the Lab Technician as they process samples.
  //
  //   pending     → in-progress  (sample collected, analysis started)
  //   in-progress → completed    (handled by enterResult, not this mutation)
  //   any         → cancelled    (sample rejected, patient left, etc.)
  //
  // Guard: completed orders cannot be changed — results are immutable once entered.
  updateStatus: tenantProcedure
    .input(z.object({
      orderId: z.string(),
      status:  z.enum(["pending", "in-progress", "completed", "cancelled"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const order = await prisma.labOrder.findFirstOrThrow({
        where: { id: input.orderId, tenantId: ctx.tenantId },
      });
      if (order.status === "completed") {
        // Completed lab results are medical records — they must not be altered
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot change status of completed order" });
      }
      return prisma.labOrder.update({ where: { id: input.orderId }, data: { status: input.status } });
    }),

  // ── enterResult ────────────────────────────────────────────────────────────
  // Records the results for a completed lab test.
  // Called by the Lab Technician after analysing the sample.
  //
  // results array — each element is one measured parameter:
  //   {
  //     name:     "Haemoglobin",
  //     value:    "9.2",
  //     unit:     "g/dL",
  //     refRange: "12.0-16.0",
  //     flag:     "low"          // normal | high | low | critical
  //   }
  //
  // Critical flag logic:
  //   If ANY result has flag = "critical", the ordering doctor receives an
  //   urgent notification with a ⚠ prefix. Critical values require immediate
  //   clinical action (e.g. Hb < 6 g/dL, blood glucose > 33 mmol/L).
  //
  // interpretation — Free-text clinical summary written by the Lab Technician,
  //   e.g. "Moderate normocytic anaemia. Recommend iron studies and peripheral smear."
  enterResult: tenantProcedure
    .input(z.object({
      orderId:  z.string(),
      results:  z.array(z.object({
        name:     z.string(),
        value:    z.string(),
        unit:     z.string(),
        refRange: z.string(),
        flag:     z.enum(["normal", "high", "low", "critical"]).default("normal"),
      })),
      interpretation: z.string().default(""),
    }))
    .mutation(async ({ ctx, input }) => {
      const order = await prisma.labOrder.findFirstOrThrow({
        where: { id: input.orderId, tenantId: ctx.tenantId },
      });

      // Create the result record with results serialised as JSON string
      const result = await prisma.labResult.create({
        data: {
          labOrderId:     input.orderId,
          enteredBy:      ctx.userId,
          resultsJson:    JSON.stringify(input.results),
          interpretation: input.interpretation,
        },
      });

      // Mark the order as completed
      await prisma.labOrder.update({ where: { id: input.orderId }, data: { status: "completed" } });

      // Notify ordering doctor — critical values get a ⚠ urgent prefix
      const hasCritical = input.results.some((r) => r.flag === "critical");
      await prisma.notification.create({
        data: {
          tenantId: ctx.tenantId,
          userId:   order.orderedBy,           // The doctor who placed this order
          type:     "in-app",
          title:    hasCritical ? "⚠ CRITICAL lab result" : "Lab result ready",
          body:     `Result for ${order.testName} is ready`,
        },
      });

      return result;
    }),

  // ── payOrder ───────────────────────────────────────────────────────────────
  // Collects payment for an individual lab test at the reception or cashier.
  // Idempotent — returns the order unchanged if already paid.
  //
  // This is the individual payment path. For bulk payment of all visit fees
  // in one transaction, use billing.collectCashierPayment() instead.
  payOrder: tenantProcedure
    .input(z.object({
      orderId:       z.string(),
      paymentMethod: z.enum(["cash", "telebirr", "cbe_birr", "card"]),
      reference:     z.string().default(""),
    }))
    .mutation(async ({ ctx, input }) => {
      const order = await prisma.labOrder.findFirstOrThrow({
        where:   { id: input.orderId, tenantId: ctx.tenantId },
        include: { visit: { include: { patient: true } } },
      });

      if (order.paymentStatus === "paid") return order; // Idempotent

      // PRODUCTION BLOCKER (P6 — Race Condition): COUNT+1 is not safe under concurrent cashiers.
      // Fix with a PostgreSQL sequence before production deployment — see billing.ts for details.
      const rcCount = await prisma.paymentReceipt.count({ where: { tenantId: ctx.tenantId } });
      const receiptNumber = `RCP-${new Date().getFullYear()}-${String(rcCount + 1).padStart(5, "0")}`;

      await prisma.paymentReceipt.create({
        data: {
          tenantId:      ctx.tenantId,
          receiptNumber,
          patientId:     order.visit.patientId,
          visitId:       order.visitId,
          category:      "lab",
          amount:        order.price,
          paymentMethod: input.paymentMethod,
          collectedBy:   ctx.userId ?? "Cashier",
          reference:     input.reference,
          notes:         `Lab Test: ${order.testName}`,
        },
      });

      return prisma.labOrder.update({
        where: { id: order.id },
        data:  {
          paymentStatus: "paid",
          paidAt:        new Date(),
          receiptNumber,
          paymentMethod: input.paymentMethod,
        },
      });
    }),

  // ── byVisit ────────────────────────────────────────────────────────────────
  // Returns all lab orders and their results for a specific visit.
  // Used on the Doctor's EMR screen, the Patient Portal results view,
  // and the billing payables breakdown.
  byVisit: tenantProcedure
    .input(z.object({ visitId: z.string() }))
    .query(async ({ ctx, input }) => {
      return prisma.labOrder.findMany({
        where:   { visitId: input.visitId, tenantId: ctx.tenantId },
        include: { result: true },
        orderBy: { orderedAt: "desc" },
      });
    }),
});
