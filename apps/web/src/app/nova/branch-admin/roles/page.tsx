"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { PageShell, Card, StatusBadge } from "@/components/nova/nova-ui";
import {
  ShieldCheck,
  Plus,
  Users,
  Search,
  Filter,
  ArrowRightLeft,
  Trash2,
  Edit3,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Lock,
  ChevronRight,
  Info,
  Check,
  Shield,
  Layers,
  Activity,
  HeartPulse,
  Settings2,
} from "lucide-react";

// Standard functional permission catalog organized by clinical and administrative domains
export const PERMISSION_CATALOG = [
  {
    name: "Clinical Care & Patient EMR",
    icon: "🩺",
    color: "blue",
    description: "Doctor consultations, diagnoses, vitals, and inter-facility referrals",
    permissions: [
      { key: "clinical.notes.view", label: "View Clinical Notes", desc: "Read doctor & nursing notes, diagnoses, and visit summaries" },
      { key: "clinical.notes.create", label: "Create Clinical Notes", desc: "Write SOAP consultation notes, clinical impressions, and treatments" },
      { key: "clinical.vitals.record", label: "Record Vital Signs", desc: "Input blood pressure, pulse, SpO2, temperature, and BMI" },
      { key: "clinical.referral.create", label: "Generate Referrals", desc: "Create inter-facility and specialist clinical referral letters" },
    ],
  },
  {
    name: "Laboratory & Diagnostics",
    icon: "🔬",
    color: "purple",
    description: "Specimen intake, laboratory worklists, and certified results validation",
    permissions: [
      { key: "lab.order.create", label: "Order Lab Tests", desc: "Request hematology, biochemistry, and microbiology investigations" },
      { key: "lab.results.enter", label: "Enter Test Results", desc: "Input quantitative and qualitative laboratory specimen outcomes" },
      { key: "lab.results.approve", label: "Approve & Sign Lab Results", desc: "Formally validate and certify lab results before doctor review" },
    ],
  },
  {
    name: "Pharmacy & Medication Ledger",
    icon: "💊",
    color: "teal",
    description: "Prescription fulfillment, inventory stock levels, and batch tracking",
    permissions: [
      { key: "rx.prescribe", label: "Prescribe Medications", desc: "Authorize prescription drugs with dosage, frequency, and duration" },
      { key: "rx.dispense", label: "Dispense Medications", desc: "Fulfill prescriptions at the pharmacy counter and deduct inventory" },
      { key: "inventory.manage", label: "Manage Stock Ledger", desc: "Perform stock reconciliation, view batch numbers, and adjust counts" },
      { key: "inventory.transfer", label: "Stock Relocation & Transfers", desc: "Authorize transfers between main dispensary and satellite sub-stores" },
    ],
  },
  {
    name: "Inpatient Care & Wards",
    icon: "🛏️",
    color: "orange",
    description: "Ward admission, bed occupancy board, and bedside MAR charting",
    permissions: [
      { key: "ward.admit", label: "Inpatient Bed Admission", desc: "Admit patients to specific ward rooms, beds, and nursing teams" },
      { key: "ward.discharge", label: "Patient Discharge", desc: "Process clinical ward discharge summaries and bed clearing" },
      { key: "ward.mar.administer", label: "Medication Administration (MAR)", desc: "Mark bedside drug administration rounds as given/held/refused" },
    ],
  },
  {
    name: "Billing, Cashier & Tariffs",
    icon: "💳",
    color: "emerald",
    description: "POS payment collection, receipt issuing, CBHI claims, and pricing",
    permissions: [
      { key: "billing.view", label: "View Patient Invoices", desc: "Inspect tariff items, unbilled charges, and payment status" },
      { key: "billing.collect", label: "Cashier Collection & Receipts", desc: "Accept cash, card, telebirr, or CBHI copays and issue receipts" },
      { key: "billing.waiver.request", label: "Request Fee Waivers", desc: "Initiate indigent fee waiver requests for destitute patients" },
      { key: "billing.waiver.approve", label: "Approve Fee Waivers", desc: "Authorize full or partial discounts on hospital service charges" },
      { key: "tariff.manage", label: "Configure Service Tariffs", desc: "Set and update service and procedure pricing" },
    ],
  },
  {
    name: "Branch Administration & Security",
    icon: "🛡️",
    color: "rose",
    description: "Staff credentials, role authorizations, audit logs, and analytics",
    permissions: [
      { key: "admin.staff.manage", label: "Manage Staff Directory", desc: "Invite new staff, update licenses, and assign branch roles" },
      { key: "admin.roles.manage", label: "Manage RBAC & Permissions", desc: "Create bespoke roles, modify permission sets, and merge roles" },
      { key: "admin.audit.view", label: "View System Audit Logs", desc: "Audit user logins, security policy updates, and medical record changes" },
      { key: "admin.reports.view", label: "View Executive & Financial Reports", desc: "Access hospital revenue, census, and department performance analytics" },
    ],
  },
];

