"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { toast } from "sonner";
import { PageShell } from "@/components/nova/nova-ui";
import { useNovaRole } from "@/components/nova/nova-role-context";
import {
  Search,
  RefreshCw,
  X,
  Coffee,
  ArrowRight,
  Stethoscope,
  Clock,
  DoorOpen,
  Users,
  Activity,
  CheckCircle2,
  Calendar,
  UserCheck,
  AlertCircle,
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
  avgConsultMinutes: number;
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
  { label: string; dot: string; text: string; bg: string; border: string }
> = {
  available: {
    label: "Available",
    dot: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  "in-consultation": {
    label: "In Consultation",
    dot: "bg-blue-500",
    text: "text-blue-700 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    border: "border-blue-200 dark:border-blue-800",
  },
  "on-break": {
    label: "On Break",
    dot: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-200 dark:border-amber-800",
  },
  expected: {
    label: "Expected",
    dot: "bg-slate-400",
    text: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-50 dark:bg-slate-800",
    border: "border-slate-200 dark:border-slate-700",
  },
  "off-duty": {
    label: "Off Duty",
    dot: "bg-slate-300 dark:bg-slate-600",
    text: "text-slate-500 dark:text-slate-400",
    bg: "bg-slate-50 dark:bg-slate-800",
    border: "border-slate-200 dark:border-slate-700",
  },
};

export default function DoctorPresenceReceptionPage() {
  const queryClient = useQueryClient();
  const { role } = useNovaRole();

  // Filters
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("All Departments");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Break modal
  const [breakDoctor, setBreakDoctor] = useState<DoctorRosterItem | null>(null);
  const [breakNote, setBreakNote] = useState("");

  // Queue Patient Modal
  const [queueModalDoctor, setQueueModalDoctor] = useState<DoctorRosterItem | null>(null);
  const isClerk = role === "Receptionist";
  const [patientSourceTab, setPatientSourceTab] = useState<"registered" | "appointment">(
    isClerk ? "appointment" : "registered"
  );
  const [modalPatientSearch, setModalPatientSearch] = useState("");

  // TRPC Queries
  const {
    data: presenceData,
    refetch: refetchPresence,
    isFetching,
  } = useQuery({
    ...trpc.doctor.listPresence.queryOptions(),
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });

  // Registered Patients Queue Query
  const { data: queue = [], refetch: refetchQueue } = useQuery({
    ...trpc.visit.queue.queryOptions(),
    refetchInterval: 15_000,
  });

  // Appointments Query
  const { data: appointments = [], refetch: refetchAppointments } = useQuery({
    ...trpc.appointment.list.queryOptions(),
    refetchInterval: 15_000,
  });

  const roster: DoctorRosterItem[] = useMemo(() => {
    return (presenceData?.roster as DoctorRosterItem[]) ?? [];
  }, [presenceData]);

  // Mutations
  const checkInMutation = useMutation(trpc.doctor.checkIn.mutationOptions());
  const checkOutMutation = useMutation(trpc.doctor.checkOut.mutationOptions());
  const updateStatusMutation = useMutation(trpc.doctor.updateStatus.mutationOptions());
  const assignRoomMutation = useMutation(trpc.doctor.assignRoom.mutationOptions());
  const updateTicketStatusMutation = useMutation(trpc.visit.updateTicketStatus.mutationOptions());
  const openVisitMutation = useMutation(trpc.visit.openVisit.mutationOptions());
  const updateAppointmentStatusMutation = useMutation(trpc.appointment.updateStatus.mutationOptions());
  const sendIntercomMutation = useMutation(trpc.doctor.sendIntercomAlert.mutationOptions());

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

  const handleOpenQueueModal = (doctor: DoctorRosterItem) => {
    setQueueModalDoctor(doctor);
    setPatientSourceTab(isClerk ? "appointment" : "registered");
    setModalPatientSearch("");
  };

  // Queue a registered waiting ticket to this doctor
  const handleQueueRegisteredPatient = async (ticket: any) => {
    if (!queueModalDoctor) return;
    try {
      await updateTicketStatusMutation.mutateAsync({
        ticketId: ticket.id,
        status: ticket.status === "urgent" ? "urgent" : "waiting",
      });

      sendIntercomMutation.mutateAsync({
        doctorId: queueModalDoctor.userId || queueModalDoctor.id,
        message: `Patient ${ticket.visit?.patient?.nameEn || "Patient"} (#${ticket.ticketNumber}) queued to your room by ${role}.`,
        urgency: ticket.status === "urgent" ? "emergency" : "routine",
      }).catch(() => {});

      queryClient.invalidateQueries({ queryKey: trpc.doctor.listPresence.queryKey() });
      queryClient.invalidateQueries({ queryKey: trpc.visit.queue.queryKey() });
      toast.success(
        `Patient ${ticket.visit?.patient?.nameEn || "Patient"} (#${ticket.ticketNumber}) queued to ${queueModalDoctor.name}!`
      );
      setQueueModalDoctor(null);
    } catch {
      toast.error("Failed to queue patient to doctor");
    }
  };

  // Queue an appointed patient to this doctor
  const handleQueueAppointedPatient = async (apt: any) => {
    if (!queueModalDoctor) return;
    try {
      // 1. Open visit ticket
      const res = await openVisitMutation.mutateAsync({
        patientId: apt.patientId,
        department: queueModalDoctor.department || "General OPD",
        type: "opd",
        channel: "walk_in",
      });

      // 2. Mark appointment confirmed/completed
      updateAppointmentStatusMutation.mutateAsync({
        id: apt.id,
        status: "confirmed",
      }).catch(() => {});

      // 3. Notify doctor
      sendIntercomMutation.mutateAsync({
        doctorId: queueModalDoctor.userId || queueModalDoctor.id,
        message: `Appointed patient ${apt.patient?.nameEn || "Patient"} checked in and queued to your room by ${role}.`,
        urgency: "routine",
      }).catch(() => {});

      queryClient.invalidateQueries({ queryKey: trpc.doctor.listPresence.queryKey() });
      queryClient.invalidateQueries({ queryKey: trpc.visit.queue.queryKey() });
      queryClient.invalidateQueries({ queryKey: trpc.appointment.list.queryKey() });

      toast.success(
        `Appointed patient ${apt.patient?.nameEn || "Patient"} queued to ${queueModalDoctor.name} (#${res.ticket.ticketNumber})!`
      );
      setQueueModalDoctor(null);
    } catch {
      toast.error("Failed to queue appointed patient");
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

  // Filtered registered queue for the modal
  const waitingQueuePatients = useMemo(() => {
    return queue.filter((item: any) => {
      const isWaiting = item.status === "waiting" || item.status === "urgent";
      if (!isWaiting) return false;
      if (modalPatientSearch.trim()) {
        const q = modalPatientSearch.toLowerCase();
        const p = item.visit?.patient || {};
        return (
          (p.nameEn || "").toLowerCase().includes(q) ||
          (p.healthId || "").toLowerCase().includes(q) ||
          (item.ticketNumber || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [queue, modalPatientSearch]);

  // Filtered appointments for the modal
  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt: any) => {
      if (apt.status === "completed" || apt.status === "cancelled") return false;
      if (modalPatientSearch.trim()) {
        const q = modalPatientSearch.toLowerCase();
        const p = apt.patient || {};
        return (
          (p.nameEn || "").toLowerCase().includes(q) ||
          (p.healthId || "").toLowerCase().includes(q) ||
          (apt.doctor || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [appointments, modalPatientSearch]);

  return (
    <PageShell
      title="Doctor Presence & Clinical Duty Roster"
      subtitle="Live Room Allocation, Duty Status & Outpatient Consultation Queues"
      action={
        <div className="flex items-center gap-2">
          <Link
            href={"/nova/reception/queue" as any}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 transition text-xs font-semibold shadow-xs"
          >
            <Activity size={13} className="text-teal-600" />
            <span>OPD Queue Board</span>
          </Link>
          <button
            onClick={() => {
              refetchPresence();
              refetchQueue();
              refetchAppointments();
            }}
            disabled={isFetching}
            className="flex items-center gap-1.5 p-1.5 text-slate-600 hover:text-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 transition cursor-pointer"
            title="Refresh doctor roster and queues"
          >
            <RefreshCw size={14} className={isFetching ? "animate-spin text-teal-600" : "text-slate-500"} />
          </button>
        </div>
      }
    >
      {/* ── 1. COMPACT STATUS STRIP (Matching Reception & Triage design) ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 mb-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs divide-x divide-slate-100 dark:divide-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse" />
            <span className="text-slate-500 font-medium">On Duty:</span>
            <span className="font-black text-slate-900 dark:text-white text-sm">
              {counts.available + counts.inConsult + counts.onBreak}
            </span>
            <span className="text-[11px] text-slate-400">/ {counts.total} Doctors</span>
          </div>

          <div className="pl-4 sm:pl-6 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-slate-500 font-medium">Available:</span>
            <span className="font-black text-emerald-600 text-sm">{counts.available}</span>
          </div>

          <div className="pl-4 sm:pl-6 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="text-slate-500 font-medium">Consulting:</span>
            <span className="font-black text-blue-600 text-sm">{counts.inConsult}</span>
          </div>

          <div className="pl-4 sm:pl-6 flex items-center gap-2 hidden md:flex">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-slate-500 font-medium">On Break:</span>
            <span className="font-bold text-amber-600 text-sm">{counts.onBreak}</span>
          </div>

          <div className="pl-4 sm:pl-6 flex items-center gap-2 hidden lg:flex">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
            <span className="text-slate-500 font-medium">Off Duty:</span>
            <span className="font-bold text-slate-600 dark:text-slate-300 text-sm">{counts.offDuty}</span>
          </div>
        </div>

        <div className="text-xs text-slate-400 font-medium flex items-center gap-2">
          <span>Active Station: <strong className="text-slate-700 dark:text-slate-300">{role}</strong></span>
        </div>
      </div>

      <div className="space-y-3">
        {/* ── 2. FILTER & SEARCH TOOLBAR (Clerk Pill Style) ── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs overflow-x-auto self-start sm:self-auto">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1 rounded-md font-semibold transition cursor-pointer ${
                statusFilter === "all"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              All ({counts.total})
            </button>

            <button
              onClick={() => setStatusFilter(statusFilter === "available" ? "all" : "available")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition cursor-pointer ${
                statusFilter === "available"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-emerald-600"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${statusFilter === "available" ? "bg-white" : "bg-emerald-500"}`} />
              <span>Available ({counts.available})</span>
            </button>

            <button
              onClick={() => setStatusFilter(statusFilter === "in-consultation" ? "all" : "in-consultation")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition cursor-pointer ${
                statusFilter === "in-consultation"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-blue-600"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${statusFilter === "in-consultation" ? "bg-white" : "bg-blue-500"}`} />
              <span>Consulting ({counts.inConsult})</span>
            </button>

            <button
              onClick={() => setStatusFilter(statusFilter === "on-break" ? "all" : "on-break")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition cursor-pointer ${
                statusFilter === "on-break"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-amber-600"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${statusFilter === "on-break" ? "bg-white" : "bg-amber-500"}`} />
              <span>On Break ({counts.onBreak})</span>
            </button>

            <button
              onClick={() => setStatusFilter(statusFilter === "off-duty" ? "all" : "off-duty")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition cursor-pointer ${
                statusFilter === "off-duty"
                  ? "bg-slate-700 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${statusFilter === "off-duty" ? "bg-white" : "bg-slate-400"}`} />
              <span>Off Duty ({counts.offDuty})</span>
            </button>
          </div>

          {/* Search & Department Dropdown */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-60">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search doctor, room, dept..."
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

            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-hidden focus:border-teal-500 cursor-pointer font-medium shadow-xs"
            >
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── 3. CLEAN, PROFESSIONAL DOCTOR ROSTER TABLE ── */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          {filteredRoster.length === 0 ? (
            <div className="py-14 px-6 text-center text-slate-400">
              <Users size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">No doctors match this filter</p>
              <p className="text-xs text-slate-400 mt-0.5">Try clearing your search query or selecting a different status filter.</p>
              <button
                onClick={() => {
                  setSearch("");
                  setSelectedDept("All Departments");
                  setStatusFilter("all");
                }}
                className="mt-3 px-3 py-1.5 text-xs font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400 cursor-pointer"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Doctor</th>
                    <th className="py-3 px-3">Room Allocation</th>
                    <th className="py-3 px-3">Shift & Hours</th>
                    <th className="py-3 px-3">Duty Status</th>
                    <th className="py-3 px-3 text-center">Consultation Queue</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredRoster.map((doc) => {
                    const statusInfo = STATUS_CONFIG[doc.status] || STATUS_CONFIG["off-duty"];

                    return (
                      <tr
                        key={doc.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                      >
                        {/* 1. Doctor Profile */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <span className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 flex items-center justify-center shrink-0">
                              <Stethoscope size={15} />
                            </span>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 dark:text-white truncate">
                                {doc.name}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                {doc.department} {doc.title ? `· ${doc.title}` : ""}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Room Allocation */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <DoorOpen size={13} className="text-slate-400 shrink-0" />
                            <select
                              value={doc.roomNumber}
                              onChange={(e) => handleRoomChange(doc, e.target.value)}
                              className="bg-transparent border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs text-slate-800 dark:text-slate-200 hover:border-teal-500 focus:outline-hidden focus:border-teal-500 cursor-pointer font-medium max-w-[190px] truncate transition"
                              title="Reassign room"
                            >
                              {AVAILABLE_ROOMS.map((r) => (
                                <option key={r} value={r} className="bg-white dark:bg-slate-900">
                                  {r.split("—")[0].trim()} ({r.split("—")[1]?.trim() || ""})
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>

                        {/* 3. Shift */}
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {doc.shift.start} – {doc.shift.end}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {doc.shift.type}
                          </div>
                        </td>

                        {/* 4. Duty Status & Activity */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${statusInfo.dot}`} />
                            <select
                              value={doc.status}
                              onChange={(e) => handleStatusChange(doc, e.target.value as DoctorStatus)}
                              className={`bg-transparent border border-slate-200 dark:border-slate-700 rounded-md px-2 py-0.5 text-xs font-semibold cursor-pointer focus:outline-hidden focus:border-teal-500 ${statusInfo.text}`}
                            >
                              <option value="available" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Available</option>
                              <option value="in-consultation" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">In Consultation</option>
                              <option value="on-break" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">On Break</option>
                              <option value="off-duty" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Off Duty</option>
                            </select>
                          </div>

                          {/* Secondary context */}
                          {doc.status === "in-consultation" && doc.activeTicketNumber && (
                            <div className="text-[11px] text-blue-600 dark:text-blue-400 mt-1 pl-4 truncate font-medium">
                              Active: #{doc.activeTicketNumber} {doc.activePatientName ? `(${doc.activePatientName})` : ""}
                            </div>
                          )}
                          {doc.status === "on-break" && doc.breakNote && (
                            <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 pl-4 truncate font-medium">
                              Break: {doc.breakNote}
                            </div>
                          )}
                        </td>

                        {/* 5. Consultation Queue & Avg Duration */}
                        <td className="py-3 px-3 text-center">
                          {doc.waitingCount > 0 ? (
                            <div>
                              <span className="font-bold text-teal-700 dark:text-teal-400">
                                {doc.waitingCount} waiting
                              </span>
                              <span
                                className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium"
                                title={`Average consultation duration: ${doc.avgConsultMinutes || 12} min`}
                              >
                                Avg: {doc.avgConsultMinutes || 12} min
                              </span>
                            </div>
                          ) : (
                            <div>
                              <span className="text-slate-400 dark:text-slate-500 block">0 waiting</span>
                              <span
                                className="text-[11px] text-slate-400 dark:text-slate-500 block"
                                title={`Average consultation duration: ${doc.avgConsultMinutes || 12} min`}
                              >
                                Avg: {doc.avgConsultMinutes || 12} min
                              </span>
                            </div>
                          )}
                        </td>

                        {/* 6. Action Button: Opens Direct Queue Modal (No redirect to register!) */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end">
                            <button
                              type="button"
                              onClick={() => handleOpenQueueModal(doc)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                              title={
                                isClerk
                                  ? `Queue appointed patient to ${doc.name}`
                                  : `Queue registered or appointed patient to ${doc.name}`
                              }
                            >
                              <span>Queue</span>
                              <ArrowRight size={12} />
                            </button>
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

      {/* ── 4. DIRECT QUEUE PATIENT MODAL (Role-Governed: No Registration for Triage!) ── */}
      {queueModalDoctor && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full shadow-2xl overflow-hidden my-6">
            {/* Modal Header */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
                  <Stethoscope size={20} />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Queue Patient to {queueModalDoctor.name}
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded font-black bg-teal-100 text-teal-800 border border-teal-200">
                      {queueModalDoctor.roomNumber.split("—")[0].trim()}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {queueModalDoctor.department} • Duty: {queueModalDoctor.status}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setQueueModalDoctor(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Controls & Role Tabs */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3">
              {/* Role Context Notification */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <UserCheck size={14} className="text-teal-600" />
                  <span>
                    Logged in as: <strong>{role}</strong>
                  </span>
                </div>
                {isClerk ? (
                  <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                    Clerk Mode: Appointed Patients Only
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                    Triage Mode: Registered & Appointed Patients
                  </span>
                )}
              </div>

              {/* Source Tabs (Triage Nurse sees both; Clerk is restricted to Appointments) */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
                  {!isClerk && (
                    <button
                      type="button"
                      onClick={() => setPatientSourceTab("registered")}
                      className={`px-3 py-1.5 rounded-md font-bold transition cursor-pointer ${
                        patientSourceTab === "registered"
                          ? "bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                      }`}
                    >
                      Registered Patients ({waitingQueuePatients.length})
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setPatientSourceTab("appointment")}
                    className={`px-3 py-1.5 rounded-md font-bold transition cursor-pointer ${
                      patientSourceTab === "appointment"
                        ? "bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    Appointed Patients ({filteredAppointments.length})
                  </button>
                </div>

                {/* Quick Search */}
                <div className="relative flex-1 sm:w-56">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={modalPatientSearch}
                    onChange={(e) => setModalPatientSearch(e.target.value)}
                    placeholder="Filter by name, ticket, health ID..."
                    className="w-full pl-8 pr-3 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:border-teal-500"
                  />
                </div>
              </div>
            </div>

            {/* Modal Body: Patient List */}
            <div className="p-4 max-h-[380px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {/* TAB 1: REGISTERED PATIENTS WAITING IN QUEUE */}
              {patientSourceTab === "registered" && !isClerk && (
                waitingQueuePatients.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <Users size={28} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      No registered patients currently waiting for triage
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Check-in patients from front reception will appear here.
                    </p>
                  </div>
                ) : (
                  waitingQueuePatients.map((item: any) => {
                    const patient = item.visit?.patient || {};
                    const isUrgent = item.status === "urgent";

                    return (
                      <div
                        key={item.id}
                        className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 px-2 rounded-lg transition"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`px-2 py-0.5 rounded-lg font-mono font-black text-xs ${
                              isUrgent
                                ? "bg-rose-100 text-rose-800 border border-rose-200"
                                : "bg-teal-100 text-teal-800 border border-teal-200"
                            }`}
                          >
                            #{item.ticketNumber}
                          </span>
                          <div>
                            <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{patient.nameEn || "Patient"}</span>
                              {isUrgent && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded font-black bg-rose-100 text-rose-700">
                                  URGENT
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                              <span>ID: {patient.healthId}</span>
                              <span>•</span>
                              <span>{patient.sex}</span>
                              {item.waitMinutes && (
                                <>
                                  <span>•</span>
                                  <span>{item.waitMinutes}m wait</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleQueueRegisteredPatient(item)}
                          disabled={updateTicketStatusMutation.isPending}
                          className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 size={13} />
                          <span>Assign to Dr. {queueModalDoctor.name.split(" ")[1] || queueModalDoctor.name}</span>
                        </button>
                      </div>
                    );
                  })
                )
              )}

              {/* TAB 2: APPOINTMENT PATIENTS */}
              {patientSourceTab === "appointment" && (
                filteredAppointments.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <Calendar size={28} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      No upcoming appointments found
                    </p>
                    {isClerk ? (
                      <div className="mt-3">
                        <p className="text-[11px] text-slate-400">
                          As a clerk, walk-in patients without appointments must be checked in at Patient Intake.
                        </p>
                        <Link
                          href={"/nova/reception/register" as any}
                          className="inline-block mt-2 px-3 py-1.5 text-xs font-bold text-teal-600 border border-teal-200 rounded-lg hover:bg-teal-50"
                        >
                          Open Patient Intake Desk →
                        </Link>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        You can still queue registered walk-in patients from the "Registered Patients" tab above.
                      </p>
                    )}
                  </div>
                ) : (
                  filteredAppointments.map((apt: any) => {
                    const patient = apt.patient || {};

                    return (
                      <div
                        key={apt.id}
                        className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 px-2 rounded-lg transition"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center justify-center shrink-0">
                            <Calendar size={15} />
                          </span>
                          <div>
                            <div className="font-bold text-xs text-slate-900 dark:text-white">
                              {patient.nameEn || "Patient"}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                              <span>ID: {patient.healthId}</span>
                              <span>•</span>
                              <span>{apt.date} at {apt.time}</span>
                              <span>•</span>
                              <span className="capitalize">{apt.dept}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleQueueAppointedPatient(apt)}
                          disabled={openVisitMutation.isPending}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 size={13} />
                          <span>Check In & Queue</span>
                        </button>
                      </div>
                    );
                  })
                )
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-500">
                Selected Doctor: <strong>{queueModalDoctor.name}</strong> ({queueModalDoctor.roomNumber.split("—")[0].trim()})
              </span>
              <button
                type="button"
                onClick={() => setQueueModalDoctor(null)}
                className="px-3.5 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. SLIM BREAK NOTE MODAL ── */}
      {breakDoctor && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
                <Coffee size={16} />
                <span>Set {breakDoctor.name} On Break</span>
              </div>
              <button
                onClick={() => setBreakDoctor(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X size={15} />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select reason or enter expected return note for reception desk:
            </p>

            <input
              type="text"
              value={breakNote}
              onChange={(e) => setBreakNote(e.target.value)}
              placeholder="e.g. Ward rounds, Lunch break, Meeting..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:border-amber-500 font-medium"
              autoFocus
            />

            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {["Ward Rounds", "Lunch (30m)", "Staff Meeting", "Emergency Consult"].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setBreakNote(tag)}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-amber-100 dark:hover:bg-amber-950 font-medium transition cursor-pointer"
                >
                  {tag}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setBreakDoctor(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBreak}
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-500 text-white transition shadow-xs cursor-pointer"
              >
                Set On Break
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
