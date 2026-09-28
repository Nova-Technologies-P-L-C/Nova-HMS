"use client";
// Billing — CBHI Claims Management (page 38)
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { PageShell, DataTable, StatusBadge, KpiCard } from "@/components/nova/nova-ui";

export default function CBHIClaimsPage() {
  const qc = useQueryClient();
  const { data: claims = [] } = useQuery(trpc.billing.cbhiClaims.queryOptions());
  const update = useMutation(trpc.billing.updateCBHI.mutationOptions({
    onSuccess: () => qc.invalidateQueries({ queryKey: trpc.billing.cbhiClaims.queryKey() }),
  }));
  const totalSubmitted = claims.filter((c) => c.status === "submitted").reduce((s, c) => s + c.amount, 0);
  const totalApproved = claims.filter((c) => c.status === "approved").reduce((s, c) => s + c.amount, 0);

  return (
    <PageShell
      title="CBHI Claims"
      subtitle="Community-Based Health Insurance claim management"
      action={<button className="px-4 py-2 bg-teal-600 text-white text-sm rounded hover:bg-teal-700 transition-colors font-medium">+ Submit new claim</button>}
    >
      <div className="grid grid-cols-3 gap-4 mb-6">
        <KpiCard label="Pending (ETB)" value={totalSubmitted} accent />
        <KpiCard label="Approved (ETB)" value={totalApproved} />
        <KpiCard label="Rejected" value={claims.filter((c) => c.status === "rejected").length} />
      </div>

      <DataTable
        columns={["Claim ID", "Patient", "Invoice", "Amount (ETB)", "Submitted", "Status", "Actions"]}
        rows={claims.map((c) => [
          <span className="font-mono text-xs">{c.id}</span>,
          <span className="font-medium">{c.invoice.visit.patient.nameEn}</span>,
          <span className="text-xs text-slate-500">{c.invoiceId}</span>,
          <span className="font-medium">ETB {c.amount}</span>,
          new Date(c.submittedAt).toLocaleDateString(),
          <StatusBadge status={c.status} />,
          <div className="flex gap-2">
            <button className="text-xs text-teal-600 hover:underline">View</button>
            {c.status === "rejected" && (
              <button onClick={() => update.mutate({ claimId: c.id, status: "approved", rejectionReason: "" })} className="text-xs text-amber-600 hover:underline">Resubmit</button>
            )}
          </div>,
        ])}
      />
    </PageShell>
  );
}
