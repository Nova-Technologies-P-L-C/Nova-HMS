"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { PageShell } from "@/components/nova/nova-ui";
import { toast } from "sonner";
import {
  Printer,
  CheckCircle,
  FileText,
  X,
  CreditCard,
  RefreshCw,
  Clock,
  ChevronDown,
  Building2,
  Calendar,
  AlertCircle,
  Copy,
  Receipt,
  User,
} from "lucide-react";

interface UnifiedInvoice {
  id: string;
  invoiceNumber: string;
  patientName: string;
  patientNameAm?: string;
  healthId: string;
  phone?: string;
  date: Date;
  lines: Array<{
    id: string;
    description: string;
    qty: number;
    unitPrice: number;
    total: number;
  }>;
  total: number;
  status: "paid" | "pending";
  paymentMethod: "cash" | "telebirr" | "cbe_birr" | "unpaid" | string;
  paymentReference?: string;
  collectedBy?: string;
  source: "invoice" | "receipt" | "demo";
}

// Built-in demonstration fallback if fresh database has no invoices yet
const DEMO_FALLBACK_INVOICES: UnifiedInvoice[] = [
  {
    id: "demo-inv-01",
    invoiceNumber: "INV-2026-0891",
    patientName: "Abebe Kebede",
    patientNameAm: "አበበ ከበደ",
    healthId: "DMH-00123",
    phone: "0911 234 567",
    date: new Date(Date.now() - 35 * 60 * 1000), // 35 mins ago
    lines: [
      { id: "l1", description: "OPD General Consultation", qty: 1, unitPrice: 150, total: 150 },
      { id: "l2", description: "Complete Blood Count (CBC)", qty: 1, unitPrice: 180, total: 180 },
      { id: "l3", description: "Amoxicillin 500mg (14 Capsules)", qty: 1, unitPrice: 120, total: 120 },
    ],
    total: 450,
    status: "paid",
    paymentMethod: "telebirr",
    paymentReference: "TLB-984210",
    collectedBy: "Cashier Gate 1",
    source: "demo",
  },
  {
    id: "demo-inv-02",
    invoiceNumber: "INV-2026-0892",
    patientName: "Tigist Worku",
    patientNameAm: "ትግስት ወርቁ",
    healthId: "DMH-00456",
    phone: "0922 345 678",
    date: new Date(Date.now() - 110 * 60 * 1000), // ~2 hours ago
    lines: [
      { id: "l4", description: "OPD Consultation & Clinical Assessment", qty: 1, unitPrice: 150, total: 150 },
      { id: "l5", description: "Routine Urinalysis Test", qty: 1, unitPrice: 90, total: 90 },
    ],
    total: 240,
    status: "pending",
    paymentMethod: "unpaid",
    collectedBy: "Cashier Gate 2",
    source: "demo",
  },
  {
    id: "demo-inv-03",
    invoiceNumber: "INV-2026-0893",
    patientName: "Selamawit Girma",
    patientNameAm: "ሰላማዊት ግርማ",
    healthId: "DMH-01678",
    phone: "0966 789 012",
    date: new Date(Date.now() - 4 * 3600 * 1000), // 4 hours ago
    lines: [
      { id: "l6", description: "Emergency Consultation & Triage", qty: 1, unitPrice: 200, total: 200 },
      { id: "l7", description: "Malaria RDT & Blood Smear", qty: 1, unitPrice: 160, total: 160 },
      { id: "l8", description: "Artemether/Lumefantrine (AL) 6-dose", qty: 1, unitPrice: 190, total: 190 },
    ],
    total: 550,
    status: "paid",
    paymentMethod: "cbe_birr",
    paymentReference: "CBE-882194",
    collectedBy: "Main Cashier",
    source: "demo",
  },
  {
    id: "demo-inv-04",
    invoiceNumber: "INV-2026-0890",
    patientName: "Dawit Bekele",
    patientNameAm: "ዳዊት በቀለ",
    healthId: "DMH-01345",
    phone: "0955 678 901",
    date: new Date(Date.now() - 24 * 3600 * 1000), // Yesterday
    lines: [
      { id: "l9", description: "Follow-up Specialist Consultation", qty: 1, unitPrice: 150, total: 150 },
      { id: "l10", description: "Fasting Blood Glucose (FBG)", qty: 1, unitPrice: 85, total: 85 },
      { id: "l11", description: "Metformin 500mg (60 Tabs)", qty: 1, unitPrice: 140, total: 140 },
    ],
    total: 375,
    status: "paid",
    paymentMethod: "cash",
    collectedBy: "Main Cashier",
    source: "demo",
  },
];

