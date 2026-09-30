// seed.ts — run with: npx tsx src/seed.ts
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../prisma/generated/client";

const DB_PATH = process.env.DATABASE_URL ?? "file:/home/yordanos/Desktop/clinic/my-better-t-app/local.db";
const adapter = new PrismaLibSql({ url: DB_PATH });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding Nova HMS database...");

  const tenant = await prisma.tenant.upsert({
    where: { slug: "dmrh" },
    update: {},
    create: {
      name: "Debre Markos Referral Hospital",
      slug: "dmrh",
      region: "Amhara",
      facilityType: "referral",
      plan: "full-clinical",
      status: "active",
    },
  });

  const userRows = [
    {
      id: "u-admin",
      name: "Hospital Admin",
      email: "admin@dmrh.gov.et",
      role: "Hospital Admin",
      department: "Administration",
      title: "Chief Executive Officer (CEO)",
      phone: "0911223344",
      licenseNumber: "ETH-ADM-001",
    },
    {
      id: "u-tigist",
      name: "Dr. Tigist Alemu",
      email: "tigist@dmrh.gov.et",
      role: "Doctor",
      department: "Internal Medicine",
      title: "Senior Consultant Physician",
      phone: "0912345678",
      licenseNumber: "ETH-MD-9821",
    },
    {
      id: "u-yonas",
      name: "Dr. Yonas Tesfaye",
      email: "yonas@dmrh.gov.et",
      role: "Doctor",
      department: "General OPD & Emergency",
      title: "Attending General Practitioner",
      phone: "0913456789",
      licenseNumber: "ETH-MD-1049",
    },
    {
      id: "u-mekdes",
      name: "Nurse Mekdes Alemu",
      email: "mekdes@dmrh.gov.et",
      role: "Nurse",
      department: "Ward A & Triage",
      title: "Head Clinical Nurse",
      phone: "0914567890",
      licenseNumber: "ETH-RN-4810",
    },
    {
      id: "u-girma",
      name: "Ato Girma Tadesse",
      email: "girma@dmrh.gov.et",
      role: "Receptionist",
      department: "Card Room & Reception",
      title: "Senior Admissions Officer",
      phone: "0915678901",
      licenseNumber: "EMP-REC-204",
    },
    {
      id: "u-hiwot",
      name: "W/ro Hiwot Bekele",
      email: "hiwot@dmrh.gov.et",
      role: "Billing Officer",
      department: "Finance & Cashier Office",
      title: "Chief Billing Officer",
      phone: "0916789012",
      licenseNumber: "EMP-BIL-118",
    },
    {
      id: "u-bereket",
      name: "Lab Tech Bereket Haile",
      email: "bereket@dmrh.gov.et",
      role: "Lab Technician",
      department: "Central Laboratory",
      title: "Senior Medical Laboratory Technologist",
      phone: "0917890123",
      licenseNumber: "ETH-MLT-3392",
    },
    {
      id: "u-selam",
      name: "Pharm. Selam Worku",
      email: "selam@dmrh.gov.et",
      role: "Pharmacist",
      department: "Main Pharmacy & Store",
      title: "Lead Clinical Pharmacist",
      phone: "0918901234",
      licenseNumber: "ETH-PH-7721",
    },
    {
      id: "u-solomon",
      name: "Ato Solomon Kebede",
      email: "solomon@dmrh.gov.et",
      role: "Referral Coordinator",
      department: "Liaison & Ambulance Desk",
      title: "Inter-Hospital Referral Liaison",
      phone: "0919012345",
      licenseNumber: "EMP-REF-309",
    },
  ];

  for (const u of userRows) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name },
      create: { id: u.id, name: u.name, email: u.email, emailVerified: false },
    });
    await prisma.userTenantRole.upsert({
      where: { userId_tenantId: { userId: u.id, tenantId: tenant.id } },
      update: {
        role: u.role,
        department: u.department,
        title: u.title,
        phone: u.phone,
        licenseNumber: u.licenseNumber,
        status: "active",
      },
      create: {
        userId: u.id,
        tenantId: tenant.id,
        role: u.role,
        department: u.department,
        title: u.title,
        phone: u.phone,
        licenseNumber: u.licenseNumber,
        status: "active",
      },
    });
  }

  // Role Permissions Matrix Defaults
  const defaultRolePermissions: Record<string, { permissions: string[]; description: string }> = {
    "Hospital Admin": {
      permissions: [
        "clinical.notes.view", "clinical.notes.create", "clinical.vitals.record", "clinical.referral.create",
        "lab.order.create", "lab.results.enter", "lab.results.approve",
        "rx.prescribe", "rx.dispense", "inventory.manage",
        "billing.view", "billing.collect", "billing.waiver.request", "billing.waiver.approve", "tariff.manage",
        "ward.admit", "ward.discharge", "ward.mar.administer",
        "admin.staff.manage", "admin.audit.view", "admin.reports.view"
      ],
      description: "Full administrative, financial, clinical, and security privileges across all hospital operations.",
    },
    "Doctor": {
      permissions: [
        "clinical.notes.view", "clinical.notes.create", "clinical.vitals.record", "clinical.referral.create",
        "lab.order.create",
        "rx.prescribe",
        "billing.view", "billing.waiver.request",
        "ward.admit", "ward.discharge",
        "admin.reports.view"
      ],
      description: "Comprehensive clinical care, diagnoses, patient assessments, lab requests, e-prescriptions, and hospital referrals.",
    },
    "Nurse": {
      permissions: [
        "clinical.notes.view", "clinical.vitals.record",
        "ward.admit", "ward.discharge", "ward.mar.administer"
      ],
      description: "Vital signs triage, nursing care notes, bed admissions, and medication administration (MAR).",
    },
    "Receptionist": {
      permissions: [
        "clinical.vitals.record", "clinical.referral.create",
        "billing.view", "billing.collect"
      ],
      description: "Patient registration, card room check-in, OPD queue assignment, and card fee collection.",
    },
    "Lab Technician": {
      permissions: [
        "clinical.notes.view",
        "lab.order.create", "lab.results.enter", "lab.results.approve"
      ],
      description: "Diagnostic specimen collection, sample processing, automated analyzers, and lab test results validation.",
    },
    "Pharmacist": {
      permissions: [
        "rx.dispense", "inventory.manage",
        "billing.view"
      ],
      description: "Prescription verification, drug dispensing, pharmaceutical inventory management, batches, and RRF requisition.",
    },
    "Billing Officer": {
      permissions: [
        "billing.view", "billing.collect", "billing.waiver.request",
        "admin.reports.view"
      ],
      description: "Centralized visit billing, cashier receipts, CBHI claims processing, and fee waiver submissions.",
    },
    "Referral Coordinator": {
      permissions: [
        "clinical.notes.view", "clinical.referral.create",
        "admin.reports.view"
      ],
      description: "Liaison for incoming and outgoing inter-facility patient referrals and ambulance coordination.",
    },
    "Ward Manager": {
      permissions: [
        "clinical.notes.view", "clinical.vitals.record",
        "ward.admit", "ward.discharge", "ward.mar.administer",
        "inventory.manage"
      ],
      description: "Inpatient bed allocation, ward admissions, nursing supervision, and ward sub-store stock management.",
    },
  };

  for (const [roleName, config] of Object.entries(defaultRolePermissions)) {
    await prisma.rolePermission.upsert({
      where: { tenantId_role: { tenantId: tenant.id, role: roleName } },
      update: {
        permissions: JSON.stringify(config.permissions),
        description: config.description,
      },
      create: {
        tenantId: tenant.id,
        role: roleName,
        permissions: JSON.stringify(config.permissions),
        description: config.description,
      },
    });
  }

  // Suppliers
  const supData = [
    { id: "sup-epsa", name: "EPSA", fullName: "Ethiopian Pharmaceutical Supply Agency", contact: "epsa@gov.et", phone: "011-551-7400", leadDays: 14 },
    { id: "sup-addis", name: "Addis Pharma", fullName: "Addis Pharmaceutical Factory", contact: "orders@addispharma.et", phone: "011-434-2200", leadDays: 7 },
    { id: "sup-unicef", name: "UNICEF Supply", fullName: "UNICEF Supply Division", contact: "supply@unicef.org", phone: "+45-35-27-35-27", leadDays: 30 },
  ];
  for (const s of supData) {
    await prisma.supplier.upsert({ where: { id: s.id }, update: {}, create: { ...s, tenantId: tenant.id } });
  }

  // Locations
  const locData = [
    { id: "loc-main", name: "Main Pharmacy Store", type: "pharmacy", managerId: "u-selam" },
    { id: "loc-warda", name: "Ward A Sub-Store", type: "ward", managerId: "u-mekdes" },
    { id: "loc-wardb", name: "Ward B Sub-Store", type: "ward" },
    { id: "loc-emerg", name: "Emergency Store", type: "emergency" },
  ];
  for (const l of locData) {
    await prisma.inventoryLocation.upsert({ where: { id: l.id }, update: {}, create: { ...l, tenantId: tenant.id } });
  }

  // Inventory items
  const itemData = [
    { id: "item-amox", name: "Amoxicillin 500mg caps", category: "Antibiotic", uomBase: "cap", uomBox: "box", uomBoxQty: 100, rop: 500, maxLevel: 2000, supplierId: "sup-epsa", status: "ok" },
    { id: "item-met", name: "Metformin 500mg tabs", category: "Antidiabetic", uomBase: "tab", uomBox: "strip", uomBoxQty: 10, rop: 400, maxLevel: 1500, supplierId: "sup-addis", status: "low" },
    { id: "item-al", name: "Artemether/Lumefantrine 80/480mg", category: "Antimalarial", uomBase: "tab", uomBox: "pack", uomBoxQty: 24, rop: 200, maxLevel: 800, supplierId: "sup-epsa", status: "critical" },
    { id: "item-pcm", name: "Paracetamol 500mg tabs", category: "Analgesic", uomBase: "tab", uomBox: "bottle", uomBoxQty: 1000, rop: 1000, maxLevel: 5000, supplierId: "sup-epsa", status: "ok" },
    { id: "item-ors", name: "ORS Sachets", category: "Rehydration", uomBase: "sachet", uomBox: "box", uomBoxQty: 50, rop: 300, maxLevel: 1000, supplierId: "sup-unicef", status: "low" },
    { id: "item-ns", name: "IV Normal Saline 1L", category: "IV Fluid", uomBase: "bag", uomBox: "carton", uomBoxQty: 12, rop: 80, maxLevel: 300, supplierId: "sup-addis", status: "critical" },
  ];
  for (const item of itemData) {
    await prisma.inventoryItem.upsert({ where: { id: item.id }, update: {}, create: { ...item, tenantId: tenant.id } });
  }

  // Batches + location stock
  const batchData = [
    { id: "bat-amox1", itemId: "item-amox", lotNumber: "AMX-2024-0881", qty: 800, expiryDate: "2027-06-30", receivedDate: "2024-11-10", locationId: "loc-main", supplierId: "sup-epsa" },
    { id: "bat-met1", itemId: "item-met", lotNumber: "MET-2024-0445", qty: 380, expiryDate: "2027-03-15", receivedDate: "2024-09-05", locationId: "loc-main", supplierId: "sup-addis" },
    { id: "bat-al1", itemId: "item-al", lotNumber: "AL-2025-0033", qty: 92, expiryDate: "2026-12-01", receivedDate: "2025-01-15", locationId: "loc-main", supplierId: "sup-epsa" },
    { id: "bat-pcm1", itemId: "item-pcm", lotNumber: "PCM-2024-1200", qty: 3400, expiryDate: "2028-01-20", receivedDate: "2024-08-01", locationId: "loc-main", supplierId: "sup-epsa" },
    { id: "bat-ors1", itemId: "item-ors", lotNumber: "ORS-2025-0010", qty: 250, expiryDate: "2027-09-10", receivedDate: "2025-06-01", locationId: "loc-main", supplierId: "sup-unicef" },
    { id: "bat-ns1", itemId: "item-ns", lotNumber: "NS-2025-0088", qty: 45, expiryDate: "2026-11-30", receivedDate: "2025-04-20", locationId: "loc-main", supplierId: "sup-addis" },
  ];
  for (const b of batchData) {
    await prisma.inventoryBatch.upsert({ where: { id: b.id }, update: {}, create: { ...b, tenantId: tenant.id } });
    await prisma.locationStock.upsert({
      where: { itemId_locationId: { itemId: b.itemId, locationId: b.locationId } },
      update: {},
      create: { itemId: b.itemId, locationId: b.locationId, tenantId: tenant.id, qty: b.qty },
    });
  }

  // Patients
  const patientData = [
    { id: "pat-p1", healthId: "DMH-00123", nameEn: "Abebe Kebede", nameAm: "አበበ ከበደ", dob: "1985-03-12", sex: "M", phone: "0911234567", kebele: "Kebele 03", cbhiStatus: true },
    { id: "pat-p2", healthId: "DMH-00456", nameEn: "Tigist Worku", nameAm: "ትግስት ወርቁ", dob: "1992-07-22", sex: "F", phone: "0922345678", kebele: "Kebele 07", cbhiStatus: false },
    { id: "pat-p3", healthId: "DMH-00789", nameEn: "Mulugeta Haile", nameAm: "ሙሉጌታ ሃይሌ", dob: "1975-11-04", sex: "M", phone: "0933456789", kebele: "Kebele 01", cbhiStatus: true },
    { id: "pat-p4", healthId: "DMH-01012", nameEn: "Birtukan Tadesse", nameAm: "ብርቱካን ታደሰ", dob: "2001-01-30", sex: "F", phone: "0944567890", kebele: "Kebele 12", cbhiStatus: true },
    { id: "pat-p5", healthId: "DMH-01345", nameEn: "Dawit Bekele", nameAm: "ዳዊት በቀለ", dob: "1968-09-15", sex: "M", phone: "0955678901", kebele: "Kebele 05", cbhiStatus: false },
    { id: "pat-p6", healthId: "DMH-01678", nameEn: "Selamawit Girma", nameAm: "ሰላማዊት ግርማ", dob: "1998-05-08", sex: "F", phone: "0966789012", kebele: "Kebele 09", cbhiStatus: true },
  ];
  for (const p of patientData) {
    await prisma.patient.upsert({ where: { healthId: p.healthId }, update: {}, create: { ...p, tenantId: tenant.id } });
  }

  // Beds
  const bedData = [
    { id: "bed-a1", ward: "Ward A", room: "101", status: "occupied" },
    { id: "bed-a2", ward: "Ward A", room: "101", status: "occupied" },
    { id: "bed-a3", ward: "Ward A", room: "102", status: "available" },
    { id: "bed-a4", ward: "Ward A", room: "102", status: "maintenance" },
    { id: "bed-b1", ward: "Ward B", room: "201", status: "occupied" },
    { id: "bed-b2", ward: "Ward B", room: "201", status: "available" },
    { id: "bed-b3", ward: "Ward B", room: "202", status: "available" },
    { id: "bed-m1", ward: "Maternity", room: "301", status: "occupied" },
  ];
  for (const b of bedData) {
    await prisma.bed.upsert({ where: { id: b.id }, update: {}, create: { ...b, tenantId: tenant.id } });
  }

  // Visits + OPD tickets
  const visitData = [
    { id: "visit-p1", patientId: "pat-p1", type: "opd", status: "open", ticket: "A-001", ticketStatus: "being-seen", paymentStatus: "cbhi_covered", fee: 50 },
    { id: "visit-p2", patientId: "pat-p2", type: "opd", status: "ready_for_billing", ticket: "A-002", ticketStatus: "done", paymentStatus: "paid", fee: 50, receiptNumber: "RCP-2026-00001", paymentMethod: "telebirr" },
    { id: "visit-p3", patientId: "pat-p3", type: "opd", status: "open", ticket: "A-003", ticketStatus: "waiting", paymentStatus: "cbhi_covered", fee: 50 },
    { id: "visit-p4", patientId: "pat-p4", type: "opd", status: "open", ticket: "A-004", ticketStatus: "done", paymentStatus: "cbhi_covered", fee: 50 },
    { id: "visit-p5", patientId: "pat-p5", type: "opd", status: "ready_for_billing", ticket: "A-005", ticketStatus: "done", paymentStatus: "unpaid", fee: 50 },
    { id: "visit-p6", patientId: "pat-p6", type: "emergency", status: "open", ticket: "E-001", ticketStatus: "urgent", paymentStatus: "emergency_exempt", fee: 100 },
  ];
  for (const v of visitData) {
    await prisma.visit.upsert({ where: { id: v.id }, update: { status: v.status }, create: { id: v.id, tenantId: tenant.id, patientId: v.patientId, type: v.type, status: v.status } });
    await prisma.oPDTicket.upsert({
      where: { visitId: v.id },
      update: {
        paymentStatus: v.paymentStatus,
        feeAmount: v.fee,
        receiptNumber: v.receiptNumber ?? "",
        paymentMethod: v.paymentMethod ?? (v.paymentStatus === "cbhi_covered" ? "cbhi" : ""),
        paidAt: v.paymentStatus === "paid" ? new Date() : undefined,
      },
      create: {
        tenantId: tenant.id,
        visitId: v.id,
        ticketNumber: v.ticket,
        status: v.ticketStatus,
        paymentStatus: v.paymentStatus,
        feeAmount: v.fee,
        receiptNumber: v.receiptNumber ?? "",
        paymentMethod: v.paymentMethod ?? (v.paymentStatus === "cbhi_covered" ? "cbhi" : ""),
        paidAt: v.paymentStatus === "paid" ? new Date() : undefined,
      },
    });
  }

  // Sample receipts for paid card fee
  await prisma.paymentReceipt.upsert({
    where: { receiptNumber: "RCP-2026-00001" },
    update: {},
    create: {
      tenantId: tenant.id,
      receiptNumber: "RCP-2026-00001",
      patientId: "pat-p2",
      visitId: "visit-p2",
      category: "card_fee",
      amount: 50,
      paymentMethod: "telebirr",
      collectedBy: "u-girma",
      reference: "TLB-998241",
      notes: "Card Fee for Ticket A-002",
    },
  });

  // Lab orders
  const labData = [
    { id: "lo-001", visitId: "visit-p1", orderedBy: "u-tigist", testName: "CBC (Complete Blood Count)", priority: "routine", status: "pending", price: 150, paymentStatus: "cbhi_covered" },
    { id: "lo-002", visitId: "visit-p6", orderedBy: "u-yonas", testName: "Malaria RDT", priority: "urgent", status: "in-progress", price: 80, paymentStatus: "emergency_exempt" },
    { id: "lo-003", visitId: "visit-p3", orderedBy: "u-tigist", testName: "Fasting Blood Sugar", priority: "routine", status: "completed", price: 90, paymentStatus: "cbhi_covered" },
    { id: "lo-004", visitId: "visit-p2", orderedBy: "u-yonas", testName: "Urinalysis", priority: "routine", status: "completed", price: 70, paymentStatus: "unpaid" },
  ];
  for (const l of labData) {
    await prisma.labOrder.upsert({
      where: { id: l.id },
      update: {
        price: l.price,
        paymentStatus: l.paymentStatus,
        receiptNumber: l.receiptNumber ?? "",
        paymentMethod: l.paymentMethod ?? "",
        paidAt: l.paymentStatus === "paid" ? new Date() : undefined,
      },
      create: { ...l, tenantId: tenant.id },
    });
  }

  // Prescriptions
  await prisma.prescription.upsert({
    where: { id: "rx-001" },
    update: {},
    create: {
      id: "rx-001", tenantId: tenant.id, visitId: "visit-p1", prescribedBy: "u-tigist", status: "pending",
      lines: {
        create: [{
          itemId: "item-amox", itemName: "Amoxicillin 500mg caps", dose: "1 cap", frequency: "3x daily", durationDays: 7,
          unitPrice: 45, totalPrice: 90, paymentStatus: "cbhi_covered",
        }],
      },
    },
  });
  await prisma.prescription.upsert({
    where: { id: "rx-002" },
    update: {},
    create: {
      id: "rx-002", tenantId: tenant.id, visitId: "visit-p3", prescribedBy: "u-tigist", status: "dispensed",
      lines: {
        create: [{
          itemId: "item-met", itemName: "Metformin 500mg tabs", dose: "1 tab", frequency: "2x daily", durationDays: 30, status: "dispensed",
          unitPrice: 30, totalPrice: 60, paymentStatus: "cbhi_covered",
        }],
      },
    },
  });
  await prisma.prescription.upsert({
    where: { id: "rx-003" },
    update: {},
    create: {
      id: "rx-003", tenantId: tenant.id, visitId: "visit-p2", prescribedBy: "u-yonas", status: "pending",
      lines: {
        create: [{
          itemId: "item-amox", itemName: "Amoxicillin 500mg caps", dose: "1 cap", frequency: "3x daily", durationDays: 5,
          unitPrice: 45, totalPrice: 90, paymentStatus: "unpaid",
        }],
      },
    },
  });

  // Appointments
  const aptData = [
    { id: "apt-001", patientId: "pat-p1", doctor: "Dr. Tigist Alemu", dept: "Internal Medicine", date: "2026-09-08", time: "09:00", status: "scheduled" },
    { id: "apt-002", patientId: "pat-p2", doctor: "Dr. Yonas Tesfaye", dept: "OPD", date: "2026-09-06", time: "10:30", status: "scheduled" },
    { id: "apt-003", patientId: "pat-p5", doctor: "Dr. Tigist Alemu", dept: "Internal Medicine", date: "2026-09-10", time: "11:00", status: "scheduled" },
  ];
  for (const a of aptData) {
    await prisma.appointment.upsert({ where: { id: a.id }, update: {}, create: { ...a, tenantId: tenant.id } });
  }

  // Referrals
  const refData = [
    { id: "ref-001", visitId: "visit-p3", patientId: "pat-p3", fromFacility: "Debre Markos Referral Hospital", toFacility: "Tikur Anbessa Specialized Hospital", reason: "Cardiac evaluation", clinicalSummary: "Patient presents with chest pain and shortness of breath. ECG shows ST changes. Requires specialist cardiac evaluation and possible intervention.", urgency: "urgent", type: "out", status: "in-transit", createdBy: "u-tigist" },
    { id: "ref-002", visitId: "visit-p4", patientId: "pat-p4", fromFacility: "Motta Primary Hospital", toFacility: "Debre Markos Referral Hospital", reason: "High-risk obstetric case", clinicalSummary: "Primigravida at 38 weeks with pre-eclampsia. BP 160/110. Requires obstetric specialist care and possible emergency delivery.", urgency: "urgent", type: "in", status: "arrived", createdBy: "u-solomon" },
  ];
  for (const r of refData) {
    await prisma.referral.upsert({ where: { id: r.id }, update: {}, create: { ...r, tenantId: tenant.id } });
  }

  // Notifications
  await prisma.notification.createMany({
    data: [
      { tenantId: tenant.id, userId: "u-tigist", type: "in-app", title: "Lab result ready", body: "CBC for Abebe Kebede is ready." },
      { tenantId: tenant.id, userId: "u-hiwot", type: "in-app", title: "CBHI claim approved", body: "Claim approved. ETB 320." },
      { tenantId: tenant.id, userId: "u-selam", type: "in-app", title: "Low stock alert", body: "Artemether/Lumefantrine below reorder point." },
      { tenantId: tenant.id, userId: "u-solomon", type: "in-app", title: "Referral arrived", body: "Patient Birtukan Tadesse has arrived from Motta Primary Hospital." },
    ],
  });

  // Audit logs
  await prisma.auditLog.createMany({
    data: [
      { tenantId: tenant.id, userId: "u-tigist", action: "Viewed patient record", entity: "Patient", entityId: "pat-p3", ipAddress: "192.168.1.14" },
      { tenantId: tenant.id, userId: "u-girma", action: "Registered new patient", entity: "Patient", entityId: "pat-p6", ipAddress: "192.168.1.8" },
      { tenantId: tenant.id, userId: "u-hiwot", action: "Created invoice", entity: "Invoice", ipAddress: "192.168.1.22" },
      { tenantId: tenant.id, userId: "u-bereket", action: "Entered lab result", entity: "LabOrder", entityId: "lo-003", ipAddress: "192.168.1.30" },
      { tenantId: tenant.id, userId: "u-selam", action: "Dispensed medication", entity: "Prescription", entityId: "rx-002", ipAddress: "192.168.1.18" },
    ],
  });

  // Hospital Service Tariffs & Prices (Admin Configured)
  const tariffData = [
    // Registration & OPD
    { code: "OPD_REG_GENERAL", name: "General OPD Card & Registration", category: "registration", department: "Card Room", price: 50.0, description: "Standard ticket fee collected at reception" },
    { code: "OPD_REG_EMERGENCY", name: "Emergency Triage & Registration", category: "registration", department: "Emergency", price: 100.0, description: "Emergency department initial intake and rapid triage" },
    { code: "OPD_REG_FOLLOWUP", name: "Follow-up / Chronic Care Registration", category: "registration", department: "Card Room", price: 30.0, description: "Follow-up check-in for chronic illness patients" },
    // Consultations
    { code: "CONSULT_GENERAL", name: "General Practitioner Consultation", category: "consultation", department: "General OPD", price: 80.0, description: "General clinical examination and diagnosis" },
    { code: "CONSULT_SPECIALIST", name: "Specialist Physician Consultation", category: "consultation", department: "Specialist Clinic", price: 150.0, description: "Senior consultant/specialist assessment" },
    { code: "CONSULT_EMERGENCY", name: "Emergency Resuscitation & Clinical Care", category: "consultation", department: "Emergency", price: 200.0, description: "Emergency physician acute stabilization" },
    // Laboratory Diagnostics
    { code: "LAB_CBC", name: "CBC (Complete Blood Count)", category: "lab", department: "Laboratory", price: 150.0, description: "Full automated complete blood count" },
    { code: "LAB_MALARIA", name: "Malaria RDT", category: "lab", department: "Laboratory", price: 80.0, description: "Rapid diagnostic test for malaria antigen" },
    { code: "LAB_FBS", name: "Fasting Blood Sugar", category: "lab", department: "Laboratory", price: 90.0, description: "Glucose fasting serum test" },
    { code: "LAB_HBA1C", name: "HbA1c", category: "lab", department: "Laboratory", price: 300.0, description: "Glycated hemoglobin 3-month monitor" },
    { code: "LAB_URINE", name: "Urinalysis", category: "lab", department: "Laboratory", price: 70.0, description: "Dipstick and microscopic urinalysis" },
    { code: "LAB_LIPID", name: "Lipid Profile", category: "lab", department: "Laboratory", price: 220.0, description: "Total cholesterol, HDL, LDL, Triglycerides" },
    { code: "LAB_LFT", name: "Liver Function Tests", category: "lab", department: "Laboratory", price: 250.0, description: "ALT, AST, ALP, Bilirubin total and direct" },
    { code: "LAB_RFT", name: "Renal Function Tests", category: "lab", department: "Laboratory", price: 200.0, description: "Serum creatinine, urea, BUN, electrolytes" },
    { code: "LAB_TSH", name: "Thyroid Function (TSH)", category: "lab", department: "Laboratory", price: 280.0, description: "Serum thyroid stimulating hormone" },
    { code: "LAB_HIV", name: "HIV Rapid Test", category: "lab", department: "Laboratory", price: 50.0, description: "Rapid antibody screening" },
    { code: "LAB_HBSAG", name: "Hepatitis B Surface Antigen", category: "lab", department: "Laboratory", price: 120.0, description: "HBsAg screening" },
    { code: "LAB_WIDAL", name: "Widal Test", category: "lab", department: "Laboratory", price: 110.0, description: "Enteric fever slide agglutination" },
    { code: "LAB_STOOL", name: "Stool Examination", category: "lab", department: "Laboratory", price: 60.0, description: "Direct wet mount and concentration" },
    { code: "LAB_SPUTUM", name: "Sputum AFB (TB)", category: "lab", department: "Laboratory", price: 75.0, description: "Acid-fast bacilli smear for tuberculosis" },
    // Radiology & Procedures
    { code: "RAD_XRAY_CHEST", name: "Chest X-Ray", category: "procedure", department: "Radiology", price: 250.0, description: "Standard posteroanterior or anteroposterior chest radiograph" },
    { code: "RAD_ULTRASOUND_ABD", name: "Abdominal Ultrasound", category: "procedure", department: "Radiology", price: 350.0, description: "Real-time B-mode abdominal sonography" },
    { code: "PROC_ECG", name: "12-Lead ECG", category: "procedure", department: "Cardiology", price: 180.0, description: "Diagnostic electrocardiography" },
    { code: "PROC_WOUND_DRESS", name: "Wound Dressing & Minor Care", category: "procedure", department: "Nursing", price: 80.0, description: "Antiseptic cleaning, debridement and sterile bandage" },
    { code: "PROC_SUTURING", name: "Laceration Suturing & Repair", category: "procedure", department: "Minor OR", price: 200.0, description: "Primary wound closure under local anesthetic" },
    { code: "PROC_CATHETER", name: "Catheterization", category: "procedure", department: "Nursing", price: 120.0, description: "Sterile Foley catheter insertion" },
    { code: "PROC_IV_CANNULA", name: "IV Cannulation & Therapy", category: "procedure", department: "Nursing", price: 60.0, description: "Peripheral intravenous line placement" },
    { code: "PROC_NEBULIZATION", name: "Nebulization Session", category: "procedure", department: "OPD", price: 90.0, description: "Aerosolized bronchodilator delivery" },
    // Inpatient & Ward Beds
    { code: "BED_GEN_WARD", name: "General Ward Bed (per day)", category: "inpatient", department: "Ward", price: 120.0, description: "Standard multi-bed inpatient ward bed" },
    { code: "BED_SEMI_PRIVATE", name: "Semi-Private Room Bed (per day)", category: "inpatient", department: "Ward", price: 250.0, description: "Two-bed semi-private room" },
    { code: "BED_PRIVATE", name: "Private Room Bed (per day)", category: "inpatient", department: "Ward", price: 500.0, description: "Single-bed private room with amenities" },
    { code: "BED_ICU", name: "ICU Bed (per day)", category: "inpatient", department: "ICU", price: 950.0, description: "Intensive care bed with continuous monitoring" },
    { code: "CARE_NURSING_DAILY", name: "Daily Inpatient Nursing Care", category: "inpatient", department: "Nursing", price: 70.0, description: "Daily inpatient round-the-clock nursing" },
    // Pharmacy & Medications
    { code: "DRUG_AMOX", name: "Amoxicillin 500mg caps", category: "pharmacy", department: "Pharmacy", price: 45.0, description: "Oral broad-spectrum penicillin" },
    { code: "DRUG_MET", name: "Metformin 500mg tabs", category: "pharmacy", department: "Pharmacy", price: 30.0, description: "Biguanide antihyperglycemic" },
    { code: "DRUG_AL", name: "Artemether/Lumefantrine 80/480mg", category: "pharmacy", department: "Pharmacy", price: 65.0, description: "First-line ACT antimalarial" },
    { code: "DRUG_PCM", name: "Paracetamol 500mg tabs", category: "pharmacy", department: "Pharmacy", price: 15.0, description: "Analgesic and antipyretic" },
    { code: "DRUG_ORS", name: "ORS Sachets", category: "pharmacy", department: "Pharmacy", price: 20.0, description: "Oral rehydration salts formula" },
    { code: "DRUG_NS", name: "IV Normal Saline 1L", category: "pharmacy", department: "Pharmacy", price: 85.0, description: "0.9% Sodium Chloride IV infusion" },
    { code: "DRUG_CIPRO", name: "Ciprofloxacin 500mg", category: "pharmacy", department: "Pharmacy", price: 55.0, description: "Fluoroquinolone antibiotic" },
    { code: "DRUG_OMEP", name: "Omeprazole 20mg", category: "pharmacy", department: "Pharmacy", price: 40.0, description: "Proton pump inhibitor" },
  ];

  for (const t of tariffData) {
    await prisma.hospitalServiceTariff.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: t.code } },
      update: {
        name: t.name,
        category: t.category,
        department: t.department,
        price: t.price,
        description: t.description,
        isActive: true,
      },
      create: {
        tenantId: tenant.id,
        code: t.code,
        name: t.name,
        category: t.category,
        department: t.department,
        price: t.price,
        description: t.description,
        isActive: true,
      },
    });
  }

  console.log("✅ Seed complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
