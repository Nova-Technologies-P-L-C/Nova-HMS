"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { PageShell, StatusBadge, KpiCard, Card, FormField, inputCls, btnPrimary, btnSecondary } from "@/components/nova/nova-ui";
import { Search, ArrowRight, Package } from "lucide-react";

export default function InventoryPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [adjustItem, setAdjustItem] = useState<string | null>(null);
  const [adjustType, setAdjustType] = useState<"received" | "expired" | "damaged" | "correction">("correction");
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustNote, setAdjustNote] = useState("");

  const { data: items = [] } = useQuery(trpc.inventory.items.queryOptions());
  const { data: locations = [] } = useQuery(trpc.inventory.locations.queryOptions());

  const adjust = useMutation(
    trpc.inventory.adjust.mutationOptions({
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: trpc.inventory.items.queryKey() });
        setAdjustItem(null); setAdjustQty(""); setAdjustNote("");
      },
    })
  );

  const categories = [...new Set(items.map((i) => i.category))];

  const filtered = useMemo(() => items.filter((item) => {
    const matchSearch = search === "" || item.name.toLowerCase().includes(search.toLowerCase());
    const totalQty = item.locationStock.reduce((s, l) => s + l.qty, 0);
    const status = totalQty <= item.rop * 0.5 ? "critical" : totalQty <= item.rop ? "low" : "ok";
    const matchStatus = filterStatus === "all" || status === filterStatus;
    return matchSearch && matchStatus;
  }), [items, search, filterStatus]);

  const critical = items.filter((i) => i.status === "critical").length;
  const low = items.filter((i) => i.status === "low").length;
  const adjustingItem = items.find((i) => i.id === adjustItem);

  const handleAdjust = () => {
    if (!adjustItem || !adjustQty) return;
    const mainLoc = locations[0];
    if (!mainLoc) return;
    adjust.mutate({ itemId: adjustItem, locationId: mainLoc.id, type: adjustType, qty: Math.abs(Number(adjustQty)), note: adjustNote });
  };

  return (
    <PageShell
      title="Inventory & Stock Ledger"
      subtitle={`${items.length} items · ${critical} critical · ${low} low`}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        <KpiCard label="Total items" value={items.length} />
        <KpiCard label="Critical" value={critical} accent={critical > 0} />
        <KpiCard label="Low stock" value={low} />
        <KpiCard label="Locations" value={locations.length} />
      </div>

      {(critical > 0 || low > 0) && (
        <div className="flex flex-wrap gap-3 mb-5">
          {critical > 0 && <div className="px-4 py-2.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">⚠ {critical} items critical — reorder immediately</div>}
          {low > 0 && <div className="px-4 py-2.5 bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-lg">↓ {low} items low — reorder soon</div>}
        </div>
      )}

      {adjustItem && adjustingItem && (
        <Card className="p-5 mb-5 border-blue-200 bg-blue-50">
          <h3 className="font-semibold text-slate-800 mb-1">Stock adjustment — {adjustingItem.name}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <FormField label="Type">
              <select className={inputCls} value={adjustType} onChange={(e) => setAdjustType(e.target.value as typeof adjustType)}>
                <option value="received">Received</option>
                <option value="expired">Expired</option>
                <option value="damaged">Damaged</option>
                <option value="correction">Correction</option>
              </select>
            </FormField>
            <FormField label="Quantity">
              <input type="number" className={inputCls} value={adjustQty} onChange={(e) => setAdjustQty(e.target.value)} />
            </FormField>
            <FormField label="Note">
              <input className={inputCls} value={adjustNote} onChange={(e) => setAdjustNote(e.target.value)} />
            </FormField>
          </div>
          <div className="flex gap-2">
            <button className={btnPrimary} onClick={handleAdjust} disabled={adjust.isPending}>Confirm</button>
            <button className={btnSecondary} onClick={() => setAdjustItem(null)}>Cancel</button>
          </div>
        </Card>
      )}

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input className={`${inputCls} pl-8`} placeholder="Search items…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className={`${inputCls} w-36`} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="ok">OK</option>
          <option value="low">Low</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {["Item", "Category", "Total Qty", "ROP", "Max", "Status", "Actions"].map((col) => (
                <th key={col} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => {
              const totalQty = item.locationStock.reduce((s, l) => s + l.qty, 0);
              const status = totalQty <= item.rop * 0.5 ? "critical" : totalQty <= item.rop ? "low" : "ok";
              return (
                <tr key={item.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{item.name}</td>
                  <td className="px-4 py-3"><span className="text-xs bg-slate-100 px-2 py-0.5 rounded">{item.category}</span></td>
                  <td className="px-4 py-3">
                    <span className={`font-bold ${status === "critical" ? "text-red-600" : status === "low" ? "text-amber-600" : "text-slate-800"}`}>{totalQty.toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-3 text-xs">{item.rop}</td>
                  <td className="px-4 py-3 text-xs">{item.maxLevel}</td>
                  <td className="px-4 py-3"><StatusBadge status={status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setAdjustItem(item.id)} className="text-xs text-blue-600 hover:underline">Adjust</button>
                      <Link href={`/nova/pharmacy/inventory/${item.id}`} className="text-xs text-teal-600 hover:underline flex items-center gap-0.5">Detail <ArrowRight size={10} /></Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <Package size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No items match your filters</p>
          </div>
        )}
      </div>
    </PageShell>
  );
}
