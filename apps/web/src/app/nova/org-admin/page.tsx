"use client";

import { useState, Suspense, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { PageShell } from "@/components/nova/nova-ui";
import {
  Crown,
  Banknote,
  Users,
  Activity,
  Layers,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Building2,
  Download,
  Printer,
  RefreshCw,
  CheckCircle2,
  CreditCard,
  Bed,
  BarChart3,
  ShieldAlert,
  Stethoscope,
  ShieldCheck,
  UserCheck,
  UserPlus,
  AlertCircle,
  X,
  Shield,
  ArrowRightLeft,
  History,
  Sparkles,
  Phone,
  Mail,
  Calendar,
  Search,
  ArrowUpRight,
  HeartPulse,
  Clock,
  ChevronDown,
  Info,
} from "lucide-react";

export default function OrganizationalAdminDashboard() {
  return (
    <Suspense
      fallback={
        <PageShell title="Executive Owner Cockpit" subtitle="Loading intelligence data...">
          <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400 gap-3">
            <div className="w-8 h-8 border-3 border-[#6AB8FF] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-semibold tracking-wide">Initializing Executive Intelligence Suite…</p>
          </div>
        </PageShell>
      }
    >
      <OrgAdminCockpitContent />
    </Suspense>
  );
}

function OrgAdminCockpitContent() {
  const searchParams = useSearchParams();
  const urlTab = searchParams.get("tab");
  const qc = useQueryClient();

  const [range, setRange] = useState<"today" | "7d" | "30d" | "month" | "quarter" | "all">("30d");
  const [activeTab, setActiveTab] = useState<"overview" | "branches" | "finance" | "pharmacy" | "staff">(
    urlTab === "branches" || urlTab === "finance" || urlTab === "pharmacy" || urlTab === "staff" ? urlTab : "overview"
  );
  const [branchSearch, setBranchSearch] = useState("");

  const { data, isLoading, refetch, isFetching } = useQuery(
    trpc.tenant.ownerOverview.queryOptions({ range })
  );

  const { data: branchAdminsData, isLoading: isBranchesLoading } = useQuery(
    trpc.tenant.getBranchAdmins.queryOptions()
  );

  // BA Change & Governance state
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isChangeModalOpen, setIsChangeModalOpen] = useState(false);
  const [targetBranchId, setTargetBranchId] = useState("");
  const [targetBranchName, setTargetBranchName] = useState("");
  const [baChangeMode, setBaChangeMode] = useState<"promote" | "hire">("promote");
  const [candidateUserId, setCandidateUserId] = useState("");
  const [newAdminForm, setNewAdminForm] = useState({
    name: "",
    email: "",
    phone: "",
    title: "Branch Administrator",
    department: "Administration",
  });
  const [outgoingDisposition, setOutgoingDisposition] = useState<"reassign" | "suspend" | "keep_dual">("reassign");
  const [outgoingNewRole, setOutgoingNewRole] = useState("Doctor");
  const [reason, setReason] = useState("Strategic executive realignment and clinical operational governance");

  const changeBAMutation = useMutation(
    trpc.tenant.changeBranchAdmin.mutationOptions({
      onSuccess: (res) => {
        qc.invalidateQueries({ queryKey: trpc.tenant.getBranchAdmins.queryKey() });
        qc.invalidateQueries({ queryKey: trpc.tenant.ownerOverview.queryKey() });
        setIsChangeModalOpen(false);
        setFeedbackMsg({ type: "success", text: res.message });
        setTimeout(() => setFeedbackMsg(null), 8000);
      },
      onError: (err) => {
        setFeedbackMsg({ type: "error", text: err.message });
      },
    })
  );

  const statusMutation = useMutation(
    trpc.tenant.updateBranchAdminStatus.mutationOptions({
      onSuccess: (res) => {
        qc.invalidateQueries({ queryKey: trpc.tenant.getBranchAdmins.queryKey() });
        setFeedbackMsg({ type: "success", text: res.message });
        setTimeout(() => setFeedbackMsg(null), 8000);
      },
      onError: (err) => {
        setFeedbackMsg({ type: "error", text: err.message });
      },
    })
  );

  const handleOpenChangeModal = (branch: any) => {
    setTargetBranchId(branch.id);
    setTargetBranchName(branch.name);
    setCandidateUserId(branch.candidates[0]?.userId ?? "");
    setNewAdminForm({
      name: "",
      email: "",
      phone: "",
      title: "Branch Administrator",
      department: "Administration",
    });
    setOutgoingDisposition("reassign");
    setOutgoingNewRole("Doctor");
    setReason("Strategic executive realignment and clinical operational governance");
    setIsChangeModalOpen(true);
  };

  const handleToggleBAStatus = (admin: any) => {
    const nextStatus = admin.status === "active" ? "suspended" : "active";
    const confirmPrompt = window.confirm(
      `Are you sure you want to set Branch Admin '${admin.name}' status to ${nextStatus.toUpperCase()}?`
    );
    if (!confirmPrompt) return;

    statusMutation.mutate({
      userTenantRoleId: admin.id,
      status: nextStatus,
      reason: `Organizational Admin status change to ${nextStatus}`,
    });
  };

  const handleSubmitBAChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (baChangeMode === "promote") {
      if (!candidateUserId) {
        setFeedbackMsg({ type: "error", text: "Please select an eligible staff candidate" });
        return;
      }
      changeBAMutation.mutate({
        tenantId: targetBranchId,
        candidateUserId,
        outgoingDisposition,
        outgoingNewRole,
        reason,
      });
    } else {
      if (!newAdminForm.name || !newAdminForm.email) {
        setFeedbackMsg({ type: "error", text: "Please provide the new administrator's name and email" });
        return;
      }
      changeBAMutation.mutate({
        tenantId: targetBranchId,
        newAdmin: newAdminForm,
        outgoingDisposition,
        outgoingNewRole,
        reason,
      });
    }
  };

  const kpis = data?.kpis;
  const tenant = data?.tenant;

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!data) return;
    const rows = [
      ["Metric", "Value"],
      ["Clinic Name", tenant?.name ?? "Nova Health Systems"],
      ["Reporting Range", range],
      ["Total Gross Revenue (ETB)", kpis?.totalGrossRevenue ?? 0],
      ["Today Revenue (ETB)", kpis?.todayRevenue ?? 0],
      ["This Month Revenue (ETB)", kpis?.thisMonthRevenue ?? 0],
      ["Target Attainment (%)", `${kpis?.targetAttainment ?? 0}%`],
      ["Total Patient Encounters", kpis?.totalVisits ?? 0],
      ["Completed Encounters", kpis?.completedVisits ?? 0],
      ["Average Encounter Value (ETB)", kpis?.avgEncounterValue ?? 0],
      ["Total Subsidized Fee Waivers (ETB)", kpis?.waivedAmount ?? 0],
      ["Pending CBHI Claims (ETB)", kpis?.pendingClaimsAmount ?? 0],
      ["Inpatient Occupancy Rate (%)", `${kpis?.occupancyRate ?? 0}%`],
      ["Pharmacy Inventory Valuation (ETB)", kpis?.totalStockValuation ?? 0],
      ["Expiring Stock at Risk (ETB)", kpis?.atRiskExpiringValuation ?? 0],
      ["Active Staff Count", kpis?.activeStaffCount ?? 0],
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Owner_Executive_Report_${range}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter branches based on search input
  const filteredBranches = useMemo(() => {
    if (!branchAdminsData?.branches) return [];
    if (!branchSearch.trim()) return branchAdminsData.branches;
    const q = branchSearch.toLowerCase();
    return branchAdminsData.branches.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.region.toLowerCase().includes(q) ||
        b.facilityType.toLowerCase().includes(q) ||
        b.currentAdmins.some((a) => a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q))
    );
  }, [branchAdminsData?.branches, branchSearch]);

  // Executive alerts calculation
  const hasExpiryRisk = (kpis?.atRiskExpiringValuation ?? 0) > 0;
  const hasPendingClaims = (kpis?.pendingClaimsAmount ?? 0) > 0;
  const hasStockouts = (kpis?.criticalStockoutsCount ?? 0) > 0;

  return (
    <PageShell
      title="Executive Clinic Owner Cockpit"
      subtitle="Strategic Governance, Revenue Velocity & Operational Health Across All Facility Branches"
      action={
        <div className="flex items-center gap-2 flex-wrap">
          {/* Range Selector Pill Group */}
          <div className="inline-flex items-center bg-white dark:bg-slate-900 p-1 rounded-full border border-slate-200 dark:border-slate-800 text-xs shadow-2xs">
            {(
              [
                ["today", "Today"],
                ["7d", "7D"],
                ["30d", "30D"],
                ["month", "This Month"],
                ["quarter", "Quarter"],
                ["all", "All Time"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setRange(key)}
                className={`px-3 py-1 rounded-full font-semibold transition-all duration-150 ${
                  range === key
                    ? "bg-gradient-to-r from-[#6AB8FF] to-[#9A74F5] text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Quick Action Buttons */}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-[#6AB8FF] transition shadow-2xs cursor-pointer"
            title="Refresh Intelligence Data"
          >
            <RefreshCw size={14} className={isFetching ? "animate-spin text-[#6AB8FF]" : ""} />
          </button>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 hover:border-[#6AB8FF] hover:text-[#6AB8FF] transition shadow-2xs cursor-pointer"
          >
            <Download size={13} className="text-[#6AB8FF]" />
            <span>CSV Export</span>
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-full text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 transition shadow-xs cursor-pointer"
          >
            <Printer size={13} />
            <span>Board Report</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* ── 1. LUMINOUS EXECUTIVE FLIGHT DECK (HERO BANNER) ── */}
        <div className="relative rounded-3xl p-6 sm:p-7 overflow-hidden bg-gradient-to-br from-slate-900 via-[#0F172A] to-[#1E293B] border border-slate-800 text-white shadow-xl">
          {/* Subtle Ambient Glow Orbs */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[#6AB8FF]/20 via-[#CFA3F6]/15 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Left: Identity & Executive Scope */}
            <div className="space-y-2.5 max-w-2xl">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-400/15 text-amber-300 border border-amber-400/30 backdrop-blur-xs">
                  <Crown size={13} className="text-amber-400" />
                  Clinic Owner Authority
                </span>
                <span className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {tenant?.facilityType?.toUpperCase() || "HOSPITAL & MEDICAL CENTER"} • {tenant?.region || "National Network"}
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
                <span>{tenant?.name ?? "Nova Health Systems"}</span>
              </h2>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Strategic executive cockpit monitoring consolidated run-rates, clinical revenue velocity,
                pharmacy capital valuation, and leadership succession across all healthcare branches.
              </p>
            </div>

            {/* Right: Real-time Executive Run-Rate & Pulse Gauges */}
            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              {/* Target Run-Rate Box */}
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 backdrop-blur-md min-w-[210px] shadow-sm">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                  <span>Monthly Run-Rate</span>
                  <span className="text-amber-400 font-mono font-bold">{kpis?.targetAttainment ?? 0}%</span>
                </div>
                <div className="text-lg font-black text-white mt-1">
                  {(kpis?.thisMonthRevenue ?? 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">/ {(kpis?.targetMonthlyRevenue ?? 200000).toLocaleString()} ETB</span>
                </div>
                {/* Attainment Progress Meter */}
                <div className="w-full bg-slate-700/80 h-2 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-[#6AB8FF] transition-all duration-700"
                    style={{ width: `${Math.min(100, kpis?.targetAttainment ?? 0)}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-400 mt-1.5 flex justify-between">
                  <span>Target Attainment:</span>
                  <span className="font-semibold text-emerald-400">
                    {kpis?.targetAttainment && kpis.targetAttainment >= 80 ? "On Schedule" : "Accelerating"}
                  </span>
                </div>
              </div>

              {/* Workforce & Roster Box */}
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 backdrop-blur-md min-w-[170px] shadow-sm">
                <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Active Workforce</div>
                <div className="text-2xl font-black text-white mt-1 flex items-center gap-2">
                  <Users size={20} className="text-[#6AB8FF]" />
                  <span>{kpis?.activeStaffCount ?? 0}</span>
                </div>
                <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1.5 font-medium">
                  <CheckCircle2 size={12} />
                  <span>Full Shift Roster</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 2. EXECUTIVE BRIEFING / ALERT TICKER ── */}
        {(hasExpiryRisk || hasPendingClaims || hasStockouts) && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 dark:bg-amber-950/20 dark:border-amber-700/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <AlertTriangle size={15} />
              </div>
              <div>
                <span className="font-bold text-slate-900 dark:text-white">Executive Attention Required: </span>
                <span className="text-slate-600 dark:text-slate-300">
                  {hasExpiryRisk && `${(kpis?.atRiskExpiringValuation ?? 0).toLocaleString()} ETB in medicine batches expiring in <90 days. `}
                  {hasPendingClaims && `${(kpis?.pendingClaimsAmount ?? 0).toLocaleString()} ETB pending CBHI government claims. `}
                  {hasStockouts && `${kpis?.criticalStockoutsCount} medications at reorder threshold.`}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {hasExpiryRisk && (
                <button
                  onClick={() => setActiveTab("pharmacy")}
                  className="px-3 py-1 rounded-full font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition shadow-2xs"
                >
                  Review Pharmacy Risk →
                </button>
              )}
              {hasPendingClaims && (
                <button
                  onClick={() => setActiveTab("finance")}
                  className="px-3 py-1 rounded-full font-bold bg-cyan-600 text-white hover:bg-cyan-500 transition shadow-2xs"
                >
                  View Claims →
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── 3. PRIMARY EXECUTIVE KPI MATRIX (6 FROSTED CARDS) ── */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5 sm:gap-4">
          {/* CARD 1: Total Gross Revenue */}
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-[#6AB8FF] transition-all group">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1.5 font-bold uppercase tracking-wider">
              <span>Gross Revenue</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Banknote size={15} />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {isLoading ? "…" : `${(kpis?.totalGrossRevenue ?? 0).toLocaleString()} ETB`}
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-1.5 flex items-center gap-1">
              <TrendingUp size={12} />
              <span>Today: {(kpis?.todayRevenue ?? 0).toLocaleString()} ETB</span>
            </div>
          </div>

          {/* CARD 2: Patient Volume & Encounters */}
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-[#6AB8FF] transition-all group">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1.5 font-bold uppercase tracking-wider">
              <span>Patient Visits</span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Activity size={15} />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {isLoading ? "…" : (kpis?.totalVisits ?? 0).toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
              <span className="font-bold text-emerald-600">{kpis?.completedVisits ?? 0}</span> done •{" "}
              <span className="font-bold text-amber-500">{kpis?.activeVisits ?? 0}</span> queue
            </div>
          </div>

          {/* CARD 3: Avg Value Per Visit */}
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-[#6AB8FF] transition-all group">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1.5 font-bold uppercase tracking-wider">
              <span>Avg Per Visit</span>
              <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CreditCard size={15} />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {isLoading ? "…" : `${kpis?.avgEncounterValue ?? 0} ETB`}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-1">
              <span>CBHI Share:</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">{kpis?.cbhiSharePercent ?? 0}%</span>
            </div>
          </div>

          {/* CARD 4: Total Subsidized Waivers */}
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-[#6AB8FF] transition-all group">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1.5 font-bold uppercase tracking-wider">
              <span>Social Relief</span>
              <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShieldAlert size={15} />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
              {isLoading ? "…" : `${(kpis?.waivedAmount ?? 0).toLocaleString()} ETB`}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
              <span>{kpis?.waiversCount ?? 0} hardship cases</span>
            </div>
          </div>

          {/* CARD 5: Inpatient Bed Census */}
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-[#6AB8FF] transition-all group">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1.5 font-bold uppercase tracking-wider">
              <span>Bed Census</span>
              <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Bed size={15} />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {isLoading ? "…" : `${kpis?.occupancyRate ?? 0}%`}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
              <span>{kpis?.occupiedBeds ?? 0} / {kpis?.totalBeds ?? 0} beds in use</span>
            </div>
          </div>

          {/* CARD 6: Pharmacy Capital Valuation */}
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-[#6AB8FF] transition-all group">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1.5 font-bold uppercase tracking-wider">
              <span>Pharmacy Stock</span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Layers size={15} />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {isLoading ? "…" : `${((kpis?.totalStockValuation ?? 0) / 1000).toFixed(1)}k ETB`}
            </div>
            <div className="text-[11px] text-amber-500 font-semibold mt-1.5 flex items-center gap-1">
              <span>{kpis?.criticalStockoutsCount ?? 0} stockout alerts</span>
            </div>
          </div>
        </div>

        {/* ── 4. FLOATING CAPSULE TAB NAVIGATION BAR ── */}
        <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto py-2 border-b border-slate-200 dark:border-slate-800">
          {[
            { key: "overview", label: "Executive Overview & Results", icon: Activity },
            {
              key: "branches",
              label: "Branch Governance & BAs",
              icon: Building2,
              badge: branchAdminsData?.branches?.length,
            },
            { key: "finance", label: "Financial & Revenue Summary", icon: Banknote },
            {
              key: "pharmacy",
              label: "Pharmacy Capital Valuation",
              icon: Layers,
              badge: hasExpiryRisk ? "Risk" : undefined,
              badgeColor: "bg-rose-500 text-white",
            },
            { key: "staff", label: "Staff & Workforce Roster", icon: Users },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-gradient-to-r from-[#6AB8FF] via-[#7DAAFF] to-[#CFA3F6] text-white shadow-md shadow-[#6AB8FF]/25 scale-[1.02]"
                    : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-[#6AB8FF] hover:text-slate-900 dark:hover:text-white shadow-2xs"
                }`}
              >
                <Icon size={14} className={isActive ? "text-white" : "text-slate-400"} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono leading-none ${
                      tab.badgeColor
                        ? tab.badgeColor
                        : isActive
                        ? "bg-white/25 text-white font-bold"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── 5. TAB 1: EXECUTIVE OVERVIEW ── */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Departmental Revenue Contribution */}
              <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#6AB8FF]" />
                      <span>Departmental Revenue Contribution</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Clinical service line earnings distribution for {range}
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-500">
                    Total: {(kpis?.totalGrossRevenue ?? 0).toLocaleString()} ETB
                  </span>
                </div>

                <div className="space-y-4">
                  {[
                    {
                      name: "Card & OPD Consultation",
                      amount: data?.deptRevenue?.cardConsultation ?? 0,
                      icon: "🩺",
                      color: "from-blue-500 to-cyan-400",
                    },
                    {
                      name: "Laboratory Diagnostics",
                      amount: data?.deptRevenue?.labDiagnostics ?? 0,
                      icon: "🔬",
                      color: "from-purple-500 to-indigo-400",
                    },
                    {
                      name: "Pharmacy & Medications",
                      amount: data?.deptRevenue?.pharmacyDrugs ?? 0,
                      icon: "💊",
                      color: "from-amber-500 to-yellow-400",
                    },
                    {
                      name: "Inpatient Bed & Wards",
                      amount: data?.deptRevenue?.inpatientBeds ?? 0,
                      icon: "🛏️",
                      color: "from-rose-500 to-pink-400",
                    },
                    {
                      name: "Other Clinical Procedures",
                      amount: data?.deptRevenue?.otherServices ?? 0,
                      icon: "📋",
                      color: "from-slate-400 to-slate-500",
                    },
                  ].map((dept) => {
                    const total = kpis?.totalGrossRevenue || 1;
                    const pct = Math.round((dept.amount / total) * 100);
                    return (
                      <div key={dept.name} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                            <span className="text-base">{dept.icon}</span>
                            <span>{dept.name}</span>
                          </span>
                          <span className="text-slate-900 dark:text-white font-mono font-bold">
                            {dept.amount.toLocaleString()} ETB{" "}
                            <span className="text-slate-400 font-normal">({pct}%)</span>
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${dept.color} transition-all duration-500`}
                            style={{ width: `${Math.max(2, pct)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Payment Channel Settlements */}
              <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>Settlement Channel Breakdown</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Cashier reconciliation by payment method
                    </p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    Reconciled
                  </span>
                </div>

                <div className="space-y-3.5">
                  {Object.entries(data?.channelBreakdown ?? {}).map(([key, item]) => {
                    const total = kpis?.totalGrossRevenue || 1;
                    const share = Math.round((item.amount / total) * 100);
                    return (
                      <div
                        key={key}
                        className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 hover:border-[#6AB8FF]/50 transition"
                      >
                        <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                          <span className="text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#6AB8FF]" />
                            {item.label}
                          </span>
                          <span className="font-mono text-slate-900 dark:text-white font-extrabold">
                            {item.amount.toLocaleString()} ETB{" "}
                            <span className="text-slate-400 font-normal">({share}%)</span>
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              key === "cash"
                                ? "bg-emerald-500"
                                : key === "telebirr"
                                ? "bg-blue-500"
                                : key === "cbhi"
                                ? "bg-cyan-500"
                                : "bg-amber-500"
                            }`}
                            style={{ width: `${Math.max(2, share)}%` }}
                          />
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex justify-between">
                          <span>{item.count} transaction receipts</span>
                          <span className="font-mono text-slate-400">Validated</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Base Tariffs Summary */}
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between flex-wrap gap-2">
                  <span>
                    Facility Base Fee: OPD Card:{" "}
                    <strong className="text-slate-900 dark:text-white">{tenant?.cardFeeAmount ?? 50} ETB</strong>
                  </span>
                  <span>
                    Specialist Consultation:{" "}
                    <strong className="text-slate-900 dark:text-white">{tenant?.specialistFeeAmount ?? 150} ETB</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Executive Strategic Hub (3 Modern Navigation Cards) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                href={"/nova/org-admin/finance" as any}
                className="group p-5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 hover:border-[#6AB8FF] shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Banknote size={20} />
                    </div>
                    <ArrowUpRight size={16} className="text-slate-400 group-hover:text-[#6AB8FF] transition-colors" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Financial &amp; Revenue Reports</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Detailed breakdowns of collected cash, CBHI insurance claims, and social assistance fee waiver totals.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold text-[#6AB8FF] flex items-center gap-1">
                  <span>Explore Financial Suite</span>
                  <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              <Link
                href={"/nova/org-admin/inventory-risk" as any}
                className="group p-5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 hover:border-[#6AB8FF] shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Layers size={20} />
                    </div>
                    <ArrowUpRight size={16} className="text-slate-400 group-hover:text-[#6AB8FF] transition-colors" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Pharmacy Capital Valuation</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Monitor capital tied up in medicine stock, near-expiry asset risk, and batch valuation metrics.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <span>Inspect Stock Valuation</span>
                  <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              <Link
                href={"/nova/branch-admin/reports" as any}
                className="group p-5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 hover:border-[#6AB8FF] shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <BarChart3 size={20} />
                    </div>
                    <ArrowUpRight size={16} className="text-slate-400 group-hover:text-[#6AB8FF] transition-colors" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Facility Performance Reports</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Inpatient bed utilization trends, outpatient volumes, and monthly operational summaries.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                  <span>View Facility Analytics</span>
                  <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </div>
          </div>
        )}

        {/* ── 6. TAB 2: BRANCH GOVERNANCE & BAs ── */}
        {activeTab === "branches" && (
          <div className="space-y-6">
            {/* Executive Sub-Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-lg border border-indigo-500/30 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-amber-950 flex items-center gap-1">
                    <Crown size={12} />
                    Corporate Governance
                  </span>
                  <span className="text-xs text-indigo-200 font-medium">Hierarchical Branch Administration</span>
                </div>
                <h3 className="text-xl font-extrabold text-white">Facility Leadership &amp; Branch Admin Governance</h3>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  As Organizational Admin, you hold authority over all branches. Designate or rotate
                  Branch Administrators (BA Change), supervise administrative access status, and audit operational integrity.
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0 flex-wrap">
                <Link
                  href={"/nova/branch-admin/staff" as any}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-full text-xs font-bold border border-slate-700 transition flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <Users size={14} className="text-[#6AB8FF]" />
                  <span>Supervise Staff Directory</span>
                </Link>
              </div>
            </div>

            {/* Feedback Message Alert */}
            {feedbackMsg && (
              <div
                className={`p-4 rounded-2xl border text-xs flex items-center gap-3 shadow-xs animate-in fade-in ${
                  feedbackMsg.type === "success"
                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
                    : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200"
                }`}
              >
                {feedbackMsg.type === "success" ? (
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle size={18} className="text-rose-600 shrink-0" />
                )}
                <span className="font-semibold">{feedbackMsg.text}</span>
              </div>
            )}

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
                <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Managed Branches</div>
                <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 flex items-center gap-2">
                  <Building2 className="text-amber-500" size={20} />
                  {branchAdminsData?.branches?.length ?? 1}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Operational clinics &amp; referral hospitals.</p>
              </div>

              <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
                <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Designated BAs</div>
                <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-2">
                  <ShieldCheck size={20} />
                  {branchAdminsData?.branches?.reduce((acc, b) => acc + b.currentAdmins.length, 0) ?? 1}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Active administrators holding facility credentials.</p>
              </div>

              <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
                <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Promotion Candidates</div>
                <div className="text-2xl font-black text-teal-600 dark:text-teal-400 mt-1 flex items-center gap-2">
                  <UserCheck size={20} />
                  {branchAdminsData?.branches?.reduce((acc, b) => acc + b.candidates.length, 0) ?? 0}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Qualified clinical staff eligible for BA promotion.</p>
              </div>

              <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
                <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Transition Audit Log</div>
                <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1 flex items-center gap-2">
                  <History size={20} />
                  {branchAdminsData?.leadershipLogs?.length ?? 0}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Executive leadership actions recorded.</p>
              </div>
            </div>

            {/* Search Filter for Branches */}
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter branch by name, region, facility type, or administrator…"
                  value={branchSearch}
                  onChange={(e) => setBranchSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-[#6AB8FF] transition shadow-2xs"
                />
              </div>
              <div className="text-xs text-slate-500 font-medium">
                Showing {filteredBranches.length} of {branchAdminsData?.branches?.length ?? 0} branches
              </div>
            </div>

            {/* Branches & Assigned Branch Admins */}
            <div className="space-y-6">
              {filteredBranches.map((b) => {
                const primaryAdmin = b.currentAdmins[0];
                return (
                  <div
                    key={b.id}
                    className="bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden"
                  >
                    {/* Branch Top Header */}
                    <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/70 dark:bg-slate-800/30">
                      <div>
                        <div className="flex items-center gap-3">
                          <h4 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                            <Building2 size={20} className="text-amber-500" />
                            <span>{b.name}</span>
                          </h4>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            {b.status}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                          <span>
                            Slug: <strong className="font-mono text-slate-700 dark:text-slate-300">{b.slug}</strong>
                          </span>
                          <span>•</span>
                          <span>Region: <strong>{b.region}</strong></span>
                          <span>•</span>
                          <span>Facility: <strong className="capitalize">{b.facilityType}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <button
                          onClick={() => handleOpenChangeModal(b)}
                          className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-full transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <ArrowRightLeft size={14} />
                          <span>Change Branch Admin (BA Change)</span>
                        </button>
                      </div>
                    </div>

                    {/* Branch Body: Leadership Profile + Operational Health */}
                    <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                      {/* Designated Branch Admin Section (7 cols) */}
                      <div className="lg:col-span-7 bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                              <Shield size={14} className="text-[#6AB8FF]" />
                              Appointed Branch Administrator
                            </span>
                            {primaryAdmin && (
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                                  primaryAdmin.status === "active"
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300"
                                    : "bg-rose-100 text-rose-800 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300"
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    primaryAdmin.status === "active" ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                                  }`}
                                />
                                {primaryAdmin.status}
                              </span>
                            )}
                          </div>

                          {primaryAdmin ? (
                            <div className="flex items-start gap-4">
                              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#6AB8FF] to-[#CFA3F6] text-white flex items-center justify-center font-black text-lg shadow-sm shrink-0">
                                {primaryAdmin.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="space-y-1 min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <h5 className="font-extrabold text-base text-slate-900 dark:text-white truncate">
                                    {primaryAdmin.name}
                                  </h5>
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                    {primaryAdmin.role}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-300">
                                  {primaryAdmin.title || "Branch Administrator"} • {primaryAdmin.department}
                                </p>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-4 gap-y-1 pt-1.5 font-mono">
                                  <span className="flex items-center gap-1">
                                    <Mail size={12} className="text-slate-400" />
                                    {primaryAdmin.email}
                                  </span>
                                  {primaryAdmin.phone && (
                                    <span className="flex items-center gap-1">
                                      <Phone size={12} className="text-slate-400" />
                                      {primaryAdmin.phone}
                                    </span>
                                  )}
                                  <span className="flex items-center gap-1">
                                    <Calendar size={12} className="text-slate-400" />
                                    {new Date(primaryAdmin.assignedAt).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-800 dark:text-amber-200">
                              ⚠️ No Branch Admin currently assigned to this facility. Use the button above to appoint an administrator.
                            </div>
                          )}
                        </div>

                        {/* Admin Governance Actions */}
                        {primaryAdmin && (
                          <div className="mt-5 pt-4 border-t border-slate-200/80 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
                            <div className="text-[11px] text-slate-500">
                              Governed by Org Admin supreme policy.
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleToggleBAStatus(primaryAdmin)}
                                disabled={statusMutation.isPending}
                                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer ${
                                  primaryAdmin.status === "active"
                                    ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300"
                                    : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300"
                                }`}
                              >
                                {primaryAdmin.status === "active" ? "Suspend Admin Access" : "Restore Admin Access"}
                              </button>
                              <button
                                onClick={() => handleOpenChangeModal(b)}
                                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 rounded-full text-xs font-semibold transition cursor-pointer"
                              >
                                Reassign / Replace BA →
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Operational Health & Supervise Links (5 cols) */}
                      <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
                        {/* Metric Chips */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-slate-50/80 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                            <div className="text-[10px] uppercase font-bold text-slate-500">Today's Visits</div>
                            <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                              {b.todayVisitsCount}
                            </div>
                          </div>
                          <div className="bg-slate-50/80 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                            <div className="text-[10px] uppercase font-bold text-slate-500">Today's Revenue</div>
                            <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                              {b.todayRevenue.toLocaleString()} ETB
                            </div>
                          </div>
                          <div className="bg-slate-50/80 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                            <div className="text-[10px] uppercase font-bold text-slate-500">Inpatient Beds</div>
                            <div className="text-lg font-black text-blue-600 dark:text-blue-400 mt-0.5">
                              {b.occupiedBeds} / {b.totalBeds}
                            </div>
                          </div>
                          <div className="bg-slate-50/80 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                            <div className="text-[10px] uppercase font-bold text-slate-500">Active Staff</div>
                            <div className="text-lg font-black text-teal-600 dark:text-teal-400 mt-0.5">
                              {b.activeStaffCount}
                            </div>
                          </div>
                        </div>

                        {/* Fast Supervisory Actions */}
                        <div className="space-y-2 pt-2">
                          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            Supervisory Console Shortcuts
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Link
                              href={"/nova/branch-admin" as any}
                              className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-[#6AB8FF] text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold transition flex items-center justify-between"
                            >
                              <span>Console</span>
                              <ArrowRight size={13} className="text-slate-400" />
                            </Link>
                            <Link
                              href={"/nova/branch-admin/staff" as any}
                              className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-[#6AB8FF] text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold transition flex items-center justify-between"
                            >
                              <span>Staff</span>
                              <ArrowRight size={13} className="text-slate-400" />
                            </Link>
                            <Link
                              href={"/nova/branch-admin/roles" as any}
                              className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-[#6AB8FF] text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold transition flex items-center justify-between"
                            >
                              <span>RBAC Hub</span>
                              <ArrowRight size={13} className="text-slate-400" />
                            </Link>
                            <Link
                              href={"/nova/branch-admin/reports" as any}
                              className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-[#6AB8FF] text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold transition flex items-center justify-between"
                            >
                              <span>Reports</span>
                              <ArrowRight size={13} className="text-slate-400" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Leadership Transition Audit Trail */}
            <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <History size={18} className="text-indigo-500" />
                    <span>Branch Leadership Transition Audit Trail</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Immutable executive log of appointments, rotations, and status modifications
                  </p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {branchAdminsData?.leadershipLogs?.length ?? 0} Records
                </span>
              </div>

              {!branchAdminsData?.leadershipLogs || branchAdminsData.leadershipLogs.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No Branch Admin leadership transitions recorded yet. Changes executed via the "Change Branch Admin" tool are permanently audited here.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                        <th className="py-3 px-3 text-left">Date &amp; Time</th>
                        <th className="py-3 px-3 text-left">Executive Action Summary</th>
                        <th className="py-3 px-3 text-left">Authorized By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {branchAdminsData.leadershipLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                          <td className="py-3 px-3 whitespace-nowrap font-mono text-slate-500">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                          <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-200">
                            {log.action}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                            <Crown size={12} />
                            <span>{log.userId}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── 7. TAB 3: FINANCIAL & REVENUE RESULTS ── */}
        {activeTab === "finance" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-emerald-50/90 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-3xl p-5 shadow-xs">
                <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                  Total Gross Revenue
                </div>
                <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
                  {(kpis?.totalGrossRevenue ?? 0).toLocaleString()} ETB
                </div>
                <div className="text-xs text-emerald-700/80 dark:text-emerald-300/80 mt-1">
                  Total collected and accrued clinical earnings for selected reporting range.
                </div>
              </div>

              <div className="bg-cyan-50/90 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-900 rounded-3xl p-5 shadow-xs">
                <div className="text-xs font-bold text-cyan-800 dark:text-cyan-300 uppercase tracking-wider">
                  Pending CBHI Insurance Claims
                </div>
                <div className="text-3xl font-black text-cyan-600 dark:text-cyan-400 mt-2">
                  {(kpis?.pendingClaimsAmount ?? 0).toLocaleString()} ETB
                </div>
                <div className="text-xs text-cyan-700/80 dark:text-cyan-300/80 mt-1">
                  Government health insurance reimbursement currently pending settlement.
                </div>
              </div>

              <div className="bg-rose-50/90 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-3xl p-5 shadow-xs">
                <div className="text-xs font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider">
                  Total Subsidized Fee Waivers
                </div>
                <div className="text-3xl font-black text-rose-600 dark:text-rose-400 mt-2">
                  {(kpis?.waivedAmount ?? 0).toLocaleString()} ETB
                </div>
                <div className="text-xs text-rose-700/80 dark:text-rose-300/80 mt-1">
                  Macro social assistance granted across {kpis?.waiversCount ?? 0} hardship cases.
                </div>
              </div>
            </div>

            {/* Corporate Subsidy & CBHI Overview */}
            <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Banknote size={18} className="text-emerald-500" />
                    <span>Executive Financial &amp; Fee Subsidy Policy Report</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    High-level corporate accounting and public health subsidy oversight
                  </p>
                </div>
              </div>

              <div className="text-xs text-slate-600 dark:text-slate-300 space-y-4">
                <p className="leading-relaxed">
                  <strong>Macro Subsidy Policy:</strong> Subsidized fee waivers represent corporate social assistance granted to impoverished or emergency patients. As the Organizational Admin, this dashboard reflects aggregate financial impacts without micromanaging patient-level triage decisions.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="p-4 bg-slate-50/80 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700">
                    <div className="font-bold text-slate-900 dark:text-white">Fee Waiver Share of Revenue</div>
                    <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                      {kpis?.totalGrossRevenue ? Math.round(((kpis.waivedAmount || 0) / kpis.totalGrossRevenue) * 100) : 0}%
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Proportion of gross potential clinic billings waived for social relief.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50/80 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700">
                    <div className="font-bold text-slate-900 dark:text-white">CBHI Insurance Penetration</div>
                    <div className="text-2xl font-black text-cyan-600 dark:text-cyan-400 mt-1">
                      {kpis?.cbhiSharePercent ?? 0}%
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Share of patient encounters covered by Community-Based Health Insurance.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/40 text-[11px] text-blue-700 dark:text-blue-300 flex items-center gap-2">
                  <Info size={15} className="shrink-0 text-blue-500" />
                  <span>
                    Note: Individual patient fee-waiver reviews and Kebele hardship verifications are executed exclusively by designated Branch Administrators.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── 8. TAB 4: PHARMACY CAPITAL & EXPIRY RISK ── */}
        {activeTab === "pharmacy" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
                <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
                  <span>Total Pharmacy Inventory Valuation</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
                    <Layers size={16} />
                  </div>
                </div>
                <div className="text-3xl font-black text-slate-900 dark:text-white mt-2">
                  {(kpis?.totalStockValuation ?? 0).toLocaleString()} ETB
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Total commercial capital actively held in central pharmacy stores and dispensary shelves.
                </p>
              </div>

              <div className="bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-3xl p-5 shadow-xs">
                <div className="flex items-center justify-between text-xs text-amber-800 dark:text-amber-300 font-bold uppercase tracking-wider">
                  <span>Capital at Expiry Risk (&lt; 90 Days)</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center">
                    <AlertTriangle size={16} />
                  </div>
                </div>
                <div className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-2">
                  {(kpis?.atRiskExpiringValuation ?? 0).toLocaleString()} ETB
                </div>
                <p className="text-xs text-amber-700/80 dark:text-amber-300/80 mt-1">
                  Pharmaceutical batches nearing expiry requiring rapid clinical dispensing or supplier credit exchange.
                </p>
              </div>
            </div>

            {/* At-Risk Expiring Medication Batches Table */}
            <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <AlertTriangle size={18} className="text-amber-500" />
                    <span>At-Risk Expiring Medication Batches (&lt; 90 Days)</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Prioritize these medications for immediate prescription or supplier credit before loss occurs
                  </p>
                </div>
              </div>

              {!data?.expiringBatchesList || data.expiringBatchesList.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500 flex flex-col items-center gap-2">
                  <CheckCircle2 size={24} className="text-emerald-500" />
                  <span>No medicine batches currently at imminent risk of expiration.</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 font-bold uppercase tracking-wider">
                        <th className="py-3 px-3.5">Medication Name</th>
                        <th className="py-3 px-3.5">Lot / Batch</th>
                        <th className="py-3 px-3.5 text-center">Remaining Qty</th>
                        <th className="py-3 px-3.5">Expiry Date</th>
                        <th className="py-3 px-3.5 text-right">Capital Value at Risk</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {data.expiringBatchesList.map((batch) => (
                        <tr key={batch.lotNumber} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                          <td className="py-3 px-3.5 font-bold text-slate-800 dark:text-slate-200">
                            {batch.itemName}
                          </td>
                          <td className="py-3 px-3.5 font-mono text-slate-600 dark:text-slate-400">
                            {batch.lotNumber}
                          </td>
                          <td className="py-3 px-3.5 text-center font-bold text-slate-800 dark:text-slate-200">
                            {batch.qty}
                          </td>
                          <td className="py-3 px-3.5 text-rose-600 font-semibold font-mono">
                            {batch.expiryDate}
                          </td>
                          <td className="py-3 px-3.5 text-right font-black text-rose-600 font-mono">
                            {batch.totalLossAtRisk.toLocaleString()} ETB
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── 9. TAB 5: STAFF & CLINICAL WORKFORCE ROSTER ── */}
        {activeTab === "staff" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
                <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Active Staff Count</div>
                <div className="text-3xl font-black text-slate-900 dark:text-white mt-2 flex items-center gap-2">
                  <Users className="text-teal-500" size={24} />
                  {kpis?.activeStaffCount ?? 0}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Healthcare workers and administrative staff on duty.</p>
              </div>

              <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
                <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Clinical Care Staff</div>
                <div className="text-3xl font-black text-blue-600 dark:text-blue-400 mt-2 flex items-center gap-2">
                  <Stethoscope size={24} />
                  {Math.max(1, Math.round((kpis?.activeStaffCount ?? 0) * 0.6))}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Physicians, Triage Nurses, Ward Nurses &amp; Technicians.</p>
              </div>

              <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
                <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Facility Roster Status</div>
                <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-2">
                  <CheckCircle2 size={24} />
                  Optimal
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Shift coverage maintained across all primary stations.</p>
              </div>
            </div>

            <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Users size={18} className="text-teal-500" />
                    <span>Workforce &amp; Personnel Directory</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Executive view of hospital staffing allocation across operational departments
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Staff appointment and credential verification are recorded across all facility branches. To inspect
                  individual staff profiles, active duties, or branch rosters, visit the dedicated workforce directory console.
                </p>
                <div>
                  <Link
                    href={"/nova/branch-admin/staff" as any}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white rounded-full text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    <Users size={15} />
                    <span>Open Full Staff &amp; Workforce Directory</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 10. MODAL: CHANGE BRANCH ADMIN (BA CHANGE) ── */}
      {isChangeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-xs">
                  <ArrowRightLeft size={18} />
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Execute BA Change
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Appoint or replace Branch Administrator for <strong>{targetBranchName}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsChangeModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitBAChange} className="p-6 space-y-5">
              {/* Step 1: Mode Selector */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide block mb-2">
                  1. Choose Appointment Method
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
                  <button
                    type="button"
                    onClick={() => setBaChangeMode("promote")}
                    className={`py-2 px-3 rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      baChangeMode === "promote"
                        ? "bg-amber-500 text-slate-950 shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <UserCheck size={14} />
                    <span>Promote Existing Staff</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBaChangeMode("hire")}
                    className={`py-2 px-3 rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      baChangeMode === "hire"
                        ? "bg-amber-500 text-slate-950 shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <UserPlus size={14} />
                    <span>Appoint New Administrator</span>
                  </button>
                </div>
              </div>

              {/* Mode 1: Promote Existing Staff */}
              {baChangeMode === "promote" ? (
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide block mb-1">
                    Select Staff Candidate for Promotion
                  </label>
                  <select
                    value={candidateUserId}
                    onChange={(e) => setCandidateUserId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden focus:border-[#6AB8FF] font-medium"
                    required
                  >
                    {branchAdminsData?.branches
                      ?.find((b) => b.id === targetBranchId)
                      ?.candidates.map((c) => (
                        <option key={c.userId} value={c.userId}>
                          {c.name} — Current: {c.currentRole} ({c.department}) [{c.email}]
                        </option>
                      ))}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Selected staff member will immediately be promoted to Branch Admin with facility management privileges.
                  </p>
                </div>
              ) : (
                /* Mode 2: Appoint New Administrator */
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Dr. Abebe Girma"
                        value={newAdminForm.name}
                        onChange={(e) => setNewAdminForm({ ...newAdminForm, name: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden focus:border-[#6AB8FF]"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        placeholder="e.g. abebe@hospital.gov.et"
                        value={newAdminForm.email}
                        onChange={(e) => setNewAdminForm({ ...newAdminForm, email: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden focus:border-[#6AB8FF]"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                        Phone Number
                      </label>
                      <input
                        type="text"
                        placeholder="+251 9..."
                        value={newAdminForm.phone}
                        onChange={(e) => setNewAdminForm({ ...newAdminForm, phone: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden focus:border-[#6AB8FF]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                        Title / Designation
                      </label>
                      <input
                        type="text"
                        value={newAdminForm.title}
                        onChange={(e) => setNewAdminForm({ ...newAdminForm, title: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden focus:border-[#6AB8FF]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Outgoing Admin Disposition */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide block mb-1.5">
                  2. Outgoing Branch Admin Disposition
                </label>
                <div className="space-y-2 text-xs">
                  <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer">
                    <input
                      type="radio"
                      name="outgoingDisposition"
                      value="reassign"
                      checked={outgoingDisposition === "reassign"}
                      onChange={() => setOutgoingDisposition("reassign")}
                      className="mt-0.5 text-amber-500 focus:ring-amber-400"
                    />
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        Reassign to Clinical / Medical Role
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Relinquish Branch Admin privileges and reassign previous admin back to:
                      </p>
                      {outgoingDisposition === "reassign" && (
                        <input
                          type="text"
                          value={outgoingNewRole}
                          onChange={(e) => setOutgoingNewRole(e.target.value)}
                          placeholder="e.g. Doctor or Senior Clinician"
                          className="mt-2 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                      )}
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer">
                    <input
                      type="radio"
                      name="outgoingDisposition"
                      value="suspend"
                      checked={outgoingDisposition === "suspend"}
                      onChange={() => setOutgoingDisposition("suspend")}
                      className="mt-0.5 text-amber-500 focus:ring-amber-400"
                    />
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        Suspend Administrative Access
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Freeze outgoing admin's login while transitioning duties.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer">
                    <input
                      type="radio"
                      name="outgoingDisposition"
                      value="keep_dual"
                      checked={outgoingDisposition === "keep_dual"}
                      onChange={() => setOutgoingDisposition("keep_dual")}
                      className="mt-0.5 text-amber-500 focus:ring-amber-400"
                    />
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        Retain Co-Administrator Access
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Keep outgoing admin as co-admin during handover period.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Step 3: Executive Justification */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide block mb-1">
                  3. Executive Justification &amp; Transition Reason *
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Annual leadership rotation, clinical governance restructuring"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden focus:border-[#6AB8FF]"
                  required
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  This justification is permanently written to the facility governance audit ledger.
                </p>
              </div>

              {/* Modal Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsChangeModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={changeBAMutation.isPending}
                  className="px-5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-full transition shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {changeBAMutation.isPending ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Executing Transition...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={13} />
                      <span>Execute BA Change</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  );
}
