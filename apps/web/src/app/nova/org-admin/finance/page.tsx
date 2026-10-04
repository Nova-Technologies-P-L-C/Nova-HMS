"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { PageShell, Card } from "@/components/nova/nova-ui";
import {
  Banknote,
  ShieldAlert,
  ArrowLeft,
  RefreshCw,
  TrendingUp,
  CreditCard,
  Building2,
  FileCheck,
} from "lucide-react";

export default function OwnerFinancialsPage() {
  const [range, setRange] = useState<"today" | "7d" | "30d" | "month" | "quarter" | "all">("30d");

  const { data, isLoading, refetch, isFetching } = useQuery(
    trpc.tenant.ownerOverview.queryOptions({ range })
  );

  const kpis = data?.kpis;

  return (
    <PageShell
      title="Financial Liquidity & Revenue Leakage Audit"
      subtitle="Executive collections auditing, fee waivers, social subsidies, and payment channel distribution"
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
      {/* Financial Health KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gross Collections</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {(kpis?.totalGrossRevenue ?? 0).toLocaleString()} ETB
          </div>
          <div className="text-xs text-emerald-600 font-semibold mt-1">
            Today: {(kpis?.todayRevenue ?? 0).toLocaleString()} ETB
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Waived Revenue (Subsidies)</div>
          <div className="text-2xl font-black text-rose-600 mt-1">
            {(kpis?.waivedAmount ?? 0).toLocaleString()} ETB
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {kpis?.waiversCount ?? 0} approved hardship exemptions
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending CBHI Claims</div>
          <div className="text-2xl font-black text-cyan-600 mt-1">
            {(kpis?.pendingClaimsAmount ?? 0).toLocaleString()} ETB
          </div>
          <div className="text-xs text-slate-500 mt-1">Awaiting government settlement</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Average Encounter Value</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {(kpis?.avgEncounterValue ?? 0).toLocaleString()} ETB
          </div>
          <div className="text-xs text-slate-500 mt-1">Per outpatient encounter</div>
        </div>
      </div>

      {/* Payment Channel Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Payment Channel Distribution" subtitle="Itemized transaction revenue by settlement channel">
          <div className="space-y-4 mt-2">
            {Object.entries(data?.channelBreakdown ?? {}).map(([key, ch]) => {
              const total = (kpis?.totalGrossRevenue || 1) + (kpis?.waivedAmount || 0);
              const share = Math.round((ch.amount / total) * 100);
              return (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-800 dark:text-slate-200">{ch.label}</span>
                    <span className="font-mono text-slate-900 dark:text-white">
                      {ch.amount.toLocaleString()} ETB ({share}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        key === "cash"
                          ? "bg-emerald-500"
                          : key === "telebirr"
                          ? "bg-blue-500"
                          : key === "cbe_birr"
                          ? "bg-purple-500"
                          : key === "cbhi"
                          ? "bg-cyan-500"
                          : "bg-rose-500"
                      }`}
                      style={{ width: `${share}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {ch.count} receipts issued
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Executive Anti-Leakage Controls" subtitle="Governance mechanisms to safeguard clinic revenue">
          <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg">
              <h5 className="font-bold text-amber-900 dark:text-amber-200 mb-1">Fee-Waiver Approval Limits</h5>
              <p className="text-[11px] leading-relaxed">
                Ensure Branch Admins only approve fee waivers accompanied by official Woreda/Kebele hardship documentation.
                All waivers above 500 ETB automatically flag in the executive audit trail.
              </p>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg">
              <h5 className="font-bold text-blue-900 dark:text-blue-200 mb-1">CBHI Rejection Mitigation</h5>
              <p className="text-[11px] leading-relaxed">
                Rejected CBHI claims directly cause financial loss. Review rejected claims with the billing department to
                correct member ID errors or missing referral slips before submission deadlines expire.
              </p>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <Link
                href={"/nova/branch-admin/fee-waivers" as any}
                className="px-3 py-1.5 bg-slate-900 dark:bg-slate-800 text-white font-bold rounded-lg text-xs hover:bg-slate-700 transition"
              >
                Inspect Branch Fee-Waiver Queue
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
