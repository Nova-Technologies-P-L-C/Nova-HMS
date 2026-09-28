"use client";
import { useState } from "react";
import { INVENTORY, SUPPLIERS, REQUISITIONS } from "@/lib/nova-mock-data";
import { PageShell, Card, FormField, inputCls, btnPrimary, btnSecondary, StatusBadge, KpiCard } from "@/components/nova/nova-ui";
import { Plus, Trash2, CheckCircle, AlertTriangle, Zap } from "lucide-react";

type ReqLine = { itemId: string; qtyRequested: string; unitCost: string; note: string };
const emptyLine = (): ReqLine => ({ itemId: "", qtyRequested: "", unitCost: "", note: "" });

export default function RequisitionPage() {
  const [tab, setTab] = useState<"new" | "history">("new");
  const [reqType, setReqType] = useState<"routine" | "emergency">("routine");
  const [supplierId, setSupplierId] = useState("SUP001");
  const [lines, setLines] = useState<ReqLine[]>([emptyLine()]);
  const [submitted, setSubmitted] = useState(false);
  const [justification, setJustification] = useState("");

  const addLine = () => setLines((p) => [...p, emptyLine()]);
  const removeLine = (i: number) => setLines((p) => p.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: keyof ReqLine, val: string) =>
    setLines((p) => p.map((l, idx) => idx === i ? { ...l, [field]: val } : l));

  // Auto-fill below-ROP items
  const autoFillCritical = () => {
    const critical = INVENTORY.filter((i) => i.qty <= i.rop);
    setLines(critical.map((item) => ({
      itemId: item.id,
      qtyRequested: String(item.maxLevel - item.qty),
      unitCost: "",
      note: `Auto: stock ${item.qty} ≤ ROP ${item.rop}`,
    })));
  };

  const totalValue = lines.reduce((s, l) => {
    const item = INVENTORY.find((i) => i.id === l.itemId);
    return s + (Number(l.qtyRequested) || 0) * (Number(l.unitCost) || 0);
  }, 0);

  const supplier = SUPPLIERS.find((s) => s.id === supplierId);

  if (submitted) {
    return (
      <PageShell title="Requisition / RRF" subtitle="Submitted successfully">
        <Card className="p-10 text-center max-w-md mx-auto mt-10">
          <CheckCircle size={48} className="text-teal-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Requisition submitted</h2>
          <p className="text-slate-500 text-sm mb-1">Type: <strong className={reqType === "emergency" ? "text-red-600" : "text-slate-700"}>{reqType}</strong></p>
          <p className="text-slate-500 text-sm mb-1">Supplier: {supplier?.name}</p>
          <p className="text-slate-500 text-sm mb-4">{lines.length} line(s) · ETB {totalValue.toLocaleString()} estimated</p>
          <button className={btnPrimary} onClick={() => { setSubmitted(false); setLines([emptyLine()]); }}>New requisition</button>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell title="Requisition / RRF" subtitle="Report and Requisition Form — EPSA standard format">
      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab("new")} className={`px-4 py-2 text-sm rounded font-medium transition-colors ${tab === "new" ? "bg-teal-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>New requisition</button>
        <button onClick={() => setTab("history")} className={`px-4 py-2 text-sm rounded font-medium transition-colors ${tab === "history" ? "bg-teal-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>History</button>
      </div>

      {tab === "history" && (
        <div className="space-y-4">
          {REQUISITIONS.map((req) => (
            <Card key={req.id} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-slate-500">{req.id}</span>
                    <StatusBadge status={req.status} />
                    {req.type === "emergency" && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium">Emergency</span>}
                  </div>
                  <p className="text-sm text-slate-600">{req.date} · {req.requestedBy} · {req.supplier}</p>
                  {req.approvedBy && <p className="text-xs text-slate-400">Approved by: {req.approvedBy}</p>}
                </div>
                <p className="text-sm font-medium text-slate-700">{req.items.length} items</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead><tr className="border-b border-slate-100">{["Item", "Qty requested", "Unit", "Est. cost"].map((c) => <th key={c} className="text-left px-3 py-1.5 text-slate-400 font-medium">{c}</th>)}</tr></thead>
                  <tbody>
                    {req.items.map((item) => (
                      <tr key={item.itemId} className="border-b border-slate-50 last:border-0">
                        <td className="px-3 py-1.5 text-slate-700">{item.name}</td>
                        <td className="px-3 py-1.5 font-medium">{item.qtyRequested.toLocaleString()}</td>
                        <td className="px-3 py-1.5 text-slate-500">{item.unit}</td>
                        <td className="px-3 py-1.5 text-slate-600">ETB {(item.qtyRequested * item.unitCost).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === "new" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            <KpiCard label="Lines" value={lines.length} />
            <KpiCard label="Est. value (ETB)" value={totalValue.toLocaleString()} accent={totalValue > 0} />
            <KpiCard label="Type" value={reqType} />
            <KpiCard label="Supplier lead time" value={supplier ? `${supplier.leadDays}d` : "—"} />
          </div>

          {/* Type + supplier */}
          <Card className="p-5 mb-5">
            <h2 className="font-semibold text-slate-800 mb-4">Requisition header</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <FormField label="Type">
                <select className={inputCls} value={reqType} onChange={(e) => setReqType(e.target.value as "routine" | "emergency")}>
                  <option value="routine">Routine</option>
                  <option value="emergency">Emergency</option>
                </select>
              </FormField>
              <FormField label="Supplier">
                <select className={inputCls} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                  {SUPPLIERS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </FormField>
              <div className="md:col-span-2">
                <FormField label="Justification / notes">
                  <input className={inputCls} value={justification} onChange={(e) => setJustification(e.target.value)} placeholder="Reason for requisition…" />
                </FormField>
              </div>
            </div>
            {reqType === "emergency" && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                <AlertTriangle size={14} /> Emergency requisitions bypass normal approval and are fast-tracked to the supplier.
              </div>
            )}
            {supplier && (
              <p className="text-xs text-slate-400 mt-2">{supplier.fullName} · {supplier.contact} · Lead time: {supplier.leadDays} days</p>
            )}
          </Card>

          {/* Auto-fill */}
          <div className="flex items-center gap-3 mb-4">
            <button onClick={autoFillCritical} className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded hover:bg-amber-100 transition-colors font-medium">
              <Zap size={14} /> Auto-fill critical & low items
            </button>
            <p className="text-xs text-slate-400">{INVENTORY.filter((i) => i.qty <= i.rop).length} items currently at or below ROP</p>
          </div>

          {/* Lines */}
          <Card className="p-5 mb-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-800">Requisition lines</h2>
              <button onClick={addLine} className="flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700 font-medium"><Plus size={14} /> Add line</button>
            </div>
            <div className="space-y-3">
              {lines.map((line, i) => {
                const item = INVENTORY.find((inv) => inv.id === line.itemId);
                const suggested = item ? item.maxLevel - item.qty : 0;
                return (
                  <div key={i} className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="md:col-span-2">
                      <FormField label="Item">
                        <select className={inputCls} value={line.itemId} onChange={(e) => updateLine(i, "itemId", e.target.value)}>
                          <option value="">Select item…</option>
                          {INVENTORY.map((inv) => <option key={inv.id} value={inv.id}>{inv.name}</option>)}
                        </select>
                      </FormField>
                      {item && <p className="text-xs text-slate-400 mt-1">Current: {item.qty} · ROP: {item.rop} · Suggested: <strong className="text-teal-600">{suggested}</strong></p>}
                    </div>
                    <FormField label={`Qty (${item?.unit ?? "units"})`}>
                      <input type="number" className={inputCls} value={line.qtyRequested} onChange={(e) => updateLine(i, "qtyRequested", e.target.value)} placeholder={String(suggested || 0)} />
                    </FormField>
                    <FormField label="Unit cost (ETB)">
                      <input type="number" className={inputCls} value={line.unitCost} onChange={(e) => updateLine(i, "unitCost", e.target.value)} placeholder="0.00" />
                    </FormField>
                    <FormField label="Note">
                      <input className={inputCls} value={line.note} onChange={(e) => updateLine(i, "note", e.target.value)} placeholder="Optional" />
                    </FormField>
                    <div className="flex flex-col gap-1">
                      <p className="text-xs text-slate-400 uppercase tracking-wide">Line total</p>
                      <p className="text-sm font-bold text-teal-700 py-2">ETB {((Number(line.qtyRequested) || 0) * (Number(line.unitCost) || 0)).toLocaleString()}</p>
                      {lines.length > 1 && <button onClick={() => removeLine(i)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <div className="flex gap-3">
            <button className={btnPrimary} onClick={() => setSubmitted(true)}>Submit requisition</button>
            <button className={btnSecondary} onClick={() => setLines([emptyLine()])}>Reset</button>
          </div>
        </>
      )}
    </PageShell>
  );
}
