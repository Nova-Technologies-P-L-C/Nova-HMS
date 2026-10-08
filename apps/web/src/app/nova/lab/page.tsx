"use client";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { PageShell, DataTable, StatusBadge, KpiCard } from "@/components/nova/nova-ui";
import { Lock, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";

export default function LabQueuePage() {
  const qc = useQueryClient();

  const { data: orders = [] } = useQuery(trpc.lab.queue.queryOptions());

  const updateStatus = useMutation(
    trpc.lab.updateStatus.mutationOptions({
      onSuccess: () => qc.invalidateQueries({ queryKey: trpc.lab.queue.queryKey() }),
    })
  );

  const pending = orders.filter((o) => o.status !== "completed").length;
  const urgent = orders.filter((o) => o.priority === "urgent").length;
  const unpaidCount = orders.filter((o) => o.paymentStatus === "unpaid").length;

  return (
    <PageShell title="Lab Orders Queue" subtitle="Diagnostic Technician Station · Central Cashier Clearance Gate">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
        <KpiCard label="Pending / in-progress" value={pending} accent />
        <KpiCard label="Urgent Priority" value={urgent} />
        <KpiCard label="Awaiting Central Cashier" value={unpaidCount} />
        <KpiCard label="Completed today" value={orders.filter((o) => o.status === "completed").length} />
      </div>

      {unpaidCount > 0 && (
        <div className="mb-5 p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              <strong>Pre-Payment Policy Active:</strong> {unpaidCount} lab test{unpaidCount > 1 ? "s are" : " is"} locked. Direct patients to Central Billing Cashier before processing specimen or entering results.
            </span>
          </div>
          <Link
            href="/nova/billing"
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition flex items-center gap-1 shrink-0 ml-3"
          >
            Central Billing POS <ArrowRight size={12} />
          </Link>
        </div>
      )}

      <DataTable
        columns={["Order ID", "Patient", "Test", "Tariff & Clearance", "Priority", "Status", "Actions"]}
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
                    ✓ Paid by Cashier ({o.price} ETB)
                  </span>
                  {o.receiptNumber && <span className="block text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">{o.receiptNumber}</span>}
                </div>
              )}
              {o.paymentStatus === "cbhi_covered" && (
                <span className="text-xs px-2 py-0.5 bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 rounded font-medium border border-teal-200 dark:border-teal-800 inline-flex items-center gap-1">
                  <ShieldCheck size={12} /> CBHI Covered
                </span>
              )}
              {o.paymentStatus === "emergency_exempt" && (
                <span className="text-xs px-2 py-0.5 bg-red-50 dark:bg-red-950/50 text-red-800 dark:text-red-300 rounded font-medium border border-red-200 dark:border-red-800">
                  🚨 Emergency Exempt
                </span>
              )}
              {o.paymentStatus === "unpaid" && (
                <div>
                  <span className="text-xs px-2 py-0.5 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 rounded font-semibold border border-amber-300 dark:border-amber-700 inline-flex items-center gap-1">
                    <Lock size={10} /> Unpaid ({o.price} ETB)
                  </span>
                  <span className="block text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Settle at Central Billing</span>
                </div>
              )}
            </div>,
            <span key="prio" className={`text-xs px-2 py-0.5 rounded-full font-medium ${o.priority === "urgent" ? "bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"}`}>{o.priority}</span>,
            <StatusBadge key="status" status={o.status} />,
            <div key="actions" className="flex items-center gap-2">
              {isCleared ? (
                <>
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
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded font-medium cursor-not-allowed border border-slate-200 dark:border-slate-700 flex items-center gap-1"
                    title="Pre-payment required: Fee must be settled at Central Billing Cashier first"
                  >
                    <Lock size={11} /> Locked
                  </span>
                  <Link
                    href={`/nova/billing?visitId=${o.visitId}`}
                    className="text-xs px-2.5 py-1 bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 rounded hover:bg-teal-100 dark:hover:bg-teal-900/50 font-medium transition-colors"
                  >
                    Central Cashier →
                  </Link>
                </div>
              )}
            </div>,
          ];
        })}
      />
    </PageShell>
  );
}
