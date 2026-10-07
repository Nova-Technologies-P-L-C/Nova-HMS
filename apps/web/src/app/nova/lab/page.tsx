"use client";
import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { PageShell, DataTable, StatusBadge, KpiCard } from "@/components/nova/nova-ui";

export default function LabQueuePage() {
  const qc = useQueryClient();
  const [payingOrder, setPayingOrder] = useState<{ id: string; testName: string; price: number; patientName: string } | null>(null);
  const [modalMethod, setModalMethod] = useState<"cash" | "telebirr" | "cbe_birr" | "card">("cash");
  const [modalRef, setModalRef] = useState("");

  const { data: orders = [] } = useQuery(trpc.lab.queue.queryOptions());

  const updateStatus = useMutation(
    trpc.lab.updateStatus.mutationOptions({
      onSuccess: () => qc.invalidateQueries({ queryKey: trpc.lab.queue.queryKey() }),
    })
  );

  const payOrderMutation = useMutation({
    ...trpc.lab.payOrder.mutationOptions(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: trpc.lab.queue.queryKey() });
      setPayingOrder(null);
      setModalRef("");
    },
  });

  const pending = orders.filter((o) => o.status !== "completed").length;
  const urgent = orders.filter((o) => o.priority === "urgent").length;

  return (
    <PageShell title="Lab Orders Queue" subtitle="Lab Technician view & Service Clearance Gate">
      {/* Payment Modal for Lab */}
      {payingOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">Collect Lab Test Payment</h3>
              <button onClick={() => setPayingOrder(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm">✕</button>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{payingOrder.patientName}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Test: {payingOrder.testName} · Cost: <strong className="text-teal-600 dark:text-teal-400">ETB {payingOrder.price}</strong></p>
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
                      modalMethod === m
                        ? "bg-teal-600 text-white border-teal-600"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-teal-400"
                    }`}
                  >
                    {m === "cash" ? "💵 Cash" : m === "telebirr" ? "📱 Telebirr" : "🏦 CBE Birr"}
                  </button>
                ))}
              </div>
              {(modalMethod === "telebirr" || modalMethod === "cbe_birr") && (
                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">Transaction Ref / ID:</label>
                  <input
                    value={modalRef}
                    onChange={(e) => setModalRef(e.target.value)}
                    placeholder="e.g. TLB-998241"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded text-sm focus:outline-none focus:border-teal-500"
                  />
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <button type="button" onClick={() => setPayingOrder(null)} className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded text-sm hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
              <button
                type="button"
                disabled={payOrderMutation.isPending}
                onClick={() => payOrderMutation.mutate({ orderId: payingOrder.id, paymentMethod: modalMethod, reference: modalRef })}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded text-sm font-medium transition-colors"
              >
                {payOrderMutation.isPending ? "Recording…" : "Confirm Payment & Unlock Test"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-6">
        <KpiCard label="Pending / in-progress" value={pending} accent />
        <KpiCard label="Urgent" value={urgent} />
        <KpiCard label="Completed today" value={orders.filter((o) => o.status === "completed").length} />
      </div>

      <DataTable
        columns={["Order ID", "Patient", "Test", "Tariff & Payment", "Priority", "Status", "Actions"]}
        rows={orders.map((o) => {
          const isCleared = o.paymentStatus === "paid" || o.paymentStatus === "cbhi_covered" || o.paymentStatus === "emergency_exempt";
          return [
            <span key="id" className="font-mono text-xs text-slate-600 dark:text-slate-400">{o.id.slice(-6)}</span>,
            <span key="patient" className="font-medium text-slate-800 dark:text-slate-100">{o.visit.patient.nameEn}</span>,
            <span key="test" className="font-medium text-slate-800 dark:text-slate-200">{o.testName}</span>,
            <div key="payment">
              {o.paymentStatus === "paid" && (
                <div>
                  <span className="text-xs px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 rounded font-semibold border border-emerald-200 dark:border-emerald-800">
                    ✓ Paid by Billing ({o.price} ETB)
                  </span>
                  {o.receiptNumber && <span className="block text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">{o.receiptNumber}</span>}
                </div>
              )}
              {o.paymentStatus === "cbhi_covered" && (
                <span className="text-xs px-2 py-0.5 bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 rounded font-medium border border-teal-200 dark:border-teal-800">
                  🛡️ CBHI Covered
                </span>
              )}
              {o.paymentStatus === "emergency_exempt" && (
                <span className="text-xs px-2 py-0.5 bg-red-50 dark:bg-red-950/50 text-red-800 dark:text-red-300 rounded font-medium border border-red-200 dark:border-red-800">
                  🚨 Emergency Exempt
                </span>
              )}
              {o.paymentStatus === "unpaid" && (
                <div>
                  <span className="text-xs px-2 py-0.5 bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 rounded font-semibold border border-blue-200 dark:border-blue-800">
                    📋 Billed to Visit ({o.price} ETB)
                  </span>
                  <span className="block text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Settled at Billing counter</span>
                </div>
              )}
            </div>,
            <span key="prio" className={`text-xs px-2 py-0.5 rounded-full font-medium ${o.priority === "urgent" ? "bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"}`}>{o.priority}</span>,
            <StatusBadge key="status" status={o.status} />,
            <div key="actions" className="flex gap-2">
              {o.status === "pending" && (
                <button
                  onClick={() => updateStatus.mutate({ orderId: o.id, status: "in-progress" })}
                  className="text-xs px-2.5 py-1 rounded border bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/50 font-medium transition-colors"
                >
                  Start
                </button>
              )}
              {o.status !== "completed" && (
                <Link href={`/nova/lab/result?orderId=${o.id}`} className="text-xs px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded font-medium transition-colors">
                  Enter result →
                </Link>
              )}
            </div>,
          ];
        })}
      />
    </PageShell>
  );
}
