"use client";
// Billing — Invoices & Payments (page 40)
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { PageShell, DataTable, StatusBadge, Card } from "@/components/nova/nova-ui";

export default function InvoicesPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const qc = useQueryClient();
  const { data: invoices = [] } = useQuery(trpc.billing.list.queryOptions());
  const markPaid = useMutation(trpc.billing.markPaid.mutationOptions({
    onSuccess: () => qc.invalidateQueries({ queryKey: trpc.billing.list.queryKey() }),
  }));
  const invoice = invoices.find((i) => i.id === selected);

  return (
    <PageShell
      title="Invoices & Payments"
      subtitle={`${invoices.length} invoices`}
      action={<button className="px-4 py-2 bg-teal-600 text-white text-sm rounded hover:bg-teal-700 transition-colors font-medium">+ New invoice</button>}
    >
      <DataTable
        columns={["Invoice ID", "Patient", "Date", "Services", "Total (ETB)", "CBHI", "Status", ""]}
        rows={invoices.map((inv) => [
          <button onClick={() => setSelected(inv.id === selected ? null : inv.id)} className="font-mono text-xs text-teal-700 hover:underline">{inv.id}</button>,
          <span className="font-medium">{inv.visit.patient.nameEn}</span>,
          new Date(inv.createdAt).toLocaleDateString(),
          <span className="text-xs text-slate-500">{inv.lines.length} items</span>,
          <span className="font-bold">ETB {inv.total}</span>,
          inv.cbhiClaim ? <span className="text-xs text-teal-600">✓ CBHI</span> : <span className="text-xs text-slate-400">Self-pay</span>,
          <StatusBadge status={inv.status} />,
          <div className="flex gap-2">
            <button className="text-xs text-teal-600 hover:underline">Print</button>
            {inv.status === "pending" && <button onClick={() => markPaid.mutate({ invoiceId: inv.id })} className="text-xs text-emerald-600 hover:underline">Mark paid</button>}
          </div>,
        ])}
      />

      {invoice && (
        <Card className="mt-5 p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="font-bold text-slate-800 text-lg">{invoice.id}</p>
              <p className="text-slate-500 text-sm">{invoice.visit.patient.nameEn} · {new Date(invoice.createdAt).toLocaleDateString()}</p>
            </div>
            <StatusBadge status={invoice.status} />
          </div>
          <table className="min-w-full text-sm mb-4">
            <thead><tr className="border-b border-slate-100"><th className="text-left py-2 text-slate-500 font-medium">Service</th><th className="text-right py-2 text-slate-500 font-medium">Amount (ETB)</th></tr></thead>
            <tbody>
              {invoice.lines.map((line) => (
                <tr key={line.id} className="border-b border-slate-50">
                  <td className="py-2 text-slate-700">{line.description}</td>
                  <td className="py-2 text-right text-slate-700">{line.total}</td>
                </tr>
              ))}
              <tr><td className="py-2 font-bold">Total</td><td className="py-2 text-right font-bold">ETB {invoice.total}</td></tr>
            </tbody>
          </table>
          {invoice.cbhiClaim && <p className="text-xs text-teal-700 bg-teal-50 rounded p-2">CBHI member — claim submitted to insurer</p>}
        </Card>
      )}
    </PageShell>
  );
}
