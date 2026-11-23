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
  Clock,
  FlaskConical,
  RotateCcw,
  Search,
  RefreshCw,
  Stethoscope,
  Users,
  X,
} from "lucide-react";
import { useNovaRole } from "@/components/nova/nova-role-context";
import { getDepartmentConfig, ALL_DEPARTMENTS } from "@/lib/department-configs";
import { toast } from "sonner";

export default function DoctorDashboard() {
  const { userName, doctorDepartment, setDoctorDepartment } = useNovaRole();
  const [filterTab, setFilterTab] = useState<"all" | "results-ready" | "in-lab" | "waiting" | "done">("all");
  const [search, setSearch] = useState("");

  const { data: meDoctor } = useQuery(trpc.doctor.me.queryOptions());

  // Resolve active department config
  const activeDeptConfig = useMemo(() => {
    return getDepartmentConfig(doctorDepartment || meDoctor?.department);
  }, [doctorDepartment, meDoctor?.department]);

  const { data: queue = [], refetch: refetchQueue, isFetching: isQueueFetching } = useQuery({
    ...trpc.visit.queue.queryOptions(),
    refetchInterval: 10_000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const { data: presenceData, refetch: refetchPresence, isFetching: isPresenceFetching } = useQuery({
    ...trpc.doctor.listPresence.queryOptions(),
    refetchInterval: 15_000,
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

  // Active queue: includes open tickets + tickets with active/completed lab orders
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
    () => queue.filter((q) => isPatientResultsReady(q) && q.status !== "done"),
    [queue]
  );

  const inLab = useMemo(
    () => queue.filter((q) => isPatientInLab(q) && !isPatientResultsReady(q) && q.status !== "done"),
    [queue]
  );

  const waitingConsult = useMemo(
    () =>
      active.filter(
        (q) =>
          !isPatientResultsReady(q) &&
          !isPatientInLab(q) &&
          q.status !== "done"
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

  // Filtered queue by Tab and Search Query
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
          (patient.healthId || "").toLowerCase().includes(q)
        );
      });
    }

    return list;
  }, [filterTab, search, resultsReady, inLab, waitingConsult, doneToday, active]);

  // Match current logged in doctor
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
      toast.success("Clocked in for duty. Status: Ready.");
    },
  });

  const checkOutMutation = useMutation({
    ...trpc.doctor.checkOut.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.doctor.listPresence.queryKey() });
      toast.info("Clocked out. Shift ended.");
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
    toast.success("Status: Ready at Desk");
  };

  const handleSetBreak = () => {
    if (!myDoctorRecord) return;
    updateDoctorStatus.mutate({
      doctorId: myDoctorRecord.userId || myDoctorRecord.id,
      status: "on-break",
      breakNote: "Ward Rounds / Clinical Break",
      method: "self_checkin",
    });
    toast.info("Status: Stepped Out (Break / Rounds)");
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
    <PageShell
      title="Doctor Station & Consultation Queue"
      subtitle="Outpatient Consultations, Lab Findings Review & Clinical Orders"
      action={
        <div className="flex items-center gap-2">
          <Link
            href={"/nova/reception/doctors" as any}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 transition text-xs font-semibold shadow-xs"
          >
            <Users size={13} className="text-teal-600" />
            <span>Doctors Roster</span>
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
      {/* ── CSS for Lab Results Ready Glowing Light Effect ── */}
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

      {/* ── 1. UNIFIED PHYSICIAN STATION & METRICS STRIP (Merged, Sleek, Short Words) ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 mb-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Left: Doctor Station Info & Specialty Department Switcher */}
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 flex items-center justify-center shrink-0">
            <Stethoscope size={16} />
          </span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-900 dark:text-white text-sm">
                {myDoctorRecord?.name || userName || "Attending Physician"}
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              
              {/* Department Badge & Quick Switcher */}
              <div className="flex items-center gap-1.5">
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${activeDeptConfig.badgeColor}`}>
                  {activeDeptConfig.code} — {activeDeptConfig.name}
                </span>
                <select
                  value={activeDeptConfig.id}
                  onChange={(e) => setDoctorDepartment(e.target.value)}
                  className="text-[11px] font-medium bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 hover:border-teal-400 focus:outline-none"
                  title="Switch Specialty Clinical Page Layout"
                >
                  {ALL_DEPARTMENTS.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-xs text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-1">
                <DoorOpen size={12} className="text-teal-600" />
                {myDoctorRecord?.roomNumber?.split("—")[0]?.trim() || activeDeptConfig.defaultRoom.split("—")[0]?.trim()}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
              <span>{myDoctorRecord?.shift?.start || "08:00 AM"} – {myDoctorRecord?.shift?.end || "04:30 PM"}</span>
              <span>•</span>
              <span className={`font-semibold ${
                myDoctorRecord?.status === "available" ? "text-emerald-600" :
                myDoctorRecord?.status === "in-consultation" ? "text-blue-600" :
                myDoctorRecord?.status === "on-break" ? "text-amber-600" : "text-slate-400"
              }`}>
                {myDoctorRecord?.status === "available" ? "● Ready" :
                 myDoctorRecord?.status === "in-consultation" ? "● In Consult" :
                 myDoctorRecord?.status === "on-break" ? "● Break" : "○ Off Duty"}
              </span>
              <span>•</span>
              <span className="text-slate-500 italic text-[10px]">
                {activeDeptConfig.bannerTitle}
              </span>
            </div>
          </div>
        </div>

        {/* Middle: Short Metrics */}
        <div className="flex items-center gap-3 sm:gap-5 text-xs divide-x divide-slate-100 dark:divide-slate-800">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Queue:</span>
            <span className="font-black text-slate-900 dark:text-white text-sm">{active.length}</span>
          </div>
          <div className="pl-3 sm:pl-5 flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Lab Ready:</span>
            <span className={`font-black text-sm ${resultsReady.length > 0 ? "text-emerald-600" : "text-slate-700 dark:text-slate-300"}`}>
              {resultsReady.length}
            </span>
          </div>
          <div className="pl-3 sm:pl-5 flex items-center gap-1.5 hidden sm:flex">
            <span className="text-slate-500 font-medium">In Lab:</span>
            <span className="font-bold text-purple-600">{inLab.length}</span>
          </div>
          <div className="pl-3 sm:pl-5 flex items-center gap-1.5 hidden md:flex">
            <span className="text-slate-500 font-medium">In Consult:</span>
            <span className="font-bold text-blue-600">{beingSeen}</span>
          </div>
          {urgent > 0 && (
            <div className="pl-3 sm:pl-5 flex items-center gap-1.5">
              <span className="text-rose-500 font-medium">Urgent:</span>
              <span className="font-black text-rose-600 animate-pulse">{urgent}</span>
            </div>
          )}
        </div>

        {/* Right: Quick Duty Controls */}
        <div className="flex items-center gap-1.5">
          {isOffDuty ? (
            <button
              onClick={handleClockIn}
              disabled={checkInMutation.isPending}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center gap-1 cursor-pointer"
            >
              <UserCheck size={13} />
              <span>Clock In</span>
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

      {/* ── 2. SEARCH & FILTER TOOLBAR ── */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs overflow-x-auto self-start sm:self-auto">
            <button
              onClick={() => setFilterTab("all")}
              className={`px-3 py-1 rounded-md font-semibold transition cursor-pointer ${
                filterTab === "all"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              All Active ({active.length})
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
              <span>🔬 Results Ready</span>
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
              Done Today ({doneToday.length})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ticket #, name, health ID..."
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

        {/* ── 3. CLEAN PATIENT QUEUE TABLE (Ticket and Patient Name Separated) ── */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-3">Patient Name</th>
                  <th className="py-3 px-3">Health ID</th>
                  <th className="py-3 px-3 text-center">Sex</th>
                  <th className="py-3 px-3">Clinical State / Lab Status</th>
                  <th className="py-3 px-3">Wait</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredQueue.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-14 text-center text-slate-400">
                      <FlaskConical size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                      <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
                        {filterTab === "results-ready"
                          ? "No patients waiting with completed lab results"
                          : filterTab === "in-lab"
                          ? "No patients currently undergoing laboratory testing"
                          : filterTab === "done"
                          ? "No completed patient consultations recorded today"
                          : "No patients found in this queue"}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {filterTab !== "all" ? (
                          <button
                            onClick={() => setFilterTab("all")}
                            className="text-teal-600 font-bold hover:underline cursor-pointer"
                          >
                            View all active patients ({active.length}) →
                          </button>
                        ) : (
                          "Station queue is clear. New patients from triage will appear here."
                        )}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredQueue.map((q) => {
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
                        {/* 1. Ticket Number (Clean Dedicated Column) */}
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

                        {/* 2. Patient Name */}
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{patient.nameEn || "Patient"}</span>
                            {isVip && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded font-black bg-amber-100 text-amber-900 border border-amber-300">
                                ⭐ VIP
                              </span>
                            )}
                          </div>
                          {patient.phone && (
                            <div className="text-[11px] text-slate-400">{patient.phone}</div>
                          )}
                        </td>

                        {/* 3. Health ID */}
                        <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300 font-medium">
                          {patient.healthId}
                        </td>

                        {/* 4. Sex: M or F badge */}
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-md font-black text-xs ${
                              sexBadge === "M"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                                : sexBadge === "F"
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {sexBadge}
                          </span>
                        </td>

                        {/* 5. Clinical State / Lab Status (WITH GLOWING LIGHT EFFECT FOR READY LABS) */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isResultsReady && q.status !== "done" ? (
                              <span className="relative inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-600 text-white animate-lab-glow border border-emerald-300 shadow-md">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-90" />
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                                </span>
                                <span>🔬 Results Ready ({completedLabs.length} test{completedLabs.length > 1 ? "s" : ""})</span>
                              </span>
                            ) : isInLab && !isResultsReady && q.status !== "done" ? (
                              <span className="text-[11px] px-2.5 py-0.5 bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-200 rounded-full font-medium border border-purple-200 dark:border-purple-800 flex items-center gap-1">
                                <span>In Lab ({completedLabs.length}/{labs.length} done)</span>
                              </span>
                            ) : isUrgent ? (
                              <span className="text-[10px] px-2 py-0.5 bg-rose-100 text-rose-700 font-black rounded-full uppercase tracking-wider animate-pulse border border-rose-300">
                                🚨 Urgent
                              </span>
                            ) : q.status === "being-seen" ? (
                              <span className="text-[11px] px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full font-semibold border border-blue-200">
                                In Consultation
                              </span>
                            ) : q.status === "done" ? (
                              <span className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-medium">
                                Completed Visit
                              </span>
                            ) : (
                              <span className="text-[11px] px-2 py-0.5 bg-teal-50 text-teal-800 rounded-full font-medium border border-teal-200">
                                Ready for Consult
                              </span>
                            )}

                            {patient.cbhiStatus && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-cyan-100 text-cyan-800">
                                CBHI
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 6. Wait Time */}
                        <td className="py-3 px-3 text-slate-500 font-medium">
                          {q.waitMinutes ? `${q.waitMinutes}m` : "< 1m"}
                        </td>

                        {/* 7. Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* EMR Button */}
                            <Link
                              href={`/nova/doctor/emr?visitId=${q.visitId}`}
                              className="px-2.5 py-1 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:border-teal-500 transition shadow-2xs"
                              title="Open Patient Electronic Medical Record"
                            >
                              EMR
                            </Link>

                            {/* Main Consult Action */}
                            {q.status === "done" ? (
                              <div className="flex items-center gap-1">
                                <Link
                                  href={`/nova/doctor/consultation?visitId=${q.visitId}&dept=${activeDeptConfig.id}`}
                                  className="px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                                >
                                  Review
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => handleReopenVisit(q.id)}
                                  className="p-1 text-emerald-700 hover:bg-emerald-50 rounded-lg border border-emerald-200 transition cursor-pointer"
                                  title="Reopen consultation"
                                >
                                  <RotateCcw size={12} />
                                </button>
                              </div>
                            ) : q.paymentStatus === "unpaid" ? (
                              <span
                                className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 text-slate-400 rounded-lg border border-slate-200 flex items-center gap-1 cursor-not-allowed"
                                title="Patient must settle registration fee at cashier"
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
                                <span>Consult</span>
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
