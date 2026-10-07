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

  const { data: presenceData } = useQuery(trpc.doctor.listPresence.queryOptions());
  const updateDoctorStatus = useMutation({
    ...trpc.doctor.updateStatus.mutationOptions(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: trpc.doctor.listPresence.queryKey() }),
  });

  const myDoctorRecord = presenceData?.roster?.[0]; // Current doctor presence

  return (
    <PageShell title="Doctor Dashboard" subtitle="Today's patient queue">
      {/* Live Doctor Station Presence Widget */}
      <div className="mb-5 p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 flex items-center justify-center font-bold text-xs shrink-0">
            MD
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                {myDoctorRecord?.name || "Attending Physician"}
              </span>
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  myDoctorRecord?.status === "available"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                    : myDoctorRecord?.status === "in-consultation"
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                    : myDoctorRecord?.status === "on-break"
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {myDoctorRecord?.status?.toUpperCase() || "AVAILABLE"}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Assigned: <strong>{myDoctorRecord?.roomNumber || "Room 102 — General OPD"}</strong> · Shift:{" "}
              {myDoctorRecord?.shift?.start || "08:00 AM"} – {myDoctorRecord?.shift?.end || "04:30 PM"} · Reception Synced
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {myDoctorRecord?.status === "on-break" ? (
            <button
              onClick={() =>
                updateDoctorStatus.mutate({
                  doctorId: myDoctorRecord.userId || myDoctorRecord.id,
                  status: "available",
                  method: "self_checkin",
                })
              }
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
            >
              Back in Room (Ready)
            </button>
          ) : (
            <button
              onClick={() =>
                updateDoctorStatus.mutate({
                  doctorId: myDoctorRecord?.userId || myDoctorRecord?.id || "doc-1",
                  status: "on-break",
                  breakNote: "Ward Rounds / Clinical Break",
                  method: "self_checkin",
                })
              }
              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 rounded-lg text-xs font-semibold transition"
            >
              Step Out (Ward Rounds / Break)
            </button>
          )}

          <Link
            href={"/nova/reception/doctors" as any}
            className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold hover:border-teal-400 transition"
          >
            Full Clinic Roster Board →
          </Link>
        </div>
      </div>

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
            <Link href="/nova/reception/queue" className="text-xs text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1">Full board <ArrowRight size={11} /></Link>
          </div>
        </div>
        <div className="divide-y divide-slate-50 dark:divide-slate-800">
          {active.map((q) => (
            <div key={q.id} className={`flex items-center justify-between px-4 py-3 ${q.status === "urgent" ? "bg-red-50 dark:bg-red-950/20" : "hover:bg-slate-50/80 dark:hover:bg-slate-800/40"} transition-colors`}>
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300 w-16">{q.ticketNumber}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{q.visit.patient.nameEn}</p>
                    {q.paymentStatus === "paid" && (
                      <span className="text-[11px] px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-full font-medium border border-emerald-200 dark:border-emerald-800">
                        ✓ Card Fee Paid
                      </span>
                    )}
                    {q.paymentStatus === "cbhi_covered" && (
                      <span className="text-[11px] px-2 py-0.5 bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 rounded-full font-medium border border-teal-200 dark:border-teal-800">
                        🛡️ CBHI
                      </span>
                    )}
                    {q.paymentStatus === "emergency_exempt" && (
                      <span className="text-[11px] px-2 py-0.5 bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 rounded-full font-medium border border-red-200 dark:border-red-800">
                        🚨 Emergency
                      </span>
                    )}
                    {q.paymentStatus === "unpaid" && (
                      <span className="text-[11px] px-2 py-0.5 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded-full font-semibold border border-amber-300 dark:border-amber-700">
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
                  className="text-xs px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded hover:border-teal-400 transition-colors"
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
