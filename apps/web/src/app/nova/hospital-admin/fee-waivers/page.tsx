"use client";
// ─── FEE-WAIVER APPROVAL QUEUE ────────────────────────────────────────────────
// Role: Hospital Admin
// Purpose: Allows the Hospital Admin to review, approve, or reject fee waiver
//          requests submitted by Reception or Billing Officers for patients who
//          cannot afford their bills (indigent patients, social cases, MOH-mandated
//          exemptions such as under-5 children and pregnant women in public hospitals).
//
// Approve flow:
//   Admin clicks Approve → trpc.billing.resolveWaiver({ waiverId, approved: true })
//   → FeeWaiver.status = "approved" → Invoice.status = "waived"
//
// Reject flow:
//   Admin clicks Reject → trpc.billing.resolveWaiver({ waiverId, approved: false })
//   → FeeWaiver.status = "rejected" → Invoice.status = "pending" (back to cashier)
//
// ⚠ PRODUCTION WARNING — this page uses the FEE_WAIVERS mock array. Approve/reject
//   only updates local React state; no database write occurs. No audit trail created.
//
// TODO (HIGH): Replace FEE_WAIVERS useState with:
//   const { data: waivers } = useQuery(trpc.billing.waivers.queryOptions())
//
// TODO (HIGH): Replace approve/reject local handlers with:
//   trpc.billing.resolveWaiver.mutate({ waiverId: w.id, approved: true/false })
//   This persists the decision, updates invoice status, and triggers notifications.
// ──────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import { FEE_WAIVERS } from "@/lib/nova-mock-data"; // TODO: replace with trpc.billing.waivers
import { PageShell, DataTable, StatusBadge, Card } from "@/components/nova/nova-ui";

export default function FeeWaiverQueuePage() {
  // TODO (HIGH): Replace useState initialiser with trpc.billing.waivers query
  const [waivers, setWaivers] = useState(FEE_WAIVERS);

  // TODO (HIGH): Replace with trpc.billing.resolveWaiver.mutate({ waiverId, approved: true })
  const approve = (id: string) =>
    setWaivers((prev) => prev.map((w) => w.id === id ? { ...w, status: "approved" } : w));

  // TODO (HIGH): Replace with trpc.billing.resolveWaiver.mutate({ waiverId, approved: false })
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
