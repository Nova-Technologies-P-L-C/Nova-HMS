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
    { id: "u-admin", name: "Hospital Admin", email: "admin@dmrh.gov.et", role: "Hospital Admin" },
    { id: "u-tigist", name: "Dr. Tigist Alemu", email: "tigist@dmrh.gov.et", role: "Doctor" },
    { id: "u-yonas", name: "Dr. Yonas Tesfaye", email: "yonas@dmrh.gov.et", role: "Doctor" },
    { id: "u-mekdes", name: "Nurse Mekdes Alemu", email: "mekdes@dmrh.gov.et", role: "Nurse" },
    { id: "u-girma", name: "Ato Girma Tadesse", email: "girma@dmrh.gov.et", role: "Receptionist" },
    { id: "u-hiwot", name: "W/ro Hiwot Bekele", email: "hiwot@dmrh.gov.et", role: "Billing Officer" },
    { id: "u-bereket", name: "Lab Tech Bereket Haile", email: "bereket@dmrh.gov.et", role: "Lab Technician" },
    { id: "u-selam", name: "Pharm. Selam Worku", email: "selam@dmrh.gov.et", role: "Pharmacist" },
    { id: "u-solomon", name: "Ato Solomon Kebede", email: "solomon@dmrh.gov.et", role: "Referral Coordinator" },
  ];

  for (const u of userRows) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { id: u.id, name: u.name, email: u.email, emailVerified: false },
    });
    await prisma.userTenantRole.upsert({
      where: { userId_tenantId: { userId: u.id, tenantId: tenant.id } },
      update: {},
      create: { userId: u.id, tenantId: tenant.id, role: u.role },
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

  console.log("✅ Seed complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
