"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { PageShell, Card } from "@/components/nova/nova-ui";
import {
  Stethoscope,
  Activity,
  CheckCircle2,
  Clock,
  FileText,
  FlaskConical,
  Pill,
  ArrowLeft,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";

export default function ClinicianProductivityPage() {
  const [range, setRange] = useState<"today" | "7d" | "30d" | "month" | "quarter" | "all">("30d");
  const [search, setSearch] = useState("");

  const { data, isLoading, refetch, isFetching } = useQuery(
    trpc.tenant.ownerOverview.queryOptions({ range })
  );

  const clinicians = (data?.clinicianProductivity ?? []).filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageShell
      title="Clinician & Doctor Productivity Intelligence"
      subtitle="Workload analytics, consultation throughput, and diagnostic utilization per physician"
      action={
        <div className="flex items-center gap-2">
          <Link
            href={"/nova/org-admin" as any}
            className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 transition flex items-center gap-1.5"
          >
            <ArrowLeft size={13} />
            Back to Cockpit
          </Link>

          {/* Range Selector */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
            {(
              [
                ["today", "Today"],
                ["7d", "7D"],
                ["30d", "30D"],
                ["month", "Month"],
                ["all", "All"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setRange(key)}
                className={`px-2 py-1 rounded-md font-medium transition ${
                  range === key
                    ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-1.5 text-slate-600 hover:text-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 transition"
          >
            <RefreshCw size={15} className={isFetching ? "animate-spin text-amber-600" : ""} />
          </button>
        </div>
      }
    >
      {/* Search & Overview Stats */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search physician or clinician..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>Active Physicians: <strong className="text-slate-900 dark:text-white font-mono">{clinicians.length}</strong></span>
          <span>•</span>
          <span>Total Encounters: <strong className="text-slate-900 dark:text-white font-mono">{data?.kpis?.totalVisits ?? 0}</strong></span>
        </div>
      </div>

      {/* Main Table */}
      <Card title="Physician Productivity Matrix" subtitle="Aggregated consultations, prescription orders, and lab requisitions">
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-3">Physician / Clinician</th>
                <th className="py-3 px-3 text-center">Consultations</th>
                <th className="py-3 px-3 text-center">Completed</th>
                <th className="py-3 px-3 text-center">In Queue</th>
                <th className="py-3 px-3 text-center">e-Prescriptions</th>
                <th className="py-3 px-3 text-center">Lab Tests Ordered</th>
                <th className="py-3 px-3 text-center">Diagnoses Documented</th>
                <th className="py-3 px-3 text-right">Throughput Ratio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {clinicians.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No clinical activity records found for this period.
                  </td>
                </tr>
              ) : (
                clinicians.map((doc, idx) => {
                  const completionRate =
                    doc.consultationsCount > 0
                      ? Math.round((doc.completedVisits / doc.consultationsCount) * 100)
                      : 0;
                  return (
                    <tr key={doc.name} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center font-mono text-[10px] font-black">
                          {idx + 1}
                        </span>
                        <span>{doc.name}</span>
                      </td>
                      <td className="py-3 px-3 text-center font-black text-slate-900 dark:text-white font-mono text-sm">
                        {doc.consultationsCount}
                      </td>
                      <td className="py-3 px-3 text-center text-emerald-600 font-semibold font-mono">
                        {doc.completedVisits}
                      </td>
                      <td className="py-3 px-3 text-center text-amber-600 font-semibold font-mono">
                        {doc.activeVisits}
                      </td>
                      <td className="py-3 px-3 text-center text-slate-700 dark:text-slate-300 font-mono">
                        {doc.prescriptionsCount}
                      </td>
                      <td className="py-3 px-3 text-center text-slate-700 dark:text-slate-300 font-mono">
                        {doc.labOrdersCount}
                      </td>
                      <td className="py-3 px-3 text-center text-slate-700 dark:text-slate-300 font-mono">
                        {doc.diagnosesCount}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            completionRate >= 80
                              ? "bg-emerald-100 text-emerald-800"
                              : completionRate >= 50
                              ? "bg-blue-100 text-blue-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {completionRate}% Complete
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </PageShell>
  );
}
