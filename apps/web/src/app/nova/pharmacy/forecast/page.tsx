"use client";
import { useState } from "react";
import { INVENTORY, CONSUMPTION_HISTORY } from "@/lib/nova-mock-data";
import { PageShell, Card, KpiCard } from "@/components/nova/nova-ui";
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";

export default function ForecastPage() {
  const [selectedItem, setSelectedItem] = useState("INV001");

  const itemHistory = CONSUMPTION_HISTORY.filter((c) => c.itemId === selectedItem);
  const item = INVENTORY.find((i) => i.id === selectedItem);

  const avg = itemHistory.length > 0 ? Math.round(itemHistory.reduce((s, c) => s + c.qty, 0) / itemHistory.length) : 0;
  const last3 = itemHistory.slice(-3);
  const last3Avg = last3.length > 0 ? Math.round(last3.reduce((s, c) => s + c.qty, 0) / last3.length) : 0;
  const trend = last3Avg > avg * 1.1 ? "up" : last3Avg < avg * 0.9 ? "down" : "stable";

  // Simple forecast: next 3 months using weighted average (recent months weighted more)
  const forecast = [1, 2, 3].map((offset) => {
    const base = last3Avg;
    // Seasonal bump for malaria drugs in rainy season (Jun-Sep)
    const nextMonth = (new Date().getMonth() + offset) % 12;
    const seasonalMultiplier = (selectedItem === "INV003" && nextMonth >= 5 && nextMonth <= 8) ? 1.4 : 1;
    return Math.round(base * seasonalMultiplier);
  });

  const suggestedReorder = item ? Math.max(0, item.maxLevel - item.qty) : 0;
  const monthsOfStock = avg > 0 && item ? Math.round((item.qty / avg) * 10) / 10 : 0;

  const maxBar = Math.max(...itemHistory.map((c) => c.qty), ...forecast);

  const allItems = Array.from(new Set(CONSUMPTION_HISTORY.map((c) => c.itemId)));

  // Summary table for all items
  const summaryRows = allItems.map((itemId) => {
    const hist = CONSUMPTION_HISTORY.filter((c) => c.itemId === itemId);
    const inv = INVENTORY.find((i) => i.id === itemId);
    const avgQty = hist.length > 0 ? Math.round(hist.reduce((s, c) => s + c.qty, 0) / hist.length) : 0;
    const l3 = hist.slice(-3);
    const l3a = l3.length > 0 ? Math.round(l3.reduce((s, c) => s + c.qty, 0) / l3.length) : 0;
    const t = l3a > avgQty * 1.1 ? "up" : l3a < avgQty * 0.9 ? "down" : "stable";
    const mos = avgQty > 0 && inv ? Math.round((inv.qty / avgQty) * 10) / 10 : 0;
    return { itemId, name: inv?.name ?? itemId, avgQty, l3Avg: l3a, trend: t, mos, currentQty: inv?.qty ?? 0, unit: inv?.unit ?? "", rop: inv?.rop ?? 0 };
  });

  return (
    <PageShell title="Demand Forecasting" subtitle="Historical consumption analysis and predictive reorder suggestions">
      {/* Summary table */}
      <Card className="p-5 mb-6">
        <h2 className="font-semibold text-slate-800 mb-4">All items — consumption overview</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                {["Item", "Avg/month", "Last 3mo avg", "Trend", "Current stock", "Months of stock", "Status"].map((c) => (
                  <th key={c} className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summaryRows.map((row) => (
                <tr
                  key={row.itemId}
                  onClick={() => setSelectedItem(row.itemId)}
                  className={`border-b border-slate-100 last:border-0 cursor-pointer transition-colors ${selectedItem === row.itemId ? "bg-teal-50" : "hover:bg-slate-50"}`}
                >
                  <td className="px-3 py-2.5 font-medium text-slate-800">{row.name}</td>
                  <td className="px-3 py-2.5">{row.avgQty} {row.unit}</td>
                  <td className="px-3 py-2.5">{row.l3Avg} {row.unit}</td>
                  <td className="px-3 py-2.5">
                    {row.trend === "up" && <span className="flex items-center gap-1 text-red-600 text-xs font-medium"><TrendingUp size={12} /> Rising</span>}
                    {row.trend === "down" && <span className="flex items-center gap-1 text-teal-600 text-xs font-medium"><TrendingDown size={12} /> Falling</span>}
                    {row.trend === "stable" && <span className="flex items-center gap-1 text-slate-500 text-xs"><Minus size={12} /> Stable</span>}
                  </td>
                  <td className="px-3 py-2.5">{row.currentQty.toLocaleString()} {row.unit}</td>
                  <td className="px-3 py-2.5">
                    <span className={`font-medium ${row.mos < 1 ? "text-red-600" : row.mos < 2 ? "text-amber-600" : "text-slate-700"}`}>{row.mos} mo</span>
                  </td>
                  <td className="px-3 py-2.5">
                    {row.mos < 1 ? <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Reorder now</span>
                      : row.mos < 2 ? <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">Reorder soon</span>
                      : <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">OK</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-400 mt-2">Click a row to see detailed forecast</p>
      </Card>

      {/* Detail forecast */}
      {item && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            <KpiCard label="Avg monthly use" value={`${avg} ${item.unit}`} />
            <KpiCard label="Last 3mo avg" value={`${last3Avg} ${item.unit}`} />
            <KpiCard label="Months of stock" value={`${monthsOfStock} mo`} accent={monthsOfStock < 2} />
            <KpiCard label="Suggested reorder" value={`${suggestedReorder} ${item.unit}`} />
          </div>

          {selectedItem === "INV003" && (
            <div className="mb-5 flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              Seasonal pattern detected: Artemether/Lumefantrine demand typically rises 40% during rainy season (Jun–Sep). Forecast adjusted accordingly.
            </div>
          )}

          <Card className="p-5">
            <h2 className="font-semibold text-slate-800 mb-1">{item.name} — consumption & forecast</h2>
            <p className="text-xs text-slate-400 mb-5">Historical (solid) + 3-month forecast (dashed)</p>

            {/* Bar chart */}
            <div className="flex items-end gap-2 h-40 mb-3">
              {itemHistory.map((c) => {
                const h = Math.round((c.qty / maxBar) * 100);
                return (
                  <div key={c.month} className="flex flex-col items-center gap-1 flex-1">
                    <span className="text-xs text-slate-500">{c.qty}</span>
                    <div className="w-full bg-teal-500 rounded-t" style={{ height: `${h}%` }} />
                    <span className="text-xs text-slate-400 rotate-45 origin-left whitespace-nowrap">{c.month.slice(5)}</span>
                  </div>
                );
              })}
              {forecast.map((qty, i) => {
                const h = Math.round((qty / maxBar) * 100);
                const months = ["Oct", "Nov", "Dec"];
                return (
                  <div key={`f${i}`} className="flex flex-col items-center gap-1 flex-1">
                    <span className="text-xs text-slate-400">{qty}</span>
                    <div className="w-full bg-teal-200 rounded-t border-2 border-dashed border-teal-400" style={{ height: `${h}%` }} />
                    <span className="text-xs text-slate-400 rotate-45 origin-left whitespace-nowrap">{months[i]}</span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-500 mt-4">
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-teal-500 rounded inline-block" /> Historical</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-teal-200 border border-dashed border-teal-400 rounded inline-block" /> Forecast</span>
              {trend === "up" && <span className="flex items-center gap-1 text-red-600 font-medium"><TrendingUp size={12} /> Demand rising — consider increasing PAR levels</span>}
              {trend === "down" && <span className="flex items-center gap-1 text-teal-600 font-medium"><TrendingDown size={12} /> Demand falling — consider reducing max level</span>}
            </div>
          </Card>
        </>
      )}
    </PageShell>
  );
}
