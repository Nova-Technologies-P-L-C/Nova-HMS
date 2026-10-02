"use client";
/**
 * Nova HMS — In-Memory Patient Flow Store (PROTOTYPE ONLY)
 * ─────────────────────────────────────────────────────────
 * ⚠ DEPRECATION WARNING: This store is a prototype scaffold ONLY.
 *   It exists so the UI can be developed and demoed without a running server.
 *
 *   DO NOT use this store in production. It has the following critical problems:
 *   1. ALL state is lost on page refresh — nothing is persisted to the database.
 *   2. Multiple browser tabs / concurrent users each get a completely separate state.
 *   3. Receipt numbers, ticket numbers, and IDs are local counters — they will
 *      collide with real database records when tRPC is wired.
 *   4. Any action in this store (admit, dispense, invoice, approve waiver) creates
 *      NO audit log, NO notification, and NO database record.
 *
 * MIGRATION STATUS:
 *   Most production pages have already been migrated to tRPC:
 *     ✅ Patient registration   → trpc.patient.register
 *     ✅ OPD queue              → trpc.visit.queue / openVisit
 *     ✅ Triage/vitals          → trpc.visit.recordVitals
 *     ✅ Consultation           → trpc.visit.addNote + addDiagnosis + transferToBilling
 *     ✅ Lab orders             → trpc.lab.order / queue / enterResult
 *     ✅ Prescriptions          → trpc.prescription.create / dispense
 *     ✅ Pharmacy queue         → trpc.prescription.queue / payPrescription
 *     ✅ Billing / cashier      → trpc.billing.collectCashierPayment
 *     ✅ Ward / beds            → trpc.ward.beds / admit / discharge
 *     ✅ Referrals              → trpc.referral.create / list (UI still uses mock — see referral/page.tsx)
 *
 *   Pages still using this store (TODO: migrate before go-live):
 *     ⏳ hospital-admin/fee-waivers  (approve/reject not persisted)
 *     ⏳ shared/search               (searches mock PATIENTS not DB)
 *     ⏳ reception/kiosk             (no real visit created on check-in)
 *     ⏳ pharmacy/expiry             (reads BATCHES mock)
 *     ⏳ pharmacy/locations          (transfer not persisted)
 *     ⏳ pharmacy/forecast           (reads CONSUMPTION_HISTORY mock)
 *     ⏳ hospital-admin/reports      (all KPIs are hardcoded numbers)
 *     ⏳ doctor/referral             (submit doesn't call API)
 *     ⏳ patient/* portal pages      (all patient self-service data is mock)
 *     ⏳ nova-admin/* pages          (all platform data is mock)
 *
 * NovaStoreProvider is kept in layout.tsx so existing prototype pages that
 * still reference it do not crash. Remove it from layout.tsx only after
 * ALL consumers have been migrated to tRPC.
 */
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import {
  PATIENTS, OPD_QUEUE, LAB_ORDERS, PRESCRIPTIONS, REFERRALS,
  BEDS, BILLING_INVOICES, CBHI_CLAIMS, FEE_WAIVERS, NOTIFICATIONS,
  VITALS, DIAGNOSES, APPOINTMENTS, AUDIT_LOG,
  type Role,
} from "./nova-mock-data";

// ─── Types ────────────────────────────────────────────────────────────────────

export type QueueItem = {
  ticket: string;
  patientId: string;
  name: string;
  waitMins: number;
  status: "waiting" | "being-seen" | "done" | "urgent" | "triage-done";
  doctor: string | null;
  triageDone?: boolean;
  vitalsRecorded?: boolean;
};

export type LabOrder = {
  id: string;
  patientId: string;
  patient: string;
  test: string;
  orderedBy: string;
  ordered: string;
  status: "pending" | "in-progress" | "completed";
  priority: "routine" | "urgent";
  result?: string;
  resultClassification?: string;
};

export type Prescription = {
  id: string;
  patientId: string;
  patient: string;
  drug: string;
  dose: string;
  freq: string;
  days: number;
  prescribedBy: string;
  date: string;
  status: "pending" | "dispensed";
};

export type Referral = {
  id: string;
  patient: string;
  patientId?: string;
  from: string;
  to: string;
  reason: string;
  date: string;
  status: "pending" | "in-transit" | "arrived";
  type: "in" | "out";
  urgency?: string;
};

export type Bed = {
  id: string;
  ward: string;
  room: string;
  status: "occupied" | "available" | "maintenance";
  patient: string | null;
  patientId?: string | null;
  since: string | null;
};

export type Invoice = {
  id: string;
  patientId: string;
  patient: string;
  date: string;
  services: string[];
  total: number;
  cbhi: boolean;
  status: "paid" | "pending" | "waiver-requested";
};

export type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
};

// ─── Store shape ──────────────────────────────────────────────────────────────

