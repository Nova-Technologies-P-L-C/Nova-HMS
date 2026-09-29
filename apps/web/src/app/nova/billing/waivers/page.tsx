"use client";

// Billing — Fee-Waiver Requests (billing officer view) (page 39)
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { PageShell, DataTable, StatusBadge } from "@/components/nova/nova-ui";

export default function BillingWaiversPage() {
  const qc = useQueryClient();
  const { data: waivers = [] } = useQuery(trpc.billing.waivers.queryOptions());
  const resolve = useMutation(trpc.billing.resolveWaiver.mutationOptions({
    onSuccess: () => qc.invalidateQueries({ queryKey: trpc.billing.waivers.queryKey() }),
  }));

  return (
    <PageShell
      title="Fee-Waiver Requests"
      subtitle="Track and submit fee-waiver requests for approval by Hospital Admin"
      action={<button className="px-4 py-2 bg-teal-600 text-white text-sm rounded hover:bg-teal-700 transition-colors font-medium">+ New request</button>}
    >
      <DataTable
        columns={["ID", "Patient", "Invoice", "Amount (ETB)", "Reason", "Requested by", "Date", "Status"]}
        rows={waivers.map((w) => [
          <span className="font-mono text-xs">{w.id}</span>,
          <span className="font-medium">{w.invoice.visit.patient.nameEn}</span>,
          <span className="text-xs">{w.invoiceId}</span>,
          `ETB ${w.amount}`,
          <span className="text-sm">{w.reason}</span>,
          w.requestedBy,
          new Date(w.createdAt).toLocaleDateString(),
          <StatusBadge status={w.status} />,
          w.status === "pending" && <div className="flex gap-2"><button onClick={() => resolve.mutate({ waiverId: w.id, approved: true })} className="text-xs text-emerald-600 hover:underline">Approve</button><button onClick={() => resolve.mutate({ waiverId: w.id, approved: false })} className="text-xs text-red-500 hover:underline">Reject</button></div>,
        ])}
      />
    </PageShell>
  );
}
