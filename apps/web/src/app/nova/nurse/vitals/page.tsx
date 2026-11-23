"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { trpc, queryClient } from "@/utils/trpc";
import { PageShell, Card, inputCls, btnPrimary, btnSecondary } from "@/components/nova/nova-ui";
import {
  Activity,
  Heart,
  Thermometer,
  Wind,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  User,
  Clock,
  ArrowRight,
  ArrowLeft,
  UserCheck,
  Stethoscope,
  X,
  Gauge,
  Check,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

function calculateAge(dobString?: string) {
  if (!dobString) return "—";
  const birth = new Date(dobString);
  if (isNaN(birth.getTime())) return "—";
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    years--;
  }
  return years > 0 ? `${years}y` : "< 1y";
}

function VitalsContent() {
  const router = useRouter();
  const params = useSearchParams();
  const visitIdParam = params.get("visitId") ?? "";

  // activeVisitId: null = show full-page patient list; string = show full-page vitals entry
  const [activeVisitId, setActiveVisitId] = useState<string | null>(visitIdParam || null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState<"all" | "waiting" | "urgent">("all");
  const [filterNurse, setFilterNurse] = useState<string>("all");

  const [vitals, setVitals] = useState({
    bpSystolic: "120",
    bpDiastolic: "80",
    heartRate: "78",
    temperature: "36.8",
    spo2: "98",
    weight: "",
    height: "",
  });

  const [urgency, setUrgency] = useState<"normal" | "urgent">("normal");
  const [saved, setSaved] = useState(false);

  // Queue query
  const {
    data: queue = [],
    refetch: refetchQueue,
    isRefetching: isQueueRefetching,
    isLoading: isQueueLoading,
  } = useQuery({
    ...trpc.visit.queue.queryOptions(),
    refetchOnMount: true,
    refetchInterval: 12_000,
  });

  // Nurses list for duty assignment
  const { data: nurses = [] } = useQuery({
    ...trpc.ward.nurses.queryOptions(),
    refetchOnMount: true,
  });

  // If visitIdParam in URL, open that patient immediately
  useEffect(() => {
    if (visitIdParam) {
      setActiveVisitId(visitIdParam);
    }
  }, [visitIdParam]);

  // Active visit detail (loaded when activeVisitId is set)
  const { data: visit, refetch: refetchVisit } = useQuery({
    ...trpc.visit.get.queryOptions({ visitId: activeVisitId || "" }),
    enabled: !!activeVisitId,
  });

  // When active visit loads, prefill with previous vitals if available
  useEffect(() => {
    if (visit?.vitals?.[0]) {
      const last = visit.vitals[0];
      setVitals({
        bpSystolic: last.bpSystolic ? String(last.bpSystolic) : "120",
        bpDiastolic: last.bpDiastolic ? String(last.bpDiastolic) : "80",
        heartRate: last.heartRate ? String(last.heartRate) : "78",
        temperature: last.temperature ? String(last.temperature) : "36.8",
        spo2: last.spo2 ? String(last.spo2) : "98",
        weight: last.weight ? String(last.weight) : "",
        height: last.height ? String(last.height) : "",
      });
    } else {
      setVitals({
        bpSystolic: "120",
        bpDiastolic: "80",
        heartRate: "78",
        temperature: "36.8",
        spo2: "98",
        weight: "",
        height: "",
      });
    }
    setSaved(false);
  }, [visit]);

  // Mutations
  const recordVitals = useMutation(trpc.visit.recordVitals.mutationOptions());
  const updateStatus = useMutation(trpc.visit.updateTicketStatus.mutationOptions());
  const assignTicketNurse = useMutation(
    trpc.ward.assignNurseToTicket.mutationOptions({
      onSuccess: () => {
        refetchQueue();
        toast.success("Nurse assigned");
      },
    })
  );

  // Waiting patients in queue
  const waitingPatients = useMemo(() => {
    return queue.filter((q) => q.status === "waiting" || q.status === "urgent");
  }, [queue]);

  const activeTicket = queue.find((q) => q.visitId === activeVisitId);

  // Filtered waiting list for full table
  const filteredPatients = useMemo(() => {
    return waitingPatients.filter((q) => {
      if (filterPriority === "urgent" && q.status !== "urgent") return false;
      if (filterPriority === "waiting" && q.status !== "waiting") return false;

      if (filterNurse === "unassigned" && q.assignedNurseId) return false;
      if (filterNurse !== "all" && filterNurse !== "unassigned" && q.assignedNurseId !== filterNurse) {
        return false;
      }

      const query = searchQuery.toLowerCase().trim();
      if (!query) return true;

      const p = q.visit?.patient;
      return (
        q.ticketNumber?.toLowerCase().includes(query) ||
        p?.nameEn?.toLowerCase().includes(query) ||
        p?.nameAm?.includes(query) ||
        p?.healthId?.toLowerCase().includes(query)
      );
    });
  }, [waitingPatients, filterPriority, filterNurse, searchQuery]);

  // Auto-calculated BMI
  const bmi = useMemo(() => {
    const w = parseFloat(vitals.weight);
    const h = parseFloat(vitals.height) / 100;
    if (w > 0 && h > 0) {
      return (w / (h * h)).toFixed(1);
    }
    return null;
  }, [vitals.weight, vitals.height]);

  const isLoading = recordVitals.isPending || updateStatus.isPending;

  const handleOpenVitalsForPatient = (visitIdToOpen: string) => {
    setActiveVisitId(visitIdToOpen);
    setSaved(false);
  };

  const handleBackToQueue = () => {
    setActiveVisitId(null);
    setSaved(false);
  };

  const handleSaveVitals = async (advanceToNext = false) => {
    if (!activeVisitId) {
      toast.error("Please select a patient first");
      return;
    }

    try {
      await recordVitals.mutateAsync({
        visitId: activeVisitId,
        bpSystolic: vitals.bpSystolic ? Number(vitals.bpSystolic) : undefined,
        bpDiastolic: vitals.bpDiastolic ? Number(vitals.bpDiastolic) : undefined,
        heartRate: vitals.heartRate ? Number(vitals.heartRate) : undefined,
        temperature: vitals.temperature ? Number(vitals.temperature) : undefined,
        spo2: vitals.spo2 ? Number(vitals.spo2) : undefined,
        weight: vitals.weight ? Number(vitals.weight) : undefined,
        height: vitals.height ? Number(vitals.height) : undefined,
      });

      if (activeTicket) {
        await updateStatus.mutateAsync({
          ticketId: activeTicket.id,
          status: urgency === "urgent" ? "urgent" : "waiting",
        });
      }

      queryClient.invalidateQueries({ queryKey: trpc.visit.queue.queryKey() });
      queryClient.invalidateQueries({ queryKey: trpc.visit.get.queryKey({ visitId: activeVisitId }) });
      queryClient.invalidateQueries({ queryKey: trpc.ward.admissions.queryKey() });

      toast.success(`Vitals recorded for ${visit?.patient?.nameEn || "patient"}`);
      setSaved(true);

      if (advanceToNext) {
        // Find next waiting patient
        const remaining = waitingPatients.filter((q) => q.visitId !== activeVisitId);
        if (remaining.length > 0) {
          setActiveVisitId(remaining[0].visitId);
          setSaved(false);
        } else {
          setActiveVisitId(null);
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to record vitals");
    }
  };

  return (
    <PageShell
      title="Record Vitals"
      subtitle="Measure and log patient blood pressure, pulse, temperature, and oxygen saturation"
      action={
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              refetchQueue();
              if (activeVisitId) refetchVisit();
            }}
            disabled={isQueueRefetching}
            className="p-1.5 text-xs font-medium rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-xs"
            title="Refresh queue"
          >
            <RefreshCw size={13} className={isQueueRefetching ? "animate-spin text-teal-600" : ""} />
          </button>

          <Link
            href="/nova/nurse"
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Activity size={13} className="text-teal-600" />
            <span>Ward Patients</span>
          </Link>

          <Link
            href="/nova/nurse/mar"
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <span>Give Medicines</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-3 pb-12 w-full max-w-[1700px] mx-auto">
        {/* ── 1. COMPACT SMALL UI KPI CARDS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 px-3 flex items-center justify-between shadow-xs">
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Waiting
              </p>
              <p className="text-base font-bold text-slate-900 dark:text-white leading-tight mt-0.5">
                {waitingPatients.length} <span className="text-[11px] font-normal text-slate-400">patients</span>
              </p>
            </div>
            <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <User size={14} />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 px-3 flex items-center justify-between shadow-xs">
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Urgent Priority
              </p>
              <p className="text-base font-bold text-rose-600 dark:text-rose-400 leading-tight mt-0.5">
                {waitingPatients.filter((q) => q.status === "urgent").length} <span className="text-[11px] font-normal text-slate-400">urgent</span>
              </p>
            </div>
            <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertTriangle size={14} />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 px-3 flex items-center justify-between shadow-xs">
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Routine
              </p>
              <p className="text-base font-bold text-slate-800 dark:text-slate-200 leading-tight mt-0.5">
                {waitingPatients.filter((q) => q.status === "waiting").length} <span className="text-[11px] font-normal text-slate-400">normal</span>
              </p>
            </div>
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Clock size={14} />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 px-3 flex items-center justify-between shadow-xs">
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Duty Nurses
              </p>
              <p className="text-base font-bold text-slate-900 dark:text-white leading-tight mt-0.5">
                {nurses.length} <span className="text-[11px] font-normal text-slate-400">on duty</span>
              </p>
            </div>
            <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <UserCheck size={14} />
            </div>
          </div>
        </div>

        {/* ── 2. FULL-PAGE WAITING PATIENTS TABLE (COVERS WHOLE PAGE) ── */}
        {!activeVisitId && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden w-full">
            {/* Table Header & Controls Bar */}
            <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                  Waiting Patients ({filteredPatients.length})
                </h3>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Search input */}
                <div className="relative w-48 sm:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search ticket, name, ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`${inputCls} pl-8.5 pr-7 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80`}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Priority Filter Pills */}
                <div className="flex gap-1 text-[11px] font-semibold">
                  <button
                    onClick={() => setFilterPriority("all")}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      filterPriority === "all"
                        ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    All ({waitingPatients.length})
                  </button>
                  <button
                    onClick={() => setFilterPriority("urgent")}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      filterPriority === "urgent"
                        ? "bg-rose-600 text-white shadow-xs"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-rose-600"
                    }`}
                  >
                    Urgent ({waitingPatients.filter((q) => q.status === "urgent").length})
                  </button>
                </div>

                {/* Nurse filter */}
                <select
                  className="text-xs py-1 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium"
                  value={filterNurse}
                  onChange={(e) => setFilterNurse(e.target.value)}
                >
                  <option value="all">All Nurses</option>
                  <option value="unassigned">Unassigned</option>
                  {nurses.map((n) => (
                    <option key={n.id} value={n.id}>{n.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Full-Width Table */}
            {isQueueLoading ? (
              <div className="p-16 text-center text-slate-400 text-sm">
                Loading waiting patients…
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="p-16 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={24} className="text-emerald-500" />
                </div>
                <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                  No patients waiting for vitals
                </p>
                <p className="text-xs text-slate-400">
                  New registered patients from reception will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4 w-28">Ticket</th>
                      <th className="py-3 px-4 min-w-[220px]">Patient Name & ID</th>
                      <th className="py-3 px-4 w-32">Age & Sex</th>
                      <th className="py-3 px-4 w-28">Waiting Since</th>
                      <th className="py-3 px-4 w-28 text-center">Priority</th>
                      <th className="py-3 px-4 min-w-[180px]">Assigned Nurse</th>
                      <th className="py-3 px-4 text-right w-36">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredPatients.map((q) => {
                      const p = q.visit?.patient;
                      const isUrgent = q.status === "urgent";

                      return (
                        <tr
                          key={q.id}
                          onClick={() => handleOpenVitalsForPatient(q.visitId)}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                        >
                          {/* Ticket Number */}
                          <td className="py-3.5 px-4 align-middle">
                            <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/70 inline-block">
                              {q.ticketNumber}
                            </span>
                          </td>

                          {/* Patient Name & MRN */}
                          <td className="py-3.5 px-4 align-middle">
                            <div>
                              <span className="font-bold text-sm text-slate-900 dark:text-slate-100 block">
                                {p?.nameEn || "Patient"}
                              </span>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                                <span className="font-mono">{p?.healthId}</span>
                                {p?.phone && (
                                  <>
                                    <span>•</span>
                                    <span>{p.phone}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Age & Sex */}
                          <td className="py-3.5 px-4 align-middle text-slate-600 dark:text-slate-300">
                            <span>
                              {p?.sex === "M" ? "Male" : p?.sex === "F" ? "Female" : "—"} · {calculateAge(p?.dob)}
                            </span>
                          </td>

                          {/* Time in Queue */}
                          <td className="py-3.5 px-4 align-middle text-slate-500 font-mono text-[11px]">
                            {new Date(q.issuedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </td>

                          {/* Priority */}
                          <td className="py-3.5 px-4 align-middle text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isUrgent
                                  ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                              }`}
                            >
                              {isUrgent ? "URGENT" : "Routine"}
                            </span>
                          </td>

                          {/* Assigned Nurse Selector */}
                          <td className="py-3.5 px-4 align-middle" onClick={(e) => e.stopPropagation()}>
                            <select
                              className="text-xs py-1 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                              value={q.assignedNurseId || ""}
                              onChange={(e) => {
                                const nurse = nurses.find((n) => n.id === e.target.value);
                                if (nurse) {
                                  assignTicketNurse.mutate({
                                    ticketId: q.id,
                                    assignedNurseId: nurse.id,
                                    assignedNurseName: nurse.name,
                                  });
                                }
                              }}
                            >
                              <option value="">Unassigned</option>
                              {nurses.map((n) => (
                                <option key={n.id} value={n.id}>{n.name}</option>
                              ))}
                            </select>
                          </td>

                          {/* Action Button */}
                          <td className="py-3.5 px-4 align-middle text-right" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handleOpenVitalsForPatient(q.visitId)}
                              className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 ml-auto shadow-xs"
                            >
                              <Activity size={13} />
                              <span>Record Vitals</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── 3. FULL-PAGE VITALS ENTRY STATION (COVERS WHOLE PAGE WHEN ACTIVE) ── */}
        {activeVisitId && visit && (
          <div className="space-y-4 w-full">
            {/* Top Navigation & Patient Header */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleBackToQueue}
                    className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1 text-xs font-semibold"
                    title="Return to waiting queue list"
                  >
                    <ArrowLeft size={15} />
                    <span>Back to Patient List</span>
                  </button>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                        {visit.patient?.nameEn}
                      </h2>
                      {visit.patient?.nameAm && (
                        <span className="text-sm text-slate-400">
                          ({visit.patient.nameAm})
                        </span>
                      )}
                      {activeTicket && (
                        <span className="font-mono font-bold text-xs px-2.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                          Ticket {activeTicket.ticketNumber}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
                      <span className="font-mono font-medium">ID: {visit.patient?.healthId || "—"}</span>
                      <span>•</span>
                      <span>{visit.patient?.sex === "M" ? "Male" : visit.patient?.sex === "F" ? "Female" : "—"} · {calculateAge(visit.patient?.dob)}</span>
                      {visit.patient?.phone && (
                        <>
                          <span>•</span>
                          <span>{visit.patient.phone}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/nova/nurse/notes?patientId=${visit.patientId}`}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors flex items-center gap-1"
                  >
                    <span>Nurse Notes</span>
                  </Link>
                </div>
              </div>

              {/* Patient Banner Notification */}
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 flex-wrap gap-2">
                <span className="text-[11px] font-medium">
                  Enter measurements below. Saving will immediately update the doctor consultation queue.
                </span>
                {bmi && (
                  <span className="px-2.5 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 font-bold text-xs border border-teal-200 dark:border-teal-800">
                    Calculated BMI: {bmi} kg/m²
                  </span>
                )}
              </div>
            </div>

            {/* Full-Width Vitals Form Box */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base">
                    Vital Signs Measurements
                  </h3>
                  <p className="text-xs text-slate-400">
                    Input fresh values taken at the triage station or bedside
                  </p>
                </div>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    BP Systolic <span className="text-slate-400 font-normal">(mmHg)</span>
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 120"
                    value={vitals.bpSystolic}
                    onChange={(e) => setVitals({ ...vitals, bpSystolic: e.target.value })}
                    className={`${inputCls} text-sm py-2`}
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">Normal: 90 - 130</span>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    BP Diastolic <span className="text-slate-400 font-normal">(mmHg)</span>
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 80"
                    value={vitals.bpDiastolic}
                    onChange={(e) => setVitals({ ...vitals, bpDiastolic: e.target.value })}
                    className={`${inputCls} text-sm py-2`}
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">Normal: 60 - 85</span>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Pulse / Heart Rate <span className="text-slate-400 font-normal">(bpm)</span>
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 78"
                    value={vitals.heartRate}
                    onChange={(e) => setVitals({ ...vitals, heartRate: e.target.value })}
                    className={`${inputCls} text-sm py-2`}
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">Normal: 60 - 100</span>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Body Temperature <span className="text-slate-400 font-normal">(°C)</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 36.8"
                    value={vitals.temperature}
                    onChange={(e) => setVitals({ ...vitals, temperature: e.target.value })}
                    className={`${inputCls} text-sm py-2`}
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">Normal: 36.5 - 37.5</span>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Oxygen SpO₂ <span className="text-slate-400 font-normal">(%)</span>
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 98"
                    value={vitals.spo2}
                    onChange={(e) => setVitals({ ...vitals, spo2: e.target.value })}
                    className={`${inputCls} text-sm py-2`}
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">Normal: 95 - 100</span>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Weight <span className="text-slate-400 font-normal">(kg)</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 68"
                    value={vitals.weight}
                    onChange={(e) => setVitals({ ...vitals, weight: e.target.value })}
                    className={`${inputCls} text-sm py-2`}
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">Optional</span>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Height <span className="text-slate-400 font-normal">(cm)</span>
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 170"
                    value={vitals.height}
                    onChange={(e) => setVitals({ ...vitals, height: e.target.value })}
                    className={`${inputCls} text-sm py-2`}
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">Optional</span>
                </div>
              </div>

              {/* Priority / Triage Selection */}
              <div className="pt-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Doctor Priority:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => setUrgency("normal")}
                    className={`py-2.5 px-3 rounded-xl border font-semibold flex items-center justify-center gap-2 transition-all ${
                      urgency === "normal"
                        ? "bg-teal-600 text-white border-teal-600 shadow-xs"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <Check size={14} />
                    <span>Routine (Standard Queue)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUrgency("urgent")}
                    className={`py-2.5 px-3 rounded-xl border font-semibold flex items-center justify-center gap-2 transition-all ${
                      urgency === "urgent"
                        ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                        : "bg-slate-50 dark:bg-slate-800 text-rose-600 border-rose-200 dark:border-rose-900/60"
                    }`}
                  >
                    <AlertTriangle size={14} />
                    <span>Urgent (Fast-track to Doctor)</span>
                  </button>
                </div>
              </div>

              {/* Success confirmation */}
              {saved && (
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-bold">Vitals saved successfully!</p>
                      <p className="text-[11px] opacity-90">Patient is ready for doctor consultation.</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleSaveVitals(true)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors flex items-center gap-1 shadow-xs"
                    >
                      <span>Next Patient</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleBackToQueue}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-medium flex items-center gap-1"
                >
                  <ArrowLeft size={13} />
                  <span>Cancel and back to list</span>
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setVitals({
                        bpSystolic: "120",
                        bpDiastolic: "80",
                        heartRate: "78",
                        temperature: "36.8",
                        spo2: "98",
                        weight: "",
                        height: "",
                      });
                    }}
                    className={btnSecondary}
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleSaveVitals(false)}
                    className="flex-1 sm:flex-none px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
                  >
                    <Check size={14} />
                    <span>{isLoading ? "Saving…" : "Save Vitals"}</span>
                  </button>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleSaveVitals(true)}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
                  >
                    <span>Save & Next</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            </div>

            {/* Previous Vitals History Card */}
            {visit.vitals && visit.vitals.length > 0 && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs flex items-center gap-1.5">
                    <Clock size={13} className="text-teal-600" />
                    <span>Previous Vitals History for this Patient</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    {visit.vitals.length} record(s)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
                  {visit.vitals.slice(0, 6).map((v) => (
                    <div
                      key={v.id}
                      className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-[11px] space-y-1.5"
                    >
                      <div className="flex justify-between text-slate-400 font-medium border-b border-slate-200/60 dark:border-slate-700/60 pb-1">
                        <span>{new Date(v.recordedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        <span>{new Date(v.recordedAt).toLocaleDateString()}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-slate-700 dark:text-slate-200 font-medium">
                        {v.bpSystolic && v.bpDiastolic && <span>BP: <strong>{v.bpSystolic}/{v.bpDiastolic}</strong></span>}
                        {v.heartRate && <span>Pulse: <strong>{v.heartRate}</strong></span>}
                        {v.temperature && <span>Temp: <strong>{v.temperature}°C</strong></span>}
                        {v.spo2 && <span>SpO₂: <strong>{v.spo2}%</strong></span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PageShell>
  );
}

export default function VitalsEntryPage() {
  return (
    <Suspense
      fallback={
        <PageShell title="Record Vitals">
          <div className="p-12 text-center text-slate-400 text-sm">
            Loading vitals station…
          </div>
        </PageShell>
      }
    >
      <VitalsContent />
    </Suspense>
  );
}
