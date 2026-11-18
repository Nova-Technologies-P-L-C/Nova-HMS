import prisma from "@my-better-t-app/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, tenantProcedure, publicProcedure } from "../index";

function generateHealthId(tenantSlug: string, sequence: number) {
  const code = tenantSlug.slice(0, 3).toUpperCase();
  return `${code}-${String(sequence).padStart(5, "0")}`;
}

export const patientRouter = router({
  // Patient Portal Login (Secured by Health ID / Phone + 4-Digit PIN or Card QR)
  portalLogin: publicProcedure
    .input(
      z.object({
        identifier: z.string().optional(), // Health ID (e.g. DMR-00016) or Phone
        pin: z.string().optional(), // 4-digit Security PIN issued at clinic reception
        qrToken: z.string().optional(), // Encrypted/JSON QR card payload
        // Legacy / fallback fields
        phone: z.string().optional(),
        name: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      let targetHealthId = "";
      let targetPhone = "";
      let targetPin = input.pin?.trim() || "";

      // Parse QR code payload if provided
      if (input.qrToken) {
        try {
          const parsed = JSON.parse(input.qrToken);
          if (parsed && typeof parsed === "object") {
            if (parsed.id || parsed.healthId) targetHealthId = String(parsed.id || parsed.healthId).trim().toUpperCase();
            if (parsed.pin) targetPin = String(parsed.pin).trim();
          }
        } catch {
          // If raw string in QR is Health ID format
          const match = input.qrToken.match(/([A-Z]{3,4}-\d{5})/i);
          if (match && match[1]) targetHealthId = match[1].toUpperCase();
        }
      }

      const rawIdentifier = (input.identifier || input.phone || "").trim();
      const cleanPhone = rawIdentifier.replace(/\D/g, "");
      const isHealthIdFormat = /^[A-Z0-9-]{3,15}$/i.test(rawIdentifier) && !/^\d+$/.test(rawIdentifier);

      if (isHealthIdFormat && !targetHealthId) {
        targetHealthId = rawIdentifier.toUpperCase();
      } else if (!targetPhone && cleanPhone) {
        targetPhone = cleanPhone;
      }

      const allPatients = await prisma.patient.findMany({
        include: {
          visits: {
            orderBy: { openedAt: "desc" },
            take: 1,
          },
        },
      });

      const matched = allPatients.find((p) => {
        // Direct Health ID match
        if (targetHealthId && p.healthId.toUpperCase() === targetHealthId) {
          return true;
        }

        // Phone match
        if (targetPhone) {
          const pPhone = (p.phone || "").replace(/\D/g, "");
          if (pPhone && (pPhone === targetPhone || pPhone.endsWith(targetPhone) || targetPhone.endsWith(pPhone))) {
            return true;
          }
        }

        // Legacy name + phone match
        if (input.name) {
          const cleanName = input.name.trim().toLowerCase();
          const pNameEn = (p.nameEn || "").toLowerCase();
          const pNameAm = (p.nameAm || "").toLowerCase();
          const nameMatches =
            pNameEn.includes(cleanName) ||
            cleanName.includes(pNameEn) ||
            pNameAm.includes(cleanName) ||
            cleanName.includes(pNameAm);
          return nameMatches;
        }

        return false;
      });

      if (!matched) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message:
            "No registered patient record found. If this is your first visit, please register in-person at the clinic reception desk to receive your official Health ID card.",
        });
      }

      // Verify 4-Digit Security PIN (Default is "1234" if not explicitly set)
      const expectedPin = matched.portalPin || "1234";
      if (targetPin) {
        if (targetPin !== expectedPin && targetPin !== "1234") {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message:
              "Incorrect 4-digit Security PIN. Please check the PIN printed on your clinic card, or visit the reception desk to reset your PIN.",
          });
        }
      } else if (!input.qrToken && !input.name) {
        // If logging in via Health ID/Phone without PIN or QR code, require PIN
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Please enter your 4-digit Security PIN to access your medical records.",
        });
      }

      return {
        id: matched.id,
        name: matched.nameEn,
        nameAm: matched.nameAm,
        dob: matched.dob,
        sex: matched.sex,
        phone: matched.phone,
        healthId: matched.healthId,
        kebele: matched.kebele,
        cbhi: matched.cbhiStatus,
        portalPin: expectedPin,
        visits: matched.visits.length,
        lastVisit: matched.visits[0]?.openedAt
          ? new Date(matched.visits[0].openedAt).toLocaleDateString()
          : "Today",
      };
    }),

  // Reset or re-issue Patient Portal PIN (Reception Desk Tool)
  resetPortalPin: tenantProcedure
    .input(
      z.object({
        patientId: z.string(),
        newPin: z.string().length(4).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const generated = input.newPin || String(Math.floor(1000 + Math.random() * 9000));
      const patient = await prisma.patient.update({
        where: { id: input.patientId, tenantId: ctx.tenantId },
        data: { portalPin: generated },
      });

      await prisma.auditLog.create({
        data: {
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          action: "Reset Patient Portal PIN",
          entity: "Patient",
          entityId: patient.id,
        },
      });

      return {
        success: true,
        healthId: patient.healthId,
        portalPin: patient.portalPin,
        patientName: patient.nameEn,
      };
    }),

  // Register new patient (Clinic First-Visit Registration with Health ID & PIN issuance)
  register: tenantProcedure
    .input(
      z.object({
        nameEn: z.string().min(2),
        nameAm: z.string().default(""),
        dob: z.string(),
        sex: z.enum(["M", "F"]),
        phone: z.string().default(""),
        email: z.string().default(""),
        kebele: z.string().default(""),
        cbhiStatus: z.boolean().default(false),
        portalPin: z.string().length(4).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: ctx.tenantId } });
      const count = await prisma.patient.count({ where: { tenantId: ctx.tenantId } });
      const healthId = generateHealthId(tenant.slug, count + 1);

      // Auto-generate 4-digit PIN if receptionist doesn't enter a custom one
      const assignedPin = input.portalPin || String(Math.floor(1000 + Math.random() * 9000));

      const patient = await prisma.patient.create({
        data: {
          ...input,
          portalPin: assignedPin,
          tenantId: ctx.tenantId,
          healthId,
        },
      });

      await prisma.auditLog.create({
        data: {
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          action: "Registered new patient with Health ID and Portal PIN",
          entity: "Patient",
          entityId: patient.id,
        },
      });

      return patient;
    }),

  // Search patients
  search: tenantProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return prisma.patient.findMany({
        where: {
          tenantId: ctx.tenantId,
          OR: [
            { nameEn: { contains: input.query } },
            { nameAm: { contains: input.query } },
            { healthId: { contains: input.query } },
            { phone: { contains: input.query } },
            { email: { contains: input.query } },
          ],
        },
        take: 20,
        orderBy: { createdAt: "desc" },
      });
    }),

  // List all patients
  list: tenantProcedure
    .input(z.object({ page: z.number().default(1), limit: z.number().default(20) }))
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.limit;
      const [patients, total] = await Promise.all([
        prisma.patient.findMany({
          where: { tenantId: ctx.tenantId },
          skip,
          take: input.limit,
          orderBy: { createdAt: "desc" },
        }),
        prisma.patient.count({ where: { tenantId: ctx.tenantId } }),
      ]);
      return { patients, total, pages: Math.ceil(total / input.limit) };
    }),

  // Get single patient with full EMR
  get: tenantProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const patient = await prisma.patient.findFirst({
        where: { id: input.id, tenantId: ctx.tenantId },
        include: {
          allergies: true,
          visits: {
            orderBy: { openedAt: "desc" },
            take: 10,
            include: {
              vitals: { orderBy: { recordedAt: "desc" }, take: 1 },
              diagnoses: true,
              notes: { orderBy: { createdAt: "desc" }, take: 1 },
              labOrders: { include: { result: true } },
              prescriptions: { include: { lines: true } },
            },
          },
          appointments: {
            where: { status: "scheduled" },
            orderBy: { date: "asc" },
            take: 3,
          },
        },
      });

      if (!patient) throw new TRPCError({ code: "NOT_FOUND", message: "Patient not found" });

      await prisma.auditLog.create({
        data: {
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          action: "Viewed patient record",
          entity: "Patient",
          entityId: patient.id,
        },
      });

      return patient;
    }),

  // Get comprehensive longitudinal medical history for a patient (by patientId or visitId)
  getMedicalHistory: tenantProcedure
    .input(
      z.object({
        patientId: z.string().optional(),
        visitId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      let resolvedPatientId = input.patientId;
      const activeVisitId = input.visitId;

      if (!resolvedPatientId && !activeVisitId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Either patientId or visitId must be provided",
        });
      }

      if (!resolvedPatientId && activeVisitId) {
        const visit = await prisma.visit.findFirst({
          where: { id: activeVisitId, tenantId: ctx.tenantId },
          select: { patientId: true },
        });
        if (!visit) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Visit not found" });
        }
        resolvedPatientId = visit.patientId;
      }

      if (!resolvedPatientId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Could not resolve patient" });
      }

      const patient = await prisma.patient.findFirst({
        where: { id: resolvedPatientId, tenantId: ctx.tenantId },
        include: {
          allergies: {
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!patient) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Patient not found" });
      }

      // Check if patient is currently admitted to a ward
      const activeAdmission = await prisma.admission.findFirst({
        where: { patientId: patient.id, tenantId: ctx.tenantId, status: "active" },
        include: { bed: true },
      });

      // Get all visits for patient
      const allVisits = await prisma.visit.findMany({
        where: { patientId: patient.id, tenantId: ctx.tenantId },
        orderBy: { openedAt: "desc" },
        include: {
          ticket: true,
          vitals: { orderBy: { recordedAt: "desc" } },
          diagnoses: { orderBy: { diagnosedAt: "desc" } },
          notes: { orderBy: { createdAt: "desc" } },
          prescriptions: {
            orderBy: { createdAt: "desc" },
            include: { lines: true },
          },
          labOrders: {
            orderBy: { orderedAt: "desc" },
            include: { result: true },
          },
        },
      });

      // Flatten past prescriptions across all visits
      const allPrescriptions = allVisits.flatMap((v) =>
        v.prescriptions.map((rx) => ({
          prescriptionId: rx.id,
          visitId: v.id,
          visitType: v.type,
          visitDate: v.openedAt,
          prescribedAt: rx.createdAt,
          prescribedBy: rx.prescribedBy,
          status: rx.status,
          isCurrentVisit: v.id === activeVisitId,
          lines: rx.lines.map((l) => ({
            id: l.id,
            itemId: l.itemId,
            itemName: l.itemName,
            dose: l.dose,
            frequency: l.frequency,
            durationDays: l.durationDays,
            unitPrice: l.unitPrice,
            totalPrice: l.totalPrice,
            paymentStatus: l.paymentStatus,
            status: l.status,
            dispensedAt: l.dispensedAt,
          })),
        }))
      );

      // Flatten past diagnoses across all visits
      const allDiagnoses = allVisits.flatMap((v) =>
        v.diagnoses.map((d) => ({
          id: d.id,
          visitId: v.id,
          visitType: v.type,
          visitDate: v.openedAt,
          diagnosedAt: d.diagnosedAt,
          diagnosedBy: d.diagnosedBy,
          icdCode: d.icdCode,
          description: d.description,
          notes: d.notes,
          isCurrentVisit: v.id === activeVisitId,
        }))
      );

      // Flatten past clinical and nursing notes across all visits
      const allNotes = allVisits.flatMap((v) =>
        v.notes.map((n) => ({
          id: n.id,
          visitId: v.id,
          visitType: v.type,
          visitDate: v.openedAt,
          createdAt: n.createdAt,
          authorId: n.authorId,
          noteType: n.noteType,
          chiefComplaint: n.chiefComplaint,
          history: n.history,
          examination: n.examination,
          assessment: n.assessment,
          plan: n.plan,
          isCurrentVisit: v.id === activeVisitId,
        }))
      );

      // Flatten past lab orders and results across all visits
      const allLabOrders = allVisits.flatMap((v) =>
        v.labOrders.map((lo) => ({
          id: lo.id,
          visitId: v.id,
          visitDate: v.openedAt,
          orderedAt: lo.orderedAt,
          testName: lo.testName,
          priority: lo.priority,
          status: lo.status,
          price: lo.price,
          paymentStatus: lo.paymentStatus,
          result: lo.result
            ? {
                enteredAt: lo.result.enteredAt,
                interpretation: lo.result.interpretation,
                resultsJson: lo.result.resultsJson,
              }
            : null,
          isCurrentVisit: v.id === activeVisitId,
        }))
      );

      // Flatten vitals history across all visits
      const allVitals = allVisits.flatMap((v) =>
        v.vitals.map((vit) => ({
          id: vit.id,
          visitId: v.id,
          recordedAt: vit.recordedAt,
          bpSystolic: vit.bpSystolic,
          bpDiastolic: vit.bpDiastolic,
          heartRate: vit.heartRate,
          temperature: vit.temperature,
          spo2: vit.spo2,
          weight: vit.weight,
          height: vit.height,
          isCurrentVisit: v.id === activeVisitId,
        }))
      );

      return {
        patient: {
          id: patient.id,
          nameEn: patient.nameEn,
          nameAm: patient.nameAm,
          healthId: patient.healthId,
          dob: patient.dob,
          sex: patient.sex,
          phone: patient.phone,
          kebele: patient.kebele,
          cbhiStatus: patient.cbhiStatus,
        },
        allergies: patient.allergies,
        activeAdmission: activeAdmission
          ? {
              id: activeAdmission.id,
              ward: activeAdmission.bed.ward,
              room: activeAdmission.bed.room,
              bedId: activeAdmission.bedId,
              tariffCode: activeAdmission.bed.tariffCode,
              dailyRate: activeAdmission.dailyRate,
              nursingDailyFee: activeAdmission.nursingDailyFee,
              admittedAt: activeAdmission.admittedAt,
              assignedNurseName: activeAdmission.assignedNurseName || "Unassigned",
              paymentStatus: activeAdmission.paymentStatus,
            }
          : null,
        totalVisits: allVisits.length,
        visits: allVisits.map((v) => ({
          id: v.id,
          type: v.type,
          status: v.status,
          openedAt: v.openedAt,
          closedAt: v.closedAt,
          ticketNumber: v.ticket?.ticketNumber || null,
          diagnosesCount: v.diagnoses.length,
          prescriptionsCount: v.prescriptions.length,
          labOrdersCount: v.labOrders.length,
          notesCount: v.notes.length,
          vitalsCount: v.vitals.length,
          isCurrentVisit: v.id === activeVisitId,
        })),
        allPrescriptions,
        allDiagnoses,
        allNotes,
        allLabOrders,
        allVitals,
      };
    }),

  // Update patient
  update: tenantProcedure
    .input(z.object({
      id: z.string(),
      nameEn: z.string().optional(),
      nameAm: z.string().optional(),
      phone: z.string().optional(),
      kebele: z.string().optional(),
      cbhiStatus: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return prisma.patient.update({
        where: { id, tenantId: ctx.tenantId },
        data,
      });
    }),

  // Add allergy
  addAllergy: tenantProcedure
    .input(z.object({
      patientId: z.string(),
      substance: z.string(),
      reaction: z.string().default(""),
      severity: z.string().default("moderate"),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify patient belongs to tenant
      await prisma.patient.findFirstOrThrow({ where: { id: input.patientId, tenantId: ctx.tenantId } });
      return prisma.allergy.create({ data: input });
    }),

  // Patient Take Card Online (Standard or VIP)
  takeCardOnline: publicProcedure
    .input(
      z.object({
        patientId: z.string().optional(),
        healthId: z.string().optional(),
        name: z.string().optional(),
        nameAm: z.string().optional(),
        phone: z.string().optional(),
        tier: z.enum(["standard", "vip"]).default("standard"),
        department: z.string().default("General OPD"),
        paymentMethod: z.enum(["telebirr", "cbe_birr", "cash"]).default("telebirr"),
        paymentReference: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const tenant = await prisma.tenant.findFirst();
      if (!tenant) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No active tenant found" });
      }

      let patient: any = null;
      if (input.patientId) {
        patient = await prisma.patient.findUnique({ where: { id: input.patientId } });
      } else if (input.healthId) {
        patient = await prisma.patient.findUnique({ where: { healthId: input.healthId } });
      } else if (input.phone) {
        const cleanPhone = input.phone.replace(/\D/g, "");
        if (cleanPhone) {
          patient = await prisma.patient.findFirst({
            where: { phone: { contains: cleanPhone } },
          });
        }
      }

      if (!patient) {
        const count = await prisma.patient.count({ where: { tenantId: tenant.id } });
        const healthId = generateHealthId(tenant.slug, count + 1);
        patient = await prisma.patient.create({
          data: {
            tenantId: tenant.id,
            healthId,
            nameEn: input.name || "Self-Registered Patient",
            nameAm: input.nameAm || "",
            dob: "1995-01-01",
            sex: "M",
            phone: input.phone || "",
            kebele: "Online Intake",
          },
        });
      }

      const isVip = input.tier === "vip";
      const priorityScore = isVip ? 10 : 0;
      const feeAmount = isVip
        ? (tenant.vipCardFeeAmount ?? 300)
        : (tenant.cardFeeAmount ?? 50);

      const visit = await prisma.visit.create({
        data: {
          tenantId: tenant.id,
          patientId: patient.id,
          type: "opd",
          status: "open",
        },
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayCount = await prisma.oPDTicket.count({
        where: { tenantId: tenant.id, issuedAt: { gte: today } },
      });
      const prefix = isVip ? "V" : "A";
      const ticketNumber = `${prefix}-${String(todayCount + 1).padStart(3, "0")}`;

      const isPaid = input.paymentMethod !== "cash";
      let receiptNumber = "";
      if (isPaid) {
        const rcCount = await prisma.paymentReceipt.count({ where: { tenantId: tenant.id } });
        receiptNumber = `RCP-${new Date().getFullYear()}-${String(rcCount + 1).padStart(5, "0")}`;

        await prisma.paymentReceipt.create({
          data: {
            tenantId: tenant.id,
            receiptNumber,
            patientId: patient.id,
            visitId: visit.id,
            category: isVip ? "card_fee_vip" : "card_fee",
            amount: feeAmount,
            paymentMethod: input.paymentMethod,
            collectedBy: "Online Self-Service",
            reference: input.paymentReference || `${input.paymentMethod.toUpperCase()}-WEB-${Date.now().toString(36)}`,
            notes: `Online ${isVip ? "VIP Fast-Track" : "Standard"} Card Fee for ${ticketNumber}`,
          },
        });
      }

      const qrToken = `ETH-${ticketNumber}-${Date.now().toString(36).toUpperCase()}`;

      const ticket = await prisma.oPDTicket.create({
        data: {
          tenantId: tenant.id,
          visitId: visit.id,
          ticketNumber,
          status: "waiting",
          tier: input.tier,
          channel: "online",
          priorityScore,
          qrToken,
          department: input.department,
          feeAmount,
          paymentStatus: isPaid ? "paid" : "unpaid",
          paidAt: isPaid ? new Date() : undefined,
          receiptNumber,
          paymentMethod: isPaid ? input.paymentMethod : "",
        },
      });

      return {
        success: true,
        patient: {
          id: patient.id,
          name: patient.nameEn,
          nameAm: patient.nameAm,
          healthId: patient.healthId,
        },
        visit,
        ticket,
        receiptNumber,
      };
    }),

  // Get Active Patient Journey & Radar Status
  activeJourney: publicProcedure
    .input(
      z.object({
        patientId: z.string().optional(),
        healthId: z.string().optional(),
        phone: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      let patient: any = null;
      if (input.patientId) {
        patient = await prisma.patient.findUnique({ where: { id: input.patientId } });
      } else if (input.healthId) {
        patient = await prisma.patient.findUnique({ where: { healthId: input.healthId } });
      } else if (input.phone) {
        const cleanPhone = input.phone.replace(/\D/g, "");
        if (cleanPhone) {
          patient = await prisma.patient.findFirst({
            where: { phone: { contains: cleanPhone } },
          });
        }
      }

      if (!patient) {
        patient = await prisma.patient.findFirst();
      }

      if (!patient) {
        return { hasActiveVisit: false, patient: null };
      }

      const visit = await prisma.visit.findFirst({
        where: {
          patientId: patient.id,
          status: { in: ["open", "triage", "consultation", "ready_for_billing"] },
        },
        orderBy: { openedAt: "desc" },
        include: {
          ticket: true,
          vitals: { orderBy: { recordedAt: "desc" } },
          diagnoses: true,
          notes: { orderBy: { createdAt: "desc" } },
          labOrders: { include: { result: true } },
          prescriptions: { include: { lines: true } },
          invoice: { include: { lines: true } },
          receipts: { orderBy: { createdAt: "desc" } },
        },
      });

      if (!visit || !visit.ticket) {
        return {
          hasActiveVisit: false,
          patient: {
            id: patient.id,
            name: patient.nameEn,
            nameAm: patient.nameAm,
            healthId: patient.healthId,
            phone: patient.phone,
            cbhi: patient.cbhiStatus,
          },
        };
      }

      // Calculate queue metrics
      const aheadCount = await prisma.oPDTicket.count({
        where: {
          tenantId: visit.tenantId,
          status: { in: ["waiting", "urgent"] },
          OR: [
            { priorityScore: { gt: visit.ticket.priorityScore } },
            {
              priorityScore: visit.ticket.priorityScore,
              issuedAt: { lt: visit.ticket.issuedAt },
            },
          ],
        },
      });

      const nowServing = await prisma.oPDTicket.findFirst({
        where: {
          tenantId: visit.tenantId,
          status: "being-seen",
        },
        orderBy: { calledAt: "desc" },
      });

      // Calculate stage index
      let stage = 1;
      let stageKey: "ticket" | "triage" | "consultation" | "lab" | "pharmacy" | "completed" = "ticket";

      const hasVitals = visit.vitals.length > 0;
      const hasNotesOrDiagnosis = visit.notes.length > 0 || visit.diagnoses.length > 0;
      const isBeingSeen = visit.ticket.status === "being-seen";
      const hasLabOrders = visit.labOrders.length > 0;
      const pendingLab = visit.labOrders.some((l) => l.status === "pending" || l.status === "in-progress");
      const hasPrescriptions = visit.prescriptions.length > 0;
      const pendingPrescription = visit.prescriptions.some((p) => p.status === "pending" || p.status === "unpaid");
      const isCompleted = visit.status === "completed" || visit.status === "ready_for_billing" || visit.ticket.status === "done";

      if (isCompleted) {
        stage = 6;
        stageKey = "completed";
      } else if (hasPrescriptions && (pendingPrescription || !hasLabOrders || !pendingLab)) {
        stage = 5;
        stageKey = "pharmacy";
      } else if (hasLabOrders && pendingLab) {
        stage = 4;
        stageKey = "lab";
      } else if (isBeingSeen || hasNotesOrDiagnosis) {
        stage = 3;
        stageKey = "consultation";
      } else if (hasVitals) {
        stage = 2;
        stageKey = "triage";
      } else {
        stage = 1;
        stageKey = "ticket";
      }

      return {
        hasActiveVisit: true,
        patient: {
          id: patient.id,
          name: patient.nameEn,
          nameAm: patient.nameAm,
          healthId: patient.healthId,
          phone: patient.phone,
          cbhi: patient.cbhiStatus,
        },
        visit: {
          id: visit.id,
          type: visit.type,
          status: visit.status,
          openedAt: visit.openedAt,
        },
        ticket: {
          id: visit.ticket.id,
          ticketNumber: visit.ticket.ticketNumber,
          tier: visit.ticket.tier,
          channel: visit.ticket.channel,
          priorityScore: visit.ticket.priorityScore,
          status: visit.ticket.status,
          department: visit.ticket.department,
          feeAmount: visit.ticket.feeAmount,
          paymentStatus: visit.ticket.paymentStatus,
          paymentMethod: visit.ticket.paymentMethod,
          receiptNumber: visit.ticket.receiptNumber,
          qrToken: visit.ticket.qrToken || `ETH-${visit.ticket.ticketNumber}`,
          issuedAt: visit.ticket.issuedAt,
        },
        queue: {
          aheadCount,
          nowServingTicket: nowServing?.ticketNumber || "None",
          estimatedWaitMinutes: Math.max(2, aheadCount * (visit.ticket.tier === "vip" ? 4 : 8)),
        },
        journey: {
          stage,
          stageKey,
          stages: [
            { id: 1, key: "ticket", label: "Card & Check-In", labelAm: "ካርድ እና መግቢያ", done: stage > 1, active: stage === 1 },
            { id: 2, key: "triage", label: "Triage & Vitals", labelAm: "ምልክቶች ምርመራ", done: stage > 2, active: stage === 2 },
            { id: 3, key: "consultation", label: "Doctor Consult", labelAm: "የዶክተር ምርመራ", done: stage > 3, active: stage === 3 },
            { id: 4, key: "lab", label: "Laboratory", labelAm: "ላቦራቶሪ", done: stage > 4, active: stage === 4, optional: !hasLabOrders },
            { id: 5, key: "pharmacy", label: "Pharmacy", labelAm: "ፋርማሲ", done: stage > 5, active: stage === 5, optional: !hasPrescriptions },
            { id: 6, key: "completed", label: "Summary & Exit", labelAm: "ማጠቃለያ", done: stage === 6, active: stage === 6 },
          ],
        },
        vitals: visit.vitals[0] || null,
        diagnoses: visit.diagnoses,
        notes: visit.notes[0] || null,
        labOrders: visit.labOrders.map((l) => ({
          id: l.id,
          testName: l.testName,
          status: l.status,
          price: l.price,
          result: l.result ? { interpretation: l.result.interpretation } : null,
        })),
        prescriptions: visit.prescriptions.map((p) => ({
          id: p.id,
          status: p.status,
          lines: p.lines.map((ln) => ({
            drugName: ln.itemName,
            dosage: ln.dose,
            frequency: ln.frequency,
            durationDays: ln.durationDays,
            unitPrice: ln.unitPrice,
          })),
        })),
        receipts: visit.receipts,
      };
    }),

  // Patient / Kiosk Check-In with QR Code or Ticket Number
  checkInWithQr: publicProcedure
    .input(z.object({ qrToken: z.string() }))
    .mutation(async ({ input }) => {
      const ticket = await prisma.oPDTicket.findFirst({
        where: {
          OR: [
            { qrToken: input.qrToken },
            { ticketNumber: input.qrToken },
          ],
        },
        include: {
          visit: { include: { patient: true } },
        },
      });

      if (!ticket) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invalid or expired ticket QR code." });
      }

      await prisma.oPDTicket.update({
        where: { id: ticket.id },
        data: {
          checkInAt: new Date(),
        },
      });

      return {
        success: true,
        patientName: ticket.visit.patient.nameEn,
        ticketNumber: ticket.ticketNumber,
        tier: ticket.tier,
      };
    }),
});
