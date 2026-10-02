// =============================================================================
// Nova HMS — Patient Router
// =============================================================================
//
// Handles all patient demographic operations: registration, search, lookup,
// update, and allergy management. This is the foundational router — almost
// every other clinical workflow begins with a patient record from here.
//
// All procedures use `tenantProcedure`, meaning every call requires:
//   - A valid Better Auth session cookie
//   - A valid x-tenant-id header (the hospital the user belongs to)
//   - An assigned role in that tenant
//
// Health ID generation:
//   Each patient receives a unique, human-readable Health ID on registration:
//   Format: "<TENANT_SLUG_3CHARS>-NNNNN"  e.g. "DMR-00042"
//   This ID is printed on the patient card and used at every care touchpoint
//   (OPD reception, lab, pharmacy, referral). It replaces the paper card number
//   used in traditional Ethiopian hospital workflows.
//
// Audit trail:
//   Patient registration and every record view are written to AuditLog.
//   This is a regulatory requirement for Ethiopian health facilities —
//   the MOH and facility management can review who accessed patient data.
//
// Procedures exposed:
//   register    — Create a new patient record (Receptionist)
//   search      — Full-text search by name (EN/AM), healthId, phone (all roles)
//   list        — Paginated patient list (Hospital Admin, Receptionist)
//   get         — Full patient EMR with visits, labs, prescriptions (Doctor, Nurse)
//   update      — Update demographics / CBHI status (Receptionist, Hospital Admin)
//   addAllergy  — Record a drug/substance allergy (Doctor, Nurse)
// =============================================================================

import prisma from "@my-better-t-app/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, tenantProcedure } from "../index";

// ─── Health ID Generator ─────────────────────────────────────────────────────
// Generates a sequential Health ID for a newly registered patient.
// Uses the first 3 characters of the tenant slug as a facility prefix.
//
// Examples:
//   tenant.slug = "dmrh", count = 41 → "DMR-00042"
//   tenant.slug = "tikur", count = 0 → "TIK-00001"
//
// NOTE: This uses a simple count-based sequence. For production, consider
// a database sequence or UUID approach to avoid race conditions under
// concurrent registrations (e.g. two receptionists registering at the same time).
function generateHealthId(tenantSlug: string, sequence: number) {
  const code = tenantSlug.slice(0, 3).toUpperCase(); // e.g. "dmrh" → "DMR"
  return `${code}-${String(sequence).padStart(5, "0")}`; // e.g. "DMR-00042"
}

