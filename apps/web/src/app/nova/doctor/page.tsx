"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "@tanstack/react-query";
import { trpc, queryClient } from "@/utils/trpc";
import { PageShell, KpiCard, Card, StatusBadge } from "@/components/nova/nova-ui";
import {
  ArrowRight,
  Lock,
  ShieldCheck,
  UserCheck,
  Coffee,
  LogOut,
  CheckCircle2,
  DoorOpen,
  Clock,
  FlaskConical,
  Sparkles,
  RotateCcw,
  CheckCheck,
} from "lucide-react";
import { useNovaRole } from "@/components/nova/nova-role-context";
import { toast } from "sonner";

export default function DoctorDashboard() {
  const { userName } = useNovaRole();
  const [filterTab, setFilterTab] = useState<"all" | "results-ready" | "in-lab" | "waiting" | "done">("all");

  const { data: queue = [], refetch } = useQuery({
    ...trpc.visit.queue.queryOptions(),
    refetchInterval: 10_000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const updateStatus = useMutation({
    ...trpc.visit.updateTicketStatus.mutationOptions(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: trpc.visit.queue.queryKey() }),
  });

  // Helper checks for patient lab status
  const isPatientResultsReady = (q: any) => {
    if (q.status === "results-ready") return true;
    const labs = q.visit?.labOrders || [];
    return labs.some((l: any) => l.status === "completed");
  };

  const isPatientInLab = (q: any) => {
    if (q.status === "in-lab") return true;
    const labs = q.visit?.labOrders || [];
    return labs.some((l: any) => l.status === "pending" || l.status === "in-progress");
  };

  // Active queue: includes all open tickets PLUS any ticket with completed or active lab orders (even if previously marked done)
  const active = useMemo(
    () =>
      queue.filter(
        (q) =>
          q.status !== "done" ||
          isPatientResultsReady(q) ||
          isPatientInLab(q)
      ),
    [queue]
  );

  const resultsReady = useMemo(
    () => queue.filter((q) => isPatientResultsReady(q)),
    [queue]
  );

  const inLab = useMemo(
    () => queue.filter((q) => isPatientInLab(q)),
    [queue]
  );

  const waitingConsult = useMemo(
    () =>
      active.filter(
        (q) =>
          !isPatientResultsReady(q) &&
          !isPatientInLab(q)
      ),
    [active]
  );

  const doneToday = useMemo(
    () =>
      queue.filter(
        (q) =>
          q.status === "done" &&
          !isPatientResultsReady(q) &&
          !isPatientInLab(q)
      ),
    [queue]
  );

  const urgent = active.filter((q) => q.status === "urgent").length;
  const beingSeen = active.filter((q) => q.status === "being-seen").length;

  const filteredQueue =
    filterTab === "results-ready"
      ? resultsReady
      : filterTab === "in-lab"
      ? inLab
      : filterTab === "waiting"
      ? waitingConsult
      : filterTab === "done"
      ? doneToday
      : active;

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

  const handleReopenVisit = (ticketId: string) => {
    updateStatus.mutate(
      { ticketId, status: "results-ready" },
      {
        onSuccess: () => {
          toast.success("Patient returned to active consultation queue");
        },
      }
    );
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

      {/* Prominent Banner when Lab Results are Ready */}
      {resultsReady.length > 0 && (
        <div className="mb-5 p-4 bg-emerald-50/90 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800/80 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-xs animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-2xs">
              🔬
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-emerald-950 dark:text-emerald-100">
                  {resultsReady.length} Patient{resultsReady.length > 1 ? "s" : ""} Have Completed Lab Results
                </h4>
                <span className="text-[10px] bg-emerald-200 dark:bg-emerald-800/90 text-emerald-900 dark:text-emerald-100 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
                  Ready to Resume
                </span>
              </div>
              <p className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-0.5">
                Specimen testing has been verified by the laboratory. Open consultation to review verified findings and complete diagnosis.
              </p>
            </div>
          </div>

          <button
            onClick={() => setFilterTab("results-ready")}
            className="text-xs px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span>View {resultsReady.length} Results Ready</span>
            <ArrowRight size={13} />
          </button>
        </div>
      )}

      {/* OPD Workflow Progress Steps */}
      <div className="flex items-center gap-2 mb-5 text-xs text-slate-500">
        <span className="px-2 py-1 bg-slate-200 dark:bg-slate-800 rounded">1 Register</span>
        <span className="text-slate-300">→</span>
        <span className="px-2 py-1 bg-slate-200 dark:bg-slate-800 rounded">2 Triage</span>
        <span className="text-slate-300">→</span>
        <span className="px-2 py-1 bg-teal-600 text-white rounded font-medium">3 Doctor queue</span>
        <span className="text-slate-300">→</span>
        <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded">4 Consultation</span>
        <span className="text-slate-300">→</span>
        <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded">5 Treatment</span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Active in queue" value={active.length} accent />
        <div
          onClick={() => setFilterTab("results-ready")}
          className="cursor-pointer transition hover:opacity-90"
        >
          <KpiCard
            label="Lab Results Ready"
            value={resultsReady.length}
            sub={resultsReady.length > 0 ? "Action required" : "All reviewed"}
          />
        </div>
        <div
          onClick={() => setFilterTab("in-lab")}
          className="cursor-pointer transition hover:opacity-90"
        >
          <KpiCard label="Specimens in Lab" value={inLab.length} sub="Testing in progress" />
        </div>
        <KpiCard label="Being seen" value={beingSeen} />
      </div>

      {/* Patient Queue Card */}
      <Card>
        {/* Header with queue filter tabs */}
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setFilterTab("all")}
              className={`text-xs px-2.5 py-1 rounded-md font-semibold transition ${
                filterTab === "all"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              All Active ({active.length})
            </button>

            <button
              onClick={() => setFilterTab("results-ready")}
              className={`text-xs px-2.5 py-1 rounded-md font-bold transition flex items-center gap-1.5 ${
                filterTab === "results-ready"
                  ? "bg-emerald-600 text-white"
                  : resultsReady.length > 0
                  ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <span>✅ Results Ready</span>
              {resultsReady.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${filterTab === "results-ready" ? "bg-white text-emerald-700" : "bg-emerald-600 text-white"}`}>
                  {resultsReady.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setFilterTab("in-lab")}
              className={`text-xs px-2.5 py-1 rounded-md font-medium transition flex items-center gap-1.5 ${
                filterTab === "in-lab"
                  ? "bg-purple-600 text-white"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <span>🔬 In Lab ({inLab.length})</span>
            </button>

            <button
              onClick={() => setFilterTab("waiting")}
              className={`text-xs px-2.5 py-1 rounded-md font-medium transition ${
                filterTab === "waiting"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              Waiting Consult ({waitingConsult.length})
            </button>

            <button
              onClick={() => setFilterTab("done")}
              className={`text-xs px-2.5 py-1 rounded-md font-medium transition ${
                filterTab === "done"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              Finished Today ({doneToday.length})
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => refetch()} className="text-xs text-slate-400 hover:text-teal-600">
              ↻ Refresh
            </button>
            <Link
              href="/nova/reception/queue"
              className="text-xs text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
            >
              Full board <ArrowRight size={11} />
            </Link>
          </div>
        </div>

        {/* Queue Items */}
        <div className="divide-y divide-slate-50 dark:divide-slate-800">
          {filteredQueue.map((q) => {
            const labs = q.visit?.labOrders || [];
            const completedLabs = labs.filter((l: any) => l.status === "completed");
            const pendingLabs = labs.filter((l: any) => l.status === "pending" || l.status === "in-progress");
            const isResultsReady = q.status === "results-ready" || (labs.length > 0 && pendingLabs.length === 0 && completedLabs.length > 0);
            const isInLab = q.status === "in-lab" || pendingLabs.length > 0;

            return (
              <div
                key={q.id}
                className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 gap-3 transition-colors ${
                  isResultsReady && q.status !== "done"
                    ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-l-4 border-l-emerald-500"
                    : q.status === "urgent"
                    ? "bg-red-50 dark:bg-red-950/20"
                    : "hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300 w-16 shrink-0">
                    {q.ticketNumber}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {q.visit.patient.nameEn}
                      </p>

                      {/* Lab Results Ready Badge */}
                      {isResultsReady && q.status !== "done" && (
                        <span className="text-[11px] px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-200 rounded-full font-bold border border-emerald-300 dark:border-emerald-700 flex items-center gap-1 shadow-2xs">
                          <span>🔬 Lab Results Ready ({completedLabs.length} test{completedLabs.length > 1 ? "s" : ""})</span>
                        </span>
                      )}

                      {/* Specimen in Lab Badge */}
                      {isInLab && !isResultsReady && q.status !== "done" && (
                        <span className="text-[11px] px-2 py-0.5 bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-200 rounded-full font-medium border border-purple-200 dark:border-purple-800 flex items-center gap-1">
                          <span>🔬 In Lab ({completedLabs.length}/{labs.length} done)</span>
                        </span>
                      )}

                      {((q as any).tier === "vip" || (q.ticketNumber || "").startsWith("V")) && (
                        <span className="text-[11px] px-2.5 py-0.5 bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 rounded-full font-bold border border-amber-300 dark:border-amber-700 flex items-center gap-1 shadow-2xs">
                          ⭐ VIP Fast-Track
                        </span>
                      )}

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

                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5 flex-wrap">
                      <span>{q.visit.patient.healthId}</span>
                      <span>·</span>
                      <span>Sex: {q.visit.patient.sex === "M" ? "Male" : "Female"}</span>
                      {labs.length > 0 && (
                        <>
                          <span>·</span>
                          <span className="text-slate-600 dark:text-slate-300 font-medium">
                            Tests: {labs.map((l: any) => l.testName).join(", ")}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Row Action Controls */}
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={q.status} />

                  <Link
                    href={`/nova/doctor/emr?visitId=${q.visitId}`}
                    className="text-xs px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded hover:border-teal-400 transition-colors"
                  >
                    View EMR
                  </Link>

                  {q.status === "done" ? (
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/nova/doctor/consultation?visitId=${q.visitId}`}
                        className="text-xs px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded hover:bg-slate-200 dark:hover:bg-slate-700 font-medium transition"
                      >
                        Review Visit
                      </Link>
                      <button
                        onClick={() => handleReopenVisit(q.id)}
                        className="text-xs px-2 py-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/60 font-semibold flex items-center gap-1 cursor-pointer"
                        title="Return patient to active consultation queue"
                      >
                        <RotateCcw size={11} />
                        <span>Reopen</span>
                      </button>
                    </div>
                  ) : q.paymentStatus === "unpaid" ? (
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
                  ) : isResultsReady ? (
                    <Link
                      href={`/nova/doctor/consultation?visitId=${q.visitId}`}
                      onClick={() => updateStatus.mutate({ ticketId: q.id, status: "being-seen" })}
                      className="text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      <span>Resume Consult (Results In)</span>
                      <ArrowRight size={12} />
                    </Link>
                  ) : (
                    <Link
                      href={`/nova/doctor/consultation?visitId=${q.visitId}`}
                      onClick={() => updateStatus.mutate({ ticketId: q.id, status: "being-seen" })}
                      className="text-xs px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors flex items-center gap-1"
                    >
                      <span>Consult</span>
                      <ArrowRight size={12} />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}

          {filteredQueue.length === 0 && (
            <div className="py-12 px-4 text-center">
              <FlaskConical size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {filterTab === "results-ready"
                  ? "No patients waiting with completed lab results"
                  : filterTab === "in-lab"
                  ? "No patients currently in the laboratory"
                  : filterTab === "done"
                  ? "No completed visits recorded today"
                  : "No patients in this queue view"}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {filterTab !== "all" ? (
                  <button onClick={() => setFilterTab("all")} className="text-teal-600 hover:underline">
                    View all active patients ({active.length}) →
                  </button>
                ) : (
                  "All done for today! Station is clear."
                )}
              </p>
            </div>
          )}
        </div>
      </Card>
    </PageShell>
  );
}
