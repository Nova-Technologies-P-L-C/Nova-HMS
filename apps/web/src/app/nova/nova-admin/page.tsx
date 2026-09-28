// Nova Admin — Platform Dashboard (page 7)
import { HOSPITALS } from "@/lib/nova-mock-data";
import { PageShell, KpiCard, DataTable, StatusBadge } from "@/components/nova/nova-ui";
import Link from "next/link";

export default function NovaAdminDashboard() {
  const active = HOSPITALS.filter((h) => h.status === "active").length;
  const trial = HOSPITALS.filter((h) => h.status === "trial").length;
  const suspended = HOSPITALS.filter((h) => h.status === "suspended").length;
  const totalPatients = HOSPITALS.reduce((s, h) => s + h.patients, 0);

  return (
    <PageShell
      title="Platform Dashboard"
      subtitle="Nova HMS — SaaS operator view across all hospital tenants"
      action={
        <Link href="/nova/nova-admin/tenants" className="px-4 py-2 bg-teal-600 text-white text-sm rounded hover:bg-teal-700 transition-colors font-medium">
          Manage tenants
        </Link>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Total tenants" value={HOSPITALS.length} />
        <KpiCard label="Active" value={active} accent />
        <KpiCard label="On trial" value={trial} />
        <KpiCard label="Total patients" value={totalPatients.toLocaleString()} sub="across all hospitals" />
      </div>

      <DataTable
        columns={["Hospital", "Region", "Plan", "Patients", "Staff", "Since", "Status", ""]}
        rows={HOSPITALS.map((h) => [
          <span className="font-medium text-slate-800">{h.name}</span>,
          h.region,
          <span className="text-xs">{h.plan}</span>,
          h.patients.toLocaleString(),
          h.staff,
          h.since,
          <StatusBadge status={h.status} />,
          <Link href="/nova/nova-admin/tenants" className="text-xs text-teal-600 hover:underline">Manage</Link>,
        ])}
      />
    </PageShell>
  );
}