const ALL_PERMISSION_KEYS = PERMISSION_CATALOG.flatMap((g) => g.permissions.map((p) => p.key));

const EMOJI_OPTIONS = ["🛡️", "🩺", "💉", "🔬", "💊", "💳", "📋", "🛏️", "⚡", "🏢", "⚖️", "🧑‍⚕️", "🔑", "🌟"];
const COLOR_OPTIONS = [
  { id: "blue", label: "Blue", bg: "bg-blue-100 text-blue-800 border-blue-200" },
  { id: "emerald", label: "Emerald", bg: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  { id: "purple", label: "Purple", bg: "bg-purple-100 text-purple-800 border-purple-200" },
  { id: "amber", label: "Amber", bg: "bg-amber-100 text-amber-800 border-amber-200" },
  { id: "rose", label: "Rose", bg: "bg-rose-100 text-rose-800 border-rose-200" },
  { id: "teal", label: "Teal", bg: "bg-teal-100 text-teal-800 border-teal-200" },
  { id: "indigo", label: "Indigo", bg: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  { id: "cyan", label: "Cyan", bg: "bg-cyan-100 text-cyan-800 border-cyan-200" },
];

function RoleManagementContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "system" | "custom">("all");

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any | null>(null);
  const [isMergeOpen, setIsMergeOpen] = useState(() => searchParams.get("action") === "merge");
  const [mergeSourceId, setMergeSourceId] = useState<string>("");
  const [mergeTargetId, setMergeTargetId] = useState<string>("");
  const [roleToDelete, setRoleToDelete] = useState<any | null>(null);

  useEffect(() => {
    if (searchParams.get("action") === "merge") {
      setIsMergeOpen(true);
    }
  }, [searchParams]);

  // New role form state
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [newRoleIcon, setNewRoleIcon] = useState("🛡️");
  const [newRoleColor, setNewRoleColor] = useState("blue");
  const [newRolePerms, setNewRolePerms] = useState<string[]>([]);

  // TRPC Queries & Mutations
  const { data: roles = [], isLoading } = useQuery(trpc.tenant.getRolesWithStats.queryOptions());

  const createRoleMutation = useMutation(
    trpc.tenant.createRole.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.tenant.getRolesWithStats.pathFilter());
        queryClient.invalidateQueries(trpc.tenant.rolePermissions.pathFilter());
        setIsCreateOpen(false);
        resetCreateForm();
      },
    })
  );

  const updateRoleMutation = useMutation(
    trpc.tenant.updateRole.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.tenant.getRolesWithStats.pathFilter());
        queryClient.invalidateQueries(trpc.tenant.rolePermissions.pathFilter());
        setEditingRole(null);
      },
    })
  );

  const deleteRoleMutation = useMutation(
    trpc.tenant.deleteRole.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.tenant.getRolesWithStats.pathFilter());
        queryClient.invalidateQueries(trpc.tenant.rolePermissions.pathFilter());
        setRoleToDelete(null);
      },
    })
  );

  const mergeRolesMutation = useMutation(
    trpc.tenant.mergeRoles.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.tenant.getRolesWithStats.pathFilter());
        queryClient.invalidateQueries(trpc.tenant.rolePermissions.pathFilter());
        queryClient.invalidateQueries(trpc.tenant.staff.pathFilter());
        setIsMergeOpen(false);
        setMergeSourceId("");
        setMergeTargetId("");
      },
    })
  );

  const resetDefaultsMutation = useMutation(
    trpc.tenant.resetRolePermissions.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.tenant.getRolesWithStats.pathFilter());
        queryClient.invalidateQueries(trpc.tenant.rolePermissions.pathFilter());
      },
    })
  );

  const [splitSuccessMsg, setSplitSuccessMsg] = useState<string | null>(null);

  const splitRolesMutation = useMutation(
    trpc.tenant.revertOrSplitMergedRoles.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries(trpc.tenant.getRolesWithStats.pathFilter());
        queryClient.invalidateQueries(trpc.tenant.rolePermissions.pathFilter());
        queryClient.invalidateQueries(trpc.tenant.staff.pathFilter());
        setSplitSuccessMsg(data.message);
        setTimeout(() => setSplitSuccessMsg(null), 10000);
      },
    })
  );

  const resetCreateForm = () => {
    setNewRoleName("");
    setNewRoleDesc("");
    setNewRoleIcon("🛡️");
    setNewRoleColor("blue");
    setNewRolePerms([]);
  };

  // Filtered roles
  const filteredRoles = roles.filter((r) => {
    const matchesSearch =
      r.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.description.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (filterType === "system") return r.isSystem;
    if (filterType === "custom") return !r.isSystem;
    return true;
  });

  const totalMembersAssigned = roles.reduce((sum, r) => sum + r.memberCount, 0);
  const customRolesCount = roles.filter((r) => !r.isSystem).length;
  const systemRolesCount = roles.filter((r) => r.isSystem).length;

  return (
    <PageShell
      title="Dynamic Role-Based Access Control (RBAC)"
      subtitle="Define customized clinical and operational roles, configure fine-grained module privileges, and merge roles across this branch."
    >
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-teal-100 text-teal-800 border border-teal-200">
            Branch Admin Hub
          </span>
          <span className="text-xs text-slate-500">Real-time Policy Enforcement</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              if (confirm("Reset all standard system roles to default Nova HMS permission policies? Custom roles will remain unaffected.")) {
                resetDefaultsMutation.mutate({});
              }
            }}
            disabled={resetDefaultsMutation.isPending}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-1.5 transition shadow-sm"
          >
            <RotateCcw size={13} className={resetDefaultsMutation.isPending ? "animate-spin" : ""} />
            Reset System Defaults
          </button>

          <button
            onClick={() => {
              if (
                confirm(
                  "Reset merged roles back to dedicated stations? This will re-compartmentalize Triage Nurse and Ward Nurse permissions and re-route staff back to their specific clinical stations."
                )
              ) {
                splitRolesMutation.mutate({ splitGeneralNurse: true, resetPermissions: true });
              }
            }}
            disabled={splitRolesMutation.isPending}
            className="px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 flex items-center gap-1.5 transition shadow-sm"
          >
            <RotateCcw size={13} className={splitRolesMutation.isPending ? "animate-spin" : ""} />
            {splitRolesMutation.isPending ? "Re-compartmentalizing..." : "Reset Merged Roles"}
          </button>

          <button
            onClick={() => {
              setIsMergeOpen(true);
            }}
            className="px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 flex items-center gap-1.5 transition shadow-sm"
          >
            <ArrowRightLeft size={13} />
            Merge / Combine Roles
          </button>

          <button
            onClick={() => {
              resetCreateForm();
              setIsCreateOpen(true);
            }}
            className="px-3.5 py-1.5 text-xs font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 flex items-center gap-1.5 transition shadow-sm"
          >
            <Plus size={14} />
            Create Custom Role
          </button>
        </div>
      </div>

      {/* Split/Reset Roles Success Banner */}
      {splitSuccessMsg && (
        <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 rounded-xl flex items-start gap-3 text-xs text-emerald-900 dark:text-emerald-200 animate-in fade-in slide-in-from-top-2 shadow-xs">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <h5 className="font-bold text-sm">Confirmed: Roles Restored to Dedicated Stations!</h5>
            <p className="mt-0.5 leading-relaxed">{splitSuccessMsg}</p>
            <div className="mt-2 flex items-center gap-2">
              <Link href={"/nova/triage" as any} className="font-bold underline text-emerald-700 hover:text-emerald-800">
                Verify Triage Station →
              </Link>
              <span>•</span>
              <Link href={"/nova/nurse" as any} className="font-bold underline text-emerald-700 hover:text-emerald-800">
                Verify Ward Station →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Active Roles</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{roles.length}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Configured in this branch</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
            <ShieldCheck size={20} />
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Custom Branch Roles</p>
            <h3 className="text-2xl font-bold text-indigo-600 mt-1">{customRolesCount}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Bespoke facility roles</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Sparkles size={20} />
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Assigned Staff</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{totalMembersAssigned}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Users with active roles</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users size={20} />
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Core System Roles</p>
            <h3 className="text-2xl font-bold text-slate-700 mt-1">{systemRolesCount}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Protected root roles</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
            <Lock size={20} />
          </div>
        </div>
      </div>

      {/* Merged vs Specialized Roles Architecture Callout */}
      <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 via-teal-50 to-indigo-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-800 border border-amber-200/80 dark:border-slate-700 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 flex items-center justify-center font-bold text-base shrink-0 border border-amber-300">
            🔄
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              Clinical Workforce Architecture: Merged vs. Specialized Roles
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-200 text-amber-900">
                BA Notice
              </span>
            </h4>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              • <strong className="text-amber-900 dark:text-amber-300">Nurse (Merged Dual Role)</strong>: Combines OPD Triage Intake and Inpatient Ward Care for unified coverage (ideal for night shifts or solo nurses).<br />
              • <strong className="text-teal-900 dark:text-teal-300">Triage Nurse & Ward Nurse (Specialized)</strong>: Independent single-station roles to maximize patient flow during busy daytime hours.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setMergeSourceId("");
            setMergeTargetId("");
            setIsMergeOpen(true);
          }}
          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shrink-0 flex items-center gap-1.5 shadow-sm transition"
        >
          <ArrowRightLeft size={14} />
          Merge / Combine Any Roles
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search roles by name or description..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-medium text-slate-600">
          <button
            onClick={() => setFilterType("all")}
            className={`px-3 py-1.5 rounded-md transition ${filterType === "all" ? "bg-white text-slate-900 shadow-sm" : "hover:text-slate-900"}`}
          >
            All Roles ({roles.length})
          </button>
          <button
            onClick={() => setFilterType("system")}
            className={`px-3 py-1.5 rounded-md transition ${filterType === "system" ? "bg-white text-slate-900 shadow-sm" : "hover:text-slate-900"}`}
          >
            System Default ({systemRolesCount})
          </button>
          <button
            onClick={() => setFilterType("custom")}
            className={`px-3 py-1.5 rounded-md transition ${filterType === "custom" ? "bg-white text-slate-900 shadow-sm" : "hover:text-slate-900"}`}
          >
            Custom Branch ({customRolesCount})
          </button>
        </div>
      </div>

      {/* Roles Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 text-xs animate-pulse">Loading branch roles & RBAC matrix...</div>
      ) : filteredRoles.length === 0 ? (
        <div className="p-12 bg-white rounded-xl border border-dashed border-slate-300 text-center">
          <Shield size={36} className="mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-medium text-slate-700">No roles match your search</p>
          <p className="text-xs text-slate-500 mt-1">Try refining your search keyword or create a new custom role.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRoles.map((r) => {
            const permCount = r.permissions.length;
            const pct = Math.round((permCount / ALL_PERMISSION_KEYS.length) * 100);

            return (
              <div
                key={r.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-xl shadow-xs">
                        {r.icon || "🛡️"}
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-1.5 flex-wrap">
                          <span>{r.role}</span>
                          {r.role === "Nurse" && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                              <span>🔄</span> Merged (Triage + Ward)
                            </span>
                          )}
                          {r.role === "Triage Nurse" && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-300 flex items-center gap-1">
                              <span>🩺</span> Specialized: OPD Intake
                            </span>
                          )}
                          {r.role === "Ward Nurse" && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 border border-cyan-300 flex items-center gap-1">
                              <span>💉</span> Specialized: Inpatient Care
                            </span>
                          )}
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          {r.isSystem ? "Core System Role" : "Custom Branch Role"}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${
                        r.isSystem
                          ? "bg-slate-100 text-slate-600 border-slate-200"
                          : "bg-indigo-50 text-indigo-700 border-indigo-200"
                      }`}
                    >
                      {r.isSystem ? "System" : "Custom"}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-600 mt-3 line-clamp-2 min-h-[32px]">
                    {r.description || "No description provided for this role."}
                  </p>

                  {r.role === "Nurse" && (
                    <div className="mt-2.5 p-2 bg-amber-50/80 border border-amber-200 rounded-lg text-[11px] text-amber-900 flex items-center gap-1.5">
                      <Info size={12} className="text-amber-700 shrink-0" />
                      <span>Authorizes staff for both <strong>/nova/triage</strong> and <strong>/nova/nurse</strong>.</span>
                    </div>
                  )}

                  {/* Member Stats & Badges */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Users size={13} className="text-slate-400" />
                      <span className="font-medium text-slate-800">{r.memberCount}</span>
                      <span className="text-[11px] text-slate-500">
                        {r.memberCount === 1 ? "staff member" : "staff members"}
                      </span>
                    </div>

                    <span className="text-[11px] font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      {permCount} / {ALL_PERMISSION_KEYS.length} privileges ({pct}%)
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        pct > 70 ? "bg-teal-500" : pct > 35 ? "bg-blue-500" : "bg-amber-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      setEditingRole({
                        id: r.id,
                        role: r.role,
                        description: r.description,
                        icon: r.icon || "🛡️",
                        color: r.color || "blue",
                        permissions: [...r.permissions],
                        isSystem: r.isSystem,
                      });
                    }}
                    className="flex-1 px-3 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 flex items-center justify-center gap-1.5 transition"
                  >
                    <Edit3 size={12} />
                    Configure Permissions
                  </button>

                  {!r.isSystem && (
                    <>
                      <button
                        title="Merge this role into another role"
                        onClick={() => {
                          setMergeSourceId(r.id);
                          setMergeTargetId("");
                          setIsMergeOpen(true);
                        }}
                        className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 border border-slate-200 rounded-lg transition"
                      >
                        <ArrowRightLeft size={13} />
                      </button>

                      <button
                        title="Delete custom role"
                        onClick={() => setRoleToDelete(r)}
                        className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 border border-slate-200 rounded-lg transition"
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* CREATE CUSTOM ROLE MODAL */}
      {/* ======================================================== */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-sm">
                  <Plus size={16} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 text-sm">Create New Custom Role</h3>
                  <p className="text-xs text-slate-500">Define a tailored role and assign fine-grained permissions.</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-semibold p-1"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Role Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    placeholder="e.g. Senior Triage Nurse, ER Billing Specialist"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Badge Icon</label>
                  <select
                    value={newRoleIcon}
                    onChange={(e) => setNewRoleIcon(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    {EMOJI_OPTIONS.map((emoji) => (
                      <option key={emoji} value={emoji}>
                        {emoji} Icon
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Description & Role Purpose</label>
                <textarea
                  rows={2}
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  placeholder="Outline key operational duties and responsibilities for staff in this role..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              {/* Permissions Selector */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-slate-800">
                    Assign Functional Privileges ({newRolePerms.length} selected)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setNewRolePerms(ALL_PERMISSION_KEYS)}
                      className="text-[11px] text-teal-600 hover:underline"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setNewRolePerms([])}
                      className="text-[11px] text-slate-500 hover:underline"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="space-y-4 border border-slate-200 rounded-xl p-4 bg-slate-50/50 max-h-72 overflow-y-auto">
                  {PERMISSION_CATALOG.map((group) => {
                    const groupKeys = group.permissions.map((p) => p.key);
                    const allSelected = groupKeys.every((k) => newRolePerms.includes(k));

                    return (
                      <div key={group.name} className="bg-white rounded-lg border border-slate-200 p-3 shadow-xs">
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                          <div className="flex items-center gap-1.5 font-medium text-slate-800 text-xs">
                            <span>{group.icon}</span>
                            <span>{group.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (allSelected) {
                                setNewRolePerms((prev) => prev.filter((k) => !groupKeys.includes(k)));
                              } else {
                                setNewRolePerms((prev) => Array.from(new Set([...prev, ...groupKeys])));
                              }
                            }}
                            className="text-[10px] text-teal-600 hover:underline font-medium"
                          >
                            {allSelected ? "Revoke Category" : "Grant Category"}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {group.permissions.map((p) => {
                            const isChecked = newRolePerms.includes(p.key);
                            return (
                              <label
                                key={p.key}
                                className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition text-left ${
                                  isChecked
                                    ? "bg-teal-50/60 border-teal-300"
                                    : "bg-slate-50/60 border-slate-200 hover:bg-slate-100"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setNewRolePerms((prev) => [...prev, p.key]);
                                    } else {
                                      setNewRolePerms((prev) => prev.filter((k) => k !== p.key));
                                    }
                                  }}
                                  className="mt-0.5 rounded text-teal-600 focus:ring-teal-500"
                                />
                                <div>
                                  <p className="font-medium text-slate-900 text-[11px] leading-tight">{p.label}</p>
                                  <p className="text-[10px] text-slate-500 leading-tight mt-0.5">{p.desc}</p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {createRoleMutation.isError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
                  <AlertTriangle size={14} className="shrink-0" />
                  {createRoleMutation.error.message}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!newRoleName.trim() || createRoleMutation.isPending}
                onClick={() => {
                  createRoleMutation.mutate({
                    role: newRoleName.trim(),
                    description: newRoleDesc.trim(),
                    icon: newRoleIcon,
                    color: newRoleColor,
                    permissions: newRolePerms,
                  });
                }}
                className="px-4 py-2 text-xs font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {createRoleMutation.isPending ? "Creating Role..." : "Confirm & Create Role"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* EDIT ROLE & PERMISSION MATRIX MODAL */}
      {/* ======================================================== */}
      {editingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{editingRole.icon}</span>
                <div>
                  <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                    Configure Role: {editingRole.role}
                    {editingRole.isSystem && (
                      <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                        System Protected
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500">Fine-tune active capabilities and access policies.</p>
                </div>
              </div>
              <button
                onClick={() => setEditingRole(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-semibold p-1"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
              {/* Name & description for custom roles */}
              {!editingRole.isSystem && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-slate-200">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Role Title</label>
                    <input
                      type="text"
                      value={editingRole.role}
                      onChange={(e) => setEditingRole({ ...editingRole, role: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                    <input
                      type="text"
                      value={editingRole.description}
                      onChange={(e) => setEditingRole({ ...editingRole, description: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Permission Category Checklist */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-xs font-semibold text-slate-800">
                    Assigned Permissions ({editingRole.permissions.length} / {ALL_PERMISSION_KEYS.length} granted)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingRole({ ...editingRole, permissions: ALL_PERMISSION_KEYS })}
                      className="text-[11px] text-teal-600 hover:underline"
                    >
                      Grant All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setEditingRole({ ...editingRole, permissions: [] })}
                      className="text-[11px] text-slate-500 hover:underline"
                    >
                      Revoke All
                    </button>
                  </div>
                </div>

                <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                  {PERMISSION_CATALOG.map((group) => {
                    const groupKeys = group.permissions.map((p) => p.key);
                    const allSelected = groupKeys.every((k) => editingRole.permissions.includes(k));

                    return (
                      <div key={group.name} className="bg-slate-50/60 rounded-xl border border-slate-200 p-3.5">
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/80">
                          <div className="flex items-center gap-2 font-medium text-slate-800 text-xs">
                            <span className="text-base">{group.icon}</span>
                            <div>
                              <span>{group.name}</span>
                              <p className="text-[10px] text-slate-400 font-normal">{group.description}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (allSelected) {
                                setEditingRole({
                                  ...editingRole,
                                  permissions: editingRole.permissions.filter((k: string) => !groupKeys.includes(k)),
                                });
                              } else {
                                setEditingRole({
                                  ...editingRole,
                                  permissions: Array.from(new Set([...editingRole.permissions, ...groupKeys])),
                                });
                              }
                            }}
                            className="text-[10px] text-teal-700 bg-white px-2 py-1 rounded border border-slate-200 hover:bg-slate-100 font-medium"
                          >
                            {allSelected ? "Revoke Group" : "Grant Group"}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {group.permissions.map((p) => {
                            const isChecked = editingRole.permissions.includes(p.key);
                            return (
                              <label
                                key={p.key}
                                className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition text-left ${
                                  isChecked
                                    ? "bg-white border-teal-400 shadow-xs ring-1 ring-teal-400/20"
                                    : "bg-white/60 border-slate-200 hover:bg-white"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setEditingRole({
                                        ...editingRole,
                                        permissions: [...editingRole.permissions, p.key],
                                      });
                                    } else {
                                      setEditingRole({
                                        ...editingRole,
                                        permissions: editingRole.permissions.filter((k: string) => k !== p.key),
                                      });
                                    }
                                  }}
                                  className="mt-0.5 rounded text-teal-600 focus:ring-teal-500"
                                />
                                <div>
                                  <p className="font-semibold text-slate-800 text-[11px] leading-tight">{p.label}</p>
                                  <p className="text-[10px] text-slate-500 leading-tight mt-0.5">{p.desc}</p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {updateRoleMutation.isError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
                  <AlertTriangle size={14} className="shrink-0" />
                  {updateRoleMutation.error.message}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Changes apply immediately to all users assigned to this role.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRole(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={updateRoleMutation.isPending}
                  onClick={() => {
                    updateRoleMutation.mutate({
                      id: editingRole.id,
                      role: editingRole.role,
                      description: editingRole.description,
                      icon: editingRole.icon,
                      color: editingRole.color,
                      permissions: editingRole.permissions,
                    });
                  }}
                  className="px-4 py-2 text-xs font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {updateRoleMutation.isPending ? "Saving..." : "Save Policies"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MERGE / COMBINE ROLES WIZARD MODAL */}
      {/* ======================================================== */}
      {isMergeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-indigo-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                  <ArrowRightLeft size={16} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 text-sm">Merge / Consolidate Roles</h3>
                  <p className="text-xs text-slate-500">
                    Migrate staff and combine permission policies into a target role.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsMergeOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-semibold p-1"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 text-xs text-slate-700">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-start gap-2">
                <Info size={15} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">How Role Merging Works:</p>
                  <p className="text-[11px] mt-0.5">
                    1. All staff currently assigned to the <strong>Source Role</strong> will automatically be reassigned to the <strong>Target Role</strong>.<br />
                    2. The permissions of the Source Role will be added to the Target Role.<br />
                    3. The Source Role will then be safely retired and removed.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Source Role Selection */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Source Role <span className="text-red-500">*</span> (Will be retired)
                  </label>
                  <select
                    value={mergeSourceId}
                    onChange={(e) => setMergeSourceId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="">-- Select Source Role --</option>
                    {roles
                      .filter((r) => !r.isSystem && r.id !== mergeTargetId)
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.icon} {r.role} ({r.memberCount} members)
                        </option>
                      ))}
                  </select>
                  {roles.filter((r) => !r.isSystem).length === 0 && (
                    <p className="text-[10px] text-slate-400 mt-1">
                      No custom roles available to merge. System core roles cannot be retired.
                    </p>
                  )}
                </div>

                {/* Target Role Selection */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Target Role <span className="text-red-500">*</span> (Will absorb staff)
                  </label>
                  <select
                    value={mergeTargetId}
                    onChange={(e) => setMergeTargetId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="">-- Select Target Role --</option>
                    {roles
                      .filter((r) => r.id !== mergeSourceId)
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.icon} {r.role} ({r.isSystem ? "System" : "Custom"})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Live Preview Card */}
              {mergeSourceId && mergeTargetId && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <h4 className="font-semibold text-slate-800 text-xs">Consolidation Preview:</h4>
                  {(() => {
                    const src = roles.find((r) => r.id === mergeSourceId);
                    const tgt = roles.find((r) => r.id === mergeTargetId);
                    if (!src || !tgt) return null;

                    const newPermsCount = src.permissions.filter((p: string) => !tgt.permissions.includes(p)).length;

                    return (
                      <div className="text-[11px] text-slate-600 space-y-1">
                        <p>
                          • <strong>{src.memberCount} staff member(s)</strong> from{" "}
                          <span className="font-semibold text-slate-800">{src.role}</span> will be transferred to{" "}
                          <span className="font-semibold text-slate-800">{tgt.role}</span>.
                        </p>
                        <p>
                          • <strong>{newPermsCount} additional privilege(s)</strong> will be merged into{" "}
                          <span className="font-semibold text-slate-800">{tgt.role}</span>.
                        </p>
                        <p className="text-red-600">
                          • Role <strong>{src.role}</strong> will be permanently deleted after migration.
                        </p>
                      </div>
                    );
                  })()}
                </div>
              )}

              {mergeRolesMutation.isError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
                  <AlertTriangle size={14} className="shrink-0" />
                  {mergeRolesMutation.error.message}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsMergeOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!mergeSourceId || !mergeTargetId || mergeRolesMutation.isPending}
                onClick={() => {
                  if (confirm("Are you sure you want to execute this role merge? All staff will be migrated immediately.")) {
                    mergeRolesMutation.mutate({
                      sourceRoleId: mergeSourceId,
                      targetRoleId: mergeTargetId,
                    });
                  }
                }}
                className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {mergeRolesMutation.isPending ? "Merging Roles..." : "Execute Role Merge"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DELETE CONFIRMATION MODAL */}
      {/* ======================================================== */}
      {roleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-3 text-red-600">
              <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center">
                <AlertTriangle size={18} />
              </div>
              <h3 className="font-semibold text-slate-900 text-sm">Delete Role: {roleToDelete.role}</h3>
            </div>

            {roleToDelete.memberCount > 0 ? (
              <div className="space-y-3 text-xs text-slate-600">
                <p className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-amber-800">
                  <strong>Cannot Delete:</strong> There are currently{" "}
                  <strong>{roleToDelete.memberCount} active staff member(s)</strong> assigned to this role.
                </p>
                <p>
                  To protect security and ensure uninterrupted system access, please reassign those staff members or use
                  the <strong>Merge Roles</strong> tool to migrate them into another role before deleting.
                </p>
                <div className="pt-3 flex justify-end gap-2">
                  <button
                    onClick={() => setRoleToDelete(null)}
                    className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setMergeSourceId(roleToDelete.id);
                      setRoleToDelete(null);
                      setIsMergeOpen(true);
                    }}
                    className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                  >
                    Open Merge Tool
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-slate-600">
                <p>
                  Are you sure you want to permanently delete custom role <strong>{roleToDelete.role}</strong>? This action
                  cannot be undone.
                </p>

                {deleteRoleMutation.isError && (
                  <p className="text-red-600 bg-red-50 p-2 rounded border border-red-200">
                    {deleteRoleMutation.error.message}
                  </p>
                )}

                <div className="pt-3 flex justify-end gap-2">
                  <button
                    onClick={() => setRoleToDelete(null)}
                    className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={deleteRoleMutation.isPending}
                    onClick={() => deleteRoleMutation.mutate({ id: roleToDelete.id })}
                    className="px-4 py-2 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleteRoleMutation.isPending ? "Deleting..." : "Confirm Delete"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </PageShell>
  );
}

export default function RoleManagementPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-slate-400">Loading branch roles & permissions...</div>}>
      <RoleManagementContent />
    </Suspense>
  );
}
