"use client";
import Link from "next/link";
import { useQuery, useMutation } from "@tanstack/react-query";
import { trpc, queryClient } from "@/utils/trpc";
import { PageShell, KpiCard, Card, StatusBadge } from "@/components/nova/nova-ui";
import { ArrowRight, Lock, ShieldCheck, UserCheck, Coffee, LogOut, CheckCircle2, DoorOpen, Clock } from "lucide-react";
import { useNovaRole } from "@/components/nova/nova-role-context";
import { toast } from "sonner";

export default function DoctorDashboard() {
  const { userName } = useNovaRole();

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

  // Match current logged in doctor or default to first record
  const myDoctorRecord =
    (presenceData?.roster || []).find((d: any) =>
      userName ? d.name.toLowerCase().includes(userName.toLowerCase().replace("dr.", "").trim()) : false
    ) || presenceData?.roster?.[0];

  const updateDoctorStatus = useMutation({
    ...trpc.doctor.updateStatus.mutationOptions(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: trpc.doctor.listPresence.queryKey() }),
  });

  const checkInMutation = useMutation({
    ...trpc.doctor.checkIn.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.doctor.listPresence.queryKey() });
      toast.success("Clocked in for today's clinical duty. Station marked Available.");
    },
  });

  const checkOutMutation = useMutation({
    ...trpc.doctor.checkOut.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.doctor.listPresence.queryKey() });
      toast.info("Clocked out. Shift marked complete.");
    },
  });

  const isOffDuty = !myDoctorRecord || myDoctorRecord.status === "off-duty" || myDoctorRecord.status === "expected";
  const isOnBreak = myDoctorRecord?.status === "on-break";

  const handleClockIn = () => {
    if (!myDoctorRecord) return;
    checkInMutation.mutate({
      doctorId: myDoctorRecord.userId || myDoctorRecord.id,
      roomNumber: myDoctorRecord.roomNumber,
      method: "self_checkin",
    });
  };

  const handleClockOut = () => {
    if (!myDoctorRecord) return;
    checkOutMutation.mutate({
      doctorId: myDoctorRecord.userId || myDoctorRecord.id,
      method: "self_checkin",
    });
  };

  const handleSetAvailable = () => {
    if (!myDoctorRecord) return;
    updateDoctorStatus.mutate({
      doctorId: myDoctorRecord.userId || myDoctorRecord.id,
      status: "available",
      method: "self_checkin",
    });
    toast.success("Marked Available at desk — ready for next patient");
  };

  const handleSetBreak = () => {
    if (!myDoctorRecord) return;
    updateDoctorStatus.mutate({
      doctorId: myDoctorRecord.userId || myDoctorRecord.id,
      status: "on-break",
      breakNote: "Ward Rounds / Clinical Break",
      method: "self_checkin",
    });
    toast.info("Marked Stepped Out (Ward Rounds / Break)");
  };

  return (
    <PageShell title="Doctor Dashboard" subtitle="Today's patient queue and clinical station">
      {/* Personal Doctor Station & Attendance Widget */}
      <div className="mb-5 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
            MD
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {myDoctorRecord?.name || "Attending Physician"}
              </span>

              {/* Status Badge */}
              <span
                className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                  myDoctorRecord?.status === "available"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200"
                    : myDoctorRecord?.status === "in-consultation"
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200"
                    : myDoctorRecord?.status === "on-break"
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    myDoctorRecord?.status === "available"
                      ? "bg-emerald-500 animate-pulse"
                      : myDoctorRecord?.status === "in-consultation"
                      ? "bg-blue-500"
                      : myDoctorRecord?.status === "on-break"
                      ? "bg-amber-500"
                      : "bg-slate-400"
                  }`}
                />
                {myDoctorRecord?.status === "available"
                  ? "READY AT DESK"
                  : myDoctorRecord?.status === "in-consultation"
                  ? "IN CONSULTATION"
                  : myDoctorRecord?.status === "on-break"
                  ? "ON BREAK / ROUNDS"
                  : "OFF DUTY"}
              </span>

              {myDoctorRecord?.checkInTime && !isOffDuty && (
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  ✓ Clocked in at {myDoctorRecord.checkInTime}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
              <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                <DoorOpen size={13} className="text-teal-600" />
                {myDoctorRecord?.roomNumber || "Room 104 — Internal Medicine"}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Clock size={12} className="text-slate-400" />
                Shift: {myDoctorRecord?.shift?.start || "08:00 AM"} – {myDoctorRecord?.shift?.end || "04:30 PM"}
              </span>
            </div>
          </div>
        </div>

        {/* Doctor Personal Attendance & Status Controls */}
        <div className="flex items-center gap-2">
          {isOffDuty ? (
            <button
              onClick={handleClockIn}
              disabled={checkInMutation.isPending}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center gap-1.5"
            >
              <UserCheck size={14} />
              <span>Clock In for Duty</span>
            </button>
          ) : isOnBreak ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleSetAvailable}
                disabled={updateDoctorStatus.isPending}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center gap-1.5"
              >
                <CheckCircle2 size={13} />
                <span>Back at Desk (Ready)</span>
              </button>
              <button
                onClick={handleClockOut}
                disabled={checkOutMutation.isPending}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg border border-slate-200 dark:border-slate-700 transition flex items-center gap-1"
                title="Clock out and end shift"
              >
                <LogOut size={12} />
                <span>End Shift</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleSetBreak}
                disabled={updateDoctorStatus.isPending}
                className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs"
              >
                <Coffee size={13} />
                <span>Step Out (Rounds / Break)</span>
              </button>
              <button
                onClick={handleClockOut}
                disabled={checkOutMutation.isPending}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg border border-slate-200 dark:border-slate-700 transition flex items-center gap-1"
                title="Clock out and end shift"
              >
                <LogOut size={12} />
                <span>End Shift</span>
              </button>
            </div>
          )}
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
                  <div className="flex items-center gap-1.5">
                    <span
                      className="text-xs px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded font-medium cursor-not-allowed border border-slate-200 dark:border-slate-700 flex items-center gap-1"
                      title="Pre-payment required: Patient must settle card fee at Central Billing Cashier or Reception before consultation"
                    >
                      <Lock size={11} /> Locked (Card Fee Unpaid)
                    </span>
                    <Link
                      href={`/nova/billing?visitId=${q.visitId}`}
                      className="text-xs px-2 py-1 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 rounded hover:bg-teal-100 dark:hover:bg-teal-900/50 font-medium transition-colors"
                    >
                      Cashier →
                    </Link>
                  </div>
                ) : (
                  <Link
                    href={`/nova/doctor/consultation?visitId=${q.visitId}`}
                    onClick={() => updateStatus.mutate({ ticketId: q.id, status: "being-seen" })}
                    className="text-xs px-2.5 py-1 bg-teal-600 text-white rounded hover:bg-teal-700 font-medium transition-colors"
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
