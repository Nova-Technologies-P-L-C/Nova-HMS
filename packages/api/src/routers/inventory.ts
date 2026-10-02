// =============================================================================
// Nova HMS — Inventory Router
// =============================================================================
//
// Full pharmaceutical and medical supply chain management.
// This router serves the Pharmacist's inventory module and covers:
//
//   - Item master catalogue (add / list / detail)
//   - Goods receipt from suppliers (receive stock with batch/lot traceability)
//   - Stock adjustments (expiry write-offs, damage, corrections)
//   - Inter-location transfers (from main store to ward pharmacies)
//   - Storage location management
//   - Supplier management
//   - Requisition / RRF (Requisition & Report Form) management
//   - Cycle count / physical inventory reconciliation
//   - Consumption record aggregation
//   - ROP alerts (items at or below reorder point)
//   - Expiry alerts (items expiring within 90 days)
//   - Demand forecast data
//
// Stock status auto-computation (recomputeItemStatus):
//   After every receive, dispense, adjust, or transfer, this function
//   recalculates the item's aggregate on-hand quantity and sets:
//     status = "critical"  if total ≤ ROP × 50%
//     status = "low"       if total ≤ ROP
//     status = "ok"        if total > ROP
//
// Ethiopian supply chain context:
//   - The primary supplier for most public hospitals is PFSA
//     (Pharmaceutical Fund and Supply Agency of Ethiopia)
//   - Reporting follows the national LMIS (Logistics Management Information System)
//     using RRF (Requisition and Report Form) submitted quarterly
//   - Expiry management is critical — Ethiopia's warm climate accelerates degradation
//   - Cycle counts (physical inventory) are typically done quarterly or annually
//   - FEFO (First Expired, First Out) is the mandated dispensing strategy per PFSA guidelines
//
// Key models used:
//   InventoryItem → InventoryBatch → LocationStock → StockMovement
//   Requisition   → RequisitionLine
//   CycleCount    → CycleCountLine
//   ConsumptionRecord (aggregated monthly — drives AMC / demand forecast)
// =============================================================================

import prisma from "@my-better-t-app/db";
import { z } from "zod";
import { router, tenantProcedure } from "../index";