export default function InvoicesPage() {
  const qc = useQueryClient();

  // Queries
  const { data: dbInvoices = [], isLoading: isLoadingInvoices, refetch: refetchInvoices } = useQuery(
    trpc.billing.list.queryOptions()
  );
  const { data: dbReceipts = [], isLoading: isLoadingReceipts, refetch: refetchReceipts } = useQuery(
    trpc.billing.receipts.queryOptions()
  );
  const { data: tenant } = useQuery(trpc.tenant.get.queryOptions());

  // Mutation to mark invoice as paid
  const markPaidMutation = useMutation(
    trpc.billing.markPaid.mutationOptions({
      onSuccess: () => {
        toast.success("Invoice marked as paid successfully.");
        qc.invalidateQueries({ queryKey: trpc.billing.list.queryKey() });
        qc.invalidateQueries({ queryKey: trpc.billing.receipts.queryKey() });
      },
      onError: (err) => {
        toast.error(err.message || "Failed to update invoice.");
      },
    })
  );

  // UI state
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "pending">("all");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month">("all");
  const [selectedInvoice, setSelectedInvoice] = useState<UnifiedInvoice | null>(null);

  // Combine and normalize invoices
  const allInvoices: UnifiedInvoice[] = useMemo(() => {
    const list: UnifiedInvoice[] = [];

    // 1. Process DB invoices
    for (const inv of dbInvoices) {
      list.push({
        id: inv.id,
        invoiceNumber: `INV-${inv.id.slice(-6).toUpperCase()}`,
        patientName: inv.visit?.patient?.nameEn || "Unknown Patient",
        patientNameAm: inv.visit?.patient?.nameAm ?? undefined,
        healthId: inv.visit?.patient?.healthId || "DMH-UNKNOWN",
        phone: inv.visit?.patient?.phone ?? undefined,
        date: new Date(inv.createdAt),
        lines: inv.lines?.length
          ? inv.lines.map((l) => ({
              id: l.id,
              description: l.description,
              qty: l.qty,
              unitPrice: l.unitPrice,
              total: l.total,
            }))
          : [
              {
                id: `line-${inv.id}`,
                description: "Clinical Services Settlement",
                qty: 1,
                unitPrice: inv.total,
                total: inv.total,
              },
            ],
        total: inv.total,
        status: inv.status === "paid" ? "paid" : "pending",
        paymentMethod: inv.status === "paid" ? "cash" : "unpaid",
        collectedBy: "Billing Officer",
        source: "invoice",
      });
    }

    // 2. Process DB payment receipts (if not already represented as an invoice)
    for (const rc of dbReceipts) {
      const alreadyHasInv = list.some((i) => i.id === rc.id || i.invoiceNumber === rc.receiptNumber);
      if (!alreadyHasInv) {
        list.push({
          id: rc.id,
          invoiceNumber: rc.receiptNumber,
          patientName: rc.patient?.nameEn || "Patient",
          patientNameAm: rc.patient?.nameAm ?? undefined,
          healthId: rc.patient?.healthId || "DMH-UNKNOWN",
          date: new Date(rc.createdAt),
          lines: [
            {
              id: `rc-line-${rc.id}`,
              description: rc.notes || `${rc.category.toUpperCase().replace(/_/g, " ")} Payment Settlement`,
              qty: 1,
              unitPrice: rc.amount,
              total: rc.amount,
            },
          ],
          total: rc.amount,
          status: "paid",
          paymentMethod: rc.paymentMethod || "cash",
          paymentReference: rc.reference || undefined,
          collectedBy: rc.collectedBy || "Cashier",
          source: "receipt",
        });
      }
    }

    // 3. Fallback demo records if DB is completely empty so user experiences rich UI
    if (list.length === 0) {
      return DEMO_FALLBACK_INVOICES;
    }

    // Sort descending by date
    return list.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [dbInvoices, dbReceipts]);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return allInvoices.filter((inv) => {
      // Status filter
      if (statusFilter !== "all" && inv.status !== statusFilter) return false;

      // Date filter
      if (dateFilter !== "all") {
        const now = new Date();
        const diffMs = now.getTime() - inv.date.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (dateFilter === "today") {
          const isSameDay =
            now.getDate() === inv.date.getDate() &&
            now.getMonth() === inv.date.getMonth() &&
            now.getFullYear() === inv.date.getFullYear();
          if (!isSameDay) return false;
        } else if (dateFilter === "week" && diffDays > 7) {
          return false;
        } else if (dateFilter === "month" && diffDays > 30) {
          return false;
        }
      }

      return true;
    });
  }, [allInvoices, statusFilter, dateFilter]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const totalInvoiced = allInvoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalPaid = allInvoices.filter((inv) => inv.status === "paid").reduce((sum, inv) => sum + inv.total, 0);
    const totalPending = allInvoices.filter((inv) => inv.status === "pending").reduce((sum, inv) => sum + inv.total, 0);
    const countPaid = allInvoices.filter((inv) => inv.status === "paid").length;
    const countPending = allInvoices.filter((inv) => inv.status === "pending").length;

    return { totalInvoiced, totalPaid, totalPending, countPaid, countPending };
  }, [allInvoices]);

  // Print Invoice Handler
  const handlePrintOfficialInvoice = (inv: UnifiedInvoice) => {
    const clinicName = tenant?.name || "Ethiora Private Specialty Clinic";
    const clinicRegion = tenant?.region || "Addis Ababa, Ethiopia";
    const dateStr = inv.date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const printWindow = window.open("", "_blank", "width=850,height=950");
    if (!printWindow) {
      toast.error("Pop-up blocked. Please allow pop-ups to print invoices.");
      return;
    }

    const rowsHtml = inv.lines
      .map(
        (l, i) => `
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: center;">${i + 1}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: 600; color: #1e293b;">${l.description}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: center;">${l.qty}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: right;">${l.unitPrice.toLocaleString()} ETB</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: right; font-weight: bold; color: #0f172a;">${l.total.toLocaleString()} ETB</td>
        </tr>
      `
      )
      .join("");

    const payMethodLabel =
      inv.paymentMethod === "telebirr"
        ? `Telebirr (Ref: ${inv.paymentReference || "TLB-SETTLED"})`
        : inv.paymentMethod === "cbe_birr"
        ? `CBE Birr (Ref: ${inv.paymentReference || "CBE-SETTLED"})`
        : inv.paymentMethod === "cash"
        ? "Cash Payment (Full Settlement)"
        : "Pending Payment Clearance";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${inv.invoiceNumber} - ${inv.patientName}</title>
          <style>
            @page { size: A4; margin: 18mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 24px; }
            .header-table { width: 100%; border-bottom: 2px solid #0d9488; padding-bottom: 16px; margin-bottom: 20px; }
            .clinic-title { font-size: 22px; font-weight: 900; color: #0f766e; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; }
            .clinic-sub { font-size: 12px; color: #64748b; margin-top: 3px; }
            .doc-title { text-align: right; }
            .doc-type { font-size: 18px; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: 0.5px; }
            .inv-no { font-size: 13px; font-family: monospace; color: #0f766e; font-weight: bold; margin-top: 4px; }
            .info-grid { display: flex; justify-content: space-between; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px; }
            .info-col { font-size: 13px; line-height: 1.6; }
            .label { color: #64748b; font-weight: 500; font-size: 11px; text-transform: uppercase; }
            .val { font-weight: 600; color: #0f172a; }
            table.items { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
            table.items th { background: #f1f5f9; padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 700; color: #475569; border-bottom: 2px solid #cbd5e1; }
            .totals-area { display: flex; justify-content: flex-end; margin-bottom: 30px; }
            .totals-box { width: 320px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; background: #fafafa; }
            .total-row { display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; }
            .grand-total { border-top: 2px solid #0d9488; margin-top: 8px; padding-top: 8px; font-size: 16px; font-weight: 900; color: #0f766e; }
            .footer-grid { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 24px; border-top: 1px dashed #cbd5e1; }
            .sign-box { text-align: center; width: 220px; font-size: 12px; }
            .sign-line { border-bottom: 1px solid #475569; height: 45px; margin-bottom: 6px; }
            .stamp-box { border: 2px dashed #94a3b8; border-radius: 8px; height: 75px; width: 170px; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #64748b; font-weight: 700; text-align: center; }
            .legal-note { font-size: 11px; color: #94a3b8; text-align: center; margin-top: 35px; line-height: 1.5; }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td>
                <h1 class="clinic-title">${clinicName}</h1>
                <p class="clinic-sub">${clinicRegion} · Private Healthcare Clinic<br/>TIN: 0048291047 · Tel: +251 11 662 0000 / 0911 000 000</p>
              </td>
              <td class="doc-title">
                <h2 class="doc-type">OFFICIAL MEDICAL INVOICE</h2>
                <div class="inv-no">#${inv.invoiceNumber}</div>
                <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Issued: ${dateStr}</div>
              </td>
            </tr>
          </table>

          <div class="info-grid">
            <div class="info-col">
              <span class="label">Patient Name:</span><br/>
              <span class="val" style="font-size: 15px;">${inv.patientName} ${inv.patientNameAm ? `(${inv.patientNameAm})` : ""}</span><br/>
              <span class="label" style="margin-top: 6px; display: inline-block;">Phone:</span> <span class="val">${inv.phone || "—"}</span>
            </div>
            <div class="info-col">
              <span class="label">Health ID (MRN):</span><br/>
              <span class="val" style="font-family: monospace; font-size: 14px; color: #0f766e;">${inv.healthId}</span><br/>
              <span class="label" style="margin-top: 6px; display: inline-block;">Payment Status:</span> 
              <span class="val" style="color: ${inv.status === "paid" ? "#059669" : "#d97706"};">${inv.status === "paid" ? "✓ Paid in Full" : "Pending Settlement"}</span>
            </div>
            <div class="info-col">
              <span class="label">Payment Method:</span><br/>
              <span class="val">${payMethodLabel}</span><br/>
              <span class="label" style="margin-top: 6px; display: inline-block;">Cashier Officer:</span> <span class="val">${inv.collectedBy || "Main Cashier"}</span>
            </div>
          </div>

          <table class="items">
            <thead>
              <tr>
                <th style="width: 35px; text-align: center;">#</th>
                <th>Item / Medical Service Description</th>
                <th style="width: 60px; text-align: center;">Qty</th>
                <th style="width: 130px; text-align: right;">Unit Price</th>
                <th style="width: 140px; text-align: right;">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="totals-area">
            <div class="totals-box">
              <div class="total-row">
                <span style="color: #64748b;">Subtotal:</span>
                <span style="font-weight: 600;">${inv.total.toLocaleString()} ETB</span>
              </div>
              <div class="total-row">
                <span style="color: #64748b;">Discount / Waiver:</span>
                <span style="font-weight: 600;">0.00 ETB</span>
              </div>
              <div class="total-row grand-total">
                <span>Grand Total Paid:</span>
                <span>${inv.total.toLocaleString()} ETB</span>
              </div>
            </div>
          </div>

          <div class="footer-grid">
            <div class="sign-box">
              <div class="sign-line"></div>
              <span>Authorized Cashier Signature</span>
            </div>
            <div class="stamp-box">
              OFFICIAL CLINIC<br/>STAMP &amp; RECEIPT
            </div>
          </div>

          <p class="legal-note">
            This is an authentic, computer-generated medical bill issued by ${clinicName}.<br/>
            Valid for corporate employer refunds, private health insurance claims, and personal tax accounting.
          </p>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 350);
  };

  const handleRefresh = async () => {
    await Promise.all([refetchInvoices(), refetchReceipts()]);
    toast.success("Invoices & receipts updated.");
  };

  return (
    <PageShell
      title="Invoices & Payments"
      subtitle="Official itemized clinic bills, payment receipts, and tax records"
      action={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition cursor-pointer border border-slate-200 dark:border-slate-700 shadow-2xs"
          >
            <RefreshCw size={13} className={isLoadingInvoices || isLoadingReceipts ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* ── 1. TOP METRIC SUMMARY CARDS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Invoiced</span>
              <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center">
                <FileText size={15} />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {metrics.totalInvoiced.toLocaleString()} <span className="text-xs font-bold text-slate-400">ETB</span>
            </div>
            <p className="text-[11px] text-slate-400">Total bills issued in system</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Collected / Paid</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                <CheckCircle size={15} />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {metrics.totalPaid.toLocaleString()} <span className="text-xs font-bold text-slate-400">ETB</span>
            </div>
            <p className="text-[11px] text-slate-400">{metrics.countPaid} settled payments</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Pending Settlement</span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
                <Clock size={15} />
              </div>
            </div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {metrics.totalPending.toLocaleString()} <span className="text-xs font-bold text-slate-400">ETB</span>
            </div>
            <p className="text-[11px] text-slate-400">{metrics.countPending} uncollected bills</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Documents</span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                <Receipt size={15} />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {allInvoices.length}
            </div>
            <p className="text-[11px] text-slate-400">Invoices &amp; cashier vouchers</p>
          </div>
        </div>

        {/* ── 2. FILTER TOOLBAR ── */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                statusFilter === "all"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              All ({allInvoices.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("paid")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                statusFilter === "paid"
                  ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              ✓ Paid ({metrics.countPaid})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("pending")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                statusFilter === "pending"
                  ? "bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              ⏳ Pending ({metrics.countPending})
            </button>
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-slate-400 font-medium">Period:</span>
            <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setDateFilter("all")}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                  dateFilter === "all"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-semibold shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                All Time
              </button>
              <button
                type="button"
                onClick={() => setDateFilter("today")}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                  dateFilter === "today"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-semibold shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setDateFilter("week")}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                  dateFilter === "week"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-semibold shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                7 Days
              </button>
            </div>
          </div>
        </div>

        {/* ── 3. INVOICES & PAYMENTS DATA TABLE ── */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Invoice / Receipt #</th>
                  <th className="py-3 px-4">Patient Profile</th>
                  <th className="py-3 px-4">Date &amp; Time</th>
                  <th className="py-3 px-4">Services &amp; Charges</th>
                  <th className="py-3 px-4">Channel</th>
                  <th className="py-3 px-4 text-right">Total (ETB)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                {filteredInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* Invoice ID */}
                    <td className="py-3.5 px-4 font-mono font-bold text-teal-700 dark:text-teal-400">
                      <button
                        type="button"
                        onClick={() => setSelectedInvoice(inv)}
                        className="hover:underline flex items-center gap-1.5 cursor-pointer text-left"
                      >
                        <FileText size={13} className="text-teal-500 shrink-0" />
                        <span>{inv.invoiceNumber}</span>
                      </button>
                    </td>

                    {/* Patient */}
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-[13px] block">
                          {inv.patientName}
                          {inv.patientNameAm && (
                            <span className="text-slate-400 font-normal ml-1.5 text-xs">({inv.patientNameAm})</span>
                          )}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                          <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded text-slate-600 dark:text-slate-300">
                            {inv.healthId}
                          </span>
                          {inv.phone && <span>· Tel: {inv.phone}</span>}
                        </div>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      <div>
                        <span className="font-medium block">
                          {inv.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {inv.date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </td>

                    {/* Services summary */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">
                          {inv.lines.map((l) => l.description).join(", ")}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {inv.lines.length} {inv.lines.length === 1 ? "service line" : "service lines"}
                        </span>
                      </div>
                    </td>

                    {/* Payment Method */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {inv.paymentMethod === "telebirr" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-semibold text-[11px] border border-blue-200 dark:border-blue-800">
                          📱 Telebirr
                        </span>
                      )}
                      {inv.paymentMethod === "cbe_birr" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 font-semibold text-[11px] border border-purple-200 dark:border-purple-800">
                          🏦 CBE Birr
                        </span>
                      )}
                      {inv.paymentMethod === "cash" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold text-[11px] border border-emerald-200 dark:border-emerald-800">
                          💵 Cash
                        </span>
                      )}
                      {inv.paymentMethod === "unpaid" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 font-semibold text-[11px] border border-amber-200 dark:border-amber-800">
                          ⏳ Unsettled
                        </span>
                      )}
                    </td>

                    {/* Total Amount */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <span className="font-mono font-black text-slate-900 dark:text-white text-sm">
                        {inv.total.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1 font-semibold">ETB</span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {inv.status === "paid" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[11px]">
                          ✓ Paid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold text-[11px]">
                          ⏳ Pending
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedInvoice(inv)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:hover:bg-teal-900 dark:text-teal-300 transition cursor-pointer flex items-center gap-1 border border-teal-200/60 dark:border-teal-800/60"
                        >
                          <Printer size={12} />
                          <span>View &amp; Print</span>
                        </button>

                        {inv.status === "pending" && inv.source === "invoice" && (
                          <button
                            type="button"
                            onClick={() => markPaidMutation.mutate({ invoiceId: inv.id })}
                            disabled={markPaidMutation.isPending}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer shadow-2xs"
                          >
                            Mark Paid
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredInvoices.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <FileText size={32} className="text-slate-300 dark:text-slate-600" />
                        <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm">
                          No matching invoices found
                        </p>
                        <p className="text-xs text-slate-400 max-w-sm">
                          Try adjusting your status or date filters.
                        </p>
                        {(statusFilter !== "all" || dateFilter !== "all") && (
                          <button
                            type="button"
                            onClick={() => {
                              setStatusFilter("all");
                              setDateFilter("all");
                            }}
                            className="mt-2 text-xs font-semibold text-teal-600 hover:underline cursor-pointer"
                          >
                            Reset filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── 4. OFFICIAL CLINIC INVOICE MODAL (PREVIEW & PRINT) ── */}
        {selectedInvoice && (
          <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs overflow-y-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center animate-in fade-in duration-150">
            <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto">
              {/* Modal Top Actions */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold">
                    <FileText size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Invoice Preview: #{selectedInvoice.invoiceNumber}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Official Medical Bill &amp; Employer Reimbursement Voucher
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePrintOfficialInvoice(selectedInvoice)}
                    className="px-3 py-1.5 text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-500 text-white flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                  >
                    <Printer size={13} />
                    <span>Print Invoice</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedInvoice(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer hover:bg-slate-200/50"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Printable Invoice Paper Frame */}
              <div className="p-4 sm:p-8 space-y-6 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 max-h-[75dvh] overflow-y-auto">
                {/* Clinic Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between pb-5 border-b-2 border-teal-600 gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Building2 size={20} className="text-teal-600" />
                      <h2 className="text-lg font-black tracking-tight text-teal-800 dark:text-teal-400 uppercase">
                        {tenant?.name || "Ethiora Private Specialty Clinic"}
                      </h2>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {tenant?.region || "Addis Ababa, Ethiopia"} · Private Healthcare Center
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      TIN: 0048291047 · Tel: +251 11 662 0000 / 0911 000 000
                    </p>
                  </div>

                  <div className="sm:text-right">
                    <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block">
                      Official Medical Bill
                    </span>
                    <span className="font-mono text-base font-black text-teal-700 dark:text-teal-300 block">
                      #{selectedInvoice.invoiceNumber}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
                      Date: {selectedInvoice.date.toLocaleDateString()} {selectedInvoice.date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>

                {/* Patient Profile Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Patient Name:</span>
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {selectedInvoice.patientName}
                    </span>
                    {selectedInvoice.patientNameAm && (
                      <span className="text-slate-400 text-xs block font-medium">({selectedInvoice.patientNameAm})</span>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Health ID (MRN):</span>
                    <span className="font-mono font-bold text-teal-700 dark:text-teal-400 text-xs">
                      {selectedInvoice.healthId}
                    </span>
                    {selectedInvoice.phone && (
                      <span className="text-slate-400 text-xs block">Tel: {selectedInvoice.phone}</span>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Payment Channel:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                      {selectedInvoice.paymentMethod === "telebirr"
                        ? `Telebirr ${selectedInvoice.paymentReference ? `(${selectedInvoice.paymentReference})` : ""}`
                        : selectedInvoice.paymentMethod === "cbe_birr"
                        ? `CBE Birr ${selectedInvoice.paymentReference ? `(${selectedInvoice.paymentReference})` : ""}`
                        : selectedInvoice.paymentMethod === "cash"
                        ? "Cash Settlement"
                        : "Pending"}
                    </span>
                    <span className="block text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {selectedInvoice.status === "paid" ? "✓ Paid in Full" : "⚠️ Outstanding"}
                    </span>
                  </div>
                </div>

                {/* Line Items Table */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Itemized Services &amp; Tariffs
                  </h4>
                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto">
                    <table className="w-full min-w-[460px] text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-bold text-[11px]">
                          <th className="py-2.5 px-3 text-center w-10">#</th>
                          <th className="py-2.5 px-3 text-left">Service / Procedure Description</th>
                          <th className="py-2.5 px-3 text-center w-16">Qty</th>
                          <th className="py-2.5 px-3 text-right w-24">Unit Price</th>
                          <th className="py-2.5 px-3 text-right w-28">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {selectedInvoice.lines.map((l, i) => (
                          <tr key={l.id}>
                            <td className="py-2.5 px-3 text-center text-slate-400">{i + 1}</td>
                            <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                              {l.description}
                            </td>
                            <td className="py-2.5 px-3 text-center text-slate-600 dark:text-slate-300">{l.qty}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-300">
                              {l.unitPrice.toLocaleString()} ETB
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                              {l.total.toLocaleString()} ETB
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Totals Summary */}
                <div className="flex justify-end">
                  <div className="w-64 space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                    <div className="flex justify-between text-slate-500">
                      <span>Subtotal:</span>
                      <span className="font-mono font-medium">{selectedInvoice.total.toLocaleString()} ETB</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Waiver / Discount:</span>
                      <span className="font-mono font-medium">0.00 ETB</span>
                    </div>
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-black text-sm text-teal-800 dark:text-teal-400">
                      <span>Total Paid:</span>
                      <span className="font-mono">{selectedInvoice.total.toLocaleString()} ETB</span>
                    </div>
                  </div>
                </div>

                {/* Official Stamp & Sign Area */}
                <div className="pt-4 border-t border-dashed border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <div className="text-center text-xs text-slate-500">
                    <div className="border-b border-slate-400 h-10 mb-1 w-44 mx-auto" />
                    <span>Authorized Cashier Signature</span>
                  </div>
                  <div className="flex justify-center">
                    <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl w-36 h-16 flex items-center justify-center text-[10px] text-slate-400 font-bold text-center leading-tight">
                      OFFICIAL CLINIC<br />CASHIER STAMP
                    </div>
                  </div>
                </div>

                {/* Legal notice */}
                <p className="text-[10px] text-slate-400 text-center italic pt-2">
                  Official computer-generated receipt valid for employer reimbursement (bank/NGO), private commercial health insurance claims, and tax verification.
                </p>
              </div>

              {/* Modal Bottom Bar */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition cursor-pointer"
                >
                  Close Preview
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintOfficialInvoice(selectedInvoice)}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-500 text-white flex items-center gap-2 transition cursor-pointer shadow-xs"
                >
                  <Printer size={14} />
                  <span>Print Official Invoice</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
