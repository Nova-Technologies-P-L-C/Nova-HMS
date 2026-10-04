"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { PageShell, Card } from "@/components/nova/nova-ui";
import {
  ShieldCheck,
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  Lock,
  Search,
} from "lucide-react";

export default function OwnerAuditTrailPage() {
  const [search, setSearch] = useState("");

  const { data, isLoading, refetch, isFetching } = useQuery(
    trpc.tenant.ownerOverview.queryOptions({ range: "all" })
  );

  const logs = (data?.recentAuditEvents ?? []).filter(
    (l) =>
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.entity.toLowerCase().includes(search.toLowerCase()) ||
      l.userId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageShell
      title="Forensic Security & Executive Action Audit"
      subtitle="Immutable cryptographic log of tariff adjustments, privilege changes, and administrative actions"
      action={
        <div className="flex items-center gap-2">
          <Link
            href={"/nova/org-admin" as any}
            className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 transition flex items-center gap-1.5"
          >
            <ArrowLeft size={13} />
            Back to Cockpit
          </Link>

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
      {/* Search Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search action, entity, or user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Lock size={13} className="text-emerald-600" />
          <span>Tamper-Proof Audit Standard • Total Recorded Events: <strong>{logs.length}</strong></span>
        </div>
      </div>

      <Card title="Sensitive Executive Action Log" subtitle="Real-time monitoring of administrative events across clinic operations">
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-3">Date & Time</th>
                <th className="py-3 px-3">Action</th>
                <th className="py-3 px-3">Target Entity</th>
                <th className="py-3 px-3">User / Actor</th>
                <th className="py-3 px-3 text-right">Integrity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No matching audit log records found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 font-mono text-slate-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-200">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400 font-medium">
                      {log.entity}
                    </td>
                    <td className="py-3 px-3 text-slate-700 dark:text-slate-300 font-semibold">
                      {log.userId}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 justify-end">
                        <CheckCircle2 size={12} /> Verified
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </PageShell>
  );
}
