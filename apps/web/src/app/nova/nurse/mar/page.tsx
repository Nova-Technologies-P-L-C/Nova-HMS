"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { PageShell, Card, inputCls, btnPrimary, btnSecondary } from "@/components/nova/nova-ui";
import {
  Pill,
  Bed,
  User,
  Clock,
  Activity,
  Thermometer,
  ShieldAlert,
  Search,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RefreshCw,
  X,
  FileText,
  ArrowRight,
  Filter,
  Check,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Stethoscope,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

const SCHEDULE_SLOTS = [
  { time: "08:00", label: "Morning Round", range: "06:00 - 11:59" },
  { time: "14:00", label: "Afternoon Round", range: "12:00 - 17:59" },
  { time: "20:00", label: "Night Round", range: "18:00 - 05:59" },
];

function getCurrentShiftSlot(): string {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return "08:00";
  if (hour >= 12 && hour < 18) return "14:00";
  return "20:00";
}

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

interface DoseEntry {
  status: "given" | "held" | "refused";
  reason?: string;
  time: string;
  timestamp: string;
  nurseName?: string;
}

type MARRecords = Record<string, Record<string, DoseEntry>>;

function MARContent() {
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const paramPatientId = searchParams.get("patientId") || "";

  const [selectedPatientId, setSelectedPatientId] = useState<string>(paramPatientId);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWard, setSelectedWard] = useState<string>("All");
  const [records, setRecords] = useState<MARRecords>({});

  // Non-administration modal state
  const [reasonModal, setReasonModal] = useState<{
    lineId: string;
    medicineName: string;
    timeSlot: string;
    actionType: "held" | "refused";
    rxId: string;
  } | null>(null);
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");

  const currentSlot = useMemo(() => getCurrentShiftSlot(), []);

  // Load active admissions
  const {
    data: admissions = [],
    isLoading: isAdmissionsLoading,
    refetch: refetchAdmissions,
    isRefetching: isAdmissionsRefetching,
  } = useQuery({
    ...trpc.ward.admissions.queryOptions(),
    refetchOnMount: true,
  });

  // Automatically select first patient if none selected
  useEffect(() => {
    if (paramPatientId) {
      setSelectedPatientId(paramPatientId);
    } else if (!selectedPatientId && admissions.length > 0) {
      setSelectedPatientId(admissions[0].patientId);
    }
  }, [paramPatientId, admissions, selectedPatientId]);

  // Load MAR records from localStorage
  useEffect(() => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const saved = localStorage.getItem(`nova_mar_records_${today}`);
      if (saved) {
        setRecords(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  const saveRecords = (newRecords: MARRecords) => {
    setRecords(newRecords);
    try {
      const today = new Date().toISOString().split("T")[0];
      localStorage.setItem(`nova_mar_records_${today}`, JSON.stringify(newRecords));
    } catch {
      // ignore
    }
  };

  // Find selected admission
  const selectedAdmission = useMemo(() => {
    return admissions.find((a) => a.patientId === selectedPatientId) || admissions[0] || null;
  }, [admissions, selectedPatientId]);

  // Load patient details & prescriptions via active visit
  const activeVisitId = selectedAdmission?.visitId || "";
  const {
    data: visitDetail,
    isLoading: isVisitLoading,
    refetch: refetchVisit,
  } = useQuery({
    ...trpc.visit.get.queryOptions({ visitId: activeVisitId }),
    enabled: !!activeVisitId,
  });

  // Dispense mutation
  const dispense = useMutation(
    trpc.prescription.dispense.mutationOptions({
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: trpc.visit.get.queryKey() });
        toast.success("Medication dispensed from pharmacy inventory");
      },
      onError: (err) => {
        toast.error(err.message || "Could not sync with pharmacy stock");
      },
    })
  );

  // Wards list
  const wards = useMemo(() => {
    const list = Array.from(new Set(admissions.map((a) => a.bed?.ward).filter(Boolean)));
    return ["All", ...list];
  }, [admissions]);

  // Filtered patients for toolbar selection
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

  // Bed round navigation (Previous / Next patient)
  const currentPatientIndex = useMemo(() => {
    return filteredAdmissions.findIndex((a) => a.patientId === selectedAdmission?.patientId);
  }, [filteredAdmissions, selectedAdmission]);

  const handlePrevPatient = () => {
    if (currentPatientIndex > 0) {
      setSelectedPatientId(filteredAdmissions[currentPatientIndex - 1].patientId);
    }
  };

  const handleNextPatient = () => {
    if (currentPatientIndex >= 0 && currentPatientIndex < filteredAdmissions.length - 1) {
      setSelectedPatientId(filteredAdmissions[currentPatientIndex + 1].patientId);
    }
  };

  const prescriptions = visitDetail?.prescriptions || [];
  const latestVital = selectedAdmission?.visit?.vitals?.[0];

  // Action handlers
  const handleMarkGiven = (lineId: string, rxId: string, time: string, medicineName: string) => {
    const entry: DoseEntry = {
      status: "given",
      time,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const updated = {
      ...records,
      [lineId]: {
        ...(records[lineId] || {}),
        [time]: entry,
      },
    };
    saveRecords(updated);

    toast.success(`Marked ${medicineName} (${time}) as Given`);

    // Deduct stock if not already dispensed
    dispense.mutate({ prescriptionId: rxId });
  };

  const handleOpenReasonModal = (
    lineId: string,
    rxId: string,
    timeSlot: string,
    medicineName: string,
    actionType: "held" | "refused"
  ) => {
    setReasonModal({ lineId, rxId, timeSlot, medicineName, actionType });
    setSelectedReason("");
    setCustomReason("");
  };

  const handleConfirmNonAdmin = () => {
    if (!reasonModal) return;
    const finalReason = selectedReason === "Other" ? customReason : selectedReason || "Clinically indicated";

    const entry: DoseEntry = {
      status: reasonModal.actionType,
      reason: finalReason,
      time: reasonModal.timeSlot,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const updated = {
      ...records,
      [reasonModal.lineId]: {
        ...(records[reasonModal.lineId] || {}),
        [reasonModal.timeSlot]: entry,
      },
    };
    saveRecords(updated);

    toast.info(
      `${reasonModal.medicineName} (${reasonModal.timeSlot}) marked as ${
        reasonModal.actionType === "held" ? "Held" : "Refused"
      }: ${finalReason}`
    );
    setReasonModal(null);
  };

  const handleResetDose = (lineId: string, timeSlot: string) => {
    const patientRecord = { ...(records[lineId] || {}) };
    delete patientRecord[timeSlot];
    const updated = { ...records, [lineId]: patientRecord };
    saveRecords(updated);
    toast.info("Dose status reset to pending");
  };

  // KPI counts
  const totalPrescribedLines = prescriptions.reduce((acc, rx) => acc + (rx.lines?.length || 0), 0);
  const totalGivenToday = Object.values(records).reduce((acc, slotMap) => {
    return acc + Object.values(slotMap).filter((d) => d.status === "given").length;
  }, 0);
  const totalHeldToday = Object.values(records).reduce((acc, slotMap) => {
    return acc + Object.values(slotMap).filter((d) => d.status === "held" || d.status === "refused").length;
  }, 0);

  return (
    <PageShell
      title="Medication Administration Record (MAR)"
      subtitle="Scheduled drug rounds, bedside dose tracking, administration safety, and pharmacy stock verification"
      action={
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              refetchAdmissions();
              refetchVisit();
            }}
            disabled={isAdmissionsRefetching}
            className="p-2 text-xs font-medium rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-xs"
            title="Refresh patient orders"
          >
            <RefreshCw size={14} className={isAdmissionsRefetching ? "animate-spin text-teal-600" : ""} />
          </button>

          <Link
            href="/nova/nurse"
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Bed size={14} className="text-teal-600" />
            <span>Ward Patients</span>
          </Link>

          <Link
            href="/nova/nurse/notes"
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <FileText size={14} className="text-blue-600" />
            <span>Shift Notes</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-4 pb-12 w-full max-w-[1700px] mx-auto">
        {/* ── 1. PRO TOP KPI METRICS ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Admitted Inpatients
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold text-slate-900 dark:text-white">
                    {admissions.length}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">in beds</span>
                </div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                <Bed size={17} />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-teal-700 dark:text-teal-400 font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Ward round ready</span>
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Active Drug Orders
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold text-slate-900 dark:text-white">
                    {totalPrescribedLines}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">for current patient</span>
                </div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Pill size={17} />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              Prescribed by medical doctor
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Doses Given Today
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {totalGivenToday}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">administered</span>
                </div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 size={17} />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
              Verified & recorded
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Held / Skipped Doses
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {totalHeldToday}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">doses</span>
                </div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <AlertCircle size={17} />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              Documented with clinical reason
            </p>
          </div>
        </div>

        {/* ── 2. FULL-PAGE PATIENT SELECTION TOOLBAR ── */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Left: Quick Bed Round Stepper & Active Patient Selector Dropdown */}
            <div className="flex items-center gap-2 flex-1 max-w-xl">
              <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 shrink-0">
                <button
                  onClick={handlePrevPatient}
                  disabled={currentPatientIndex <= 0}
                  className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  title="Previous Inpatient Bed"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-[11px] font-semibold px-1 text-slate-500">
                  {currentPatientIndex + 1} / {filteredAdmissions.length}
                </span>
                <button
                  onClick={handleNextPatient}
                  disabled={currentPatientIndex >= filteredAdmissions.length - 1}
                  className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  title="Next Inpatient Bed"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Patient Dropdown Select */}
              <div className="relative flex-1">
                <select
                  value={selectedAdmission?.patientId || ""}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className={`${inputCls} text-xs font-semibold py-2 pl-3 pr-8 truncate bg-slate-50 dark:bg-slate-800/90 border-teal-300 dark:border-teal-800`}
                >
                  {admissions.map((a) => (
                    <option key={a.id} value={a.patientId}>
                      Bed {a.bed?.room} ({a.bed?.ward}) — {a.patient?.nameEn} [ID: {a.patient?.healthId}] · Day {a.daysElapsed || 1}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Right: Search + Ward Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search input */}
              <div className="relative w-52 sm:w-64">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="text"
                  placeholder="Filter by name, bed, MRN..."
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

              {/* Ward filter pills */}
              <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-thin">
                {wards.map((ward) => {
                  const isActive = selectedWard === ward;
                  return (
                    <button
                      key={ward}
                      onClick={() => setSelectedWard(ward)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                        isActive
                          ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                      }`}
                    >
                      {ward === "All" ? "All Wards" : ward}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Horizontal Bed Chips Strip (Quick Bed Switching) */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 pl-1">
              Beds:
            </span>
            {filteredAdmissions.map((a) => {
              const isSelected = selectedAdmission?.id === a.id;
              return (
                <button
                  key={a.id}
                  onClick={() => setSelectedPatientId(a.patientId)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold shrink-0 transition-all ${
                    isSelected
                      ? "bg-teal-600 text-white border-teal-600 shadow-xs"
                      : "bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-300 hover:border-teal-400"
                  }`}
                >
                  <span className="font-mono">Bed {a.bed?.room}</span>
                  <span className="opacity-75 font-normal truncate max-w-[120px]">
                    {a.patient?.nameEn}
                  </span>
                  <span
                    className={`text-[10px] px-1 py-0.2 rounded ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    D{a.daysElapsed || 1}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── 3. FULL-PAGE BEDSIDE PATIENT SAFETY & VITALS BANNER ── */}
        {!selectedAdmission ? (
          <Card className="p-16 text-center">
            <Pill size={36} className="text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
              No admitted patients found
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Please admit a patient to a ward bed first.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                      {selectedAdmission.patient?.nameEn}
                    </h2>
                    {selectedAdmission.patient?.nameAm && (
                      <span className="text-sm text-slate-400">
                        ({selectedAdmission.patient.nameAm})
                      </span>
                    )}
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                      Bed {selectedAdmission.bed?.room} · {selectedAdmission.bed?.ward}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      Day {selectedAdmission.daysElapsed || 1} Admitted
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                    <span className="font-mono font-medium text-slate-600 dark:text-slate-300">
                      MRN / Health ID: {selectedAdmission.patient?.healthId || "—"}
                    </span>
                    <span>•</span>
                    <span>
                      {selectedAdmission.patient?.sex?.toUpperCase() === "M"
                        ? "Male"
                        : selectedAdmission.patient?.sex?.toUpperCase() === "F"
                        ? "Female"
                        : "—"}{" "}
                      · {calculateAge(selectedAdmission.patient?.dob)}
                    </span>
                    <span>•</span>
                    <span>Assigned Nurse: <strong>{selectedAdmission.assignedNurseName || "On duty"}</strong></span>
                    <span>•</span>
                    <span>Admitted on {new Date(selectedAdmission.admittedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Quick actions for vitals and shift notes */}
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/nova/nurse/vitals?visitId=${selectedAdmission.visitId || ""}`}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <Activity size={13} className="text-teal-600" />
                    <span>Bedside Vitals</span>
                  </Link>
                  <Link
                    href={`/nova/nurse/notes?admissionId=${selectedAdmission.id}&patientId=${selectedAdmission.patientId}`}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <FileText size={13} className="text-blue-600" />
                    <span>Nurse Shift Note</span>
                  </Link>
                </div>
              </div>

              {/* Bedside Vitals Check Before Administration */}
              <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Current Vitals:
                  </span>
                  {latestVital ? (
                    <>
                      {latestVital.bpSystolic && latestVital.bpDiastolic && (
                        <span
                          className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${
                            latestVital.bpSystolic >= 140 || latestVital.bpDiastolic >= 90
                              ? "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300"
                              : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                          }`}
                        >
                          BP: {latestVital.bpSystolic}/{latestVital.bpDiastolic} mmHg
                        </span>
                      )}
                      {latestVital.heartRate && (
                        <span className="px-2 py-0.5 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-[11px] text-slate-700 dark:text-slate-200">
                          Pulse: {latestVital.heartRate} bpm
                        </span>
                      )}
                      {latestVital.temperature && (
                        <span
                          className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${
                            latestVital.temperature >= 38.0
                              ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300"
                              : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                          }`}
                        >
                          Temp: {latestVital.temperature}°C
                        </span>
                      )}
                      {latestVital.spo2 && (
                        <span
                          className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${
                            latestVital.spo2 < 95
                              ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300"
                              : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                          }`}
                        >
                          SpO₂: {latestVital.spo2}%
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 text-xs italic">
                      No vitals recorded today — verify patient stability before administering IV / oral medications.
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-md">
                  <ShieldAlert size={13} className="text-teal-600" />
                  <span>Verify 5 Rights: Right Patient, Right Drug, Right Dose, Right Route, Right Time</span>
                </div>
              </div>
            </div>

            {/* ── 4. FULL-WIDTH MEDICATION ADMINISTRATION SCHEDULE (MAR) TABLE ── */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden w-full">
              <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <Pill size={18} className="text-teal-600" />
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base">
                    Daily Medication Administration Schedule
                  </h3>
                  <span className="text-xs text-slate-400">
                    ({totalPrescribedLines} active prescribed drugs for this patient)
                  </span>
                </div>

                {/* Active Round Legend */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="flex items-center gap-1.5 font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 px-3 py-1 rounded-lg border border-teal-200 dark:border-teal-800">
                    <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                    Current Shift Window: {currentSlot === "08:00" ? "Morning Round (08:00)" : currentSlot === "14:00" ? "Afternoon Round (14:00)" : "Night Round (20:00)"}
                  </span>
                </div>
              </div>

              {isVisitLoading ? (
                <div className="p-16 text-center text-slate-400 text-sm">
                  Loading doctor's prescription orders…
                </div>
              ) : prescriptions.length === 0 || totalPrescribedLines === 0 ? (
                <div className="p-16 text-center space-y-3">
                  <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                    <Pill size={26} />
                  </div>
                  <p className="font-bold text-slate-700 dark:text-slate-300 text-base">
                    No active medication orders found for this patient
                  </p>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    When the attending physician or medical officer enters prescriptions for this admission, they will automatically appear here on the 24-hour administration schedule.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                        <th className="py-3.5 px-5 min-w-[280px] w-1/3">Prescribed Medicine & Instructions</th>
                        <th className="py-3.5 px-4 text-center min-w-[150px]">Payment & Stock</th>
                        {SCHEDULE_SLOTS.map((slot) => {
                          const isCurrent = slot.time === currentSlot;
                          return (
                            <th
                              key={slot.time}
                              className={`py-3.5 px-4 text-center min-w-[190px] ${
                                isCurrent
                                  ? "bg-teal-50/70 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 font-bold border-x border-teal-200 dark:border-teal-800"
                                  : ""
                              }`}
                            >
                              <div className="space-y-0.5">
                                <span className="text-base font-bold block">{slot.time}</span>
                                <span className="text-[11px] font-normal opacity-85 block">
                                  {slot.label}
                                </span>
                                {isCurrent && (
                                  <span className="inline-block mt-0.5 text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-600 text-white font-bold">
                                    Due Now
                                  </span>
                                )}
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {prescriptions.map((rx) =>
                        rx.lines.map((line: any) => {
                          const isPaid = line.paymentStatus === "paid";

                          return (
                            <tr
                              key={line.id}
                              className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                            >
                              {/* Drug Name, Dosage, Frequency, Duration */}
                              <td className="py-4 px-5 align-top">
                                <div className="space-y-1">
                                  <span className="font-bold text-sm text-slate-900 dark:text-slate-100 block">
                                    {line.itemName}
                                  </span>
                                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 flex-wrap">
                                    <span className="font-semibold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/50 px-2 py-0.5 rounded border border-teal-200/60 dark:border-teal-800/60">
                                      {line.dose}
                                    </span>
                                    <span>•</span>
                                    <span className="font-medium text-slate-700 dark:text-slate-300">
                                      {line.frequency}
                                    </span>
                                    {line.durationDays > 0 && (
                                      <>
                                        <span>•</span>
                                        <span>{line.durationDays} days duration</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Cashier / Payment / Stock Clearance */}
                              <td className="py-4 px-4 text-center align-middle">
                                <div className="space-y-1">
                                  <span
                                    className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                      isPaid
                                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                        : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                                    }`}
                                  >
                                    {isPaid ? "Paid & Cleared" : "Pre-payment Pending"}
                                  </span>
                                  {rx.status === "dispensed" && (
                                    <span className="block text-[11px] text-teal-600 dark:text-teal-400 font-medium">
                                      Stock Dispensed
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Schedule Slots (08:00, 14:00, 20:00) */}
                              {SCHEDULE_SLOTS.map((slot) => {
                                const isCurrent = slot.time === currentSlot;
                                const record: DoseEntry | undefined = records[line.id]?.[slot.time];

                                return (
                                  <td
                                    key={slot.time}
                                    className={`py-4 px-4 align-middle text-center ${
                                      isCurrent
                                        ? "bg-teal-50/30 dark:bg-teal-950/20 border-x border-teal-100 dark:border-teal-900"
                                        : ""
                                    }`}
                                  >
                                    {record ? (
                                      /* Dose Already Administered or Logged */
                                      <div className="space-y-1.5 max-w-[170px] mx-auto">
                                        {record.status === "given" ? (
                                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 text-white font-semibold text-xs shadow-xs">
                                            <Check size={13} strokeWidth={3} />
                                            <span>Given</span>
                                          </div>
                                        ) : record.status === "held" ? (
                                          <div
                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500 text-white font-semibold text-xs shadow-xs cursor-help"
                                            title={`Held: ${record.reason || "Clinically indicated"}`}
                                          >
                                            <AlertCircle size={12} />
                                            <span>Held</span>
                                          </div>
                                        ) : (
                                          <div
                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 text-white font-semibold text-xs shadow-xs cursor-help"
                                            title={`Refused: ${record.reason || "Patient declined"}`}
                                          >
                                            <XCircle size={12} />
                                            <span>Refused</span>
                                          </div>
                                        )}

                                        <div className="text-[11px] text-slate-400">
                                          <span>at {record.timestamp}</span>
                                          {record.reason && (
                                            <span className="block text-slate-500 dark:text-slate-400 truncate italic">
                                              &quot;{record.reason}&quot;
                                            </span>
                                          )}
                                        </div>

                                        {/* Reset button if logged by mistake */}
                                        <button
                                          onClick={() => handleResetDose(line.id, slot.time)}
                                          className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline block mx-auto"
                                        >
                                          Change Dose
                                        </button>
                                      </div>
                                    ) : (
                                      /* Pending Dose Actions: Give, Hold, Refused */
                                      <div className="space-y-1.5 max-w-[170px] mx-auto">
                                        {/* Give Button */}
                                        <button
                                          onClick={() =>
                                            handleMarkGiven(line.id, rx.id, slot.time, line.itemName)
                                          }
                                          className="w-full py-1.5 px-3 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs transition-colors shadow-xs flex items-center justify-center gap-1.5"
                                        >
                                          <Check size={13} strokeWidth={2.5} />
                                          <span>Give Dose</span>
                                        </button>

                                        {/* Secondary: Hold / Refuse */}
                                        <div className="grid grid-cols-2 gap-1 text-[11px]">
                                          <button
                                            onClick={() =>
                                              handleOpenReasonModal(
                                                line.id,
                                                rx.id,
                                                slot.time,
                                                line.itemName,
                                                "held"
                                              )
                                            }
                                            className="py-1 px-2 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-950/40 text-slate-700 dark:text-slate-300 hover:text-amber-700 transition-colors border border-slate-200 dark:border-slate-700 text-center font-medium"
                                          >
                                            Hold
                                          </button>
                                          <button
                                            onClick={() =>
                                              handleOpenReasonModal(
                                                line.id,
                                                rx.id,
                                                slot.time,
                                                line.itemName,
                                                "refused"
                                              )
                                            }
                                            className="py-1 px-2 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-slate-700 dark:text-slate-300 hover:text-rose-700 transition-colors border border-slate-200 dark:border-slate-700 text-center font-medium"
                                          >
                                            Refused
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ── Table Footer Clinical Legend ── */}
              <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-5 flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <strong>Given:</strong> Dose successfully swallowed or administered via IV
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <strong>Held:</strong> Temporarily paused (e.g. fasting, low BP, nausea)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <strong>Refused:</strong> Patient declined medication
                  </span>
                </div>

                <div className="text-[11px] text-slate-400">
                  Daily Ward Rounds: 08:00 (Morning) · 14:00 (Afternoon) · 20:00 (Night)
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── 5. CLINICAL REASON MODAL FOR HELD / REFUSED ── */}
        {reasonModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  {reasonModal.actionType === "held" ? (
                    <AlertCircle size={18} className="text-amber-500" />
                  ) : (
                    <XCircle size={18} className="text-rose-500" />
                  )}
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    {reasonModal.actionType === "held" ? "Hold Medication Dose" : "Patient Refused Dose"}
                  </h3>
                </div>
                <button
                  onClick={() => setReasonModal(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                <p>
                  <span className="text-slate-500">Medication:</span>{" "}
                  <strong>{reasonModal.medicineName}</strong>
                </p>
                <p>
                  <span className="text-slate-500">Scheduled Time:</span>{" "}
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {reasonModal.timeSlot} Round
                  </span>
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Select Reason:
                </label>
                <div className="space-y-1.5 text-xs">
                  {(reasonModal.actionType === "held"
                    ? [
                        "Patient fasting (NPO) for procedure / surgery",
                        "Low Blood Pressure / Unstable vital signs",
                        "Patient actively nauseated or vomiting",
                        "Awaiting laboratory test result",
                        "Doctor instructed to hold dose",
                        "Other",
                      ]
                    : [
                        "Patient states feeling better / does not want dose",
                        "Patient reports unpleasant side effects",
                        "Patient asleep / family requested no disturbance",
                        "Patient requested to speak with doctor first",
                        "Other",
                      ]
                  ).map((reason) => (
                    <label
                      key={reason}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                        selectedReason === reason
                          ? "border-teal-500 bg-teal-50/50 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 font-semibold"
                          : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="nonAdminReason"
                        value={reason}
                        checked={selectedReason === reason}
                        onChange={() => setSelectedReason(reason)}
                        className="text-teal-600 focus:ring-teal-500"
                      />
                      <span>{reason}</span>
                    </label>
                  ))}
                </div>

                {selectedReason === "Other" && (
                  <div className="mt-2.5">
                    <input
                      type="text"
                      placeholder="Specify custom reason..."
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      className={`${inputCls} text-xs py-1.5`}
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                <button onClick={() => setReasonModal(null)} className={btnSecondary}>
                  Cancel
                </button>
                <button
                  onClick={handleConfirmNonAdmin}
                  disabled={!selectedReason || (selectedReason === "Other" && !customReason.trim())}
                  className={`px-4 py-2 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 text-white ${
                    reasonModal.actionType === "held"
                      ? "bg-amber-600 hover:bg-amber-700"
                      : "bg-rose-600 hover:bg-rose-700"
                  } disabled:opacity-50`}
                >
                  Confirm {reasonModal.actionType === "held" ? "Hold" : "Refusal"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}

export default function MARPage() {
  return (
    <Suspense
      fallback={
        <PageShell title="Medication Administration Record (MAR)">
          <div className="p-12 text-center text-slate-400 text-sm">
            Loading Medication Administration Schedule…
          </div>
        </PageShell>
      }
    >
      <MARContent />
    </Suspense>
  );
}
