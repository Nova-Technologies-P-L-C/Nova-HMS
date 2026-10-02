// Nova Admin — Subscription & Billing (page 9)
import { HOSPITALS } from "@/lib/nova-mock-data";
import { PageShell, DataTable, StatusBadge, KpiCard } from "@/components/nova/nova-ui";

const PLAN_PRICE: Record<string, number> = {
  "Basic OPD": 2500,
  "Full Clinical": 7500,
  "Enterprise Multi-Facility": 18000,
};

export default function NovaAdminBillingPage() {
  const active = HOSPITALS.filter((h) => h.status !== "suspended");
  const mrr = active.reduce((s, h) => s + (PLAN_PRICE[h.plan] ?? 0), 0);

  return (
    <PageShell title="Subscription & Billing" subtitle="Per-tenant plans and invoicing">
      <div className="grid grid-cols-3 gap-4 mb-6">
        <KpiCard label="MRR" value={`ETB ${mrr.toLocaleString()}`} accent />
        <KpiCard label="Paying tenants" value={active.length} />
        <KpiCard label="Suspended" value={HOSPITALS.filter((h) => h.status === "suspended").length} />
      </div>

      <DataTable
        columns={["Hospital", "Plan", "Monthly (ETB)", "Status", "Next invoice", "Actions"]}
        rows={HOSPITALS.map((h) => [
          <span className="font-medium">{h.name}</span>,
          h.plan,
          (PLAN_PRICE[h.plan] ?? 0).toLocaleString(),
          <StatusBadge status={h.status} />,
          h.status === "suspended" ? "—" : "2026-10-01",
          <button className="text-xs text-teal-600 hover:underline">View invoices</button>,
        ])}
      />
    </PageShell>
  );
}
