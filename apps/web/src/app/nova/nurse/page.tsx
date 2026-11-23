"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { PageShell, Card, FormField, inputCls, btnPrimary, btnSecondary, StatusBadge } from "@/components/nova/nova-ui";
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
  CheckCircle,
  ArrowRight,
  ShieldCheck,
  Stethoscope,
  LogOut,
  Clock,
  Filter,
  UserCheck,
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWard, setSelectedWard] = useState<string>("All");
  const [dischargeTarget, setDischargeTarget] = useState<any | null>(null);
  const [dischargeCondition, setDischargeCondition] = useState("Recovered / Improved");

  // Query active admissions
  const { data: admissions = [], isLoading: isAdmissionsLoading } = useQuery({
    ...trpc.ward.admissions.queryOptions(),
    refetchOnMount: true,
  });

  // Query beds for capacity & ward filter
  const { data: beds = [] } = useQuery({
    ...trpc.ward.beds.queryOptions(),
    refetchOnMount: true,
  });

  // Discharge mutation
  const dischargeMutation = useMutation(
    trpc.ward.discharge.mutationOptions({
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: trpc.ward.admissions.queryKey() });
        qc.invalidateQueries({ queryKey: trpc.ward.beds.queryKey() });
        setDischargeTarget(null);
        toast.success("Patient discharged successfully");
      },
      onError: (err) => {
        toast.error(err.message || "Failed to discharge patient");
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
  const availableBeds = Math.max(0, totalBeds - occupiedBeds);
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  // Filtered admissions
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
      subtitle="Manage admitted patients, vitals, medications, and nursing notes"
      action={
        <div className="flex items-center gap-2">
          <Link
            href="/nova/ward"
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Bed size={14} className="text-teal-600" />
            <span>Bed Board</span>
          </Link>
          <Link
            href="/nova/ward/admissions"
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-teal-600 hover:bg-teal-500 text-white transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Plus size={14} />
            <span>Admit Patient</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-4 pb-12 w-full max-w-[1600px] mx-auto">
        {/* ── 1. COMPACT STATUS BAR (REPLACES 3 BLOATED KPI CARDS) ── */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 px-4 shadow-xs grid grid-cols-2 sm:grid-cols-4 gap-3 items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
              <User size={18} />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Admitted Patients
              </span>
              <span className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {occupiedBeds}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 border-l border-slate-100 dark:border-slate-800 pl-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Bed size={18} />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Available Beds
              </span>
              <span className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {availableBeds} <span className="text-xs text-slate-400 font-normal">/ {totalBeds}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 border-l border-slate-100 dark:border-slate-800 pl-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Activity size={18} />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Bed Occupancy
              </span>
              <span className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {occupancyRate}%
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 border-l border-slate-100 dark:border-slate-800 pl-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Pill size={18} />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                MAR Administrations
              </span>
              <Link href="/nova/nurse/mar" className="text-xs font-semibold text-teal-600 hover:underline">
                View Medication Schedule →
              </Link>
            </div>
          </div>
        </div>

        {/* ── 2. SEARCH & WARD FILTER TOOLBAR ── */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search by patient name, MRN, bed, or ward..."
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

          {/* Ward Filter Pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
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
                  <span>{ward}</span>
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
        </div>

        {/* ── 3. ADMITTED PATIENTS TABLE (CLEAR, NICE & SPACIOUS) ── */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                Admitted Patients ({filteredAdmissions.length})
              </h3>
            </div>
            {admissions.length > 0 && (
              <span className="text-xs text-slate-400">
                Active Ward Census
              </span>
            )}
          </div>

          {isAdmissionsLoading ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              Loading admitted patients…
            </div>
          ) : filteredAdmissions.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <Bed size={22} />
              </div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {searchQuery || selectedWard !== "All"
                  ? "No admitted patients match your filter"
                  : "No patients currently admitted"}
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                When patients are admitted from OPD or Emergency, their bedside records will appear here.
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
                    <th className="py-3 px-4">Bed / Room</th>
                    <th className="py-3 px-4">Patient</th>
                    <th className="py-3 px-4">Stay</th>
                    <th className="py-3 px-4">Latest Vitals</th>
                    <th className="py-3 px-4">Duty Nurse</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredAdmissions.map((a: any) => {
                    const latestVital = a.visit?.vitals?.[0];
                    const patient = a.patient;
                    const bed = a.bed;

                    return (
                      <tr
                        key={a.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* Bed & Ward */}
                        <td className="py-3.5 px-4 align-middle">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 flex items-center justify-center text-teal-700 dark:text-teal-300 font-mono font-bold text-xs shrink-0">
                              {bed?.room || "Bed"}
                            </div>
                            <div>
                              <span className="font-semibold text-slate-800 dark:text-slate-100 block">
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
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                                {patient?.nameEn || "Patient"}
                              </span>
                              {patient?.cbhiStatus && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                  CBHI
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                              <span className="font-mono text-slate-500 font-medium">
                                {patient?.healthId || "—"}
                              </span>
                              <span>•</span>
                              <span>
                                {patient?.sex?.toUpperCase() === "M" ? "Male" : patient?.sex?.toUpperCase() === "F" ? "Female" : "—"} · {calculateAge(patient?.dob)}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Stay Duration */}
                        <td className="py-3.5 px-4 align-middle">
                          <div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px]">
                              <Clock size={11} className="text-slate-400" /> Day {a.daysElapsed || 1}
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              Since {new Date(a.admittedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </td>

                        {/* Latest Vitals Snapshot */}
                        <td className="py-3.5 px-4 align-middle">
                          {latestVital ? (
                            <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                              {latestVital.bpSystolic && latestVital.bpDiastolic && (
                                <span className="px-1.5 py-0.5 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-300">
                                  BP: {latestVital.bpSystolic}/{latestVital.bpDiastolic}
                                </span>
                              )}
                              {latestVital.heartRate && (
                                <span className="px-1.5 py-0.5 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-300">
                                  Pulse: {latestVital.heartRate}
                                </span>
                              )}
                              {latestVital.temperature && (
                                <span className="px-1.5 py-0.5 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-300">
                                  {latestVital.temperature}°C
                                </span>
                              )}
                              {latestVital.spo2 && (
                                <span className="px-1.5 py-0.5 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-300">
                                  SpO2: {latestVital.spo2}%
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded border border-amber-200/60">
                              <Thermometer size={11} /> Check vitals
                            </span>
                          )}
                        </td>

                        {/* Duty Nurse */}
                        <td className="py-3.5 px-4 align-middle">
                          <span className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1">
                            <UserCheck size={12} className="text-slate-400" />
                            {a.assignedNurseName || "On Duty Nurse"}
                          </span>
                        </td>

                        {/* Action Buttons */}
                        <td className="py-3.5 px-4 align-middle text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            <Link
                              href={`/nova/nurse/vitals?visitId=${a.visitId || ""}`}
                              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 transition-colors flex items-center gap-1"
                              title="Record or review vitals"
                            >
                              <Activity size={12} /> Vitals
                            </Link>

                            <Link
                              href={`/nova/nurse/mar?patientId=${a.patientId}`}
                              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors flex items-center gap-1"
                              title="Medication Administration Record"
                            >
                              <Pill size={12} /> MAR
                            </Link>

                            <Link
                              href={`/nova/nurse/notes?admissionId=${a.id}&patientId=${a.patientId}`}
                              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors flex items-center gap-1"
                              title="Bedside nursing notes"
                            >
                              <FileText size={12} /> Note
                            </Link>

                            <button
                              onClick={() => setDischargeTarget(a)}
                              className="px-2.5 py-1 text-xs font-medium rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 border border-transparent hover:border-red-200 dark:hover:border-red-900 transition-colors flex items-center gap-1"
                              title="Discharge patient from ward"
                            >
                              <LogOut size={12} /> Discharge
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

        {/* ── DISCHARGE CONFIRMATION MODAL ── */}
        {dischargeTarget && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <LogOut size={18} className="text-red-500" />
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Discharge Inpatient
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
                  <span className="text-slate-500">Bed & Ward:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    Bed {dischargeTarget.bed?.room} ({dischargeTarget.bed?.ward})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Stay Duration:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {dischargeTarget.daysElapsed || 1} day(s)
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Discharge Condition:
                </label>
                <select
                  value={dischargeCondition}
                  onChange={(e) => setDischargeCondition(e.target.value)}
                  className={`${inputCls} text-xs py-2`}
                >
                  <option value="Recovered / Improved">Recovered / Improved</option>
                  <option value="Stable for Home Care">Stable for Home Care</option>
                  <option value="Transferred to Higher Center">Transferred to Higher Center</option>
                  <option value="Discharged against Medical Advice (DAMA)">Discharged against Medical Advice (DAMA)</option>
                  <option value="Deceased">Deceased</option>
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  onClick={() => setDischargeTarget(null)}
                  className={btnSecondary}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDischarge}
                  disabled={dischargeMutation.isPending}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {dischargeMutation.isPending ? "Discharging…" : "Confirm Discharge & Free Bed"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
