// Pharmacist — ROP Alerts Dashboard
import Link from "next/link";
import { INVENTORY } from "@/lib/nova-mock-data";
import { PageShell, KpiCard, Card, StatusBadge } from "@/components/nova/nova-ui";
import { AlertTriangle, ArrowRight } from "lucide-react";

export default function ROPAlertsPage() {
  const alerts = INVENTORY.filter((i) => i.status !== "ok");
  const critical = alerts.filter((i) => i.status === "critical");
  const low = alerts.filter((i) => i.status === "low");

  return (
    <PageShell title="Reorder Point Alerts" subtitle="Items at or below their reorder threshold">
      <div className="grid grid-cols-3 gap-4 mb-6">
        <KpiCard label="Critical" value={critical.length} accent={critical.length > 0} />
        <KpiCard label="Low" value={low.length} />
        <KpiCard label="OK" value={INVENTORY.filter((i) => i.status === "ok").length} />
      </div>

      {critical.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={15} className="text-red-500" />
            <p className="font-semibold text-red-700 text-sm">Critical — reorder immediately</p>
          </div>
          <div className="space-y-3">
            {critical.map((item) => {
              const pct = Math.round((item.qty / item.rop) * 100);
              return (
                <Card key={item.id} className="p-4 border-red-200 bg-red-50">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-slate-800">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.category} · Supplier: {item.supplier} · Expiry: {item.expiry}</p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  <div className="flex items-center gap-4 mb-2">
                    <div><p className="text-xs text-slate-500">Current stock</p><p className="font-bold text-red-600 text-lg">{item.qty} {item.unit}</p></div>
                    <div><p className="text-xs text-slate-500">Reorder point</p><p className="font-medium">{item.rop} {item.unit}</p></div>
                    <div><p className="text-xs text-slate-500">Max level</p><p className="font-medium">{item.maxLevel} {item.unit}</p></div>
                    <div className="flex-1">
                      <p className="text-xs text-slate-500 mb-1">Stock level ({pct}% of ROP)</p>
                      <div className="h-2 bg-red-200 rounded-full">
                        <div className="h-2 bg-red-500 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link href="/nova/pharmacy/requisition" className="text-xs px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 transition-colors">Create requisition</Link>
                    <Link href={`/nova/pharmacy/inventory/${item.id}`} className="text-xs px-3 py-1.5 bg-white border border-red-200 text-red-600 rounded hover:bg-red-50 transition-colors flex items-center gap-1">View detail <ArrowRight size={10} /></Link>
                  </div>
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
              const pct = Math.round((item.qty / item.rop) * 100);
              return (
                <Card key={item.id} className="p-4 border-amber-200 bg-amber-50">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-slate-800">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.category} · Supplier: {item.supplier}</p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  <div className="flex items-center gap-4">
                    <div><p className="text-xs text-slate-500">Current stock</p><p className="font-bold text-amber-600">{item.qty} {item.unit}</p></div>
                    <div><p className="text-xs text-slate-500">Reorder point</p><p className="font-medium">{item.rop}</p></div>
                    <div className="flex-1">
                      <div className="h-2 bg-amber-200 rounded-full">
                        <div className="h-2 bg-amber-400 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </div>
                    <Link href="/nova/pharmacy/requisition" className="text-xs px-3 py-1.5 bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors">Create requisition</Link>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </PageShell>
  );
}
