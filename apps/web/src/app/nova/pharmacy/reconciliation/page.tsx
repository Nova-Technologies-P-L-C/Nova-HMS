"use client";
import { useState } from "react";
import { INVENTORY, CYCLE_COUNTS } from "@/lib/nova-mock-data";
import { PageShell, Card, FormField, inputCls, btnPrimary, btnSecondary, KpiCard } from "@/components/nova/nova-ui";
import { CheckCircle, AlertTriangle, ClipboardList } from "lucide-react";

type CountLine = { itemId: string; systemQty: number; countedQty: string; varianceReason: string };

export default function ReconciliationPage() {
  const [tab, setTab] = useState<"new" | "history">("new");
  const [lines, setLines] = useState<CountLine[]>(
    INVENTORY.slice(0, 5).map((item) => ({ itemId: item.id, systemQty: item.qty, countedQty: "", varianceReason: "" }))
  );
  const [submitted, setSubmitted] = useState(false);
  const [conductedBy] = useState("Pharm. Selam Worku");

  const updateLine = (i: number, field: "countedQty" | "varianceReason", val: string) =>
    setLines((p) => p.map((l, idx) => idx === i ? { ...l, [field]: val } : l));

  const addItem = (itemId: string) => {
    if (lines.find((l) => l.itemId === itemId)) return;
    const item = INVENTORY.find((i) => i.id === itemId);
    if (!item) return;
    setLines((p) => [...p, { itemId: item.id, systemQty: item.qty, countedQty: "", varianceReason: "" }]);
  };

  const completedLines = lines.filter((l) => l.countedQty !== "");
  const discrepancies = completedLines.filter((l) => Number(l.countedQty) !== l.systemQty);
  const totalVariance = discrepancies.reduce((s, l) => s + (Number(l.countedQty) - l.systemQty), 0);

  if (submitted) {
    return (
      <PageShell title="Cycle Count & Reconciliation" subtitle="Count submitted">
        <Card className="p-10 text-center max-w-md mx-auto mt-10">
          <CheckCircle size={48} className="text-teal-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Cycle count submitted</h2>
          <p className="text-slate-500 text-sm mb-1">{completedLines.length} items counted</p>
          <p className="text-slate-500 text-sm mb-1">{discrepancies.length} discrepancies found</p>
          <p className={`text-sm font-medium mb-4 ${totalVariance < 0 ? "text-red-600" : "text-teal-600"}`}>
            Net variance: {totalVariance > 0 ? "+" : ""}{totalVariance} units
          </p>
          <button className={btnPrimary} onClick={() => { setSubmitted(false); setLines(INVENTORY.slice(0, 5).map((item) => ({ itemId: item.id, systemQty: item.qty, countedQty: "", varianceReason: "" }))); }}>
            New count
          </button>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell title="Cycle Count & Reconciliation" subtitle="Physical vs. system count — discrepancy reporting">
      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab("new")} className={`px-4 py-2 text-sm rounded font-medium transition-colors ${tab === "new" ? "bg-teal-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>New count</button>
        <button onClick={() => setTab("history")} className={`px-4 py-2 text-sm rounded font-medium transition-colors ${tab === "history" ? "bg-teal-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>Count history</button>
      </div>

      {tab === "history" && (
        <div className="space-y-5">
          {CYCLE_COUNTS.map((cc) => {
            const discrepancyItems = cc.items.filter((i) => i.variance !== 0);
            return (
              <Card key={cc.id} className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-semibold text-slate-800">{cc.date} — {cc.conductedBy}</p>
                    <p className="text-xs text-slate-500">{cc.items.length} items counted · {discrepancyItems.length} discrepancies</p>
                  </div>
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded capitalize">{cc.status}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead><tr className="border-b border-slate-200">{["Item", "System qty", "Counted qty", "Variance", "Reason"].map((c) => <th key={c} className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">{c}</th>)}</tr></thead>
                    <tbody>
                      {cc.items.map((item) => (
                        <tr key={item.itemId} className={`border-b border-slate-100 last:border-0 ${item.variance !== 0 ? "bg-red-50" : ""}`}>
                          <td className="px-3 py-2.5 font-medium text-slate-800">{item.name}</td>
                          <td className="px-3 py-2.5">{item.systemQty}</td>
                          <td className="px-3 py-2.5">{item.countedQty}</td>
                          <td className="px-3 py-2.5">
                            <span className={`font-bold ${item.variance < 0 ? "text-red-600" : item.variance > 0 ? "text-teal-600" : "text-slate-400"}`}>
                              {item.variance > 0 ? "+" : ""}{item.variance}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-xs text-slate-500">{item.varianceReason ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {tab === "new" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            <KpiCard label="Items to count" value={lines.length} />
            <KpiCard label="Counted" value={completedLines.length} />
            <KpiCard label="Discrepancies" value={discrepancies.length} accent={discrepancies.length > 0} />
            <KpiCard label="Net variance" value={`${totalVariance > 0 ? "+" : ""}${totalVariance}`} />
          </div>

          {discrepancies.length > 0 && (
            <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={14} className="text-red-600" />
                <p className="font-semibold text-red-700 text-sm">{discrepancies.length} discrepancies detected</p>
              </div>
              <div className="space-y-1">
                {discrepancies.map((l) => {
                  const item = INVENTORY.find((i) => i.id === l.itemId);
                  const variance = Number(l.countedQty) - l.systemQty;
                  return (
                    <p key={l.itemId} className="text-xs text-red-600">
                      {item?.name}: system {l.systemQty} → counted {l.countedQty} (<strong>{variance > 0 ? "+" : ""}{variance}</strong>)
                      {!l.varianceReason && <span className="text-red-400 ml-1">— reason required</span>}
                    </p>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add item to count */}
          <Card className="p-4 mb-4">
            <div className="flex items-center gap-3">
              <select className={`${inputCls} flex-1`} onChange={(e) => { addItem(e.target.value); e.target.value = ""; }} defaultValue="">
                <option value="">Add item to count…</option>
                {INVENTORY.filter((i) => !lines.find((l) => l.itemId === i.id)).map((i) => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
            </div>
          </Card>

          {/* Count table */}
          <Card className="p-5 mb-5">
            <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><ClipboardList size={16} /> Count sheet — {new Date().toLocaleDateString()} · {conductedBy}</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    {["Item", "System qty", "Counted qty", "Variance", "Loss category", "Reason"].map((c) => (
                      <th key={c} className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, i) => {
                    const item = INVENTORY.find((inv) => inv.id === line.itemId);
                    const counted = line.countedQty !== "" ? Number(line.countedQty) : null;
                    const variance = counted !== null ? counted - line.systemQty : null;
                    return (
                      <tr key={line.itemId} className={`border-b border-slate-100 last:border-0 ${variance !== null && variance < 0 ? "bg-red-50" : variance !== null && variance > 0 ? "bg-teal-50" : ""}`}>
                        <td className="px-3 py-2.5 font-medium text-slate-800">{item?.name}</td>
                        <td className="px-3 py-2.5 text-slate-600">{line.systemQty} {item?.unit}</td>
                        <td className="px-3 py-2.5 w-28">
                          <input
                            type="number"
                            className={inputCls}
                            value={line.countedQty}
                            onChange={(e) => updateLine(i, "countedQty", e.target.value)}
                            placeholder={String(line.systemQty)}
                          />
                        </td>
                        <td className="px-3 py-2.5 w-20">
                          {variance !== null && (
                            <span className={`font-bold text-sm ${variance < 0 ? "text-red-600" : variance > 0 ? "text-teal-600" : "text-slate-400"}`}>
                              {variance > 0 ? "+" : ""}{variance}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 w-40">
                          {variance !== null && variance < 0 && (
                            <select className={inputCls} onChange={(e) => updateLine(i, "varianceReason", e.target.value)}>
                              <option value="">Select…</option>
                              <option value="Unrecorded dispensing">Unrecorded dispensing</option>
                              <option value="Expired / written off">Expired / written off</option>
                              <option value="Damaged">Damaged</option>
                              <option value="Theft / pilferage">Theft / pilferage</option>
                              <option value="Data entry error">Data entry error</option>
                            </select>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <input
                            className={inputCls}
                            value={line.varianceReason}
                            onChange={(e) => updateLine(i, "varianceReason", e.target.value)}
                            placeholder="Notes…"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="flex gap-3">
            <button className={btnPrimary} onClick={() => setSubmitted(true)}>Submit count</button>
            <button className={btnSecondary} onClick={() => setLines(INVENTORY.slice(0, 5).map((item) => ({ itemId: item.id, systemQty: item.qty, countedQty: "", varianceReason: "" })))}>Reset</button>
          </div>
        </>
      )}
    </PageShell>
  );
}
