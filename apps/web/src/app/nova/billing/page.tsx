"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { PageShell, KpiCard, Card, StatusBadge } from "@/components/nova/nova-ui";
import { ArrowRight } from "lucide-react";

export default function BillingDashboard() {
  const { data: invoices = [] } = useQuery(trpc.billing.list.queryOptions());
  const { data: claims = [] } = useQuery(trpc.billing.cbhiClaims.queryOptions());
  const { data: waivers = [] } = useQuery(trpc.billing.waivers.queryOptions());

  const collected = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.total, 0);
  const pending = invoices.filter((i) => i.status === "pending").length;
  const cbhiPending = claims.filter((c) => c.status === "submitted").length;
  const waiverPending = waivers.filter((w) => w.status === "pending").length;

  return (
    <PageShell title="Billing Dashboard">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Collected" value={`ETB ${collected.toLocaleString()}`} accent />
        <KpiCard label="Pending invoices" value={pending} />
        <KpiCard label="CBHI claims pending" value={cbhiPending} />
        <KpiCard label="Waiver requests" value={waiverPending} sub="pending approval" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <p className="font-medium text-slate-800 text-sm">Recent invoices</p>
            <Link href="/nova/billing/invoices" className="text-xs text-teal-600 hover:underline flex items-center gap-1">All invoices <ArrowRight size={11} /></Link>
          </div>
          <div className="divide-y divide-slate-50">
            {invoices.slice(0, 5).map((inv) => (
              <div key={inv.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">{inv.visit?.patient?.nameEn ?? "—"}</p>
                  <p className="text-xs text-slate-400">{new Date(inv.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-slate-800">ETB {inv.total}</span>
                  <StatusBadge status={inv.status} />
                </div>
              </div>
            ))}
            {invoices.length === 0 && <p className="px-4 py-4 text-sm text-slate-400">No invoices yet</p>}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <p className="font-medium text-slate-800 text-sm">CBHI claims</p>
            <Link href="/nova/billing/cbhi" className="text-xs text-teal-600 hover:underline flex items-center gap-1">Manage <ArrowRight size={11} /></Link>
          </div>
          <div className="divide-y divide-slate-50">
            {claims.slice(0, 5).map((c) => (
              <div key={c.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">{c.invoice?.visit?.patient?.nameEn ?? "—"}</p>
                  <p className="text-xs text-slate-400">{new Date(c.submittedAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold">ETB {c.amount}</span>
                  <StatusBadge status={c.status} />
                </div>
              </div>
            ))}
            {claims.length === 0 && <p className="px-4 py-4 text-sm text-slate-400">No claims yet</p>}
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
