"use client";
import { useState } from "react";
import { INVENTORY, SUPPLIERS, LOCATIONS } from "@/lib/nova-mock-data";
import { PageShell, Card, FormField, inputCls, btnPrimary, btnSecondary, KpiCard } from "@/components/nova/nova-ui";
import { Plus, Trash2, CheckCircle } from "lucide-react";

type ReceiptLine = {
  itemId: string; lotNumber: string; qty: string; uomBox: string;
  qtyPerBox: string; expiry: string; unitCost: string;
};

const emptyLine = (): ReceiptLine => ({ itemId: "", lotNumber: "", qty: "", uomBox: "box", qtyPerBox: "", expiry: "", unitCost: "" });

export default function ReceivePage() {
  const [supplierId, setSupplierId] = useState("");
  const [locationId, setLocationId] = useState("LOC001");
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split("T")[0]);
  const [invoiceRef, setInvoiceRef] = useState("");
  const [lines, setLines] = useState<ReceiptLine[]>([emptyLine()]);
  const [submitted, setSubmitted] = useState(false);

  const addLine = () => setLines((p) => [...p, emptyLine()]);
  const removeLine = (i: number) => setLines((p) => p.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: keyof ReceiptLine, val: string) =>
    setLines((p) => p.map((l, idx) => idx === i ? { ...l, [field]: val } : l));

  const totalUnits = lines.reduce((s, l) => {
    const boxes = Number(l.qty) || 0;
    const perBox = Number(l.qtyPerBox) || 1;
    return s + boxes * perBox;
  }, 0);

  const totalValue = lines.reduce((s, l) => {
    const boxes = Number(l.qty) || 0;
    const perBox = Number(l.qtyPerBox) || 1;
    const cost = Number(l.unitCost) || 0;
    return s + boxes * perBox * cost;
  }, 0);

  const handleSubmit = () => {
    if (!supplierId || lines.some((l) => !l.itemId || !l.qty || !l.expiry)) return;
    setSubmitted(true);
  };

  const supplier = SUPPLIERS.find((s) => s.id === supplierId);
  const location = LOCATIONS.find((l) => l.id === locationId);

  if (submitted) {
    return (
      <PageShell title="Goods Receipt" subtitle="Stock received successfully">
        <Card className="p-10 text-center max-w-md mx-auto mt-10">
          <CheckCircle size={48} className="text-teal-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Receipt recorded</h2>
          <p className="text-slate-500 text-sm mb-1">Supplier: {supplier?.name}</p>
          <p className="text-slate-500 text-sm mb-1">Location: {location?.name}</p>
          <p className="text-slate-500 text-sm mb-4">{lines.length} line(s) · {totalUnits.toLocaleString()} total units · ETB {totalValue.toLocaleString()}</p>
          <button className={btnPrimary} onClick={() => { setSubmitted(false); setLines([emptyLine()]); setInvoiceRef(""); }}>
            Record another receipt
          </button>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell title="Goods Receipt" subtitle="Record incoming stock with batch and lot details">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Lines" value={lines.length} />
        <KpiCard label="Total units" value={totalUnits.toLocaleString()} />
        <KpiCard label="Total value (ETB)" value={totalValue.toLocaleString()} accent={totalValue > 0} />
        <KpiCard label="Receiving location" value={location?.name ?? "—"} />
      </div>

      {/* Header */}
      <Card className="p-5 mb-5">
        <h2 className="font-semibold text-slate-800 mb-4">Receipt details</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <FormField label="Supplier">
            <select className={inputCls} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">Select supplier…</option>
              {SUPPLIERS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </FormField>
          <FormField label="Receiving location">
            <select className={inputCls} value={locationId} onChange={(e) => setLocationId(e.target.value)}>
              {LOCATIONS.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </FormField>
          <FormField label="Delivery date">
            <input type="date" className={inputCls} value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
          </FormField>
          <FormField label="Invoice / PO reference">
            <input className={inputCls} value={invoiceRef} onChange={(e) => setInvoiceRef(e.target.value)} placeholder="PO-2026-XXXX" />
          </FormField>
        </div>
        {supplier && (
          <div className="mt-3 px-3 py-2 bg-slate-50 rounded text-xs text-slate-500">
            {supplier.fullName} · {supplier.contact} · Lead time: {supplier.leadDays} days
          </div>
        )}
      </Card>

      {/* Lines */}
      <Card className="p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-800">Receipt lines</h2>
          <button onClick={addLine} className="flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700 font-medium">
            <Plus size={14} /> Add line
          </button>
        </div>
        <div className="space-y-4">
          {lines.map((line, i) => {
            const item = INVENTORY.find((inv) => inv.id === line.itemId);
            const totalLineUnits = (Number(line.qty) || 0) * (Number(line.qtyPerBox) || 1);
            return (
              <div key={i} className="grid grid-cols-2 md:grid-cols-8 gap-3 items-end p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="md:col-span-2">
                  <FormField label="Item">
                    <select className={inputCls} value={line.itemId} onChange={(e) => updateLine(i, "itemId", e.target.value)}>
                      <option value="">Select item…</option>
                      {INVENTORY.map((inv) => <option key={inv.id} value={inv.id}>{inv.name}</option>)}
                    </select>
                  </FormField>
                </div>
                <FormField label="Lot / batch no.">
                  <input className={inputCls} value={line.lotNumber} onChange={(e) => updateLine(i, "lotNumber", e.target.value)} placeholder="LOT-XXXX" />
                </FormField>
                <FormField label="Qty (boxes/packs)">
                  <input type="number" className={inputCls} value={line.qty} onChange={(e) => updateLine(i, "qty", e.target.value)} placeholder="0" />
                </FormField>
                <FormField label={`${item?.uomBase ?? "units"} per box`}>
                  <input type="number" className={inputCls} value={line.qtyPerBox} onChange={(e) => updateLine(i, "qtyPerBox", e.target.value)} placeholder={String(item?.uomBoxQty ?? 1)} />
                </FormField>
                <FormField label="Expiry date">
                  <input type="date" className={inputCls} value={line.expiry} onChange={(e) => updateLine(i, "expiry", e.target.value)} />
                </FormField>
                <FormField label="Unit cost (ETB)">
                  <input type="number" className={inputCls} value={line.unitCost} onChange={(e) => updateLine(i, "unitCost", e.target.value)} placeholder="0.00" />
                </FormField>
                <div className="flex flex-col gap-1">
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Total units</p>
                  <p className="text-sm font-bold text-teal-700 py-2">{totalLineUnits.toLocaleString()} {item?.unit ?? ""}</p>
                  {lines.length > 1 && (
                    <button onClick={() => removeLine(i)} className="text-red-400 hover:text-red-600 mt-1">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="flex gap-3">
        <button className={btnPrimary} onClick={handleSubmit}>Confirm receipt</button>
        <button className={btnSecondary} onClick={() => { setLines([emptyLine()]); setInvoiceRef(""); setSupplierId(""); }}>Reset</button>
      </div>
    </PageShell>
  );
}
