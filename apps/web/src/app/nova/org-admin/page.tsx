"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { PageShell, Card } from "@/components/nova/nova-ui";
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
} from "lucide-react";

export default function OrganizationalAdminDashboard() {
  return (
    <Suspense
      fallback={
        <PageShell title="Executive Owner Cockpit" subtitle="Loading intelligence data...">
          <div className="p-12 text-center text-xs text-slate-400">Loading Organizational Cockpit...</div>
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
      ["Clinic Name", tenant?.name ?? "Nova Health"],
      ["Reporting Range", range],
      ["Total Gross Revenue (ETB)", kpis?.totalGrossRevenue ?? 0],
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

  return (
    <PageShell
      title="Executive Owner Cockpit"
      subtitle="Organizational Governance, Financial Intelligence & High-Level Operational Reporting"
      action={
        <div className="flex items-center gap-2">
          {/* Range Selector */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
            {(
              [
                ["today", "Today"],
                ["7d", "7 Days"],
                ["30d", "30 Days"],
                ["month", "This Month"],
                ["quarter", "Quarter"],
                ["all", "All Time"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setRange(key)}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  range === key
                    ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            title="Refresh Intelligence Data"
          >
            <RefreshCw size={15} className={isFetching ? "animate-spin text-amber-600" : ""} />
          </button>

          <button
            onClick={handleExportCSV}
            className="px-2.5 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center gap-1 shadow-xs"
          >
            <Download size={13} />
            CSV
          </button>

          <button
            onClick={handlePrint}
            className="px-3 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition flex items-center gap-1.5 shadow-sm"
          >
            <Printer size={13} />
            Print Board Report
          </button>
        </div>
      }
    >
      {/* Executive Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 rounded-2xl p-6 text-white mb-6 shadow-md border border-amber-500/20 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-amber-500/10 to-transparent pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-amber-950 flex items-center gap-1 shadow-xs">
                <Crown size={12} />
                Clinic Owner &amp; Organizational Admin
              </span>
              <span className="text-xs text-amber-200/80 font-mono">
                {tenant?.facilityType?.toUpperCase() || "HOSPITAL & MEDICAL CENTER"} • {tenant?.region || "National"}
              </span>
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
              <span>{tenant?.name ?? "Nova Health Systems"}</span>
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Executive business oversight: monitoring net performance results, overall revenue channels,
              pharmacy capital valuation, and workforce staffing across all facility branches.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl px-4 py-2.5 backdrop-blur-xs">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Month Run-Rate Target</div>
              <div className="text-base font-bold text-amber-400 mt-0.5">
                {kpis?.thisMonthRevenue.toLocaleString() ?? "0"} / {kpis?.targetMonthlyRevenue.toLocaleString() ?? "200,000"} ETB
              </div>
              <div className="w-40 bg-slate-700 h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div
                  className="bg-amber-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, kpis?.targetAttainment ?? 0)}%` }}
                />
              </div>
              <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                <span>Attainment:</span>
                <span className="font-bold text-white">{kpis?.targetAttainment ?? 0}%</span>
              </div>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl px-4 py-2.5 backdrop-blur-xs">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Staff &amp; Clinicians</div>
              <div className="text-xl font-bold text-white mt-0.5 flex items-center gap-1.5">
                <Users size={16} className="text-teal-400" />
                {kpis?.activeStaffCount ?? 0}
              </div>
              <div className="text-[10px] text-emerald-400 mt-0.5 flex items-center gap-1">
                <CheckCircle2 size={10} /> Active On Roster
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Executive KPI Matrix */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
        {/* Total Gross Revenue */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1 font-medium">
            <span>Gross Revenue</span>
            <Banknote size={15} className="text-emerald-600" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white">
            {isLoading ? "…" : `${(kpis?.totalGrossRevenue ?? 0).toLocaleString()} ETB`}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <TrendingUp size={11} />
            Today: {(kpis?.todayRevenue ?? 0).toLocaleString()} ETB
          </div>
        </div>

        {/* Patient Volume & Encounters */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1 font-medium">
            <span>Patient Visits</span>
            <Activity size={15} className="text-blue-600" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white">
            {isLoading ? "…" : (kpis?.totalVisits ?? 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            <span className="font-bold text-emerald-600">{kpis?.completedVisits ?? 0}</span> done •{" "}
            <span className="font-bold text-amber-600">{kpis?.activeVisits ?? 0}</span> queue
          </div>
        </div>

        {/* Avg Value Per Encounter */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1 font-medium">
            <span>Avg Per Visit</span>
            <CreditCard size={15} className="text-indigo-600" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white">
            {isLoading ? "…" : `${kpis?.avgEncounterValue ?? 0} ETB`}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            CBHI Share: <span className="font-bold text-indigo-600">{kpis?.cbhiSharePercent ?? 0}%</span>
          </div>
        </div>

        {/* Total Subsidized Waivers */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1 font-medium">
            <span>Subsidized Waivers</span>
            <ShieldAlert size={15} className="text-rose-600" />
          </div>
          <div className="text-xl font-black text-rose-600 dark:text-rose-400">
            {isLoading ? "…" : `${(kpis?.waivedAmount ?? 0).toLocaleString()} ETB`}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {kpis?.waiversCount ?? 0} hardship cases granted
          </div>
        </div>

        {/* Inpatient Bed Census */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1 font-medium">
            <span>Bed Occupancy</span>
            <Bed size={15} className="text-purple-600" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white">
            {isLoading ? "…" : `${kpis?.occupancyRate ?? 0}%`}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {kpis?.occupiedBeds ?? 0} / {kpis?.totalBeds ?? 0} beds in use
          </div>
        </div>

        {/* Pharmacy Capital Valuation */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1 font-medium">
            <span>Stock Valuation</span>
            <Layers size={15} className="text-amber-600" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white">
            {isLoading ? "…" : `${((kpis?.totalStockValuation ?? 0) / 1000).toFixed(1)}k ETB`}
          </div>
          <div className="text-[11px] text-amber-600 font-semibold mt-1">
            {kpis?.criticalStockoutsCount ?? 0} stockout alerts
          </div>
        </div>
      </div>

      {/* Executive Report Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 mb-6 overflow-x-auto pb-1">
        {[
          { key: "overview", label: "Executive Overview & Results", icon: TrendingUp },
          {
            key: "branches",
            label: "Branch Governance & BAs",
            icon: Building2,
            count: branchAdminsData?.branches?.length,
          },
          { key: "finance", label: "Financial & Revenue Summary", icon: Banknote },
          { key: "pharmacy", label: "Pharmacy Capital Valuation", icon: Layers },
          { key: "staff", label: "Staff & Workforce Roster", icon: Users },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg transition border-b-2 whitespace-nowrap ${
                isActive
                  ? "border-amber-500 text-amber-900 dark:text-amber-300 bg-amber-50/50 dark:bg-amber-950/20"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <Icon size={14} className={isActive ? "text-amber-600" : "text-slate-400"} />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono leading-none ${
                    isActive
                      ? "bg-amber-400 text-amber-950 font-black"
                      : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: EXECUTIVE OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Department Revenue Contribution */}
            <Card title="Departmental Revenue Contribution" subtitle="Revenue generated across clinical service lines">
              <div className="space-y-3.5 mt-2">
                {[
                  {
                    name: "Card & OPD Consultation",
                    amount: data?.deptRevenue?.cardConsultation ?? 0,
                    icon: "🩺",
                    color: "bg-blue-500",
                  },
                  {
                    name: "Laboratory Diagnostics",
                    amount: data?.deptRevenue?.labDiagnostics ?? 0,
                    icon: "🔬",
                    color: "bg-purple-500",
                  },
                  {
                    name: "Pharmacy & Medications",
                    amount: data?.deptRevenue?.pharmacyDrugs ?? 0,
                    icon: "💊",
                    color: "bg-amber-500",
                  },
                  {
                    name: "Inpatient Bed & Wards",
                    amount: data?.deptRevenue?.inpatientBeds ?? 0,
                    icon: "🛏️",
                    color: "bg-rose-500",
                  },
                  {
                    name: "Other Clinical Procedures",
                    amount: data?.deptRevenue?.otherServices ?? 0,
                    icon: "📋",
                    color: "bg-slate-400",
                  },
                ].map((dept) => {
                  const total = kpis?.totalGrossRevenue || 1;
                  const pct = Math.round((dept.amount / total) * 100);
                  return (
                    <div key={dept.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                          <span>{dept.icon}</span> {dept.name}
                        </span>
                        <span className="text-slate-900 dark:text-white font-mono">
                          {dept.amount.toLocaleString()} ETB ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div className={`${dept.color} h-full rounded-full transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Payment Channel Settlements */}
            <Card title="Revenue Collections by Settlement Channel" subtitle="Aggregate payment method distribution">
              <div className="space-y-3 mt-2">
                {Object.entries(data?.channelBreakdown ?? {}).map(([key, item]) => {
                  const total = kpis?.totalGrossRevenue || 1;
                  const share = Math.round((item.amount / total) * 100);
                  return (
                    <div key={key} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between text-xs font-bold mb-1">
                        <span className="text-slate-800 dark:text-slate-200">{item.label}</span>
                        <span className="font-mono text-slate-900 dark:text-white">
                          {item.amount.toLocaleString()} ETB ({share}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            key === "cash"
                              ? "bg-emerald-500"
                              : key === "telebirr"
                              ? "bg-blue-500"
                              : key === "cbhi"
                              ? "bg-cyan-500"
                              : "bg-amber-500"
                          }`}
                          style={{ width: `${share}%` }}
                        />
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        {item.count} transaction receipts
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Corporate Base Tariffs Summary (Read-Only) */}
              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                Facility Base Fee Schedule: OPD Registration Card: <strong className="text-slate-900 dark:text-white">{tenant?.cardFeeAmount ?? 50} ETB</strong> • Specialist Consultation: <strong className="text-slate-900 dark:text-white">{tenant?.specialistFeeAmount ?? 150} ETB</strong>
              </div>
            </Card>
          </div>

          {/* Executive Overview Shortcuts Ribbon (Reports & Financials) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href={"/nova/org-admin/finance" as any}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 hover:border-amber-400 transition shadow-xs group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 rounded-lg text-emerald-700 dark:text-emerald-300">
                  <Banknote size={18} />
                </div>
                <ArrowRight size={15} className="text-slate-400 group-hover:text-emerald-600 transition" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Financial &amp; Revenue Reports</h4>
              <p className="text-xs text-slate-500 mt-1">
                Detailed breakdowns of cash, CBHI insurance reimbursements, and social subsidy fee waiver totals.
              </p>
            </Link>

            <Link
              href={"/nova/org-admin/inventory-risk" as any}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 hover:border-amber-400 transition shadow-xs group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-amber-50 dark:bg-amber-950/50 rounded-lg text-amber-700 dark:text-amber-300">
                  <Layers size={18} />
                </div>
                <ArrowRight size={15} className="text-slate-400 group-hover:text-amber-600 transition" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Pharmacy Capital Valuation</h4>
              <p className="text-xs text-slate-500 mt-1">
                Monitor capital tied up in medicine stock, near-expiry asset risk, and batch valuation metrics.
              </p>
            </Link>

            <Link
              href={"/nova/branch-admin/reports" as any}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 hover:border-amber-400 transition shadow-xs group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-blue-50 dark:bg-blue-950/50 rounded-lg text-blue-700 dark:text-blue-300">
                  <BarChart3 size={18} />
                </div>
                <ArrowRight size={15} className="text-slate-400 group-hover:text-blue-600 transition" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Facility Performance Reports</h4>
              <p className="text-xs text-slate-500 mt-1">
                Inpatient bed utilization trends, outpatient volumes, and monthly executive operational summaries.
              </p>
            </Link>
          </div>
        </div>
      )}

      {/* TAB: BRANCH GOVERNANCE & BAs (BA CHANGE & SUPERVISORY CONTROL) */}
      {activeTab === "branches" && (
        <div className="space-y-6">
          {/* Executive Sub-Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-xl p-5 text-white shadow-md border border-indigo-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-400 text-amber-950 flex items-center gap-1">
                  <Crown size={11} />
                  Corporate Owner Authority
                </span>
                <span className="text-xs text-indigo-200">Hierarchical Branch Administration</span>
              </div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Facility Leadership &amp; Branch Admin Governance</span>
              </h3>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                As Organizational Admin, you have supreme authority over all facility branches. You can designate or rotate Branch Administrators (BA Change), configure administrative access status, and supervise operational performance.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={"/nova/branch-admin/staff" as any}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5 shadow-xs"
              >
                <Users size={14} />
                <span>Supervise Staff Directory</span>
              </Link>
            </div>
          </div>

          {/* Feedback Message */}
          {feedbackMsg && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 shadow-xs animate-in fade-in ${
                feedbackMsg.type === "success"
                  ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
                  : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200"
              }`}
            >
              {feedbackMsg.type === "success" ? (
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle size={16} className="text-rose-600 shrink-0" />
              )}
              <span className="font-semibold">{feedbackMsg.text}</span>
            </div>
          )}

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
              <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Managed Branches</div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 flex items-center gap-2">
                <Building2 className="text-amber-500" size={20} />
                {branchAdminsData?.branches?.length ?? 1}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Operational clinics &amp; referral hospitals.</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
              <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Designated BAs</div>
              <div className="text-2xl font-black text-blue-600 mt-1 flex items-center gap-2">
                <ShieldCheck size={20} />
                {branchAdminsData?.branches?.reduce((acc, b) => acc + b.currentAdmins.length, 0) ?? 1}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Active administrators holding facility credentials.</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
              <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Promotion Candidates</div>
              <div className="text-2xl font-black text-teal-600 mt-1 flex items-center gap-2">
                <UserCheck size={20} />
                {branchAdminsData?.branches?.reduce((acc, b) => acc + b.candidates.length, 0) ?? 0}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Qualified clinical staff eligible for BA promotion.</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
              <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Transition Audit Log</div>
              <div className="text-2xl font-black text-indigo-600 mt-1 flex items-center gap-2">
                <History size={20} />
                {branchAdminsData?.leadershipLogs?.length ?? 0}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Executive leadership actions recorded.</p>
            </div>
          </div>

          {/* Branches & Assigned Branch Admins */}
          <div className="space-y-6">
            {branchAdminsData?.branches?.map((b) => {
              const primaryAdmin = b.currentAdmins[0];
              return (
                <div
                  key={b.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden"
                >
                  {/* Branch Top Header */}
                  <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60 dark:bg-slate-800/30">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                          <Building2 size={18} className="text-amber-500" />
                          <span>{b.name}</span>
                        </h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          {b.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                        <span>Slug: <strong className="font-mono text-slate-700 dark:text-slate-300">{b.slug}</strong></span>
                        <span>•</span>
                        <span>Region: <strong>{b.region}</strong></span>
                        <span>•</span>
                        <span>Facility Type: <strong className="capitalize">{b.facilityType}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenChangeModal(b)}
                        className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition shadow-xs flex items-center gap-1.5"
                      >
                        <ArrowRightLeft size={14} />
                        <span>Change Branch Admin (BA Change)</span>
                      </button>
                    </div>
                  </div>

                  {/* Branch Body: Leadership Card + Operational Health */}
                  <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Designated Branch Admin Section (7 cols) */}
                    <div className="lg:col-span-7 bg-slate-50 dark:bg-slate-800/40 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                            <Shield size={14} className="text-indigo-600" />
                            Appointed Branch Administrator
                          </span>
                          {primaryAdmin && (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
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
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-black text-base shadow-sm shrink-0">
                              {primaryAdmin.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <h5 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                                  {primaryAdmin.name}
                                </h5>
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                  {primaryAdmin.role}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 dark:text-slate-300">
                                {primaryAdmin.title} • {primaryAdmin.department}
                              </p>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 font-mono">
                                <span>📧 {primaryAdmin.email}</span>
                                {primaryAdmin.phone && <span>📞 {primaryAdmin.phone}</span>}
                                <span>🗓️ Appointed: {new Date(primaryAdmin.assignedAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-lg text-xs text-amber-800 dark:text-amber-200">
                            ⚠️ No Branch Admin currently assigned to this facility. Use the button above to appoint an administrator.
                          </div>
                        )}
                      </div>

                      {/* Admin Governance Actions */}
                      {primaryAdmin && (
                        <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
                          <div className="text-[11px] text-slate-500">
                            Governed by Org Admin policy.
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleToggleBAStatus(primaryAdmin)}
                              disabled={statusMutation.isPending}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                                primaryAdmin.status === "active"
                                  ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300"
                                  : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300"
                              }`}
                            >
                              {primaryAdmin.status === "active" ? "Suspend Admin Access" : "Restore Admin Access"}
                            </button>
                            <button
                              onClick={() => handleOpenChangeModal(b)}
                              className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 rounded-lg text-xs font-semibold transition"
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
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                          <div className="text-[10px] uppercase font-bold text-slate-500">Today's Visits</div>
                          <div className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                            {b.todayVisitsCount}
                          </div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                          <div className="text-[10px] uppercase font-bold text-slate-500">Today's Revenue</div>
                          <div className="text-base font-black text-emerald-600 mt-0.5">
                            {b.todayRevenue.toLocaleString()} ETB
                          </div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                          <div className="text-[10px] uppercase font-bold text-slate-500">Inpatient Beds</div>
                          <div className="text-base font-black text-blue-600 mt-0.5">
                            {b.occupiedBeds} / {b.totalBeds}
                          </div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                          <div className="text-[10px] uppercase font-bold text-slate-500">Active Staff</div>
                          <div className="text-base font-black text-teal-600 mt-0.5">
                            {b.activeStaffCount}
                          </div>
                        </div>
                      </div>

                      {/* Fast Supervisory Actions */}
                      <div className="space-y-1.5 pt-2">
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Org Admin Supervisory Shortcuts
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <Link
                            href={"/nova/branch-admin" as any}
                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold transition flex items-center justify-between"
                          >
                            <span>Branch Console</span>
                            <ArrowRight size={13} />
                          </Link>
                          <Link
                            href={"/nova/branch-admin/staff" as any}
                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold transition flex items-center justify-between"
                          >
                            <span>Staff Directory</span>
                            <ArrowRight size={13} />
                          </Link>
                          <Link
                            href={"/nova/branch-admin/roles" as any}
                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold transition flex items-center justify-between"
                          >
                            <span>RBAC Roles Hub</span>
                            <ArrowRight size={13} />
                          </Link>
                          <Link
                            href={"/nova/branch-admin/reports" as any}
                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold transition flex items-center justify-between"
                          >
                            <span>Branch Reports</span>
                            <ArrowRight size={13} />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Section: Leadership Transition & Audit Log */}
          <Card
            title="Branch Leadership Transition Audit Trail"
            subtitle="Immutable corporate log of all Branch Admin appointments, rotations, and status changes"
          >
            {(!branchAdminsData?.leadershipLogs || branchAdminsData.leadershipLogs.length === 0) ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No Branch Admin leadership transitions recorded yet. Changes made via the "Change Branch Admin" tool will be permanently audited here.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                      <th className="py-2.5 px-3 text-left">Date &amp; Time</th>
                      <th className="py-2.5 px-3 text-left">Executive Action Summary</th>
                      <th className="py-2.5 px-3 text-left">Authorized By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                    {branchAdminsData.leadershipLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                        <td className="py-2.5 px-3 whitespace-nowrap font-mono text-slate-500">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                          {log.action}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap text-amber-700 dark:text-amber-300 font-semibold">
                          👑 {log.userId}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 2: FINANCIAL & REVENUE RESULTS (High-Level Summary Only - No Patient Detail Queue) */}
      {activeTab === "finance" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-xl p-4">
              <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                Total Gross Revenue
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {(kpis?.totalGrossRevenue ?? 0).toLocaleString()} ETB
              </div>
              <div className="text-xs text-emerald-700/80 dark:text-emerald-300/80 mt-1">
                Total collected and accrued clinical earnings for selected reporting range.
              </div>
            </div>

            <div className="bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-900 rounded-xl p-4">
              <div className="text-xs font-bold text-cyan-800 dark:text-cyan-300 uppercase tracking-wider">
                Pending CBHI Insurance Claims
              </div>
              <div className="text-2xl font-black text-cyan-600 dark:text-cyan-400 mt-1">
                {(kpis?.pendingClaimsAmount ?? 0).toLocaleString()} ETB
              </div>
              <div className="text-xs text-cyan-700/80 dark:text-cyan-300/80 mt-1">
                Government health insurance reimbursement currently pending settlement.
              </div>
            </div>

            <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl p-4">
              <div className="text-xs font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider">
                Total Subsidized Fee Waivers
              </div>
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                {(kpis?.waivedAmount ?? 0).toLocaleString()} ETB
              </div>
              <div className="text-xs text-rose-700/80 dark:text-rose-300/80 mt-1">
                Macro social assistance total granted across {kpis?.waiversCount ?? 0} poverty/hardship cases.
              </div>
            </div>
          </div>

          <Card title="Executive Financial & Fee Subsidy Report" subtitle="High-level corporate accounting and subsidy oversight">
            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-3">
              <p>
                <strong>Macro Subsidy Policy:</strong> Subsidized fee waivers represent corporate social assistance granted to impoverished or emergency patients. As the Organizational Admin, this dashboard reflects aggregate financial impacts without micro-level approval workflows.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="font-semibold text-slate-900 dark:text-white">Fee Waiver Share of Revenue</div>
                  <div className="text-lg font-bold text-rose-600 mt-1">
                    {kpis?.totalGrossRevenue ? Math.round(((kpis.waivedAmount || 0) / kpis.totalGrossRevenue) * 100) : 0}%
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">Proportion of gross potential clinic billings waived for social relief.</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="font-semibold text-slate-900 dark:text-white">CBHI Insurance Penetration</div>
                  <div className="text-lg font-bold text-cyan-600 mt-1">
                    {kpis?.cbhiSharePercent ?? 0}%
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">Share of patient encounters covered by Community-Based Health Insurance.</p>
                </div>
              </div>
              <div className="text-[11px] text-slate-500 italic pt-1">
                Note: Individual patient fee-waiver reviews and Kebele hardship verifications are executed exclusively by designated Branch Administrators.
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: PHARMACY CAPITAL & EXPIRY RISK */}
      {activeTab === "pharmacy" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
                <span>Total Pharmacy Inventory Valuation</span>
                <Layers size={16} className="text-amber-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {(kpis?.totalStockValuation ?? 0).toLocaleString()} ETB
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Total commercial capital actively held in central pharmacy stores and dispensary shelves.
              </p>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl p-4">
              <div className="flex items-center justify-between text-xs text-amber-800 dark:text-amber-300 font-bold uppercase tracking-wider">
                <span>Capital at Expiry Risk (&lt; 90 Days)</span>
                <AlertTriangle size={16} className="text-amber-600" />
              </div>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                {(kpis?.atRiskExpiringValuation ?? 0).toLocaleString()} ETB
              </div>
              <p className="text-xs text-amber-700/80 dark:text-amber-300/80 mt-1">
                Pharmaceutical batches nearing expiry requiring rapid clinical dispensing or supplier exchange.
              </p>
            </div>
          </div>

          <Card
            title="At-Risk Expiring Medication Batches (&lt; 90 Days)"
            subtitle="Prioritize these medications for immediate prescription or supplier credit before loss occurs"
          >
            {(!data?.expiringBatchesList || data.expiringBatchesList.length === 0) ? (
              <div className="text-center py-8 text-xs text-slate-500">
                ✅ No medicine batches currently at imminent risk of expiration.
              </div>
            ) : (
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-3">Medication Name</th>
                      <th className="py-2.5 px-3">Lot / Batch</th>
                      <th className="py-2.5 px-3 text-center">Remaining Qty</th>
                      <th className="py-2.5 px-3">Expiry Date</th>
                      <th className="py-2.5 px-3 text-right">Capital Value at Risk</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data.expiringBatchesList.map((batch) => (
                      <tr key={batch.lotNumber} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200">
                          {batch.itemName}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                          {batch.lotNumber}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-800 dark:text-slate-200">
                          {batch.qty}
                        </td>
                        <td className="py-2.5 px-3 text-rose-600 font-semibold font-mono">
                          {batch.expiryDate}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-rose-600 font-mono">
                          {batch.totalLossAtRisk.toLocaleString()} ETB
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 4: STAFF & CLINICAL WORKFORCE ROSTER (Overview & Results Only) */}
      {activeTab === "staff" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
              <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Active Staff Count</div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 flex items-center gap-2">
                <Users className="text-teal-500" size={20} />
                {kpis?.activeStaffCount ?? 0}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Healthcare workers and administrative staff on duty.</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
              <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Clinical Care Staff</div>
              <div className="text-2xl font-black text-blue-600 mt-1 flex items-center gap-2">
                <Stethoscope size={20} />
                {Math.max(1, Math.round((kpis?.activeStaffCount ?? 0) * 0.6))}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Physicians, Triage Nurses, Ward Nurses &amp; Technicians.</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
              <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Facility Roster Status</div>
              <div className="text-2xl font-black text-emerald-600 mt-1 flex items-center gap-2">
                <CheckCircle2 size={20} />
                Optimal
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Shift coverage maintained across all primary stations.</p>
            </div>
          </div>

          <Card
            title="Workforce & Personnel Directory"
            subtitle="Executive view of hospital staffing allocation across operational departments"
          >
            <div className="space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Staff appointment and credential verification are recorded across all facility branches. To view individual staff profiles, active duties, or branch rosters, visit the full staff directory.
              </p>
              <div>
                <Link
                  href={"/nova/branch-admin/staff" as any}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold transition"
                >
                  <Users size={14} />
                  <span>View Full Staff &amp; Workforce Directory</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* MODAL: CHANGE BRANCH ADMIN (BA CHANGE) */}
      {isChangeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-xs">
                  <ArrowRightLeft size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
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
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitBAChange} className="p-6 space-y-5">
              {/* Mode Selector */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide block mb-2">
                  1. Choose Appointment Method
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                  <button
                    type="button"
                    onClick={() => setBaChangeMode("promote")}
                    className={`py-2 px-3 rounded-lg font-bold transition flex items-center justify-center gap-1.5 ${
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
                    className={`py-2 px-3 rounded-lg font-bold transition flex items-center justify-center gap-1.5 ${
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
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-amber-500 font-medium"
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
                  <p className="text-[11px] text-slate-500 mt-1">
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
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-amber-500"
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
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-amber-500"
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
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-amber-500"
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
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-amber-500"
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
                  <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer">
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
                          className="mt-1.5 px-2.5 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                      )}
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer">
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

                  <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer">
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
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                  required
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  This note is permanently recorded in the facility audit trail.
                </p>
              </div>

              {/* Modal Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsChangeModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={changeBAMutation.isPending}
                  className="px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition shadow-sm flex items-center gap-1.5 disabled:opacity-50"
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