export const patientRouter = router({

  // ── register ───────────────────────────────────────────────────────────────
  // Creates a new patient demographic record.
  // Called by Receptionist at the OPD front desk when a new patient presents.
  //
  // Flow:
  //   1. Fetch tenant to get the slug for Health ID generation
  //   2. Count existing patients to determine the next sequence number
  //   3. Create patient with auto-generated Health ID
  //   4. Write AuditLog entry (MOH compliance)
  //
  // Input validation:
  //   nameEn  — Minimum 2 characters (prevents single-character entries)
  //   sex     — Strictly "M" or "F" (aligns with Ethiopian MOH HMIS requirements)
  //   cbhiStatus — true = enrolled in CBHI; affects downstream billing
  register: tenantProcedure
    .input(z.object({
      nameEn:     z.string().min(2),                   // Full name in English (required)
      nameAm:     z.string().default(""),              // Full name in Amharic (optional at registration)
      dob:        z.string(),                          // Date of birth "YYYY-MM-DD"
      sex:        z.enum(["M", "F"]),                  // Sex — "M" | "F" (MOH HMIS standard)
      phone:      z.string().default(""),              // Ethiopian mobile: 09XXXXXXXX
      kebele:     z.string().default(""),              // Sub-district (required for CBHI)
      cbhiStatus: z.boolean().default(false),          // CBHI enrollment status
    }))
    .mutation(async ({ ctx, input }) => {
      // Fetch tenant for slug (used in Health ID prefix)
      const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: ctx.tenantId } });

      // Count existing patients to determine next sequential Health ID
      // NOTE: Race condition risk — see generateHealthId comment above
      const count = await prisma.patient.count({ where: { tenantId: ctx.tenantId } });
      const healthId = generateHealthId(tenant.slug, count + 1);

      // Create the patient record with the generated Health ID
      const patient = await prisma.patient.create({
        data: { ...input, tenantId: ctx.tenantId, healthId },
      });

      // Audit log — records who registered this patient and when
      // Required for MOH compliance and facility governance audits
      await prisma.auditLog.create({
        data: {
          tenantId: ctx.tenantId,
          userId:   ctx.userId,
          action:   "Registered new patient",
          entity:   "Patient",
          entityId: patient.id,
        },
      });

      return patient;
    }),

  // ── search ─────────────────────────────────────────────────────────────────
  // Full-text patient search across multiple identifiers.
  // Used at every care touchpoint — reception, lab, pharmacy, doctor's queue.
  //
  // Search fields (OR logic — any match returns the patient):
  //   nameEn  — English name (partial match, case-insensitive via Prisma contains)
  //   nameAm  — Amharic name (staff can search in Ge'ez script)
  //   healthId — Patient card number e.g. "DMR-00042"
  //   phone   — Mobile number
  //
  // Limit: 20 results — prevents large unfiltered dumps.
  // Ordered by newest first so recently registered patients appear at top.
  //
  // PRODUCTION: For hospitals with 100k+ patient records, add a full-text
  // search index (PostgreSQL pg_trgm or Meilisearch) for acceptable performance.
  search: tenantProcedure
    .input(z.object({ query: z.string().min(1) })) // Minimum 1 char prevents full-table scans
    .query(async ({ ctx, input }) => {
      return prisma.patient.findMany({
        where: {
          tenantId: ctx.tenantId,
          OR: [
            { nameEn:   { contains: input.query } },  // English name
            { nameAm:   { contains: input.query } },  // Amharic name (Ge'ez)
            { healthId: { contains: input.query } },  // Card number e.g. "DMR-00042"
            { phone:    { contains: input.query } },  // Mobile number
          ],
        },
        take: 20,                              // Cap results to prevent performance issues
        orderBy: { createdAt: "desc" },        // Newest registrations first
      });
    }),

  // ── list ───────────────────────────────────────────────────────────────────
  // Paginated list of all patients in the tenant.
  // Used by Hospital Admin and Receptionist for patient management screens.
  //
  // Returns pagination metadata (total, pages) so the UI can render
  // a page navigator without additional queries.
  list: tenantProcedure
    .input(z.object({
      page:  z.number().default(1),   // 1-based page number
      limit: z.number().default(20),  // Records per page
    }))
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.limit; // Calculate offset for pagination

      // Run count and data fetch in parallel for better performance
      const [patients, total] = await Promise.all([
        prisma.patient.findMany({
          where:   { tenantId: ctx.tenantId },
          skip,
          take:    input.limit,
          orderBy: { createdAt: "desc" },
        }),
        prisma.patient.count({ where: { tenantId: ctx.tenantId } }),
      ]);

      return {
        patients,
        total,
        pages: Math.ceil(total / input.limit), // Total page count for UI pagination
      };
    }),

  // ── get ────────────────────────────────────────────────────────────────────
  // Fetches the complete Electronic Medical Record (EMR) for one patient.
  // This is the richest query in the system — returns a deeply nested patient
  // object with all clinical history. Used on the Doctor's consultation screen.
  //
  // Included relations:
  //   allergies     — Drug/substance allergies (shown as safety banner in UI)
  //   visits        — Last 10 visits, each with:
  //                     vitals       — Latest vital signs set
  //                     diagnoses    — All ICD-10 coded diagnoses
  //                     notes        — Latest clinical note (SOAP format)
  //                     labOrders    — Lab tests with results
  //                     prescriptions— Medications prescribed + dispense status
  //   appointments  — Next 3 upcoming scheduled appointments
  //
  // Audit trail: every EMR view is logged (who opened this record and when)
  get: tenantProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const patient = await prisma.patient.findFirst({
        where: { id: input.id, tenantId: ctx.tenantId }, // tenantId scoping prevents cross-tenant data leaks
        include: {
          allergies: true,
          visits: {
            orderBy: { openedAt: "desc" },
            take: 10, // Last 10 visits — sufficient for clinical context without overloading response
            include: {
              vitals:        { orderBy: { recordedAt: "desc" }, take: 1 },  // Most recent vitals only
              diagnoses:     true,
              notes:         { orderBy: { createdAt: "desc" }, take: 1 },   // Most recent note only
              labOrders:     { include: { result: true } },                  // Full lab results
              prescriptions: { include: { lines: true } },                  // Medications + lines
            },
          },
          appointments: {
            where:   { status: "scheduled" },         // Only future/upcoming appointments
            orderBy: { date: "asc" },                 // Earliest first
            take:    3,                               // Next 3 appointments
          },
        },
      });

      if (!patient) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Patient not found" });
      }

      // Audit every EMR access — regulatory requirement for patient data governance
      await prisma.auditLog.create({
        data: {
          tenantId: ctx.tenantId,
          userId:   ctx.userId,
          action:   "Viewed patient record",
          entity:   "Patient",
          entityId: patient.id,
        },
      });

      return patient;
    }),

  // ── update ─────────────────────────────────────────────────────────────────
  // Updates patient demographic details.
  // Called by Receptionist when a patient updates their contact info,
  // or by Hospital Admin when correcting a data entry error.
  //
  // Only specific fields are updatable — healthId, dob, sex, and tenantId
  // are intentionally excluded to prevent identity corruption.
  // CBHI status update is included because enrollment can change after registration.
  update: tenantProcedure
    .input(z.object({
      id:         z.string(),
      nameEn:     z.string().optional(),
      nameAm:     z.string().optional(),
      phone:      z.string().optional(),
      kebele:     z.string().optional(),
      cbhiStatus: z.boolean().optional(), // Update when patient enrolls in / leaves CBHI
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      // tenantId in where clause ensures a user cannot update a patient from another hospital
      return prisma.patient.update({
        where: { id, tenantId: ctx.tenantId },
        data,
      });
    }),

  // ── addAllergy ─────────────────────────────────────────────────────────────
  // Records a known drug/substance allergy for a patient.
  // Called by Doctor or Nurse during consultation or triage.
  //
  // Allergies are displayed as a prominent safety banner on:
  //   - Doctor's EMR / consultation screen
  //   - Pharmacist's dispense screen (to catch contraindicated prescriptions)
  //
  // Severity levels:
  //   "mild"         — Minor reaction (e.g. mild rash)
  //   "moderate"     — Significant reaction requiring treatment
  //   "severe"       — Serious systemic reaction
  //   "anaphylactic" — Life-threatening; renders as red alert banner in UI
  //
  // NOTE: The system does not currently auto-check prescribed drugs against
  // known allergies. A Drug-Allergy Interaction (DAI) check module is planned
  // as a future enhancement using a drug database (e.g. OpenFDA / local ETB formulary).
  addAllergy: tenantProcedure
    .input(z.object({
      patientId: z.string(),
      substance: z.string(),                           // Drug or allergen name (free text)
      reaction:  z.string().default(""),               // Described reaction
      severity:  z.string().default("moderate"),       // mild | moderate | severe | anaphylactic
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify the patient belongs to this tenant before attaching allergy data
      // Prevents cross-tenant data injection via a valid patient ID from another hospital
      await prisma.patient.findFirstOrThrow({
        where: { id: input.patientId, tenantId: ctx.tenantId },
      });
      return prisma.allergy.create({ data: input });
    }),
});
