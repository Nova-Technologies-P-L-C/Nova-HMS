"use client";
import { use } from "react";
import Link from "next/link";
import { INVENTORY, BATCHES, STOCK_MOVEMENTS, LOCATION_STOCK, LOCATIONS } from "@/lib/nova-mock-data";
import { PageShell, StatusBadge, Card, KpiCard } from "@/components/nova/nova-ui";
import { ArrowLeft, AlertTriangle, CheckCircle, Clock } from "lucide-react";

const MOVEMENT_COLORS: Record<string, string> = {
  received: "text-teal-600 bg-teal-50 border-teal-200",
  dispensed: "text-blue-600 bg-blue-50 border-blue-200",
  expired: "text-red-600 bg-red-50 border-red-200",
  damaged: "text-orange-600 bg-orange-50 border-orange-200",
  transferred: "text-purple-600 bg-purple-50 border-purple-200",
  correction: "text-slate-600 bg-slate-50 border-slate-200",
};

export default function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const item = INVENTORY.find((i) => i.id === id);
  if (!item) return <div className="p-8 text-slate-500">Item not found</div>;

  const batches = BATCHES.filter((b) => b.itemId === id).sort((a, b) => new Date(a.expiry).getTime() - new Date(b.expiry).getTime());
  const movements = STOCK_MOVEMENTS.filter((m) => m.itemId === id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const locationStocks = LOCATION_STOCK.filter((l) => l.itemId === id && l.qty > 0);

  const today = new Date();
  const daysToExpiry = (expiry: string) => Math.ceil((new Date(expiry).getTime() - today.getTime()) / 86400000);
  const expiryStatus = (expiry: string) => {
    const d = daysToExpiry(expiry);
    if (d < 0) return "expired";
    if (d <= 30) return "critical";
    if (d <= 60) return "warning";
    if (d <= 90) return "soon";
    return "ok";
  };

  const totalReceived = movements.filter((m) => m.type === "received").reduce((s, m) => s + m.qty, 0);
  const totalDispensed = Math.abs(movements.filter((m) => m.type === "dispensed").reduce((s, m) => s + m.qty, 0));
  const totalLost = Math.abs(movements.filter((m) => ["expired", "damaged"].includes(m.type)).reduce((s, m) => s + m.qty, 0));

  return (
    <PageShell
      title={item.name}
      subtitle={`${item.category} · ${item.supplier} · ${item.unit}`}
      action={<Link href="/nova/pharmacy/inventory" className="flex items-center gap-1 text-sm text-slate-600 hover:text-teal-600"><ArrowLeft size={14} /> Back to inventory</Link>}
    >
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Total stock" value={`${item.qty} ${item.unit}`} accent />
        <KpiCard label="Total received" value={totalReceived.toLocaleString()} />
        <KpiCard label="Total dispensed" value={totalDispensed.toLocaleString()} />
        <KpiCard label="Lost / expired" value={totalLost.toLocaleString()} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Item info */}
        <Card className="p-5">
          <h2 className="font-semibold text-slate-800 mb-4">Item details</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ["ID", item.id], ["Category", item.category], ["Supplier", item.supplier],
              ["Unit", item.unit], ["Pack size", `${item.uomBoxQty} ${item.uomBase} / ${item.uomBox}`],
              ["Reorder point", `${item.rop} ${item.unit}`], ["Max level", `${item.maxLevel} ${item.unit}`],
              ["Nearest expiry", item.expiry],
            ].map(([label, val]) => (
              <div key={label}>
                <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
                <p className="font-medium text-slate-700">{val}</p>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Stock level</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-3 bg-slate-200 rounded-full">
                <div
                  className={`h-3 rounded-full ${item.qty <= item.rop * 0.5 ? "bg-red-500" : item.qty <= item.rop ? "bg-amber-400" : "bg-teal-500"}`}
                  style={{ width: `${Math.min(100, Math.round((item.qty / item.maxLevel) * 100))}%` }}
                />
              </div>
              <span className="text-sm font-medium">{Math.round((item.qty / item.maxLevel) * 100)}%</span>
            </div>
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>0</span><span>ROP: {item.rop}</span><span>Max: {item.maxLevel}</span>
            </div>
          </div>
        </Card>

        {/* Location breakdown */}
        <Card className="p-5">
          <h2 className="font-semibold text-slate-800 mb-4">Stock by location</h2>
          {locationStocks.length === 0 ? (
            <p className="text-sm text-slate-400">No location data</p>
          ) : (
            <div className="space-y-3">
              {locationStocks.map((ls) => {
                const loc = LOCATIONS.find((l) => l.id === ls.locationId);
                const pct = Math.min(100, Math.round((ls.qty / item.qty) * 100));
                return (
                  <div key={ls.locationId}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-700">{loc?.name ?? ls.locationId}</span>
                      <span className="font-medium">{ls.qty} {item.unit}</span>
                    </div>
                    <div className="h-1.5 bg-slate-200 rounded-full">
                      <div className="h-1.5 bg-teal-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Batches — FEFO order */}
      <Card className="p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-800">Batches / Lots — FEFO order</h2>
          <span className="text-xs bg-teal-50 text-teal-700 border border-teal-200 px-2 py-1 rounded">First-Expiry-First-Out</span>
        </div>
        {batches.length === 0 ? (
          <p className="text-sm text-slate-400">No batch data recorded</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  {["FEFO", "Lot number", "Qty", "Received", "Expiry", "Days left", "Supplier", "Status"].map((col) => (
                    <th key={col} className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {batches.map((batch, idx) => {
                  const d = daysToExpiry(batch.expiry);
                  const es = expiryStatus(batch.expiry);
                  return (
                    <tr key={batch.id} className={`border-b border-slate-100 last:border-0 ${idx === 0 ? "bg-teal-50" : ""}`}>
                      <td className="px-3 py-2.5">
                        {idx === 0 ? <span className="text-xs font-bold text-teal-700 bg-teal-100 px-2 py-0.5 rounded">Dispense first</span> : <span className="text-xs text-slate-400">#{idx + 1}</span>}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs">{batch.lotNumber}</td>
                      <td className="px-3 py-2.5 font-medium">{batch.qty} {item.unit}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-500">{batch.receivedDate}</td>
                      <td className="px-3 py-2.5 text-xs">{batch.expiry}</td>
                      <td className="px-3 py-2.5">
                        <span className={`text-xs font-medium ${es === "expired" ? "text-red-700" : es === "critical" ? "text-red-600" : es === "warning" ? "text-orange-600" : es === "soon" ? "text-amber-600" : "text-slate-600"}`}>
                          {d < 0 ? "EXPIRED" : `${d}d`}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-500">{batch.supplier}</td>
                      <td className="px-3 py-2.5">
                        {es === "expired" ? <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Expired</span>
                          : es === "critical" ? <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">≤30 days</span>
                          : es === "warning" ? <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">≤60 days</span>
                          : es === "soon" ? <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">≤90 days</span>
                          : <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">OK</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Movement history */}
      <Card className="p-5">
        <h2 className="font-semibold text-slate-800 mb-4">Movement history</h2>
        {movements.length === 0 ? (
          <p className="text-sm text-slate-400">No movements recorded</p>
        ) : (
          <div className="space-y-2">
            {movements.map((mov) => {
              const loc = LOCATIONS.find((l) => l.id === mov.locationId);
              const toLoc = mov.toLocationId ? LOCATIONS.find((l) => l.id === mov.toLocationId) : null;
              const cls = MOVEMENT_COLORS[mov.type] ?? "text-slate-600 bg-slate-50 border-slate-200";
              return (
                <div key={mov.id} className={`flex items-start gap-3 px-4 py-3 rounded-lg border text-sm ${cls}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium capitalize">{mov.type}</span>
                      <span className="font-bold">{mov.qty > 0 ? "+" : ""}{mov.qty} {item.unit}</span>
                      {mov.reference && <span className="text-xs opacity-70">ref: {mov.reference}</span>}
                    </div>
                    <p className="text-xs opacity-70">
                      {loc?.name}{toLoc ? ` → ${toLoc.name}` : ""} · {mov.user} · {mov.date}
                      {mov.note && ` · ${mov.note}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </PageShell>
  );
}
