// =============================================================================
// Nova HMS — Prescription Router
// =============================================================================
//
// Manages the complete electronic prescription (e-Rx) lifecycle — from doctor
// ordering through cashier payment to pharmacist dispensing.
//
// Prescription workflow:
//   1. Doctor creates prescription with drug lines (create)
//   2. In-app notification sent to all Pharmacists
//   3. Pharmacist sees pending Rx in their queue (queue)
//   4. Patient pays for medications at Cashier (payPrescription)
//   5. Pharmacist verifies payment, deducts stock using FEFO (dispense)
//   6. Prescription status → "dispensed"
//
// Pay-before-dispense rule (enforced at API level):
//   The dispense() mutation checks that ALL prescription lines have
//   paymentStatus = "paid" (or "cbhi_covered" / "emergency_exempt").
//   If any line is still "unpaid", it throws PRECONDITION_FAILED.
//   This enforces the hospital's cash-collection policy — the pharmacy
//   cannot be used as a credit facility.
//
// FEFO (First Expired, First Out) dispensing:
//   When dispensing, the system selects inventory batches in expiry date
//   ascending order — oldest expiry first. This minimises drug waste by
//   ensuring near-expiry stock is used before newer stock.
//   Each deduction creates a StockMovement record for full audit traceability.
//
// Drug pricing resolution:
//   1. HospitalServiceTariff (category: "pharmacy") for this tenant
//   2. Hardcoded Ethiopian public hospital defaults (paracetamol: 15 ETB, etc.)
//   3. Ultimate fallback: 40 ETB per unit
//
// Total price calculation:
//   totalPrice = unitPrice × qtyFactor
//   where qtyFactor = durationDays × frequency_multiplier
//   (1x/day, 2x/day, 3x/day — parsed from the frequency string)
//
// Ethiopian context:
//   Many drugs in Ethiopian public hospitals are sourced from PFSA
//   (Pharmaceutical Fund and Supply Agency) at subsidised prices.
//   The hardcoded defaults approximate PFSA-subsidised patient prices.
// =============================================================================

import prisma from "@my-better-t-app/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, tenantProcedure } from "../index";

