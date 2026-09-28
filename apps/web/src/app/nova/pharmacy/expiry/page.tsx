"use client";
import { useState } from "react";
import { BATCHES, INVENTORY, LOCATIONS } from "@/lib/nova-mock-data";
import { PageShell, Card, KpiCard, StatusBadge } from "@/components/nova/nova-ui";
import { AlertTriangle, ArrowLeftRight, CheckCircle } from "lucide-react";

export default function ExpiryPage() {
  const [redistributeId, setRedistributeId] = useState<string | null>(null);

  const today = new Date();
  const daysLeft = (expiry: string) => Math.ceil((new Date(expiry).getTime() - today.getTime()) / 86400000);

  const enriched = BATCHES.map((b) => {
    const item = INVENTORY.find((i) => i.id === b.itemId);
    const loc = LOCATIONS.find((l) => l.id === b.locationId);
    const d = daysLeft(b.expiry);
    return { ...b, itemName: item?.name ?? b.itemId, unit: item?.unit ?? "", locationName: loc?.name ?? b.locationId, daysLeft: d };
  }).sort((a, b) => a.daysLeft - b.daysLeft);

  const expired = enriched.filter((b) => b.daysLeft < 0);
  const within30 = enriched.filter((b) => b.daysLeft >= 0 && b.daysLeft <= 30);
  const within60 = enriched.filter((b) => b.daysLeft > 30 && b.daysLeft <= 60);
  const within90 = enriched.filter((b) => b.daysLeft > 60 && b.daysLeft <= 90);
  const safe = enriched.filter((b) => b.daysLeft > 90);

  // Redistribution suggestions: items expiring ≤90 days with qty > 20
  const redistributionCandidates = enriched.filter((b) => b.daysLeft >= 0 && b.daysLeft <= 90 && b.qty > 20);

  const BatchCard = ({ batch, tier }: { batch: typeof enriched[0]; tier: "expired" | "critical" | "warning" | "soon" }) => {
    const colors = {
      expired: "border-red-300 bg-red-50",
      critical: "border-red-200 bg-red-50",
      warning: "border-orange-200 bg-orange-50",
      soon: "border-amber-200 bg-amber-50",
    };
    const textColors = {
      expired: "text-red-700", critical: "text-red-600", warning: "text-orange-600", soon: "text-amber-600",
    };
    return (
      <div className={`p-4 rounded-lg border ${colors[tier]}`}>
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="font-medium text-slate-800 text-sm">{batch.itemName}</p>
            <p className="text-xs text-slate-500 font-mono">{batch.lotNumber}</p>
          </div>
          <span className={`text-sm font-bold ${textColors[tier]}`}>
            {batch.daysLeft < 0 ? "EXPIRED" : `${batch.daysLeft}d left`}
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div><p className="text-xs text-slate-400">Qty</p><p className="font-medium">{batch.qty} {batch.unit}</p></div>
          <div><p className="text-xs text-slate-400">Location</p><p className="font-medium">{batch.locationName}</p></div>
          <div><p className="text-xs text-slate-400">Expiry</p><p className="font-medium">{batch.expiry}</p></div>
          <div><p className="text-xs text-slate-400">Supplier</p><p className="font-medium">{batch.supplier}</p></div>
        </div>
        {tier !== "expired" && batch.qty > 20 && (
          <button
            onClick={() => setRedistributeId(batch.id === redistributeId ? null : batch.id)}
            className="mt-3 flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 font-medium"
          >
            <ArrowLeftRight size={12} /> Suggest redistribution
          </button>
        )}
        {redistributeId === batch.id && (
          <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded text-xs text-purple-700">
            <p className="font-medium mb-1">Redistribution suggestion</p>
            <p>{batch.qty} {batch.unit} of <strong>{batch.itemName}</strong> expiring in {batch.daysLeft} days.</p>
            <p className="mt-1">Consider transferring to a higher-consumption department (e.g. Emergency Store or OPD) to ensure use before expiry.</p>
            <div className="flex gap-2 mt-2">
              <button className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors">Create transfer order</button>
              <button onClick={() => setRedistributeId(null)} className="px-3 py-1 bg-white border border-purple-200 text-purple-600 rounded hover:bg-purple-50 transition-colors">Dismiss</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <PageShell title="Expiry Management" subtitle="Tiered alerts — 30 / 60 / 90 day thresholds">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <KpiCard label="Expired" value={expired.length} accent={expired.length > 0} />
        <KpiCard label="≤ 30 days" value={within30.length} />
        <KpiCard label="≤ 60 days" value={within60.length} />
        <KpiCard label="≤ 90 days" value={within90.length} />
        <KpiCard label="Safe (>90d)" value={safe.length} />
      </div>

      {/* Redistribution candidates */}
      {redistributionCandidates.length > 0 && (
        <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <ArrowLeftRight size={15} className="text-purple-600" />
            <p className="font-semibold text-purple-800 text-sm">Redistribution candidates</p>
          </div>
          <p className="text-xs text-purple-600 mb-3">{redistributionCandidates.length} batches expiring within 90 days with significant stock — consider transferring to higher-use locations.</p>
          <div className="flex flex-wrap gap-2">
            {redistributionCandidates.map((b) => (
              <span key={b.id} className="text-xs bg-white border border-purple-200 text-purple-700 px-3 py-1 rounded-full">
                {b.itemName} · {b.qty} {b.unit} · {b.daysLeft}d
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Expired */}
      {expired.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={15} className="text-red-600" />
            <h2 className="font-semibold text-red-700 text-sm">Expired — write off immediately</h2>
          </div>
          <div className="space-y-3">{expired.map((b) => <BatchCard key={b.id} batch={b} tier="expired" />)}</div>
        </div>
      )}

      {/* ≤30 days */}
      {within30.length > 0 && (
        <div className="mb-6">
          <h2 className="font-semibold text-red-600 text-sm mb-3">≤ 30 days — critical</h2>
          <div className="space-y-3">{within30.map((b) => <BatchCard key={b.id} batch={b} tier="critical" />)}</div>
        </div>
      )}

      {/* ≤60 days */}
      {within60.length > 0 && (
        <div className="mb-6">
          <h2 className="font-semibold text-orange-600 text-sm mb-3">≤ 60 days — warning</h2>
          <div className="space-y-3">{within60.map((b) => <BatchCard key={b.id} batch={b} tier="warning" />)}</div>
        </div>
      )}

      {/* ≤90 days */}
      {within90.length > 0 && (
        <div className="mb-6">
          <h2 className="font-semibold text-amber-600 text-sm mb-3">≤ 90 days — monitor</h2>
          <div className="space-y-3">{within90.map((b) => <BatchCard key={b.id} batch={b} tier="soon" />)}</div>
        </div>
      )}

      {/* Safe */}
      {safe.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={15} className="text-teal-600" />
            <h2 className="font-semibold text-teal-700 text-sm">Safe — more than 90 days</h2>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full text-sm">
              <thead><tr className="bg-slate-50 border-b border-slate-200">{["Lot", "Item", "Qty", "Location", "Expiry", "Days left"].map((c) => <th key={c} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{c}</th>)}</tr></thead>
              <tbody>
                {safe.map((b) => (
                  <tr key={b.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{b.lotNumber}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-800">{b.itemName}</td>
                    <td className="px-4 py-2.5">{b.qty} {b.unit}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{b.locationName}</td>
                    <td className="px-4 py-2.5 text-xs">{b.expiry}</td>
                    <td className="px-4 py-2.5 text-teal-600 font-medium text-xs">{b.daysLeft}d</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PageShell>
  );
}
