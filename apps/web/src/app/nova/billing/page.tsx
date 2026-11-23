"use client";
import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { PageShell, KpiCard, inputCls } from "@/components/nova/nova-ui";
import {
  CheckCircle,
  Receipt,
  DollarSign,
  Clock,
  ShieldCheck,
  Printer,
  RefreshCw,
  Search,
  X,
  CreditCard,
  UserCheck,
  AlertCircle,
  ArrowRight,
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
      return "Final Settlement";
    case "card_fee":
      return "Card Fee";
    case "pharmacy":
      return "Pharmacy";
    case "lab":
      return "Laboratory";
    case "consultation":
      return "Consultation";
    case "admission":
      return "Ward Admission";
    default:
      return cat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

function BillingDashboardContent() {
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const initialVisitId = searchParams.get("visitId") ?? "";

  // Settlement & modal states
  const [settlingVisitId, setSettlingVisitId] = useState<string>(initialVisitId);
  const [payCard, setPayCard] = useState<boolean>(true);
  const [payConsultation, setPayConsultation] = useState<boolean>(true);
  const [selectedLabs, setSelectedLabs] = useState<string[]>([]);
  const [selectedDrugs, setSelectedDrugs] = useState<string[]>([]);
  const [payMethod, setPayMethod] = useState<"cash" | "telebirr" | "cbe_birr" | "card">("cash");
  const [payRef, setPayRef] = useState<string>("");
  const [issuedReceipt, setIssuedReceipt] = useState<{ receiptNumber: string; total: number; patientName: string; items: string[] } | null>(null);

  // Queue table filter & search
  const [queueTab, setQueueTab] = useState<"ready" | "all">("ready");
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

  const { data: payables, refetch: refetchPayables, isFetching: isFetchingPayables } = useQuery({
    ...trpc.billing.getVisitPayables.queryOptions({ visitId: settlingVisitId }),
    enabled: !!settlingVisitId,
  });

  // When payables load for a selected patient, preselect unpaid items
  useEffect(() => {
    if (payables) {
      setPayCard(payables.items.some((i) => i.type === "card_fee" && i.paymentStatus === "unpaid"));
      setPayConsultation(payables.items.some((i) => i.type === "consultation" && i.paymentStatus === "unpaid"));
      setSelectedLabs(payables.items.filter((i) => i.type === "lab" && i.paymentStatus === "unpaid").map((i) => i.id));
      setSelectedDrugs(payables.items.filter((i) => i.type === "drug" && i.paymentStatus === "unpaid").map((i) => i.id));
    }
  }, [payables]);

  const collectPaymentMutation = useMutation({
    ...trpc.billing.collectCashierPayment.mutationOptions(),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: trpc.billing.receipts.queryKey() });
      qc.invalidateQueries({ queryKey: trpc.billing.settlementQueue.queryKey() });
      qc.invalidateQueries({ queryKey: trpc.billing.list.queryKey() });
      qc.invalidateQueries({ queryKey: trpc.visit.queue.queryKey() });
      qc.invalidateQueries({ queryKey: trpc.prescription.queue.queryKey() });
      qc.invalidateQueries({ queryKey: trpc.lab.queue.queryKey() });
      refetchPayables();
      refetchQueue();
      refetchReceipts();
      setIssuedReceipt({
        receiptNumber: res.receiptNumber,
        total: res.total,
        patientName: payables?.patient.nameEn ?? "Patient",
        items: res.descriptionList,
      });
      setSettlingVisitId("");
      setPayRef("");
    },
  });

  // Dynamic total calculation for the current modal
  let dynamicTotal = 0;
  if (payables) {
    if (payCard && payables.items.some((i) => i.type === "card_fee" && i.paymentStatus === "unpaid")) {
      const cardItem = payables.items.find((i) => i.type === "card_fee");
      if (cardItem) dynamicTotal += cardItem.amount;
    }
    if (payConsultation && !payables.patient.cbhiStatus) {
      const consultItem = payables.items.find((i) => i.type === "consultation");
      if (consultItem && consultItem.paymentStatus === "unpaid") dynamicTotal += consultItem.amount;
    }
    for (const labId of selectedLabs) {
      const l = payables.items.find((i) => i.id === labId);
      if (l && l.paymentStatus === "unpaid") dynamicTotal += l.amount;
    }
    for (const drugId of selectedDrugs) {
      const d = payables.items.find((i) => i.id === drugId);
      if (d && d.paymentStatus === "unpaid") dynamicTotal += d.amount;
    }
    if (!payables.patient.cbhiStatus) {
      for (const item of payables.items.filter((i) => (i.type === "bed" || i.type === "nursing_care") && i.paymentStatus === "unpaid")) {
        dynamicTotal += item.amount;
      }
    }
  }

  const isCbhi = payables?.patient.cbhiStatus;

  const handleCheckout = () => {
    if (!settlingVisitId) return;
    collectPaymentMutation.mutate({
      visitId: settlingVisitId,
      payCardFee: payCard,
      payConsultation,
      payAdmissionCharges: true,
      labOrderIds: selectedLabs,
      prescriptionLineIds: selectedDrugs,
      paymentMethod: payMethod,
      reference: payRef,
    });
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

  return (
    <PageShell
      title="Accountant & Billing Counter"
      subtitle={`${transferredCount} patients ready for final settlement · ETB ${todayTotal.toLocaleString()} collected today`}
      action={
        <button
          onClick={() => {
            refetchQueue();
            refetchReceipts();
          }}
          disabled={isFetchingQueue || isFetchingReceipts}
          className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-lg hover:border-teal-400 transition flex items-center gap-1.5"
          title="Refresh billing data"
        >
          <RefreshCw size={13} className={isFetchingQueue || isFetchingReceipts ? "animate-spin text-teal-600" : ""} />
          <span>Refresh</span>
        </button>
      }
    >
      {/* Official Receipt Modal */}
      {issuedReceipt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 text-center space-y-4 border border-slate-200 dark:border-slate-800">
            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle size={32} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold">Official Final Discharge Receipt</p>
              <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 font-mono mt-1">{issuedReceipt.receiptNumber}</h2>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 text-left text-xs space-y-2 border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Patient:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{issuedReceipt.patientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Method:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 uppercase">{payMethod}</span>
              </div>
              <div className="border-t border-slate-200/60 dark:border-slate-700/60 pt-2">
                <span className="text-slate-500 block mb-1">Cleared Services:</span>
                <ul className="list-disc pl-4 space-y-0.5 text-slate-700 dark:text-slate-300">
                  {issuedReceipt.items.map((it, idx) => (
                    <li key={idx}>{it}</li>
                  ))}
                </ul>
              </div>
              <div className="border-t border-slate-200/60 dark:border-slate-700/60 pt-2 flex justify-between font-bold text-sm">
                <span className="text-slate-800 dark:text-slate-200">Total Collected:</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-mono">ETB {issuedReceipt.total}</span>
              </div>
            </div>
            <p className="text-[11px] text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 py-2 px-3 rounded-lg font-medium border border-teal-200/80 dark:border-teal-800/80">
              ✓ Visit cleared. Patient can proceed to Pharmacy or exit.
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

      {/* Focused Patient Final Settlement Modal */}
      {settlingVisitId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-5 border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b pb-3.5 border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                    Final Bill Settlement & Discharge Clearance
                  </h3>
                  {isCbhi ? (
                    <span className="text-xs px-2 py-0.5 bg-teal-100 text-teal-800 dark:bg-teal-950/80 dark:text-teal-300 rounded-full font-semibold flex items-center gap-1">
                      <ShieldCheck size={12} /> CBHI Member
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-full font-semibold">
                      Self-Pay
                    </span>
                  )}
                </div>
                {payables && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Patient: <strong className="text-slate-800 dark:text-slate-200">{payables.patient.nameEn}</strong> · ID: {payables.patient.healthId} · Ticket: {payables.visit.ticket?.ticketNumber ?? "N/A"}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSettlingVisitId("")}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {isFetchingPayables || !payables ? (
              <div className="py-12 text-center text-slate-400 text-xs">Loading patient charges…</div>
            ) : (
              <div className="space-y-4">
                {/* CBHI Explanatory Banner */}
                {isCbhi && (
                  <div className="p-3 bg-teal-50 dark:bg-teal-950/50 rounded-xl border border-teal-200/80 dark:border-teal-800/80 text-xs text-teal-900 dark:text-teal-200 flex items-center gap-2.5">
                    <ShieldCheck size={20} className="text-teal-600 shrink-0" />
                    <div>
                      <p className="font-semibold">Community-Based Health Insurance (CBHI)</p>
                      <p className="text-[11px] text-teal-800 dark:text-teal-300">All covered primary assessment, lab tests, and medications require 0 ETB co-pay.</p>
                    </div>
                  </div>
                )}

                {/* Itemized Services Table */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Itemized Visit Charges</p>

                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {/* 1. OPD Card Fee */}
                    {payables.items.filter((i) => i.type === "card_fee").map((i) => (
                      <div key={i.id} className="flex items-center justify-between p-3 bg-slate-50/50 dark:bg-slate-800/30">
                        <div className="flex items-center gap-2.5">
                          <span>🏥</span>
                          <div>
                            <p className="font-semibold text-slate-800 dark:text-slate-200">{i.name}</p>
                            <p className="text-[11px] text-slate-400">Front desk intake fee</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">ETB {i.amount}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                            i.paymentStatus === "paid" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" :
                            i.paymentStatus === "cbhi_covered" ? "bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300" : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                          }`}>
                            {i.paymentStatus === "paid" ? "✓ Paid at Card Desk" : i.paymentStatus === "cbhi_covered" ? "CBHI Covered" : "Unpaid"}
                          </span>
                        </div>
                      </div>
                    ))}

                    {/* 2. Doctor Consultation Fee */}
                    {payables.items.filter((i) => i.type === "consultation").map((i) => (
                      <div key={i.id} className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={payConsultation}
                            disabled={isCbhi || i.paymentStatus === "paid"}
                            onChange={(e) => setPayConsultation(e.target.checked)}
                            className="accent-teal-600 rounded"
                          />
                          <span>👨‍⚕️</span>
                          <div>
                            <p className="font-semibold text-slate-800 dark:text-slate-200">{i.name}</p>
                            <p className="text-[11px] text-slate-400">Clinical evaluation & prescription</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">ETB {i.amount}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                            i.paymentStatus === "paid" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" :
                            isCbhi || i.paymentStatus === "cbhi_covered" ? "bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300" : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                          }`}>
                            {isCbhi ? "CBHI Covered" : i.paymentStatus === "paid" ? "✓ Paid" : "Unpaid"}
                          </span>
                        </div>
                      </div>
                    ))}

                    {/* 3. Diagnostic Lab Orders */}
                    {payables.items.filter((i) => i.type === "lab").map((i) => {
                      const checked = selectedLabs.includes(i.id);
                      return (
                        <div key={i.id} className="flex items-center justify-between p-3">
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={isCbhi || i.paymentStatus === "paid"}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedLabs((p) => [...p, i.id]);
                                else setSelectedLabs((p) => p.filter((x) => x !== i.id));
                              }}
                              className="accent-teal-600 rounded"
                            />
                            <span>🔬</span>
                            <div>
                              <p className="font-semibold text-slate-800 dark:text-slate-200">{i.name}</p>
                              <p className="text-[11px] text-slate-400">Diagnostic investigation</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">ETB {i.amount}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                              i.paymentStatus === "paid" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" :
                              isCbhi || i.paymentStatus === "cbhi_covered" ? "bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300" : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                            }`}>
                              {isCbhi ? "CBHI Covered" : i.paymentStatus === "paid" ? "✓ Paid" : "Unpaid"}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {/* 4. Prescription Medications */}
                    {payables.items.filter((i) => i.type === "drug").map((i) => {
                      const checked = selectedDrugs.includes(i.id);
                      return (
                        <div key={i.id} className="flex items-center justify-between p-3">
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={isCbhi || i.paymentStatus === "paid"}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedDrugs((p) => [...p, i.id]);
                                else setSelectedDrugs((p) => p.filter((x) => x !== i.id));
                              }}
                              className="accent-teal-600 rounded"
                            />
                            <span>💊</span>
                            <div>
                              <p className="font-semibold text-slate-800 dark:text-slate-200">{i.name}</p>
                              <p className="text-[11px] text-slate-400">Prescribed medication</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">ETB {i.amount}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                              i.paymentStatus === "paid" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" :
                              isCbhi || i.paymentStatus === "cbhi_covered" ? "bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300" : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                            }`}>
                              {isCbhi ? "CBHI Covered" : i.paymentStatus === "paid" ? "✓ Paid" : "Unpaid"}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {/* 5. Ward Bed Charges */}
                    {payables.items.filter((i) => i.type === "bed" || i.type === "nursing_care").map((i) => (
                      <div key={i.id} className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-2.5">
                          <span>🛏️</span>
                          <div>
                            <p className="font-semibold text-slate-800 dark:text-slate-200">{i.name}</p>
                            <p className="text-[11px] text-slate-400">Inpatient ward stay</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">ETB {i.amount}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                            i.paymentStatus === "paid" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                          }`}>
                            {i.paymentStatus === "paid" ? "✓ Paid" : "Unpaid"}
                          </span>
                        </div>
                      </div>
                    ))}

                    {payables.items.length === 0 && (
                      <p className="p-4 text-center text-slate-400 text-xs">No billable services recorded for this visit.</p>
                    )}
                  </div>
                </div>

                {/* Calculation Summary Card */}
                <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3.5 border border-slate-200 dark:border-slate-700/80 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Total Visit Charges:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">ETB {payables.grossTotal}</span>
                  </div>
                  {payables.totalPaid > 0 && (
                    <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                      <span>Less: Already Paid (Card Desk):</span>
                      <span className="font-semibold">-ETB {payables.totalPaid}</span>
                    </div>
                  )}
                  {isCbhi && (
                    <div className="flex justify-between text-teal-700 dark:text-teal-400">
                      <span>Less: CBHI Insurance Coverage:</span>
                      <span className="font-semibold">-ETB {payables.grossTotal}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between font-bold text-sm text-slate-900 dark:text-white">
                    <span>Net Balance Due:</span>
                    <span className="text-teal-700 dark:text-teal-300 font-mono">
                      {isCbhi ? "ETB 0.00 (CBHI)" : `ETB ${dynamicTotal}`}
                    </span>
                  </div>
                </div>

                {/* Payment Method Selector & Final Settlement */}
                {!isCbhi && dynamicTotal > 0 && (
                  <div className="space-y-3 pt-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">Payment Method:</label>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      {(["cash", "telebirr", "cbe_birr", "card"] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setPayMethod(m)}
                          className={`py-2 px-2.5 rounded-lg border font-semibold text-center transition ${
                            payMethod === m
                              ? "bg-teal-600 text-white border-teal-600 shadow-xs"
                              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-teal-400"
                          }`}
                        >
                          {m === "cash" && "💵 Cash"}
                          {m === "telebirr" && "📱 Telebirr"}
                          {m === "cbe_birr" && "🏦 CBE Birr"}
                          {m === "card" && "💳 Bank Card"}
                        </button>
                      ))}
                    </div>

                    {(payMethod === "telebirr" || payMethod === "cbe_birr") && (
                      <input
                        value={payRef}
                        onChange={(e) => setPayRef(e.target.value)}
                        placeholder="Transaction Reference ID (e.g. TLB-998241)"
                        className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs rounded-lg focus:outline-hidden focus:border-teal-500"
                      />
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2.5 justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSettlingVisitId("")}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-lg text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={collectPaymentMutation.isPending || (!isCbhi && dynamicTotal <= 0 && payables.items.length > 0 && payables.grossTotal > 0 && payables.totalPaid === 0)}
                    onClick={handleCheckout}
                    className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-lg text-xs shadow-xs transition flex items-center gap-1.5"
                  >
                    <Receipt size={14} />
                    {collectPaymentMutation.isPending
                      ? "Recording Settlement…"
                      : isCbhi
                      ? "Issue CBHI Clearance & Discharge"
                      : `Confirm Payment & Issue Receipt (ETB ${dynamicTotal})`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Today's Collections" value={`ETB ${todayTotal.toLocaleString()}`} sub={`${todayReceipts.length} payments today`} accent />
        <KpiCard label="Ready for Settlement" value={transferredCount} sub="transferred by doctor" />
        <KpiCard label="Past 7 Days" value={`ETB ${weekTotal.toLocaleString()}`} sub={`${weekReceipts.length} transactions`} />
        <KpiCard label="All-Time Revenue" value={`ETB ${totalCollected.toLocaleString()}`} sub={`${receipts.length} total receipts`} />
      </div>

      {/* Section 1: Patients Transferred from Doctor / Ready for Final Settlement */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-teal-600" />
              <h2 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                Patients Transferred from Doctor / Ready for Final Settlement
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Patients who finished doctor consultation and need final cashier discharge settlement
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setQueueTab("ready")}
                className={`px-3 py-1 rounded-md font-medium transition ${
                  queueTab === "ready"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                Ready for Settlement ({transferredCount})
              </button>
              <button
                type="button"
                onClick={() => setQueueTab("all")}
                className={`px-3 py-1 rounded-md font-medium transition ${
                  queueTab === "all"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                All Open Visits ({settlementQueue.length})
              </button>
            </div>

            <div className="relative w-48 sm:w-56">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={queueSearch}
                onChange={(e) => setQueueSearch(e.target.value)}
                placeholder="Search patient, ID, ticket…"
                className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-teal-500"
              />
            </div>
          </div>
        </div>

        {/* Easy Settlement Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px]">
                <th className="text-left px-3.5 py-2.5 font-semibold">Ticket</th>
                <th className="text-left px-3.5 py-2.5 font-semibold">Patient</th>
                <th className="text-left px-3.5 py-2.5 font-semibold">Health ID</th>
                <th className="text-left px-3.5 py-2.5 font-semibold">Coverage</th>
                <th className="text-left px-3.5 py-2.5 font-semibold">Ordered Services</th>
                <th className="text-left px-3.5 py-2.5 font-semibold">Billing Status</th>
                <th className="text-right px-3.5 py-2.5 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredQueue.map((v) => {
                const isTransferred = v.status === "ready_for_billing";
                const labCount = v.labOrders.length;
                const rxCount = v.prescriptions.reduce((s, p) => s + p.lines.length, 0);

                return (
                  <tr
                    key={v.id}
                    className={`border-b border-slate-100 dark:border-slate-800/60 last:border-0 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                      isTransferred ? "bg-amber-50/30 dark:bg-amber-950/10" : ""
                    }`}
                  >
                    <td className="px-3.5 py-2.5 font-mono font-bold text-slate-800 dark:text-slate-100">
                      {v.ticket?.ticketNumber ?? "—"}
                    </td>
                    <td className="px-3.5 py-2.5">
                      <p className="font-medium text-slate-900 dark:text-slate-100">{v.patient.nameEn}</p>
                      {v.patient.phone && (
                        <p className="text-[10px] text-slate-400">{v.patient.phone}</p>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5 font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                      {v.patient.healthId}
                    </td>
                    <td className="px-3.5 py-2.5">
                      {v.patient.cbhiStatus ? (
                        <span className="text-teal-700 dark:text-teal-300 font-semibold bg-teal-50 dark:bg-teal-950/60 px-1.5 py-0.5 rounded border border-teal-200/80 dark:border-teal-800/80 text-[10px]">
                          🛡️ CBHI
                        </span>
                      ) : (
                        <span className="text-slate-600 dark:text-slate-400 text-[11px]">Self-Pay</span>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5 text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {labCount > 0 ? (
                          <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-medium">
                            🔬 {labCount} Lab{labCount > 1 ? "s" : ""}
                          </span>
                        ) : null}
                        {rxCount > 0 ? (
                          <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-medium">
                            💊 {rxCount} Med{rxCount > 1 ? "s" : ""}
                          </span>
                        ) : null}
                        {labCount === 0 && rxCount === 0 && (
                          <span className="text-slate-400 text-[11px]">Consultation only</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5">
                      {isTransferred ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-900 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full font-bold border border-amber-200 dark:border-amber-800/60">
                          ⏳ Transferred by Doctor
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                          In Consultation
                        </span>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => setSettlingVisitId(v.id)}
                        className={`text-xs px-3 py-1 rounded-lg font-semibold transition shadow-xs flex items-center gap-1 ml-auto cursor-pointer ${
                          isTransferred
                            ? "bg-teal-600 hover:bg-teal-500 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-teal-50 dark:hover:bg-slate-700 hover:text-teal-700"
                        }`}
                      >
                        <CreditCard size={12} />
                        <span>Settle Bill</span>
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredQueue.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-xs">
                    {queueSearch
                      ? `No patients matching "${queueSearch}"`
                      : queueTab === "ready"
                      ? "No patients currently waiting for final billing settlement."
                      : "No visits in queue."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: Payment History According to Time */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <Receipt size={16} className="text-teal-600" />
              <h2 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                Payment Transactions by Time
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Cashier receipts organized by date and time of collection
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
                Past 7 Days ({weekReceipts.length})
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

        {/* Time-Segmented Payments Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px]">
                <th className="text-left px-3.5 py-2.5 font-semibold">Time</th>
                <th className="text-left px-3.5 py-2.5 font-semibold">Receipt Number</th>
                <th className="text-left px-3.5 py-2.5 font-semibold">Patient</th>
                <th className="text-left px-3.5 py-2.5 font-semibold">Health ID</th>
                <th className="text-left px-3.5 py-2.5 font-semibold">Category</th>
                <th className="text-left px-3.5 py-2.5 font-semibold">Payment Method</th>
                <th className="text-right px-3.5 py-2.5 font-semibold">Amount Collected</th>
                <th className="text-right px-3.5 py-2.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {activeReceipts.map((r) => (
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
                  <td className="px-3.5 py-2.5 text-right">
                    <span className="text-emerald-700 dark:text-emerald-300 font-semibold bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded text-[10px]">
                      ✓ Cleared
                    </span>
                  </td>
                </tr>
              ))}

              {activeReceipts.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400 text-xs">
                    {receiptSearch ? `No receipts matching "${receiptSearch}"` : "No payment transactions in this time period."}
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
    <Suspense fallback={<PageShell title="Accountant & Billing Counter"><p className="p-4 text-slate-400">Loading…</p></PageShell>}>
      <BillingDashboardContent />
    </Suspense>
  );
}