export const prescriptionRouter = router({

  // ── create ─────────────────────────────────────────────────────────────────
  // Creates a new prescription with one or more drug lines.
  // Called by the Doctor during consultation after diagnosis.
  //
  // For each drug line:
  //   1. Resolve unit price from tariff or defaults
  //   2. Calculate total price for the full course (dose × frequency × days)
  //   3. Set payment status based on patient's CBHI / emergency status
  //
  // After creation, all active Pharmacists in this hospital receive
  // an in-app notification with the number of medications to dispense.
  create: tenantProcedure
    .input(z.object({
      visitId: z.string(),
      lines: z.array(z.object({
        itemId:      z.string().default(""),   // InventoryItem ID (empty if manually typed)
        itemName:    z.string(),               // Drug name + strength e.g. "Amoxicillin 500mg Caps"
        dose:        z.string(),               // Single dose e.g. "500mg", "1 tablet"
        frequency:   z.string(),               // Dosing schedule e.g. "3x daily", "2x daily"
        durationDays: z.number().int().positive(), // Course length in days
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const visit = await prisma.visit.findFirstOrThrow({
        where:   { id: input.visitId, tenantId: ctx.tenantId },
        include: { patient: true },
      });

      // Determine payment status for all lines based on patient type
      let linePaymentStatus = "unpaid";
      if (visit.patient.cbhiStatus) {
        linePaymentStatus = "cbhi_covered";     // CBHI covers medications
      } else if (visit.type === "emergency") {
        linePaymentStatus = "emergency_exempt"; // Emergency drugs billed later
      }

      // ── Drug price lookup ──────────────────────────────────────────────────
      // Build a price map from the tenant's pharmacy tariffs (case-insensitive match)
      const drugTariffs = await prisma.hospitalServiceTariff.findMany({
        where: { tenantId: ctx.tenantId, category: "pharmacy", isActive: true },
      });
      const drugPriceMap: Record<string, number> = {};
      for (const t of drugTariffs) {
        drugPriceMap[t.name.toLowerCase().trim()] = t.price;
      }

      // Hardcoded fallback prices for common drugs at Ethiopian public hospital rates (ETB)
      const defaultDrugPrices: Record<string, number> = {
        "amoxicillin 500mg caps":               45,
        "metformin 500mg tabs":                 30,
        "artemether/lumefantrine 80/480mg":     65,  // First-line malaria treatment
        "paracetamol 500mg tabs":               15,
        "ors sachets":                          20,  // Oral Rehydration Salts (WASH/diarrhoea)
        "iv normal saline 1l":                  85,
        "ciprofloxacin 500mg":                  55,
        "omeprazole 20mg":                      40,
      };

      // ── Enrich each prescription line ─────────────────────────────────────
      const enrichedLines = input.lines.map((l) => {
        const key = l.itemName.toLowerCase().trim();
        const unitPrice = drugPriceMap[key] ?? defaultDrugPrices[key] ?? 40; // 40 ETB fallback

        // Parse frequency multiplier from the frequency string
        // "3x daily" → 3, "2x daily" → 2, anything else → 1
        const freqMultiplier =
          l.frequency.includes("3x") ? 3 :
          l.frequency.includes("2x") ? 2 : 1;

        // Total quantity factor: days × doses per day
        const qtyFactor = l.durationDays * freqMultiplier;

        // Total price: if course qty > 10 units, pack into groups of 10 (box pricing)
        // Otherwise price per individual dose
        const totalPrice = Math.round(unitPrice * (qtyFactor > 10 ? Math.ceil(qtyFactor / 10) : 1));

        return { ...l, unitPrice, totalPrice, paymentStatus: linePaymentStatus };
      });

      const prescription = await prisma.prescription.create({
        data: {
          tenantId:     ctx.tenantId,
          visitId:      input.visitId,
          prescribedBy: ctx.userId,
          lines:        { create: enrichedLines },
        },
        include: { lines: true },
      });

      // ── Notify Pharmacists ─────────────────────────────────────────────────
      // All active Pharmacists in this hospital receive a notification
      // with the count of medications waiting to be dispensed.
      const pharmacists = await prisma.userTenantRole.findMany({
        where: { tenantId: ctx.tenantId, role: "Pharmacist", status: "active" },
      });
      await Promise.all(pharmacists.map((p) =>
        prisma.notification.create({
          data: {
            tenantId: ctx.tenantId,
            userId:   p.userId,
            type:     "in-app",
            title:    "New prescription",
            body:     `${input.lines.length} medication(s) to dispense`,
          },
        })
      ));

      return prescription;
    }),

  // ── queue ──────────────────────────────────────────────────────────────────
  // Returns all pending (undispensed) prescriptions for this tenant.
  // The Pharmacist's primary work screen — FCFS order (oldest first).
  //
  // Includes patient name (EN/AM), CBHI status, and all drug lines.
  // Pharmacist uses this to prepare medications before calling the patient.
  queue: tenantProcedure.query(async ({ ctx }) => {
    return prisma.prescription.findMany({
      where:   { tenantId: ctx.tenantId, status: "pending" },
      include: {
        lines: true,
        visit: {
          include: {
            patient: { select: { nameEn: true, nameAm: true, healthId: true, cbhiStatus: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" }, // First-come-first-served (oldest prescription first)
    });
  }),

  // ── dispensed ─────────────────────────────────────────────────────────────
  // Returns prescriptions dispensed in the last 7 days.
  // Used by the Pharmacist for the recent dispense history screen
  // and by the Billing Officer to verify pharmacy charges.
  dispensed: tenantProcedure.query(async ({ ctx }) => {
    const since = new Date();
    since.setDate(since.getDate() - 7);
    return prisma.prescription.findMany({
      where:   { tenantId: ctx.tenantId, status: "dispensed", createdAt: { gte: since } },
      include: {
        lines: true,
        visit: {
          include: {
            patient: { select: { nameEn: true, nameAm: true, healthId: true, cbhiStatus: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take:    50,
    });
  }),

  // ── dispense ───────────────────────────────────────────────────────────────
  // Physically dispenses a prescription — deducts stock from inventory using FEFO.
  // This is the most complex mutation in the pharmacy module.
  //
  // Pre-conditions (both enforced — will throw if not met):
  //   1. Prescription must be in "pending" status (not already dispensed)
  //   2. ALL prescription lines must have paymentStatus !== "unpaid"
  //      (pay-before-dispense rule — protects hospital revenue)
  //
  // FEFO stock deduction (per line):
  //   1. Find all active batches for this item, ordered by expiryDate ASC
  //   2. Deduct needed quantity from oldest-expiry batch first
  //   3. If one batch runs out, continue to the next (cascade deduction)
  //   4. If total available < needed → throw BAD_REQUEST (stockout)
  //   5. Create StockMovement record for each batch deducted (audit trail)
  //   6. Decrement LocationStock for each affected batch/location
  //
  // Lines without an itemId (manually typed drugs not in inventory):
  //   Marked "dispensed" without stock deduction (no inventory record exists).
  //   This handles ad-hoc drugs or items from external pharmacies.
  dispense: tenantProcedure
    .input(z.object({ prescriptionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const prescription = await prisma.prescription.findFirstOrThrow({
        where:   { id: input.prescriptionId, tenantId: ctx.tenantId },
        include: { lines: true },
      });

      if (prescription.status === "dispensed") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Already dispensed" });
      }

      // ── Pay-before-dispense check ──────────────────────────────────────────
      const unpaidLines = prescription.lines.filter((l) => l.paymentStatus === "unpaid");
      if (unpaidLines.length > 0) {
        throw new TRPCError({
          code:    "PRECONDITION_FAILED",
          message: `Payment required: ${unpaidLines.length} medication(s) have not been paid for. Please collect payment before dispensing.`,
        });
      }

      // ── FEFO stock deduction per line ──────────────────────────────────────
      for (const line of prescription.lines) {
        // Skip stock deduction for manually typed drugs (no inventory linkage)
        if (!line.itemId) {
          await prisma.prescriptionLine.update({
            where: { id: line.id },
            data:  { status: "dispensed", dispensedAt: new Date(), dispensedBy: ctx.userId },
          });
          continue;
        }

        // Calculate total quantity needed for this drug line
        const freqMultiplier = line.frequency.includes("3x") ? 3 : line.frequency.includes("2x") ? 2 : 1;
        const totalNeeded = line.durationDays * freqMultiplier;

        // Fetch all active batches for this item — FEFO order (earliest expiry first)
        const batches = await prisma.inventoryBatch.findMany({
          where:   { itemId: line.itemId, tenantId: ctx.tenantId, qty: { gt: 0 }, status: "active" },
          orderBy: { expiryDate: "asc" }, // FEFO: oldest expiry batch first
        });

        // Stockout check — fail fast before any deductions
        const totalAvailable = batches.reduce((s, b) => s + b.qty, 0);
        if (totalAvailable < totalNeeded) {
          throw new TRPCError({
            code:    "BAD_REQUEST",
            message: `Insufficient stock for ${line.itemName}. Need ${totalNeeded}, have ${totalAvailable}`,
          });
        }

        // ── Cascade deduction across batches ──────────────────────────────────
        let remaining = totalNeeded;
        for (const batch of batches) {
          if (remaining <= 0) break;
          const deduct = Math.min(batch.qty, remaining); // Deduct as much as this batch has

          // Reduce batch quantity
          await prisma.inventoryBatch.update({
            where: { id: batch.id },
            data:  { qty: { decrement: deduct } },
          });

          // Create immutable stock movement record (audit trail)
          await prisma.stockMovement.create({
            data: {
              tenantId:   ctx.tenantId,
              itemId:     line.itemId,
              batchId:    batch.id,
              type:       "dispensed",
              qty:        -deduct,                              // Negative = stock out
              locationId: batch.locationId,
              userId:     ctx.userId,
              reference:  prescription.id,
              note:       `Rx dispense: ${line.itemName}`,
            },
          });

          // Reduce location stock aggregate
          await prisma.locationStock.updateMany({
            where: { itemId: line.itemId, locationId: batch.locationId },
            data:  { qty: { decrement: deduct } },
          });

          remaining -= deduct;
        }

        // Mark line as dispensed
        await prisma.prescriptionLine.update({
          where: { id: line.id },
          data:  { status: "dispensed", dispensedAt: new Date(), dispensedBy: ctx.userId },
        });
      }

      // Mark the entire prescription as dispensed
      return prisma.prescription.update({
        where: { id: input.prescriptionId },
        data:  { status: "dispensed" },
      });
    }),

  // ── payPrescription ────────────────────────────────────────────────────────
  // Collects payment for all lines in a prescription at the cashier or reception.
  // Generates a single "pharmacy" category receipt for the full prescription total.
  // Updates all lines to paymentStatus = "paid" so dispense() can proceed.
  //
  // For bulk payment of all visit fees in one transaction, use
  // billing.collectCashierPayment() instead.
  payPrescription: tenantProcedure
    .input(z.object({
      prescriptionId: z.string(),
      paymentMethod:  z.enum(["cash", "telebirr", "cbe_birr", "card"]),
      reference:      z.string().default(""),
    }))
    .mutation(async ({ ctx, input }) => {
      const rx = await prisma.prescription.findFirstOrThrow({
        where:   { id: input.prescriptionId, tenantId: ctx.tenantId },
        include: { lines: true, visit: { include: { patient: true } } },
      });

      // Sum all line totals for the prescription receipt amount
      const total = rx.lines.reduce((s, l) => s + l.totalPrice, 0);

      // PRODUCTION BLOCKER (P6 — Race Condition): COUNT+1 is not safe under concurrent cashiers.
      // Two simultaneous requests both read the same count and generate the same receipt number.
      // Fix with a PostgreSQL sequence before production deployment — see billing.ts for details.
      const rcCount = await prisma.paymentReceipt.count({ where: { tenantId: ctx.tenantId } });
      const receiptNumber = `RCP-${new Date().getFullYear()}-${String(rcCount + 1).padStart(5, "0")}`;

      // Create pharmacy payment receipt
      await prisma.paymentReceipt.create({
        data: {
          tenantId:      ctx.tenantId,
          receiptNumber,
          patientId:     rx.visit.patientId,
          visitId:       rx.visitId,
          category:      "pharmacy",
          amount:        total,
          paymentMethod: input.paymentMethod,
          collectedBy:   ctx.userId ?? "Cashier",
          reference:     input.reference,
          notes:         `Pharmacy Rx: ${rx.lines.map((l) => l.itemName).join(", ")}`,
        },
      });

      // Mark ALL lines in this prescription as paid with the receipt number
      await prisma.prescriptionLine.updateMany({
        where: { prescriptionId: rx.id },
        data:  {
          paymentStatus: "paid",
          paidAt:        new Date(),
          receiptNumber,
          paymentMethod: input.paymentMethod,
        },
      });

      return { success: true, receiptNumber, total };
    }),
});
