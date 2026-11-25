"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { PageShell, inputCls, btnPrimary, btnSecondary } from "@/components/nova/nova-ui";
import {
  Bed,
  User,
  Heart,
  Activity,
  Thermometer,
  Wind,
  Pill,
  FileText,
  Search,
  Plus,
  X,
  Check,
  CheckCircle2,
  ArrowRight,
  Stethoscope,
  LogOut,
  Clock,
  Filter,
  UserCheck,
  AlertTriangle,
  LayoutGrid,
  ListFilter,
  RefreshCw,
  Sparkles,
  Phone,
  Shield,
  Building2,
  Gauge,
  Calendar,
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

export default function NurseDashboard() {
  const qc = useQueryClient();
  const [viewMode, setViewMode] = useState<"census" | "floorplan">("census");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWard, setSelectedWard] = useState<string>("All");

  // Modals state
  const [dischargeTarget, setDischargeTarget] = useState<any | null>(null);
  const [dischargeCondition, setDischargeCondition] = useState("Recovered / Improved");

  const [vitalsTarget, setVitalsTarget] = useState<any | null>(null);
  const [vitalsForm, setVitalsForm] = useState({
    bpSystolic: "120",
    bpDiastolic: "80",
    heartRate: "78",
    temperature: "36.8",
    spo2: "98",
    weight: "",
    height: "",
  });

  const [nurseAssignTarget, setNurseAssignTarget] = useState<any | null>(null);
  const [selectedNurseId, setSelectedNurseId] = useState("");

  // Query active admissions
  const {
    data: admissions = [],
    isLoading: isAdmissionsLoading,
    refetch: refetchAdmissions,
    isRefetching: isAdmissionsRefetching,
  } = useQuery({
    ...trpc.ward.admissions.queryOptions(),
    refetchOnMount: true,
  });

  // Query beds for capacity & floorplan
  const { data: beds = [], refetch: refetchBeds } = useQuery({
    ...trpc.ward.beds.queryOptions(),
    refetchOnMount: true,
  });

  // Query nurses for shift assignment
  const { data: nurses = [] } = useQuery({
    ...trpc.ward.nurses.queryOptions(),
    refetchOnMount: true,
  });

  // Discharge mutation
  const dischargeMutation = useMutation(
    trpc.ward.discharge.mutationOptions({
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: trpc.ward.admissions.queryKey() });
        qc.invalidateQueries({ queryKey: trpc.ward.beds.queryKey() });
        setDischargeTarget(null);
        toast.success("Patient discharged and bed marked free");
      },
      onError: (err) => {
        toast.error(err.message || "Failed to discharge patient");
      },
    })
  );

  // Vitals mutation
  const recordVitalsMutation = useMutation(
    trpc.visit.recordVitals.mutationOptions({
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: trpc.ward.admissions.queryKey() });
        setVitalsTarget(null);
        toast.success("Bedside vitals recorded successfully");
      },
      onError: (err) => {
        toast.error(err.message || "Failed to save vitals");
      },
    })
  );

  // Nurse assignment mutation
  const assignNurseMutation = useMutation(
    trpc.ward.assignNurse.mutationOptions({
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: trpc.ward.admissions.queryKey() });
        setNurseAssignTarget(null);
        toast.success("Duty nurse updated successfully");
      },
      onError: (err) => {
        toast.error(err.message || "Failed to assign nurse");
      },
    })
  );

  // Bed status mutation (e.g. maintenance -> available)
  const updateBedStatusMutation = useMutation(
    trpc.ward.updateBedStatus.mutationOptions({
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: trpc.ward.beds.queryKey() });
        toast.success("Bed status updated to Available");
      },
      onError: (err) => {
        toast.error(err.message || "Failed to update bed status");
      },
    })
  );

  // Wards list
  const wards = useMemo(() => {
    const list = Array.from(new Set(beds.map((b) => b.ward).filter(Boolean)));
    return ["All", ...list];
  }, [beds]);

  // Statistics
  const totalBeds = beds.length;
  const occupiedBeds = admissions.length;
  const availableBeds = beds.filter((b) => b.status === "available").length;
  const maintenanceBeds = beds.filter((b) => b.status === "maintenance").length;
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  // Filtered admissions for census list
  const filteredAdmissions = useMemo(() => {
    return admissions.filter((a) => {
      const matchesWard = selectedWard === "All" || a.bed?.ward === selectedWard;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        a.patient?.nameEn?.toLowerCase().includes(q) ||
        a.patient?.nameAm?.includes(q) ||
        a.patient?.healthId?.toLowerCase().includes(q) ||
        a.bed?.room?.toLowerCase().includes(q) ||
        a.bed?.ward?.toLowerCase().includes(q);

      return matchesWard && matchesSearch;
    });
  }, [admissions, selectedWard, searchQuery]);

  // Filtered beds for floorplan view
  const filteredBeds = useMemo(() => {
    return beds.filter((b) => {
      const matchesWard = selectedWard === "All" || b.ward === selectedWard;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchesWard;

      const admission = b.admissions?.[0];
      const matchesSearch =
        b.room?.toLowerCase().includes(q) ||
        b.ward?.toLowerCase().includes(q) ||
        admission?.patient?.nameEn?.toLowerCase().includes(q) ||
        admission?.patient?.healthId?.toLowerCase().includes(q);

      return matchesWard && matchesSearch;
    });
  }, [beds, selectedWard, searchQuery]);

  const handleOpenVitalsModal = (admission: any) => {
    const latest = admission.visit?.vitals?.[0];
    setVitalsForm({
      bpSystolic: latest?.bpSystolic ? String(latest.bpSystolic) : "120",
      bpDiastolic: latest?.bpDiastolic ? String(latest.bpDiastolic) : "80",
      heartRate: latest?.heartRate ? String(latest.heartRate) : "78",
      temperature: latest?.temperature ? String(latest.temperature) : "36.8",
      spo2: latest?.spo2 ? String(latest.spo2) : "98",
      weight: latest?.weight ? String(latest.weight) : "",
      height: latest?.height ? String(latest.height) : "",
    });
    setVitalsTarget(admission);
  };

  const handleSaveVitals = async () => {
    if (!vitalsTarget?.visitId) {
      toast.error("No active visit linked to this admission. Please contact admin.");
      return;
    }
    await recordVitalsMutation.mutateAsync({
      visitId: vitalsTarget.visitId,
      bpSystolic: vitalsForm.bpSystolic ? Number(vitalsForm.bpSystolic) : undefined,
      bpDiastolic: vitalsForm.bpDiastolic ? Number(vitalsForm.bpDiastolic) : undefined,
      heartRate: vitalsForm.heartRate ? Number(vitalsForm.heartRate) : undefined,
      temperature: vitalsForm.temperature ? Number(vitalsForm.temperature) : undefined,
      spo2: vitalsForm.spo2 ? Number(vitalsForm.spo2) : undefined,
      weight: vitalsForm.weight ? Number(vitalsForm.weight) : undefined,
      height: vitalsForm.height ? Number(vitalsForm.height) : undefined,
    });
  };

  const handleOpenNurseModal = (admission: any) => {
    setNurseAssignTarget(admission);
    setSelectedNurseId(admission.assignedNurseId || "");
  };

  const handleSaveNurse = async () => {
    if (!nurseAssignTarget) return;
    const nurse = nurses.find((n) => n.id === selectedNurseId);
    if (!nurse) {
      toast.error("Please choose a nurse");
      return;
    }
    await assignNurseMutation.mutateAsync({
      admissionId: nurseAssignTarget.id,
      assignedNurseId: nurse.id,
      assignedNurseName: nurse.name,
    });
  };

  const handleConfirmDischarge = async () => {
    if (!dischargeTarget) return;
    await dischargeMutation.mutateAsync({
      admissionId: dischargeTarget.id,
      dischargeCondition,
    });
  };

  return (
    <PageShell
      title="Ward Dashboard"
      subtitle="Inpatient bed occupancy, bedside vitals monitoring, medication rounds, and shift care"
      action={
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              refetchAdmissions();
              refetchBeds();
            }}
            disabled={isAdmissionsRefetching}
            className="p-2 text-xs font-medium rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-xs"
            title="Refresh bed data"
          >
            <RefreshCw size={14} className={isAdmissionsRefetching ? "animate-spin text-teal-600" : ""} />
          </button>

          <Link
            href="/nova/nurse/mar"
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Pill size={14} className="text-teal-600" />
            <span>Give Medicines</span>
          </Link>

          <Link
            href="/nova/nurse/notes"
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <FileText size={14} className="text-blue-600" />
            <span>Shift Notes</span>
          </Link>

          <Link
            href="/nova/ward/admissions"
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-teal-600 hover:bg-teal-500 text-white transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Plus size={14} />
            <span>Admit Patient</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-4 pb-12 w-full max-w-[1600px] mx-auto">
        {/* ── 1. PRO WARD KPI SUMMARY CARDS ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Admitted Inpatients */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Admitted Patients
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold text-slate-900 dark:text-white">
                    {occupiedBeds}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    in beds now
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                <User size={18} />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-teal-700 dark:text-teal-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Active nursing care underway</span>
            </div>
          </div>

          {/* Available Free Beds */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Available Beds
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {availableBeds}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    / {totalBeds} total
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Bed size={18} />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>Ready for new admission</span>
              {maintenanceBeds > 0 && (
                <span className="text-amber-600 font-medium">{maintenanceBeds} cleaning</span>
              )}
            </div>
          </div>

          {/* Bed Occupancy Rate */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Bed Occupancy
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold text-slate-900 dark:text-white">
                    {occupancyRate}%
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    capacity
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Activity size={18} />
              </div>
            </div>
            {/* Visual occupancy bar */}
            <div className="mt-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  occupancyRate >= 85
                    ? "bg-rose-500"
                    : occupancyRate >= 65
                    ? "bg-amber-500"
                    : "bg-teal-500"
                }`}
                style={{ width: `${Math.min(100, occupancyRate)}%` }}
              />
            </div>
          </div>

          {/* Shift Duty Quick Link */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Duty Staff & Medicines
                </p>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">
                  {nurses.length} Nurses on Roster
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <Pill size={18} />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <Link
                href="/nova/nurse/mar"
                className="font-medium text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
              >
                <span>Give Meds</span>
                <ArrowRight size={12} />
              </Link>
              <Link
                href="/nova/ward"
                className="font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
              >
                <span>Bed Map</span>
                <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </div>

        {/* ── 2. SEARCH, WARD FILTER & VIEW SWITCHER TOOLBAR ── */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Left: Search input */}
          <div className="relative flex-1 max-w-md">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search by patient name, ID, bed room, or ward..."
              className={`${inputCls} pl-9 pr-8 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Center: Ward tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-thin">
            {wards.map((ward) => {
              const count =
                ward === "All"
                  ? admissions.length
                  : admissions.filter((a) => a.bed?.ward === ward).length;
              const isActive = selectedWard === ward;
              return (
                <button
                  key={ward}
                  onClick={() => setSelectedWard(ward)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
                    isActive
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  <span>{ward === "All" ? "All Wards" : ward}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isActive
                        ? "bg-white/20 dark:bg-slate-900/20 text-white dark:text-slate-900"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right: View mode toggle (Census List vs Floorplan Grid) */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg shrink-0">
            <button
              onClick={() => setViewMode("census")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors ${
                viewMode === "census"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <ListFilter size={13} />
              <span>Census List</span>
            </button>
            <button
              onClick={() => setViewMode("floorplan")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors ${
                viewMode === "floorplan"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <LayoutGrid size={13} />
              <span>Bed Map</span>
            </button>
          </div>
        </div>

        {/* ── 3. MAIN VIEW: INPATIENT CENSUS TABLE ── */}
        {viewMode === "census" && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                  Inpatient Bed Census ({filteredAdmissions.length})
                </h3>
              </div>
              <span className="text-xs text-slate-400">
                {selectedWard === "All" ? "Across all clinic wards" : selectedWard}
              </span>
            </div>

            {isAdmissionsLoading ? (
              <div className="p-12 text-center text-slate-400 text-sm">
                Loading inpatient census…
              </div>
            ) : filteredAdmissions.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                  <Bed size={22} />
                </div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {searchQuery || selectedWard !== "All"
                    ? "No admitted patients match your filter"
                    : "No patients currently admitted to beds"}
                </p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Admit a patient from emergency, doctor orders, or the OPD queue.
                </p>
                <Link
                  href="/nova/ward/admissions"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-500 transition-colors shadow-xs"
                >
                  <Plus size={13} /> Admit Patient
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Bed / Ward</th>
                      <th className="py-3 px-4">Patient Information</th>
                      <th className="py-3 px-4">Admission Stay</th>
                      <th className="py-3 px-4">Latest Bedside Vitals</th>
                      <th className="py-3 px-4">Assigned Nurse</th>
                      <th className="py-3 px-4 text-right">Bedside Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredAdmissions.map((a: any) => {
                      const latestVital = a.visit?.vitals?.[0];
                      const patient = a.patient;
                      const bed = a.bed;

                      // Clinical alert cues
                      const hasFever = latestVital?.temperature && latestVital.temperature >= 38.0;
                      const hasLowOxygen = latestVital?.spo2 && latestVital.spo2 < 95;
                      const hasHighBp =
                        latestVital?.bpSystolic &&
                        (latestVital.bpSystolic >= 140 || latestVital.bpDiastolic >= 90);

                      return (
                        <tr
                          key={a.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          {/* Bed & Ward */}
                          <td className="py-3.5 px-4 align-middle">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-lg bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 flex items-center justify-center text-teal-700 dark:text-teal-300 font-mono font-bold text-xs shrink-0">
                                {bed?.room || "Bed"}
                              </div>
                              <div>
                                <span className="font-bold text-slate-800 dark:text-slate-100 block">
                                  Bed {bed?.room}
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  {bed?.ward || "General Ward"}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Patient Info */}
                          <td className="py-3.5 px-4 align-middle">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                                  {patient?.nameEn || "Patient"}
                                </span>
                                {patient?.nameAm && (
                                  <span className="text-xs text-slate-400">
                                    ({patient.nameAm})
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                                <span className="font-mono text-slate-500 font-medium">
                                  ID: {patient?.healthId || "—"}
                                </span>
                                <span>•</span>
                                <span>
                                  {patient?.sex?.toUpperCase() === "M"
                                    ? "Male"
                                    : patient?.sex?.toUpperCase() === "F"
                                    ? "Female"
                                    : "—"}{" "}
                                  · {calculateAge(patient?.dob)}
                                </span>
                                {patient?.phone && (
                                  <>
                                    <span>•</span>
                                    <span className="flex items-center gap-0.5">
                                      <Phone size={10} className="text-slate-400" />
                                      {patient.phone}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Stay Duration */}
                          <td className="py-3.5 px-4 align-middle">
                            <div>
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold text-[11px] ${
                                  a.daysElapsed === 1
                                    ? "bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                }`}
                              >
                                <Clock size={11} className="text-slate-400" /> Day {a.daysElapsed || 1}
                              </span>
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                Admitted {new Date(a.admittedAt).toLocaleDateString()}
                              </span>
                            </div>
                          </td>

                          {/* Latest Vitals Snapshot */}
                          <td className="py-3.5 px-4 align-middle">
                            {latestVital ? (
                              <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                                {latestVital.bpSystolic && latestVital.bpDiastolic && (
                                  <span
                                    className={`px-1.5 py-0.5 rounded border font-medium ${
                                      hasHighBp
                                        ? "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300"
                                        : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                                    }`}
                                    title={hasHighBp ? "Elevated Blood Pressure" : "Blood Pressure"}
                                  >
                                    BP {latestVital.bpSystolic}/{latestVital.bpDiastolic}
                                  </span>
                                )}
                                {latestVital.heartRate && (
                                  <span className="px-1.5 py-0.5 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-300">
                                    HR {latestVital.heartRate} bpm
                                  </span>
                                )}
                                {latestVital.temperature && (
                                  <span
                                    className={`px-1.5 py-0.5 rounded border font-medium ${
                                      hasFever
                                        ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300"
                                        : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                                    }`}
                                    title={hasFever ? "High Fever" : "Temperature"}
                                  >
                                    {latestVital.temperature}°C
                                  </span>
                                )}
                                {latestVital.spo2 && (
                                  <span
                                    className={`px-1.5 py-0.5 rounded border font-medium ${
                                      hasLowOxygen
                                        ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300"
                                        : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                                    }`}
                                    title={hasLowOxygen ? "Low Oxygen Saturation" : "Oxygen SpO2"}
                                  >
                                    SpO₂ {latestVital.spo2}%
                                  </span>
                                )}
                              </div>
                            ) : (
                              <button
                                onClick={() => handleOpenVitalsModal(a)}
                                className="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded border border-amber-200/60 hover:bg-amber-100 transition-colors"
                              >
                                <Thermometer size={11} /> Check Vitals
                              </button>
                            )}
                          </td>

                          {/* Duty Nurse */}
                          <td className="py-3.5 px-4 align-middle">
                            <button
                              onClick={() => handleOpenNurseModal(a)}
                              className="text-xs text-slate-700 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 flex items-center gap-1 text-left transition-colors"
                              title="Click to reassign duty nurse"
                            >
                              <UserCheck size={12} className="text-teal-600 dark:text-teal-400 shrink-0" />
                              <span className="underline decoration-slate-300 decoration-dotted underline-offset-2">
                                {a.assignedNurseName || "Assign Nurse"}
                              </span>
                            </button>
                          </td>

                          {/* Bedside Action Buttons */}
                          <td className="py-3.5 px-4 align-middle text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {/* 1-Click Bedside Vitals */}
                              <button
                                onClick={() => handleOpenVitalsModal(a)}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 transition-colors flex items-center gap-1"
                                title="Record bedside vitals"
                              >
                                <Activity size={12} />
                                <span>+ Vitals</span>
                              </button>

                              {/* MAR Meds */}
                              <Link
                                href={`/nova/nurse/mar?patientId=${a.patientId}`}
                                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors flex items-center gap-1"
                                title="Give scheduled medicines"
                              >
                                <Pill size={12} />
                                <span>Meds</span>
                              </Link>

                              {/* Shift Notes */}
                              <Link
                                href={`/nova/nurse/notes?admissionId=${a.id}&patientId=${a.patientId}`}
                                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors flex items-center gap-1"
                                title="Shift notes and handovers"
                              >
                                <FileText size={12} />
                                <span>Notes</span>
                              </Link>

                              {/* Discharge */}
                              <button
                                onClick={() => setDischargeTarget(a)}
                                className="px-2.5 py-1 text-xs font-medium rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 border border-transparent hover:border-red-200 dark:hover:border-red-900 transition-colors flex items-center gap-1"
                                title="Discharge patient and free bed"
                              >
                                <LogOut size={12} />
                                <span>Discharge</span>
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
        )}

        {/* ── 4. ALTERNATIVE VIEW: VISUAL BED FLOOR PLAN ── */}
        {viewMode === "floorplan" && (
          <div className="space-y-4">
            {wards.filter((w) => w !== "All").map((wardName) => {
              const wardBeds = filteredBeds.filter((b) => b.ward === wardName);
              if (selectedWard !== "All" && selectedWard !== wardName) return null;
              if (wardBeds.length === 0) return null;

              return (
                <div
                  key={wardName}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Building2 size={16} className="text-teal-600" />
                      <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                        {wardName}
                      </h3>
                      <span className="text-xs text-slate-400">
                        ({wardBeds.filter((b) => b.status === "occupied").length} occupied / {wardBeds.length} beds)
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {wardBeds.map((bed) => {
                      const activeAdmission = bed.admissions?.[0];
                      const isOccupied = bed.status === "occupied" || !!activeAdmission;
                      const isMaintenance = bed.status === "maintenance";

                      return (
                        <div
                          key={bed.id}
                          className={`rounded-xl border p-3.5 transition-all flex flex-col justify-between ${
                            isOccupied
                              ? "bg-teal-50/40 dark:bg-teal-950/20 border-teal-200 dark:border-teal-800/80"
                              : isMaintenance
                              ? "bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/80"
                              : "bg-emerald-50/30 dark:bg-emerald-950/15 border-emerald-200 dark:border-emerald-800/70"
                          }`}
                        >
                          {/* Bed Card Header */}
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                                <Bed size={15} className="text-slate-500" />
                                Bed {bed.room}
                              </span>
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                  isOccupied
                                    ? "bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300"
                                    : isMaintenance
                                    ? "bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300"
                                    : "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300"
                                }`}
                              >
                                {isOccupied ? "Occupied" : isMaintenance ? "Cleaning" : "Available"}
                              </span>
                            </div>

                            {/* Patient info or bed status */}
                            {isOccupied && activeAdmission ? (
                              <div className="mt-2.5 space-y-1">
                                <p className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                  {activeAdmission.patient?.nameEn}
                                </p>
                                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                  ID: {activeAdmission.patient?.healthId || "—"}
                                </p>
                              </div>
                            ) : isMaintenance ? (
                              <div className="mt-3 text-xs text-amber-700 dark:text-amber-400 space-y-1">
                                <p className="font-medium">Under Cleaning / Sanitation</p>
                                <button
                                  onClick={() =>
                                    updateBedStatusMutation.mutate({ id: bed.id, status: "available" })
                                  }
                                  className="mt-1 text-[11px] font-semibold text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-1"
                                >
                                  <CheckCircle2 size={12} />
                                  <span>Mark Clean & Available</span>
                                </button>
                              </div>
                            ) : (
                              <div className="mt-3 text-xs text-emerald-700 dark:text-emerald-400">
                                <p className="font-medium">Ready for admission</p>
                              </div>
                            )}
                          </div>

                          {/* Bed Card Actions Footer */}
                          <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs">
                            {isOccupied && activeAdmission ? (
                              <div className="flex items-center gap-1.5 w-full justify-between">
                                <button
                                  onClick={() => handleOpenVitalsModal(activeAdmission)}
                                  className="text-[11px] font-semibold text-teal-700 dark:text-teal-300 hover:underline"
                                >
                                  + Vitals
                                </button>
                                <Link
                                  href={`/nova/nurse/mar?patientId=${activeAdmission.patientId}`}
                                  className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:underline"
                                >
                                  Meds
                                </Link>
                                <button
                                  onClick={() => setDischargeTarget(activeAdmission)}
                                  className="text-[11px] font-semibold text-red-600 dark:text-red-400 hover:underline"
                                >
                                  Discharge
                                </button>
                              </div>
                            ) : !isMaintenance ? (
                              <Link
                                href="/nova/ward/admissions"
                                className="text-[11px] font-semibold text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-1"
                              >
                                <Plus size={11} />
                                <span>Admit to Bed</span>
                              </Link>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── 5. QUICK BEDSIDE VITALS MODAL ── */}
        {vitalsTarget && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto animate-in fade-in duration-150">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 max-w-lg w-full max-h-[90dvh] overflow-y-auto shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Activity size={18} className="text-teal-600" />
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                      Record Bedside Vitals
                    </h3>
                    <p className="text-xs text-slate-400">
                      {vitalsTarget.patient?.nameEn} · Bed {vitalsTarget.bed?.room} ({vitalsTarget.bed?.ward})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setVitalsTarget(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Vitals Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Systolic BP (mmHg)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 120"
                    value={vitalsForm.bpSystolic}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, bpSystolic: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Diastolic BP (mmHg)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 80"
                    value={vitalsForm.bpDiastolic}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, bpDiastolic: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Heart Rate / Pulse (bpm)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 78"
                    value={vitalsForm.heartRate}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, heartRate: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Body Temp (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 36.8"
                    value={vitalsForm.temperature}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, temperature: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Oxygen SpO₂ (%)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 98"
                    value={vitalsForm.spo2}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, spo2: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Weight (kg) <span className="font-normal text-slate-400">optional</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 70"
                    value={vitalsForm.weight}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, weight: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                <button onClick={() => setVitalsTarget(null)} className={btnSecondary}>
                  Cancel
                </button>
                <button
                  onClick={handleSaveVitals}
                  disabled={recordVitalsMutation.isPending}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {recordVitalsMutation.isPending ? "Saving Vitals…" : "Save Bedside Vitals"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── 6. ASSIGN DUTY NURSE MODAL ── */}
        {nurseAssignTarget && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto animate-in fade-in duration-150">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 max-w-md w-full max-h-[90dvh] overflow-y-auto shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <UserCheck size={18} className="text-teal-600" />
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Assign Duty Nurse
                  </h3>
                </div>
                <button
                  onClick={() => setNurseAssignTarget(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                <p>
                  <span className="text-slate-500">Patient:</span>{" "}
                  <strong>{nurseAssignTarget.patient?.nameEn}</strong>
                </p>
                <p>
                  <span className="text-slate-500">Bed:</span> Bed {nurseAssignTarget.bed?.room} ({nurseAssignTarget.bed?.ward})
                </p>
                <p>
                  <span className="text-slate-500">Current Nurse:</span>{" "}
                  {nurseAssignTarget.assignedNurseName || "Not assigned"}
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Select Duty Nurse:
                </label>
                <select
                  value={selectedNurseId}
                  onChange={(e) => setSelectedNurseId(e.target.value)}
                  className={`${inputCls} text-xs py-2`}
                >
                  <option value="">-- Choose Nurse --</option>
                  {nurses.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name} ({n.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                <button onClick={() => setNurseAssignTarget(null)} className={btnSecondary}>
                  Cancel
                </button>
                <button
                  onClick={handleSaveNurse}
                  disabled={assignNurseMutation.isPending || !selectedNurseId}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {assignNurseMutation.isPending ? "Assigning…" : "Update Duty Nurse"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── 7. DISCHARGE CONFIRMATION MODAL ── */}
        {dischargeTarget && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto animate-in fade-in duration-150">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 max-w-md w-full max-h-[90dvh] overflow-y-auto shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <LogOut size={18} className="text-red-500" />
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Discharge Patient & Free Bed
                  </h3>
                </div>
                <button
                  onClick={() => setDischargeTarget(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Patient:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">
                    {dischargeTarget.patient?.nameEn}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Bed:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    Bed {dischargeTarget.bed?.room} ({dischargeTarget.bed?.ward})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Days Admitted:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {dischargeTarget.daysElapsed || 1} day(s)
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500">Cashier Status:</span>
                  {dischargeTarget.paymentStatus === "paid" ? (
                    <span className="font-bold text-emerald-600">✓ Paid (Cleared)</span>
                  ) : (
                    <span className="font-bold text-red-600">✕ Unpaid (Pay at Cashier First)</span>
                  )}
                </div>
              </div>

              {dischargeTarget.paymentStatus !== "paid" && (
                <div className="p-2.5 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-xs text-red-700 dark:text-red-300 font-medium">
                  Payment required. Patient must pay bill at Cashier before discharge.
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Discharge Condition / Outcome:
                </label>
                <select
                  value={dischargeCondition}
                  onChange={(e) => setDischargeCondition(e.target.value)}
                  className={`${inputCls} text-xs py-2`}
                >
                  <option value="Recovered / Improved">Recovered & Condition Improved</option>
                  <option value="Stable for Home Care">Stable for Home Care (Medication given)</option>
                  <option value="Transferred to Higher Center">Transferred to Referral Hospital</option>
                  <option value="Discharged against Medical Advice (DAMA)">
                    Discharged Against Medical Advice (DAMA)
                  </option>
                  <option value="Deceased">Deceased</option>
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                <button onClick={() => setDischargeTarget(null)} className={btnSecondary}>
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDischarge}
                  disabled={dischargeMutation.isPending || dischargeTarget.paymentStatus !== "paid"}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {dischargeMutation.isPending
                    ? "Discharging…"
                    : dischargeTarget.paymentStatus !== "paid"
                    ? "Unpaid (Must Pay at Cashier First)"
                    : "Confirm Discharge & Free Bed"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
