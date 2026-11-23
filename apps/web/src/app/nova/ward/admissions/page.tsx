"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { PageShell, Card, FormField, inputCls, btnPrimary, btnSecondary } from "@/components/nova/nova-ui";
import {
  Bed,
  CheckCircle2,
  AlertCircle,
  Search,
  FileText,
  Pill,
  Plus,
  RefreshCw,
  LogOut,
  Users,
} from "lucide-react";
import { toast } from "sonner";

function AdmissionsContent() {
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as "admit" | "active" | "discharge") || "active";
  const initialPatientId = searchParams.get("patientId") || "";
  const initialVisitId = searchParams.get("visitId") || "";

  const [tab, setTab] = useState<"admit" | "active" | "discharge">(initialTab);
  const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId);
  const [selectedVisitId, setSelectedVisitId] = useState(initialVisitId);
  const [selectedBedId, setSelectedBedId] = useState("");
  const [selectedNurseId, setSelectedNurseId] = useState("");
  const [selectedTariffCode, setSelectedTariffCode] = useState("BED_GEN_WARD");
  const [selectedAdmissionId, setSelectedAdmissionId] = useState("");
  const [dischargeCondition, setDischargeCondition] = useState("Improved");
  const [admitSuccess, setAdmitSuccess] = useState(false);

  // Filters for active admissions
  const [searchQuery, setSearchQuery] = useState("");
  const [filterWard, setFilterWard] = useState("all");
  const [filterPayment, setFilterPayment] = useState<"all" | "paid" | "unpaid">("all");

  // Patient search mode in admit tab
  const [patientSearchQuery, setPatientSearchQuery] = useState("");

  useEffect(() => {
    if (initialPatientId) {
      setSelectedPatientId(initialPatientId);
      if (initialVisitId) setSelectedVisitId(initialVisitId);
      setTab("admit");
    }
  }, [initialPatientId, initialVisitId]);

  // Queries
  const { data: beds = [], isRefetching: isRefetchingBeds, refetch: refetchBeds } = useQuery({
    ...trpc.ward.beds.queryOptions(),
    refetchOnMount: true,
  });

  const { data: admissions = [], isRefetching: isRefetchingAdmissions, refetch: refetchAdmissions } = useQuery({
    ...trpc.ward.admissions.queryOptions(),
    refetchOnMount: true,
  });

  const { data: nurses = [] } = useQuery({
    ...trpc.ward.nurses.queryOptions(),
    refetchOnMount: true,
  });

  const { data: queue = [] } = useQuery(trpc.visit.queue.queryOptions());
  const { data: tariffs = [] } = useQuery(trpc.tariff.list.queryOptions({ category: "inpatient", activeOnly: true }));

  // Patient query if initialPatientId is provided
  const { data: directPatient } = useQuery({
    ...trpc.patient.get.queryOptions({ id: selectedPatientId }),
    enabled: !!selectedPatientId,
  });

  // Patient directory search
  const { data: searchedPatients = [] } = useQuery({
    ...trpc.patient.search.queryOptions({ query: patientSearchQuery }),
    enabled: patientSearchQuery.trim().length >= 2,
  });

  const availableBeds = beds.filter((b) => b.status === "available" && (!b.admissions || b.admissions.length === 0));
  const queuePatients = queue.filter((q) => q.status !== "done");

  const selectedBed = beds.find((b) => b.id === selectedBedId);
  const selectedNurse = nurses.find((n) => n.id === selectedNurseId);
  const selectedTariff = tariffs.find((t) => t.code === selectedTariffCode);
  const nursingTariff = tariffs.find((t) => t.code === "CARE_NURSING_DAILY") ?? { price: 70 };

  const currentBedPrice = selectedTariff?.price ?? selectedBed?.dailyRate ?? 120;
  const currentNursingPrice = nursingTariff?.price ?? 70;

  // Mutations
  const admit = useMutation(
    trpc.ward.admit.mutationOptions({
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: trpc.ward.beds.queryKey() });
        qc.invalidateQueries({ queryKey: trpc.ward.admissions.queryKey() });
        setAdmitSuccess(true);
        setSelectedPatientId("");
        setSelectedVisitId("");
        setSelectedBedId("");
        setSelectedNurseId("");
        toast.success("Patient admitted to bed");
      },
      onError: (err) => {
        toast.error(err.message || "Failed to admit patient");
      },
    })
  );

  const discharge = useMutation(
    trpc.ward.discharge.mutationOptions({
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: trpc.ward.beds.queryKey() });
        qc.invalidateQueries({ queryKey: trpc.ward.admissions.queryKey() });
        toast.success("Patient discharged and bed freed");
        setSelectedAdmissionId("");
        setTab("active");
      },
      onError: (err) => {
        toast.error(err.message || "Failed to process discharge");
      },
    })
  );

  const assignNurseMutation = useMutation(
    trpc.ward.assignNurse.mutationOptions({
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: trpc.ward.admissions.queryKey() });
        toast.success("Duty nurse updated");
      },
      onError: (err) => {
        toast.error(err.message || "Failed to assign nurse");
      },
    })
  );

  const selectedAdmissionToDischarge = admissions.find((a) => a.id === selectedAdmissionId);
  const isSelectedAdmissionPaid = selectedAdmissionToDischarge?.paymentStatus === "paid";

  // Filtered active admissions
  const filteredAdmissions = useMemo(() => {
    return admissions.filter((a) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = a.patient.nameEn?.toLowerCase().includes(q) || a.patient.nameAm?.toLowerCase().includes(q);
        const matchHealthId = a.patient.healthId?.toLowerCase().includes(q);
        const matchRoom = a.bed?.room?.toLowerCase().includes(q) || a.bed?.ward?.toLowerCase().includes(q);
        const matchNurse = a.assignedNurseName?.toLowerCase().includes(q);
        if (!matchName && !matchHealthId && !matchRoom && !matchNurse) return false;
      }

      if (filterWard !== "all" && a.bed.ward !== filterWard) {
        return false;
      }

      if (filterPayment !== "all") {
        if (filterPayment === "paid" && a.paymentStatus !== "paid") return false;
        if (filterPayment === "unpaid" && a.paymentStatus === "paid") return false;
      }

      return true;
    });
  }, [admissions, searchQuery, filterWard, filterPayment]);

  const uniqueWards = useMemo(() => {
    return Array.from(new Set(beds.map((b) => b.ward).filter(Boolean)));
  }, [beds]);

  const pendingCount = admissions.filter((a) => a.paymentStatus !== "paid").length;

  const activeSelectedPatientName = useMemo(() => {
    if (!selectedPatientId) return "";
    const fromQueue = queue.find((q) => q.visit.patientId === selectedPatientId);
    if (fromQueue) return `${fromQueue.visit.patient.nameEn} (${fromQueue.visit.patient.healthId})`;
    if (directPatient) return `${directPatient.nameEn} (${directPatient.healthId})`;
    const fromSearch = searchedPatients.find((p) => p.id === selectedPatientId);
    if (fromSearch) return `${fromSearch.nameEn} (${fromSearch.healthId})`;
    return selectedPatientId;
  }, [selectedPatientId, queue, directPatient, searchedPatients]);

  return (
    <PageShell
      title="Inpatient Admissions"
      subtitle="Bed allocation, duty nurses, active patients and discharges"
      action={
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              refetchBeds();
              refetchAdmissions();
            }}
            disabled={isRefetchingBeds || isRefetchingAdmissions}
            className="p-2 text-xs font-medium rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors shadow-xs"
            title="Refresh"
          >
            <RefreshCw size={14} className={isRefetchingBeds || isRefetchingAdmissions ? "animate-spin text-teal-600" : ""} />
          </button>

          <Link
            href="/nova/ward"
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Bed size={14} className="text-teal-600" />
            <span>Beds</span>
          </Link>

          <Link
            href="/nova/nurse"
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Users size={14} className="text-teal-600" />
            <span>Nurse Census</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-4 pb-12 w-full max-w-[1600px] mx-auto">
        {/* Compact KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Active Patients</p>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">{admissions.length}</span>
              <span className="text-xs text-slate-400">admitted</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Available Beds</p>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{availableBeds.length}</span>
              <span className="text-xs text-slate-400">/ {beds.length} free</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Nurses on Duty</p>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">{nurses.length}</span>
              <span className="text-xs text-slate-400">staff</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Unpaid Stays</p>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{pendingCount}</span>
              <span className="text-xs text-slate-400">awaiting cashier</span>
            </div>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5">
          <button
            onClick={() => {
              setTab("active");
              setAdmitSuccess(false);
            }}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              tab === "active"
                ? "bg-teal-600 text-white shadow-xs"
                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-teal-500"
            }`}
          >
            <Users size={14} />
            <span>Active Patients ({admissions.length})</span>
          </button>

          <button
            onClick={() => {
              setTab("admit");
              setAdmitSuccess(false);
            }}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              tab === "admit"
                ? "bg-teal-600 text-white shadow-xs"
                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-teal-500"
            }`}
          >
            <Plus size={14} />
            <span>+ Admit Patient</span>
          </button>

          <button
            onClick={() => {
              setTab("discharge");
              setAdmitSuccess(false);
            }}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              tab === "discharge"
                ? "bg-teal-600 text-white shadow-xs"
                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-teal-500"
            }`}
          >
            <LogOut size={14} />
            <span>Discharge</span>
          </button>
        </div>

        {/* ─── TAB 1: ACTIVE PATIENTS TABLE ─────────────────────── */}
        {tab === "active" && (
          <div className="space-y-3">
            {/* Filter Bar */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <div className="relative w-full sm:w-72">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search patient, MRN, bed…"
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  className="text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                  value={filterWard}
                  onChange={(e) => setFilterWard(e.target.value)}
                >
                  <option value="all">All Wards</option>
                  {uniqueWards.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>

                <select
                  className="text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                  value={filterPayment}
                  onChange={(e) => setFilterPayment(e.target.value as any)}
                >
                  <option value="all">All Status</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
            </div>

            {/* Optimal Table */}
            {filteredAdmissions.length === 0 ? (
              <Card className="p-10 text-center">
                <Bed size={36} className="text-slate-300 mx-auto mb-2" />
                <p className="text-slate-700 dark:text-slate-200 font-semibold text-sm">
                  {admissions.length === 0 ? "No active inpatients." : "No matching patients found."}
                </p>
                {admissions.length === 0 && (
                  <button onClick={() => setTab("admit")} className={`mt-3 ${btnPrimary}`}>
                    + Admit Patient
                  </button>
                )}
              </Card>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-3.5">Bed / Room</th>
                      <th className="py-3 px-3.5">Patient</th>
                      <th className="py-3 px-3.5">Stay</th>
                      <th className="py-3 px-3.5">Duty Nurse</th>
                      <th className="py-3 px-3.5">Cashier Bill</th>
                      <th className="py-3 px-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredAdmissions.map((a) => {
                      const isPaid = a.paymentStatus === "paid";
                      return (
                        <tr key={a.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-850/50 transition-colors">
                          {/* Bed */}
                          <td className="py-3 px-3.5 font-medium whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
                                #{a.bed.room}
                              </span>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800">
                                {a.bed.ward}
                              </span>
                            </div>
                          </td>

                          {/* Patient */}
                          <td className="py-3 px-3.5">
                            <p className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
                              {a.patient.nameEn}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              MRN: <span className="font-mono">{a.patient.healthId}</span>
                            </p>
                          </td>

                          {/* Stay */}
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                              {a.daysElapsed} {a.daysElapsed === 1 ? "day" : "days"}
                            </span>
                            <p className="text-[10px] text-slate-400">
                              {new Date(a.admittedAt).toLocaleDateString()}
                            </p>
                          </td>

                          {/* Duty Nurse */}
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            <select
                              className="text-[11px] py-1 px-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-teal-500 focus:outline-hidden"
                              value={a.assignedNurseId || ""}
                              onChange={(e) => {
                                const nurse = nurses.find((n) => n.id === e.target.value);
                                if (nurse) {
                                  assignNurseMutation.mutate({
                                    admissionId: a.id,
                                    assignedNurseId: nurse.id,
                                    assignedNurseName: nurse.name,
                                  });
                                }
                              }}
                            >
                              <option value="">{a.assignedNurseName || "Assign nurse…"}</option>
                              {nurses.map((n) => (
                                <option key={n.id} value={n.id}>
                                  {n.name}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Cashier Bill */}
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            <p className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs">
                              ETB {a.totalAccrued.toLocaleString()}
                            </p>
                            <div className="mt-0.5">
                              {isPaid ? (
                                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                  ● Paid
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                                  ● Unpaid
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <Link
                                href="/nova/nurse/mar"
                                className="px-2 py-1 text-[11px] font-medium rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
                                title="Give Medicines (MAR)"
                              >
                                <Pill size={11} className="text-teal-600" />
                                <span>Meds</span>
                              </Link>

                              <Link
                                href="/nova/nurse/notes"
                                className="px-2 py-1 text-[11px] font-medium rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
                                title="Nurse Notes"
                              >
                                <FileText size={11} className="text-teal-600" />
                                <span>Notes</span>
                              </Link>

                              <button
                                onClick={() => {
                                  setSelectedAdmissionId(a.id);
                                  setTab("discharge");
                                }}
                                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                                  isPaid
                                    ? "bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900"
                                    : "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-200 border border-amber-300 dark:border-amber-800"
                                }`}
                                title={isPaid ? "Proceed to discharge" : "Patient must pay at Cashier before discharge"}
                              >
                                {isPaid ? "Discharge" : "Discharge (Unpaid)"}
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

        {/* ─── TAB 2: ADMIT PATIENT ────────────────────────────── */}
        {tab === "admit" && (
          <Card className="p-5 max-w-2xl mx-auto shadow-sm">
            {admitSuccess ? (
              <div className="text-center py-8 space-y-3">
                <CheckCircle2 size={46} className="text-teal-600 mx-auto" />
                <h3 className="font-bold text-xl text-slate-900 dark:text-slate-100">
                  Patient Admitted
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Bed assigned and nurse notified. Daily stay charges billed at Cashier.
                </p>

                <div className="pt-2 flex justify-center gap-2">
                  <button
                    onClick={() => {
                      setAdmitSuccess(false);
                      setTab("active");
                    }}
                    className={btnPrimary}
                  >
                    View Active Patients
                  </button>
                  <button
                    onClick={() => {
                      setAdmitSuccess(false);
                      setSelectedPatientId("");
                      setSelectedBedId("");
                      setSelectedNurseId("");
                    }}
                    className={btnSecondary}
                  >
                    Admit Another
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                    Admit Patient
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Assign bed, duty nurse, and daily tariff.
                  </p>
                </div>

                <div className="space-y-3">
                  {/* Patient Select */}
                  <FormField label="1. Patient">
                    {selectedPatientId && activeSelectedPatientName ? (
                      <div className="flex items-center justify-between p-2.5 rounded-lg border border-teal-300 dark:border-teal-700 bg-teal-50/50 dark:bg-teal-950/30">
                        <div>
                          <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                            {activeSelectedPatientName}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPatientId("");
                            setSelectedVisitId("");
                          }}
                          className="text-xs text-teal-700 dark:text-teal-300 font-semibold hover:underline"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <select
                          className={inputCls}
                          value={selectedPatientId}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSelectedPatientId(val);
                            const matchQ = queuePatients.find((q) => q.visit.patientId === val);
                            if (matchQ) setSelectedVisitId(matchQ.visitId);
                          }}
                        >
                          <option value="">Select from OPD queue…</option>
                          {queuePatients.map((q) => (
                            <option key={q.visitId} value={q.visit.patientId}>
                              {q.visit.patient.nameEn} — MRN: {q.visit.patient.healthId} (Ticket: {q.ticketNumber})
                            </option>
                          ))}
                        </select>

                        <div className="relative">
                          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Or search by Name or MRN…"
                            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                            value={patientSearchQuery}
                            onChange={(e) => setPatientSearchQuery(e.target.value)}
                          />
                        </div>

                        {searchedPatients.length > 0 && !selectedPatientId && (
                          <div className="border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 max-h-36 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700 text-xs">
                            {searchedPatients.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  setSelectedPatientId(p.id);
                                  setPatientSearchQuery("");
                                }}
                                className="w-full text-left p-2 hover:bg-slate-50 dark:hover:bg-slate-750 flex items-center justify-between"
                              >
                                <div>
                                  <span className="font-semibold text-slate-800 dark:text-slate-100">{p.nameEn}</span>
                                  <span className="text-slate-400 text-[11px] ml-1.5">MRN: {p.healthId}</span>
                                </div>
                                <span className="text-teal-600 text-xs font-semibold">Select</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </FormField>

                  {/* Bed & Nurse */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField label="2. Ward Bed">
                      {availableBeds.length === 0 ? (
                        <p className="text-xs text-red-600 p-2 border border-red-200 rounded-lg">No beds free.</p>
                      ) : (
                        <select
                          className={inputCls}
                          value={selectedBedId}
                          onChange={(e) => setSelectedBedId(e.target.value)}
                        >
                          <option value="">Select available bed…</option>
                          {availableBeds.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.ward} — Bed #{b.room} (ETB {b.dailyRate}/d)
                            </option>
                          ))}
                        </select>
                      )}
                    </FormField>

                    <FormField label="3. Duty Nurse">
                      <select
                        className={inputCls}
                        value={selectedNurseId}
                        onChange={(e) => setSelectedNurseId(e.target.value)}
                      >
                        <option value="">Select duty nurse…</option>
                        {nurses.map((n) => (
                          <option key={n.id} value={n.id}>
                            {n.name}
                          </option>
                        ))}
                      </select>
                    </FormField>
                  </div>

                  {/* Tariff */}
                  <FormField label="4. Tariff Plan">
                    <select
                      className={inputCls}
                      value={selectedTariffCode}
                      onChange={(e) => setSelectedTariffCode(e.target.value)}
                    >
                      {tariffs.map((t) => (
                        <option key={t.id} value={t.code}>
                          {t.name} — ETB {t.price}/day
                        </option>
                      ))}
                    </select>
                  </FormField>

                  {/* Rate Summary */}
                  <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg p-3 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span>Daily Bed Rate:</span>
                      <span className="font-mono font-semibold">ETB {currentBedPrice} / day</span>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span>Daily Nursing Care:</span>
                      <span className="font-mono font-semibold">ETB {currentNursingPrice} / day</span>
                    </div>
                    <div className="pt-1.5 border-t border-slate-200 dark:border-slate-700 flex justify-between font-bold text-slate-900 dark:text-slate-100">
                      <span>Total Daily Charge:</span>
                      <span className="font-mono text-teal-600">ETB {currentBedPrice + currentNursingPrice} / day</span>
                    </div>
                    <p className="text-[10px] text-slate-400 pt-0.5">* Charges settled at Cashier</p>
                  </div>
                </div>

                {admit.error && (
                  <p className="p-2 bg-red-50 text-xs text-red-600 rounded-lg border border-red-200">
                    {admit.error.message}
                  </p>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    className={btnPrimary}
                    disabled={!selectedPatientId || !selectedBedId || admit.isPending}
                    onClick={() =>
                      admit.mutate({
                        patientId: selectedPatientId,
                        visitId: selectedVisitId || undefined,
                        bedId: selectedBedId,
                        assignedNurseId: selectedNurse?.id,
                        assignedNurseName: selectedNurse?.name,
                        tariffCode: selectedTariffCode,
                        dailyRate: currentBedPrice,
                        nursingDailyFee: currentNursingPrice,
                      })
                    }
                  >
                    {admit.isPending ? "Admitting…" : "Admit Patient"}
                  </button>
                  <button className={btnSecondary} onClick={() => setTab("active")}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* ─── TAB 3: DISCHARGE ─────────────────────────────────── */}
        {tab === "discharge" && (
          <Card className="p-5 max-w-xl mx-auto shadow-sm">
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 mb-0.5">
              Discharge Patient
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Patient must pay hospital bill at Cashier before discharge can be confirmed.
            </p>

            <div className="space-y-3.5">
              <FormField label="Patient to Discharge">
                <select
                  className={inputCls}
                  value={selectedAdmissionId}
                  onChange={(e) => setSelectedAdmissionId(e.target.value)}
                >
                  <option value="">Select admission…</option>
                  {admissions.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.patient.nameEn} ({a.patient.healthId}) — {a.bed.ward} Bed #{a.bed.room} ({a.daysElapsed}d) — {a.paymentStatus === "paid" ? "Paid" : "Unpaid"}
                    </option>
                  ))}
                </select>
              </FormField>

              {selectedAdmissionToDischarge && (
                <div className="space-y-3">
                  {/* Summary Box */}
                  <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg p-3 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
                    <div className="flex justify-between font-bold text-slate-900 dark:text-slate-100 pb-1 border-b border-slate-200 dark:border-slate-700">
                      <span>{selectedAdmissionToDischarge.patient.nameEn}</span>
                      <span>
                        {selectedAdmissionToDischarge.bed.ward} #{selectedAdmissionToDischarge.bed.room}
                      </span>
                    </div>

                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span>Stay Duration:</span>
                      <span className="font-semibold">{selectedAdmissionToDischarge.daysElapsed} days</span>
                    </div>

                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span>Total Stay Bill:</span>
                      <span className="font-mono font-bold text-teal-600">
                        ETB {selectedAdmissionToDischarge.totalAccrued.toLocaleString()}
                      </span>
                    </div>

                    {/* Cashier Payment Status Check */}
                    <div className="flex justify-between items-center pt-1 border-t border-slate-200 dark:border-slate-700">
                      <span className="text-slate-500 font-medium">Cashier Status:</span>
                      {isSelectedAdmissionPaid ? (
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          ✓ Paid (Cleared for discharge)
                        </span>
                      ) : (
                        <span className="font-bold text-red-600 dark:text-red-400">
                          ✕ Unpaid (Payment required first)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Warning when bill is not paid */}
                  {!isSelectedAdmissionPaid && (
                    <div className="p-2.5 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-xs text-red-700 dark:text-red-300 font-medium flex items-center gap-2">
                      <AlertCircle size={15} className="shrink-0 text-red-600" />
                      <span>
                        Payment required. The patient must pay the stay bill at the Cashier before the ward nurse can discharge them.
                      </span>
                    </div>
                  )}

                  {/* Outcome Select */}
                  <FormField label="Condition / Outcome">
                    <select
                      className={inputCls}
                      value={dischargeCondition}
                      onChange={(e) => setDischargeCondition(e.target.value)}
                    >
                      <option value="Improved">Improved</option>
                      <option value="Recovered">Recovered</option>
                      <option value="Transferred to Tertiary Center">Transferred to Tertiary Hospital</option>
                      <option value="Against medical advice">Against Medical Advice (AMA)</option>
                      <option value="Deceased">Deceased</option>
                    </select>
                  </FormField>
                </div>
              )}

              {discharge.error && (
                <p className="p-2 bg-red-50 text-xs text-red-600 rounded-lg border border-red-200">
                  {discharge.error.message}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  className={btnPrimary}
                  disabled={!selectedAdmissionId || !isSelectedAdmissionPaid || discharge.isPending}
                  onClick={() =>
                    discharge.mutate({
                      admissionId: selectedAdmissionId,
                      dischargeCondition,
                    })
                  }
                >
                  {discharge.isPending
                    ? "Discharging…"
                    : !isSelectedAdmissionPaid
                    ? "Cannot Discharge (Must Pay at Cashier First)"
                    : "Confirm Discharge & Free Bed"}
                </button>
                <button className={btnSecondary} onClick={() => setTab("active")}>
                  Cancel
                </button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </PageShell>
  );
}

export default function AdmissionsPage() {
  return (
    <Suspense
      fallback={
        <PageShell title="Inpatient Admissions">
          <div className="p-8 text-center text-slate-400">Loading…</div>
        </PageShell>
      }
    >
      <AdmissionsContent />
    </Suspense>
  );
}
