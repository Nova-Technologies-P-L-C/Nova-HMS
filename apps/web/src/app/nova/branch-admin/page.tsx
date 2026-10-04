"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { PageShell, KpiCard, Card, StatusBadge } from "@/components/nova/nova-ui";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  ShieldCheck,
  Users,
  Building2,
  FileText,
  BarChart3,
  Settings,
  ClipboardList,
} from "lucide-react";

export default function BranchAdminDashboard() {
  const { data: stats } = useQuery(trpc.tenant.dashboardStats.queryOptions());
  const { data: queue = [] } = useQuery(trpc.visit.queue.queryOptions());
  const { data: auditLogs = [] } = useQuery(trpc.tenant.auditLog.queryOptions());
  const { data: ropAlerts = [] } = useQuery(trpc.inventory.ropAlerts.queryOptions());
  const { data: roles = [] } = useQuery(trpc.tenant.getRolesWithStats.queryOptions());

  const occupancyPct = stats ? Math.round((stats.occupiedBeds / Math.max(stats.beds, 1)) * 100) : 0;
  const customRolesCount = roles.filter((r) => !r.isSystem).length;

  return (
    <PageShell title="Branch Admin Control Center" subtitle="Comprehensive Branch Management & Dynamic RBAC Governance">
      {/* RBAC Quick Feature Banner */}
      <div className="bg-gradient-to-r from-teal-700 via-slate-800 to-indigo-900 rounded-xl p-5 text-white mb-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-teal-400 text-teal-950 tracking-wider">
              Dynamic RBAC
            </span>
            <span className="text-xs text-slate-200">Role-Based Access Control</span>
          </div>
          <h3 className="text-lg font-bold text-white">Manage Bespoke Roles & Clinical Privileges</h3>
          <p className="text-xs text-slate-300 mt-0.5">
            Configure {roles.length} active roles ({customRolesCount} custom facility roles) with fine-grained access policies, merge roles, and manage user assignments.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={"/nova/branch-admin/roles" as any}
            className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-900 font-semibold text-xs rounded-lg transition shadow-sm flex items-center gap-1.5"
          >
            <ShieldCheck size={15} />
            Open Role Permissions Hub
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Patients today" value={stats?.todayVisits ?? "—"} sub="OPD registrations" accent />
        <KpiCard label="Total patients" value={stats?.patients ?? "—"} />
        <KpiCard label="Bed occupancy" value={`${occupancyPct}%`} sub={`${stats?.occupiedBeds ?? 0} / ${stats?.beds ?? 0} beds`} />
        <KpiCard label="Critical stock" value={stats?.criticalStock ?? "—"} sub="items need reorder" />
      </div>

      {ropAlerts.length > 0 && (
        <div className="space-y-2 mb-6">
          {ropAlerts.slice(0, 3).map((a) => (
            <div
              key={a.id}
              className={`flex items-start gap-3 px-4 py-3 rounded-lg border text-sm ${
                a.status === "critical"
                  ? "bg-red-50 border-red-200 text-red-700"
                  : "bg-amber-50 border-amber-200 text-amber-700"
              }`}
            >
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              {a.name} — stock {a.status} (below reorder point)
            </div>
          ))}
        </div>
      )}

      {/* Main Grid: OPD Queue + Audit Log */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <p className="font-medium text-slate-800 text-sm">Live OPD Queue Board</p>
            <Link href="/nova/reception/queue" className="text-xs text-teal-600 hover:underline flex items-center gap-1">
              View queue <ArrowRight size={11} />
            </Link>
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
            <p className="font-medium text-slate-800 text-sm">Branch Security & Activity Audit</p>
            <Link href={"/nova/branch-admin/audit" as any} className="text-xs text-teal-600 hover:underline flex items-center gap-1">
              Audit log <ArrowRight size={11} />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {auditLogs.slice(0, 4).map((a) => (
              <div key={a.id} className="px-4 py-2.5">
                <p className="text-sm text-slate-700">{a.action}</p>
                <p className="text-xs text-slate-400">
                  {a.entity} · {new Date(a.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
            {auditLogs.length === 0 && <p className="px-4 py-4 text-sm text-slate-400">No recent activity logged</p>}
          </div>
        </Card>
      </div>

      {/* Quick Navigation Action Grid */}
      <div className="flex flex-wrap gap-3 mt-6">
        <Link
          href={"/nova/branch-admin/roles" as any}
          className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded hover:bg-teal-700 shadow-sm flex items-center gap-1.5"
        >
          <ShieldCheck size={15} /> Role Permissions (RBAC)
        </Link>
        <Link
          href={"/nova/branch-admin/tariffs" as any}
          className="px-4 py-2 bg-white border border-slate-200 text-sm text-slate-700 rounded hover:border-teal-400 flex items-center gap-1.5"
        >
          <Banknote size={15} /> Service Tariffs & Prices
        </Link>
        <Link
          href={"/nova/branch-admin/staff" as any}
          className="px-4 py-2 bg-white border border-slate-200 text-sm text-slate-700 rounded hover:border-teal-400 flex items-center gap-1.5"
        >
          <Users size={15} /> Staff & User Directory
        </Link>
        <Link
          href={"/nova/branch-admin/reports" as any}
          className="px-4 py-2 bg-white border border-slate-200 text-sm text-slate-700 rounded hover:border-teal-400 flex items-center gap-1.5"
        >
          <BarChart3 size={15} /> Clinical & Financial Reports
        </Link>
        <Link
          href={"/nova/branch-admin/fee-waivers" as any}
          className="px-4 py-2 bg-white border border-slate-200 text-sm text-slate-700 rounded hover:border-teal-400 flex items-center gap-1.5"
        >
          <FileText size={15} /> Fee Waiver Queue
        </Link>
        <Link
          href={"/nova/branch-admin/departments" as any}
          className="px-4 py-2 bg-white border border-slate-200 text-sm text-slate-700 rounded hover:border-teal-400 flex items-center gap-1.5"
        >
          <Building2 size={15} /> Departments
        </Link>
        <Link
          href={"/nova/branch-admin/settings" as any}
          className="px-4 py-2 bg-white border border-slate-200 text-sm text-slate-700 rounded hover:border-teal-400 flex items-center gap-1.5"
        >
          <Settings size={15} /> Branch Settings
        </Link>
        <Link
          href={"/nova/branch-admin/audit" as any}
          className="px-4 py-2 bg-white border border-slate-200 text-sm text-slate-700 rounded hover:border-teal-400 flex items-center gap-1.5"
        >
          <ClipboardList size={15} /> Full Audit Trail
        </Link>
      </div>
    </PageShell>
  );
}