interface NovaStore {
  // Active patient being worked on (carries across pages)
  activePatientId: string | null;
  setActivePatientId: (id: string | null) => void;

  // OPD Queue
  queue: QueueItem[];
  addToQueue: (patientId: string, name: string) => string; // returns ticket
  updateQueueStatus: (ticket: string, status: QueueItem["status"]) => void;
  markTriage: (ticket: string) => void;

  // Lab orders
  labOrders: LabOrder[];
  addLabOrder: (patientId: string, patient: string, tests: string[], priority: string, orderedBy: string) => void;
  updateLabStatus: (id: string, status: LabOrder["status"]) => void;
  enterLabResult: (id: string, result: string, classification: string) => void;

  // Prescriptions
  prescriptions: Prescription[];
  addPrescription: (rx: Omit<Prescription, "id" | "status">) => void;
  dispensePrescription: (id: string) => void;

  // Referrals
  referrals: Referral[];
  addReferral: (ref: Omit<Referral, "id">) => void;
  updateReferralStatus: (id: string, status: Referral["status"]) => void;

  // Beds
  beds: Bed[];
  admitPatient: (bedId: string, patientId: string, name: string) => void;
  dischargePatient: (bedId: string) => void;
  updateBedStatus: (bedId: string, status: Bed["status"]) => void;

  // Invoices
  invoices: Invoice[];
  addInvoice: (inv: Omit<Invoice, "id">) => void;
  markInvoicePaid: (id: string) => void;
  requestWaiver: (id: string) => void;

  // CBHI claims
  cbhiClaims: typeof CBHI_CLAIMS;
  resubmitClaim: (id: string) => void;

  // Fee waivers
  feeWaivers: typeof FEE_WAIVERS;
  approveWaiver: (id: string) => void;
  rejectWaiver: (id: string) => void;

  // Notifications
  notifications: Notification[];
  addNotification: (n: Omit<Notification, "id" | "read">) => void;
  markNotificationRead: (id: string) => void;
  markAllRead: () => void;

