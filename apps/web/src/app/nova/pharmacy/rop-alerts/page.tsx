"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { PageShell, KpiCard, Card, StatusBadge } from "@/components/nova/nova-ui";
import { AlertTriangle, CheckCircle, ArrowRight } from "lucide-react";

export default function ROPAlertsPage() {
  const { data: alerts = [], isLoading } = useQuery({
    ...trpc.inventory.ropAlerts.queryOptions(),
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const { data: allItems = [] } = useQuery(trpc.inventory.items.queryOptions());

  const critical = alerts.filter((i) => i.status === "critical");
  const low = alerts.filter((i) => i.status === "low");
  const okCount = allItems.length - alerts.length;

  return (
    <PageShell title="Reorder Point Alerts" subtitle="Items at or below their reorder threshold">
      <div className="grid grid-cols-3 gap-4 mb-6">
        <KpiCard label="Critical" value={critical.length} accent={critical.length > 0} />
        <KpiCard label="Low" value={low.length} />
        <KpiCard label="OK" value={okCount} />
      </div>

      {isLoading && <p className="text-sm text-slate-400">Loading…</p>}

      {!isLoading && alerts.length === 0 && (
        <Card className="p-12 text-center">
          <CheckCircle size={36} className="text-teal-500 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">All stock levels healthy</p>
          <p className="text-sm text-slate-400 mt-1">No items are below their reorder point.</p>
        </Card>
      )}

      {critical.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={15} className="text-red-500" />
            <p className="font-semibold text-red-700 text-sm">Critical — reorder immediately</p>
          </div>
          <div className="space-y-3">
            {critical.map((item) => {
              const totalQty = item.locationStock?.reduce((s: number, l: { qty: number }) => s + l.qty, 0) ?? 0;
              const pct = item.rop > 0 ? Math.min(Math.round((totalQty / item.rop) * 100), 100) : 0;
              return (
                <Card key={item.id} className="p-4 border-red-200 bg-red-50">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-slate-800">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.category} · Supplier: {item.supplier?.name ?? "—"}</p>
                    </div>
                    <StatusBadge status="critical" />
                  </div>
                  <div className="flex flex-wrap gap-6 mb-3">
                    <div>
                      <p className="text-xs text-slate-500">Current stock</p>
                      <p className="font-bold text-red-600 text-lg">{totalQty} {item.uomBase}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Reorder point</p>
                      <p className="font-medium text-slate-700">{item.rop} {item.uomBase}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Max level</p>
                      <p className="font-medium text-slate-700">{item.maxLevel}</p>
                    </div>
                    <div className="flex-1 min-w-40">
                      <p className="text-xs text-slate-500 mb-1">Stock level ({pct}% of ROP)</p>
                      <div className="h-2 bg-red-200 rounded-full">
                        <div className="h-2 bg-red-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                  <Link href="/nova/pharmacy/inventory" className="inline-flex items-center gap-1 text-xs px-3 py-1.5 bg-white border border-red-200 text-red-600 rounded hover:bg-red-50">
                    View in inventory <ArrowRight size={10} />
                  </Link>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {low.length > 0 && (
        <div>
          <p className="font-semibold text-amber-700 text-sm mb-3">Low — reorder soon</p>
          <div className="space-y-3">
            {low.map((item) => {
              const totalQty = item.locationStock?.reduce((s: number, l: { qty: number }) => s + l.qty, 0) ?? 0;
              const pct = item.rop > 0 ? Math.min(Math.round((totalQty / item.rop) * 100), 100) : 0;
              return (
                <Card key={item.id} className="p-4 border-amber-200 bg-amber-50">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-slate-800">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.category} · Supplier: {item.supplier?.name ?? "—"}</p>
                    </div>
                    <StatusBadge status="low" />
                  </div>
                  <div className="flex flex-wrap gap-6 mb-3">
                    <div>
                      <p className="text-xs text-slate-500">Current stock</p>
                      <p className="font-bold text-amber-600">{totalQty} {item.uomBase}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Reorder point</p>
                      <p className="font-medium">{item.rop}</p>
                    </div>
                    <div className="flex-1 min-w-40">
                      <p className="text-xs text-slate-500 mb-1">Stock level ({pct}% of ROP)</p>
                      <div className="h-2 bg-amber-200 rounded-full">
                        <div className="h-2 bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                  <Link href="/nova/pharmacy/inventory" className="inline-flex items-center gap-1 text-xs px-3 py-1.5 bg-white border border-amber-200 text-amber-600 rounded hover:bg-amber-50">
                    View in inventory <ArrowRight size={10} />
                  </Link>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </PageShell>
  );
}
