"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { PageShell, KpiCard, Card, StatusBadge } from "@/components/nova/nova-ui";
import { AlertTriangle, ArrowRight, Banknote } from "lucide-react";

export default function HospitalAdminDashboard() {
  const { data: stats } = useQuery(trpc.tenant.dashboardStats.queryOptions());
  const { data: queue = [] } = useQuery(trpc.visit.queue.queryOptions());
  const { data: auditLogs = [] } = useQuery(trpc.tenant.auditLog.queryOptions());
  const { data: ropAlerts = [] } = useQuery(trpc.inventory.ropAlerts.queryOptions());

  const occupancyPct = stats ? Math.round((stats.occupiedBeds / Math.max(stats.beds, 1)) * 100) : 0;

  return (
    <PageShell title="Hospital Dashboard" subtitle="Debre Markos Referral Hospital">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Patients today" value={stats?.todayVisits ?? "—"} sub="OPD registrations" accent />
        <KpiCard label="Total patients" value={stats?.patients ?? "—"} />
        <KpiCard label="Bed occupancy" value={`${occupancyPct}%`} sub={`${stats?.occupiedBeds ?? 0} / ${stats?.beds ?? 0} beds`} />
        <KpiCard label="Critical stock" value={stats?.criticalStock ?? "—"} sub="items need reorder" />
      </div>

      {ropAlerts.length > 0 && (
        <div className="space-y-2 mb-6">
          {ropAlerts.slice(0, 3).map((a) => (
            <div key={a.id} className={`flex items-start gap-3 px-4 py-3 rounded-lg border text-sm ${a.status === "critical" ? "bg-red-50 border-red-200 text-red-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              {a.name} — stock {a.status} (below reorder point)
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <p className="font-medium text-slate-800 text-sm">OPD Queue</p>
            <Link href="/nova/reception/queue" className="text-xs text-teal-600 hover:underline flex items-center gap-1">View board <ArrowRight size={11} /></Link>
          </div>
          <div className="divide-y divide-slate-50">
            {queue.slice(0, 4).map((q) => (
              <div key={q.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="font-mono text-xs text-slate-500">{q.ticketNumber}</span>
                <span className="text-slate-700">{q.visit.patient.nameEn}</span>
                <StatusBadge status={q.status} />
              </div>
            ))}
            {queue.length === 0 && <p className="px-4 py-4 text-sm text-slate-400">No patients in queue</p>}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <p className="font-medium text-slate-800 text-sm">Recent activity</p>
            <Link href="/nova/hospital-admin/audit" className="text-xs text-teal-600 hover:underline flex items-center gap-1">Audit log <ArrowRight size={11} /></Link>
          </div>
          <div className="divide-y divide-slate-50">
            {auditLogs.slice(0, 4).map((a) => (
              <div key={a.id} className="px-4 py-2.5">
                <p className="text-sm text-slate-700">{a.action}</p>
                <p className="text-xs text-slate-400">{a.entity} · {new Date(a.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3 mt-6">
        <Link href={"/nova/hospital-admin/tariffs" as any} className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded hover:bg-teal-700 shadow-sm flex items-center gap-1.5">
          <Banknote size={15} /> Edit Service Tariffs & Prices
        </Link>
        <Link href="/nova/hospital-admin/staff" className="px-4 py-2 bg-white border border-slate-200 text-sm text-slate-700 rounded hover:border-teal-400">Manage staff</Link>
        <Link href="/nova/hospital-admin/reports" className="px-4 py-2 bg-white border border-slate-200 text-sm text-slate-700 rounded hover:border-teal-400">View reports</Link>
        <Link href="/nova/hospital-admin/fee-waivers" className="px-4 py-2 bg-white border border-slate-200 text-sm text-slate-700 rounded hover:border-teal-400">Fee waiver queue</Link>
        <Link href="/nova/hospital-admin/settings" className="px-4 py-2 bg-white border border-slate-200 text-sm text-slate-700 rounded hover:border-teal-400">Hospital settings</Link>
      </div>
    </PageShell>
  );
}
