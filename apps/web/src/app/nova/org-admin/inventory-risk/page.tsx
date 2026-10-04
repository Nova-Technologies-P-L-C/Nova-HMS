"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { PageShell, Card } from "@/components/nova/nova-ui";
import {
  Layers,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  Clock,
  ShieldCheck,
  Search,
} from "lucide-react";

export default function PharmacyCapitalRiskPage() {
  const [range] = useState<"today" | "7d" | "30d" | "month" | "quarter" | "all">("30d");

  const { data, isLoading, refetch, isFetching } = useQuery(
    trpc.tenant.ownerOverview.queryOptions({ range })
  );

  const kpis = data?.kpis;
  const batches = data?.expiringBatchesList ?? [];
  const criticalStockouts = data?.criticalStockouts ?? [];

  return (
    <PageShell
      title="Pharmacy Capital Asset & Expiry Risk Intelligence"
      subtitle="Safeguard clinic investment: monitor expiring medications, capital at risk, and critical drug stockouts"
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
      {/* High-Level Capital Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Stock Asset Valuation</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {(kpis?.totalStockValuation ?? 0).toLocaleString()} ETB
          </div>
          <div className="text-xs text-slate-500 mt-1">Active inventory held across dispensary and stores</div>
        </div>

        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl p-4 shadow-xs">
          <div className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
            Capital at Expiry Risk (&lt; 90 Days)
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {(kpis?.atRiskExpiringValuation ?? 0).toLocaleString()} ETB
          </div>
          <div className="text-xs text-amber-700/80 dark:text-amber-300/80 mt-1">
            Imminent expiration requiring immediate clinical priority
          </div>
        </div>

        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl p-4 shadow-xs">
          <div className="text-xs font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider">
            Critical Stockouts
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {kpis?.criticalStockoutsCount ?? 0} Items
          </div>
          <div className="text-xs text-rose-700/80 dark:text-rose-300/80 mt-1">
            Essential medicines below safety reorder threshold
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Expiring Batches Table */}
        <Card
          title="Medication Batches Nearing Expiry (&lt; 90 Days)"
          subtitle="Proactively prescribe or return to supplier to avoid direct financial loss"
        >
          {batches.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              ✅ No medication batches are currently expiring within 90 days.
            </div>
          ) : (
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Medication</th>
                    <th className="py-2.5 px-3">Lot / Batch Number</th>
                    <th className="py-2.5 px-3 text-center">Remaining Quantity</th>
                    <th className="py-2.5 px-3">Expiry Date</th>
                    <th className="py-2.5 px-3 text-right">Capital Loss at Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {batches.map((batch) => (
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

        {/* Critical Stockouts Card */}
        <Card
          title="Critical Drug Stockout Monitor"
          subtitle="Essential medications depleted or nearing depletion that interrupt clinical care"
        >
          {criticalStockouts.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              ✅ All essential pharmacy medications are stocked within safety reorder levels.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-2">
              {criticalStockouts.map((item) => (
                <div
                  key={item.name}
                  className="p-3 border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 rounded-xl"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-200 text-rose-800">
                      Stockout Alert
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">{item.uomBase}</span>
                  </div>
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white mt-1">{item.name}</h5>
                  <p className="text-[11px] text-slate-500 mt-0.5">{item.category}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </PageShell>
  );
}