export const inventoryRouter = router({

  // ── items ──────────────────────────────────────────────────────────────────
  // Returns the full inventory catalogue for this tenant.
  // Optionally filtered by category (drug, consumable, reagent, equipment)
  // or status (ok, low, critical).
  //
  // Includes supplier, per-location stock levels, and active batches
  // (batches with qty > 0 only, sorted by earliest expiry for FEFO visibility).
  items: tenantProcedure
    .input(z.object({
      category: z.string().optional(),   // drug | consumable | reagent | equipment
      status:   z.string().optional(),   // ok | low | critical
    }).default({}))
    .query(async ({ ctx, input }) => {
      return prisma.inventoryItem.findMany({
        where: {
          tenantId: ctx.tenantId,
          ...(input.category ? { category: input.category } : {}),
          ...(input.status   ? { status:   input.status   } : {}),
        },
        include: {
          supplier:      true,
          locationStock: { include: { location: true } },
          batches:       { where: { qty: { gt: 0 } }, orderBy: { expiryDate: "asc" } }, // Non-empty batches, FEFO order
        },
        orderBy: { name: "asc" }, // Alphabetical — matches typical pharmacy shelf arrangement
      });
    }),

  // ── item ───────────────────────────────────────────────────────────────────
  // Returns full detail for a single inventory item.
  // Includes full batch history, all location stock levels,
  // last 50 stock movements (audit ledger), and 12 months of consumption.
  // Used on the item detail screen for deep-dive analysis.
  item: tenantProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return prisma.inventoryItem.findFirstOrThrow({
        where:   { id: input.id, tenantId: ctx.tenantId },
        include: {
          supplier:      true,
          batches:       { orderBy: { expiryDate: "asc" } },
          locationStock: { include: { location: true } },
          movements:     { orderBy: { createdAt: "desc" }, take: 50, include: { location: true } },
          consumption:   { orderBy: { month: "desc" }, take: 12 }, // Last 12 months for AMC calculation
        },
      });
    }),

  // ── addItem ────────────────────────────────────────────────────────────────
  // Adds a new drug or supply item to the catalogue.
  // Called by the Pharmacist or Hospital Admin when onboarding a new drug.
  //
  //   rop      — Reorder Point: when stock falls to/below this level, a ROP alert fires
  //   maxLevel — Maximum stocking level (used in RRF quantification)
  //   uomBoxQty — Units per box (for goods receipt conversion: boxes → tablets)
  addItem: tenantProcedure
    .input(z.object({
      name:      z.string().min(1),
      nameAm:    z.string().default(""),    // Amharic name for bilingual display
      category:  z.string(),                // drug | consumable | reagent | equipment
      uomBase:   z.string(),                // Base unit e.g. "tablet", "vial"
      uomBox:    z.string().default("box"),
      uomBoxQty: z.number().int().default(1),
      rop:       z.number().int().default(0),
      maxLevel:  z.number().int().default(0),
      supplierId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return prisma.inventoryItem.create({ data: { ...input, tenantId: ctx.tenantId } });
    }),

  // ── receiveGoods ───────────────────────────────────────────────────────────
  // Records goods receipt from a supplier — creates batches and updates stock.
  // This is the primary stock intake procedure, used when PFSA or a local
  // supplier delivers drugs to the pharmacy store.
  //
  // For each line (one batch per delivery line):
  //   1. Create InventoryBatch with lot number, expiry date, quantity
  //   2. Upsert LocationStock — add received qty to the destination location
  //   3. Create StockMovement record (type: "received") for audit trail
  //   4. Recompute item stock status (ok/low/critical)
  receiveGoods: tenantProcedure
    .input(z.object({
      supplierId:   z.string(),
      locationId:   z.string(),              // Destination store (e.g. "Main Pharmacy")
      deliveryDate: z.string(),              // "YYYY-MM-DD"
      invoiceRef:   z.string().default(""),  // Supplier invoice/delivery note reference
      lines: z.array(z.object({
        itemId:     z.string(),
        lotNumber:  z.string(),              // Manufacturer lot number (for recall traceability)
        qty:        z.number().int().positive(),
        expiryDate: z.string(),              // "YYYY-MM-DD" — critical for FEFO and expiry alerts
        unitCost:   z.number().default(0),   // Purchase cost per unit in ETB (for cost tracking)
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const results = [];
      for (const line of input.lines) {
        // Create batch record with full traceability data
        const batch = await prisma.inventoryBatch.create({
          data: {
            itemId:       line.itemId,
            tenantId:     ctx.tenantId,
            lotNumber:    line.lotNumber,
            qty:          line.qty,
            expiryDate:   line.expiryDate,
            receivedDate: input.deliveryDate,
            supplierId:   input.supplierId,
            locationId:   input.locationId,
          },
        });

        // Upsert location stock — create if first stock, increment if existing
        await prisma.locationStock.upsert({
          where:  { itemId_locationId: { itemId: line.itemId, locationId: input.locationId } },
          create: { itemId: line.itemId, locationId: input.locationId, tenantId: ctx.tenantId, qty: line.qty },
          update: { qty: { increment: line.qty } },
        });

        // Audit movement record
        await prisma.stockMovement.create({
          data: {
            tenantId:   ctx.tenantId,
            itemId:     line.itemId,
            batchId:    batch.id,
            type:       "received",
            qty:        line.qty,            // Positive = stock in
            locationId: input.locationId,
            userId:     ctx.userId,
            reference:  input.invoiceRef,
            note:       "Goods receipt",
          },
        });

        // Recalculate item status (ok/low/critical) after receiving
        await recomputeItemStatus(line.itemId);
        results.push(batch);
      }
      return results;
    }),

  // ── adjust ─────────────────────────────────────────────────────────────────
  // Records a manual stock adjustment.
  // Used for:
  //   "expired"    — Writing off expired batches discovered during inspection
  //   "damaged"    — Writing off physically damaged stock
  //   "correction" — Fixing a discrepancy found during a cycle count
  //   "received"   — Ad-hoc stock addition (e.g. items counted in but not through goods receipt)
  //
  // Expired and damaged adjustments use negative deltas (qty is decremented).
  // The batch qty is also updated if a specific batchId is provided.
  adjust: tenantProcedure
    .input(z.object({
      itemId:     z.string(),
      locationId: z.string(),
      type:       z.enum(["received", "expired", "damaged", "correction"]),
      qty:        z.number().int(),                // Absolute value — direction determined by type
      note:       z.string().default(""),
      batchId:    z.string().optional(),           // Specific batch being adjusted
    }))
    .mutation(async ({ ctx, input }) => {
      // Expired and damaged = stock out (negative delta); received/correction = stock in (positive)
      const delta = ["expired", "damaged"].includes(input.type) ? -Math.abs(input.qty) : input.qty;

      await prisma.locationStock.upsert({
        where:  { itemId_locationId: { itemId: input.itemId, locationId: input.locationId } },
        create: { itemId: input.itemId, locationId: input.locationId, tenantId: ctx.tenantId, qty: Math.max(0, delta) },
        update: { qty: { increment: delta } },
      });

      // Adjust specific batch qty if a batch is referenced
      if (input.batchId) {
        await prisma.inventoryBatch.update({
          where: { id: input.batchId },
          data:  { qty: { increment: delta } },
        });
      }

      const movement = await prisma.stockMovement.create({
        data: {
          tenantId:   ctx.tenantId,
          itemId:     input.itemId,
          batchId:    input.batchId,
          type:       input.type,
          qty:        delta,
          locationId: input.locationId,
          userId:     ctx.userId,
          note:       input.note,
        },
      });

      await recomputeItemStatus(input.itemId);
      return movement;
    }),

  // ── transfer ───────────────────────────────────────────────────────────────
  // Transfers stock between two locations within the same hospital.
  // Example: move drugs from the main pharmacy store to the maternity ward store.
  //
  // Steps:
  //   1. Decrement fromLocation stock
  //   2. Upsert toLocation stock (create if first transfer to that location)
  //   3. Create StockMovement with type "transferred" (qty = negative, from perspective of source)
  transfer: tenantProcedure
    .input(z.object({
      itemId:         z.string(),
      fromLocationId: z.string(),
      toLocationId:   z.string(),
      qty:            z.number().int().positive(),
      note:           z.string().default(""),
    }))
    .mutation(async ({ ctx, input }) => {
      // Deduct from source location
      await prisma.locationStock.update({
        where: { itemId_locationId: { itemId: input.itemId, locationId: input.fromLocationId } },
        data:  { qty: { decrement: input.qty } },
      });

      // Add to destination location (create if not exists)
      await prisma.locationStock.upsert({
        where:  { itemId_locationId: { itemId: input.itemId, locationId: input.toLocationId } },
        create: { itemId: input.itemId, locationId: input.toLocationId, tenantId: ctx.tenantId, qty: input.qty },
        update: { qty: { increment: input.qty } },
      });

      // Audit movement record (negative qty from source perspective)
      return prisma.stockMovement.create({
        data: {
          tenantId:     ctx.tenantId,
          itemId:       input.itemId,
          type:         "transferred",
          qty:          -input.qty,                  // Negative = out from source location
          locationId:   input.fromLocationId,
          toLocationId: input.toLocationId,           // Destination for transfer movements
          userId:       ctx.userId,
          note:         input.note,
        },
      });
    }),

  // ── locations ─────────────────────────────────────────────────────────────
  // Returns all inventory locations for this tenant with their current stock.
  // Used on the Pharmacist's "Locations" screen to manage pharmacy stores and ward sub-stores.
  locations: tenantProcedure.query(async ({ ctx }) => {
    return prisma.inventoryLocation.findMany({
      where:   { tenantId: ctx.tenantId },
      include: { stock: { include: { item: true } } },
    });
  }),

  // ── addLocation ────────────────────────────────────────────────────────────
  // Creates a new storage location (pharmacy store, ward sub-store, etc.)
  addLocation: tenantProcedure
    .input(z.object({
      name:      z.string(),
      type:      z.string(),                 // pharmacy | ward | clinic | store
      managerId: z.string().default(""),     // userId of the location manager
    }))
    .mutation(async ({ ctx, input }) => {
      return prisma.inventoryLocation.create({ data: { ...input, tenantId: ctx.tenantId } });
    }),

  // ── suppliers ─────────────────────────────────────────────────────────────
  // Returns all suppliers for this tenant.
  // Used in goods receipt and requisition forms.
  suppliers: tenantProcedure.query(async ({ ctx }) => {
    return prisma.supplier.findMany({ where: { tenantId: ctx.tenantId } });
  }),

  // ── addSupplier ────────────────────────────────────────────────────────────
  // Adds a new supplier to the tenant's supplier registry.
  //   leadDays — Average delivery lead time (used in automatic ROP calculations)
  addSupplier: tenantProcedure
    .input(z.object({
      name:     z.string(),
      fullName: z.string().default(""),
      contact:  z.string().default(""),
      phone:    z.string().default(""),
      leadDays: z.number().int().default(14),
    }))
    .mutation(async ({ ctx, input }) => {
      return prisma.supplier.create({ data: { ...input, tenantId: ctx.tenantId } });
    }),

  // ── ropAlerts ─────────────────────────────────────────────────────────────
  // Returns all items at or below their Reorder Point.
  // Displayed on the "ROP Alerts" screen with a red/orange badge.
  // The Pharmacist uses this to trigger emergency requisitions and
  // prioritise the next routine RRF submission.
  //
  //   "critical" = stock ≤ 50% of ROP (very urgent — risk of stockout)
  //   "low"      = stock ≤ ROP (reorder needed)
  ropAlerts: tenantProcedure.query(async ({ ctx }) => {
    return prisma.inventoryItem.findMany({
      where: { tenantId: ctx.tenantId, status: { in: ["critical", "low"] } },
      include: {
        supplier:      true,
        locationStock: { include: { location: true } },
      },
      orderBy: { status: "asc" }, // "critical" sorts before "low" alphabetically
    });
  }),

  // ── expiryAlerts ──────────────────────────────────────────────────────────
  // Returns all batches with stock > 0 expiring within 90 days.
  // Displayed on the "Expiry Management" screen.
  // Pharmacist uses this to:
  //   a) Return near-expiry stock to PFSA (if within return window)
  //   b) Prioritise these batches for dispensing (FEFO enforcement)
  //   c) Write off expired stock after the expiry date passes
  expiryAlerts: tenantProcedure.query(async ({ ctx }) => {
    const ninetyDays = new Date();
    ninetyDays.setDate(ninetyDays.getDate() + 90);
    return prisma.inventoryBatch.findMany({
      where: {
        tenantId:   ctx.tenantId,
        qty:        { gt: 0 },                               // Only batches with remaining stock
        expiryDate: { lte: ninetyDays.toISOString().split("T")[0] }, // Expiring within 90 days
      },
      include: { item: true, location: true },
      orderBy: { expiryDate: "asc" },                         // Most urgent first
    });
  }),

  // ── requisitions ──────────────────────────────────────────────────────────
  // Returns all requisitions (RRF) for this tenant.
  // Used by the Pharmacist to track the status of outstanding orders.
  requisitions: tenantProcedure.query(async ({ ctx }) => {
    return prisma.requisition.findMany({
      where:   { tenantId: ctx.tenantId },
      include: { supplier: true, lines: { include: { item: true } } },
      orderBy: { createdAt: "desc" },
    });
  }),

  // ── createRequisition ─────────────────────────────────────────────────────
  // Creates a new stock requisition / RRF.
  //
  //   type = "routine"   — Monthly/quarterly replenishment cycle
  //                        Requires supervisor approval before submission to PFSA
  //   type = "emergency" — Immediate stockout situation
  //                        Auto-approved (no waiting for supervisor sign-off)
  //
  // justification — Explains why the requisition was raised
  // (particularly important for emergency requisitions)
  createRequisition: tenantProcedure
    .input(z.object({
      supplierId:    z.string(),
      type:          z.enum(["routine", "emergency"]).default("routine"),
      justification: z.string().default(""),
      lines: z.array(z.object({
        itemId:      z.string(),
        qtyRequested: z.number().int().positive(),
        unitCost:    z.number().default(0),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const { lines, ...header } = input;
      return prisma.requisition.create({
        data: {
          ...header,
          tenantId:    ctx.tenantId,
          requestedBy: ctx.userId,
          // Emergency requisitions skip the approval queue (auto-approved)
          status:      input.type === "emergency" ? "approved" : "pending",
          lines:       { create: lines },
        },
        include: { lines: { include: { item: true } }, supplier: true },
      });
    }),

  // ── approveRequisition ────────────────────────────────────────────────────
  // Approves a pending routine requisition.
  // Called by the Hospital Admin or Pharmacy Supervisor.
  // Once approved, the Pharmacist can submit it to PFSA.
  approveRequisition: tenantProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return prisma.requisition.update({
        where: { id: input.id, tenantId: ctx.tenantId },
        data:  { status: "approved", approvedBy: ctx.userId },
      });
    }),

  // ── cycleCounts ───────────────────────────────────────────────────────────
  // Returns all completed cycle count exercises for this tenant.
  // Used by Pharmacist and Hospital Admin to review inventory accuracy over time.
  cycleCounts: tenantProcedure.query(async ({ ctx }) => {
    return prisma.cycleCount.findMany({
      where:   { tenantId: ctx.tenantId },
      include: { lines: { include: { item: true } } },
      orderBy: { date: "desc" },
    });
  }),

  // ── submitCycleCount ──────────────────────────────────────────────────────
  // Records the results of a physical inventory count.
  // For each item: captures system qty, physically counted qty, variance, and
  // the reason/category for any discrepancy.
  //
  // Variance = countedQty - systemQty
  //   Positive variance = more stock found than system shows (unrecorded receipts)
  //   Negative variance = less stock found than system shows (loss/theft/admin error)
  //
  // Loss categories (for management reporting):
  //   "expired"     — Near/post-expiry waste
  //   "damaged"     — Physical damage during storage
  //   "theft"       — Suspected pilferage (triggers audit investigation)
  //   "admin_error" — Recording mistake in the system
  submitCycleCount: tenantProcedure
    .input(z.object({
      lines: z.array(z.object({
        itemId:         z.string(),
        systemQty:      z.number().int(),
        countedQty:     z.number().int(),
        varianceReason: z.string().default(""),
        lossCategory:   z.string().default(""),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      // Calculate variance for each line
      const lines = input.lines.map((l) => ({ ...l, variance: l.countedQty - l.systemQty }));
      return prisma.cycleCount.create({
        data: {
          tenantId:    ctx.tenantId,
          conductedBy: ctx.userId,
          status:      "completed",
          lines:       { create: lines },
        },
        include: { lines: true },
      });
    }),

  // ── consumption ───────────────────────────────────────────────────────────
  // Returns the monthly consumption history for a specific item.
  // Used by the Demand Forecast module to calculate Average Monthly Consumption (AMC).
  // AMC drives automatic Reorder Quantity suggestions in the RRF module.
  consumption: tenantProcedure
    .input(z.object({ itemId: z.string() }))
    .query(async ({ ctx, input }) => {
      return prisma.consumptionRecord.findMany({
        where:   { itemId: input.itemId, tenantId: ctx.tenantId },
        orderBy: { month: "asc" }, // Chronological order for trend charts
      });
    }),
});

// =============================================================================
// recomputeItemStatus (internal helper)
// =============================================================================
// Recalculates the aggregate on-hand quantity for an item across all locations
// and updates its status field to "ok", "low", or "critical".
//
// Called after every stock-changing operation:
//   receiveGoods, adjust, (dispense is handled in prescription router)
//
// Status thresholds:
//   "critical" — total stock ≤ ROP × 50%  (imminent stockout risk)
//   "low"      — total stock ≤ ROP         (reorder needed)
//   "ok"       — total stock > ROP          (adequate supply)
//
// This is NOT exposed as a tRPC procedure — it is an internal helper
// that runs synchronously within the transaction of each mutation.
// PRODUCTION: For high-volume systems, consider a debounced background job
// to avoid redundant recomputation on rapid consecutive transactions.
async function recomputeItemStatus(itemId: string) {
  // Sum qty across all locations for this item
  const agg = await prisma.locationStock.aggregate({
    where: { itemId },
    _sum:  { qty: true },
  });
  const total = agg._sum.qty ?? 0;

  const item = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: itemId } });

  const status =
    total <= item.rop * 0.5 ? "critical" : // Below 50% of ROP — urgent
    total <= item.rop       ? "low"       : // At or below ROP — reorder
    "ok";                                   // Above ROP — adequate

  await prisma.inventoryItem.update({ where: { id: itemId }, data: { status } });
}
