"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { toast } from "sonner";
import {
  PageShell,
  Card,
  StatusBadge,
  inputCls,
  btnPrimary,
  btnSecondary,
} from "@/components/nova/nova-ui";
import {
  Stethoscope,
  Activity,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  UserCheck,
  UserX,
  Coffee,
  AlertCircle,
  Wifi,
  WifiOff,
  Search,
  Filter,
  RefreshCw,
  BellRing,
  ArrowRight,
  ShieldAlert,
  Send,
  X,
  Users,
  Building2,
  ChevronDown,
  Sparkles,
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

const LOCAL_STORAGE_CACHE_KEY = "nova_reception_doctor_presence_cache";
const OFFLINE_QUEUE_KEY = "nova_reception_presence_offline_queue";

const AVAILABLE_ROOMS = [
  "Room 101 — Triage & Rapid Assessment",
  "Room 102 — General OPD Clinic A",
  "Room 103 — General OPD Clinic B",
  "Room 104 — Internal Medicine Clinic",
  "Room 110 — Surgical Consultation",
  "Room 115 — Ultrasound & Imaging",
  "Room 205 — Pediatrics & Child Health",
  "Room 208 — Women's Health & OB/GYN",
  "Room 302 — Chronic Disease Clinic",
];

const DEPARTMENTS = [
  "All",
  "General OPD",
  "Internal Medicine",
  "Pediatrics",
  "General Surgery",
  "OB/GYN",
  "Radiology & Imaging",
];

export default function DoctorPresenceReceptionPage() {
  const queryClient = useQueryClient();

  // 1. Online / Offline State Engine
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [offlineQueueCount, setOfflineQueueCount] = useState<number>(0);

  // 2. Local State & Filters
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("All");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // 3. Modals State
  const [intercomDoctor, setIntercomDoctor] = useState<DoctorRosterItem | null>(null);
  const [intercomMsg, setIntercomMsg] = useState("");
  const [intercomUrgency, setIntercomUrgency] = useState<"routine" | "priority" | "emergency">("routine");

  const [breakDoctor, setBreakDoctor] = useState<DoctorRosterItem | null>(null);
  const [breakNoteInput, setBreakNoteInput] = useState("");

  const [roomChangeDoctor, setRoomChangeDoctor] = useState<DoctorRosterItem | null>(null);
  const [selectedRoomInput, setSelectedRoomInput] = useState("");

  // Sync Offline Queue count on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(OFFLINE_QUEUE_KEY);
      if (stored) {
        const queue = JSON.parse(stored);
        setOfflineQueueCount(Array.isArray(queue) ? queue.length : 0);
      }
    } catch {}
  }, []);

  // 4. TRPC Queries & Mutations
  const {
    data: presenceData,
    refetch,
    isFetching,
  } = useQuery({
    ...trpc.doctor.listPresence.queryOptions(),
    refetchInterval: 12_000, // Poll every 12s when active
    refetchOnWindowFocus: true,
  });

  // Local mirror state for instant optimistic updates and offline operation
  const [roster, setRoster] = useState<DoctorRosterItem[]>([]);

  // Update local state and cache whenever server returns data
  useEffect(() => {
    if (presenceData?.roster) {
      setRoster(presenceData.roster as DoctorRosterItem[]);
      try {
        localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify(presenceData.roster));
      } catch {}
    } else {
      // Try to load from offline cache if server is unreachable
      try {
        const cached = localStorage.getItem(LOCAL_STORAGE_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setRoster(parsed);
          }
        }
      } catch {}
    }
  }, [presenceData]);

  // Mutations
  const checkInMutation = useMutation(trpc.doctor.checkIn.mutationOptions());
  const checkOutMutation = useMutation(trpc.doctor.checkOut.mutationOptions());
  const updateStatusMutation = useMutation(trpc.doctor.updateStatus.mutationOptions());
  const assignRoomMutation = useMutation(trpc.doctor.assignRoom.mutationOptions());
  const intercomMutation = useMutation(trpc.doctor.sendIntercomAlert.mutationOptions());

  // Replay Offline Queue when back online
  const replayOfflineQueue = useCallback(async () => {
    try {
      const stored = localStorage.getItem(OFFLINE_QUEUE_KEY);
      if (!stored) return;
      const queue = JSON.parse(stored);
      if (!Array.isArray(queue) || queue.length === 0) return;

      toast.info(`Syncing ${queue.length} offline reception actions with cloud...`);

      for (const action of queue) {
        if (action.type === "checkIn") {
          await checkInMutation.mutateAsync({
            doctorId: action.doctorId,
            roomNumber: action.roomNumber,
            method: "reception_override",
          });
        } else if (action.type === "checkOut") {
          await checkOutMutation.mutateAsync({
            doctorId: action.doctorId,
            method: "reception_override",
          });
        } else if (action.type === "updateStatus") {
          await updateStatusMutation.mutateAsync({
            doctorId: action.doctorId,
            status: action.status,
            breakNote: action.breakNote,
            method: "reception_override",
          });
        } else if (action.type === "assignRoom") {
          await assignRoomMutation.mutateAsync({
            doctorId: action.doctorId,
            roomNumber: action.roomNumber,
          });
        }
      }

      localStorage.removeItem(OFFLINE_QUEUE_KEY);
      setOfflineQueueCount(0);
      refetch();
      toast.success("All offline check-ins successfully synced with server!");
    } catch (err) {
      console.error("Offline replay error:", err);
    }
  }, [checkInMutation, checkOutMutation, updateStatusMutation, assignRoomMutation, refetch]);

  // Network Event Listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Network connection restored! Reconnecting to live roster...");
      replayOfflineQueue();
      refetch();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("Network connection lost. Offline presence mode activated.", {
        description: "All reception check-ins and room updates will be saved locally.",
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [replayOfflineQueue, refetch]);

  // Queue an action locally if offline
  const enqueueOfflineAction = (action: any) => {
    try {
      const stored = localStorage.getItem(OFFLINE_QUEUE_KEY);
      const queue = stored ? JSON.parse(stored) : [];
      queue.push({ ...action, timestamp: new Date().toISOString() });
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      setOfflineQueueCount(queue.length);
    } catch {}
  };

  // 5. Reception Actions Handlers
  const handleCheckIn = async (doctor: DoctorRosterItem) => {
    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Optimistic UI update
    setRoster((prev) =>
      prev.map((d) =>
        d.userId === doctor.userId || d.id === doctor.id
          ? {
              ...d,
              status: "available",
              checkInTime: nowTime,
              checkInMethod: "reception_override",
            }
          : d
      )
    );

    if (!isOnline) {
      enqueueOfflineAction({
        type: "checkIn",
        doctorId: doctor.userId || doctor.id,
        roomNumber: doctor.roomNumber,
      });
      toast.info(`Checked in ${doctor.name} (Saved Offline)`, {
        description: "Will sync with cloud once reconnected.",
      });
      return;
    }

    try {
      await checkInMutation.mutateAsync({
        doctorId: doctor.userId || doctor.id,
        roomNumber: doctor.roomNumber,
        method: "reception_override",
      });
      queryClient.invalidateQueries({ queryKey: trpc.doctor.listPresence.queryKey() });
      toast.success(`${doctor.name} checked in! Ready for patients at ${doctor.roomNumber.split("—")[0].trim()}`);
    } catch {
      toast.error("Failed to check in doctor on server");
    }
  };

  const handleCheckOut = async (doctor: DoctorRosterItem) => {
    setRoster((prev) =>
      prev.map((d) =>
        d.userId === doctor.userId || d.id === doctor.id
          ? {
              ...d,
              status: "off-duty",
              activeTicketNumber: undefined,
              activePatientName: undefined,
            }
          : d
      )
    );

    if (!isOnline) {
      enqueueOfflineAction({
        type: "checkOut",
        doctorId: doctor.userId || doctor.id,
      });
      toast.info(`${doctor.name} marked Off-Duty (Saved Offline)`);
      return;
    }

    try {
      await checkOutMutation.mutateAsync({
        doctorId: doctor.userId || doctor.id,
        method: "reception_override",
      });
      queryClient.invalidateQueries({ queryKey: trpc.doctor.listPresence.queryKey() });
      toast.success(`${doctor.name} signed out of clinic`);
    } catch {
      toast.error("Failed to update status on server");
    }
  };

  const handleSetAvailable = async (doctor: DoctorRosterItem) => {
    setRoster((prev) =>
      prev.map((d) =>
        d.userId === doctor.userId || d.id === doctor.id
          ? {
              ...d,
              status: "available",
              breakNote: undefined,
            }
          : d
      )
    );

    if (!isOnline) {
      enqueueOfflineAction({
        type: "updateStatus",
        doctorId: doctor.userId || doctor.id,
        status: "available",
      });
      toast.info(`${doctor.name} marked Available (Saved Offline)`);
      return;
    }

    try {
      await updateStatusMutation.mutateAsync({
        doctorId: doctor.userId || doctor.id,
        status: "available",
        breakNote: "",
        method: "reception_override",
      });
      queryClient.invalidateQueries({ queryKey: trpc.doctor.listPresence.queryKey() });
      toast.success(`${doctor.name} is back in room and ready for next patient!`);
    } catch {
      toast.error("Failed to update status on server");
    }
  };

  const handleSaveBreak = async () => {
    if (!breakDoctor) return;
    const note = breakNoteInput.trim() || "Break / Inpatient Ward Rounds";

    setRoster((prev) =>
      prev.map((d) =>
        d.userId === breakDoctor.userId || d.id === breakDoctor.id
          ? {
              ...d,
              status: "on-break",
              breakNote: note,
            }
          : d
      )
    );

    if (!isOnline) {
      enqueueOfflineAction({
        type: "updateStatus",
        doctorId: breakDoctor.userId || breakDoctor.id,
        status: "on-break",
        breakNote: note,
      });
      toast.info(`${breakDoctor.name} set to break (Saved Offline)`);
      setBreakDoctor(null);
      return;
    }

    try {
      await updateStatusMutation.mutateAsync({
        doctorId: breakDoctor.userId || breakDoctor.id,
        status: "on-break",
        breakNote: note,
        method: "reception_override",
      });
      queryClient.invalidateQueries({ queryKey: trpc.doctor.listPresence.queryKey() });
      toast.success(`${breakDoctor.name} marked On Break / Rounds`);
      setBreakDoctor(null);
    } catch {
      toast.error("Failed to update break status on server");
    }
  };

  const handleSaveRoomChange = async () => {
    if (!roomChangeDoctor || !selectedRoomInput) return;

    setRoster((prev) =>
      prev.map((d) =>
        d.userId === roomChangeDoctor.userId || d.id === roomChangeDoctor.id
          ? {
              ...d,
              roomNumber: selectedRoomInput,
            }
          : d
      )
    );

    if (!isOnline) {
      enqueueOfflineAction({
        type: "assignRoom",
        doctorId: roomChangeDoctor.userId || roomChangeDoctor.id,
        roomNumber: selectedRoomInput,
      });
      toast.info(`Room updated to ${selectedRoomInput.split("—")[0].trim()} (Saved Offline)`);
      setRoomChangeDoctor(null);
      return;
    }

    try {
      await assignRoomMutation.mutateAsync({
        doctorId: roomChangeDoctor.userId || roomChangeDoctor.id,
        roomNumber: selectedRoomInput,
      });
      queryClient.invalidateQueries({ queryKey: trpc.doctor.listPresence.queryKey() });
      toast.success(`${roomChangeDoctor.name} reassigned to ${selectedRoomInput}`);
      setRoomChangeDoctor(null);
    } catch {
      toast.error("Failed to assign room on server");
    }
  };

  const handleSendIntercom = async () => {
    if (!intercomDoctor || !intercomMsg.trim()) return;

    try {
      await intercomMutation.mutateAsync({
        doctorId: intercomDoctor.userId || intercomDoctor.id,
        message: intercomMsg.trim(),
        urgency: intercomUrgency,
      });
      toast.success(`Intercom alert dispatched to ${intercomDoctor.name}!`, {
        description: intercomMsg,
      });
      setIntercomDoctor(null);
      setIntercomMsg("");
    } catch {
      toast.error("Failed to send intercom message");
    }
  };

  // 6. Filtered List
  const filteredRoster = useMemo(() => {
    return roster.filter((d) => {
      // Dept filter
      if (selectedDept !== "All" && d.department !== selectedDept) {
        return false;
      }
      // Status filter
      if (statusFilter !== "all" && d.status !== statusFilter) {
        return false;
      }
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = d.name.toLowerCase().includes(q);
        const matchRoom = d.roomNumber.toLowerCase().includes(q);
        const matchDept = d.department.toLowerCase().includes(q);
        const matchTitle = d.title.toLowerCase().includes(q);
        if (!matchName && !matchRoom && !matchDept && !matchTitle) {
          return false;
        }
      }
      return true;
    });
  }, [roster, selectedDept, statusFilter, search]);

  // Statistics Summary
  const stats = useMemo(() => {
    const total = roster.length;
    const available = roster.filter((r) => r.status === "available").length;
    const inConsultation = roster.filter((r) => r.status === "in-consultation").length;
    const onBreak = roster.filter((r) => r.status === "on-break").length;
    const expected = roster.filter((r) => r.status === "expected").length;
    const offDuty = roster.filter((r) => r.status === "off-duty").length;
    const totalWaiting = roster.reduce((acc, curr) => acc + curr.waitingCount, 0);

    return {
      total,
      available,
      inConsultation,
      onBreak,
      expected,
      offDuty,
      totalWaiting,
      activeOnDuty: available + inConsultation + onBreak,
    };
  }, [roster]);

  return (
    <PageShell
      title="Doctor Presence & Clinical Duty Roster"
      subtitle="Front-desk OPD visibility: Real-time doctor availability, room allocations, live queues, and offline check-in control."
      action={
        <div className="flex items-center gap-2.5">
          {/* Online / Offline Status Badge */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold shadow-2xs ${
              isOnline
                ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                : "bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700 animate-pulse"
            }`}
            title={
              isOnline
                ? "System connected to central hospital server"
                : "Operating in offline local-storage mode"
            }
          >
            {isOnline ? <Wifi size={14} className="text-emerald-600" /> : <WifiOff size={14} className="text-amber-600" />}
            <span>{isOnline ? "Cloud Synced" : "Offline Mode"}</span>
            {offlineQueueCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                {offlineQueueCount} queued
              </span>
            )}
          </div>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs"
            title="Refresh doctor roster and queues"
          >
            <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>

          <Link
            href={"/nova/reception/queue" as any}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-nova-primary hover:bg-nova-primary-hover text-white text-xs font-bold rounded-lg transition-all shadow-xs"
          >
            <Activity size={13} />
            <span>OPD Queue Board →</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {/* ================= 1. CLINICAL METRICS OVERVIEW ================= */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Card 1: Total Scheduled */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Rostered Today</span>
              <Users size={14} className="text-slate-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-800 dark:text-slate-100">{stats.total}</span>
              <span className="text-[11px] text-slate-400">Doctors</span>
            </div>
          </div>

          {/* Card 2: Ready / Available */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 text-xs font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Ready in Room
              </span>
              <UserCheck size={14} />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{stats.available}</span>
              <span className="text-[11px] text-emerald-600/80">Available</span>
            </div>
          </div>

          {/* Card 3: In Consultation */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 text-xs font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                In Consultation
              </span>
              <Stethoscope size={14} />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-blue-700 dark:text-blue-300">{stats.inConsultation}</span>
              <span className="text-[11px] text-blue-600/80">Treating</span>
            </div>
          </div>

          {/* Card 4: On Break / Rounds */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 text-xs font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Rounds / Break
              </span>
              <Coffee size={14} />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-700 dark:text-amber-300">{stats.onBreak}</span>
              <span className="text-[11px] text-amber-600/80">Stepped Out</span>
            </div>
          </div>

          {/* Card 5: Expected / Pending */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                Expected Soon
              </span>
              <Clock size={14} />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-700 dark:text-slate-200">{stats.expected}</span>
              <span className="text-[11px] text-slate-400">Not Checked In</span>
            </div>
          </div>

          {/* Card 6: Total Waiting Patients */}
          <div className="bg-gradient-to-br from-teal-500/10 via-teal-600/5 to-transparent border border-teal-200 dark:border-teal-800/60 rounded-xl p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-teal-700 dark:text-teal-300 text-xs font-medium">
              <span>OPD Waiting</span>
              <Activity size={14} />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-teal-800 dark:text-teal-200">{stats.totalWaiting}</span>
              <span className="text-[11px] text-teal-600">In Line</span>
            </div>
          </div>
        </div>

        {/* ================= 2. SEARCH, DEPARTMENT & STATUS CONTROLS ================= */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by doctor name, room number (e.g. Room 102), department, or title..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-nova-primary focus:ring-1 focus:ring-nova-primary transition-colors"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Quick Status Filter Buttons */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 shrink-0">
              {[
                { id: "all", label: "All Rostered", count: stats.total },
                { id: "available", label: "Ready in Room", count: stats.available },
                { id: "in-consultation", label: "In Consultation", count: stats.inConsultation },
                { id: "on-break", label: "On Break / Rounds", count: stats.onBreak },
                { id: "expected", label: "Expected", count: stats.expected },
                { id: "off-duty", label: "Off Duty", count: stats.offDuty },
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setStatusFilter(btn.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    statusFilter === btn.id
                      ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-2xs"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <span>{btn.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      statusFilter === btn.id
                        ? "bg-white/20 dark:bg-slate-900/20 text-white dark:text-slate-900"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    {btn.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Department Pills */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto text-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
              <Filter size={12} /> Specialty:
            </span>
            {DEPARTMENTS.map((dept) => (
              <button
                key={dept}
                onClick={() => setSelectedDept(dept)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors shrink-0 ${
                  selectedDept === dept
                    ? "bg-nova-primary text-white font-semibold shadow-2xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {dept}
              </button>
            ))}
          </div>
        </div>

        {/* ================= 3. DOCTOR PRESENCE GRID ================= */}
        {filteredRoster.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center">
            <Stethoscope size={36} className="mx-auto text-slate-400 mb-3" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No doctors match your search or filter</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Try selecting "All" departments, clearing your search query, or checking the complete duty roster.
            </p>
            <button
              onClick={() => {
                setSearch("");
                setSelectedDept("All");
                setStatusFilter("all");
              }}
              className="mt-4 px-4 py-2 text-xs font-semibold text-nova-primary bg-nova-subtle rounded-lg hover:underline"
            >
              Reset all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredRoster.map((doc) => {
              const isAvailable = doc.status === "available";
              const isInConsult = doc.status === "in-consultation";
              const isOnBreak = doc.status === "on-break";
              const isExpected = doc.status === "expected";
              const isOffDuty = doc.status === "off-duty";

              const roomShort = doc.roomNumber.split("—")[0].trim();
              const roomDesc = doc.roomNumber.split("—")[1]?.trim() || doc.department;

              return (
                <div
                  key={doc.id}
                  className={`bg-white dark:bg-slate-900 rounded-2xl border transition-all duration-200 shadow-xs flex flex-col justify-between overflow-hidden relative ${
                    isAvailable
                      ? "border-emerald-200 dark:border-emerald-800/80 hover:shadow-md"
                      : isInConsult
                      ? "border-blue-200 dark:border-blue-800/80 hover:shadow-md"
                      : isOnBreak
                      ? "border-amber-200 dark:border-amber-800/80 hover:shadow-md"
                      : "border-slate-200 dark:border-slate-800 opacity-90"
                  }`}
                >
                  {/* Card Top Banner with Status Indicator */}
                  <div
                    className={`px-4 py-2.5 border-b flex items-center justify-between text-xs font-semibold ${
                      isAvailable
                        ? "bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300"
                        : isInConsult
                        ? "bg-blue-50/70 dark:bg-blue-950/40 border-blue-100 dark:border-blue-900/60 text-blue-800 dark:text-blue-300"
                        : isOnBreak
                        ? "bg-amber-50/70 dark:bg-amber-950/40 border-amber-100 dark:border-amber-900/60 text-amber-800 dark:text-amber-300"
                        : isExpected
                        ? "bg-slate-100/70 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                        : "bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-500"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          isAvailable
                            ? "bg-emerald-500 animate-pulse"
                            : isInConsult
                            ? "bg-blue-500"
                            : isOnBreak
                            ? "bg-amber-500"
                            : isExpected
                            ? "bg-slate-400"
                            : "bg-slate-300"
                        }`}
                      />
                      <span className="font-bold">
                        {isAvailable
                          ? "READY IN ROOM"
                          : isInConsult
                          ? "IN CONSULTATION"
                          : isOnBreak
                          ? "ON BREAK / ROUNDS"
                          : isExpected
                          ? "EXPECTED (NOT ARRIVED)"
                          : "OFF DUTY"}
                      </span>
                    </div>

                    {/* Room Tag with 1-click Change */}
                    <button
                      onClick={() => {
                        setRoomChangeDoctor(doc);
                        setSelectedRoomInput(doc.roomNumber);
                      }}
                      className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-200 hover:text-nova-primary hover:underline"
                      title="Click to reassign room"
                    >
                      <MapPin size={12} className="text-nova-primary shrink-0" />
                      <span>{roomShort}</span>
                      <ChevronDown size={11} className="text-slate-400" />
                    </button>
                  </div>

                  {/* Doctor Info Section */}
                  <div className="p-4 space-y-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-700 dark:from-slate-700 dark:to-slate-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs border border-white/10">
                          {doc.name
                            .replace("Dr.", "")
                            .trim()
                            .split(" ")
                            .map((p) => p[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>

                        <div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            <span>{doc.name}</span>
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            {doc.title || doc.department}
                          </p>
                          <span className="inline-block mt-0.5 px-2 py-0.2 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {doc.department}
                          </span>
                        </div>
                      </div>

                      {/* Direct Phone / Intercom trigger */}
                      <button
                        onClick={() => {
                          setIntercomDoctor(doc);
                          setIntercomMsg("");
                          setIntercomUrgency("routine");
                        }}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-nova-primary hover:text-nova-primary text-slate-500 transition-colors shadow-2xs"
                        title={`Send direct intercom alert to ${doc.name}`}
                      >
                        <BellRing size={15} />
                      </button>
                    </div>

                    {/* Room Details & Shift Hours */}
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">Assigned Location:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200 text-right truncate max-w-[200px]">
                          {doc.roomNumber}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">Scheduled Shift:</span>
                        <span className="font-medium text-slate-600 dark:text-slate-300">
                          {doc.shift.start} – {doc.shift.end} ({doc.shift.type})
                        </span>
                      </div>

                      {doc.checkInTime && (
                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                          <span className="text-[11px] text-slate-400">Check-in Logged:</span>
                          <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 size={11} /> {doc.checkInTime}
                            {doc.checkInMethod === "self_checkin"
                              ? " (Mobile/Self)"
                              : " (Reception)"}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Status Highlights */}
                    {isInConsult && doc.activeTicketNumber && (
                      <div className="p-2.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-xs flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                            Currently Treating
                          </p>
                          <p className="font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                            Ticket #{doc.activeTicketNumber} — {doc.activePatientName || "Patient"}
                          </p>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-blue-200/60 dark:bg-blue-800/60 text-blue-800 dark:text-blue-200 text-[10px] font-bold">
                          In Room
                        </span>
                      </div>
                    )}

                    {isOnBreak && doc.breakNote && (
                      <div className="p-2.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs">
                        <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-bold text-[11px]">
                          <Coffee size={13} />
                          <span>Status Note:</span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-200 mt-1 text-[11px]">
                          {doc.breakNote}
                        </p>
                      </div>
                    )}

                    {/* Workload & Queue Counter */}
                    <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Waiting</span>
                        <span className="text-sm font-black text-slate-800 dark:text-slate-200">{doc.waitingCount}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Treated Today</span>
                        <span className="text-sm font-black text-slate-800 dark:text-slate-200">{doc.completedTodayCount}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Est. Wait</span>
                        <span className="text-sm font-black text-teal-600 dark:text-teal-400">
                          {doc.waitingCount === 0 ? "0m" : `~${doc.estimatedWaitMinutes}m`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom: Reception 1-Click Action Bar */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    {/* Action 1: Check-in / Out / Back toggle */}
                    {isExpected || isOffDuty ? (
                      <button
                        onClick={() => handleCheckIn(doc)}
                        className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs"
                      >
                        <UserCheck size={14} />
                        <span>Check In Doctor</span>
                      </button>
                    ) : isOnBreak ? (
                      <button
                        onClick={() => handleSetAvailable(doc)}
                        className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs"
                      >
                        <CheckCircle2 size={14} />
                        <span>Back in Room</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 flex-1">
                        <button
                          onClick={() => {
                            setBreakDoctor(doc);
                            setBreakNoteInput("");
                          }}
                          className="flex-1 py-1.5 px-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1 shadow-2xs"
                        >
                          <Coffee size={12} />
                          <span>Rounds / Break</span>
                        </button>
                        <button
                          onClick={() => handleCheckOut(doc)}
                          className="py-1.5 px-2.5 bg-slate-100 hover:bg-red-50 hover:text-red-700 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-semibold transition border border-slate-200 dark:border-slate-700 shadow-2xs"
                          title="Sign doctor out for the day"
                        >
                          <UserX size={13} />
                        </button>
                      </div>
                    )}

                    {/* Action 2: Route Patient Directly */}
                    <Link
                      href={`/nova/reception/register?targetDoctor=${encodeURIComponent(doc.name)}&targetRoom=${encodeURIComponent(roomShort)}` as any}
                      className="py-1.5 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-nova-primary text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs hover:text-nova-primary"
                      title="Register or assign waiting patient to this doctor"
                    >
                      <span>Queue Patient</span>
                      <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================= MODAL 1: TAKE BREAK / WARD ROUNDS ================= */}
      {breakDoctor && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
                <Coffee size={18} />
                <span>Set Doctor on Break or Ward Rounds</span>
              </div>
              <button onClick={() => setBreakDoctor(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Marking <strong>{breakDoctor.name}</strong> as stepped out of <strong>{breakDoctor.roomNumber.split("—")[0].trim()}</strong>.
                Reception will inform waiting patients of estimated return.
              </p>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Reason or Expected Return Note:
                </label>
                <input
                  type="text"
                  value={breakNoteInput}
                  onChange={(e) => setBreakNoteInput(e.target.value)}
                  placeholder="e.g. Inpatient Ward Rounds · Back by 11:30 AM"
                  className={inputCls}
                />
              </div>

              {/* Quick suggestion tags */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  "Morning Ward Rounds",
                  "Lunch Break (30m)",
                  "Emergency OR Assist",
                  "Department Staff Meeting",
                ].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setBreakNoteInput(tag)}
                    className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-950/60"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button onClick={() => setBreakDoctor(null)} className={btnSecondary}>
                Cancel
              </button>
              <button onClick={handleSaveBreak} className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded text-sm font-bold shadow-xs">
                Confirm Break Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: CONSULTATION ROOM REASSIGNMENT ================= */}
      {roomChangeDoctor && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-bold text-sm">
                <MapPin size={18} className="text-nova-primary" />
                <span>Reassign Consultation Room</span>
              </div>
              <button onClick={() => setRoomChangeDoctor(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Change the clinical station room for <strong>{roomChangeDoctor.name}</strong>.
                Patients called to this doctor will be directed to the updated room number.
              </p>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Select Room:
                </label>
                <select
                  value={selectedRoomInput}
                  onChange={(e) => setSelectedRoomInput(e.target.value)}
                  className={inputCls}
                >
                  {AVAILABLE_ROOMS.map((rm) => (
                    <option key={rm} value={rm}>
                      {rm}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button onClick={() => setRoomChangeDoctor(null)} className={btnSecondary}>
                Cancel
              </button>
              <button onClick={handleSaveRoomChange} className={btnPrimary}>
                Update Room Allocation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: INTERCOM ALERT TO DOCTOR ================= */}
      {intercomDoctor && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-bold text-sm">
                <BellRing size={18} className="text-nova-primary" />
                <span>Send Front-Desk Intercom to {intercomDoctor.name}</span>
              </div>
              <button onClick={() => setIntercomDoctor(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Alert Priority:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "routine", label: "Routine", color: "border-slate-200" },
                    { id: "priority", label: "Priority", color: "border-amber-300" },
                    { id: "emergency", label: "Emergency", color: "border-red-400" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setIntercomUrgency(p.id as any)}
                      className={`p-2 rounded-lg border text-xs font-bold capitalize transition-all ${
                        intercomUrgency === p.id
                          ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 shadow-xs"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Message / Call Request:
                </label>
                <textarea
                  rows={3}
                  value={intercomMsg}
                  onChange={(e) => setIntercomMsg(e.target.value)}
                  placeholder="e.g. Urgent elderly patient with severe chest pain waiting at Reception for immediate review..."
                  className={inputCls}
                />
              </div>

              {/* Quick messages */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  "Patient waiting for immediate chart review",
                  "Urgent triage referral at Reception",
                  "Patient relative requesting consultation",
                ].map((qm) => (
                  <button
                    key={qm}
                    onClick={() => setIntercomMsg(qm)}
                    className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200"
                  >
                    {qm}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button onClick={() => setIntercomDoctor(null)} className={btnSecondary}>
                Cancel
              </button>
              <button
                disabled={!intercomMsg.trim() || intercomMutation.isPending}
                onClick={handleSendIntercom}
                className="px-4 py-2 bg-nova-primary hover:bg-nova-primary-hover text-white rounded text-sm font-bold flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                <Send size={13} />
                <span>Dispatch Alert</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
