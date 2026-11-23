"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { PageShell, Card, FormField, inputCls, btnPrimary, btnSecondary } from "@/components/nova/nova-ui";
import {
  Bed,
  UserCheck,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Search,
  FileText,
  Pill,
  HeartPulse,
  Filter,
  Plus,
  RefreshCw,
  LogOut,
  Receipt,
  Users,
  Building,
  Check,
  ChevronRight,
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
  const [dischargeNotes, setDischargeNotes] = useState("");
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

  // Optional direct patient query if initialPatientId is provided
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
        toast.success("Patient successfully admitted to ward");
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
        toast.success("Patient discharged and bed released");
        setSelectedAdmissionId("");
        setDischargeNotes("");
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
        toast.success("Duty nurse updated successfully");
      },
      onError: (err) => {
        toast.error(err.message || "Failed to assign nurse");
      },
    })
  );

  const selectedAdmissionToDischarge = admissions.find((a) => a.id === selectedAdmissionId);

  // Filtered active admissions
  const filteredAdmissions = useMemo(() => {
    return admissions.filter((a) => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = a.patient.nameEn?.toLowerCase().includes(q) || a.patient.nameAm?.toLowerCase().includes(q);
        const matchHealthId = a.patient.healthId?.toLowerCase().includes(q);
        const matchRoom = a.bed?.room?.toLowerCase().includes(q) || a.bed?.ward?.toLowerCase().includes(q);
        const matchNurse = a.assignedNurseName?.toLowerCase().includes(q);
        if (!matchName && !matchHealthId && !matchRoom && !matchNurse) return false;
      }

      // Ward filter
      if (filterWard !== "all" && a.bed.ward !== filterWard) {
        return false;
      }

      // Payment filter
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

  const paidAdmissionsCount = admissions.filter((a) => a.paymentStatus === "paid").length;
  const pendingAdmissionsCount = admissions.filter((a) => a.paymentStatus !== "paid").length;
  const occupancyRate = beds.length > 0 ? Math.round(((beds.length - availableBeds.length) / beds.length) * 100) : 0;

  // Selected patient display details for admit tab
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
      title="Inpatient Ward & Admissions"
      subtitle="Bed allocation, duty nurse assignment, patient stay tracking & cashier clearance"
      action={
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              refetchBeds();
              refetchAdmissions();
            }}
            disabled={isRefetchingBeds || isRefetchingAdmissions}
            className="p-2 text-xs font-medium rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-xs"
            title="Refresh bed and admission data"
          >
            <RefreshCw size={14} className={isRefetchingBeds || isRefetchingAdmissions ? "animate-spin text-teal-600" : ""} />
          </button>

          <Link
            href="/nova/ward"
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Bed size={14} className="text-teal-600" />
            <span>Bed Board</span>
          </Link>

          <Link
            href="/nova/nurse"
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Users size={14} className="text-teal-600" />
            <span>Nurse Census</span>
          </Link>

          <Link
            href="/nova/billing/invoices"
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 transition-colors flex items-center gap-1.5 shadow-xs"
            title="Open Cashier Office to settle or inspect inpatient invoices"
          >
            <CreditCard size={14} className="text-emerald-600 dark:text-emerald-400" />
            <span>Cashier Office</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-5 pb-12 w-full max-w-[1600px] mx-auto">
        {/* Separation of Duties Notice */}
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl p-3.5 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200">
          <ShieldCheck size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed">
            <span className="font-bold">Clinical Role Separation:</span>{" "}
            Ward nurses and healthcare staff focus exclusively on medical care (beds, vitals, IV therapy, medications, and clinical notes).{" "}
            <span className="font-semibold underline">Ward nurses do NOT collect or receive money.</span> All admission deposits, daily bed fees, and discharge bill payments are handled and receipted directly by the{" "}
            <Link href="/nova/billing/invoices" className="font-bold text-amber-950 dark:text-amber-100 underline hover:text-teal-700">
              Cashier Desk
            </Link>.
          </div>
        </div>

        {/* Compact KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Active Inpatients
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">{admissions.length}</span>
              <span className="text-xs text-slate-400 font-medium">Patients</span>
            </div>
            <p className="mt-1 text-[11px] text-teal-600 dark:text-teal-400 font-medium">Currently in ward beds</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Bed Availability
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{availableBeds.length}</span>
              <span className="text-xs text-slate-400 font-medium">/ {beds.length} Total</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500 font-medium">{occupancyRate}% Floor occupancy</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Duty Nurses
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">{nurses.length}</span>
              <span className="text-xs text-slate-400 font-medium">On Shift</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500 font-medium">Ward & care assignment</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Cashier Clearance
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{paidAdmissionsCount}</span>
              <span className="text-xs text-amber-600 font-medium">({pendingAdmissionsCount} Pending)</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500 font-medium">Receipts billed at Cashier</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <button
            onClick={() => {
              setTab("active");
              setAdmitSuccess(false);
            }}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-2 ${
              tab === "active"
                ? "bg-teal-600 text-white shadow-xs"
                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-teal-500"
            }`}
          >
            <Users size={16} />
            <span>Active Inpatients</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                tab === "active" ? "bg-teal-700 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              }`}
            >
              {admissions.length}
            </span>
          </button>

          <button
            onClick={() => {
              setTab("admit");
              setAdmitSuccess(false);
            }}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-2 ${
              tab === "admit"
                ? "bg-teal-600 text-white shadow-xs"
                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-teal-500"
            }`}
          >
            <Plus size={16} />
            <span>+ Admit Patient</span>
          </button>

          <button
            onClick={() => {
              setTab("discharge");
              setAdmitSuccess(false);
            }}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-2 ${
              tab === "discharge"
                ? "bg-teal-600 text-white shadow-xs"
                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-teal-500"
            }`}
          >
            <LogOut size={16} />
            <span>Discharge & Bed Release</span>
          </button>
        </div>

        {/* ─── TAB 1: ACTIVE INPATIENTS ───────────────────────── */}
        {tab === "active" && (
          <div className="space-y-4">
            {/* Filter & Search Bar */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="relative w-full md:w-80">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search patient, MRN, room # or nurse…"
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Filter size={13} />
                  <span>Ward:</span>
                </div>
                <select
                  className="text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                  value={filterWard}
                  onChange={(e) => setFilterWard(e.target.value)}
                >
                  <option value="all">All Wards ({admissions.length})</option>
                  {uniqueWards.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-1.5 text-xs text-slate-500 ml-2">
                  <span>Cashier Status:</span>
                </div>
                <select
                  className="text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                  value={filterPayment}
                  onChange={(e) => setFilterPayment(e.target.value as any)}
                >
                  <option value="all">All Statuses</option>
                  <option value="unpaid">Pending Cashier</option>
                  <option value="paid">Cleared by Cashier</option>
                </select>
              </div>
            </div>

            {/* Inpatient Cards List */}
            {filteredAdmissions.length === 0 ? (
              <Card className="p-12 text-center">
                <Bed size={40} className="text-slate-300 mx-auto mb-3" />
                <p className="text-slate-700 dark:text-slate-200 font-semibold text-base">
                  {admissions.length === 0 ? "No active inpatient admissions currently." : "No inpatients match your search filters."}
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {admissions.length === 0
                    ? "When patients are admitted to ward beds, they will appear here with live stay metrics and cashier status."
                    : "Try clearing your search query or changing the ward/cashier status filter."}
                </p>
                {admissions.length === 0 && (
                  <button onClick={() => setTab("admit")} className={`mt-4 ${btnPrimary}`}>
                    + Admit First Patient
                  </button>
                )}
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredAdmissions.map((a) => (
                  <div
                    key={a.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs hover:border-teal-400/60 dark:hover:border-teal-500/40 transition-all border-l-4 border-l-teal-500"
                  >
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                      {/* Left: Bed Badge & Patient Details */}
                      <div className="flex items-start sm:items-center gap-4">
                        {/* Bed Pill */}
                        <div className="w-16 h-16 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 flex flex-col items-center justify-center shrink-0">
                          <span className="text-[10px] uppercase font-bold text-teal-700 dark:text-teal-400 leading-none text-center px-1 truncate w-full">
                            {a.bed.ward}
                          </span>
                          <span className="font-extrabold text-lg text-slate-800 dark:text-slate-100 font-mono mt-0.5">
                            #{a.bed.room}
                          </span>
                        </div>

                        {/* Patient & Stay Info */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                              {a.patient.nameEn}
                            </h3>
                            {a.patient.nameAm && (
                              <span className="text-xs text-slate-400">({a.patient.nameAm})</span>
                            )}
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              Day {a.daysElapsed}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                            <span>
                              MRN: <strong className="font-mono text-slate-700 dark:text-slate-300">{a.patient.healthId}</strong>
                            </span>
                            <span>•</span>
                            <span>
                              Admitted: <strong>{new Date(a.admittedAt).toLocaleDateString()}</strong> ({a.daysElapsed} {a.daysElapsed === 1 ? "day" : "days"} stayed)
                            </span>
                            {a.patient.phone && (
                              <>
                                <span>•</span>
                                <span>Tel: {a.patient.phone}</span>
                              </>
                            )}
                          </div>

                          {/* Duty Nurse inline assignment */}
                          <div className="flex items-center gap-2 pt-1">
                            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                              <UserCheck size={14} className="text-teal-600 dark:text-teal-400" />
                              <span className="text-slate-400">Duty Nurse:</span>
                              <span className="font-semibold text-slate-800 dark:text-slate-100">
                                {a.assignedNurseName || "Not Assigned"}
                              </span>
                            </div>

                            <select
                              className="text-[11px] py-0.5 px-2 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-teal-500"
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
                              <option value="">Reassign duty nurse…</option>
                              {nurses.map((n) => (
                                <option key={n.id} value={n.id}>
                                  {n.name} ({n.title || n.role || "Nurse"})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Right: Accrued Charges & Cashier Badge */}
                      <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-3 shrink-0 w-full lg:w-auto pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                        {/* Financial Stay Info (Handled by Cashier) */}
                        <div className="text-left lg:text-right space-y-0.5">
                          <div className="flex items-center gap-1.5 lg:justify-end text-[11px] text-slate-400">
                            <CreditCard size={13} className="text-slate-400" />
                            <span>Inpatient Stay Accrual:</span>
                          </div>
                          <p className="font-mono font-black text-lg text-slate-900 dark:text-slate-100">
                            ETB {a.totalAccrued.toLocaleString()}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Bed: {a.daysElapsed}d × ETB {a.dailyRate} | Nurse: {a.daysElapsed}d × ETB {a.nursingDailyFee}
                          </p>

                          {/* Cashier Clearance Badge */}
                          <div className="pt-1 flex items-center lg:justify-end">
                            {a.paymentStatus === "paid" ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-md">
                                <Check size={12} />
                                <span>Cleared by Cashier</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-md">
                                <Clock size={12} />
                                <span>Billed at Cashier (Pending)</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Link
                            href="/nova/nurse/mar"
                            className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1"
                            title="Medication Administration Record"
                          >
                            <Pill size={12} className="text-teal-600" />
                            <span>Give Meds</span>
                          </Link>

                          <Link
                            href="/nova/nurse/notes"
                            className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1"
                            title="Inpatient Nurse Progress Notes"
                          >
                            <FileText size={12} className="text-teal-600" />
                            <span>Notes</span>
                          </Link>

                          <Link
                            href="/nova/billing/invoices"
                            className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-1"
                            title="View or settle invoice at Cashier Office"
                          >
                            <Receipt size={12} className="text-emerald-600" />
                            <span>Cashier Desk</span>
                          </Link>

                          <button
                            onClick={() => {
                              setSelectedAdmissionId(a.id);
                              setTab("discharge");
                            }}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 flex items-center gap-1 transition-colors"
                          >
                            <span>Discharge</span>
                            <ArrowRight size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 2: ADMIT PATIENT ────────────────────────────── */}
        {tab === "admit" && (
          <Card className="p-6 max-w-3xl mx-auto shadow-sm">
            {admitSuccess ? (
              <div className="text-center py-10 space-y-4">
                <CheckCircle2 size={54} className="text-teal-600 dark:text-teal-400 mx-auto animate-bounce" />
                <h3 className="font-extrabold text-2xl text-slate-900 dark:text-slate-100">
                  Patient Successfully Admitted!
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Bed assigned and primary duty nurse notified. Inpatient room & nursing care tariffs have been automatically posted to the patient's billing ledger.
                </p>

                <div className="p-3 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-xl max-w-md mx-auto text-xs text-teal-800 dark:text-teal-200">
                  <p className="font-semibold">Next Step for Patient / Escort:</p>
                  <p className="text-[11px] text-teal-700 dark:text-teal-300 mt-0.5">
                    Direct the patient's guardian to the <strong>Cashier Office</strong> to submit the required admission deposit and receive an official fiscal receipt.
                  </p>
                </div>

                <div className="pt-3 flex justify-center gap-3">
                  <button
                    onClick={() => {
                      setAdmitSuccess(false);
                      setTab("active");
                    }}
                    className={btnPrimary}
                  >
                    View Active Inpatients ({admissions.length})
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
                    Admit Another Patient
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">
                    New Inpatient Admission
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Assign an available bed, allocate a primary duty nurse, and set daily inpatient tariff.
                  </p>
                </div>

                {/* Cashier Payment Policy Reminder */}
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-xl p-3 flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                  <Receipt size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>
                    <strong>Cashier Policy:</strong> Ward staff does not receive payments. Admission deposits and daily tariffs are collected exclusively at the <strong>Cashier Desk</strong>.
                  </span>
                </div>

                <div className="space-y-4">
                  {/* 1. Patient Selection */}
                  <div className="space-y-2">
                    <FormField label="1. Patient to Admit">
                      {selectedPatientId && activeSelectedPatientName ? (
                        <div className="flex items-center justify-between p-3 rounded-xl border border-teal-300 dark:border-teal-700 bg-teal-50/60 dark:bg-teal-950/30">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-teal-700 dark:text-teal-400 block">
                              Selected Patient
                            </span>
                            <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                              {activeSelectedPatientName}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPatientId("");
                              setSelectedVisitId("");
                            }}
                            className="text-xs font-semibold text-teal-700 dark:text-teal-300 hover:underline"
                          >
                            Change Patient
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
                            <option value="">Select patient from active OPD / Emergency queue…</option>
                            {queuePatients.map((q) => (
                              <option key={q.visitId} value={q.visit.patientId}>
                                {q.visit.patient.nameEn} — MRN: {q.visit.patient.healthId} (Ticket: {q.ticketNumber})
                              </option>
                            ))}
                          </select>

                          {/* Alternative: Search by name/MRN */}
                          <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              placeholder="Or search patient by Name, Phone, or MRN…"
                              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                              value={patientSearchQuery}
                              onChange={(e) => setPatientSearchQuery(e.target.value)}
                            />
                          </div>

                          {searchedPatients.length > 0 && !selectedPatientId && (
                            <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 max-h-40 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700 text-xs">
                              {searchedPatients.map((p) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedPatientId(p.id);
                                    setPatientSearchQuery("");
                                  }}
                                  className="w-full text-left p-2.5 hover:bg-slate-50 dark:hover:bg-slate-750 flex items-center justify-between"
                                >
                                  <div>
                                    <span className="font-semibold text-slate-800 dark:text-slate-100">{p.nameEn}</span>
                                    <span className="text-slate-400 text-[11px] ml-2">MRN: {p.healthId}</span>
                                  </div>
                                  <span className="text-teal-600 text-xs font-medium">Select →</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </FormField>
                  </div>

                  {/* 2. Bed & Nurse Selection Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="2. Available Ward Bed">
                      {availableBeds.length === 0 ? (
                        <div className="p-3 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                          <AlertCircle size={15} className="shrink-0" />
                          <span>No beds currently available. All beds occupied or under maintenance.</span>
                        </div>
                      ) : (
                        <select
                          className={inputCls}
                          value={selectedBedId}
                          onChange={(e) => setSelectedBedId(e.target.value)}
                        >
                          <option value="">Select available bed…</option>
                          {availableBeds.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.ward} — Bed #{b.room} (Base Rate: ETB {b.dailyRate}/day)
                            </option>
                          ))}
                        </select>
                      )}
                    </FormField>

                    <FormField label="3. Primary Duty Nurse">
                      <select
                        className={inputCls}
                        value={selectedNurseId}
                        onChange={(e) => setSelectedNurseId(e.target.value)}
                      >
                        <option value="">Select duty nurse…</option>
                        {nurses.map((n) => (
                          <option key={n.id} value={n.id}>
                            {n.name} ({n.title || n.role || "Staff Nurse"})
                          </option>
                        ))}
                      </select>
                    </FormField>
                  </div>

                  {/* 4. Tariff Category */}
                  <FormField label="4. Inpatient Ward Tariff Category">
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

                  {/* Automatic Inpatient Billing Rate Breakdown */}
                  <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                    <div className="flex items-center justify-between font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                      <span>Automatic Daily Inpatient Rate</span>
                      <span className="text-teal-600 font-mono">Billed to Cashier Account</span>
                    </div>

                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span>Room & Bed Tariff ({selectedTariff?.name || "General Ward"}):</span>
                      <span className="font-mono font-bold">ETB {currentBedPrice} / day</span>
                    </div>

                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span>Inpatient Nursing Care Fee:</span>
                      <span className="font-mono font-bold">ETB {currentNursingPrice} / day</span>
                    </div>

                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-bold text-slate-900 dark:text-slate-100">
                      <span>Total Daily Inpatient Charge:</span>
                      <span className="font-mono text-teal-600 text-sm">
                        ETB {currentBedPrice + currentNursingPrice} / day
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 pt-1 italic">
                      * Bed and care fees accrue automatically each day until the patient is officially discharged.
                    </p>
                  </div>
                </div>

                {admit.error && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-300 rounded-lg flex items-center gap-2">
                    <AlertCircle size={15} />
                    <span>{admit.error.message}</span>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
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
                    {admit.isPending ? "Admitting Patient…" : "Confirm Bed & Assign Nurse"}
                  </button>

                  <button className={btnSecondary} onClick={() => setTab("active")}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* ─── TAB 3: DISCHARGE & CLEARANCE ───────────────────── */}
        {tab === "discharge" && (
          <Card className="p-6 max-w-2xl mx-auto shadow-sm">
            <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 mb-1">
              Patient Discharge & Bed Clearance
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Verify stay duration, confirm Cashier clearance, record clinical outcome, and free up the bed.
            </p>

            <div className="space-y-4">
              <FormField label="Select Admitted Patient to Discharge">
                <select
                  className={inputCls}
                  value={selectedAdmissionId}
                  onChange={(e) => setSelectedAdmissionId(e.target.value)}
                >
                  <option value="">Select admission…</option>
                  {admissions.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.patient.nameEn} ({a.patient.healthId}) — {a.bed.ward} Bed #{a.bed.room} (Stay: {a.daysElapsed}d)
                    </option>
                  ))}
                </select>
              </FormField>

              {selectedAdmissionToDischarge && (
                <div className="space-y-4 pt-1">
                  {/* Financial & Stay Summary */}
                  <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                          {selectedAdmissionToDischarge.patient.nameEn}
                        </span>
                        <span className="text-slate-400 text-xs ml-2">
                          MRN: {selectedAdmissionToDischarge.patient.healthId}
                        </span>
                      </div>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {selectedAdmissionToDischarge.bed.ward} · Bed #{selectedAdmissionToDischarge.bed.room}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500">Inpatient Stay Duration:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {selectedAdmissionToDischarge.daysElapsed} {selectedAdmissionToDischarge.daysElapsed === 1 ? "Day" : "Days"}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500">Daily Bed Rate:</span>
                      <span className="font-mono">
                        ETB {selectedAdmissionToDischarge.dailyRate}/day × {selectedAdmissionToDischarge.daysElapsed}d = ETB {selectedAdmissionToDischarge.bedChargeAccrued}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500">Daily Nursing Care Fee:</span>
                      <span className="font-mono">
                        ETB {selectedAdmissionToDischarge.nursingDailyFee}/day × {selectedAdmissionToDischarge.daysElapsed}d = ETB {selectedAdmissionToDischarge.nursingChargeAccrued}
                      </span>
                    </div>

                    <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-slate-100">
                      <span>Total Inpatient Stay Bill:</span>
                      <span className="font-mono text-teal-600 text-sm">
                        ETB {selectedAdmissionToDischarge.totalAccrued.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Cashier Clearance Status Check */}
                  <div className="p-3.5 rounded-xl border text-xs space-y-1.5 transition-colors">
                    {selectedAdmissionToDischarge.paymentStatus === "paid" ? (
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-emerald-200 flex items-start gap-2.5">
                        <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">✓ Cashier Clearance Verified</p>
                          <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                            The Cashier Office has settled the inpatient invoice. The patient is financially cleared for discharge.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                        <AlertCircle size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-bold">⚠️ Outstanding Stay Charges — Pending Cashier Clearance</p>
                          <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5 leading-relaxed">
                            In private clinics, ward nurses do not collect money. Please verify with the Cashier Office that the patient has received an official stamped receipt before handing over gate clearance.
                          </p>
                          <div className="pt-2">
                            <Link
                              href="/nova/billing/invoices"
                              className="inline-flex items-center gap-1 font-semibold text-xs text-amber-900 dark:text-amber-100 underline hover:text-teal-700"
                            >
                              <span>Open Invoices at Cashier Office</span>
                              <ChevronRight size={13} />
                            </Link>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Clinical Discharge Outcome */}
                  <FormField label="Discharge Condition & Clinical Outcome">
                    <select
                      className={inputCls}
                      value={dischargeCondition}
                      onChange={(e) => setDischargeCondition(e.target.value)}
                    >
                      <option value="Improved">Improved (Recovering, stable for home care)</option>
                      <option value="Recovered">Recovered (Full clinical recovery)</option>
                      <option value="Against medical advice">Against Medical Advice (AMA / Self-discharge)</option>
                      <option value="Transferred to Tertiary Center">Transferred to Tertiary Hospital</option>
                      <option value="Deceased">Deceased</option>
                    </select>
                  </FormField>

                  {/* Optional Discharge Notes */}
                  <FormField label="Discharge Instructions / Handover Notes (Optional)">
                    <textarea
                      rows={2}
                      className={inputCls}
                      placeholder="e.g. Advised 5 days rest, take-home oral medications prescribed, follow-up visit in 1 week…"
                      value={dischargeNotes}
                      onChange={(e) => setDischargeNotes(e.target.value)}
                    />
                  </FormField>
                </div>
              )}

              {discharge.error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 text-xs text-red-600 dark:text-red-300 rounded-lg">
                  {discharge.error.message}
                </div>
              )}

              <div className="flex gap-2 pt-3">
                <button
                  className={btnPrimary}
                  disabled={!selectedAdmissionId || discharge.isPending}
                  onClick={() =>
                    discharge.mutate({
                      admissionId: selectedAdmissionId,
                      dischargeCondition,
                    })
                  }
                >
                  {discharge.isPending ? "Releasing Bed…" : "Confirm Medical Discharge & Free Bed"}
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
        <PageShell title="Inpatient Ward & Admissions">
          <div className="p-12 text-center text-slate-400">Loading Inpatient Admissions…</div>
        </PageShell>
      }
    >
      <AdmissionsContent />
    </Suspense>
  );
}
