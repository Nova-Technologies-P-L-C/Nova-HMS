"use client";
import { useState, useMemo, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { PageShell, KpiCard } from "@/components/nova/nova-ui";
import {
  CheckCircle,
  Receipt,
  Clock,
  Printer,
  RefreshCw,
  Search,
  X,
  CreditCard,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

// Time categorization helpers
function getTimePeriod(dateStr: string | Date): "today" | "yesterday" | "this_week" | "earlier" {
  const d = new Date(dateStr);
  const now = new Date();

  const dMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const oneDayMs = 24 * 60 * 60 * 1000;

  const diffDays = Math.round((todayMidnight.getTime() - dMidnight.getTime()) / oneDayMs);

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays > 1 && diffDays <= 7) return "this_week";
  return "earlier";
}

function formatTimeOnly(dateStr: string | Date): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateOnly(dateStr: string | Date): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function formatCategory(cat: string): string {
  switch (cat) {
    case "final_settlement":
      return "Full Bill";
    case "card_fee":
      return "Card Fee";
    case "pharmacy":
      return "Medicine";
    case "lab":
      return "Lab Test";
    case "consultation":
      return "Doctor Fee";
    case "admission":
      return "Ward Stay";
    default:
      return cat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

interface PayableServiceItem {
  key: string;
  type: "card" | "consultation" | "lab" | "drug";
  icon: string;
  title: string;
  subtitle: string;
  amount: number;
  paymentStatus: "unpaid" | "paid" | "cbhi_covered" | "emergency_exempt";
  rawId: string;
}

function BillingDashboardContent() {
  const qc = useQueryClient();

  // Single service pre-payment target
  const [singleTarget, setSingleTarget] = useState<{
    visitId: string;
    patientName: string;
    patientHealthId: string;
    ticketNumber: string;
    service: PayableServiceItem;
  } | null>(null);

  const [payMethod, setPayMethod] = useState<"cash" | "telebirr" | "cbe_birr" | "card">("cash");
  const [payRef, setPayRef] = useState<string>("");
  const [issuedReceipt, setIssuedReceipt] = useState<{ receiptNumber: string; total: number; patientName: string; items: string[] } | null>(null);

  // Expanded patient accordion rows
  const [expandedVisits, setExpandedVisits] = useState<Set<string>>(new Set());

  // Queue table filter & search
  const [queueTab, setQueueTab] = useState<"all" | "ready">("all");
  const [queueSearch, setQueueSearch] = useState("");

  // Payment history filter by time & search
  const [timeFilter, setTimeFilter] = useState<"today" | "yesterday" | "this_week" | "all">("today");
  const [receiptSearch, setReceiptSearch] = useState("");

  const { data: settlementQueue = [], refetch: refetchQueue, isFetching: isFetchingQueue } = useQuery(
    trpc.billing.settlementQueue.queryOptions()
  );
  const { data: receipts = [], refetch: refetchReceipts, isFetching: isFetchingReceipts } = useQuery(
    trpc.billing.receipts.queryOptions()
  );

  const toggleExpand = (visitId: string) => {
    setExpandedVisits((prev) => {
      const next = new Set(prev);
      if (next.has(visitId)) next.delete(visitId);
      else next.add(visitId);
      return next;
    });
  };

  const collectPaymentMutation = useMutation({
    ...trpc.billing.collectCashierPayment.mutationOptions(),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: trpc.billing.receipts.queryKey() });
      qc.invalidateQueries({ queryKey: trpc.billing.settlementQueue.queryKey() });
      qc.invalidateQueries({ queryKey: trpc.billing.list.queryKey() });
      qc.invalidateQueries({ queryKey: trpc.visit.queue.queryKey() });
      qc.invalidateQueries({ queryKey: trpc.prescription.queue.queryKey() });
      qc.invalidateQueries({ queryKey: trpc.lab.queue.queryKey() });
      refetchQueue();
      refetchReceipts();
      setIssuedReceipt({
        receiptNumber: res.receiptNumber,
        total: res.total,
        patientName: singleTarget?.patientName ?? "Patient",
        items: res.descriptionList,
      });
      setSingleTarget(null);
      setPayRef("");
    },
  });

  // Single service quick payment checkout
  const handleSingleServiceCheckout = () => {
    if (!singleTarget) return;
    const { visitId, service } = singleTarget;
    collectPaymentMutation.mutate({
      visitId,
      payCardFee: service.type === "card",
      payConsultation: service.type === "consultation",
      payAdmissionCharges: false,
      labOrderIds: service.type === "lab" ? [service.rawId] : [],
      prescriptionLineIds: service.type === "drug" ? [service.rawId] : [],
      paymentMethod: payMethod,
      reference: payRef,
    });
  };

  // Extract individual payable pre-payment service rows for a visit
  const getPatientServiceRows = (v: typeof settlementQueue[0]): PayableServiceItem[] => {
    const list: PayableServiceItem[] = [];

    // 1. Card Fee
    if (v.ticket) {
      list.push({
        key: `card-${v.ticket.id}`,
        type: "card",
        icon: "🏥",
        title: `Card Fee (${v.ticket.ticketNumber})`,
        subtitle: "Registration fee",
        amount: v.ticket.feeAmount,
        paymentStatus: v.ticket.paymentStatus as any,
        rawId: v.ticket.id,
      });
    }

    // 2. Doctor Consultation
    const consultPaid = v.receipts.some((r) => r.category === "consultation" || r.category === "final_settlement");
    list.push({
      key: `consult-${v.id}`,
      type: "consultation",
      icon: "👨‍⚕️",
      title: "Doctor Fee",
      subtitle: "Doctor visit fee",
      amount: 100,
      paymentStatus: consultPaid ? "paid" : "unpaid",
      rawId: v.id,
    });

    // 3. Diagnostic Labs
    for (const lab of v.labOrders) {
      list.push({
        key: `lab-${lab.id}`,
        type: "lab",
        icon: "🔬",
        title: `Lab: ${lab.testName}`,
        subtitle: `Lab test (${lab.status === "completed" ? "Ready" : lab.status === "sample_collected" ? "In Lab" : "Ordered"})`,
        amount: lab.price,
        paymentStatus: lab.paymentStatus as any,
        rawId: lab.id,
      });
    }

    // 4. Prescriptions
    for (const rx of v.prescriptions) {
      for (const line of rx.lines) {
        list.push({
          key: `drug-${line.id}`,
          type: "drug",
          icon: "💊",
          title: `Medicine: ${line.itemName}`,
          subtitle: "Prescribed medicine",
          amount: line.totalPrice,
          paymentStatus: line.paymentStatus as any,
          rawId: line.id,
        });
      }
    }

    return list;
  };

  // Filtered Queue
  const filteredQueue = useMemo(() => {
    return settlementQueue.filter((v) => {
      if (queueTab === "ready" && v.status !== "ready_for_billing") return false;
      if (queueSearch.trim()) {
        const q = queueSearch.toLowerCase().trim();
        const matchName = v.patient.nameEn.toLowerCase().includes(q);
        const matchHealthId = v.patient.healthId.toLowerCase().includes(q);
        const matchTicket = v.ticket?.ticketNumber.toLowerCase().includes(q);
        return matchName || matchHealthId || matchTicket;
      }
      return true;
    });
  }, [settlementQueue, queueTab, queueSearch]);

  const transferredCount = settlementQueue.filter((v) => v.status === "ready_for_billing").length;

  // Time-segmented receipts
  const todayReceipts = useMemo(() => receipts.filter((r) => getTimePeriod(r.createdAt) === "today"), [receipts]);
  const yesterdayReceipts = useMemo(() => receipts.filter((r) => getTimePeriod(r.createdAt) === "yesterday"), [receipts]);
  const weekReceipts = useMemo(() => receipts.filter((r) => {
    const p = getTimePeriod(r.createdAt);
    return p === "today" || p === "yesterday" || p === "this_week";
  }), [receipts]);

  const todayTotal = todayReceipts.reduce((sum, r) => sum + r.amount, 0);
  const yesterdayTotal = yesterdayReceipts.reduce((sum, r) => sum + r.amount, 0);
  const weekTotal = weekReceipts.reduce((sum, r) => sum + r.amount, 0);
  const totalCollected = receipts.reduce((sum, r) => sum + r.amount, 0);

  // Active time-filtered receipts
  const activeReceipts = useMemo(() => {
    let list = receipts;
    if (timeFilter === "today") list = todayReceipts;
    else if (timeFilter === "yesterday") list = yesterdayReceipts;
    else if (timeFilter === "this_week") list = weekReceipts;

    if (receiptSearch.trim()) {
      const q = receiptSearch.toLowerCase().trim();
      list = list.filter((r) => {
        const matchNum = r.receiptNumber.toLowerCase().includes(q);
        const matchPatient = r.patient.nameEn.toLowerCase().includes(q) || r.patient.healthId.toLowerCase().includes(q);
        const matchMethod = r.paymentMethod.toLowerCase().includes(q);
        return matchNum || matchPatient || matchMethod;
      });
    }
    return list;
  }, [receipts, timeFilter, todayReceipts, yesterdayReceipts, weekReceipts, receiptSearch]);

  // Compute cumulative running total for each payment transaction
  const receiptsWithCumulative = useMemo(() => {
    // Sort chronologically ascending to compute running cumulative sum accurately
    const sortedAsc = [...activeReceipts].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    let runningSum = 0;
    const runningMap = new Map<string, number>();
    for (const r of sortedAsc) {
      runningSum += r.amount;
      runningMap.set(r.id, runningSum);
    }

    // Return sorted descending (newest transaction first for cashier view)
    return [...activeReceipts]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((r) => ({
        ...r,
        cumulativeTotal: runningMap.get(r.id) ?? r.amount,
      }));
  }, [activeReceipts]);

  return (
    <PageShell
      title="Cashier & Billing"
      subtitle={`${transferredCount} patients with pending orders · ETB ${todayTotal.toLocaleString()} collected today`}
      action={
        <button
          onClick={() => {
            refetchQueue();
            refetchReceipts();
          }}
          disabled={isFetchingQueue || isFetchingReceipts}
          className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-lg hover:border-teal-400 transition flex items-center gap-1.5"
          title="Refresh data"
        >
          <RefreshCw size={13} className={isFetchingQueue || isFetchingReceipts ? "animate-spin text-teal-600" : ""} />
          <span>Refresh</span>
        </button>
      }
    >
      {/* Payment Receipt Modal */}
      {issuedReceipt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full max-h-[90dvh] overflow-y-auto p-4 sm:p-6 text-center space-y-4 border border-slate-200 dark:border-slate-800">
            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle size={32} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold">Payment Receipt</p>
              <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 font-mono mt-1">{issuedReceipt.receiptNumber}</h2>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 text-left text-xs space-y-2 border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Patient:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{issuedReceipt.patientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Paid With:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 uppercase">{payMethod}</span>
              </div>
              <div className="border-t border-slate-200/60 dark:border-slate-700/60 pt-2">
                <span className="text-slate-500 block mb-1">Paid Items:</span>
                <ul className="list-disc pl-4 space-y-0.5 text-slate-700 dark:text-slate-300">
                  {issuedReceipt.items.map((it, idx) => (
                    <li key={idx}>{it}</li>
                  ))}
                </ul>
              </div>
              <div className="border-t border-slate-200/60 dark:border-slate-700/60 pt-2 flex justify-between font-bold text-sm">
                <span className="text-slate-800 dark:text-slate-200">Total Paid:</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-mono">ETB {issuedReceipt.total}</span>
              </div>
            </div>
            <p className="text-[11px] text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 py-2 px-3 rounded-lg font-medium border border-teal-200/80 dark:border-teal-800/80">
              ✓ Payment completed. Receipt is ready.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <Printer size={14} /> Print Receipt
              </button>
              <button
                type="button"
                onClick={() => setIssuedReceipt(null)}
                className="flex-1 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collect Payment Modal */}
      {singleTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full max-h-[90dvh] overflow-y-auto p-4 sm:p-5 space-y-4 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-1.5">
                  <CreditCard size={15} className="text-teal-600" />
                  Collect Payment
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {singleTarget.patientName} · {singleTarget.ticketNumber} ({singleTarget.patientHealthId})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSingleTarget(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs space-y-1.5 border border-slate-200/80 dark:border-slate-700/80">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Item:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{singleTarget.service.title}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Type:</span>
                <span className="text-slate-700 dark:text-slate-300">{singleTarget.service.subtitle}</span>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-700 pt-1.5 flex items-center justify-between font-bold text-sm">
                <span className="text-slate-800 dark:text-slate-200">Amount:</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-mono">ETB {singleTarget.service.amount}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">Payment Method:</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
                {(["cash", "telebirr", "cbe_birr", "card"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPayMethod(m)}
                    className={`py-1.5 px-2 rounded-lg border font-semibold text-center transition ${
                      payMethod === m
                        ? "bg-teal-600 text-white border-teal-600 shadow-xs"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-teal-400"
                    }`}
                  >
                    {m === "cash" && "💵 Cash"}
                    {m === "telebirr" && "📱 Telebirr"}
                    {m === "cbe_birr" && "🏦 CBE Birr"}
                    {m === "card" && "💳 Card"}
                  </button>
                ))}
              </div>

              {(payMethod === "telebirr" || payMethod === "cbe_birr") && (
                <input
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder="Reference number (e.g. TLB-12345)"
                  className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs rounded-lg focus:outline-hidden focus:border-teal-500"
                />
              )}
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSingleTarget(null)}
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-lg text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={collectPaymentMutation.isPending}
                onClick={handleSingleServiceCheckout}
                className="px-4 py-1.5 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-lg text-xs shadow-xs transition"
              >
                {collectPaymentMutation.isPending ? "Collecting…" : `Confirm Payment (ETB ${singleTarget.service.amount})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Collected Today" value={`ETB ${todayTotal.toLocaleString()}`} sub={`${todayReceipts.length} payments`} accent />
        <KpiCard label="Waiting to Pay" value={transferredCount} sub="patients from doctor" />
        <KpiCard label="This Week" value={`ETB ${weekTotal.toLocaleString()}`} sub={`${weekReceipts.length} payments`} />
        <KpiCard label="Total Collected" value={`ETB ${totalCollected.toLocaleString()}`} sub={`${receipts.length} receipts`} />
      </div>

      {/* Section 1: Patients & Orders */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-teal-600" />
              <h2 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                Patients & Orders
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Click the arrow (▶) to view and collect payment for card, lab, or medicines
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setQueueTab("all")}
                className={`px-3 py-1 rounded-md font-medium transition ${
                  queueTab === "all"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                All Patients ({settlementQueue.length})
              </button>
              <button
                type="button"
                onClick={() => setQueueTab("ready")}
                className={`px-3 py-1 rounded-md font-medium transition ${
                  queueTab === "ready"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                From Doctor ({transferredCount})
              </button>
            </div>

            <div className="relative w-48 sm:w-56">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={queueSearch}
                onChange={(e) => setQueueSearch(e.target.value)}
                placeholder="Search name, ID, or ticket…"
                className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-teal-500"
              />
            </div>
          </div>
        </div>

        {/* Accordion Pre-Payment Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px]">
                <th className="w-8 px-2 py-2.5 text-center"></th>
                <th className="text-left px-3 py-2.5 font-semibold">Ticket</th>
                <th className="text-left px-3.5 py-2.5 font-semibold">Patient</th>
                <th className="text-left px-3.5 py-2.5 font-semibold">Health ID</th>
                <th className="text-left px-3.5 py-2.5 font-semibold">Orders</th>
                <th className="text-right px-3.5 py-2.5 font-semibold">Unpaid Total</th>
                <th className="text-right px-3.5 py-2.5 font-semibold">Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredQueue.map((v) => {
                const isExpanded = expandedVisits.has(v.id);
                const serviceRows = getPatientServiceRows(v);
                const unpaidRows = serviceRows.filter((s) => s.paymentStatus === "unpaid");
                const totalUnpaid = unpaidRows.reduce((sum, s) => sum + s.amount, 0);
                const isTransferred = v.status === "ready_for_billing";

                return (
                  <Suspense key={v.id} fallback={null}>
                    {/* Main Patient Header Row */}
                    <tr
                      onClick={() => toggleExpand(v.id)}
                      className={`border-b border-slate-100 dark:border-slate-800/60 cursor-pointer transition-colors ${
                        isExpanded
                          ? "bg-teal-50/30 dark:bg-teal-950/20"
                          : isTransferred
                          ? "bg-amber-50/20 dark:bg-amber-950/10 hover:bg-amber-50/40"
                          : "hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                      }`}
                    >
                      <td className="px-2 py-2.5 text-center text-slate-400 hover:text-teal-600">
                        {isExpanded ? (
                          <ChevronDown size={15} className="text-teal-600 mx-auto" />
                        ) : (
                          <ChevronRight size={15} className="mx-auto" />
                        )}
                      </td>
                      <td className="px-3 py-2.5 font-mono font-bold text-slate-800 dark:text-slate-100">
                        {v.ticket?.ticketNumber ?? "—"}
                      </td>
                      <td className="px-3.5 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-slate-900 dark:text-slate-100">{v.patient.nameEn}</p>
                          {isTransferred && (
                            <span className="text-[10px] px-1.5 py-0.2 bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 font-bold rounded">
                              From Doctor
                            </span>
                          )}
                        </div>
                        {v.patient.phone && (
                          <p className="text-[10px] text-slate-400">{v.patient.phone}</p>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                        {v.patient.healthId}
                      </td>
                      <td className="px-3.5 py-2.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {serviceRows.map((s) => (
                            <span
                              key={s.key}
                              className={`text-[10px] px-1.5 py-0.5 rounded font-medium border ${
                                s.paymentStatus === "paid"
                                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50"
                                  : "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/50"
                              }`}
                            >
                              {s.icon} {s.type === "card" ? "Card" : s.type === "lab" ? "Lab" : s.type === "drug" ? "Medicine" : "Doctor"}
                              {s.paymentStatus === "paid" ? " ✓" : s.paymentStatus === "unpaid" ? ` (ETB ${s.amount})` : ""}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-mono font-bold">
                        {totalUnpaid > 0 ? (
                          <span className="text-amber-700 dark:text-amber-400">ETB {totalUnpaid}</span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 text-[11px]">All Paid ✓</span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => toggleExpand(v.id)}
                          className="text-[11px] px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-teal-400 dark:hover:border-teal-500 text-slate-700 dark:text-slate-300 font-medium transition flex items-center gap-1.5 ml-auto"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronDown size={13} className="text-teal-600" />
                              <span>Hide Items</span>
                            </>
                          ) : (
                            <>
                              <ChevronRight size={13} />
                              <span>View Items ({serviceRows.length})</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>

                    {/* Sub-Rows: Separate Row for Card, Lab, and Medication */}
                    {isExpanded &&
                      serviceRows.map((s) => (
                        <tr
                          key={s.key}
                          className="bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800/50 text-xs"
                        >
                          <td className="px-2 py-2 text-center text-slate-300 dark:text-slate-600 font-mono">
                            ↳
                          </td>
                          <td className="px-3 py-2 text-slate-500 dark:text-slate-400 font-medium">
                            <span className="flex items-center gap-1.5">
                              <span>{s.icon}</span>
                              <span className="uppercase text-[10px] tracking-wider font-semibold">
                                {s.type === "card"
                                  ? "Card"
                                  : s.type === "lab"
                                  ? "Lab"
                                  : s.type === "drug"
                                  ? "Medicine"
                                  : "Doctor"}
                              </span>
                            </span>
                          </td>
                          <td colSpan={2} className="px-3.5 py-2">
                            <p className="font-semibold text-slate-800 dark:text-slate-200">{s.title}</p>
                            <p className="text-[10px] text-slate-400">{s.subtitle}</p>
                          </td>
                          <td className="px-3.5 py-2">
                            {s.paymentStatus === "paid" ? (
                              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded font-semibold">
                                ✓ Paid
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 rounded font-semibold">
                                Unpaid
                              </span>
                            )}
                          </td>
                          <td className="px-3.5 py-2 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                            ETB {s.amount}
                          </td>
                          <td className="px-3.5 py-2 text-right">
                            {s.paymentStatus === "unpaid" ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setSingleTarget({
                                    visitId: v.id,
                                    patientName: v.patient.nameEn,
                                    patientHealthId: v.patient.healthId,
                                    ticketNumber: v.ticket?.ticketNumber ?? "—",
                                    service: s,
                                  })
                                }
                                className="px-2.5 py-1 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded text-xs shadow-xs transition cursor-pointer"
                              >
                                Collect ETB {s.amount}
                              </button>
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-medium">
                                Paid ✓
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </Suspense>
                );
              })}

              {filteredQueue.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-xs">
                    {queueSearch
                      ? `No patients matching "${queueSearch}"`
                      : queueTab === "ready"
                      ? "No patients waiting from doctor."
                      : "No active patients in clinic."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: Recent Payments */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <Receipt size={16} className="text-teal-600" />
              <h2 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                Recent Payments
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              List of completed payments with running total
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Time Filter Pills */}
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setTimeFilter("today")}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  timeFilter === "today"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                Today ({todayReceipts.length} · ETB {todayTotal.toLocaleString()})
              </button>
              <button
                type="button"
                onClick={() => setTimeFilter("yesterday")}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  timeFilter === "yesterday"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                Yesterday ({yesterdayReceipts.length})
              </button>
              <button
                type="button"
                onClick={() => setTimeFilter("this_week")}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  timeFilter === "this_week"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                This Week ({weekReceipts.length})
              </button>
              <button
                type="button"
                onClick={() => setTimeFilter("all")}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  timeFilter === "all"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                All Time ({receipts.length})
              </button>
            </div>

            {/* Receipt Search */}
            <div className="relative w-48 sm:w-56">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={receiptSearch}
                onChange={(e) => setReceiptSearch(e.target.value)}
                placeholder="Search receipt #, patient…"
                className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-teal-500"
              />
            </div>
          </div>
        </div>

        {/* Time-Segmented Payments Table with Cumulative Running Total */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px]">
                <th className="text-left px-3.5 py-2.5 font-semibold">Time</th>
                <th className="text-left px-3.5 py-2.5 font-semibold">Receipt #</th>
                <th className="text-left px-3.5 py-2.5 font-semibold">Patient</th>
                <th className="text-left px-3.5 py-2.5 font-semibold">Health ID</th>
                <th className="text-left px-3.5 py-2.5 font-semibold">Item Paid</th>
                <th className="text-left px-3.5 py-2.5 font-semibold">Paid With</th>
                <th className="text-right px-3.5 py-2.5 font-semibold">Amount</th>
                <th className="text-right px-3.5 py-2.5 font-semibold text-teal-700 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-950/20">
                  Running Total
                </th>
                <th className="text-right px-3.5 py-2.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {receiptsWithCumulative.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-slate-100 dark:border-slate-800/60 last:border-0 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="px-3.5 py-2.5 whitespace-nowrap">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                      {formatTimeOnly(r.createdAt)}
                    </span>
                    {timeFilter !== "today" && (
                      <span className="text-[10px] text-slate-400 block">
                        {formatDateOnly(r.createdAt)}
                      </span>
                    )}
                  </td>
                  <td className="px-3.5 py-2.5 font-mono font-bold text-teal-700 dark:text-teal-400">
                    {r.receiptNumber}
                  </td>
                  <td className="px-3.5 py-2.5 font-medium text-slate-800 dark:text-slate-200">
                    {r.patient.nameEn}
                  </td>
                  <td className="px-3.5 py-2.5 font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                    {r.patient.healthId}
                  </td>
                  <td className="px-3.5 py-2.5">
                    <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-medium">
                      {formatCategory(r.category)}
                    </span>
                  </td>
                  <td className="px-3.5 py-2.5 text-slate-700 dark:text-slate-300 uppercase font-medium text-[11px]">
                    {r.paymentMethod === "cash" && "💵 Cash"}
                    {r.paymentMethod === "telebirr" && "📱 Telebirr"}
                    {r.paymentMethod === "cbe_birr" && "🏦 CBE Birr"}
                    {r.paymentMethod === "card" && "💳 Card"}
                  </td>
                  <td className="px-3.5 py-2.5 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                    ETB {r.amount.toLocaleString()}
                  </td>
                  <td className="px-3.5 py-2.5 text-right font-mono font-black text-teal-800 dark:text-teal-300 bg-teal-50/40 dark:bg-teal-950/10">
                    ETB {r.cumulativeTotal.toLocaleString()}
                  </td>
                  <td className="px-3.5 py-2.5 text-right">
                    <span className="text-emerald-700 dark:text-emerald-300 font-semibold bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded text-[10px]">
                      ✓ Paid
                    </span>
                  </td>
                </tr>
              ))}

              {receiptsWithCumulative.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400 text-xs">
                    {receiptSearch ? `No receipts matching "${receiptSearch}"` : "No payments in this time period."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
}

export default function BillingDashboard() {
  return (
    <Suspense fallback={<PageShell title="Cashier & Billing"><p className="p-4 text-slate-400">Loading…</p></PageShell>}>
      <BillingDashboardContent />
    </Suspense>
  );
}
