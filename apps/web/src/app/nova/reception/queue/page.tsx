"use client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import Link from "next/link";
import { trpc, queryClient } from "@/utils/trpc";
import { PageShell, StatusBadge } from "@/components/nova/nova-ui";
import { Monitor } from "lucide-react";

const STATUS_DOT: Record<string, string> = {
  "being-seen": "bg-teal-500",
  waiting: "bg-amber-400",
  urgent: "bg-red-500",
  done: "bg-slate-300",
};

export default function OPDQueueBoardPage() {
  const [fullscreen, setFullscreen] = useState(false);

  const { data: queue = [], refetch } = useQuery({
    ...trpc.visit.queue.queryOptions(),
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  const updateStatus = useMutation({
    ...trpc.visit.updateTicketStatus.mutationOptions(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: trpc.visit.queue.queryKey() }),
  });

  const now = queue.filter((q) => q.status === "being-seen");
  const waiting = queue.filter((q) => q.status === "waiting" || q.status === "urgent");
  const done = queue.filter((q) => q.status === "done");

  if (fullscreen) {
    return (
      <div className="h-full bg-[#0a1929] p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-teal-500 flex items-center justify-center font-bold text-white">N</div>
            <div>
              <p className="text-white font-semibold">Nova HMS — OPD Queue</p>
              <p className="text-slate-400 text-xs">{new Date().toLocaleTimeString()}</p>
            </div>
          </div>
          <button onClick={() => setFullscreen(false)} className="text-xs text-slate-400 hover:text-white px-3 py-1.5 border border-slate-700 rounded">Exit display</button>
        </div>
        {now.length > 0 && (
          <div className="mb-6">
            <p className="text-slate-400 text-xs uppercase tracking-widest mb-3">Now serving / አሁን እየተገለገሉ</p>
            <div className="grid grid-cols-2 gap-4">
              {now.map((q) => (
                <div key={q.id} className="bg-teal-600 rounded-2xl p-6">
                  <p className="text-4xl font-black text-white">{q.ticketNumber}</p>
                  <p className="text-teal-100 text-lg mt-1">{q.visit.patient.nameEn}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        <p className="text-slate-400 text-xs uppercase tracking-widest mb-3">Queue / ወረፋ</p>
        <div className="grid grid-cols-3 gap-3">
          {waiting.map((q) => (
            <div key={q.id} className={`rounded-xl p-4 ${q.status === "urgent" ? "bg-red-900/40 border border-red-600" : "bg-slate-800"}`}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-2xl font-bold text-white">{q.ticketNumber}</p>
                {q.status === "urgent" && <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">URGENT</span>}
              </div>
              <p className="text-slate-300 text-sm">{q.visit.patient.nameEn}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const [payingTicket, setPayingTicket] = useState<{ id: string; ticketNumber: string; feeAmount: number; patientName: string } | null>(null);
  const [modalMethod, setModalMethod] = useState<"cash" | "telebirr" | "cbe_birr" | "card">("cash");
  const [modalRef, setModalRef] = useState("");

  const payCardFeeMutation = useMutation({
    ...trpc.visit.payCardFee.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.visit.queue.queryKey() });
      setPayingTicket(null);
      setModalRef("");
    },
  });

  return (
    <PageShell
      title="OPD Queue Board"
      subtitle={`${waiting.length} waiting · ${now.length} being seen · ${done.length} done`}
      action={
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm rounded hover:border-teal-400 transition-colors">↻ Refresh</button>
          <Link href="/nova/reception/register" className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm rounded hover:border-teal-400 transition-colors">+ Register patient</Link>
          <button onClick={() => setFullscreen(true)} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm rounded hover:bg-teal-700 font-medium">
            <Monitor size={15} /> Kiosk display
          </button>
        </div>
      }
    >
      <div className="flex items-center gap-2 mb-5 text-xs text-slate-500 dark:text-slate-400">
        <span className="px-2 py-1 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded">1 Register</span>
        <span className="text-slate-300 dark:text-slate-600">→</span>
        <span className="px-2 py-1 bg-teal-600 text-white rounded font-medium">2 Queue & Card Fee</span>
        <span className="text-slate-300 dark:text-slate-600">→</span>
        <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800/60 rounded">3 Triage</span>
        <span className="text-slate-300 dark:text-slate-600">→</span>
        <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800/60 rounded">4 Doctor</span>
        <span className="text-slate-300 dark:text-slate-600">→</span>
        <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800/60 rounded">5 Billing</span>
      </div>

      {/* Reception Card Fee Collection Modal */}
      {payingTicket && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <h3 className="font-bold text-slate-800 text-base">Collect OPD Card Fee</h3>
              <button onClick={() => setPayingTicket(null)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">{payingTicket.patientName}</p>
              <p className="text-xs text-slate-500">Ticket: {payingTicket.ticketNumber} · Amount: <strong className="text-teal-700">ETB {payingTicket.feeAmount}</strong></p>
            </div>
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-700 block">Payment Method:</label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {(["cash", "telebirr", "cbe_birr"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setModalMethod(m)}
                    className={`py-2 px-3 rounded-lg border font-medium text-center transition-all ${
                      modalMethod === m
                        ? "bg-teal-600 text-white border-teal-600"
                        : "bg-white text-slate-700 border-slate-200 hover:border-teal-400"
                    }`}
                  >
                    {m === "cash" ? "💵 Cash" : m === "telebirr" ? "📱 Telebirr" : "🏦 CBE Birr"}
                  </button>
                ))}
              </div>
              {(modalMethod === "telebirr" || modalMethod === "cbe_birr") && (
                <div>
                  <label className="text-xs text-slate-600 block mb-1">Transaction Ref / ID:</label>
                  <input
                    value={modalRef}
                    onChange={(e) => setModalRef(e.target.value)}
                    placeholder="e.g. TLB-998241"
                    className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:border-teal-500"
                  />
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPayingTicket(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded text-sm hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={payCardFeeMutation.isPending}
                onClick={() => payCardFeeMutation.mutate({
                  ticketId: payingTicket.id,
                  paymentMethod: modalMethod,
                  reference: modalRef,
                })}
                className="px-4 py-2 bg-teal-600 text-white rounded text-sm font-medium hover:bg-teal-700"
              >
                {payCardFeeMutation.isPending ? "Recording…" : "Confirm & Issue Receipt"}
              </button>
            </div>
          </div>
        </div>
      )}

      {now.map((q) => (
        <div key={q.id} className="flex items-center gap-4 p-4 bg-teal-600 text-white rounded-xl mb-5">
          <div>
            <p className="text-xs text-teal-100 uppercase tracking-wide">Now serving</p>
            <p className="text-3xl font-black">{q.ticketNumber}</p>
          </div>
          <div className="border-l border-teal-500 pl-4">
            <p className="text-lg font-semibold">{q.visit.patient.nameEn}</p>
            <p className="text-teal-100 text-sm">{q.visit.patient.healthId}</p>
          </div>
        </div>
      ))}

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
              {["Ticket", "Patient", "Health ID", "Payer Type", "Card Fee / Payment", "Queue Status", "Actions"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {queue.map((q) => (
              <tr key={q.id} className={`border-b border-slate-100 dark:border-slate-800/60 last:border-0 ${q.status === "urgent" ? "bg-red-50 dark:bg-red-950/20" : "hover:bg-slate-50/80 dark:hover:bg-slate-800/40"} transition-colors`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[q.status] ?? "bg-slate-300"}`} />
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-100">{q.ticketNumber}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{q.visit.patient.nameEn}</td>
                <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{q.visit.patient.healthId}</td>
                <td className="px-4 py-3 text-xs">
                  {q.visit.patient.cbhiStatus
                    ? <span className="text-teal-700 dark:text-teal-300 font-semibold bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800">🛡️ CBHI</span>
                    : <span className="text-slate-500 dark:text-slate-400">Self-pay</span>}
                </td>
                <td className="px-4 py-3">
                  {q.paymentStatus === "paid" && (
                    <div>
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-semibold border border-emerald-200">
                        ✓ Paid ({q.feeAmount} ETB)
                      </span>
                      {q.receiptNumber && (
                        <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                          {q.receiptNumber} · {q.paymentMethod}
                        </span>
                      )}
                    </div>
                  )}
                  {q.paymentStatus === "cbhi_covered" && (
                    <span className="inline-flex items-center gap-1 text-xs text-teal-800 bg-teal-50 px-2 py-0.5 rounded font-medium border border-teal-200">
                      ✓ CBHI Covered (0 ETB)
                    </span>
                  )}
                  {q.paymentStatus === "emergency_exempt" && (
                    <span className="inline-flex items-center gap-1 text-xs text-red-800 bg-red-50 px-2 py-0.5 rounded font-medium border border-red-200">
                      🚨 Emergency (Care First)
                    </span>
                  )}
                  {q.paymentStatus === "unpaid" && (
                    <div>
                      <span className="inline-flex items-center gap-1 text-xs text-amber-800 bg-amber-50 px-2 py-0.5 rounded font-medium border border-amber-200">
                        ⚠️ Unpaid ({q.feeAmount} ETB)
                      </span>
                      <button
                        onClick={() => setPayingTicket({
                          id: q.id,
                          ticketNumber: q.ticketNumber,
                          feeAmount: q.feeAmount,
                          patientName: q.visit.patient.nameEn,
                        })}
                        className="text-[11px] mt-1 block px-2.5 py-0.5 bg-teal-600 text-white rounded hover:bg-teal-700 font-medium"
                      >
                        💳 Collect Fee
                      </button>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3"><StatusBadge status={q.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 flex-wrap items-center">
                    {(q.status === "waiting" || q.status === "urgent") && (
                      <button
                        onClick={() => updateStatus.mutate({ ticketId: q.id, status: "being-seen" })}
                        className={`text-xs px-2.5 py-1 rounded font-medium border ${
                          q.status === "urgent"
                            ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                            : "bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100"
                        }`}
                      >
                        {q.status === "urgent" ? "Call Urgent" : "Call to Desk"}
                      </button>
                    )}
                    {q.status === "being-seen" && (
                      <span className="text-xs text-teal-700 font-medium bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                        At Desk
                      </span>
                    )}
                    {q.status === "done" && (
                      <span className="text-xs text-slate-400">
                        Encounter Complete
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {queue.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400 text-sm">No patients in queue today</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex gap-3">
        <Link href={"/nova/triage" as any} className="text-sm px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 flex items-center gap-1.5 font-medium shadow-sm">
          <span>🩺</span> Go to Triage Station →
        </Link>
        <Link href="/nova/doctor" className="text-sm px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded hover:border-teal-400">
          Doctor queue →
        </Link>
      </div>
    </PageShell>
  );
}
