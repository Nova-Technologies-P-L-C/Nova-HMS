"use client";
import React, { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { Card, KpiCard } from "@/components/nova/nova-ui";
import {
  Globe, Download, Printer, Send, Search, Filter, CheckCircle2,
  FileCode, Copy, Check, ShieldCheck, RefreshCw, AlertCircle,
  Eye, Calendar, Activity, Bed, FlaskConical, Pill, Building2,
  ChevronRight, ArrowUpRight
} from "lucide-react";

export default function NovaHmisDhis2Tab() {
  const [period, setPeriod] = useState<string>("current");
  const [calendarType, setCalendarType] = useState<"gregorian" | "ethiopian">("gregorian");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showPayloadModal, setShowPayloadModal] = useState<boolean>(false);
  const [showSyncModal, setShowSyncModal] = useState<boolean>(false);
  const [copiedPayload, setCopiedPayload] = useState<boolean>(false);
  const [dhis2ServerUrl, setDhis2ServerUrl] = useState<string>("https://dhis.moh.gov.et/api/dataValueSets");
  const [syncResult, setSyncResult] = useState<any | null>(null);

  // Fetch e-HMIS Report from backend engine
  const { data, isLoading, refetch, isFetching } = useQuery({
    ...trpc.tenant.hmisMonthlyReport.queryOptions({
      period,
      calendarType,
      department: "all",
    }),
    staleTime: 30_000,
  });

  const syncMutation = useMutation(
    trpc.tenant.syncDhis2Direct.mutationOptions({
      onSuccess: (res) => {
        setSyncResult(res);
      },
    })
  );

  const kpis = data?.summaryKpis ?? {
    totalVisits: 0,
    totalMorbidityCases: 0,
    totalU5Cases: 0,
    u5Percentage: 0,
    totalO5Cases: 0,
    o5Percentage: 0,
    totalAdmissions: 0,
    totalBedDays: 0,
    bedOccupancyRate: 0,
    totalLabTestsConducted: 0,
    totalPrescriptionsDispensed: 0,
    reportingStatus: "Ready for National Submission",
  };

  const matrix = data?.morbidityMatrix ?? [];

  // Filter matrix by search and category
  const filteredMatrix = useMemo(() => {
    return matrix.filter((row) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        row.name.toLowerCase().includes(q) ||
        row.nameAm.includes(q) ||
        row.code.toLowerCase().includes(q);
      const matchCat = categoryFilter === "all" || row.category === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [matrix, searchQuery, categoryFilter]);

  // Totals for table footer
  const columnTotals = useMemo(() => {
    return filteredMatrix.reduce(
      (acc, r) => {
        acc.u5Male += r.u5Male;
        acc.u5Female += r.u5Female;
        acc.u5Total += r.u5Total;
        acc.o5Male += r.o5Male;
        acc.o5Female += r.o5Female;
        acc.o5Total += r.o5Total;
        acc.grandTotal += r.grandTotal;
        return acc;
      },
      { u5Male: 0, u5Female: 0, u5Total: 0, o5Male: 0, o5Female: 0, o5Total: 0, grandTotal: 0 }
    );
  }, [filteredMatrix]);

  // 1-Click DHIS2 JSON Export Handler
  const handleExportJson = () => {
    if (!data?.dhis2JsonPayload) return;
    const jsonStr = JSON.stringify(data.dhis2JsonPayload, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${data.dhis2ExportFilename || "dhis2_export"}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 1-Click DHIS2 CSV Export Handler
  const handleExportCsv = () => {
    if (!data?.dhis2CsvContent) return;
    const blob = new Blob([data.dhis2CsvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${data.dhis2ExportFilename || "dhis2_export"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Copy JSON Payload to clipboard
  const handleCopyPayload = () => {
    if (!data?.dhis2JsonPayload) return;
    navigator.clipboard.writeText(JSON.stringify(data.dhis2JsonPayload, null, 2));
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          OFFICIAL MINISTRY OF HEALTH BANNER & CONTROLS
         ───────────────────────────────────────────────────────────── */}
      <Card className="p-5 border-emerald-200 bg-gradient-to-r from-emerald-50/50 via-teal-50/20 to-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-2xl shadow-sm shrink-0">
              🇪🇹
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-slate-800 text-base">
                  Ethiopian National e-HMIS / DHIS2 Reporting Engine
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <ShieldCheck size={12} /> MoH Standard v2.0
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                  OrgUnit: {data?.orgUnit ?? "ETH-HC-001"}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                Automated monthly indicator matrix compliant with the Federal Ministry of Health (MoH) Information Revolution Roadmap. Automatically tallies Top 20 Outpatient Morbidities by age (&lt;5 vs ≥5) and gender for direct submission into DHIS2.
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              onClick={handleExportJson}
              className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition flex items-center gap-1.5 shadow-xs"
              title="Download standard DHIS2 JSON payload"
            >
              <Download size={13} />
              <span>DHIS2 JSON</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="px-3 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg text-xs font-medium hover:bg-slate-50 transition flex items-center gap-1.5"
              title="Download DHIS2 standard CSV file"
            >
              <FileCode size={13} />
              <span>DHIS2 CSV</span>
            </button>

            <button
              onClick={() => window.print()}
              className="px-3 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg text-xs font-medium hover:bg-slate-50 transition flex items-center gap-1.5"
              title="Print official MoH monthly register"
            >
              <Printer size={13} />
              <span>Print Sheet</span>
            </button>

            <button
              onClick={() => {
                setSyncResult(null);
                setShowSyncModal(true);
              }}
              className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition flex items-center gap-1.5 shadow-xs"
              title="Direct sync to Ministry of Health DHIS2 Server"
            >
              <Send size={13} />
              <span>Sync to DHIS2</span>
            </button>

            <button
              onClick={() => setShowPayloadModal(true)}
              className="p-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 text-xs transition"
              title="Inspect raw DHIS2 dataValueSets payload"
            >
              <Eye size={14} />
            </button>
          </div>
        </div>

        {/* Filters and Period Bar */}
        <div className="mt-5 pt-4 border-t border-emerald-100 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-700 flex items-center gap-1">
              <Calendar size={13} className="text-emerald-600" /> Reporting Period:
            </span>

            {/* Period Selector */}
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-800 focus:outline-none focus:border-emerald-500 shadow-2xs"
            >
              <option value="current">Current Month (October 2026 / ጥቅምት 2019)</option>
              <option value="2026-10">October 2026 (Tikimt 2019 E.C.)</option>
              <option value="2026-09">September 2026 (Meskerem 2019 E.C.)</option>
              <option value="2026-08">August 2026 (Nehase 2018 E.C.)</option>
              <option value="2026-07">July 2026 (Hamle 2018 E.C.)</option>
              <option value="all">All Time (Multi-Month Aggregate)</option>
            </select>

            {/* Active Label */}
            <span className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 font-medium">
              {data?.periodLabel ?? "October 2026"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-[11px]">Submission State:</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center gap-1">
              <CheckCircle2 size={11} /> {kpis.reportingStatus}
            </span>
            <button
              onClick={() => refetch()}
              className="p-1.5 rounded hover:bg-slate-100 text-slate-500 transition"
              title="Re-aggregate indicators"
            >
              <RefreshCw size={13} className={isFetching ? "animate-spin text-emerald-600" : ""} />
            </button>
          </div>
        </div>
      </Card>

      {/* ─────────────────────────────────────────────────────────────
          NATIONAL HEALTH INDICATOR KPIS
         ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          label="Total National Indicators"
          value="20 Diseases"
          sub="MoH Core HMIS"
          accent
        />
        <KpiCard
          label="Total Morbidity Cases"
          value={kpis.totalMorbidityCases}
          sub={`${kpis.totalVisits} patient visits`}
        />
        <KpiCard
          label="Pediatric (< 5 yrs)"
          value={kpis.totalU5Cases}
          sub={`${kpis.u5Percentage}% national burden`}
        />
        <KpiCard
          label="Adult (≥ 5 yrs)"
          value={kpis.totalO5Cases}
          sub={`${kpis.o5Percentage}% national burden`}
        />
        <KpiCard
          label="Inpatient Bed Days"
          value={kpis.totalBedDays}
          sub={`${kpis.totalAdmissions} admissions`}
        />
        <KpiCard
          label="Bed Occupancy Rate"
          value={`${kpis.bedOccupancyRate}%`}
          sub="Facility efficiency"
        />
      </div>

      {/* ─────────────────────────────────────────────────────────────
          OFFICIAL ETHIOPIAN HMIS MORBIDITY MATRIX TABLE
         ───────────────────────────────────────────────────────────── */}
      <Card className="overflow-hidden">
        {/* Table Header & Search */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <Activity size={15} className="text-emerald-600" />
              Standard Outpatient (OPD) Morbidity Matrix — National HMIS Form
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Disaggregated by pediatric cohort (&lt;5 years) and adult cohort (≥5 years) with gender splits as mandated by the Ethiopian Ministry of Health.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search disease or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 w-48 shadow-2xs"
              />
            </div>

            <div className="flex items-center gap-1">
              <Filter size={13} className="text-slate-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-emerald-500 shadow-2xs"
              >
                <option value="all">All Categories</option>
                <option value="Communicable">Communicable</option>
                <option value="Non-Communicable">Non-Communicable</option>
                <option value="Injury">Injury & Trauma</option>
                <option value="Maternal/Child">Maternal / Child</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* The Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              {/* Top Header Group */}
              <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 text-center">
                <th rowSpan={2} className="px-3 py-2.5 border-r border-slate-200 text-left w-10">#</th>
                <th rowSpan={2} className="px-3 py-2.5 border-r border-slate-200 text-left w-24">HMIS Code</th>
                <th rowSpan={2} className="px-4 py-2.5 border-r border-slate-200 text-left">Clinical Diagnosis / Morbidity</th>
                <th rowSpan={2} className="px-3 py-2.5 border-r border-slate-200 text-left w-28">Category</th>
                <th colSpan={3} className="px-3 py-1.5 border-r border-slate-200 bg-amber-50 text-amber-900 border-b border-amber-200">
                  Pediatric Cohort (&lt; 5 Years)
                </th>
                <th colSpan={3} className="px-3 py-1.5 border-r border-slate-200 bg-blue-50 text-blue-900 border-b border-blue-200">
                  Adult / Older Cohort (≥ 5 Years)
                </th>
                <th rowSpan={2} className="px-4 py-2.5 border-r border-slate-200 bg-emerald-50 text-emerald-900 text-right w-24">Grand Total</th>
                <th rowSpan={2} className="px-3 py-2.5 text-right w-36">National Share</th>
              </tr>

              {/* Sub-Header Gender Columns */}
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-center text-[11px]">
                <th className="px-2 py-1.5 border-r border-slate-200 bg-amber-50/50 w-12">Male</th>
                <th className="px-2 py-1.5 border-r border-slate-200 bg-amber-50/50 w-12">Female</th>
                <th className="px-2.5 py-1.5 border-r border-slate-200 bg-amber-100/60 font-bold text-amber-900 w-14">Total</th>

                <th className="px-2 py-1.5 border-r border-slate-200 bg-blue-50/50 w-12">Male</th>
                <th className="px-2 py-1.5 border-r border-slate-200 bg-blue-50/50 w-12">Female</th>
                <th className="px-2.5 py-1.5 border-r border-slate-200 bg-blue-100/60 font-bold text-blue-900 w-14">Total</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredMatrix.map((row, index) => {
                const hasCases = row.grandTotal > 0;
                return (
                  <tr
                    key={row.code}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      hasCases ? "bg-white font-medium" : "text-slate-400 bg-slate-50/30"
                    }`}
                  >
                    <td className="px-3 py-2.5 border-r border-slate-100 text-slate-400 font-mono text-[11px]">
                      {index + 1}
                    </td>

                    <td className="px-3 py-2.5 border-r border-slate-100 font-mono font-bold text-[11px] text-teal-800">
                      {row.code}
                    </td>

                    <td className="px-4 py-2.5 border-r border-slate-100">
                      <div className="text-slate-800 font-semibold text-xs">
                        {row.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        {row.nameAm}
                      </div>
                    </td>

                    <td className="px-3 py-2.5 border-r border-slate-100">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          row.category === "Communicable"
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : row.category === "Non-Communicable"
                            ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                            : row.category === "Injury"
                            ? "bg-orange-50 text-orange-700 border border-orange-200"
                            : row.category === "Maternal/Child"
                            ? "bg-pink-50 text-pink-700 border border-pink-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {row.category}
                      </span>
                    </td>

                    {/* Pediatric < 5 Columns */}
                    <td className="px-2 py-2.5 border-r border-slate-100 text-center font-mono">
                      {row.u5Male || "—"}
                    </td>
                    <td className="px-2 py-2.5 border-r border-slate-100 text-center font-mono">
                      {row.u5Female || "—"}
                    </td>
                    <td className="px-2.5 py-2.5 border-r border-slate-100 text-center font-mono font-bold text-amber-900 bg-amber-50/30">
                      {row.u5Total || "—"}
                    </td>

                    {/* Adult ≥ 5 Columns */}
                    <td className="px-2 py-2.5 border-r border-slate-100 text-center font-mono">
                      {row.o5Male || "—"}
                    </td>
                    <td className="px-2 py-2.5 border-r border-slate-100 text-center font-mono">
                      {row.o5Female || "—"}
                    </td>
                    <td className="px-2.5 py-2.5 border-r border-slate-100 text-center font-mono font-bold text-blue-900 bg-blue-50/30">
                      {row.o5Total || "—"}
                    </td>

                    {/* Grand Total */}
                    <td className="px-4 py-2.5 border-r border-slate-100 text-right font-mono font-black text-sm text-emerald-700 bg-emerald-50/40">
                      {row.grandTotal}
                    </td>

                    {/* Burden Percentage Progress Bar */}
                    <td className="px-3 py-2.5 text-right">
                      {hasCases ? (
                        <div className="flex items-center gap-2 justify-end">
                          <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-emerald-600 h-1.5 rounded-full"
                              style={{ width: `${Math.min(100, row.burdenPercent * 2)}%` }}
                            />
                          </div>
                          <span className="font-mono font-bold text-xs text-slate-700 w-8 text-right">
                            {row.burdenPercent}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-300 font-mono text-[11px]">0%</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredMatrix.length === 0 && (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-slate-400 text-xs">
                    No diagnostic records matching current filter criteria.
                  </td>
                </tr>
              )}
            </tbody>

            {/* Official Column Totals Footer */}
            <tfoot>
              <tr className="bg-slate-200/80 font-black text-slate-800 border-t-2 border-slate-300 text-center">
                <td colSpan={4} className="px-4 py-3 border-r border-slate-300 text-left uppercase text-xs tracking-wider">
                  National HMIS Column Sums
                </td>

                <td className="px-2 py-3 border-r border-slate-300 font-mono font-bold">
                  {columnTotals.u5Male}
                </td>
                <td className="px-2 py-3 border-r border-slate-300 font-mono font-bold">
                  {columnTotals.u5Female}
                </td>
                <td className="px-2.5 py-3 border-r border-slate-300 font-mono font-black text-amber-900 bg-amber-100/50">
                  {columnTotals.u5Total}
                </td>

                <td className="px-2 py-3 border-r border-slate-300 font-mono font-bold">
                  {columnTotals.o5Male}
                </td>
                <td className="px-2 py-3 border-r border-slate-300 font-mono font-bold">
                  {columnTotals.o5Female}
                </td>
                <td className="px-2.5 py-3 border-r border-slate-300 font-mono font-black text-blue-900 bg-blue-100/50">
                  {columnTotals.o5Total}
                </td>

                <td className="px-4 py-3 border-r border-slate-300 text-right font-mono font-black text-sm text-emerald-800 bg-emerald-100/60">
                  {columnTotals.grandTotal}
                </td>

                <td className="px-3 py-3 text-right font-mono font-bold text-xs text-slate-800">
                  100%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* ─────────────────────────────────────────────────────────────
          HOSPITAL SERVICE & INPATIENT UTILIZATION SECTION
         ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-5">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <Bed size={15} className="text-teal-600" />
              Inpatient Service Utilization & Hospital Census
            </h4>
            <span className="text-[10px] text-slate-400 font-medium">MoH Monthly IPD</span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between items-center p-2 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-600 font-medium">Total Inpatient Admissions:</span>
              <span className="font-bold font-mono text-slate-800">{kpis.totalAdmissions} patients</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-600 font-medium">Total Inpatient Occupied Bed Days:</span>
              <span className="font-bold font-mono text-slate-800">{kpis.totalBedDays} days</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-600 font-medium">Bed Occupancy Rate (BOR):</span>
              <span className="font-bold font-mono text-emerald-700">{kpis.bedOccupancyRate}%</span>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <FlaskConical size={15} className="text-purple-600" />
              Clinical Support Services Volume
            </h4>
            <span className="text-[10px] text-slate-400 font-medium">MoH Diagnostics</span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between items-center p-2 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-600 font-medium">Diagnostic Lab Investigations Conducted:</span>
              <span className="font-bold font-mono text-purple-700">{kpis.totalLabTestsConducted} tests</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-600 font-medium">Prescription Medications Dispensed:</span>
              <span className="font-bold font-mono text-teal-700">{kpis.totalPrescriptionsDispensed} lines</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-600 font-medium">Total Outpatient Encounters Handled:</span>
              <span className="font-bold font-mono text-blue-700">{kpis.totalVisits} encounters</span>
            </div>
          </div>
        </Card>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: RAW DHIS2 dataValueSets PAYLOAD INSPECTOR
         ───────────────────────────────────────────────────────────── */}
      {showPayloadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode size={18} className="text-emerald-600" />
                <h3 className="font-bold text-slate-800 text-sm">
                  DHIS2 dataValueSets JSON Payload Inspector
                </h3>
              </div>
              <button
                onClick={() => setShowPayloadModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>
                  Compliant with DHIS2 Web API specification (<code>POST /api/dataValueSets</code>).
                </span>
                <button
                  onClick={handleCopyPayload}
                  className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium flex items-center gap-1 transition text-xs"
                >
                  {copiedPayload ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                  {copiedPayload ? "Copied!" : "Copy JSON"}
                </button>
              </div>

              <pre className="p-4 bg-slate-900 text-emerald-400 rounded-xl font-mono text-[11px] leading-relaxed overflow-x-auto max-h-96">
                {JSON.stringify(data?.dhis2JsonPayload, null, 2)}
              </pre>
            </div>

            <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
              <button
                onClick={handleExportJson}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition flex items-center gap-1.5"
              >
                <Download size={13} />
                Download JSON File
              </button>
              <button
                onClick={() => setShowPayloadModal(false)}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: DIRECT TRANSMISSION / PUSH TO DHIS2 ENDPOINT
         ───────────────────────────────────────────────────────────── */}
      {showSyncModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 bg-indigo-50/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Send size={18} className="text-indigo-600" />
                <h3 className="font-bold text-slate-800 text-sm">
                  Direct Electronic Transmission to DHIS2
                </h3>
              </div>
              <button
                onClick={() => setShowSyncModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {!syncResult ? (
                <>
                  <p className="text-slate-600 leading-relaxed">
                    This action formats and pushes the monthly indicator package directly to the national e-HMIS / DHIS2 web endpoint for <strong>{data?.periodLabel}</strong>.
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        DHIS2 Server Endpoint:
                      </label>
                      <input
                        type="text"
                        value={dhis2ServerUrl}
                        onChange={(e) => setDhis2ServerUrl(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Facility OrgUnit:</span>
                        <span className="font-bold text-slate-800 font-mono">{data?.orgUnit}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Period Code:</span>
                        <span className="font-bold text-slate-800 font-mono">{data?.periodCode}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Total Morbidity Cases:</span>
                        <span className="font-bold text-emerald-700 font-mono">{kpis.totalMorbidityCases}</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-4 space-y-3">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 size={28} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-base">Transmission Confirmed!</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      {syncResult.message}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-left space-y-1 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Transmission Reference:</span>
                      <span className="font-bold text-indigo-700">{syncResult.transmissionId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Confirmed Timestamp:</span>
                      <span className="text-slate-700">{new Date(syncResult.submittedAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
              {!syncResult ? (
                <>
                  <button
                    onClick={() => setShowSyncModal(false)}
                    className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      syncMutation.mutate({
                        periodCode: data?.periodCode || "202610",
                        serverUrl: dhis2ServerUrl,
                      });
                    }}
                    disabled={syncMutation.isPending}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {syncMutation.isPending ? "Transmitting..." : "Submit to Ministry of Health"}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowSyncModal(false)}
                  className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-900"
                >
                  Close & Done
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
