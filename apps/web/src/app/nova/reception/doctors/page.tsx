"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { toast } from "sonner";
import { PageShell } from "@/components/nova/nova-ui";
import {
  Stethoscope,
  Search,
  RefreshCw,
  UserCheck,
  UserX,
  Coffee,
  ArrowRight,
  Clock,
  DoorOpen,
  X,
  Users,
  CheckCircle2,
  AlertCircle,
  Activity,
} from "lucide-react";

export type DoctorStatus =
  | "available"
  | "in-consultation"
  | "on-break"
  | "expected"
  | "off-duty";

export interface DoctorRosterItem {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  licenseNumber: string;
  department: string;
  title: string;
  roomNumber: string;
  status: DoctorStatus;
  shift: {
    name: string;
    start: string;
    end: string;
    type: "Morning" | "Afternoon" | "Full Duty" | "Night / On-Call";
  };
  checkInTime?: string;
  checkInMethod?: "self_checkin" | "reception_override" | "auto_activity";
  breakNote?: string;
  activeTicketNumber?: string;
  activePatientName?: string;
  waitingCount: number;
  completedTodayCount: number;
  estimatedWaitMinutes: number;
  lastActiveAt: string;
}

const AVAILABLE_ROOMS = [
  "Room 101 — Triage",
  "Room 102 — General OPD A",
  "Room 103 — General OPD B",
  "Room 104 — Internal Medicine",
  "Room 110 — Surgical Consult",
  "Room 115 — Ultrasound & Imaging",
  "Room 205 — Pediatrics",
  "Room 208 — Women's Health & OB/GYN",
  "Room 302 — Chronic Disease",
];

const DEPARTMENTS = [
  "All Departments",
  "General OPD",
  "Internal Medicine",
  "Pediatrics",
  "General Surgery",
  "OB/GYN",
  "Radiology & Imaging",
];

const STATUS_CONFIG: Record<
  DoctorStatus,
  { label: string; badge: string; dot: string }
> = {
  available: {
    label: "Available",
    badge: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    dot: "bg-emerald-500",
  },
  "in-consultation": {
    label: "In Consultation",
    badge: "bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    dot: "bg-blue-500",
  },
  "on-break": {
    label: "On Break / Rounds",
    badge: "bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    dot: "bg-amber-500",
  },
  expected: {
    label: "Expected",
    badge: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700",
    dot: "bg-slate-400",
  },
  "off-duty": {
    label: "Off Duty",
    badge: "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700",
    dot: "bg-slate-300",
  },
};

