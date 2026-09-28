"use client";
import { useState } from "react";
import { LOCATIONS, LOCATION_STOCK, INVENTORY } from "@/lib/nova-mock-data";
import { PageShell, Card, KpiCard, FormField, inputCls, btnPrimary, btnSecondary } from "@/components/nova/nova-ui";
import { ArrowLeftRight, MapPin } from "lucide-react";

export default function LocationsPage() {
  const [selectedLoc, setSelectedLoc] = useState<string | null>(null);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transfer, setTransfer] = useState({ fromLoc: "", toLoc: "", itemId: "", qty: "" });
  const [transferDone, setTransferDone] = useState(false);

  const locStock = (locId: string) => LOCATION_STOCK.filter((l) => l.locationId === locId && l.qty > 0);
  const totalItems = (locId: string) => locStock(locId).length;
  const totalUnits = (locId: string) => locStock(locId).reduce((s, l) => s + l.qty, 0);

  const selectedLocData = LOCATIONS.find((l) => l.id === selectedLoc);
  const selectedStock = selectedLoc ? locStock(selectedLoc) : [];

  const LOC_TYPE_COLORS: Record<string, string> = {
    pharmacy: "bg-teal-100 text-teal-700",
    ward: "bg-blue-100 text-blue-700",
    or: "bg-purple-100 text-purple-700",
    emergency: "bg-red-100 text-red-700",
  };

  const handleTransfer = () => {
    setTransferDone(true);
    setShowTransfer(false);
    setTransfer({ fromLoc: "", toLoc: "", itemId: "", qty: "" });
  };

  return (
    <PageShell
      title="Multi-Location Stock"
      subtitle={`${LOCATIONS.length} locations · ${LOCATION_STOCK.filter((l) => l.qty > 0).length} active stock entries`}
      action={
        <button onClick={() => setShowTransfer(!showTransfer)} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm rounded hover:bg-teal-700 transition-colors font-medium">
          <ArrowLeftRight size={14} /> Transfer stock
        </button>
      }
    >
      {transferDone && (
        <div className="mb-5 px-4 py-3 bg-teal-50 border border-teal-200 text-teal-700 text-sm rounded-lg">
          ✓ Transfer recorded successfully
          <button onClick={() => setTransferDone(false)} className="ml-3 text-teal-500 hover:text-teal-700 text-xs underline">Dismiss</button>
        </div>
      )}

      {showTransfer && (
        <Card className="p-5 mb-5 border-teal-200">
          <h3 className="font-semibold text-slate-800 mb-4">Stock transfer between locations</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <FormField label="From location">
              <select className={inputCls} value={transfer.fromLoc} onChange={(e) => setTransfer((p) => ({ ...p, fromLoc: e.target.value }))}>
                <option value="">Select…</option>
                {LOCATIONS.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </FormField>
            <FormField label="To location">
              <select className={inputCls} value={transfer.toLoc} onChange={(e) => setTransfer((p) => ({ ...p, toLoc: e.target.value }))}>
                <option value="">Select…</option>
                {LOCATIONS.filter((l) => l.id !== transfer.fromLoc).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </FormField>
            <FormField label="Item">
              <select className={inputCls} value={transfer.itemId} onChange={(e) => setTransfer((p) => ({ ...p, itemId: e.target.value }))}>
                <option value="">Select…</option>
                {(transfer.fromLoc ? locStock(transfer.fromLoc) : LOCATION_STOCK).map((ls) => {
                  const item = INVENTORY.find((i) => i.id === ls.itemId);
                  return <option key={ls.itemId} value={ls.itemId}>{item?.name} ({ls.qty} {item?.unit})</option>;
                })}
              </select>
            </FormField>
            <FormField label="Quantity">
              <input type="number" className={inputCls} value={transfer.qty} onChange={(e) => setTransfer((p) => ({ ...p, qty: e.target.value }))} placeholder="0" />
            </FormField>
          </div>
          <div className="flex gap-2">
            <button className={btnPrimary} onClick={handleTransfer}>Confirm transfer</button>
            <button className={btnSecondary} onClick={() => setShowTransfer(false)}>Cancel</button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {LOCATIONS.map((loc) => {
          const items = totalItems(loc.id);
          const units = totalUnits(loc.id);
          const stock = locStock(loc.id);
          const criticalItems = stock.filter((ls) => {
            const item = INVENTORY.find((i) => i.id === ls.itemId);
            return item && ls.qty <= item.rop * 0.5;
          });
          return (
            <div
              key={loc.id}
              className={`bg-white rounded-lg border p-5 cursor-pointer transition-all ${selectedLoc === loc.id ? "border-teal-400 ring-1 ring-teal-400" : "border-slate-200 hover:border-slate-300"}`}
              onClick={() => setSelectedLoc(selectedLoc === loc.id ? null : loc.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MapPin size={15} className="text-slate-400" />
                  <p className="font-semibold text-slate-800 text-sm">{loc.name}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded capitalize font-medium ${LOC_TYPE_COLORS[loc.type] ?? "bg-slate-100 text-slate-600"}`}>{loc.type}</span>
              </div>
              <p className="text-xs text-slate-500 mb-3">{loc.manager}</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-400">Item types</p>
                  <p className="text-xl font-bold text-slate-800">{items}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Total units</p>
                  <p className="text-xl font-bold text-slate-800">{units.toLocaleString()}</p>
                </div>
              </div>
              {criticalItems.length > 0 && (
                <div className="mt-3 px-2 py-1.5 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                  ⚠ {criticalItems.length} item{criticalItems.length > 1 ? "s" : ""} critically low
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedLoc && selectedLocData && (
        <Card className="p-5">
          <h2 className="font-semibold text-slate-800 mb-1">{selectedLocData.name} — stock detail</h2>
          <p className="text-xs text-slate-500 mb-4">{selectedLocData.manager} · {selectedLocData.type}</p>
          {selectedStock.length === 0 ? (
            <p className="text-sm text-slate-400">No stock in this location</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    {["Item", "Category", "Qty", "Unit", "ROP", "Stock %", "Status"].map((c) => (
                      <th key={c} className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selectedStock.map((ls) => {
                    const item = INVENTORY.find((i) => i.id === ls.itemId);
                    if (!item) return null;
                    const pct = Math.min(100, Math.round((ls.qty / item.maxLevel) * 100));
                    const status = ls.qty <= item.rop * 0.5 ? "critical" : ls.qty <= item.rop ? "low" : "ok";
                    return (
                      <tr key={ls.itemId} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                        <td className="px-3 py-2.5 font-medium text-slate-800">{item.name}</td>
                        <td className="px-3 py-2.5"><span className="text-xs bg-slate-100 px-2 py-0.5 rounded">{item.category}</span></td>
                        <td className="px-3 py-2.5">
                          <span className={`font-bold ${status === "critical" ? "text-red-600" : status === "low" ? "text-amber-600" : "text-slate-800"}`}>{ls.qty.toLocaleString()}</span>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-slate-500">{item.unit}</td>
                        <td className="px-3 py-2.5 text-xs">{item.rop}</td>
                        <td className="px-3 py-2.5 w-28">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-slate-200 rounded-full">
                              <div className={`h-1.5 rounded-full ${pct < 30 ? "bg-red-500" : pct < 60 ? "bg-amber-400" : "bg-teal-500"}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-slate-400">{pct}%</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${status === "critical" ? "bg-red-100 text-red-700" : status === "low" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </PageShell>
  );
}
