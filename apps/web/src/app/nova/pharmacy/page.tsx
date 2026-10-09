"use client";
import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { PageShell, KpiCard, Card, StatusBadge } from "@/components/nova/nova-ui";
import { CheckCircle, Pill, Lock, CreditCard, ArrowRight, ShieldCheck } from "lucide-react";

export default function PharmacyQueuePage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<"pending" | "dispensed">("pending");

  const { data: rxList = [], isLoading } = useQuery({
    ...trpc.prescription.queue.queryOptions(),
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const { data: dispensedList = [] } = useQuery({
    ...trpc.prescription.dispensed.queryOptions(),
    refetchOnMount: true,
  });

  const dispense = useMutation(
    trpc.prescription.dispense.mutationOptions({
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: trpc.prescription.queue.queryKey() });
        qc.invalidateQueries({ queryKey: trpc.prescription.dispensed.queryKey() });
        setSelected(null);
      },
    })
  );

  const [payingRx, setPayingRx] = useState<{ id: string; patientName: string; total: number; drugs: string } | null>(null);
  const [modalMethod, setModalMethod] = useState<"cash" | "telebirr" | "cbe_birr" | "card">("cash");
  const [modalRef, setModalRef] = useState("");

  const payRxMutation = useMutation({
    ...trpc.prescription.payPrescription.mutationOptions(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: trpc.prescription.queue.queryKey() });
      setPayingRx(null);
      setModalRef("");
    },
  });

  const selectedRx = rxList.find((r) => r.id === selected);

  const calcQty = (freq: string, days: number) =>
    days * (freq.includes("3x") || freq.includes("3 x") ? 3 : freq.includes("2x") || freq.includes("2 x") ? 2 : freq.includes("4x") ? 4 : 1);

  const shownList = tab === "pending" ? rxList : dispensedList;

  return (
    <PageShell title="Prescription Queue" subtitle="Dispense medications & Payment Clearance Gate">
      {/* Pharmacy Payment Modal */}
      {payingRx && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">Collect Pharmacy Payment</h3>
              <button onClick={() => setPayingRx(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm">✕</button>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{payingRx.patientName}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{payingRx.drugs}</p>
              <p className="text-sm font-bold text-teal-800 dark:text-teal-400 mt-1">Total Due: ETB {payingRx.total}</p>
            </div>
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">Payment Method:</label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {(["cash", "telebirr", "cbe_birr"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setModalMethod(m)}
                    className={`py-2 px-3 rounded-lg border font-medium text-center transition-all ${
                      modalMethod === m ? "bg-teal-600 text-white border-teal-600" : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-teal-400"
                    }`}
                  >
                    {m === "cash" ? "💵 Cash" : m === "telebirr" ? "📱 Telebirr" : "🏦 CBE Birr"}
                  </button>
                ))}
              </div>
              {(modalMethod === "telebirr" || modalMethod === "cbe_birr") && (
                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-300 block mb-1">Transaction Ref / ID:</label>
                  <input
                    value={modalRef}
                    onChange={(e) => setModalRef(e.target.value)}
                    placeholder="e.g. TLB-998241"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded text-sm focus:outline-none focus:border-teal-500"
                  />
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <button type="button" onClick={() => setPayingRx(null)} className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded text-sm hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
              <button
                type="button"
                disabled={payRxMutation.isPending}
                onClick={() => payRxMutation.mutate({ prescriptionId: payingRx.id, paymentMethod: modalMethod, reference: modalRef })}
                className="px-4 py-2 bg-teal-600 text-white rounded text-sm font-medium hover:bg-teal-700"
              >
                {payRxMutation.isPending ? "Recording…" : "Confirm Payment & Unlock Dispense"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-6">
        <KpiCard label="Pending" value={rxList.length} accent={rxList.length > 0} />
        <KpiCard label="Dispensed today" value={dispensedList.length} />
        <KpiCard label="Total" value={rxList.length + dispensedList.length} />
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 mb-4">
        <button onClick={() => setTab("pending")}
          className={`px-4 py-1.5 text-sm rounded border transition-colors ${tab === "pending" ? "bg-teal-600 text-white border-teal-600" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-teal-400"}`}>
          Pending ({rxList.length})
        </button>
        <button onClick={() => setTab("dispensed")}
          className={`px-4 py-1.5 text-sm rounded border transition-colors ${tab === "dispensed" ? "bg-teal-600 text-white border-teal-600" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-teal-400"}`}>
          Dispensed ({dispensedList.length})
        </button>
      </div>

      {isLoading && <p className="text-sm text-slate-400 py-4">Loading…</p>}

      {!isLoading && shownList.length === 0 && (
        <Card className="p-12 text-center">
          <Pill size={32} className="text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">{tab === "pending" ? "No pending prescriptions." : "No dispensed prescriptions yet."}</p>
        </Card>
      )}

      <div className="space-y-3">
        {shownList.map((rx) => {
          const isSelected = selected === rx.id;
          const isAllPaid = rx.lines.every(
            (l) => l.paymentStatus === "paid" || l.paymentStatus === "cbhi_covered" || l.paymentStatus === "emergency_exempt"
          );
          const totalCost = rx.lines.reduce((s, l) => s + (l.totalPrice ?? 45), 0);

          return (
            <Card key={rx.id} className={`overflow-hidden transition-all ${isSelected ? "border-teal-400" : ""}`}>
              {/* Header row */}
              <div
                className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${rx.status === "pending" ? "" : "bg-slate-50/60 dark:bg-slate-800/30"}`}
                onClick={() => setSelected(isSelected ? null : rx.id)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 font-bold text-xs flex items-center justify-center shrink-0">
                    {rx.visit.patient.nameEn.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm truncate">{rx.visit.patient.nameEn}</p>
                    <p className="text-xs text-slate-400">{rx.visit.patient.healthId} · {rx.lines.length} medication{rx.lines.length > 1 ? "s" : ""} · Total: ETB {totalCost}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {isAllPaid ? (
                    <span className="text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full font-medium">
                      ✓ Cleared (Ready to Dispense)
                    </span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                        <Lock size={10} /> Unpaid (ETB {totalCost})
                      </span>
                      {rx.status === "pending" && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPayingRx({
                              id: rx.id,
                              patientName: rx.visit.patient.nameEn,
                              total: totalCost,
                              drugs: rx.lines.map((l) => l.itemName).join(", "),
                            });
                          }}
                          className="text-xs px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded font-bold shadow-xs transition flex items-center gap-1"
                        >
                          <CreditCard size={11} /> Settle Here
                        </button>
                      )}
                    </div>
                  )}
                  {rx.visit.patient.cbhiStatus && (
                    <span className="text-xs text-teal-600 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                      <ShieldCheck size={11} /> CBHI
                    </span>
                  )}
                  <StatusBadge status={rx.status} />
                  <span className="text-xs text-slate-400">{new Date(rx.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </div>

              {/* Expanded detail */}
              {isSelected && (
                <div className="border-t border-slate-100 px-4 py-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Medications & Pricing</p>
                    <span className="text-xs font-bold text-slate-800">Total Prescription Cost: ETB {totalCost}</span>
                  </div>

                  {rx.lines.map((l) => {
                    const qty = calcQty(l.frequency, l.durationDays);
                    return (
                      <div key={l.id} className="grid grid-cols-2 md:grid-cols-6 gap-3 text-sm p-3 bg-slate-50 rounded-lg border border-slate-100 items-center">
                        <div className="md:col-span-2">
                          <p className="text-xs text-slate-400">Drug</p>
                          <p className="font-semibold text-slate-800">{l.itemName}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Dose & Freq</p>
                          <p className="text-xs">{l.dose} · {l.frequency}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Duration / Qty</p>
                          <p className="font-semibold text-teal-700 text-xs">{l.durationDays}d ({qty} units)</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Tariff Price</p>
                          <p className="font-bold text-slate-800 text-xs">ETB {l.totalPrice ?? 45}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Clearance</p>
                          {l.paymentStatus === "paid" && (
                            <span className="text-[11px] text-emerald-700 font-semibold">✓ Paid</span>
                          )}
                          {l.paymentStatus === "cbhi_covered" && (
                            <span className="text-[11px] text-teal-700 font-medium">🛡️ CBHI</span>
                          )}
                          {l.paymentStatus === "emergency_exempt" && (
                            <span className="text-[11px] text-red-700 font-medium">🚨 Emergency</span>
                          )}
                          {l.paymentStatus === "unpaid" && (
                            <span className="text-[11px] text-amber-700 font-bold">⚠️ Unpaid</span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Payment Alert & Action - DUAL SETTLEMENT */}
                  {!isAllPaid && rx.status === "pending" && (
                    <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Lock size={18} className="text-amber-600 dark:text-amber-400 shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                              🔒 Pre-Payment Required Before Medication Dispense
                            </p>
                            <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                              Prescription total: <strong>ETB {totalCost}</strong>. Dual settlement is supported: collect at pharmacy window or central cashier.
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-teal-800 dark:text-teal-300 bg-teal-100 dark:bg-teal-950/80 px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
                          Dual POS Enabled
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-amber-200/60 dark:border-amber-800/60">
                        <button
                          type="button"
                          onClick={() =>
                            setPayingRx({
                              id: rx.id,
                              patientName: rx.visit.patient.nameEn,
                              total: totalCost,
                              drugs: rx.lines.map((l) => l.itemName).join(", "),
                            })
                          }
                          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                        >
                          <CreditCard size={13} /> Settle & Pay at Pharmacy Window (ETB {totalCost})
                        </button>
                        <span className="text-xs text-slate-400 font-medium">— OR —</span>
                        <Link
                          href={`/nova/billing?visitId=${rx.visitId}`}
                          className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-teal-400 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                        >
                          Direct Patient to Central Billing Desk <ArrowRight size={12} />
                        </Link>
                      </div>
                    </div>
                  )}

                  {rx.status === "pending" && (
                    <div className="flex gap-2 pt-1 items-center">
                      <button
                        onClick={() => dispense.mutate({ prescriptionId: rx.id })}
                        disabled={dispense.isPending || !isAllPaid}
                        className={`flex items-center gap-2 px-5 py-2.5 text-white text-sm rounded-lg font-medium transition-all ${
                          isAllPaid
                            ? "bg-teal-600 hover:bg-teal-700 cursor-pointer"
                            : "bg-slate-300 opacity-60 cursor-not-allowed"
                        }`}
                      >
                        <CheckCircle size={15} />
                        {dispense.isPending ? "Dispensing…" : isAllPaid ? "Confirm & Dispense (FEFO)" : "Locked (Payment Required)"}
                      </button>
                      {!isAllPaid && (
                        <span className="text-xs text-slate-500">Collect payment above or at Central Cashier to unlock dispensing.</span>
                      )}
                    </div>
                  )}

                  {rx.status === "dispensed" && (
                    <div className="flex items-center gap-2 text-teal-600 text-sm font-medium">
                      <CheckCircle size={15} /> Dispensed via FEFO order
                    </div>
                  )}

                  {dispense.error && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                      {dispense.error.message}
                    </p>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </PageShell>
  );
}
