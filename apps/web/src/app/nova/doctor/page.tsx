"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "@tanstack/react-query";
import { trpc, queryClient } from "@/utils/trpc";
import { PageShell } from "@/components/nova/nova-ui";
import {
  ArrowRight,
  Lock,
  UserCheck,
  Coffee,
  LogOut,
  CheckCircle2,
  DoorOpen,
  FlaskConical,
  RotateCcw,
  Search,
  RefreshCw,
  Stethoscope,
  Users,
  X,
  ArrowLeftRight,
  Pill,
  Bed,
} from "lucide-react";
import { useNovaRole } from "@/components/nova/nova-role-context";
import {
  getDepartmentConfig,
  ALL_DEPARTMENTS,
  doesTicketBelongToDepartment,
} from "@/lib/department-configs";
import { toast } from "sonner";

function formatShortAge(dob?: string | null): string {
  if (!dob) return "—";
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return "—";
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) {
    years--;
  }
  if (years < 1) return `${Math.max(1, months)}m`;
  return `${years}y`;
}

export default function DoctorDashboard() {
  const { userName, doctorDepartment, setDoctorDepartment } = useNovaRole();
  const [filterTab, setFilterTab] = useState<"all" | "results-ready" | "in-lab" | "waiting" | "done">("all");
  const [queueScope, setQueueScope] = useState<"dept" | "all">("dept");
  const [search, setSearch] = useState("");

  const { data: meDoctor } = useQuery(trpc.doctor.me.queryOptions());

  // Resolve active department config
  const activeDeptConfig = useMemo(() => {
    return getDepartmentConfig(doctorDepartment || meDoctor?.department);
  }, [doctorDepartment, meDoctor?.department]);

  const { data: allQueue = [], refetch: refetchQueue, isFetching: isQueueFetching } = useQuery({
    ...trpc.visit.queue.queryOptions(),
    refetchInterval: 10_000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Department-filtered queue vs clinic-wide queue
  const deptQueue = useMemo(
    () => allQueue.filter((q: any) => doesTicketBelongToDepartment(q.department, activeDeptConfig.id)),
    [allQueue, activeDeptConfig.id]
  );

  const queue = queueScope === "dept" ? deptQueue : allQueue;

  const { data: presenceData, refetch: refetchPresence, isFetching: isPresenceFetching } = useQuery({
    ...trpc.doctor.listPresence.queryOptions(),
    refetchInterval: 15_000,
  });

  const updateStatus = useMutation({
    ...trpc.visit.updateTicketStatus.mutationOptions(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: trpc.visit.queue.queryKey() }),
  });

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

  const active = useMemo(
    () =>
      queue.filter(
        (q: any) =>
          q.status !== "done" ||
          isPatientResultsReady(q) ||
          isPatientInLab(q)
      ),
    [queue]
  );

  const resultsReady = useMemo(
    () => queue.filter((q: any) => isPatientResultsReady(q) && q.status !== "done"),
    [queue]
  );

  const inLab = useMemo(
    () => queue.filter((q: any) => isPatientInLab(q) && !isPatientResultsReady(q) && q.status !== "done"),
    [queue]
  );

  const waitingConsult = useMemo(
    () =>
      active.filter(
        (q: any) =>
          !isPatientResultsReady(q) &&
          !isPatientInLab(q) &&
          q.status !== "done"
      ),
    [active]
  );

  const doneToday = useMemo(
    () =>
      queue.filter(
        (q: any) =>
          q.status === "done" &&
          !isPatientResultsReady(q) &&
          !isPatientInLab(q)
      ),
    [queue]
  );

  const urgent = active.filter((q: any) => q.status === "urgent").length;
  const beingSeen = active.filter((q: any) => q.status === "being-seen").length;

  // Next patient ready for 1-click start
  const nextPatient = useMemo(
    () =>
      active.find(
        (q: any) => q.status !== "done" && q.paymentStatus !== "unpaid"
      ),
    [active]
  );

  const filteredQueue = useMemo(() => {
    let list =
      filterTab === "results-ready"
        ? resultsReady
        : filterTab === "in-lab"
        ? inLab
        : filterTab === "waiting"
        ? waitingConsult
        : filterTab === "done"
        ? doneToday
        : active;

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((item: any) => {
        const patient = item.visit?.patient || {};
        return (
          (item.ticketNumber || "").toLowerCase().includes(q) ||
          (patient.nameEn || "").toLowerCase().includes(q) ||
          (patient.healthId || "").toLowerCase().includes(q) ||
          (item.department || "").toLowerCase().includes(q)
        );
      });
    }

    return list;
  }, [filterTab, search, resultsReady, inLab, waitingConsult, doneToday, active]);

  // Match current logged-in doctor
  const myDoctorRecord =
    (presenceData?.roster || []).find((d: any) =>
      userName ? d.name.toLowerCase().includes(userName.toLowerCase().replace("dr.", "").trim()) : false
    ) ||
    (presenceData?.roster || []).find((d: any) =>
      doesTicketBelongToDepartment(d.department, activeDeptConfig.id)
    ) ||
    presenceData?.roster?.[0];

  const updateDoctorStatus = useMutation({
    ...trpc.doctor.updateStatus.mutationOptions(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: trpc.doctor.listPresence.queryKey() }),
  });

  const checkInMutation = useMutation({
    ...trpc.doctor.checkIn.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.doctor.listPresence.queryKey() });
      toast.success("Clocked in. Status: Ready.");
    },
  });

  const checkOutMutation = useMutation({
    ...trpc.doctor.checkOut.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.doctor.listPresence.queryKey() });
      toast.info("Shift ended.");
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
    toast.success("Status: Ready");
  };

  const handleSetBreak = () => {
    if (!myDoctorRecord) return;
    updateDoctorStatus.mutate({
      doctorId: myDoctorRecord.userId || myDoctorRecord.id,
      status: "on-break",
      breakNote: "Break / Ward Rounds",
      method: "self_checkin",
    });
    toast.info("Status: On Break");
  };

  const handleReopenVisit = (ticketId: string) => {
    updateStatus.mutate(
      { ticketId, status: "results-ready" },
      {
        onSuccess: () => {
          toast.success("Patient returned to active queue");
        },
      }
    );
  };

  // Render clean specialty column per patient row
  const renderSpecialtyContext = (q: any) => {
    const patient = q.visit?.patient || {};
    const vitals = q.visit?.vitals?.[0];
    const latestNote = q.visit?.notes?.[0];
    const ageLabel = formatShortAge(patient.dob);

    if (activeDeptConfig.id === "pediatrics") {
      return (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
            <span>Age: {ageLabel}</span>
            {vitals?.weight ? (
              <span className="px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px]">
                {vitals.weight} kg
              </span>
            ) : null}
          </div>
          {vitals?.temperature && (
            <div className="text-[10px] text-slate-400">
              Temp: {vitals.temperature}°C {vitals.spo2 ? `· SpO₂ ${vitals.spo2}%` : ""}
            </div>
          )}
        </div>
      );
    }

    if (activeDeptConfig.id === "ob_gyn") {
      const highBp = vitals?.bpSystolic && (vitals.bpSystolic >= 140 || (vitals.bpDiastolic || 0) >= 90);
      return (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            {vitals?.bpSystolic ? (
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                  highBp
                    ? "bg-rose-100 text-rose-800 border border-rose-300"
                    : "bg-pink-50 text-pink-800 border border-pink-200"
                }`}
              >
                BP {vitals.bpSystolic}/{vitals.bpDiastolic}
                {highBp ? " · High BP" : ""}
              </span>
            ) : (
              <span className="text-slate-400">No vitals yet</span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 truncate max-w-[170px]">
            {latestNote?.chiefComplaint || `Age ${ageLabel}`}
          </div>
        </div>
      );
    }

    if (activeDeptConfig.id === "surgery") {
      return (
        <div className="space-y-0.5">
          <span
            className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold ${
              q.status === "urgent"
                ? "bg-rose-100 text-rose-800 border border-rose-300"
                : "bg-purple-50 text-purple-800 border border-purple-200"
            }`}
          >
            {q.status === "urgent" ? "Urgent / Trauma" : "Surgical Consult"}
          </span>
          <div className="text-[10px] text-slate-400 truncate max-w-[170px]">
            {latestNote?.chiefComplaint || (vitals?.bpSystolic ? `BP ${vitals.bpSystolic}/${vitals.bpDiastolic}` : "Pre-op check")}
          </div>
        </div>
      );
    }

    if (activeDeptConfig.id === "dental") {
      return (
        <div className="space-y-0.5">
          <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-semibold bg-cyan-50 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
            Dental Care
          </span>
          <div className="text-[10px] text-slate-400 truncate max-w-[170px]">
            {latestNote?.chiefComplaint || "Tooth exam / procedure"}
          </div>
        </div>
      );
    }

    if (activeDeptConfig.id === "ophthalmology") {
      return (
        <div className="space-y-0.5">
          <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            Eye Exam
          </span>
          <div className="text-[10px] text-slate-400 truncate max-w-[170px]">
            {latestNote?.chiefComplaint || "Vision & eye pressure"}
          </div>
        </div>
      );
    }

    // General OPD default
    return (
      <div className="space-y-0.5">
        {vitals?.bpSystolic ? (
          <div className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
            BP {vitals.bpSystolic}/{vitals.bpDiastolic}
            {vitals.temperature ? ` · ${vitals.temperature}°C` : ""}
          </div>
        ) : (
          <span className="text-[11px] text-slate-400">Age {ageLabel}</span>
        )}
        {latestNote?.chiefComplaint && (
          <div className="text-[10px] text-slate-400 truncate max-w-[170px]">
            {latestNote.chiefComplaint}
          </div>
        )}
      </div>
    );
  };

  return (
    <PageShell
      title={`${activeDeptConfig.shortLabel} — ${activeDeptConfig.sidebarLabels.queue}`}
      subtitle={activeDeptConfig.queueSubtitle}
      action={
        <div className="flex items-center gap-2">
          {nextPatient && (
            <Link
              href={`/nova/doctor/consultation?visitId=${nextPatient.visitId}&dept=${activeDeptConfig.id}`}
              onClick={() => updateStatus.mutate({ ticketId: nextPatient.id, status: "being-seen" })}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition text-xs font-bold shadow-xs"
            >
              <span>Next: #{nextPatient.ticketNumber}</span>
              <ArrowRight size={13} />
            </Link>
          )}
          <Link
            href={"/nova/reception/doctors" as any}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 transition text-xs font-semibold shadow-xs"
          >
            <Users size={13} className="text-teal-600" />
            <span>Doctors</span>
          </Link>
          <button
            onClick={() => {
              refetchQueue();
              refetchPresence();
            }}
            disabled={isQueueFetching || isPresenceFetching}
            className="p-1.5 text-slate-600 hover:text-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 transition cursor-pointer"
            title="Refresh queue"
          >
            <RefreshCw
              size={14}
              className={isQueueFetching || isPresenceFetching ? "animate-spin text-teal-600" : "text-slate-500"}
            />
          </button>
        </div>
      }
    >
      <style>{`
        @keyframes labGlowPulse {
          0%, 100% {
            box-shadow: 0 0 10px rgba(16, 185, 129, 0.7), 0 0 3px rgba(16, 185, 129, 0.9);
          }
          50% {
            box-shadow: 0 0 18px rgba(16, 185, 129, 0.95), 0 0 6px rgba(16, 185, 129, 1);
          }
        }
        .animate-lab-glow {
          animation: labGlowPulse 2s ease-in-out infinite;
        }
      `}</style>

      {/* ── 1. DOCTOR STATION HEADER & QUICK ROLE TOOLS ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 mb-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Left: Doctor Info & Department Switcher */}
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 flex items-center justify-center shrink-0">
              <Stethoscope size={17} />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  {myDoctorRecord?.name || userName || "Doctor"}
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>

                <div className="flex items-center gap-1.5">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${activeDeptConfig.badgeColor}`}>
                    {activeDeptConfig.code}
                  </span>
                  <select
                    value={activeDeptConfig.id}
                    onChange={(e) => setDoctorDepartment(e.target.value)}
                    className="text-xs font-semibold bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-0.5 hover:border-teal-400 focus:outline-none cursor-pointer"
                    title="Switch Doctor Clinic"
                  >
                    {ALL_DEPARTMENTS.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
                <span className="text-xs text-slate-600 dark:text-slate-300 font-semibold hidden sm:flex items-center gap-1">
                  <DoorOpen size={12} className="text-teal-600" />
                  {activeDeptConfig.defaultRoom.split("—")[0]?.trim()}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                <span>{myDoctorRecord?.shift?.start || "08:00 AM"} – {myDoctorRecord?.shift?.end || "04:30 PM"}</span>
                <span>•</span>
                <span
                  className={`font-semibold ${
                    myDoctorRecord?.status === "available"
                      ? "text-emerald-600"
                      : myDoctorRecord?.status === "in-consultation"
                      ? "text-blue-600"
                      : myDoctorRecord?.status === "on-break"
                      ? "text-amber-600"
                      : "text-slate-400"
                  }`}
                >
                  {myDoctorRecord?.status === "available"
                    ? "● Ready"
                    : myDoctorRecord?.status === "in-consultation"
                    ? "● Busy"
                    : myDoctorRecord?.status === "on-break"
                    ? "● On Break"
                    : "○ Off Duty"}
                </span>
              </div>
            </div>
          </div>

          {/* Middle: Simple Metrics */}
          <div className="flex items-center gap-3 sm:gap-5 text-xs divide-x divide-slate-100 dark:divide-slate-800">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">My Queue:</span>
              <span className="font-black text-slate-900 dark:text-white text-sm">{active.length}</span>
            </div>
            <div className="pl-3 sm:pl-5 flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Results Ready:</span>
              <span className={`font-black text-sm ${resultsReady.length > 0 ? "text-emerald-600" : "text-slate-700 dark:text-slate-300"}`}>
                {resultsReady.length}
              </span>
            </div>
            <div className="pl-3 sm:pl-5 items-center gap-1.5 hidden sm:flex">
              <span className="text-slate-500 font-medium">In Lab:</span>
              <span className="font-bold text-purple-600">{inLab.length}</span>
            </div>
            <div className="pl-3 sm:pl-5 items-center gap-1.5 hidden md:flex">
              <span className="text-slate-500 font-medium">With Me:</span>
              <span className="font-bold text-blue-600">{beingSeen}</span>
            </div>
            {urgent > 0 && (
              <div className="pl-3 sm:pl-5 flex items-center gap-1.5">
                <span className="text-rose-500 font-medium">Urgent:</span>
                <span className="font-black text-rose-600 animate-pulse">{urgent}</span>
              </div>
            )}
          </div>

          {/* Right: Duty Controls */}
          <div className="flex items-center gap-1.5">
            {isOffDuty ? (
              <button
                onClick={handleClockIn}
                disabled={checkInMutation.isPending}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center gap-1 cursor-pointer"
              >
                <UserCheck size={13} />
                <span>Start Shift</span>
              </button>
            ) : isOnBreak ? (
              <>
                <button
                  onClick={handleSetAvailable}
                  disabled={updateDoctorStatus.isPending}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center gap-1 cursor-pointer"
                >
                  <CheckCircle2 size={13} />
                  <span>Ready</span>
                </button>
                <button
                  onClick={handleClockOut}
                  disabled={checkOutMutation.isPending}
                  className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-red-600 rounded-lg border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                  title="End Shift"
                >
                  <span>End</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleSetBreak}
                  disabled={updateDoctorStatus.isPending}
                  className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-lg text-xs font-semibold transition flex items-center gap-1 shadow-2xs cursor-pointer"
                >
                  <Coffee size={12} />
                  <span>Break</span>
                </button>
                <button
                  onClick={handleClockOut}
                  disabled={checkOutMutation.isPending}
                  className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-red-600 rounded-lg border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                  title="End Shift"
                >
                  <LogOut size={12} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Specialty Quick Workspace Links */}
        <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <Link
              href={`/nova/doctor/consultation?dept=${activeDeptConfig.id}${nextPatient ? `&visitId=${nextPatient.visitId}` : ""}`}
              className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-800 font-semibold hover:bg-teal-100 transition flex items-center gap-1.5"
            >
              <Stethoscope size={12} />
              <span>{activeDeptConfig.sidebarLabels.consult}</span>
            </Link>
            <Link
              href={`/nova/doctor/lab-order?dept=${activeDeptConfig.id}${nextPatient ? `&visitId=${nextPatient.visitId}` : ""}`}
              className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-medium hover:border-teal-400 transition flex items-center gap-1.5"
            >
              <FlaskConical size={12} className="text-blue-600" />
              <span>{activeDeptConfig.sidebarLabels.labOrder}</span>
            </Link>
            <Link
              href={`/nova/doctor/prescription?dept=${activeDeptConfig.id}${nextPatient ? `&visitId=${nextPatient.visitId}` : ""}`}
              className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-medium hover:border-teal-400 transition flex items-center gap-1.5"
            >
              <Pill size={12} className="text-emerald-600" />
              <span>{activeDeptConfig.sidebarLabels.prescription}</span>
            </Link>
            <Link
              href={`/nova/doctor/referral?dept=${activeDeptConfig.id}${nextPatient ? `&visitId=${nextPatient.visitId}` : ""}`}
              className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-medium hover:border-teal-400 transition flex items-center gap-1.5"
            >
              <ArrowLeftRight size={12} className="text-purple-600" />
              <span>Transfer / Refer</span>
            </Link>
            {(activeDeptConfig.id === "surgery" || activeDeptConfig.id === "pediatrics" || activeDeptConfig.id === "ob_gyn") && (
              <Link
                href={"/nova/ward/admissions?tab=admit" as any}
                className="px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-800 font-semibold hover:bg-purple-100 transition flex items-center gap-1.5"
              >
                <Bed size={12} />
                <span>{activeDeptConfig.id === "surgery" ? "Book Ward / OR Bed" : "Admit to Ward"}</span>
              </Link>
            )}
          </div>

          {/* Department vs All Clinic Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[11px]">
            <button
              type="button"
              onClick={() => setQueueScope("dept")}
              className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                queueScope === "dept"
                  ? "bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {activeDeptConfig.shortLabel} ({deptQueue.filter((q: any) => q.status !== "done").length})
            </button>
            <button
              type="button"
              onClick={() => setQueueScope("all")}
              className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                queueScope === "all"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              All Clinic ({allQueue.filter((q: any) => q.status !== "done").length})
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. SEARCH & FILTER TOOLBAR ── */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs overflow-x-auto self-start sm:self-auto">
            <button
              onClick={() => setFilterTab("all")}
              className={`px-3 py-1 rounded-md font-semibold transition cursor-pointer ${
                filterTab === "all"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Active ({active.length})
            </button>

            <button
              onClick={() => setFilterTab("results-ready")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-bold transition cursor-pointer ${
                filterTab === "results-ready"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : resultsReady.length > 0
                  ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <span>Results Ready</span>
              {resultsReady.length > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    filterTab === "results-ready" ? "bg-white text-emerald-700" : "bg-emerald-600 text-white"
                  }`}
                >
                  {resultsReady.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setFilterTab("in-lab")}
              className={`flex items-center gap-1 px-3 py-1 rounded-md font-semibold transition cursor-pointer ${
                filterTab === "in-lab"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <span>In Lab ({inLab.length})</span>
            </button>

            <button
              onClick={() => setFilterTab("waiting")}
              className={`px-3 py-1 rounded-md font-semibold transition cursor-pointer ${
                filterTab === "waiting"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Waiting ({waitingConsult.length})
            </button>

            <button
              onClick={() => setFilterTab("done")}
              className={`px-3 py-1 rounded-md font-semibold transition cursor-pointer ${
                filterTab === "done"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Done ({doneToday.length})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ticket, name, ID..."
              className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:border-teal-500 shadow-xs"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* ── 3. PATIENT QUEUE TABLE ── */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-3">Patient</th>
                  <th className="py-3 px-3">ID &amp; Sex</th>
                  <th className="py-3 px-3">{activeDeptConfig.queueColumnLabel}</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Wait</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredQueue.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-14 text-center text-slate-400">
                      <FlaskConical size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                      <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
                        {filterTab === "results-ready"
                          ? "No patients with ready results"
                          : filterTab === "in-lab"
                          ? "No patients currently in the lab"
                          : filterTab === "done"
                          ? "No completed visits today"
                          : `No patients waiting in ${activeDeptConfig.shortLabel}`}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1 flex items-center justify-center gap-3">
                        {filterTab !== "all" && (
                          <button
                            onClick={() => setFilterTab("all")}
                            className="text-teal-600 font-bold hover:underline cursor-pointer"
                          >
                            Show Active ({active.length})
                          </button>
                        )}
                        {queueScope === "dept" && allQueue.length > deptQueue.length && (
                          <button
                            onClick={() => setQueueScope("all")}
                            className="text-slate-600 dark:text-slate-300 font-semibold hover:underline cursor-pointer"
                          >
                            View all clinic patients ({allQueue.filter((q: any) => q.status !== "done").length}) →
                          </button>
                        )}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredQueue.map((q: any) => {
                    const patient = q.visit?.patient || {};
                    const labs = q.visit?.labOrders || [];
                    const completedLabs = labs.filter((l: any) => l.status === "completed");
                    const pendingLabs = labs.filter((l: any) => l.status === "pending" || l.status === "in-progress");
                    const isResultsReady =
                      q.status === "results-ready" || (labs.length > 0 && pendingLabs.length === 0 && completedLabs.length > 0);
                    const isInLab = q.status === "in-lab" || pendingLabs.length > 0;
                    const isUrgent = q.status === "urgent";
                    const isVip = (q as any).tier === "vip" || (q.ticketNumber || "").startsWith("V");

                    let sexBadge = "—";
                    const rawSex = (patient.sex || "").trim().toLowerCase();
                    if (rawSex.startsWith("m")) sexBadge = "M";
                    else if (rawSex.startsWith("f")) sexBadge = "F";

                    return (
                      <tr
                        key={q.id}
                        className={`transition ${
                          isResultsReady && q.status !== "done"
                            ? "bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-50/70 border-l-4 border-l-emerald-500"
                            : isUrgent
                            ? "bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            : "hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                        }`}
                      >
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-lg font-mono font-black text-xs ${
                              isUrgent
                                ? "bg-rose-100 text-rose-800 border border-rose-200"
                                : isVip
                                ? "bg-amber-100 text-amber-900 border border-amber-300"
                                : "bg-teal-100 text-teal-800 border border-teal-200"
                            }`}
                          >
                            #{q.ticketNumber}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                            <span>{patient.nameEn || "Patient"}</span>
                            {isVip && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded font-black bg-amber-100 text-amber-900 border border-amber-300">
                                VIP
                              </span>
                            )}
                            {q.assignedDoctorName && (
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded font-semibold border ${
                                  myDoctorRecord?.name &&
                                  q.assignedDoctorName.toLowerCase() === myDoctorRecord.name.toLowerCase()
                                    ? "bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-200 border-teal-200 dark:border-teal-800"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                                }`}
                              >
                                {myDoctorRecord?.name &&
                                q.assignedDoctorName.toLowerCase() === myDoctorRecord.name.toLowerCase()
                                  ? "Assigned to You"
                                  : q.assignedDoctorName}
                              </span>
                            )}
                          </div>
                          {queueScope === "all" && q.department && (
                            <div className="text-[10px] text-teal-700 dark:text-teal-400 font-semibold">
                              {q.department}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`inline-flex items-center justify-center w-5 h-5 rounded font-black text-[10px] ${
                                sexBadge === "M"
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                                  : sexBadge === "F"
                                  ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {sexBadge}
                            </span>
                            <span className="font-mono text-slate-600 dark:text-slate-300 text-[11px]">
                              {patient.healthId}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-3">{renderSpecialtyContext(q)}</td>

                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isResultsReady && q.status !== "done" ? (
                              <span className="relative inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-600 text-white animate-lab-glow border border-emerald-300 shadow-xs">
                                <span>Results Ready ({completedLabs.length})</span>
                              </span>
                            ) : isInLab && !isResultsReady && q.status !== "done" ? (
                              <span className="text-[11px] px-2.5 py-0.5 bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-200 rounded-full font-medium border border-purple-200 dark:border-purple-800">
                                In Lab ({completedLabs.length}/{labs.length})
                              </span>
                            ) : isUrgent ? (
                              <span className="text-[10px] px-2 py-0.5 bg-rose-100 text-rose-700 font-black rounded-full uppercase tracking-wider animate-pulse border border-rose-300">
                                Urgent
                              </span>
                            ) : q.status === "being-seen" ? (
                              <span className="text-[11px] px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full font-semibold border border-blue-200">
                                With Doctor
                              </span>
                            ) : q.status === "done" ? (
                              <span className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-medium">
                                Done
                              </span>
                            ) : (
                              <span className="text-[11px] px-2 py-0.5 bg-teal-50 text-teal-800 rounded-full font-medium border border-teal-200">
                                Waiting
                              </span>
                            )}

                            {patient.cbhiStatus && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-cyan-100 text-cyan-800">
                                CBHI
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-3 text-slate-500 font-medium">
                          {q.waitMinutes ? `${q.waitMinutes}m` : "< 1m"}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href={`/nova/doctor/emr?visitId=${q.visitId}&dept=${activeDeptConfig.id}`}
                              className="px-2.5 py-1 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:border-teal-500 transition shadow-2xs"
                              title="Open Patient History"
                            >
                              History
                            </Link>

                            {q.status === "done" ? (
                              <div className="flex items-center gap-1">
                                <Link
                                  href={`/nova/doctor/consultation?visitId=${q.visitId}&dept=${activeDeptConfig.id}`}
                                  className="px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                                >
                                  View
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => handleReopenVisit(q.id)}
                                  className="p-1 text-emerald-700 hover:bg-emerald-50 rounded-lg border border-emerald-200 transition cursor-pointer"
                                  title="Reopen visit"
                                >
                                  <RotateCcw size={12} />
                                </button>
                              </div>
                            ) : q.paymentStatus === "unpaid" ? (
                              <span
                                className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 text-slate-400 rounded-lg border border-slate-200 flex items-center gap-1 cursor-not-allowed"
                                title="Patient must pay registration fee at cashier"
                              >
                                <Lock size={11} /> Unpaid
                              </span>
                            ) : isResultsReady ? (
                              <Link
                                href={`/nova/doctor/consultation?visitId=${q.visitId}&dept=${activeDeptConfig.id}`}
                                onClick={() => updateStatus.mutate({ ticketId: q.id, status: "being-seen" })}
                                className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-xs"
                              >
                                <span>Resume</span>
                                <ArrowRight size={12} />
                              </Link>
                            ) : (
                              <Link
                                href={`/nova/doctor/consultation?visitId=${q.visitId}&dept=${activeDeptConfig.id}`}
                                onClick={() => updateStatus.mutate({ ticketId: q.id, status: "being-seen" })}
                                className="inline-flex items-center gap-1 px-3 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-bold transition shadow-xs"
                              >
                                <span>Open</span>
                                <ArrowRight size={12} />
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
