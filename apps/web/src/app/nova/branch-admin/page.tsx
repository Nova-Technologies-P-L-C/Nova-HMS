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
  Layers,
  ArrowRightLeft,
  Info,
  CheckCircle2,
  Sparkles,
  Stethoscope,
  Bed,
} from "lucide-react";

export default function BranchAdminDashboard() {
  const { data: stats } = useQuery(trpc.tenant.dashboardStats.queryOptions());
  const { data: queue = [] } = useQuery(trpc.visit.queue.queryOptions());
  const { data: auditLogs = [] } = useQuery(trpc.tenant.auditLog.queryOptions());
  const { data: ropAlerts = [] } = useQuery(trpc.inventory.ropAlerts.queryOptions());
  const { data: roles = [] } = useQuery(trpc.tenant.getRolesWithStats.queryOptions());

  const occupancyPct = stats ? Math.round((stats.occupiedBeds / Math.max(stats.beds, 1)) * 100) : 0;
  const customRolesCount = roles.filter((r) => !r.isSystem).length;

  // Key Clinical Roles: Merged vs Specialized Divisions
  const mergedNurseRole = roles.find((r) => r.role === "Nurse");
  const triageRole = roles.find((r) => r.role === "Triage Nurse");
  const wardRole = roles.find((r) => r.role === "Ward Nurse");
  const customMergedRoles = roles.filter(
    (r) => !r.isSystem && (r.role.toLowerCase().includes("merge") || r.description.toLowerCase().includes("merge"))
  );

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

      {/* Clinical Role Architecture & Merged Role Governance Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden mb-6">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 tracking-wider">
                Workforce Architecture
              </span>
              <span className="text-xs text-slate-500">Clinical Duty Division vs. Merged Roles</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers size={18} className="text-indigo-600 dark:text-indigo-400" />
              Clinical Role Structure & Merged Duty Coverage
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Review how your facility deploys nursing personnel. Assign staff to dedicated stations or use the Merged 2-in-1 Nurse role for multi-station coverage.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={"/nova/branch-admin/roles" as any}
              className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg hover:border-teal-500 transition shadow-xs flex items-center gap-1.5"
            >
              <ShieldCheck size={14} className="text-teal-600" />
              Roles & Permissions Hub
            </Link>
            <Link
              href={"/nova/branch-admin/roles?action=merge" as any}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition shadow-xs flex items-center gap-1.5"
            >
              <ArrowRightLeft size={14} />
              Merge Roles Tool
            </Link>
          </div>
        </div>

        {/* 3-Column Comparison Grid: Merged Nurse vs Triage Nurse vs Ward Nurse */}
        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Merged Dual Role */}
          <div className="rounded-xl border-2 border-amber-300/80 dark:border-amber-700/60 bg-amber-50/40 dark:bg-amber-950/20 p-4.5 flex flex-col justify-between relative shadow-xs">
            <div className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-full bg-amber-500 text-white font-bold text-[10px] tracking-wide shadow-xs flex items-center gap-1">
              <span>🔄</span> Merged Dual Role (2-in-1)
            </div>

            <div>
              <div className="flex items-center gap-2.5 mb-2 mt-1">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 border border-amber-300 text-xl flex items-center justify-center shrink-0">
                  💉🔄🩺
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    Nurse (Merged Role)
                  </h4>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 font-semibold">
                    Dual Responsibility: Triage + Ward
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 mb-3 leading-relaxed">
                All-in-one clinical nursing role covering both front-door outpatient triage intake and admitted inpatient ward bedside care.
              </p>

              {/* Station Capabilities */}
              <div className="space-y-1.5 pt-2 border-t border-amber-200/60 dark:border-amber-800/40 text-xs">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                  <CheckCircle2 size={13} className="text-amber-600 shrink-0" />
                  <span><strong>OPD Triage Intake Station</strong> (/nova/triage)</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                  <CheckCircle2 size={13} className="text-amber-600 shrink-0" />
                  <span><strong>Inpatient Bed Census & MAR</strong> (/nova/nurse)</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                  <CheckCircle2 size={13} className="text-amber-600 shrink-0" />
                  <span>Vital signs, nursing notes, MAR rounds</span>
                </div>
              </div>

              {/* Staffing Guidance */}
              <div className="mt-3 p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/60 border border-amber-200 dark:border-amber-800/40 text-[11px] text-slate-600 dark:text-slate-400">
                <strong className="text-amber-900 dark:text-amber-200">When to Deploy:</strong> Small clinic branches, night shifts, and solo duty coverage where one nurse oversees intake and beds.
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-amber-200/60 dark:border-amber-800/40 flex items-center justify-between">
              <div className="text-xs">
                <span className="text-slate-500">Assigned: </span>
                <strong className="text-slate-800 dark:text-slate-200 font-bold">
                  {mergedNurseRole?.memberCount ?? 0} staff
                </strong>
                {mergedNurseRole && mergedNurseRole.members.length > 0 && (
                  <span className="text-[10px] text-slate-500 block truncate max-w-[140px]">
                    ({mergedNurseRole.members.map((m) => m.name).join(", ")})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <Link
                  href={"/nova/triage" as any}
                  className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded text-[11px] font-semibold hover:border-amber-400"
                  title="Preview Triage Station"
                >
                  Triage ↗
                </Link>
                <Link
                  href={"/nova/nurse" as any}
                  className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded text-[11px] font-semibold hover:border-amber-400"
                  title="Preview Ward Station"
                >
                  Ward ↗
                </Link>
              </div>
            </div>
          </div>

          {/* Card 2: Specialized Triage Nurse */}
          <div className="rounded-xl border border-teal-200 dark:border-teal-800/60 bg-teal-50/20 dark:bg-teal-950/10 p-4.5 flex flex-col justify-between relative shadow-xs">
            <div className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-full bg-teal-600 text-white font-bold text-[10px] tracking-wide shadow-xs flex items-center gap-1">
              <span>🩺</span> Specialized Division
            </div>

            <div>
              <div className="flex items-center gap-2.5 mb-2 mt-1">
                <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/40 border border-teal-300 text-xl flex items-center justify-center shrink-0">
                  🩺
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    Triage Nurse
                  </h4>
                  <p className="text-[11px] text-teal-800 dark:text-teal-300 font-semibold">
                    Front-Door Outpatient Intake
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 mb-3 leading-relaxed">
                Dedicated station specialist for rapid vitals recording, MoH/SATS 3-tier acuity stratification, and routing to doctor consultation queues.
              </p>

              {/* Station Capabilities */}
              <div className="space-y-1.5 pt-2 border-t border-teal-200/60 dark:border-teal-800/40 text-xs">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                  <CheckCircle2 size={13} className="text-teal-600 shrink-0" />
                  <span><strong>Dedicated Triage Station</strong> (/nova/triage)</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                  <CheckCircle2 size={13} className="text-teal-600 shrink-0" />
                  <span><strong>OPD Waiting Queue Board</strong> (/nova/queue)</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <span className="text-[11px] text-slate-400">⛔ No inpatient ward bed or MAR rights</span>
                </div>
              </div>

              {/* Staffing Guidance */}
              <div className="mt-3 p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/60 border border-teal-200 dark:border-teal-800/40 text-[11px] text-slate-600 dark:text-slate-400">
                <strong className="text-teal-900 dark:text-teal-200">When to Deploy:</strong> Peak daytime OPD hours (8:00 AM - 5:00 PM) to eliminate front-door check-in queues.
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-teal-200/60 dark:border-teal-800/40 flex items-center justify-between">
              <div className="text-xs">
                <span className="text-slate-500">Assigned: </span>
                <strong className="text-slate-800 dark:text-slate-200 font-bold">
                  {triageRole?.memberCount ?? 0} staff
                </strong>
                {triageRole && triageRole.members.length > 0 && (
                  <span className="text-[10px] text-slate-500 block truncate max-w-[140px]">
                    ({triageRole.members.map((m) => m.name).join(", ")})
                  </span>
                )}
              </div>
              <Link
                href={"/nova/triage" as any}
                className="px-2.5 py-1 bg-teal-600 text-white rounded text-[11px] font-semibold hover:bg-teal-700 flex items-center gap-1"
              >
                <span>Open Station</span>
                <span>→</span>
              </Link>
            </div>
          </div>

          {/* Card 3: Specialized Ward Nurse */}
          <div className="rounded-xl border border-cyan-200 dark:border-cyan-800/60 bg-cyan-50/20 dark:bg-cyan-950/10 p-4.5 flex flex-col justify-between relative shadow-xs">
            <div className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-full bg-cyan-600 text-white font-bold text-[10px] tracking-wide shadow-xs flex items-center gap-1">
              <span>💉</span> Specialized Division
            </div>

            <div>
              <div className="flex items-center gap-2.5 mb-2 mt-1">
                <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-900/40 border border-cyan-300 text-xl flex items-center justify-center shrink-0">
                  💉
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    Ward Nurse
                  </h4>
                  <p className="text-[11px] text-cyan-800 dark:text-cyan-300 font-semibold">
                    Inpatient Bedside & MAR
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 mb-3 leading-relaxed">
                Dedicated ward specialist for admitted patients, scheduled Medication Administration Record (MAR) rounds, and shift handovers.
              </p>

              {/* Station Capabilities */}
              <div className="space-y-1.5 pt-2 border-t border-cyan-200/60 dark:border-cyan-800/40 text-xs">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                  <CheckCircle2 size={13} className="text-cyan-600 shrink-0" />
                  <span><strong>Inpatient Bed Census</strong> (/nova/nurse)</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                  <CheckCircle2 size={13} className="text-cyan-600 shrink-0" />
                  <span><strong>MAR Medication Schedule</strong> (/nova/nurse/mar)</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                  <CheckCircle2 size={13} className="text-cyan-600 shrink-0" />
                  <span><strong>Nursing Shift Handover Notes</strong> (/nova/nurse/notes)</span>
                </div>
              </div>

              {/* Staffing Guidance */}
              <div className="mt-3 p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/60 border border-cyan-200 dark:border-cyan-800/40 text-[11px] text-slate-600 dark:text-slate-400">
                <strong className="text-cyan-900 dark:text-cyan-200">When to Deploy:</strong> Admitted wards (General Ward, Maternity, ICU) to maintain continuous bedside protocols.
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-cyan-200/60 dark:border-cyan-800/40 flex items-center justify-between">
              <div className="text-xs">
                <span className="text-slate-500">Assigned: </span>
                <strong className="text-slate-800 dark:text-slate-200 font-bold">
                  {wardRole?.memberCount ?? 0} staff
                </strong>
                {wardRole && wardRole.members.length > 0 && (
                  <span className="text-[10px] text-slate-500 block truncate max-w-[140px]">
                    ({wardRole.members.map((m) => m.name).join(", ")})
                  </span>
                )}
              </div>
              <Link
                href={"/nova/nurse" as any}
                className="px-2.5 py-1 bg-cyan-600 text-white rounded text-[11px] font-semibold hover:bg-cyan-700 flex items-center gap-1"
              >
                <span>Open Station</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Administrator Guidance Callout */}
        <div className="mx-5 mb-5 p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
          <div className="flex items-start gap-2.5">
            <div className="p-1 rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400 shrink-0 mt-0.5">
              <Info size={15} />
            </div>
            <div>
              <strong className="text-slate-800 dark:text-slate-200">Branch Administrator Decision Rule:</strong> Use <strong>Triage Nurse</strong> and <strong>Ward Nurse</strong> when your branch has sufficient staff to maintain dedicated stations. Use the <strong>Nurse (Merged)</strong> role for single-nurse shifts, night coverage, or weekend duty rotations.
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={"/nova/branch-admin/staff" as any}
              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg text-xs transition shadow-xs"
            >
              Assign Staff Roles →
            </Link>
          </div>
        </div>
      </div>

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