  // Audit log
  auditLog: typeof AUDIT_LOG;
  logAction: (user: string, action: string, target: string) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const NovaStoreCtx = createContext<NovaStore | null>(null);

let ticketCounter = 8; // continuing from mock A-001..A-006
let orderCounter = 5;
let rxCounter = 4;
let refCounter = 4;
let invCounter = 894;
let notifCounter = 6;

export function NovaStoreProvider({ children }: { children: ReactNode }) {
  const [activePatientId, setActivePatientId] = useState<string | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>(OPD_QUEUE.map((q) => ({ ...q })) as QueueItem[]);
  const [labOrders, setLabOrders] = useState<LabOrder[]>(LAB_ORDERS.map((o) => ({ ...o })) as LabOrder[]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>(PRESCRIPTIONS.map((p) => ({ ...p })) as Prescription[]);
  const [referrals, setReferrals] = useState<Referral[]>(REFERRALS.map((r) => ({ ...r, urgency: "routine" })) as Referral[]);
  const [beds, setBeds] = useState<Bed[]>(BEDS.map((b) => ({ ...b })) as Bed[]);
  const [invoices, setInvoices] = useState<Invoice[]>(BILLING_INVOICES.map((i) => ({ ...i })) as Invoice[]);
  const [cbhiClaims, setCbhiClaims] = useState(CBHI_CLAIMS.map((c) => ({ ...c })));
  const [feeWaivers, setFeeWaivers] = useState(FEE_WAIVERS.map((w) => ({ ...w })));
  const [notifications, setNotifications] = useState<Notification[]>(NOTIFICATIONS.map((n) => ({ ...n })));
  const [auditLog, setAuditLog] = useState(AUDIT_LOG.map((a) => ({ ...a })));

  // Queue
  const addToQueue = useCallback((patientId: string, name: string) => {
    const ticket = `A-${String(ticketCounter++).padStart(3, "0")}`;
    setQueue((prev) => [...prev, { ticket, patientId, name, waitMins: 0, status: "waiting", doctor: null }]);
    return ticket;
  }, []);

  const updateQueueStatus = useCallback((ticket: string, status: QueueItem["status"]) => {
    setQueue((prev) => prev.map((q) => q.ticket === ticket ? { ...q, status } : q));
  }, []);

  const markTriage = useCallback((ticket: string) => {
    setQueue((prev) => prev.map((q) => q.ticket === ticket ? { ...q, triageDone: true, vitalsRecorded: true } : q));
  }, []);

  // Lab
  const addLabOrder = useCallback((patientId: string, patient: string, tests: string[], priority: string, orderedBy: string) => {
    const newOrders: LabOrder[] = tests.map((test) => ({
      id: `LO${String(orderCounter++).padStart(3, "0")}`,
      patientId, patient, test,
      orderedBy, ordered: new Date().toLocaleString(),
      status: "pending",
      priority: priority.toLowerCase() as LabOrder["priority"],
    }));
    setLabOrders((prev) => [...prev, ...newOrders]);
  }, []);

  const updateLabStatus = useCallback((id: string, status: LabOrder["status"]) => {
    setLabOrders((prev) => prev.map((o) => o.id === id ? { ...o, status } : o));
  }, []);

  const enterLabResult = useCallback((id: string, result: string, classification: string) => {
    setLabOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: "completed", result, resultClassification: classification } : o));
  }, []);

  // Prescriptions
  const addPrescription = useCallback((rx: Omit<Prescription, "id" | "status">) => {
    setPrescriptions((prev) => [...prev, { ...rx, id: `RX${String(rxCounter++).padStart(3, "0")}`, status: "pending" }]);
  }, []);

  const dispensePrescription = useCallback((id: string) => {
    setPrescriptions((prev) => prev.map((p) => p.id === id ? { ...p, status: "dispensed" } : p));
  }, []);

  // Referrals
  const addReferral = useCallback((ref: Omit<Referral, "id">) => {
    setReferrals((prev) => [...prev, { ...ref, id: `REF${String(refCounter++).padStart(3, "0")}` }]);
  }, []);

  const updateReferralStatus = useCallback((id: string, status: Referral["status"]) => {
    setReferrals((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
  }, []);

  // Beds
  const admitPatient = useCallback((bedId: string, patientId: string, name: string) => {
    setBeds((prev) => prev.map((b) => b.id === bedId ? { ...b, status: "occupied", patient: name, patientId, since: new Date().toISOString().slice(0, 10) } : b));
  }, []);

  const dischargePatient = useCallback((bedId: string) => {
    setBeds((prev) => prev.map((b) => b.id === bedId ? { ...b, status: "available", patient: null, patientId: null, since: null } : b));
  }, []);

  const updateBedStatus = useCallback((bedId: string, status: Bed["status"]) => {
    setBeds((prev) => prev.map((b) => b.id === bedId ? { ...b, status } : b));
  }, []);

  // Invoices
  const addInvoice = useCallback((inv: Omit<Invoice, "id">) => {
    setInvoices((prev) => [...prev, { ...inv, id: `INV-2026-0${invCounter++}` }]);
  }, []);

  const markInvoicePaid = useCallback((id: string) => {
    setInvoices((prev) => prev.map((i) => i.id === id ? { ...i, status: "paid" } : i));
  }, []);

  const requestWaiver = useCallback((id: string) => {
    setInvoices((prev) => prev.map((i) => i.id === id ? { ...i, status: "waiver-requested" } : i));
  }, []);

  // CBHI
  const resubmitClaim = useCallback((id: string) => {
    setCbhiClaims((prev) => prev.map((c) => c.id === id ? { ...c, status: "submitted" } : c));
  }, []);

  // Fee waivers
  const approveWaiver = useCallback((id: string) => {
    setFeeWaivers((prev) => prev.map((w) => w.id === id ? { ...w, status: "approved" } : w));
  }, []);

  const rejectWaiver = useCallback((id: string) => {
    setFeeWaivers((prev) => prev.map((w) => w.id === id ? { ...w, status: "rejected" } : w));
  }, []);

  // Notifications
  const addNotification = useCallback((n: Omit<Notification, "id" | "read">) => {
    setNotifications((prev) => [{ ...n, id: `N${notifCounter++}`, read: false }, ...prev]);
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  // Audit
  const logAction = useCallback((user: string, action: string, target: string) => {
    setAuditLog((prev) => [{
      id: `AL${String(prev.length + 1).padStart(3, "0")}`,
      user, action, target,
      time: new Date().toLocaleString(),
      ip: "192.168.1.x",
    }, ...prev]);
  }, []);

  return (
    <NovaStoreCtx.Provider value={{
      activePatientId, setActivePatientId,
      queue, addToQueue, updateQueueStatus, markTriage,
      labOrders, addLabOrder, updateLabStatus, enterLabResult,
      prescriptions, addPrescription, dispensePrescription,
      referrals, addReferral, updateReferralStatus,
      beds, admitPatient, dischargePatient, updateBedStatus,
      invoices, addInvoice, markInvoicePaid, requestWaiver,
      cbhiClaims, resubmitClaim,
      feeWaivers, approveWaiver, rejectWaiver,
      notifications, addNotification, markNotificationRead, markAllRead,
      auditLog, logAction,
    }}>
      {children}
    </NovaStoreCtx.Provider>
  );
}

export function useNovaStore() {
  const ctx = useContext(NovaStoreCtx);
  if (!ctx) throw new Error("useNovaStore must be used within NovaStoreProvider");
  return ctx;
}

// Helper — get patient by id from mock data
export { PATIENTS };
