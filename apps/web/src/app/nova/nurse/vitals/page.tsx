"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { trpc, queryClient } from "@/utils/trpc";
import { PageShell, Card, FormField, inputCls, btnPrimary, btnSecondary } from "@/components/nova/nova-ui";
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

  const [selectedVisitId, setSelectedVisitId] = useState<string>(visitIdParam);
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

  // Automatically select from URL param or first waiting patient
  useEffect(() => {
    if (visitIdParam) {
      setSelectedVisitId(visitIdParam);
    } else if (!selectedVisitId && queue.length > 0) {
      const firstWaiting = queue.find((q) => q.status === "waiting" || q.status === "urgent");
      if (firstWaiting) {
        setSelectedVisitId(firstWaiting.visitId);
      }
    }
  }, [visitIdParam, queue, selectedVisitId]);

  // Selected visit detail
  const visitId = selectedVisitId;
  const { data: visit, refetch: refetchVisit } = useQuery({
    ...trpc.visit.get.queryOptions({ visitId }),
    enabled: !!visitId,
  });

  // When visit loads, prefill with previous vitals if available
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
    }
  }, [visit]);

  // Mutations
  const recordVitals = useMutation(trpc.visit.recordVitals.mutationOptions());
  const updateStatus = useMutation(trpc.visit.updateTicketStatus.mutationOptions());
  const assignTicketNurse = useMutation(trpc.ward.assignNurseToTicket.mutationOptions({
    onSuccess: () => {
      refetchQueue();
      toast.success("Nurse assigned");
    },
  }));

  // Waiting patients list
  const waitingPatients = useMemo(() => {
    return queue.filter((q) => q.status === "waiting" || q.status === "urgent");
  }, [queue]);

  const activeTicket = queue.find((q) => q.visitId === selectedVisitId);

  // Filtered waiting list
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

  // Derived BMI
  const bmi = useMemo(() => {
    const w = parseFloat(vitals.weight);
    const h = parseFloat(vitals.height) / 100;
    if (w > 0 && h > 0) {
      return (w / (h * h)).toFixed(1);
    }
    return null;
  }, [vitals.weight, vitals.height]);

  const isLoading = recordVitals.isPending || updateStatus.isPending;

  const handleSave = async () => {
    if (!visitId) {
      toast.error("Please select a patient first");
      return;
    }

    try {
      await recordVitals.mutateAsync({
        visitId,
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
      queryClient.invalidateQueries({ queryKey: trpc.visit.get.queryKey({ visitId }) });
      queryClient.invalidateQueries({ queryKey: trpc.ward.admissions.queryKey() });

      setSaved(true);
      toast.success(`Vitals recorded for ${visit?.patient?.nameEn || "patient"}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to record vitals");
    }
  };

  const handleNextPatient = () => {
    setSaved(false);
    // Find next patient in queue
    const remaining = waitingPatients.filter((q) => q.visitId !== selectedVisitId);
    if (remaining.length > 0) {
      setSelectedVisitId(remaining[0].visitId);
    } else {
      setSelectedVisitId("");
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
              if (visitId) refetchVisit();
            }}
            disabled={isQueueRefetching}
            className="p-2 text-xs font-medium rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-xs"
            title="Refresh queue"
          >
            <RefreshCw size={14} className={isQueueRefetching ? "animate-spin text-teal-600" : ""} />
          </button>

          <Link
            href="/nova/nurse"
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Activity size={14} className="text-teal-600" />
            <span>Ward Dashboard</span>
          </Link>

          <Link
            href="/nova/reception/queue"
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-teal-600 hover:bg-teal-500 text-white transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Clock size={14} />
            <span>Queue Board</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-4 pb-12 w-full max-w-[1700px] mx-auto">
        {/* ── 1. KPI SUMMARY CARDS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Waiting for Vitals
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold text-slate-900 dark:text-white">
                    {waitingPatients.length}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">in queue</span>
                </div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                <User size={17} />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-teal-700 dark:text-teal-400 font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Ready for intake</span>
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Urgent Priority
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                    {waitingPatients.filter((q) => q.status === "urgent").length}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">urgent</span>
                </div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle size={17} />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              Prioritize for fast doctor check
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Routine Waiting
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                    {waitingPatients.filter((q) => q.status === "waiting").length}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">normal</span>
                </div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Clock size={17} />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              Standard OPD queue order
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Nurses on Duty
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold text-slate-900 dark:text-white">
                    {nurses.length}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">staff</span>
                </div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <UserCheck size={17} />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              Assigned across station
            </p>
          </div>
        </div>

        {/* ── 2. SIDE-BY-SIDE SPLIT WORKSTATION (NEVER PUSHES DOWN!) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* ── LEFT COLUMN: WAITING QUEUE TABLE (5 COLS) ── */}
          <div className="lg:col-span-5 space-y-3">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
              {/* Header, Search & Filter Bar */}
              <div className="p-3 border-b border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                      Waiting Patients ({filteredPatients.length})
                    </h3>
                  </div>
                  <button
                    onClick={() => refetchQueue()}
                    className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw size={11} className={isQueueRefetching ? "animate-spin" : ""} />
                    <span>Refresh</span>
                  </button>
                </div>

                {/* Search input */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search ticket, patient name, ID..."
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

                {/* Filter pills: All, Urgent, Waiting + Nurse Dropdown */}
                <div className="flex items-center justify-between gap-2 flex-wrap pt-0.5">
                  <div className="flex gap-1 text-[11px] font-semibold">
                    <button
                      onClick={() => setFilterPriority("all")}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        filterPriority === "all"
                          ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      All ({waitingPatients.length})
                    </button>
                    <button
                      onClick={() => setFilterPriority("urgent")}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        filterPriority === "urgent"
                          ? "bg-rose-600 text-white shadow-xs"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-rose-600"
                      }`}
                    >
                      Urgent ({waitingPatients.filter((q) => q.status === "urgent").length})
                    </button>
                  </div>

                  <select
                    className="text-[11px] py-1 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium"
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

              {/* Waiting Patients List */}
              <div className="max-h-[620px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {isQueueLoading ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    Loading queue…
                  </div>
                ) : filteredPatients.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No patients waiting in queue.
                  </div>
                ) : (
                  filteredPatients.map((q) => {
                    const isSelected = selectedVisitId === q.visitId;
                    const p = q.visit?.patient;
                    const isUrgent = q.status === "urgent";

                    return (
                      <div
                        key={q.id}
                        onClick={() => {
                          setSelectedVisitId(q.visitId);
                          setSaved(false);
                        }}
                        className={`p-3 transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? "bg-teal-50/70 dark:bg-teal-950/40 border-l-4 border-teal-600 dark:border-teal-400"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200">
                              {q.ticketNumber}
                            </span>
                            <span className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">
                              {p?.nameEn || "Patient"}
                            </span>
                            {isUrgent && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300">
                                URGENT
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1 flex-wrap">
                            <span className="font-mono">{p?.healthId}</span>
                            <span>•</span>
                            <span>{p?.sex === "M" ? "Male" : p?.sex === "F" ? "Female" : "—"} · {calculateAge(p?.dob)}</span>
                            <span>•</span>
                            <span>{new Date(q.issuedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                          </div>

                          {/* Duty Nurse Selector inline */}
                          <div className="mt-2 flex items-center gap-1.5 text-[11px]" onClick={(e) => e.stopPropagation()}>
                            <span className="text-slate-400">Nurse:</span>
                            <select
                              className="text-[10px] py-0.5 px-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
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
                          </div>
                        </div>

                        {/* Action button */}
                        <div className="shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedVisitId(q.visitId);
                              setSaved(false);
                            }}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                              isSelected
                                ? "bg-teal-600 text-white shadow-xs"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-teal-50 hover:text-teal-700"
                            }`}
                          >
                            <span>Record</span>
                            <ChevronRight size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN: VITALS ENTRY STATION (7 COLS - ALWAYS AT EYE LEVEL!) ── */}
          <div className="lg:col-span-7 space-y-4">
            {!visitId || !visit ? (
              <Card className="p-16 text-center border-dashed border-2 border-slate-200 dark:border-slate-800">
                <Activity size={40} className="text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <h3 className="font-bold text-slate-700 dark:text-slate-300 text-base mb-1">
                  Select a Patient to Record Vitals
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Click any waiting patient from the queue on the left to start vitals measurement.
                </p>
              </Card>
            ) : (
              <>
                {/* Patient Header Card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-teal-600 text-white font-black text-sm flex items-center justify-center shrink-0">
                      {visit.patient?.nameEn?.slice(0, 2).toUpperCase() || "PT"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base font-bold text-slate-900 dark:text-white">
                          {visit.patient?.nameEn}
                        </h2>
                        {visit.patient?.nameAm && (
                          <span className="text-sm text-slate-400">
                            ({visit.patient.nameAm})
                          </span>
                        )}
                        {activeTicket && (
                          <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                            Ticket {activeTicket.ticketNumber}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
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
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors flex items-center gap-1"
                    >
                      <span>Notes</span>
                    </Link>
                  </div>
                </div>

                {/* Vitals Form Station */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                        Measure & Record Vitals
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Enter bedside measurements for doctor consultation
                      </p>
                    </div>

                    {/* Live BMI badge if weight and height entered */}
                    {bmi && (
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
                        BMI: {bmi} kg/m²
                      </span>
                    )}
                  </div>

                  {/* Vitals Grid Inputs */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 text-xs">
                    <div>
                      <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        BP Systolic <span className="text-slate-400 font-normal">(mmHg)</span>
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 120"
                        value={vitals.bpSystolic}
                        onChange={(e) => setVitals({ ...vitals, bpSystolic: e.target.value })}
                        className={inputCls}
                      />
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
                        className={inputCls}
                      />
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
                        className={inputCls}
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Temperature <span className="text-slate-400 font-normal">(°C)</span>
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="e.g. 36.8"
                        value={vitals.temperature}
                        onChange={(e) => setVitals({ ...vitals, temperature: e.target.value })}
                        className={inputCls}
                      />
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
                        className={inputCls}
                      />
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
                        className={inputCls}
                      />
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
                        className={inputCls}
                      />
                    </div>
                  </div>

                  {/* Priority / Triage Toggle */}
                  <div className="pt-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                      Doctor Queue Priority:
                    </label>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <button
                        type="button"
                        onClick={() => setUrgency("normal")}
                        className={`py-2 px-3 rounded-xl border font-semibold flex items-center justify-center gap-2 transition-all ${
                          urgency === "normal"
                            ? "bg-teal-600 text-white border-teal-600 shadow-xs"
                            : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        <Check size={14} />
                        <span>Routine (Normal Queue)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setUrgency("urgent")}
                        className={`py-2 px-3 rounded-xl border font-semibold flex items-center justify-center gap-2 transition-all ${
                          urgency === "urgent"
                            ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                            : "bg-slate-50 dark:bg-slate-800 text-rose-600 border-rose-200 dark:border-rose-900/60"
                        }`}
                      >
                        <AlertTriangle size={14} />
                        <span>Urgent (Prioritize for Doctor)</span>
                      </button>
                    </div>
                  </div>

                  {/* Success banner if saved */}
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
                          onClick={handleNextPatient}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors flex items-center gap-1 shadow-xs"
                        >
                          <span>Next Patient</span>
                          <ArrowRight size={12} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] text-slate-400">
                      Instantly updates doctor consultation screen
                    </span>

                    <div className="flex gap-2">
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
                        onClick={handleSave}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                      >
                        {isLoading ? "Saving…" : "Save Vitals"}
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
                        <span>Previous Vitals for this Visit</span>
                      </h4>
                      <span className="text-[11px] text-slate-400">
                        {visit.vitals.length} record(s)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {visit.vitals.slice(0, 4).map((v) => (
                        <div
                          key={v.id}
                          className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-[11px] space-y-1"
                        >
                          <div className="flex justify-between text-slate-400 font-medium">
                            <span>{new Date(v.recordedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                            <span>{new Date(v.recordedAt).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap font-semibold text-slate-700 dark:text-slate-200">
                            {v.bpSystolic && v.bpDiastolic && <span>BP: {v.bpSystolic}/{v.bpDiastolic}</span>}
                            {v.heartRate && <span>· HR: {v.heartRate}</span>}
                            {v.temperature && <span>· {v.temperature}°C</span>}
                            {v.spo2 && <span>· SpO₂: {v.spo2}%</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
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
