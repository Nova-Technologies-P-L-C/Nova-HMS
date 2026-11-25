"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { PageShell, Card, KpiCard, Pagination } from "@/components/nova/nova-ui";
import {
  BarChart3,
  TrendingUp,
  Users,
  Bed,
  Activity,
  FileText,
  Download,
  Printer,
  RefreshCw,
  Search,
  Calendar,
  Building2,
  ShieldCheck,
  Pill,
  FlaskConical,
  CreditCard,
  CheckCircle2,
  Banknote,
  Globe,
  Smartphone,
  Landmark,
  Clock,
  ArrowRight,
  Filter,
  X,
} from "lucide-react";
import NovaHmisDhis2Tab from "@/components/nova/nova-hmis-dhis2-tab";

type DateRange = "today" | "7d" | "30d" | "month" | "quarter" | "all";
type ActiveTab = "overview" | "finance" | "clinical" | "wards" | "diagnostics" | "ledger" | "hmis";

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

  const { data: tenant } = useQuery(trpc.tenant.get.queryOptions());

  const kpis = data?.kpis ?? {
    totalPatients: 0,
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
    waiver: { amount: 0, count: 0 },
  };

  const wardOccupancy = data?.wardOccupancy ?? [];
  const diseaseTrends = data?.diseaseTrends ?? [];
  const monthlyRevenue = data?.monthlyRevenue ?? [];
  const transactions = data?.transactions ?? [];

  // Digital revenue calculations
  const telebirrAmount = paymentMethods.telebirr?.amount || 0;
  const cbeBirrAmount = paymentMethods.cbe_birr?.amount || 0;
  const cashAmount = paymentMethods.cash?.amount || 0;
  const totalDigitalRevenue = telebirrAmount + cbeBirrAmount;
  const digitalSharePercent =
    kpis.totalRevenue > 0 ? Math.round((totalDigitalRevenue / kpis.totalRevenue) * 100) : 0;

  // Filtered transactions for the ledger
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
      const matchPayment =
        ledgerPaymentFilter === "all" ||
        t.paymentMethod.toLowerCase() === ledgerPaymentFilter.toLowerCase();

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
      "Cashier": t.collectedBy,
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
    link.setAttribute("download", `clinic_report_${range}_${Date.now()}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalPaymentSum = (cashAmount + telebirrAmount + cbeBirrAmount) || 1;

  return (
    <PageShell
      title="Clinic Reports & Analytics"
      subtitle={`Daily revenue, patient visits, lab diagnostics, and pharmacy sales at ${tenant?.name || "the clinic"}.`}
      action={
        <div className="flex items-center gap-2">
          {/* Print Summary */}
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Print or save PDF summary"
          >
            <Printer size={13} className="text-slate-500 dark:text-slate-400" />
            <span>Print Report</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            title="Export filtered records to CSV"
          >
            <Download size={13} />
            <span>Export CSV</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* ── 1. TOP CONTROL BAR: PERIOD, DEPARTMENT & REFRESH ── */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
            {/* Period selector */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mr-2">
                <Calendar size={14} className="text-teal-600" /> Period:
              </span>
              {(
                [
                  { id: "today", label: "Today" },
                  { id: "7d", label: "Last 7 Days" },
                  { id: "30d", label: "Last 30 Days" },
                  { id: "month", label: "This Month" },
                  { id: "quarter", label: "Quarter" },
                  { id: "all", label: "All Time" },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  onClick={() => setRange(item.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    range === item.id
                      ? "bg-teal-600 text-white shadow-2xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
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
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 font-semibold focus:outline-hidden focus:border-teal-500 cursor-pointer"
                >
                  <option value="all">All Departments</option>
                  <option value="opd">OPD Consultations</option>
                  <option value="inpatient">Inpatient Wards</option>
                  <option value="lab">Laboratory</option>
                  <option value="pharmacy">Pharmacy</option>
                  <option value="billing">Cashier &amp; Billing</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => refetch()}
                disabled={isFetching}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer shadow-2xs"
                title="Refresh live data"
              >
                <RefreshCw size={12} className={isFetching ? "animate-spin text-teal-600" : ""} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── 2. EXECUTIVE METRIC HERO CARDS (PRO & PRIVATE-CLINIC FOCUSED) ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Revenue */}
          <div className="bg-gradient-to-br from-teal-600 to-teal-700 text-white rounded-2xl p-4 shadow-xs space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-100 flex items-center justify-between">
              <span>Total Revenue</span>
              <Banknote size={14} className="text-teal-200" />
            </span>
            <div className="text-xl font-black">
              {kpis.totalRevenue.toLocaleString()} <span className="text-xs font-medium text-teal-200">ETB</span>
            </div>
            <p className="text-[11px] text-teal-100">{kpis.receiptsCount} cashier receipts</p>
          </div>

          {/* Visits */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Patient Visits</span>
              <Users size={14} className="text-teal-600" />
            </span>
            <div className="text-xl font-black text-slate-900 dark:text-white">
              {kpis.totalVisits.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400">{kpis.completedVisits} completed visits</p>
          </div>

          {/* Digital Share */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Digital Pay (Telebirr/CBE)</span>
              <Smartphone size={14} className="text-blue-600" />
            </span>
            <div className="text-xl font-black text-blue-600 dark:text-blue-400">
              {totalDigitalRevenue.toLocaleString()} <span className="text-xs font-medium text-slate-400">ETB</span>
            </div>
            <p className="text-[11px] text-slate-400">{digitalSharePercent}% of total collections</p>
          </div>

          {/* Lab Tests */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Lab Tests</span>
              <FlaskConical size={14} className="text-purple-600" />
            </span>
            <div className="text-xl font-black text-purple-600 dark:text-purple-400">
              {kpis.totalLabOrders}
            </div>
            <p className="text-[11px] text-slate-400">{kpis.completedLabs} verified results</p>
          </div>

          {/* Prescriptions */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Prescriptions</span>
              <Pill size={14} className="text-emerald-600" />
            </span>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
              {kpis.prescriptionsCount}
            </div>
            <p className="text-[11px] text-slate-400">Medications dispensed</p>
          </div>

          {/* Bed Occupancy */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Bed Occupancy</span>
              <Bed size={14} className="text-amber-600" />
            </span>
            <div className="text-xl font-black text-slate-900 dark:text-white">
              {kpis.occupancyRate}%
            </div>
            <p className="text-[11px] text-slate-400">{kpis.occupiedBeds} of {kpis.totalBeds} beds occupied</p>
          </div>
        </div>

        {/* ── 3. CLEAN NAVIGATION TABS ── */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 overflow-x-auto text-xs font-semibold">
          {[
            { id: "overview", label: "Executive Overview", icon: <BarChart3 size={14} /> },
            { id: "finance", label: "Revenue & Payments", icon: <CreditCard size={14} /> },
            { id: "clinical", label: "Top Diagnoses", icon: <Activity size={14} /> },
            { id: "wards", label: "Wards & Beds", icon: <Bed size={14} /> },
            { id: "diagnostics", label: "Lab & Pharmacy", icon: <FlaskConical size={14} /> },
            { id: "ledger", label: "Payment Transactions", icon: <FileText size={14} /> },
            { id: "hmis", label: "🇪🇹 National e-HMIS / DHIS2", icon: <Globe size={14} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={`pb-3 px-3.5 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer ${
                activeTab === tab.id
                  ? "border-teal-600 text-teal-700 dark:text-teal-400 font-bold"
                  : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
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
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                      <TrendingUp size={16} className="text-teal-600" /> 6-Month Clinic Revenue Trajectory
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Monthly collections in Ethiopian Birr (ETB)
                    </p>
                  </div>
                  <span className="text-[11px] px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-bold border border-teal-200 dark:border-teal-800">
                    Monthly Target: 80,000 ETB
                  </span>
                </div>

                <div className="space-y-3 pt-2">
                  {monthlyRevenue.map((item) => {
                    const pct = Math.min(100, Math.round((item.revenue / (item.target || 80000)) * 100));
                    return (
                      <div key={item.month} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 w-28 shrink-0">
                            {item.month}
                          </span>
                          <span className="text-slate-700 dark:text-slate-300 font-mono font-bold text-xs">
                            ETB {item.revenue.toLocaleString()}
                          </span>
                          <span className="text-slate-400 text-[11px] font-mono w-12 text-right">{pct}%</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
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
              </div>

              {/* Top Diagnoses */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                      <Activity size={16} className="text-teal-600" /> Most Frequent Patient Diagnoses
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Top conditions diagnosed across outpatient consultations
                    </p>
                  </div>
                  <span className="text-[11px] px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-800">
                    Clinical Morbidity
                  </span>
                </div>

                <div className="space-y-2.5">
                  {diseaseTrends.slice(0, 6).map((item) => (
                    <div key={item.name} className="flex items-center gap-3">
                      <div className="w-44 shrink-0">
                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate" title={item.name}>
                          {item.name}
                        </div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider">{item.category}</span>
                      </div>
                      <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-purple-600 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(100, item.percentage * 2.5)}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 w-16 text-right">
                        {item.count} <span className="text-[10px] text-slate-400 font-normal">cases</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Secondary Grid: Patient Flow & Ward Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Hourly Patient Flow Chart */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                    <Clock size={16} className="text-teal-600" /> Patient Visits by Time of Day
                  </h3>
                  <span className="text-[11px] text-slate-400 font-medium">Clinic Hours: 8:00 AM – 5:00 PM</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  Arrival volumes across reception triage check-in counters
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
                        <span className="text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                          {slot.volume}
                        </span>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-t h-20 flex items-end">
                          <div
                            className="w-full bg-teal-500 hover:bg-teal-600 rounded-t transition-all cursor-pointer"
                            style={{ height: `${heightPct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">{slot.hour}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Inpatient Bed Occupancy Breakdown */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                    <Bed size={16} className="text-teal-600" /> Ward Beds &amp; Occupancy
                  </h3>
                  <span className="text-xs font-black text-teal-700 dark:text-teal-400">
                    {kpis.occupiedBeds} / {kpis.totalBeds} Occupied ({kpis.occupancyRate}%)
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  Bed availability across specialized observation and admission rooms
                </p>

                <div className="space-y-3">
                  {wardOccupancy.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center">No ward bed data recorded.</p>
                  ) : (
                    wardOccupancy.map((w) => (
                      <div key={w.ward} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{w.ward}</span>
                          <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                            <strong>{w.occupied}</strong> occupied / {w.total} beds ({w.available} available)
                          </span>
                          <span
                            className={`font-mono font-bold text-[11px] ${
                              w.rate >= 80 ? "text-amber-600" : "text-teal-700 dark:text-teal-400"
                            }`}
                          >
                            {w.rate}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
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
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 2: REVENUE & PAYMENTS
           ───────────────────────────────────────────────────────────── */}
        {activeTab === "finance" && (
          <div className="space-y-6">
            {/* Revenue Channel Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Cash Collections</span>
                  <Banknote size={15} className="text-emerald-600" />
                </span>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {cashAmount.toLocaleString()} <span className="text-xs font-bold text-slate-400">ETB</span>
                </div>
                <p className="text-[11px] text-slate-400">{paymentMethods.cash.count} cash receipts</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Telebirr Mobile Pay</span>
                  <Smartphone size={15} className="text-blue-600" />
                </span>
                <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                  {telebirrAmount.toLocaleString()} <span className="text-xs font-bold text-slate-400">ETB</span>
                </div>
                <p className="text-[11px] text-slate-400">{paymentMethods.telebirr.count} mobile pay receipts</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>CBE Birr Bank Pay</span>
                  <Landmark size={15} className="text-purple-600" />
                </span>
                <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
                  {cbeBirrAmount.toLocaleString()} <span className="text-xs font-bold text-slate-400">ETB</span>
                </div>
                <p className="text-[11px] text-slate-400">{paymentMethods.cbe_birr.count} bank transfers</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Average Bill Amount</span>
                  <CreditCard size={15} className="text-teal-600" />
                </span>
                <div className="text-2xl font-black text-teal-700 dark:text-teal-400">
                  {kpis.receiptsCount > 0 ? Math.round(kpis.totalRevenue / kpis.receiptsCount).toLocaleString() : 0}{" "}
                  <span className="text-xs font-bold text-slate-400">ETB</span>
                </div>
                <p className="text-[11px] text-slate-400">Average receipt value</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Payment Channel Distribution */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1 flex items-center gap-1.5">
                  <CreditCard size={16} className="text-teal-600" /> Revenue Breakdown by Payment Method
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  Comparison between cash register collections and electronic payments
                </p>

                <div className="space-y-4">
                  {[
                    {
                      label: "Cash Drawer (On-Site)",
                      amount: cashAmount,
                      count: paymentMethods.cash.count,
                      color: "bg-emerald-500",
                      badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300",
                    },
                    {
                      label: "Telebirr (Ethio Telecom)",
                      amount: telebirrAmount,
                      count: paymentMethods.telebirr.count,
                      color: "bg-blue-500",
                      badge: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300",
                    },
                    {
                      label: "CBE Birr (Commercial Bank of Ethiopia)",
                      amount: cbeBirrAmount,
                      count: paymentMethods.cbe_birr.count,
                      color: "bg-purple-500",
                      badge: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300",
                    },
                  ].map((method) => {
                    const share = Math.round((method.amount / totalPaymentSum) * 100);
                    return (
                      <div key={method.label} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{method.label}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 dark:text-white">
                              ETB {method.amount.toLocaleString()}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${method.badge}`}>
                              {share}% ({method.count})
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                          <div className={`h-2.5 rounded-full ${method.color}`} style={{ width: `${share}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Financial Audit Controls */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1 flex items-center gap-1.5">
                    <ShieldCheck size={16} className="text-teal-600" /> Cashier Audit &amp; Pharmacy Stock Value
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Holding value of inventory and cashier reconciliation safety
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Pharmacy Stock</span>
                    <span className="text-lg font-black text-teal-700 dark:text-teal-300 block font-mono">
                      ETB {kpis.totalInventoryValuation.toLocaleString()}
                    </span>
                    <span className="text-[11px] text-slate-400 block">Current stock on hand</span>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Receipts Count</span>
                    <span className="text-lg font-black text-slate-900 dark:text-white block font-mono">
                      {kpis.receiptsCount}
                    </span>
                    <span className="text-[11px] text-slate-400 block">Sequentially numbered receipts</span>
                  </div>
                </div>

                <div className="p-3.5 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-xl text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-teal-800 dark:text-teal-300">
                    <CheckCircle2 size={15} /> Cashier Reconciliation Standard
                  </div>
                  <p className="text-[11px] text-teal-700 dark:text-teal-400 leading-relaxed">
                    All receipts are logged chronologically with exact timestamps, payment channel (Cash, Telebirr, CBE Birr), and reference numbers for daily cash register balancing.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 3: TOP DIAGNOSES
           ───────────────────────────────────────────────────────────── */}
        {activeTab === "clinical" && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs overflow-hidden">
            <div className="p-4 sm:p-5 bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                  <Activity size={16} className="text-teal-600" /> Outpatient Diagnoses Summary
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Primary diagnoses recorded by attending physicians during consultation encounters
                </p>
              </div>
              <span className="text-xs text-slate-600 dark:text-slate-300 font-semibold hidden sm:inline">
                Total cases: <strong className="text-teal-600 font-mono">{diseaseTrends.reduce((s, d) => s + d.count, 0)}</strong>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Diagnosis Name</th>
                    <th className="px-3 py-3">Category</th>
                    <th className="px-3 py-3 text-right">Recorded Cases</th>
                    <th className="px-4 py-3">Proportion of Total</th>
                    <th className="px-3 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                  {diseaseTrends.map((d, index) => (
                    <tr key={d.name} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-mono text-slate-400 w-8">{index + 1}</td>
                      <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">
                        {d.name}
                      </td>
                      <td className="px-3 py-3">
                        <span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {d.category}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-slate-900 dark:text-white text-sm">
                        {d.count}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-purple-600 h-2 rounded-full"
                              style={{ width: `${Math.min(100, d.percentage * 2)}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono text-slate-400 w-10 text-right">{d.percentage}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          Active
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 4: WARDS & BEDS
           ───────────────────────────────────────────────────────────── */}
        {activeTab === "wards" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Ward Beds</span>
                <div className="text-2xl font-black text-slate-900 dark:text-white">{kpis.totalBeds}</div>
                <p className="text-[11px] text-slate-400">Total clinic bed capacity</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Occupied Beds</span>
                <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{kpis.occupiedBeds}</div>
                <p className="text-[11px] text-slate-400">Currently admitted patients</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Available Beds</span>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{kpis.availableBeds}</div>
                <p className="text-[11px] text-slate-400">Ready for patient admission</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Cleaning / Prep</span>
                <div className="text-2xl font-black text-slate-600 dark:text-slate-300">{kpis.maintenanceBeds}</div>
                <p className="text-[11px] text-slate-400">Beds being prepared</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs overflow-hidden">
              <div className="p-4 sm:p-5 bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                  <Bed size={16} className="text-teal-600" /> Ward-by-Ward Bed Census Breakdown
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Live occupancy and bed counts by department
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-4 py-3">Ward / Room</th>
                      <th className="px-3 py-3 text-center">Total Beds</th>
                      <th className="px-3 py-3 text-center">Occupied</th>
                      <th className="px-3 py-3 text-center">Available</th>
                      <th className="px-4 py-3">Occupancy Rate</th>
                      <th className="px-3 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                    {wardOccupancy.map((w) => (
                      <tr key={w.ward} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">{w.ward}</td>
                        <td className="px-3 py-3 text-center font-mono font-medium text-slate-600 dark:text-slate-300">
                          {w.total}
                        </td>
                        <td className="px-3 py-3 text-center font-mono font-bold text-amber-600 dark:text-amber-400">
                          {w.occupied}
                        </td>
                        <td className="px-3 py-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {w.available}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-2 rounded-full ${w.rate >= 80 ? "bg-amber-500" : "bg-teal-600"}`}
                                style={{ width: `${w.rate}%` }}
                              />
                            </div>
                            <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 w-10 text-right">
                              {w.rate}%
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              w.rate >= 90
                                ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                                : w.rate >= 70
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            }`}
                          >
                            {w.rate >= 90 ? "Full" : w.rate >= 70 ? "Busy" : "Available"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 5: DIAGNOSTICS & PHARMACY
           ───────────────────────────────────────────────────────────── */}
        {activeTab === "diagnostics" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Lab Tests</span>
                <div className="text-2xl font-black text-slate-900 dark:text-white">{kpis.totalLabOrders}</div>
                <p className="text-[11px] text-slate-400">{kpis.completedLabs} verified &amp; released</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pending Lab Tests</span>
                <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{kpis.pendingLabs}</div>
                <p className="text-[11px] text-slate-400">Processing in laboratory</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Prescriptions Issued</span>
                <div className="text-2xl font-black text-slate-900 dark:text-white">{kpis.prescriptionsCount}</div>
                <p className="text-[11px] text-slate-400">Written by doctors</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Low Stock Warnings</span>
                <div className="text-2xl font-black text-red-600 dark:text-red-400">{kpis.criticalStock}</div>
                <p className="text-[11px] text-slate-400">{kpis.lowStock} near reorder point</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-3">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                  <FlaskConical size={16} className="text-teal-600" /> Laboratory Performance Overview
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Diagnostic testing volumes and verification rates
                </p>

                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs">
                    <span className="text-slate-600 dark:text-slate-300 font-medium">Total Requested Investigations</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">{kpis.totalLabOrders}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800/60 rounded-xl text-xs">
                    <span className="text-emerald-800 dark:text-emerald-300 font-semibold">Completed &amp; Released Results</span>
                    <span className="font-mono font-bold text-emerald-800 dark:text-emerald-300 text-sm">{kpis.completedLabs}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-amber-50/60 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-800/60 rounded-xl text-xs">
                    <span className="text-amber-800 dark:text-amber-300 font-semibold">Pending / In-Process Tests</span>
                    <span className="font-mono font-bold text-amber-800 dark:text-amber-300 text-sm">{kpis.pendingLabs}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-3">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                  <Pill size={16} className="text-teal-600" /> Pharmacy Inventory Safety Index
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Stock availability and capital invested in pharmaceuticals
                </p>

                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs">
                    <span className="text-slate-600 dark:text-slate-300 font-medium">Total Capital Invested in Stock</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                      ETB {kpis.totalInventoryValuation.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-red-50/60 dark:bg-red-950/40 border border-red-100 dark:border-red-800/60 rounded-xl text-xs">
                    <span className="text-red-800 dark:text-red-300 font-semibold">Critical Stockouts (Immediate Reorder)</span>
                    <span className="font-mono font-bold text-red-800 dark:text-red-300 text-sm">{kpis.criticalStock} items</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-amber-50/60 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-800/60 rounded-xl text-xs">
                    <span className="text-amber-800 dark:text-amber-300 font-semibold">Low Stock Warnings</span>
                    <span className="font-mono font-bold text-amber-800 dark:text-amber-300 text-sm">{kpis.lowStock} items</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 6: PAYMENT TRANSACTIONS (ITEMIZED RECEIPT LEDGER)
           ───────────────────────────────────────────────────────────── */}
        {activeTab === "ledger" && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
              <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
                {/* Search */}
                <div className="relative w-full md:w-80">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={ledgerSearch}
                    onChange={(e) => {
                      setLedgerSearch(e.target.value);
                      setLedgerPage(1);
                    }}
                    placeholder="Search receipt #, patient name, Health ID, cashier…"
                    className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-teal-500 font-medium"
                  />
                  {ledgerSearch && (
                    <button
                      type="button"
                      onClick={() => setLedgerSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Dropdown Filters */}
                <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                  {/* Category */}
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-slate-400 font-medium shrink-0">Category:</span>
                    <select
                      value={ledgerCategoryFilter}
                      onChange={(e) => {
                        setLedgerCategoryFilter(e.target.value);
                        setLedgerPage(1);
                      }}
                      className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 font-medium focus:outline-hidden cursor-pointer"
                    >
                      <option value="all">All Services</option>
                      <option value="card_fee">Card Fee (Intake)</option>
                      <option value="lab">Laboratory Orders</option>
                      <option value="pharmacy">Pharmacy Medications</option>
                      <option value="total_invoice">Total Visit Clearance</option>
                    </select>
                  </div>

                  {/* Payment Method */}
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-slate-400 font-medium shrink-0">Channel:</span>
                    <select
                      value={ledgerPaymentFilter}
                      onChange={(e) => {
                        setLedgerPaymentFilter(e.target.value);
                        setLedgerPage(1);
                      }}
                      className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 font-medium focus:outline-hidden cursor-pointer"
                    >
                      <option value="all">All Channels</option>
                      <option value="cash">Cash</option>
                      <option value="telebirr">Telebirr</option>
                      <option value="cbe_birr">CBE Birr</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex items-center justify-between">
                <span className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <FileText size={14} className="text-teal-600" />
                  Payment Receipt Records ({filteredTransactions.length} receipts)
                </span>
                <span className="text-[11px] text-slate-400 hidden sm:inline">
                  Every receipt issued by cashiers with timestamp and payment method
                </span>
              </div>

              {isLoading ? (
                <div className="p-12 text-center text-xs text-slate-400">Loading ledger records…</div>
              ) : filteredTransactions.length === 0 ? (
                <div className="p-12 text-center">
                  <FileText size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm">No transaction records found</p>
                  <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or date range.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="px-4 py-3">Receipt Number</th>
                        <th className="px-3 py-3">Patient &amp; Health ID</th>
                        <th className="px-3 py-3">Category</th>
                        <th className="px-3 py-3">Payment Channel</th>
                        <th className="px-4 py-3 text-right">Amount (ETB)</th>
                        <th className="px-3 py-3">Cashier</th>
                        <th className="px-4 py-3 text-right">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                      {paginatedTransactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                          {/* Receipt */}
                          <td className="px-4 py-3 font-mono font-bold text-teal-700 dark:text-teal-400">
                            {tx.receiptNumber}
                          </td>

                          {/* Patient */}
                          <td className="px-3 py-3">
                            <div className="font-bold text-slate-800 dark:text-slate-200">{tx.patientName}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{tx.healthId}</div>
                          </td>

                          {/* Category */}
                          <td className="px-3 py-3">
                            <span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {tx.category.replace(/_/g, " ")}
                            </span>
                          </td>

                          {/* Payment Channel */}
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                                tx.paymentMethod.toLowerCase() === "telebirr"
                                  ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300"
                                  : tx.paymentMethod.toLowerCase() === "cbe_birr"
                                  ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300"
                              }`}
                            >
                              {tx.paymentMethod.toUpperCase()}
                            </span>
                          </td>

                          {/* Amount */}
                          <td className="px-4 py-3 text-right font-mono font-black text-slate-900 dark:text-white">
                            ETB {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>

                          {/* Cashier */}
                          <td className="px-3 py-3 text-slate-600 dark:text-slate-300">{tx.collectedBy}</td>

                          {/* Timestamp */}
                          <td className="px-4 py-3 text-right text-slate-400 font-mono text-[11px] whitespace-nowrap">
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
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 7: ETHIOPIAN NATIONAL e-HMIS / DHIS2
           ───────────────────────────────────────────────────────────── */}
        {activeTab === "hmis" && <NovaHmisDhis2Tab />}
      </div>
    </PageShell>
  );
}
