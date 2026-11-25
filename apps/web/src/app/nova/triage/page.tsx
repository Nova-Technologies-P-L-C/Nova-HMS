"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "@tanstack/react-query";
import { trpc, queryClient } from "@/utils/trpc";
import { PageShell } from "@/components/nova/nova-ui";
import { getDepartmentConfig, ALL_DEPARTMENTS } from "@/lib/department-configs";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Bed,
  CheckCircle2,
  Clock,
  Heart,
  RefreshCw,
  Search,
  ShieldAlert,
  Stethoscope,
  Thermometer,
  Users,
  Wind,
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

  let sex: "M" | "F" | "—" = "—";
  const rawSex = (p.sex || "").trim().toLowerCase();
  if (rawSex.startsWith("m")) sex = "M";
  else if (rawSex.startsWith("f")) sex = "F";

  return {
    nameEn: p.nameEn || "Patient",
    healthId: p.healthId || "—",
    sex,
    age,
    phone: p.phone || "",
    cbhiStatus: !!p.cbhiStatus,
  };
}

export default function TriageStationPage() {
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState<"all" | "urgent" | "waiting">("all");

  // Selected Patient for Full-Page Triage
  const [activeItem, setActiveItem] = useState<any | null>(null);

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
  const [targetDepartment, setTargetDepartment] = useState("General OPD & Internal Medicine");
  const [selectedDoctor, setSelectedDoctor] = useState<{ id: string; name: string } | null>(null);
  const [successMessage, setSuccessMessage] = useState("");

  // Live Queue Query
  const { data: queue = [], isLoading: isQueueLoading, refetch: refetchQueue, isFetching } = useQuery({
    ...trpc.visit.queue.queryOptions(),
    refetchInterval: 10_000,
  });

  // Live Doctor Roster Query (shown directly inside the assign dropdown)
  const { data: presenceData } = useQuery({
    ...trpc.doctor.listPresence.queryOptions(),
    refetchInterval: 15_000,
  });

  const allRosterDoctors = presenceData?.roster || [];

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

  // Auto-calculated BMI
  const calculatedBmi = useMemo(() => {
    const w = parseFloat(vitals.weight);
    const h = parseFloat(vitals.height) / 100;
    if (w > 0 && h > 0) {
      const val = w / (h * h);
      let cat = "Normal";
      if (val < 18.5) cat = "Underweight";
      else if (val >= 25 && val < 30) cat = "Overweight";
      else if (val >= 30) cat = "Obese";
      return { val: val.toFixed(1), cat };
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

  const handleOpenTriage = (item: any) => {
    setActiveItem(item);
    setAcuity(item.status === "urgent" ? "emergency" : "routine");
    setChiefComplaint("");
    setTriageNote("");
    if (item.department && item.department !== "OPD") {
      setTargetDepartment(
        item.department.toLowerCase().includes("emerg")
          ? "Emergency & Trauma"
          : getDepartmentConfig(item.department).name
      );
    } else {
      setTargetDepartment("General OPD & Internal Medicine");
    }
    setSelectedDoctor(
      item.assignedDoctorId && item.assignedDoctorName
        ? { id: item.assignedDoctorId, name: item.assignedDoctorName }
        : null
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCloseTriage = () => {
    setActiveItem(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSaveTriage = async () => {
    if (!activeItem) return;
    setSuccessMessage("");

    try {
      await recordVitals.mutateAsync({
        visitId: activeItem.visitId,
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
        status: (acuity === "emergency" || acuity === "priority" ? "urgent" : "waiting") as "urgent" | "waiting",
        department: targetDepartment,
        assignedDoctorId: selectedDoctor?.id ?? null,
        assignedDoctorName: selectedDoctor?.name ?? null,
      });

      queryClient.invalidateQueries({ queryKey: trpc.doctor.listPresence.queryKey() });

      const activePatient = getPatientInfo(activeItem);
      setSuccessMessage(
        selectedDoctor
          ? `${activePatient.nameEn} (#${activeItem.ticketNumber}) assigned to ${selectedDoctor.name} (${targetDepartment}).`
          : `${activePatient.nameEn} (#${activeItem.ticketNumber}) routed to ${targetDepartment} (Next available doctor).`
      );
      setTimeout(() => setSuccessMessage(""), 5000);

      setActiveItem(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      console.error("Triage error:", err);
    }
  };

  const urgentCount = queue.filter((q) => q.status === "urgent").length;
  const waitingCount = queue.filter((q) => q.status === "waiting" || q.status === "urgent").length;

  // -------------------------------------------------------------
  // VIEW 1: UNIFIED SINGLE-PAGE TRIAGE INTAKE (Spacious & Ergonomic)
  // -------------------------------------------------------------
  if (activeItem) {
    const activePatient = getPatientInfo(activeItem);
    const isUrgent = activeItem.status === "urgent";

    return (
      <PageShell
        title={`Triage: ${activePatient.nameEn}`}
        subtitle={`Ticket #${activeItem.ticketNumber} • ${activePatient.healthId}`}
        action={
          <button
            onClick={handleCloseTriage}
            className="group px-4 py-2 text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-teal-50 dark:hover:bg-slate-700 hover:text-teal-700 hover:border-teal-300 transition-all flex items-center gap-2.5 shadow-xs cursor-pointer"
          >
            {/* Infinite slow moving arrow */}
            <span className="flex items-center text-teal-600 animate-slow-glide">
              <ArrowLeft size={16} />
            </span>
            <span>Back to Queue</span>
          </button>
        }
      >
        {/* CSS for infinite slow gliding arrow */}
        <style>{`
          @keyframes slowGlideLeft {
            0%, 100% {
              transform: translateX(0);
            }
            50% {
              transform: translateX(-6px);
            }
          }
          .animate-slow-glide {
            animation: slowGlideLeft 1.8s ease-in-out infinite;
          }
        `}</style>

        {/* ONE UNIFIED FULL-PAGE CARD with Generous Vertical Breathing Room */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden animate-in fade-in duration-200 mb-8">
          {/* Unified Header: Patient Info Strip */}
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-3.5">
              <span className="px-3 py-1.5 rounded-xl font-mono font-black text-sm bg-teal-600 text-white shadow-xs">
                #{activeItem.ticketNumber}
              </span>
              <span className="font-black text-slate-900 dark:text-white text-lg">
                {activePatient.nameEn}
              </span>
              <span className="text-slate-300 dark:text-slate-700 text-sm">|</span>
              <span className="font-mono text-slate-600 dark:text-slate-300 font-semibold text-xs">
                ID: {activePatient.healthId}
              </span>
              <span className="text-slate-300 dark:text-slate-700 text-sm">|</span>
              <span className="text-slate-600 dark:text-slate-300 font-medium text-xs">
                Age: {activePatient.age !== "—" ? `${activePatient.age} yrs` : "—"}
              </span>
              <span className="text-slate-300 dark:text-slate-700 text-sm">|</span>
              <span
                className={`px-2.5 py-0.5 rounded-md font-black text-xs ${
                  activePatient.sex === "M"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                    : activePatient.sex === "F"
                    ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                Sex: {activePatient.sex}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {isUrgent ? (
                <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-100 text-rose-700 animate-pulse">
                  Urgent Case
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                  Standard OPD
                </span>
              )}
            </div>
          </div>

          {/* Spacious Unified Body with Generous Vertical Gaps */}
          <div className="p-6 sm:p-8 space-y-8">
            {/* 1. Acuity Stratification */}
            <div className="space-y-3">
              <div>
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  1. Clinical Acuity Stratification (MoH / SATS)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select triage urgency level to prioritize the doctor consultation queue.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                <button
                  type="button"
                  onClick={() => setAcuity("routine")}
                  className={`p-4 rounded-xl border text-left transition flex items-start gap-3.5 ${
                    acuity === "routine"
                      ? "border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-400/40 font-bold shadow-xs"
                      : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                  }`}
                >
                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-bold">Routine (Green)</div>
                    <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      Standard walk-in. Patient is stable for standard OPD queue.
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setAcuity("priority")}
                  className={`p-4 rounded-xl border text-left transition flex items-start gap-3.5 ${
                    acuity === "priority"
                      ? "border-amber-500 bg-amber-50/80 dark:bg-amber-950/40 text-amber-950 dark:text-amber-100 ring-2 ring-amber-400/40 font-bold shadow-xs"
                      : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                  }`}
                >
                  <span className="w-3.5 h-3.5 rounded-full bg-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-bold">Urgent (Yellow)</div>
                    <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      Acute pain, fever, or distress. Accelerated medical review.
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setAcuity("emergency")}
                  className={`p-4 rounded-xl border text-left transition flex items-start gap-3.5 ${
                    acuity === "emergency"
                      ? "border-rose-500 bg-rose-50/80 dark:bg-rose-950/40 text-rose-950 dark:text-rose-100 ring-2 ring-rose-400/40 font-bold shadow-xs"
                      : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                  }`}
                >
                  <span className="w-3.5 h-3.5 rounded-full bg-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-bold">Emergency (Red)</div>
                    <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      Immediate resuscitation. Urgent doctor intervention needed.
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* 2. Vital Signs Measurements */}
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    2. Vital Signs Measurements
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Enter patient clinical measurements for the medical chart.
                  </p>
                </div>

                {calculatedBmi && (
                  <span className="text-xs font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 px-3 py-1 rounded-xl border border-teal-200 dark:border-teal-800 shadow-xs">
                    Calculated BMI: <strong>{calculatedBmi.val}</strong> kg/m² ({calculatedBmi.cat})
                  </span>
                )}
              </div>

              {/* 4 columns x 2 rows for comfortable vertical space and readability */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
                {/* BP Systolic */}
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                  <div className="text-xs text-slate-500 font-semibold flex items-center gap-1.5 mb-1.5">
                    <Activity size={13} className="text-blue-500" /> BP Systolic
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={vitals.bpSystolic}
                      onChange={(e) => setVitals({ ...vitals, bpSystolic: e.target.value })}
                      className="w-full text-lg font-black bg-transparent focus:outline-hidden font-mono"
                    />
                    <span className="text-xs font-bold text-slate-400">mmHg</span>
                  </div>
                </div>

                {/* BP Diastolic */}
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                  <div className="text-xs text-slate-500 font-semibold flex items-center gap-1.5 mb-1.5">
                    <Activity size={13} className="text-blue-500" /> BP Diastolic
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={vitals.bpDiastolic}
                      onChange={(e) => setVitals({ ...vitals, bpDiastolic: e.target.value })}
                      className="w-full text-lg font-black bg-transparent focus:outline-hidden font-mono"
                    />
                    <span className="text-xs font-bold text-slate-400">mmHg</span>
                  </div>
                </div>

                {/* Heart Rate */}
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                  <div className="text-xs text-slate-500 font-semibold flex items-center gap-1.5 mb-1.5">
                    <Heart size={13} className="text-rose-500" /> Heart Rate (Pulse)
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={vitals.heartRate}
                      onChange={(e) => setVitals({ ...vitals, heartRate: e.target.value })}
                      className="w-full text-lg font-black bg-transparent focus:outline-hidden font-mono"
                    />
                    <span className="text-xs font-bold text-slate-400">bpm</span>
                  </div>
                </div>

                {/* Temperature */}
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                  <div className="text-xs text-slate-500 font-semibold flex items-center gap-1.5 mb-1.5">
                    <Thermometer size={13} className="text-amber-500" /> Temperature
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={vitals.temperature}
                      onChange={(e) => setVitals({ ...vitals, temperature: e.target.value })}
                      className="w-full text-lg font-black bg-transparent focus:outline-hidden font-mono"
                    />
                    <span className="text-xs font-bold text-slate-400">°C</span>
                  </div>
                </div>

                {/* SpO2 */}
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                  <div className="text-xs text-slate-500 font-semibold flex items-center gap-1.5 mb-1.5">
                    <Wind size={13} className="text-teal-500" /> Oxygen Sat (SpO2)
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={vitals.spo2}
                      onChange={(e) => setVitals({ ...vitals, spo2: e.target.value })}
                      className="w-full text-lg font-black bg-transparent focus:outline-hidden font-mono"
                    />
                    <span className="text-xs font-bold text-slate-400">%</span>
                  </div>
                </div>

                {/* Respiratory Rate */}
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                  <div className="text-xs text-slate-500 font-semibold mb-1.5">Respiratory Rate</div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={vitals.respiratoryRate}
                      onChange={(e) => setVitals({ ...vitals, respiratoryRate: e.target.value })}
                      className="w-full text-lg font-black bg-transparent focus:outline-hidden font-mono"
                    />
                    <span className="text-xs font-bold text-slate-400">/min</span>
                  </div>
                </div>

                {/* Weight */}
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                  <div className="text-xs text-slate-500 font-semibold mb-1.5">Weight</div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={vitals.weight}
                      onChange={(e) => setVitals({ ...vitals, weight: e.target.value })}
                      className="w-full text-lg font-black bg-transparent focus:outline-hidden font-mono"
                    />
                    <span className="text-xs font-bold text-slate-400">kg</span>
                  </div>
                </div>

                {/* Height */}
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                  <div className="text-xs text-slate-500 font-semibold mb-1.5">Height</div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={vitals.height}
                      onChange={(e) => setVitals({ ...vitals, height: e.target.value })}
                      className="w-full text-lg font-black bg-transparent focus:outline-hidden font-mono"
                    />
                    <span className="text-xs font-bold text-slate-400">cm</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Chief Complaint & Routing */}
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Complaint & Notes (7 cols) */}
              <div className="lg:col-span-7 space-y-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    3. Chief Complaint & Triage Presentation
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Tap key symptoms or enter nurse clinical notes.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {[
                    "Acute Fever",
                    "Severe Headache",
                    "Chest Pain",
                    "Shortness of Breath",
                    "Abdominal Pain",
                    "Vomiting / Diarrhea",
                    "Trauma / Injury",
                    "Persistent Cough",
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => {
                        setChiefComplaint(chip);
                        setTriageNote((prev) => (prev ? `${prev}, ${chip}` : chip));
                      }}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition ${
                        chiefComplaint === chip
                          ? "bg-teal-600 text-white border-teal-600 font-bold shadow-xs"
                          : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300"
                      }`}
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={3}
                  placeholder="Clinical observation notes (e.g. patient alert and oriented, mild dehydration, pain score 5/10)..."
                  value={triageNote}
                  onChange={(e) => setTriageNote(e.target.value)}
                  className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:border-teal-500 leading-relaxed"
                />
              </div>

              {/* Single Unified Clinic & Doctor Assignment Dropdown (5 cols) */}
              <div className="lg:col-span-5 space-y-2.5">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    4. Route to Clinic / Doctor
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Pick a clinic queue or a specific doctor.
                  </p>
                </div>

                <div>
                  <select
                    value={
                      selectedDoctor
                        ? `doc::${targetDepartment}::${selectedDoctor.id}`
                        : `dept::${targetDepartment}`
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.startsWith("dept::")) {
                        setTargetDepartment(val.slice(6));
                        setSelectedDoctor(null);
                      } else if (val.startsWith("doc::")) {
                        const [, deptName, docId] = val.split("::");
                        const found = allRosterDoctors.find((d: any) => (d.userId || d.id) === docId);
                        if (deptName) setTargetDepartment(deptName);
                        if (found && docId) {
                          setSelectedDoctor({ id: docId, name: found.name });
                        }
                      }
                    }}
                    className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:border-teal-500 font-semibold"
                  >
                    {ALL_DEPARTMENTS.map((dept) => {
                      const deptDocs = allRosterDoctors.filter(
                        (d: any) => getDepartmentConfig(d.department).id === dept.id
                      );
                      return (
                        <optgroup key={dept.id} label={`── ${dept.name} ──`}>
                          <option value={`dept::${dept.name}`}>
                            {`${dept.shortLabel}  |  Any Available Doctor`}
                          </option>
                          {deptDocs.map((doc: any) => {
                            const docId = doc.userId || doc.id;
                            const statusWord =
                              doc.status === "available"
                                ? "Ready"
                                : doc.status === "in-consultation"
                                ? "In Consult"
                                : doc.status === "on-break"
                                ? "On Break"
                                : "Off Duty";
                            return (
                              <option key={docId} value={`doc::${dept.name}::${docId}`}>
                                {`${doc.name}  |  ${statusWord}  |  ${doc.waitingCount} waiting`}
                              </option>
                            );
                          })}
                        </optgroup>
                      );
                    })}
                    <optgroup label="── Emergency ──">
                      <option value="dept::Emergency & Trauma">
                        Emergency  |  Resuscitation Bay
                      </option>
                    </optgroup>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Unified Card Footer: Actions */}
          <div className="px-6 py-4.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={handleCloseTriage}
              className="px-5 py-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Cancel & Return
            </button>

            <button
              type="button"
              onClick={handleSaveTriage}
              disabled={recordVitals.isPending || updateTicketStatus.isPending}
              className="px-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 size={16} />
              <span>
                {recordVitals.isPending || updateTicketStatus.isPending
                  ? "Recording & Routing…"
                  : "Record Vitals & Send to Doctor Queue"}
              </span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </PageShell>
    );
  }

  // -------------------------------------------------------------
  // VIEW 2: FULL PATIENT TRIAGE QUEUE BOARD (Default View)
  // -------------------------------------------------------------
  return (
    <PageShell
      title="Triage Station"
      subtitle="Outpatient Acuity Stratification & Vitals Intake"
      action={
        <div className="flex items-center gap-2">
          <Link
            href={"/nova/nurse" as any}
            className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 transition flex items-center gap-1.5 shadow-xs"
          >
            <Bed size={13} className="text-emerald-600" />
            <span>Inpatient Care</span>
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
      {/* Minimized Triage Status Strip */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 mb-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs divide-x divide-slate-100 dark:divide-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse" />
            <span className="text-slate-500 font-medium">Awaiting:</span>
            <span className="font-black text-slate-900 dark:text-white text-sm">
              {isQueueLoading ? "…" : waitingCount}
            </span>
          </div>

          <div className="pl-4 sm:pl-6 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className="text-slate-500 font-medium">Urgent:</span>
            <span className="font-black text-rose-600 text-sm">
              {isQueueLoading ? "…" : urgentCount}
            </span>
          </div>

          <div className="pl-4 sm:pl-6 flex items-center gap-2 hidden md:flex">
            <Activity size={13} className="text-blue-500" />
            <span className="text-slate-500 font-medium">Scale:</span>
            <span className="font-bold text-slate-700 dark:text-slate-200">MoH / SATS</span>
          </div>

          <div className="pl-4 sm:pl-6 flex items-center gap-2 hidden lg:flex">
            <Users size={13} className="text-emerald-600" />
            <span className="text-slate-500 font-medium">Doctors Ready:</span>
            <span className="font-bold text-emerald-700 dark:text-emerald-400">
              {presenceData?.summary?.availableCount ?? "—"}
            </span>
          </div>
        </div>

        <div className="text-xs text-slate-400 font-medium">
          Desk 1 • Reception Intake
        </div>
      </div>

      {/* Success Banner */}
      {successMessage && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 mb-3 animate-in fade-in">
          <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Main Full-Width Patient Triage Queue Table */}
      <div className="space-y-3">
        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search ticket #, name, or health ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-hidden focus:border-teal-500 shadow-xs"
            />
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs">
            <button
              onClick={() => setFilterPriority("all")}
              className={`px-3 py-1 rounded-md font-semibold transition ${
                filterPriority === "all"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              All Waiting ({waitingCount})
            </button>
            <button
              onClick={() => setFilterPriority("urgent")}
              className={`px-3 py-1 rounded-md font-semibold transition ${
                filterPriority === "urgent"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-rose-600"
              }`}
            >
              Urgent ({urgentCount})
            </button>
            <button
              onClick={() => setFilterPriority("waiting")}
              className={`px-3 py-1 rounded-md font-semibold transition ${
                filterPriority === "waiting"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Routine
            </button>
          </div>
        </div>

        {/* Patient Table with Sex (M / F) column */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Ticket & Patient</th>
                  <th className="py-2.5 px-4">Health ID</th>
                  <th className="py-2.5 px-4">Age</th>
                  <th className="py-2.5 px-4 text-center">Sex</th>
                  <th className="py-2.5 px-4">Wait Time</th>
                  <th className="py-2.5 px-4">Priority</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredQueue.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <Users size={28} className="mx-auto text-slate-300 dark:text-slate-600 mb-1.5" />
                      <p className="font-semibold text-slate-600 dark:text-slate-300">
                        No patients awaiting triage right now
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredQueue.map((item: any) => {
                    const patient = getPatientInfo(item);
                    const isUrgent = item.status === "urgent";
                    const isVip = (item as any).tier === "vip" || (item.ticketNumber || "").startsWith("V");

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                      >
                        {/* Ticket & Name */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`px-2 py-0.5 rounded-lg font-mono font-black text-xs ${
                                isUrgent
                                  ? "bg-rose-100 text-rose-800 border border-rose-200"
                                  : isVip
                                  ? "bg-amber-100 text-amber-900 border border-amber-300"
                                  : "bg-teal-100 text-teal-800 border border-teal-200"
                              }`}
                            >
                              #{item.ticketNumber}
                            </span>
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <span>{patient.nameEn}</span>
                                {isVip && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded font-black bg-amber-100 text-amber-900 border border-amber-300">
                                    ⭐ VIP
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Health ID */}
                        <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300 font-medium">
                          {patient.healthId}
                        </td>

                        {/* Age */}
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-semibold">
                          {patient.age !== "—" ? `${patient.age}y` : "—"}
                        </td>

                        {/* Sex: M or F badge */}
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-md font-black text-xs ${
                              patient.sex === "M"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                                : patient.sex === "F"
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                            }`}
                          >
                            {patient.sex}
                          </span>
                        </td>

                        {/* Wait Time */}
                        <td className="py-3 px-4 text-slate-500">
                          {item.waitMinutes ? `${item.waitMinutes} min` : "< 1 min"}
                        </td>

                        {/* Priority Status */}
                        <td className="py-3 px-4">
                          {isUrgent ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-700 border border-rose-300 animate-pulse">
                              <ShieldAlert size={10} /> Urgent
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Routine
                            </span>
                          )}
                        </td>

                        {/* Action Button */}
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenTriage(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold text-xs shadow-xs transition hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                          >
                            <Stethoscope size={13} />
                            <span>Triage</span>
                            <ArrowRight size={12} />
                          </button>
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
