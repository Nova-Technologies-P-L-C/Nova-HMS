"use client";
// Hospital Admin — Fee-Waiver Approval Queue (page 14)
import { useState } from "react";
import { FEE_WAIVERS } from "@/lib/nova-mock-data";
import { PageShell, DataTable, StatusBadge, Card } from "@/components/nova/nova-ui";

export default function FeeWaiverQueuePage() {
  const [waivers, setWaivers] = useState(FEE_WAIVERS);

  const approve = (id: string) =>
    setWaivers((prev) => prev.map((w) => w.id === id ? { ...w, status: "approved" } : w));
  const reject = (id: string) =>
    setWaivers((prev) => prev.map((w) => w.id === id ? { ...w, status: "rejected" } : w));

  const pending = waivers.filter((w) => w.status === "pending");

  return (
    <PageShell title="Fee-Waiver Approval Queue" subtitle={`${pending.length} pending approval`}>
      {pending.length === 0 && (
        <Card className="p-10 text-center text-slate-400 mb-6">
          <p className="text-2xl mb-2">✓</p>
          <p className="font-medium">No pending fee waivers</p>
          <p className="text-sm">All requests have been reviewed.</p>
        </Card>
      )}

      <DataTable
        columns={["ID", "Patient", "Invoice", "Amount (ETB)", "Reason", "Requested by", "Date", "Status", "Actions"]}
        rows={waivers.map((w) => [
          <span className="font-mono text-xs">{w.id}</span>,
          <span className="font-medium">{w.patient}</span>,
          <span className="text-xs text-slate-500">{w.invoiceId}</span>,
          <span className="font-medium">ETB {w.amount}</span>,
          <span className="text-sm max-w-xs">{w.reason}</span>,
          w.requestedBy,
          w.date,
          <StatusBadge status={w.status} />,
          w.status === "pending" ? (
            <div className="flex gap-2">
              <button onClick={() => approve(w.id)} className="text-xs px-2 py-1 bg-teal-600 text-white rounded hover:bg-teal-700 transition-colors">Approve</button>
              <button onClick={() => reject(w.id)} className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors">Reject</button>
            </div>
          ) : <span className="text-xs text-slate-400">—</span>,
        ])}
      />
    </PageShell>
  );
}
