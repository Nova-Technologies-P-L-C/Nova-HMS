"use client";
import Link from "next/link";
import { useQuery, useMutation } from "@tanstack/react-query";
import { trpc, queryClient } from "@/utils/trpc";
import { PageShell, KpiCard, Card, StatusBadge } from "@/components/nova/nova-ui";
import { ArrowRight } from "lucide-react";

export default function DoctorDashboard() {
  const { data: queue = [], refetch } = useQuery({
    ...trpc.visit.queue.queryOptions(),
    refetchInterval: 15_000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const updateStatus = useMutation({
    ...trpc.visit.updateTicketStatus.mutationOptions(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: trpc.visit.queue.queryKey() }),
  });

  const active = queue.filter((q) => q.status !== "done");
  const urgent = active.filter((q) => q.status === "urgent").length;
  const beingSeen = active.filter((q) => q.status === "being-seen").length;

  return (
    <PageShell title="Doctor Dashboard" subtitle="Today's patient queue">
      <div className="flex items-center gap-2 mb-5 text-xs text-slate-500">
        <span className="px-2 py-1 bg-slate-200 rounded">1 Register</span>
        <span className="text-slate-300">→</span>
        <span className="px-2 py-1 bg-slate-200 rounded">2 Triage</span>
        <span className="text-slate-300">→</span>
        <span className="px-2 py-1 bg-teal-600 text-white rounded font-medium">3 Doctor queue</span>
        <span className="text-slate-300">→</span>
        <span className="px-2 py-1 bg-slate-100 rounded">4 Consultation</span>
        <span className="text-slate-300">→</span>
        <span className="px-2 py-1 bg-slate-100 rounded">5 Treatment</span>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <KpiCard label="In queue today" value={active.length} accent />
        <KpiCard label="Being seen" value={beingSeen} />
        <KpiCard label="Urgent" value={urgent} />
      </div>

      <Card>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <p className="font-medium text-slate-800 text-sm">Today's patient queue</p>
          <div className="flex items-center gap-3">
            <button onClick={() => refetch()} className="text-xs text-slate-400 hover:text-teal-600">↻ Refresh</button>
            <Link href="/nova/reception/queue" className="text-xs text-teal-600 hover:underline flex items-center gap-1">Full board <ArrowRight size={11} /></Link>
          </div>
        </div>
        <div className="divide-y divide-slate-50">
          {active.map((q) => (
            <div key={q.id} className={`flex items-center justify-between px-4 py-3 ${q.status === "urgent" ? "bg-red-50" : ""}`}>
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-slate-700 w-16">{q.ticketNumber}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-800">{q.visit.patient.nameEn}</p>
                    {q.paymentStatus === "paid" && (
                      <span className="text-[11px] px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-medium border border-emerald-200">
                        ✓ Card Fee Paid
                      </span>
                    )}
                    {q.paymentStatus === "cbhi_covered" && (
                      <span className="text-[11px] px-2 py-0.5 bg-teal-50 text-teal-700 rounded-full font-medium border border-teal-200">
                        🛡️ CBHI
                      </span>
                    )}
                    {q.paymentStatus === "emergency_exempt" && (
                      <span className="text-[11px] px-2 py-0.5 bg-red-50 text-red-700 rounded-full font-medium border border-red-200">
                        🚨 Emergency
                      </span>
                    )}
                    {q.paymentStatus === "unpaid" && (
                      <span className="text-[11px] px-2 py-0.5 bg-amber-50 text-amber-800 rounded-full font-semibold border border-amber-300">
                        ⚠️ Card Fee Unpaid ({q.feeAmount} ETB)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">{q.visit.patient.healthId}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={q.status} />
                <Link
                  href={`/nova/doctor/emr?visitId=${q.visitId}`}
                  onClick={() => updateStatus.mutate({ ticketId: q.id, status: "being-seen" })}
                  className="text-xs px-2.5 py-1 bg-white border border-slate-200 text-slate-700 rounded hover:border-teal-400"
                >
                  View EMR
                </Link>
                {q.paymentStatus === "unpaid" ? (
                  <Link
                    href={`/nova/doctor/consultation?visitId=${q.visitId}`}
                    onClick={() => updateStatus.mutate({ ticketId: q.id, status: "being-seen" })}
                    className="text-xs px-2.5 py-1 bg-amber-600 text-white rounded hover:bg-amber-700 font-medium"
                    title="Warning: Card fee unpaid at reception"
                  >
                    Consult (Unpaid) →
                  </Link>
                ) : (
                  <Link
                    href={`/nova/doctor/consultation?visitId=${q.visitId}`}
                    onClick={() => updateStatus.mutate({ ticketId: q.id, status: "being-seen" })}
                    className="text-xs px-2.5 py-1 bg-teal-600 text-white rounded hover:bg-teal-700 font-medium"
                  >
                    Consult →
                  </Link>
                )}
              </div>
            </div>
          ))}
          {active.length === 0 && (
            <p className="px-4 py-8 text-sm text-slate-400 text-center">No patients in queue — all done for today</p>
          )}
        </div>
      </Card>
    </PageShell>
  );
}
