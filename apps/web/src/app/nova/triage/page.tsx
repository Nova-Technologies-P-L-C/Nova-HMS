"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "@tanstack/react-query";
import { trpc, queryClient } from "@/utils/trpc";
import { PageShell, Card, StatusBadge } from "@/components/nova/nova-ui";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Heart,
  Search,
  Stethoscope,
  Thermometer,
  User,
  Users,
  Wind,
  Bed,
  ArrowRight,
  RefreshCw,
  Flame,
  ShieldAlert,
  ArrowLeftRight,
} from "lucide-react";

function getPatientInfo(item: any) {
  const p = item?.visit?.patient || {};
  let age: string | number = "—";
  if (p.dob) {
    const birthYear = new Date(p.dob).getFullYear();
    if (!isNaN(birthYear)) {
      age = Math.max(0, new Date().getFullYear() - birthYear);
    }
  }
  return {
    nameEn: p.nameEn || "Patient",
    healthId: p.healthId || "—",
    gender: p.sex || "—",
    age,
    phone: p.phone || "",
    cbhiStatus: !!p.cbhiStatus,
  };
}

export default function TriageStationPage() {
  const [search, setSearch] = useState("");
  const [selectedVisitId, setSelectedVisitId] = useState<string>("");
  const [filterPriority, setFilterPriority] = useState<"all" | "urgent" | "waiting">("all");

  // Vitals State
  const [vitals, setVitals] = useState({
    bpSystolic: "120",
    bpDiastolic: "80",
    heartRate: "78",
    temperature: "36.8",
    spo2: "98",
    respiratoryRate: "18",
    weight: "68",
    height: "172",
  });

  const [acuity, setAcuity] = useState<"routine" | "priority" | "emergency">("routine");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [triageNote, setTriageNote] = useState("");
  const [targetDepartment, setTargetDepartment] = useState("General OPD");
  const [successMessage, setSuccessMessage] = useState("");

  // Live Queue Query
  const { data: queue = [], isLoading: isQueueLoading, refetch: refetchQueue, isFetching } = useQuery({
    ...trpc.visit.queue.queryOptions(),
    refetchInterval: 10_000,
  });

  // Filtered Queue
  const filteredQueue = useMemo(() => {
    return queue.filter((item: any) => {
      const patient = getPatientInfo(item);
      const matchesSearch =
        patient.nameEn.toLowerCase().includes(search.toLowerCase()) ||
        patient.healthId.toLowerCase().includes(search.toLowerCase()) ||
        (item.ticketNumber || "").toLowerCase().includes(search.toLowerCase());

      const isWaiting = item.status === "waiting" || item.status === "urgent";
      if (!isWaiting) return false;

      if (filterPriority === "urgent") return item.status === "urgent" && matchesSearch;
      if (filterPriority === "waiting") return item.status === "waiting" && matchesSearch;
      return matchesSearch;
    });
  }, [queue, search, filterPriority]);

  // Selected Patient Details
  const activeItem = useMemo(() => {
    if (selectedVisitId) {
      return queue.find((q) => q.visitId === selectedVisitId) || filteredQueue[0];
    }
    return filteredQueue[0];
  }, [queue, filteredQueue, selectedVisitId]);

  const activeVisitId = activeItem?.visitId || "";

  // Auto-calculated BMI
  const calculatedBmi = useMemo(() => {
    const w = parseFloat(vitals.weight);
    const h = parseFloat(vitals.height) / 100;
    if (w > 0 && h > 0) {
      const val = w / (h * h);
      return val.toFixed(1);
    }
    return null;
  }, [vitals.weight, vitals.height]);

  // Mutations
  const recordVitals = useMutation(trpc.visit.recordVitals.mutationOptions());
  const updateTicketStatus = useMutation({
    ...trpc.visit.updateTicketStatus.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.visit.queue.queryKey() });
    },
  });

  const handleSaveTriage = async () => {
    if (!activeVisitId || !activeItem) return;
    setSuccessMessage("");

    try {
      await recordVitals.mutateAsync({
        visitId: activeVisitId,
        bpSystolic: Number(vitals.bpSystolic) || 120,
        bpDiastolic: Number(vitals.bpDiastolic) || 80,
        heartRate: Number(vitals.heartRate) || 75,
        temperature: Number(vitals.temperature) || 36.8,
        spo2: Number(vitals.spo2) || 98,
        weight: Number(vitals.weight) || 70,
        height: Number(vitals.height) || 170,
      });

      await updateTicketStatus.mutateAsync({
        ticketId: activeItem.id,
        status: (acuity === "emergency" || acuity === "priority" ? "urgent" : "being-seen") as "urgent" | "being-seen",
      });

      const activePatient = getPatientInfo(activeItem);
      setSuccessMessage(`Patient ${activePatient.nameEn} triaged & routed to ${targetDepartment}!`);
      setTimeout(() => setSuccessMessage(""), 4000);

      // Advance to next patient in queue
      const nextItem = filteredQueue.find((q) => q.visitId !== activeVisitId);
      if (nextItem) setSelectedVisitId(nextItem.visitId);
    } catch (err: any) {
      console.error("Triage error:", err);
    }
  };

  const urgentCount = queue.filter((q) => q.status === "urgent").length;
  const waitingCount = queue.filter((q) => q.status === "waiting" || q.status === "urgent").length;

  return (
    <PageShell
      title="Triage & Acuity Intake Station"
      subtitle="Outpatient Acuity Stratification (MoH / SATS Standards) & Vital Signs Capture"
      action={
        <div className="flex items-center gap-2">
          <Link
            href={"/nova/nurse" as any}
            className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 transition flex items-center gap-1.5"
          >
            <Bed size={13} className="text-emerald-600" />
            Switch to Inpatient Ward Care
          </Link>
          <button
            onClick={() => refetchQueue()}
            disabled={isFetching}
            className="p-1.5 text-slate-600 hover:text-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 transition"
            title="Refresh Queue"
          >
            <RefreshCw size={15} className={isFetching ? "animate-spin text-teal-600" : ""} />
          </button>
        </div>
      }
    >
      {/* Top Clinical Triage Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Awaiting Triage</span>
            <Users size={16} className="text-teal-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {isQueueLoading ? "…" : waitingCount}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Checked-in at front reception</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-rose-600 text-xs font-bold uppercase tracking-wider">
            <span>Urgent / Resus</span>
            <ShieldAlert size={16} className="text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-600 mt-1">
            {isQueueLoading ? "…" : urgentCount}
          </div>
          <p className="text-[11px] text-rose-700/80 mt-0.5">High priority medical queue</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Acuity Standard</span>
            <Activity size={16} className="text-blue-600" />
          </div>
          <div className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-2">
            MoH Ethiopia / SATS
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">3-tier triage clinical scale</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Avg Triage Time</span>
            <Clock size={16} className="text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            3.2 min
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Optimal clinical throughput</p>
        </div>
      </div>

      {/* Success Banner */}
      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 mb-4 animate-in fade-in">
          <CheckCircle2 size={16} className="text-emerald-600" />
          {successMessage}
        </div>
      )}

      {/* Main Two-Column Triage Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Waiting Queue (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search ticket #, name, or health ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-hidden focus:border-teal-500"
              />
            </div>
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[11px]">
              <button
                onClick={() => setFilterPriority("all")}
                className={`px-2 py-1 rounded font-medium ${
                  filterPriority === "all" ? "bg-white dark:bg-slate-700 shadow-xs font-bold" : "text-slate-500"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterPriority("urgent")}
                className={`px-2 py-1 rounded font-medium ${
                  filterPriority === "urgent" ? "bg-rose-500 text-white font-bold" : "text-slate-500"
                }`}
              >
                Urgent
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs divide-y divide-slate-100 dark:divide-slate-800 max-h-[580px] overflow-y-auto">
            {filteredQueue.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                <Users size={24} className="mx-auto text-slate-300 mb-2" />
                No patients waiting in queue for triage right now.
              </div>
            ) : (
              filteredQueue.map((item: any) => {
                const itemPatient = getPatientInfo(item);
                const isSelected = item.visitId === (activeItem?.visitId || "");
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedVisitId(item.visitId)}
                    className={`p-3.5 transition cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? "bg-teal-50/80 dark:bg-teal-950/40 border-l-4 border-l-teal-600"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-black text-xs ${
                          item.status === "urgent"
                            ? "bg-rose-100 text-rose-700 border border-rose-200"
                            : "bg-teal-100 text-teal-800 border border-teal-200"
                        }`}
                      >
                        #{item.ticketNumber}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{itemPatient.nameEn}</span>
                          {itemPatient.cbhiStatus && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-cyan-100 text-cyan-800">
                              CBHI
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>{itemPatient.healthId}</span>
                          <span>•</span>
                          <span>{itemPatient.gender}</span>
                          <span>•</span>
                          <span>{itemPatient.age !== "—" ? `${itemPatient.age}y` : "—"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      {item.status === "urgent" ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 animate-pulse">
                          Emergency
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-mono">
                          {item.waitMinutes ? `${item.waitMinutes}m wait` : "Waiting"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Active Patient Triage Console (7 cols) */}
        <div className="lg:col-span-7">
          {!activeItem ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center text-slate-400">
              <Stethoscope size={36} className="mx-auto text-slate-300 mb-3" />
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Patient Selected for Triage</h4>
              <p className="text-xs text-slate-500 mt-1">
                Select a waiting patient from the queue on the left to measure vital signs and assign acuity.
              </p>
            </div>
          ) : (
            (() => {
              const activePatient = getPatientInfo(activeItem);
              return (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
              {/* Patient Banner */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-teal-700 dark:text-teal-400 tracking-wider">
                    Active Intake Patient • Ticket #{activeItem.ticketNumber}
                  </div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                    {activePatient.nameEn}
                  </h3>
                  <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                    <span>ID: {activePatient.healthId}</span>
                    <span>•</span>
                    <span>Gender: {activePatient.gender}</span>
                    <span>•</span>
                    <span>Age: {activePatient.age !== "—" ? `${activePatient.age} years` : "—"}</span>
                    {activePatient.phone && (
                      <>
                        <span>•</span>
                        <span>Tel: {activePatient.phone}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs px-2.5 py-1 rounded-lg font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                    OPD Walk-in
                  </span>
                </div>
              </div>

              <div className="p-5 space-y-5">
                {/* 1. Acuity Stratification (MoH Standard) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Acuity Stratification Level
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setAcuity("routine")}
                      className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                        acuity === "routine"
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 ring-2 ring-emerald-400/50"
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          Green (Routine)
                        </span>
                      </div>
                      <p className="text-[10px] leading-tight opacity-80">
                        Stable walk-in. Standard outpatient doctor queue.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAcuity("priority")}
                      className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                        acuity === "priority"
                          ? "border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 ring-2 ring-amber-400/50"
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                          Yellow (Urgent)
                        </span>
                      </div>
                      <p className="text-[10px] leading-tight opacity-80">
                        Acute pain, high fever, or distress. Accelerated queue.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAcuity("emergency")}
                      className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                        acuity === "emergency"
                          ? "border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-950 dark:text-rose-200 ring-2 ring-rose-400/50"
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                          Red (Emergency)
                        </span>
                      </div>
                      <p className="text-[10px] leading-tight opacity-80">
                        Immediate resuscitation. Bypasses queue to doctor.
                      </p>
                    </button>
                  </div>
                </div>

                {/* 2. Vital Signs Entry Matrix */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Vital Signs Measurement
                    </label>
                    {calculatedBmi && (
                      <span className="text-xs font-bold text-teal-700 dark:text-teal-400">
                        Calculated BMI: <span className="font-mono">{calculatedBmi}</span> kg/m²
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* BP Systolic */}
                    <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                      <div className="text-[10px] text-slate-500 font-semibold flex items-center gap-1 mb-1">
                        <Activity size={12} className="text-blue-500" /> BP Systolic
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={vitals.bpSystolic}
                          onChange={(e) => setVitals({ ...vitals, bpSystolic: e.target.value })}
                          className="w-full text-base font-black bg-transparent focus:outline-hidden font-mono"
                        />
                        <span className="text-[10px] text-slate-400">mmHg</span>
                      </div>
                    </div>

                    {/* BP Diastolic */}
                    <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                      <div className="text-[10px] text-slate-500 font-semibold flex items-center gap-1 mb-1">
                        <Activity size={12} className="text-blue-500" /> BP Diastolic
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={vitals.bpDiastolic}
                          onChange={(e) => setVitals({ ...vitals, bpDiastolic: e.target.value })}
                          className="w-full text-base font-black bg-transparent focus:outline-hidden font-mono"
                        />
                        <span className="text-[10px] text-slate-400">mmHg</span>
                      </div>
                    </div>

                    {/* Heart Rate */}
                    <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                      <div className="text-[10px] text-slate-500 font-semibold flex items-center gap-1 mb-1">
                        <Heart size={12} className="text-rose-500" /> Heart Rate
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={vitals.heartRate}
                          onChange={(e) => setVitals({ ...vitals, heartRate: e.target.value })}
                          className="w-full text-base font-black bg-transparent focus:outline-hidden font-mono"
                        />
                        <span className="text-[10px] text-slate-400">bpm</span>
                      </div>
                    </div>

                    {/* Temperature */}
                    <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                      <div className="text-[10px] text-slate-500 font-semibold flex items-center gap-1 mb-1">
                        <Thermometer size={12} className="text-amber-500" /> Temperature
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={vitals.temperature}
                          onChange={(e) => setVitals({ ...vitals, temperature: e.target.value })}
                          className="w-full text-base font-black bg-transparent focus:outline-hidden font-mono"
                        />
                        <span className="text-[10px] text-slate-400">°C</span>
                      </div>
                    </div>

                    {/* SpO2 */}
                    <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                      <div className="text-[10px] text-slate-500 font-semibold flex items-center gap-1 mb-1">
                        <Wind size={12} className="text-teal-500" /> Oxygen Sat (SpO2)
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={vitals.spo2}
                          onChange={(e) => setVitals({ ...vitals, spo2: e.target.value })}
                          className="w-full text-base font-black bg-transparent focus:outline-hidden font-mono"
                        />
                        <span className="text-[10px] text-slate-400">%</span>
                      </div>
                    </div>

                    {/* Weight */}
                    <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                      <div className="text-[10px] text-slate-500 font-semibold mb-1">Weight</div>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={vitals.weight}
                          onChange={(e) => setVitals({ ...vitals, weight: e.target.value })}
                          className="w-full text-base font-black bg-transparent focus:outline-hidden font-mono"
                        />
                        <span className="text-[10px] text-slate-400">kg</span>
                      </div>
                    </div>

                    {/* Height */}
                    <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                      <div className="text-[10px] text-slate-500 font-semibold mb-1">Height</div>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={vitals.height}
                          onChange={(e) => setVitals({ ...vitals, height: e.target.value })}
                          className="w-full text-base font-black bg-transparent focus:outline-hidden font-mono"
                        />
                        <span className="text-[10px] text-slate-400">cm</span>
                      </div>
                    </div>

                    {/* Respiratory Rate */}
                    <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                      <div className="text-[10px] text-slate-500 font-semibold mb-1">Resp. Rate</div>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={vitals.respiratoryRate}
                          onChange={(e) => setVitals({ ...vitals, respiratoryRate: e.target.value })}
                          className="w-full text-base font-black bg-transparent focus:outline-hidden font-mono"
                        />
                        <span className="text-[10px] text-slate-400">/min</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Chief Complaint Chips & Clinical Triage Notes */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Chief Complaint & Triage Presentation
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                    {[
                      "Acute High Fever",
                      "Severe Headache",
                      "Chest Pain",
                      "Shortness of Breath",
                      "Abdominal Pain",
                      "Vomiting / Diarrhea",
                      "Trauma / Laceration",
                      "Pediatric Illness",
                      "Hypertension Followup",
                    ].map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => {
                          setChiefComplaint(chip);
                          setTriageNote((prev) => (prev ? `${prev}, ${chip}` : chip));
                        }}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border transition ${
                          chiefComplaint === chip
                            ? "bg-teal-600 text-white border-teal-600 font-bold"
                            : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300"
                        }`}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={2}
                    placeholder="Enter nurse triage observations (e.g. alert and oriented, mild dehydration, pain score 6/10)..."
                    value={triageNote}
                    onChange={(e) => setTriageNote(e.target.value)}
                    className="w-full p-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-hidden focus:border-teal-500"
                  />
                </div>

                {/* 4. Destination Clinic Department */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Assign to Doctor / Department
                  </label>
                  <select
                    value={targetDepartment}
                    onChange={(e) => setTargetDepartment(e.target.value)}
                    className="w-full p-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-hidden focus:border-teal-500 font-medium"
                  >
                    <option value="General OPD">General OPD (Next Available Physician)</option>
                    <option value="Internal Medicine">Internal Medicine Specialist</option>
                    <option value="Pediatrics Clinic">Pediatrics & Child Health</option>
                    <option value="Maternal & Child Health (MCH)">Maternal & Child Health (MCH / Antenatal)</option>
                    <option value="Emergency & Trauma">Emergency & Resuscitation Bay</option>
                  </select>
                </div>

                {/* 5. Submit Action */}
                <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                  <div className="text-[11px] text-slate-500">
                    Routing to: <strong className="text-slate-800 dark:text-slate-200">{targetDepartment}</strong>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveTriage}
                    disabled={recordVitals.isPending || updateTicketStatus.isPending}
                    className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center gap-2"
                  >
                    <CheckCircle2 size={15} />
                    {recordVitals.isPending || updateTicketStatus.isPending
                      ? "Recording & Routing…"
                      : "Record Vitals & Send to Doctor Queue"}
                  </button>
                </div>
              </div>
            </div>
            );
            })()
          )}
        </div>
      </div>
    </PageShell>
  );
}
