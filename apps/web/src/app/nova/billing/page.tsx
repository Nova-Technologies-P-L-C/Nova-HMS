"use client";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { PageShell, KpiCard, Card, StatusBadge, inputCls } from "@/components/nova/nova-ui";
import { ArrowRight, CheckCircle, Receipt, DollarSign, Clock, UserCheck, ShieldCheck, Printer } from "lucide-react";

function BillingDashboardContent() {
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const initialVisitId = searchParams.get("visitId") ?? "";

  const [selectedVisitId, setSelectedVisitId] = useState<string>(initialVisitId);
  const [payCard, setPayCard] = useState<boolean>(true);
  const [payConsultation, setPayConsultation] = useState<boolean>(true);
  const [selectedLabs, setSelectedLabs] = useState<string[]>([]);
  const [selectedDrugs, setSelectedDrugs] = useState<string[]>([]);
  const [payMethod, setPayMethod] = useState<"cash" | "telebirr" | "cbe_birr" | "card">("cash");
  const [payRef, setPayRef] = useState<string>("");
  const [issuedReceipt, setIssuedReceipt] = useState<{ receiptNumber: string; total: number; patientName: string; items: string[] } | null>(null);

  const { data: settlementQueue = [], refetch: refetchQueue } = useQuery(trpc.billing.settlementQueue.queryOptions());
  const { data: claims = [] } = useQuery(trpc.billing.cbhiClaims.queryOptions());
  const { data: waivers = [] } = useQuery(trpc.billing.waivers.queryOptions());
  const { data: receipts = [] } = useQuery(trpc.billing.receipts.queryOptions());

  const { data: payables, refetch: refetchPayables } = useQuery({
    ...trpc.billing.getVisitPayables.queryOptions({ visitId: selectedVisitId }),
    enabled: !!selectedVisitId,
  });

  // When payables load, automatically preselect all unpaid services for convenience
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
      setIssuedReceipt({
        receiptNumber: res.receiptNumber,
        total: res.total,
        patientName: payables?.patient.nameEn ?? "Patient",
        items: res.descriptionList,
      });
      setPayRef("");
    },
  });

  const collected = receipts.reduce((s, r) => s + r.amount, 0);
  const transferredCount = settlementQueue.filter((v) => v.status === "ready_for_billing").length;
  const cbhiPending = claims.filter((c) => c.status === "submitted").length;
  const waiverPending = waivers.filter((w) => w.status === "pending").length;

  const handleSelectVisit = (visitId: string) => {
    setSelectedVisitId(visitId);
    setPayRef("");
  };

  const handleCheckout = () => {
    if (!selectedVisitId) return;
    collectPaymentMutation.mutate({
      visitId: selectedVisitId,
      payCardFee: payCard,
      payConsultation,
      payAdmissionCharges: true,
      labOrderIds: selectedLabs,
      prescriptionLineIds: selectedDrugs,
      paymentMethod: payMethod,
      reference: payRef,
    });
  };

  // Calculate dynamic checkout total based on current cashier selections
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
    // Include Inpatient Bed & Nursing Care charges
    if (!payables.patient.cbhiStatus) {
      for (const item of payables.items.filter((i) => (i.type === "bed" || i.type === "nursing_care") && i.paymentStatus === "unpaid")) {
        dynamicTotal += item.amount;
      }
    }
  }

  const isCbhi = payables?.patient.cbhiStatus;

  return (
    <PageShell title="Cashier & Billing Role" subtitle="End-of-Visit Centralized Settlement, Receipts & Discharge Clearance">
      {/* Official Receipt Modal */}
      {issuedReceipt && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center space-y-4 border border-slate-100">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle size={32} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold">Official Final Discharge Receipt</p>
              <h2 className="text-2xl font-black text-slate-800 font-mono mt-1">{issuedReceipt.receiptNumber}</h2>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-left text-xs space-y-2 border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Patient:</span>
                <span className="font-semibold text-slate-800">{issuedReceipt.patientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Settlement Method:</span>
                <span className="font-semibold text-slate-800 uppercase">{payMethod}</span>
              </div>
              <div className="border-t border-slate-200 pt-2">
                <span className="text-slate-500 block mb-1">Cleared Services:</span>
                <ul className="list-disc pl-4 space-y-0.5 text-slate-700">
                  {issuedReceipt.items.map((it, idx) => (
                    <li key={idx}>{it}</li>
                  ))}
                </ul>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-sm">
                <span>Total Amount Collected:</span>
                <span className="text-emerald-700">ETB {issuedReceipt.total}</span>
              </div>
            </div>
            <p className="text-[11px] text-teal-700 bg-teal-50 py-1.5 px-3 rounded-md font-medium">
              ✓ Visit completed & cleared. Patient can proceed to Pharmacy for dispensing and final discharge.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900 flex items-center justify-center gap-1.5"
              >
                <Printer size={15} /> Print Receipt
              </button>
              <button
                onClick={() => setIssuedReceipt(null)}
                className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Total Revenue Collected" value={`ETB ${collected.toLocaleString()}`} accent />
        <KpiCard label="Transferred for Billing" value={transferredCount} sub="awaiting settlement" />
        <KpiCard label="Receipts Issued" value={receipts.length} />
        <KpiCard label="CBHI Claims Active" value={cbhiPending} />
      </div>

      {/* Patients Transferred from Doctor Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-teal-600" />
            <h3 className="font-bold text-slate-800 text-sm">Patients Transferred from Doctor / Ready for Final Settlement</h3>
          </div>
          <span className="text-xs text-slate-500">{settlementQueue.length} patient(s) in billing queue</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {settlementQueue.map((v) => {
            const isSelected = selectedVisitId === v.id;
            const isTransferred = v.status === "ready_for_billing";
            const labCount = v.labOrders.length;
            const rxCount = v.prescriptions.reduce((s, p) => s + p.lines.length, 0);

            return (
              <div
                key={v.id}
                onClick={() => handleSelectVisit(v.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? "border-teal-600 bg-teal-50/40 shadow-sm"
                    : isTransferred
                    ? "border-amber-300 bg-amber-50/20 hover:border-amber-400"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-800 text-sm">{v.patient.nameEn}</p>
                      {v.patient.cbhiStatus ? (
                        <span className="text-[10px] px-1.5 py-0.2 bg-teal-100 text-teal-800 font-semibold rounded">CBHI</span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-600 font-semibold rounded">Self-Pay</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{v.patient.healthId} · Ticket: {v.ticket?.ticketNumber ?? "N/A"}</p>
                  </div>
                  {isTransferred ? (
                    <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-900 font-bold rounded-full">
                      ⏳ Transferred
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 font-medium rounded-full">
                      In-Progress
                    </span>
                  )}
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    {labCount > 0 ? `${labCount} Lab(s)` : "No Labs"} · {rxCount > 0 ? `${rxCount} Drug(s)` : "No Drugs"}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectVisit(v.id);
                    }}
                    className="text-xs text-teal-600 font-semibold hover:underline flex items-center gap-1"
                  >
                    Checkout <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            );
          })}
          {settlementQueue.length === 0 && (
            <p className="col-span-3 text-xs text-slate-400 py-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              No patients currently waiting for checkout. When a doctor completes consultation and clicks "Transfer to Billing", the patient will appear here.
            </p>
          )}
        </div>
      </div>

      {/* Cashier Point of Sale (POS) Counter */}
      <Card className="p-6 mb-8 border-teal-200 bg-gradient-to-r from-teal-50/30 via-white to-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-teal-600 text-white rounded-lg">
              <DollarSign size={20} />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-base">Consolidated Cashier Checkout (POS)</h2>
              <p className="text-xs text-slate-500">Settle all accumulated diagnostic investigations, prescriptions, and fees in one place</p>
            </div>
          </div>
          <span className="text-xs px-2.5 py-1 bg-teal-100 text-teal-800 font-semibold rounded-full">
            Cashier Desk Active
          </span>
        </div>

        {/* Visit Selector Dropdown */}
        <div className="mb-5">
          <label className="text-xs font-semibold text-slate-700 block mb-1">Select Patient to Settle:</label>
          <select
            value={selectedVisitId}
            onChange={(e) => handleSelectVisit(e.target.value)}
            className={`${inputCls} w-full`}
          >
            <option value="">-- Choose Patient Transferred from Doctor --</option>
            {settlementQueue.map((v) => (
              <option key={v.id} value={v.id}>
                {v.status === "ready_for_billing" ? "★ [TRANSFERRED]" : "[ACTIVE]"} {v.ticket?.ticketNumber ?? "N/A"} · {v.patient.nameEn} ({v.patient.healthId}) {v.patient.cbhiStatus ? "[CBHI]" : "[Self-Pay]"}
              </option>
            ))}
          </select>
        </div>

        {/* Payables Details */}
        {selectedVisitId && payables && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
            {/* Patient Header */}
            <div className="flex items-center justify-between border-b pb-4 border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-slate-900 text-base">{payables.patient.nameEn}</p>
                  {isCbhi && (
                    <span className="text-xs px-2 py-0.5 bg-teal-100 text-teal-800 rounded font-semibold flex items-center gap-1">
                      <ShieldCheck size={12} /> Community-Based Health Insurance (CBHI)
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Health ID: {payables.patient.healthId} · Phone: {payables.patient.phone || "N/A"} · Ticket: {payables.visit.ticket?.ticketNumber ?? "N/A"}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 block">Net Amount to Collect</span>
                <span className="text-2xl font-black text-teal-700">
                  {isCbhi ? "ETB 0 (CBHI)" : `ETB ${dynamicTotal}`}
                </span>
              </div>
            </div>

            {/* Itemized Services Breakdown */}
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Itemized Visit Charges</p>

              {/* 1. OPD Card Fee */}
              {payables.items.filter((i) => i.type === "card_fee").map((i) => (
                <div key={i.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/60">
                  <div className="flex items-center gap-3">
                    <span className="text-base">🏥</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{i.name}</p>
                      <p className="text-xs text-slate-400">Front desk registration tariff</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-800">ETB {i.amount}</span>
                    {i.paymentStatus === "paid" ? (
                      <span className="text-[11px] px-2.5 py-0.5 rounded font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        ✓ Paid at Card Desk {i.receiptNumber ? `(${i.receiptNumber})` : ""}
                      </span>
                    ) : i.paymentStatus === "cbhi_covered" ? (
                      <span className="text-[11px] px-2.5 py-0.5 rounded font-semibold bg-teal-100 text-teal-800">
                        🛡️ CBHI Covered
                      </span>
                    ) : (
                      <span className="text-[11px] px-2.5 py-0.5 rounded font-semibold bg-amber-100 text-amber-800">
                        ⚠️ Unpaid Card Fee
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {/* 2. Doctor Consultation Fee */}
              {payables.items.filter((i) => i.type === "consultation").map((i) => (
                <div key={i.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={payConsultation}
                      disabled={isCbhi || i.paymentStatus === "paid"}
                      onChange={(e) => setPayConsultation(e.target.checked)}
                      className="accent-teal-600 w-4 h-4"
                    />
                    <span className="text-base">👨‍⚕️</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{i.name}</p>
                      <p className="text-xs text-slate-400">Clinical assessment & diagnosis tariff</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-800">ETB {i.amount}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded font-semibold ${
                      i.paymentStatus === "paid" ? "bg-emerald-100 text-emerald-800" :
                      isCbhi || i.paymentStatus === "cbhi_covered" ? "bg-teal-100 text-teal-800" : "bg-amber-100 text-amber-800"
                    }`}>
                      {isCbhi ? "CBHI COVERED" : i.paymentStatus.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}

              {/* 3. Diagnostic Lab Orders */}
              {payables.items.filter((i) => i.type === "lab").map((i) => {
                const checked = selectedLabs.includes(i.id);
                return (
                  <label key={i.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={isCbhi || i.paymentStatus === "paid"}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedLabs((p) => [...p, i.id]);
                          else setSelectedLabs((p) => p.filter((x) => x !== i.id));
                        }}
                        className="accent-teal-600 w-4 h-4"
                      />
                      <span className="text-base">🔬</span>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{i.name}</p>
                        <p className="text-xs text-slate-400">Completed diagnostic investigation</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-slate-800">ETB {i.amount}</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded font-semibold ${
                        i.paymentStatus === "paid" ? "bg-emerald-100 text-emerald-800" :
                        isCbhi || i.paymentStatus === "cbhi_covered" ? "bg-teal-100 text-teal-800" : "bg-amber-100 text-amber-800"
                      }`}>
                        {isCbhi ? "CBHI COVERED" : i.paymentStatus.toUpperCase()}
                      </span>
                    </div>
                  </label>
                );
              })}

              {/* 4. Prescription Medications */}
              {payables.items.filter((i) => i.type === "drug").map((i) => {
                const checked = selectedDrugs.includes(i.id);
                return (
                  <label key={i.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={isCbhi || i.paymentStatus === "paid"}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedDrugs((p) => [...p, i.id]);
                          else setSelectedDrugs((p) => p.filter((x) => x !== i.id));
                        }}
                        className="accent-teal-600 w-4 h-4"
                      />
                      <span className="text-base">💊</span>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{i.name}</p>
                        <p className="text-xs text-slate-400">Pharmacy stock medication</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-slate-800">ETB {i.amount}</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded font-semibold ${
                        i.paymentStatus === "paid" ? "bg-emerald-100 text-emerald-800" :
                        isCbhi || i.paymentStatus === "cbhi_covered" ? "bg-teal-100 text-teal-800" : "bg-amber-100 text-amber-800"
                      }`}>
                        {isCbhi ? "CBHI COVERED" : i.paymentStatus.toUpperCase()}
                      </span>
                    </div>
                  </label>
                );
              })}

              {/* 5. Inpatient Ward Bed & Nursing Care Charges */}
              {payables.items.filter((i) => i.type === "bed" || i.type === "nursing_care").map((i) => {
                const isBed = i.type === "bed";
                return (
                  <div key={i.id} className="flex items-center justify-between p-3 rounded-lg border border-teal-100 bg-teal-50/40">
                    <div className="flex items-center gap-3">
                      <span className="text-base">{isBed ? "🛏️" : "👩‍⚕️"}</span>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{i.name}</p>
                        <p className="text-xs text-slate-400">
                          {isBed ? "Inpatient room & bed accommodation tariff" : "Daily inpatient nursing & clinical care service"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-slate-800">ETB {i.amount}</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded font-semibold ${
                        i.paymentStatus === "paid" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                        isCbhi || i.paymentStatus === "cbhi_covered" ? "bg-teal-100 text-teal-800" : "bg-amber-100 text-amber-800 border border-amber-200"
                      }`}>
                        {i.paymentStatus === "paid" ? "✓ PAID" : isCbhi ? "CBHI COVERED" : "UNPAID WARD CHARGE"}
                      </span>
                    </div>
                  </div>
                );
              })}

              {payables.items.length === 0 && (
                <p className="text-xs text-slate-400 py-3 text-center">No services recorded for this visit yet.</p>
              )}
            </div>

            {/* Financial Summary Calculation Card */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Gross Medical Charges:</span>
                <span className="font-semibold text-slate-800">ETB {payables.grossTotal}</span>
              </div>
              {payables.totalPaid > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Less: Already Paid (Card Desk / Front Office):</span>
                  <span className="font-semibold">-ETB {payables.totalPaid}</span>
                </div>
              )}
              {isCbhi && (
                <div className="flex justify-between text-teal-700">
                  <span>Less: CBHI Insurance Coverage:</span>
                  <span className="font-semibold">-ETB {payables.grossTotal}</span>
                </div>
              )}
              <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-black text-slate-900">
                <span>Total Net Balance Due:</span>
                <span className="text-teal-700">{isCbhi ? "ETB 0.00" : `ETB ${dynamicTotal}`}</span>
              </div>
            </div>

            {/* Payment Method Selector & Final Settlement */}
            <div className="border-t pt-4 space-y-4">
              {!isCbhi ? (
                <>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-2">Select Payment Method:</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      {(["cash", "telebirr", "cbe_birr", "card"] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setPayMethod(m)}
                          className={`p-2.5 rounded-lg border font-medium text-center transition-all ${
                            payMethod === m ? "bg-teal-600 text-white border-teal-600 shadow-sm" : "bg-white text-slate-700 border-slate-200 hover:border-teal-400"
                          }`}
                        >
                          {m === "cash" && "💵 Cash"}
                          {m === "telebirr" && "📱 Telebirr"}
                          {m === "cbe_birr" && "🏦 CBE Birr"}
                          {m === "card" && "💳 Bank Card"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {(payMethod === "telebirr" || payMethod === "cbe_birr") && (
                    <div>
                      <label className="text-xs text-slate-600 block mb-1">Transaction Reference / Confirmation ID:</label>
                      <input
                        value={payRef}
                        onChange={(e) => setPayRef(e.target.value)}
                        placeholder="e.g. TLB-998241 or CBE-2026-443"
                        className={inputCls}
                      />
                    </div>
                  )}

                  <button
                    onClick={handleCheckout}
                    disabled={collectPaymentMutation.isPending || dynamicTotal <= 0}
                    className={`w-full py-3 text-white rounded-lg font-bold transition-all shadow-sm flex items-center justify-center gap-2 ${
                      dynamicTotal > 0
                        ? "bg-teal-600 hover:bg-teal-700 cursor-pointer"
                        : "bg-slate-300 opacity-60 cursor-not-allowed"
                    }`}
                  >
                    <Receipt size={18} />
                    {collectPaymentMutation.isPending
                      ? "Processing Settlement…"
                      : `💳 Settle Final Bill & Discharge Patient (ETB ${dynamicTotal})`}
                  </button>
                </>
              ) : (
                <button
                  onClick={handleCheckout}
                  disabled={collectPaymentMutation.isPending}
                  className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  <ShieldCheck size={18} />
                  {collectPaymentMutation.isPending
                    ? "Generating CBHI Clearance…"
                    : "🛡️ Issue CBHI Clearance & Discharge Patient (0 ETB Co-pay)"}
                </button>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Receipts Ledger & Summaries */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Official Receipts Ledger */}
        <Card>
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <p className="font-medium text-slate-800 text-sm">Official Receipts Ledger</p>
            <span className="text-xs text-slate-400">{receipts.length} transactions</span>
          </div>
          <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
            {receipts.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-teal-800">{r.receiptNumber}</span>
                    <span className="text-[10px] uppercase px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">{r.category}</span>
                  </div>
                  <p className="text-sm font-medium text-slate-800 mt-0.5">{r.patient.nameEn}</p>
                  <p className="text-xs text-slate-400">{new Date(r.createdAt).toLocaleString()} · {r.paymentMethod.toUpperCase()}</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-emerald-700">+ETB {r.amount}</span>
                  <span className="block text-[10px] text-slate-400">Cleared</span>
                </div>
              </div>
            ))}
            {receipts.length === 0 && <p className="px-4 py-6 text-sm text-slate-400 text-center">No receipts recorded yet</p>}
          </div>
        </Card>

        {/* CBHI Claims & Invoices */}
        <Card>
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <p className="font-medium text-slate-800 text-sm">CBHI Claims Submitted</p>
            <Link href="/nova/billing/cbhi" className="text-xs text-teal-600 hover:underline flex items-center gap-1">Manage <ArrowRight size={11} /></Link>
          </div>
          <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
            {claims.map((c) => (
              <div key={c.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">{c.invoice?.visit?.patient?.nameEn ?? "—"}</p>
                  <p className="text-xs text-slate-400">{new Date(c.submittedAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-teal-700">ETB {c.amount}</span>
                  <StatusBadge status={c.status} />
                </div>
              </div>
            ))}
            {claims.length === 0 && <p className="px-4 py-6 text-sm text-slate-400 text-center">No CBHI claims yet</p>}
          </div>
        </Card>
      </div>
    </PageShell>
  );
}

export default function BillingDashboard() {
  return (
    <Suspense fallback={<PageShell title="Cashier & Billing Role"><p className="p-4 text-slate-400">Loading…</p></PageShell>}>
      <BillingDashboardContent />
    </Suspense>
  );
}
