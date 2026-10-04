"use client";
import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { PageShell, Card, KpiCard, Pagination } from "@/components/nova/nova-ui";
import {
  BarChart3, TrendingUp, Users, Bed, Activity, FileText,
  Download, Printer, RefreshCw, Search, Calendar, Building2,
  ShieldCheck, Pill, FlaskConical, AlertTriangle, CreditCard,
  ArrowUpRight, Tag, Filter, CheckCircle2, ChevronRight, Layers, Banknote
} from "lucide-react";

type DateRange = "today" | "7d" | "30d" | "month" | "quarter" | "all";
type ActiveTab = "overview" | "finance" | "clinical" | "wards" | "diagnostics" | "ledger";

export default function ReportsPage() {
  const [range, setRange] = useState<DateRange>("month");
  const [department, setDepartment] = useState("all");
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");

  // Ledger table filtering & pagination state
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [ledgerCategoryFilter, setLedgerCategoryFilter] = useState("all");
  const [ledgerPaymentFilter, setLedgerPaymentFilter] = useState("all");
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerPageSize, setLedgerPageSize] = useState(10);

  // Fetch live reports analytics from backend engine
  const { data, isLoading, refetch, isFetching } = useQuery({
    ...trpc.tenant.reportsAnalytics.queryOptions({
      range,
      department,
    }),
    staleTime: 30_000,
  });

  const kpis = data?.kpis ?? {
    totalPatients: 0,
    cbhiPatients: 0,
    cbhiCoveragePercent: 0,
    totalVisits: 0,
    completedVisits: 0,
    activeVisits: 0,
    completionRate: 0,
    totalRevenue: 0,
    receiptsCount: 0,
    avgRevenuePerReceipt: 0,
    totalBeds: 0,
    occupiedBeds: 0,
    availableBeds: 0,
    maintenanceBeds: 0,
    occupancyRate: 0,
    totalWaiversAmount: 0,
    waiversCount: 0,
    totalClaimsAmount: 0,
    claimsCount: 0,
    criticalStock: 0,
    lowStock: 0,
    totalInventoryValuation: 0,
    totalLabOrders: 0,
    completedLabs: 0,
    pendingLabs: 0,
    prescriptionsCount: 0,
  };

  const paymentMethods = data?.paymentMethods ?? {
    cash: { amount: 0, count: 0 },
    telebirr: { amount: 0, count: 0 },
    cbe_birr: { amount: 0, count: 0 },
    cbhi: { amount: 0, count: 0 },
    waiver: { amount: 0, count: 0 },
  };

  const wardOccupancy = data?.wardOccupancy ?? [];
  const diseaseTrends = data?.diseaseTrends ?? [];
  const monthlyRevenue = data?.monthlyRevenue ?? [];
  const transactions = data?.transactions ?? [];

  // Filtered operational transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const q = ledgerSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        t.receiptNumber.toLowerCase().includes(q) ||
        t.patientName.toLowerCase().includes(q) ||
        t.healthId.toLowerCase().includes(q) ||
        t.collectedBy.toLowerCase().includes(q);

      const matchCategory = ledgerCategoryFilter === "all" || t.category === ledgerCategoryFilter;
      const matchPayment = ledgerPaymentFilter === "all" || t.paymentMethod.toLowerCase() === ledgerPaymentFilter.toLowerCase();

      return matchSearch && matchCategory && matchPayment;
    });
  }, [transactions, ledgerSearch, ledgerCategoryFilter, ledgerPaymentFilter]);

  // Paginated slice for transaction ledger
  const paginatedTransactions = useMemo(() => {
    const start = (ledgerPage - 1) * ledgerPageSize;
    return filteredTransactions.slice(start, start + ledgerPageSize);
  }, [filteredTransactions, ledgerPage, ledgerPageSize]);

  // Export CSV handler
  const handleExportCsv = () => {
    if (!filteredTransactions.length) return;
    const csvRows = filteredTransactions.map((t) => ({
      "Receipt Number": t.receiptNumber,
      "Patient Name": t.patientName,
      "Health ID": t.healthId,
      "Service Category": t.category,
      "Payment Channel": t.paymentMethod,
      "Amount (ETB)": t.amount,
      "Collected By": t.collectedBy,
      "Date & Time": new Date(t.createdAt).toLocaleString(),
    }));

    const separator = ",";
    const keys = Object.keys(csvRows[0]);
    const csvContent =
      keys.join(separator) +
      "\n" +
      csvRows
        .map((row: any) =>
          keys
            .map((k) => {
              let cell = row[k] === null || row[k] === undefined ? "" : String(row[k]);
              cell = cell.replace(/"/g, '""');
              if (cell.search(/("|,|\n)/g) >= 0) cell = `"${cell}"`;
              return cell;
            })
            .join(separator)
        )
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `nova_hospital_report_${range}_${Date.now()}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalPaymentSum = Object.values(paymentMethods).reduce((s, p) => s + p.amount, 0) || 1;

  return (
    <PageShell
      title="Hospital Reports & Analytics Hub"
      subtitle="Executive intelligence, clinical volume surveillance, revenue audits, bed occupancy, and pharmacy metrics across Debre Markos Referral Hospital."
      action={
        <div className="flex items-center gap-2">
          {/* Print / PDF Export */}
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-2xs"
            title="Print or save PDF report"
          >
            <Printer size={14} className="text-slate-500" />
            <span>Print Report</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 bg-teal-600 text-white text-xs font-semibold rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-1.5 shadow-2xs"
            title="Export filtered records to CSV"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      }
    >
      {/* ─────────────────────────────────────────────────────────────
          TOP CONTROL PANEL: RANGE, DEPARTMENT & REFRESH
         ───────────────────────────────────────────────────────────── */}
      <Card className="p-4 mb-6 shadow-xs">
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
          {/* Date Range Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mr-2">
              <Calendar size={14} className="text-teal-600" /> Period:
            </span>
            {(
              [
                { id: "today", label: "Today" },
                { id: "7d", label: "Last 7 Days" },
                { id: "30d", label: "Last 30 Days" },
                { id: "month", label: "This Month" },
                { id: "quarter", label: "Quarter to Date" },
                { id: "all", label: "All Time" },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                onClick={() => setRange(item.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  range === item.id
                    ? "bg-teal-600 text-white shadow-xs font-semibold"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Department Filter & Live Refresh */}
          <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
            <div className="flex items-center gap-1.5">
              <Building2 size={14} className="text-slate-400" />
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 font-medium focus:outline-none focus:border-teal-500 cursor-pointer"
              >
                <option value="all">All Hospital Departments</option>
                <option value="opd">Outpatient (OPD) & Clinics</option>
                <option value="inpatient">Inpatient Wards & ICU</option>
                <option value="lab">Laboratory Diagnostics</option>
                <option value="pharmacy">Pharmacy & Dispensary</option>
                <option value="billing">Cashier & Billing Settlement</option>
              </select>
            </div>

            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-1 text-xs"
              title="Refresh live data"
            >
              <RefreshCw size={13} className={isFetching ? "animate-spin text-teal-600" : ""} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </Card>

      {/* ─────────────────────────────────────────────────────────────
          EXECUTIVE KPI HERO CARDS
         ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <KpiCard
          label="Total Revenue"
          value={`ETB ${kpis.totalRevenue.toLocaleString()}`}
          sub={`${kpis.receiptsCount} cashier receipts`}
          accent
        />
        <KpiCard
          label="Patient Visits"
          value={kpis.totalVisits.toLocaleString()}
          sub={`${kpis.completionRate}% completion rate`}
        />
        <KpiCard
          label="Bed Occupancy"
          value={`${kpis.occupancyRate}%`}
          sub={`${kpis.occupiedBeds} of ${kpis.totalBeds} beds occupied`}
        />
        <KpiCard
          label="CBHI Coverage"
          value={`${kpis.cbhiCoveragePercent}%`}
          sub={`${kpis.cbhiPatients} insured patients`}
        />
        <KpiCard
          label="Fee Waivers"
          value={`ETB ${kpis.totalWaiversAmount.toLocaleString()}`}
          sub={`${kpis.waiversCount} hardship cases`}
        />
        <KpiCard
          label="Critical Stock"
          value={kpis.criticalStock}
          sub={kpis.criticalStock > 0 ? "Immediate reorder" : "Stock levels optimal"}
        />
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION TABS
         ───────────────────────────────────────────────────────────── */}
      <div className="flex border-b border-slate-200 mb-6 gap-2 overflow-x-auto text-xs font-semibold">
        {[
          { id: "overview", label: "Executive Overview", icon: <BarChart3 size={14} /> },
          { id: "finance", label: "Revenue & Settlements", icon: <CreditCard size={14} /> },
          { id: "clinical", label: "Clinical & Disease Surveillance", icon: <Activity size={14} /> },
          { id: "wards", label: "Inpatient & Bed Census", icon: <Bed size={14} /> },
          { id: "diagnostics", label: "Lab & Pharmacy Diagnostics", icon: <FlaskConical size={14} /> },
          { id: "ledger", label: "Itemized Operational Ledger", icon: <FileText size={14} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as ActiveTab)}
            className={`pb-3 px-3.5 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? "border-teal-600 text-teal-700 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: EXECUTIVE OVERVIEW
         ───────────────────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Revenue Trend Curve */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                    <TrendingUp size={16} className="text-teal-600" /> 6-Month Hospital Revenue Trajectory
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Monthly collections in Ethiopian Birr (ETB)
                  </p>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded bg-teal-50 text-teal-700 font-medium border border-teal-200">
                  Target: ETB 80,000/mo
                </span>
              </div>

              <div className="space-y-3 pt-2">
                {monthlyRevenue.map((item) => {
                  const pct = Math.min(100, Math.round((item.revenue / (item.target || 80000)) * 100));
                  return (
                    <div key={item.month} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-700 w-28 shrink-0">{item.month}</span>
                        <span className="text-slate-500 font-mono text-[11px]">
                          ETB {item.revenue.toLocaleString()}
                        </span>
                        <span className="text-slate-400 text-[10px] w-12 text-right">{pct}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-2.5 rounded-full transition-all duration-500 ${
                            pct >= 90 ? "bg-teal-600" : pct >= 65 ? "bg-teal-500" : "bg-amber-500"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Disease Surveillance & Top Morbidity */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                    <Activity size={16} className="text-teal-600" /> Disease Surveillance & Outpatient Morbidity
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Top confirmed diagnoses recorded across clinical encounters
                  </p>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-medium border border-purple-200">
                  ICD-11 Indexed
                </span>
              </div>

              <div className="space-y-2.5">
                {diseaseTrends.slice(0, 6).map((item) => (
                  <div key={item.name} className="flex items-center gap-3">
                    <div className="w-44 shrink-0">
                      <div className="text-xs font-medium text-slate-800 truncate" title={item.name}>
                        {item.name}
                      </div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider">{item.category}</span>
                    </div>
                    <div className="flex-1 bg-slate-100 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(100, item.percentage * 2.5)}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-700 w-12 text-right">
                      {item.count} <span className="text-[10px] text-slate-400 font-normal">cases</span>
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Secondary Grid: Patient Flow & Ward Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Hourly Patient Flow Chart */}
            <Card className="p-5">
              <h3 className="font-semibold text-slate-800 text-sm mb-1 flex items-center gap-1.5">
                <Users size={16} className="text-teal-600" /> Patient Arrival Flow by Hour of Day
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                OPD triage registrations distribution from morning clinic opening to evening shift
              </p>

              <div className="flex items-end gap-2 h-28 pt-4">
                {[
                  { hour: "8:00", volume: 18 },
                  { hour: "9:00", volume: 42 },
                  { hour: "10:00", volume: 68 },
                  { hour: "11:00", volume: 54 },
                  { hour: "12:00", volume: 32 },
                  { hour: "13:00", volume: 24 },
                  { hour: "14:00", volume: 46 },
                  { hour: "15:00", volume: 39 },
                  { hour: "16:00", volume: 22 },
                  { hour: "17:00", volume: 14 },
                ].map((slot) => {
                  const maxVol = 68;
                  const heightPct = Math.round((slot.volume / maxVol) * 100);
                  return (
                    <div key={slot.hour} className="flex-1 flex flex-col items-center gap-1.5 group">
                      <span className="text-[9px] font-semibold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        {slot.volume}
                      </span>
                      <div className="w-full bg-slate-100 rounded-t h-20 flex items-end">
                        <div
                          className="w-full bg-teal-500 hover:bg-teal-600 rounded-t transition-all"
                          style={{ height: `${heightPct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">{slot.hour}</span>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Inpatient Bed Occupancy Breakdown */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                  <Bed size={16} className="text-teal-600" /> Ward Bed Utilization & Census
                </h3>
                <span className="text-xs font-bold text-teal-700">
                  {kpis.occupiedBeds} / {kpis.totalBeds} Occupied ({kpis.occupancyRate}%)
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Live bed availability across specialized inpatient wards
              </p>

              <div className="space-y-3">
                {wardOccupancy.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No ward data available.</p>
                ) : (
                  wardOccupancy.map((w) => (
                    <div key={w.ward} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-700">{w.ward}</span>
                        <span className="text-slate-500 text-[11px]">
                          <strong>{w.occupied}</strong> occupied / {w.total} beds ({w.available} available)
                        </span>
                        <span
                          className={`font-semibold text-[11px] ${
                            w.rate >= 80 ? "text-amber-600" : "text-teal-700"
                          }`}
                        >
                          {w.rate}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            w.rate >= 85 ? "bg-amber-500" : "bg-teal-600"
                          }`}
                          style={{ width: `${w.rate}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: REVENUE & SETTLEMENTS
         ───────────────────────────────────────────────────────────── */}
      {activeTab === "finance" && (
        <div className="space-y-6">
          {/* Revenue KPI Ribbon */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              label="Cash Collections"
              value={`ETB ${paymentMethods.cash.amount.toLocaleString()}`}
              sub={`${paymentMethods.cash.count} cash receipts`}
            />
            <KpiCard
              label="Telebirr Settlements"
              value={`ETB ${paymentMethods.telebirr.amount.toLocaleString()}`}
              sub={`${paymentMethods.telebirr.count} mobile pay receipts`}
            />
            <KpiCard
              label="CBE Birr Settlements"
              value={`ETB ${paymentMethods.cbe_birr.amount.toLocaleString()}`}
              sub={`${paymentMethods.cbe_birr.count} bank settlements`}
            />
            <KpiCard
              label="CBHI Claims Submitted"
              value={`ETB ${kpis.totalClaimsAmount.toLocaleString()}`}
              sub={`${kpis.claimsCount} insurance claims`}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Channel Distribution */}
            <Card className="p-5">
              <h3 className="font-semibold text-slate-800 text-sm mb-1 flex items-center gap-1.5">
                <Banknote size={16} className="text-teal-600" /> Revenue Distribution by Payment Method
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Comparison of digital payments, cash drawers, and insurance claims
              </p>

              <div className="space-y-3.5">
                {[
                  { label: "Cash (On-Site Cashier)", key: "cash", color: "bg-emerald-500", bgLight: "bg-emerald-50", textCol: "text-emerald-700" },
                  { label: "Telebirr (Ethio Telecom)", key: "telebirr", color: "bg-blue-500", bgLight: "bg-blue-50", textCol: "text-blue-700" },
                  { label: "CBE Birr (Commercial Bank)", key: "cbe_birr", color: "bg-purple-500", bgLight: "bg-purple-50", textCol: "text-purple-700" },
                  { label: "CBHI Community Health Fund", key: "cbhi", color: "bg-teal-500", bgLight: "bg-teal-50", textCol: "text-teal-700" },
                  { label: "Social Hardship Waivers", key: "waiver", color: "bg-amber-500", bgLight: "bg-amber-50", textCol: "text-amber-700" },
                ].map((method) => {
                  const mData = (paymentMethods as any)[method.key] || { amount: 0, count: 0 };
                  const share = Math.round((mData.amount / totalPaymentSum) * 100);
                  return (
                    <div key={method.key} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-700">{method.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-slate-800">
                            ETB {mData.amount.toLocaleString()}
                          </span>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${method.bgLight} ${method.textCol}`}>
                            {share}% ({mData.count})
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div className={`h-2 rounded-full ${method.color}`} style={{ width: `${share}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Financial Highlights & Fee Waivers */}
            <Card className="p-5">
              <h3 className="font-semibold text-slate-800 text-sm mb-1 flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-teal-600" /> Patient Subsidies & Inventory Assets
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Social support assistance and pharmaceutical inventory asset valuation
              </p>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <p className="text-[11px] text-slate-500 uppercase font-semibold">Total Fee Waivers</p>
                  <p className="text-lg font-bold text-amber-600 mt-1">ETB {kpis.totalWaiversAmount.toLocaleString()}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{kpis.waiversCount} hardship cases authorized</p>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <p className="text-[11px] text-slate-500 uppercase font-semibold">Pharmacy Asset Value</p>
                  <p className="text-lg font-bold text-teal-700 mt-1">ETB {kpis.totalInventoryValuation.toLocaleString()}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Holding in central & sub-stores</p>
                </div>
              </div>

              <div className="p-3 bg-teal-50/50 border border-teal-100 rounded-lg text-xs text-teal-900 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-teal-800">
                  <CheckCircle2 size={14} className="text-teal-600" /> Financial Audit Compliance
                </div>
                <p className="text-[11px] text-teal-700 leading-relaxed">
                  All cashier receipt numbers, waiver approvals, and CBHI claims are strictly locked to sequential immutable IDs. Tariffs apply automatically across all patient points of care.
                </p>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 3: CLINICAL & DISEASE SURVEILLANCE
         ───────────────────────────────────────────────────────────── */}
      {activeTab === "clinical" && (
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                  <Activity size={16} className="text-teal-600" /> Outpatient Clinical Morbidity & Disease Surveillance
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Epidemiological tracking compliant with Ethiopian Ministry of Health (MoH) reporting guidelines
                </p>
              </div>
              <span className="text-xs text-slate-500">
                Total cases registered: <strong>{diseaseTrends.reduce((s, d) => s + d.count, 0)}</strong>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-medium">
                  <tr>
                    <th className="px-4 py-3">Disease / Clinical Diagnosis</th>
                    <th className="px-3 py-3">Category</th>
                    <th className="px-3 py-3 text-right">Recorded Cases</th>
                    <th className="px-4 py-3">Proportion of Total Morbidity</th>
                    <th className="px-3 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {diseaseTrends.map((d, index) => (
                    <tr key={d.name} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-800 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-bold">
                          {index + 1}
                        </span>
                        {d.name}
                      </td>
                      <td className="px-3 py-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {d.category}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-slate-800 font-mono text-sm">
                        {d.count}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-slate-100 rounded-full h-2">
                            <div
                              className="bg-purple-600 h-2 rounded-full"
                              style={{ width: `${Math.min(100, d.percentage * 2)}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500 w-10 text-right font-mono">{d.percentage}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800">
                          Monitored
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 4: INPATIENT & BED CENSUS
         ───────────────────────────────────────────────────────────── */}
      {activeTab === "wards" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="Total Inpatient Beds" value={kpis.totalBeds} sub="Hospital capacity" />
            <KpiCard label="Occupied Beds" value={kpis.occupiedBeds} sub="Active admitted patients" accent />
            <KpiCard label="Available Beds" value={kpis.availableBeds} sub="Ready for new admissions" />
            <KpiCard label="Maintenance / Cleaning" value={kpis.maintenanceBeds} sub="Temporarily out of service" />
          </div>

          <Card className="overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                  <Bed size={16} className="text-teal-600" /> Ward-by-Ward Bed Census Breakdown
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time bed board status and bed occupancy rate per clinical department
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-medium">
                  <tr>
                    <th className="px-4 py-3">Ward Name</th>
                    <th className="px-3 py-3 text-center">Total Beds</th>
                    <th className="px-3 py-3 text-center">Occupied</th>
                    <th className="px-3 py-3 text-center">Available</th>
                    <th className="px-4 py-3">Occupancy Rate</th>
                    <th className="px-3 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {wardOccupancy.map((w) => (
                    <tr key={w.ward} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-800">{w.ward}</td>
                      <td className="px-3 py-3 text-center font-mono font-medium text-slate-700">{w.total}</td>
                      <td className="px-3 py-3 text-center font-mono font-bold text-amber-700">{w.occupied}</td>
                      <td className="px-3 py-3 text-center font-mono font-bold text-teal-700">{w.available}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-slate-100 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${w.rate >= 80 ? "bg-amber-500" : "bg-teal-600"}`}
                              style={{ width: `${w.rate}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-slate-700 w-10 text-right">{w.rate}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                            w.rate >= 90
                              ? "bg-red-100 text-red-800"
                              : w.rate >= 70
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {w.rate >= 90 ? "Critical Capacity" : w.rate >= 70 ? "Busy" : "Optimal"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 5: DIAGNOSTICS & PHARMACY
         ───────────────────────────────────────────────────────────── */}
      {activeTab === "diagnostics" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="Diagnostic Lab Orders" value={kpis.totalLabOrders} sub={`${kpis.completedLabs} verified & released`} />
            <KpiCard label="Pending Lab Work" value={kpis.pendingLabs} sub="In process / awaiting sample" />
            <KpiCard label="Prescriptions Issued" value={kpis.prescriptionsCount} sub="By outpatient & ward doctors" />
            <KpiCard
              label="Stockout Warnings"
              value={kpis.criticalStock}
              sub={`${kpis.lowStock} items near reorder point`}
              accent={kpis.criticalStock > 0}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-5">
              <h3 className="font-semibold text-slate-800 text-sm mb-1 flex items-center gap-1.5">
                <FlaskConical size={16} className="text-teal-600" /> Laboratory Performance Overview
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Specimen turnaround status and test verification workflow
              </p>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-xs text-slate-600">Total Requested Investigations</span>
                  <span className="font-mono font-bold text-slate-800 text-sm">{kpis.totalLabOrders}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-emerald-50/50 border border-emerald-100 rounded-lg">
                  <span className="text-xs text-emerald-800">Verified & Approved Results</span>
                  <span className="font-mono font-bold text-emerald-800 text-sm">{kpis.completedLabs}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-amber-50/50 border border-amber-100 rounded-lg">
                  <span className="text-xs text-amber-800">Pending / Processing Orders</span>
                  <span className="font-mono font-bold text-amber-800 text-sm">{kpis.pendingLabs}</span>
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="font-semibold text-slate-800 text-sm mb-1 flex items-center gap-1.5">
                <Pill size={16} className="text-teal-600" /> Pharmacy Inventory Safety Index
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Essential medicine availability and safety stock health
              </p>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-xs text-slate-600">Total Capital Tied in Stock</span>
                  <span className="font-mono font-bold text-slate-800 text-sm">ETB {kpis.totalInventoryValuation.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50/50 border border-red-100 rounded-lg">
                  <span className="text-xs text-red-800">Critical Stockouts (Stock &lt; ROP)</span>
                  <span className="font-mono font-bold text-red-800 text-sm">{kpis.criticalStock} items</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-amber-50/50 border border-amber-100 rounded-lg">
                  <span className="text-xs text-amber-800">Low Stock Threshold Warnings</span>
                  <span className="font-mono font-bold text-amber-800 text-sm">{kpis.lowStock} items</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 6: ITEMIZED OPERATIONAL LEDGER (WITH SEARCH & PAGINATION)
         ───────────────────────────────────────────────────────────── */}
      {activeTab === "ledger" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <Card className="p-3.5 shadow-xs">
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
              {/* Search */}
              <div className="relative w-full md:w-80">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={ledgerSearch}
                  onChange={(e) => {
                    setLedgerSearch(e.target.value);
                    setLedgerPage(1);
                  }}
                  placeholder="Search receipt #, patient name, ID, cashier…"
                  className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                {/* Category */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500 shrink-0">Category:</span>
                  <select
                    value={ledgerCategoryFilter}
                    onChange={(e) => {
                      setLedgerCategoryFilter(e.target.value);
                      setLedgerPage(1);
                    }}
                    className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 focus:outline-none focus:border-teal-500 cursor-pointer"
                  >
                    <option value="all">All Categories</option>
                    <option value="card_fee">Card Fee (Registration)</option>
                    <option value="lab">Laboratory Orders</option>
                    <option value="pharmacy">Pharmacy Dispensing</option>
                    <option value="total_invoice">Total Visit Clearance</option>
                  </select>
                </div>

                {/* Payment Method */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500 shrink-0">Channel:</span>
                  <select
                    value={ledgerPaymentFilter}
                    onChange={(e) => {
                      setLedgerPaymentFilter(e.target.value);
                      setLedgerPage(1);
                    }}
                    className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 focus:outline-none focus:border-teal-500 cursor-pointer"
                  >
                    <option value="all">All Payment Channels</option>
                    <option value="cash">Cash</option>
                    <option value="telebirr">Telebirr</option>
                    <option value="cbe_birr">CBE Birr</option>
                    <option value="cbhi">CBHI</option>
                    <option value="waiver">Hardship Waiver</option>
                  </select>
                </div>
              </div>
            </div>
          </Card>

          {/* Table */}
          <Card className="overflow-hidden shadow-xs">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <span className="font-semibold text-xs text-slate-700 flex items-center gap-1.5">
                <FileText size={14} className="text-teal-600" />
                Hospital Transaction Records ({filteredTransactions.length} items)
              </span>
              <span className="text-[11px] text-slate-500">
                💡 Certified receipt records with timestamp and settlement audit trail.
              </span>
            </div>

            {isLoading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading ledger records…</div>
            ) : filteredTransactions.length === 0 ? (
              <div className="p-12 text-center">
                <FileText size={36} className="mx-auto text-slate-300 mb-2" />
                <p className="font-medium text-slate-700 text-sm">No transaction records found</p>
                <p className="text-xs text-slate-400 mt-1">Try adjusting your search criteria or date range.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-medium">
                    <tr>
                      <th className="px-4 py-3">Receipt Number</th>
                      <th className="px-3 py-3">Patient & Health ID</th>
                      <th className="px-3 py-3">Category</th>
                      <th className="px-3 py-3">Payment Channel</th>
                      <th className="px-4 py-3 text-right">Amount (ETB)</th>
                      <th className="px-3 py-3">Cashier</th>
                      <th className="px-4 py-3 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-teal-50/20 transition-colors">
                        {/* Receipt */}
                        <td className="px-4 py-3 font-mono font-semibold text-teal-700">
                          {tx.receiptNumber}
                        </td>

                        {/* Patient */}
                        <td className="px-3 py-3">
                          <div className="font-semibold text-slate-800">{tx.patientName}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{tx.healthId}</div>
                        </td>

                        {/* Category */}
                        <td className="px-3 py-3">
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            {tx.category.replace(/_/g, " ")}
                          </span>
                        </td>

                        {/* Payment Channel */}
                        <td className="px-3 py-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${
                              tx.paymentMethod.toLowerCase() === "telebirr"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : tx.paymentMethod.toLowerCase() === "cbe_birr"
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : tx.paymentMethod.toLowerCase() === "cbhi"
                                ? "bg-teal-50 text-teal-700 border-teal-200"
                                : tx.paymentMethod.toLowerCase() === "waiver"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            }`}
                          >
                            {tx.paymentMethod.toUpperCase()}
                          </span>
                        </td>

                        {/* Amount */}
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                          ETB {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>

                        {/* Cashier */}
                        <td className="px-3 py-3 text-slate-600">{tx.collectedBy}</td>

                        {/* Timestamp */}
                        <td className="px-4 py-3 text-right text-slate-400 font-mono text-[11px]">
                          {new Date(tx.createdAt).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {filteredTransactions.length > 0 && (
              <Pagination
                currentPage={ledgerPage}
                totalItems={filteredTransactions.length}
                pageSize={ledgerPageSize}
                onPageChange={setLedgerPage}
                onPageSizeChange={setLedgerPageSize}
                pageSizeOptions={[10, 25, 50, 100]}
                itemLabel="transactions"
              />
            )}
          </Card>
        </div>
      )}
    </PageShell>
  );
}