export default function DoctorPresenceReceptionPage() {
  const queryClient = useQueryClient();

  // Filters
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("All Departments");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Break modal
  const [breakDoctor, setBreakDoctor] = useState<DoctorRosterItem | null>(null);
  const [breakNote, setBreakNote] = useState("");

  // TRPC Query
  const {
    data: presenceData,
    refetch,
    isFetching,
  } = useQuery({
    ...trpc.doctor.listPresence.queryOptions(),
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });

  const roster: DoctorRosterItem[] = useMemo(() => {
    return (presenceData?.roster as DoctorRosterItem[]) ?? [];
  }, [presenceData]);

  // Mutations
  const checkInMutation = useMutation(trpc.doctor.checkIn.mutationOptions());
  const checkOutMutation = useMutation(trpc.doctor.checkOut.mutationOptions());
  const updateStatusMutation = useMutation(trpc.doctor.updateStatus.mutationOptions());
  const assignRoomMutation = useMutation(trpc.doctor.assignRoom.mutationOptions());

  const handleCheckIn = async (doctor: DoctorRosterItem) => {
    try {
      await checkInMutation.mutateAsync({
        doctorId: doctor.userId || doctor.id,
        roomNumber: doctor.roomNumber,
        method: "reception_override",
      });
      queryClient.invalidateQueries({ queryKey: trpc.doctor.listPresence.queryKey() });
      toast.success(`${doctor.name} checked in`);
    } catch {
      toast.error("Failed to check in doctor");
    }
  };

  const handleCheckOut = async (doctor: DoctorRosterItem) => {
    try {
      await checkOutMutation.mutateAsync({
        doctorId: doctor.userId || doctor.id,
        method: "reception_override",
      });
      queryClient.invalidateQueries({ queryKey: trpc.doctor.listPresence.queryKey() });
      toast.success(`${doctor.name} marked off duty`);
    } catch {
      toast.error("Failed to check out doctor");
    }
  };

  const handleStatusChange = async (doctor: DoctorRosterItem, newStatus: DoctorStatus) => {
    if (newStatus === "on-break") {
      setBreakDoctor(doctor);
      setBreakNote("Short Break");
      return;
    }
    if (newStatus === "off-duty") {
      return handleCheckOut(doctor);
    }
    try {
      await updateStatusMutation.mutateAsync({
        doctorId: doctor.userId || doctor.id,
        status: newStatus,
        method: "reception_override",
      });
      queryClient.invalidateQueries({ queryKey: trpc.doctor.listPresence.queryKey() });
      toast.success(`${doctor.name} set to ${STATUS_CONFIG[newStatus].label}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleConfirmBreak = async () => {
    if (!breakDoctor) return;
    try {
      await updateStatusMutation.mutateAsync({
        doctorId: breakDoctor.userId || breakDoctor.id,
        status: "on-break",
        breakNote: breakNote.trim() || "On Break",
        method: "reception_override",
      });
      queryClient.invalidateQueries({ queryKey: trpc.doctor.listPresence.queryKey() });
      toast.success(`${breakDoctor.name} set on break`);
      setBreakDoctor(null);
    } catch {
      toast.error("Failed to update break status");
    }
  };

  const handleRoomChange = async (doctor: DoctorRosterItem, roomNumber: string) => {
    try {
      await assignRoomMutation.mutateAsync({
        doctorId: doctor.userId || doctor.id,
        roomNumber,
      });
      queryClient.invalidateQueries({ queryKey: trpc.doctor.listPresence.queryKey() });
      toast.success(`${doctor.name} moved to ${roomNumber.split("—")[0].trim()}`);
    } catch {
      toast.error("Failed to reassign room");
    }
  };

  // Filtered roster
  const filteredRoster = useMemo(() => {
    return roster.filter((d) => {
      if (selectedDept !== "All Departments" && d.department !== selectedDept) return false;
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matches =
          d.name.toLowerCase().includes(q) ||
          d.roomNumber.toLowerCase().includes(q) ||
          d.department.toLowerCase().includes(q) ||
          d.title.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [roster, selectedDept, statusFilter, search]);

  // Counts
  const counts = useMemo(() => {
    const available = roster.filter((r) => r.status === "available").length;
    const inConsult = roster.filter((r) => r.status === "in-consultation").length;
    const onBreak = roster.filter((r) => r.status === "on-break").length;
    const offDuty = roster.filter((r) => r.status === "off-duty" || r.status === "expected").length;
    return { total: roster.length, available, inConsult, onBreak, offDuty };
  }, [roster]);

  return (
    <PageShell
      title="Doctor Presence & Clinical Duty Roster"
      subtitle="Front-desk OPD visibility: Real-time doctor availability, room allocations, and patient queues."
      action={
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-2xs"
            title="Refresh doctor roster and queues"
          >
            <RefreshCw size={13} className={isFetching ? "animate-spin text-teal-600" : "text-slate-500"} />
            <span>Refresh</span>
          </button>
          <Link
            href={"/nova/reception/queue" as any}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg transition shadow-xs"
          >
            <Activity size={14} />
            <span>OPD Queue Board</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {/* ================= 1. SPACIOUS SUMMARY STATS CARDS ================= */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          {/* Available Now */}
          <div
            onClick={() => setStatusFilter(statusFilter === "available" ? "all" : "available")}
            className={`cursor-pointer p-4 rounded-xl border transition-all duration-150 ${
              statusFilter === "available"
                ? "bg-emerald-50/80 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700 ring-2 ring-emerald-500/20"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 shadow-2xs"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                Available Now
              </span>
              <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{counts.available}</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
              Ready in consultation room
            </p>
          </div>

          {/* In Consultation */}
          <div
            onClick={() => setStatusFilter(statusFilter === "in-consultation" ? "all" : "in-consultation")}
            className={`cursor-pointer p-4 rounded-xl border transition-all duration-150 ${
              statusFilter === "in-consultation"
                ? "bg-blue-50/80 dark:bg-blue-950/50 border-blue-300 dark:border-blue-700 ring-2 ring-blue-500/20"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 shadow-2xs"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-blue-800 dark:text-blue-300 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                In Consultation
              </span>
              <span className="text-2xl font-black text-blue-700 dark:text-blue-300">{counts.inConsult}</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
              Currently examining patients
            </p>
          </div>

          {/* On Break / Rounds */}
          <div
            onClick={() => setStatusFilter(statusFilter === "on-break" ? "all" : "on-break")}
            className={`cursor-pointer p-4 rounded-xl border transition-all duration-150 ${
              statusFilter === "on-break"
                ? "bg-amber-50/80 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700 ring-2 ring-amber-500/20"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 shadow-2xs"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                Rounds / Break
              </span>
              <span className="text-2xl font-black text-amber-700 dark:text-amber-300">{counts.onBreak}</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
              Ward rounds or meal break
            </p>
          </div>

          {/* Off Duty / Expected */}
          <div
            onClick={() => setStatusFilter(statusFilter === "off-duty" ? "all" : "off-duty")}
            className={`cursor-pointer p-4 rounded-xl border transition-all duration-150 ${
              statusFilter === "off-duty"
                ? "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 ring-2 ring-slate-400/20"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 shadow-2xs"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                Off Duty / Expected
              </span>
              <span className="text-2xl font-black text-slate-700 dark:text-slate-200">{counts.offDuty}</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
              Not currently clocked in
            </p>
          </div>
        </div>

        {/* ================= 2. COMFORTABLE FILTER & SEARCH BAR ================= */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by doctor name, room, specialty, or title..."
              className="w-full pl-10 pr-9 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:bg-white dark:focus:bg-slate-900 transition"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Department & Status Selects */}
          <div className="flex items-center gap-2.5 shrink-0">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="text-xs py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-teal-500 cursor-pointer font-medium"
            >
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-teal-500 cursor-pointer font-medium"
            >
              <option value="all">All Statuses ({counts.total})</option>
              <option value="available">Available ({counts.available})</option>
              <option value="in-consultation">In Consultation ({counts.inConsult})</option>
              <option value="on-break">On Break ({counts.onBreak})</option>
              <option value="off-duty">Off Duty ({counts.offDuty})</option>
            </select>
          </div>
        </div>

        {/* ================= 3. BEAUTIFUL, SPACIOUS ROSTER TABLE ================= */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
          {filteredRoster.length === 0 ? (
            <div className="py-16 px-6 text-center text-slate-500 dark:text-slate-400">
              <Stethoscope size={36} className="mx-auto mb-3 text-slate-400 opacity-60" />
              <p className="text-base font-semibold text-slate-800 dark:text-slate-200">No doctors match your filters</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                Try searching with a different term, switching departments, or resetting filters.
              </p>
              <button
                onClick={() => {
                  setSearch("");
                  setSelectedDept("All Departments");
                  setStatusFilter("all");
                }}
                className="mt-4 px-4 py-2 text-xs font-semibold text-teal-600 hover:text-teal-700 bg-teal-50 dark:bg-teal-950/40 rounded-lg hover:underline transition"
              >
                Reset all filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/90 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold text-[11px]">
                    <th className="py-4.5 px-6">Doctor & Specialty</th>
                    <th className="py-4.5 px-5">Assigned Room</th>
                    <th className="py-4.5 px-5">Shift Hours</th>
                    <th className="py-4.5 px-5">Duty Status</th>
                    <th className="py-4.5 px-5 text-center">OPD Queue</th>
                    <th className="py-4.5 px-6 text-right">Quick Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {filteredRoster.map((doc) => {
                    const statusInfo = STATUS_CONFIG[doc.status] || STATUS_CONFIG["off-duty"];
                    const isOnDuty = doc.status !== "off-duty" && doc.status !== "expected";

                    // Doctor initials for avatar
                    const initials = doc.name
                      .replace("Dr.", "")
                      .trim()
                      .split(" ")
                      .map((p) => p[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase();

                    return (
                      <tr
                        key={doc.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors duration-150"
                      >
                        {/* 1. Doctor Profile */}
                        <td className="py-4.5 px-6">
                          <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-bold text-xs flex items-center justify-center border border-teal-200/70 dark:border-teal-800/60 shrink-0 shadow-2xs">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                                {doc.name}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                                <span className="font-medium text-slate-600 dark:text-slate-300">{doc.department}</span>
                                {doc.title && (
                                  <>
                                    <span className="text-slate-300 dark:text-slate-600">·</span>
                                    <span className="text-slate-500 dark:text-slate-400 truncate">{doc.title}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Room Allocation */}
                        <td className="py-4.5 px-5">
                          <div className="flex items-center gap-2">
                            <DoorOpen size={15} className="text-teal-600 dark:text-teal-400 shrink-0" />
                            <select
                              value={doc.roomNumber}
                              onChange={(e) => handleRoomChange(doc, e.target.value)}
                              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500 cursor-pointer font-medium shadow-2xs hover:border-teal-400 transition max-w-[210px] truncate"
                              title="Click to reassign room"
                            >
                              {AVAILABLE_ROOMS.map((r) => (
                                <option key={r} value={r}>
                                  {r.split("—")[0].trim()} ({r.split("—")[1]?.trim() || ""})
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>

                        {/* 3. Shift Hours */}
                        <td className="py-4.5 px-5 text-slate-600 dark:text-slate-300">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                            <Clock size={13} className="text-slate-400 shrink-0" />
                            <span>{doc.shift.start} – {doc.shift.end}</span>
                          </div>
                          <div className="mt-1">
                            <span className="inline-block text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium">
                              {doc.shift.type}
                            </span>
                          </div>
                        </td>

                        {/* 4. Status with 1-Click Dropdown */}
                        <td className="py-4.5 px-5">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusInfo.dot} ${
                                  doc.status === "available" ? "animate-pulse" : ""
                                }`}
                              />
                              <select
                                value={doc.status}
                                onChange={(e) => handleStatusChange(doc, e.target.value as DoctorStatus)}
                                className={`text-xs font-semibold border rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer shadow-2xs transition ${statusInfo.badge}`}
                              >
                                <option value="available">🟢 Available</option>
                                <option value="in-consultation">🔵 In Consultation</option>
                                <option value="on-break">🟡 On Break / Rounds</option>
                                <option value="off-duty">⚪ Off Duty</option>
                              </select>
                            </div>

                            {/* Status context badges */}
                            {doc.status === "on-break" && doc.breakNote && (
                              <div className="text-[11px] text-amber-700 dark:text-amber-300 flex items-center gap-1 bg-amber-50/80 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200/60 dark:border-amber-800/60 max-w-[200px] truncate" title={doc.breakNote}>
                                <Coffee size={11} className="shrink-0" />
                                <span className="truncate">{doc.breakNote}</span>
                              </div>
                            )}

                            {doc.status === "in-consultation" && doc.activeTicketNumber && (
                              <div className="text-[11px] text-blue-700 dark:text-blue-300 flex items-center gap-1 bg-blue-50/80 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200/60 dark:border-blue-800/60">
                                <span>Ticket #{doc.activeTicketNumber}</span>
                                {doc.activePatientName && (
                                  <span className="text-blue-500 truncate">({doc.activePatientName})</span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 5. Waiting Queue */}
                        <td className="py-4.5 px-5 text-center">
                          {doc.waitingCount > 0 ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-xs bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                              <span>{doc.waitingCount} waiting</span>
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                              0 waiting
                            </span>
                          )}
                        </td>

                        {/* 6. Quick Action Buttons */}
                        <td className="py-4.5 px-6 text-right">
                          <div className="flex items-center justify-end gap-2.5">
                            {isOnDuty ? (
                              <button
                                onClick={() => handleCheckOut(doc)}
                                className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg border border-slate-200 dark:border-slate-700 transition"
                                title="Sign doctor out for the day"
                              >
                                Sign Out
                              </button>
                            ) : (
                              <button
                                onClick={() => handleCheckIn(doc)}
                                className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition flex items-center gap-1.5 shadow-2xs"
                              >
                                <UserCheck size={13} />
                                <span>Check In</span>
                              </button>
                            )}

                            <Link
                              href={`/nova/reception/register?targetDoctor=${encodeURIComponent(doc.name)}&targetRoom=${encodeURIComponent(doc.roomNumber.split("—")[0].trim())}` as any}
                              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition flex items-center gap-1.5 shadow-xs"
                              title="Register and route patient to this doctor"
                            >
                              <span>Queue Patient</span>
                              <ArrowRight size={12} />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ================= LIGHTWEIGHT BREAK NOTE MODAL ================= */}
      {breakDoctor && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
                <Coffee size={18} />
                <span>Set {breakDoctor.name} On Break</span>
              </div>
              <button
                onClick={() => setBreakDoctor(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Provide an optional note or expected return time to inform waiting patients at Reception.
            </p>

            <input
              type="text"
              value={breakNote}
              onChange={(e) => setBreakNote(e.target.value)}
              placeholder="e.g. Ward rounds, Lunch break, Meeting..."
              className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-teal-500"
              autoFocus
            />

            <div className="flex flex-wrap gap-1.5 pt-1">
              {["Ward Rounds", "Lunch Break (30m)", "Staff Meeting", "Emergency Consult"].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setBreakNote(tag)}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-amber-100 dark:hover:bg-amber-950/60 font-medium transition"
                >
                  {tag}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setBreakDoctor(null)}
                className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBreak}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-2xs transition"
              >
                Confirm Break
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
