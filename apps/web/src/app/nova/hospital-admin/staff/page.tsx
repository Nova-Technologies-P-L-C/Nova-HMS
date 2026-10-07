"use client";
import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import {
  PageShell, Card, FormField, inputCls, btnPrimary, btnSecondary, KpiCard, StatusBadge, Pagination
} from "@/components/nova/nova-ui";
import {
  Users, Shield, UserPlus, Check, X, Search, Edit2, Trash2,
  Key, Phone, Award, Building2, Mail, RefreshCw, CheckCircle2,
  AlertCircle, ChevronRight, UserCheck, ShieldCheck, Lock, Unlock,
  Stethoscope, FlaskConical, Pill, CreditCard, Bed, Activity, Sparkles,
  ToggleLeft, ToggleRight, Sliders
} from "lucide-react";

const CLINICAL_ROLES = [
  "Branch Admin",
  "Hospital Admin",
  "Doctor",
  "Triage Nurse",
  "Ward Nurse",
  "Nurse",
  "Receptionist",
  "Lab Technician",
  "Pharmacist",
  "Billing Officer",
  "Accountant",
  "Referral Coordinator",
  "Ward Manager",
] as const;

type RoleType = typeof CLINICAL_ROLES[number];

const ROLE_ICONS: Record<string, string> = {
  "Branch Admin": "🛡️",
  "Hospital Admin": "🛡️",
  "Doctor": "👨‍⚕️",
  "Triage Nurse": "🩺",
  "Ward Nurse": "💉",
  "Nurse": "👩‍⚕️",
  "Receptionist": "📋",
  "Lab Technician": "🔬",
  "Pharmacist": "💊",
  "Billing Officer": "💳",
  "Accountant": "💳",
  "Referral Coordinator": "🚑",
  "Ward Manager": "🛏️",
};

const ROLE_COLORS: Record<string, string> = {
  "Branch Admin": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Hospital Admin": "bg-red-50 text-red-700 border-red-200",
  "Doctor": "bg-teal-50 text-teal-700 border-teal-200",
  "Triage Nurse": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Ward Nurse": "bg-cyan-50 text-cyan-700 border-cyan-200",
  "Nurse": "bg-sky-50 text-sky-700 border-sky-200",
  "Receptionist": "bg-amber-50 text-amber-700 border-amber-200",
  "Lab Technician": "bg-purple-50 text-purple-700 border-purple-200",
  "Pharmacist": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Billing Officer": "bg-blue-50 text-blue-700 border-blue-200",
  "Accountant": "bg-blue-50 text-blue-700 border-blue-200",
  "Referral Coordinator": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Ward Manager": "bg-orange-50 text-orange-700 border-orange-200",
};

interface ActivityDef {
  key: string;
  name: string;
  category: string;
  description: string;
  icon: string;
}

const ALL_ACTIVITIES: ActivityDef[] = [
  // Clinical & Outpatient EMR
  { key: "clinical.notes.view", name: "View Clinical Records & History", category: "Outpatient & Clinical EMR", description: "Access patient medical histories, clinical encounters, allergies, and diagnoses", icon: "📖" },
  { key: "clinical.notes.create", name: "Create & Edit Clinical Notes", category: "Outpatient & Clinical EMR", description: "Document clinical evaluations, doctor assessments, and treatment care plans", icon: "✍️" },
  { key: "clinical.vitals.record", name: "Record Patient Vital Signs", category: "Outpatient & Clinical EMR", description: "Measure and log triage blood pressure, pulse, temperature, and SpO2", icon: "💓" },
  { key: "clinical.referral.create", name: "Manage Patient Referrals", category: "Outpatient & Clinical EMR", description: "Initiate and track inter-hospital incoming and outgoing patient referrals", icon: "🚑" },

  // Laboratory & Diagnostics
  { key: "lab.order.create", name: "Order Diagnostic Lab Tests", category: "Laboratory Diagnostics", description: "Request diagnostic investigations, blood chemistry, and microscopy panels", icon: "🧪" },
  { key: "lab.results.enter", name: "Enter Laboratory Results", category: "Laboratory Diagnostics", description: "Input diagnostic analyzer values, quantitative ranges, and interpretations", icon: "🔬" },
  { key: "lab.results.approve", name: "Validate & Authorize Lab Results", category: "Laboratory Diagnostics", description: "Sign off and release verified laboratory test findings to attending doctors", icon: "✅" },

  // Pharmacy & Medications
  { key: "rx.prescribe", name: "Prescribe Electronic Prescriptions", category: "Pharmacy & Medications", description: "Create e-prescriptions specifying dosage, route, frequency, and duration", icon: "📝" },
  { key: "rx.dispense", name: "Dispense Prescriptions to Patients", category: "Pharmacy & Medications", description: "Verify e-prescriptions, dispense medications, and deduct from inventory stock", icon: "💊" },
  { key: "inventory.manage", name: "Manage Pharmaceutical Inventory", category: "Pharmacy & Medications", description: "Adjust stock, track batch expiry dates, cycle counts, and RRF requisitions", icon: "📦" },

  // Billing, Cashier & Tariffs
  { key: "billing.view", name: "View Billing & Invoices", category: "Billing, Cashier & Finance", description: "Inspect patient invoices, itemized service charges, and financial summaries", icon: "🧾" },
  { key: "billing.collect", name: "Collect Payments & Issue Receipts", category: "Billing, Cashier & Finance", description: "Collect card room fees, cashier settlements, and generate official receipts", icon: "💵" },
  { key: "billing.waiver.request", name: "Request Patient Fee Waivers", category: "Billing, Cashier & Finance", description: "Submit social hardship or charity medical fee waiver applications", icon: "🤝" },
  { key: "billing.waiver.approve", name: "Approve or Reject Fee Waivers", category: "Billing, Cashier & Finance", description: "Authorize approval or denial of patient medical billing hardship waivers", icon: "⚖️" },
  { key: "tariff.manage", name: "Configure Service Tariffs & Prices", category: "Billing, Cashier & Finance", description: "Set and update prices for hospital procedures, lab tests, beds, and drugs", icon: "🏷️" },

  // Inpatient & Ward Care
  { key: "ward.admit", name: "Admit Patients to Ward Beds", category: "Inpatient & Ward Care", description: "Assign beds, check patients into inpatient rooms, and transfer wards", icon: "🛏️" },
  { key: "ward.discharge", name: "Discharge Inpatient Patients", category: "Inpatient & Ward Care", description: "Process clinical discharge orders and release occupied hospital beds", icon: "🚪" },
  { key: "ward.mar.administer", name: "Administer Bedside Doses (MAR)", category: "Inpatient & Ward Care", description: "Record daily bedside drug administrations and nurse shift observations", icon: "💉" },

  // Hospital Governance & Security
  { key: "admin.staff.manage", name: "Manage Personnel & Role Policies", category: "Administration & Security", description: "Invite staff, assign departments, and configure role permission switches", icon: "👥" },
  { key: "admin.audit.view", name: "Access System Audit Trails", category: "Administration & Security", description: "Inspect system security activity, user logins, and operational audit logs", icon: "🔍" },
  { key: "admin.reports.view", name: "Access Hospital Analytics & Reports", category: "Administration & Security", description: "View clinical patient volume, financial revenue, and disease statistics", icon: "📊" },
];

/** Modern Toggle Switch Component */
function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  label,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
        checked ? "bg-teal-600" : "bg-slate-300"
      } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
    >
      <span className="sr-only">{label || "Toggle"}</span>
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

/** Compact Mini Toggle Switch for Matrix Grid */
function MiniToggleSwitch({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-150 ease-in-out focus:outline-none ${
        checked ? "bg-teal-600" : "bg-slate-200"
      } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-150 ease-in-out ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export default function StaffAndRoleManagementPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"role-control" | "staff" | "matrix">("role-control");
  const [selectedRole, setSelectedRole] = useState<string>("Doctor");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Pagination for Staff Directory
  const [staffPage, setStaffPage] = useState(1);
  const [staffPageSize, setStaffPageSize] = useState(10);

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewPersonOpen, setIsViewPersonOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);

  // Add staff form
  const [addForm, setAddForm] = useState({
    name: "",
    email: "",
    role: "Doctor",
    department: "Internal Medicine",
    title: "",
    phone: "",
    licenseNumber: "",
  });

  // Edit staff form
  const [editForm, setEditForm] = useState({
    id: "",
    name: "",
    role: "Doctor",
    department: "",
    title: "",
    phone: "",
    licenseNumber: "",
    status: "active" as "active" | "suspended" | "inactive",
  });

  // Queries
  const { data: staffList = [], isLoading: staffLoading } = useQuery(
    trpc.tenant.staff.queryOptions()
  );

  const { data: rolePermissionsList = [], isLoading: permsLoading } = useQuery(
    trpc.tenant.rolePermissions.queryOptions()
  );

  const availableRoles = useMemo(() => {
    const fromDb = rolePermissionsList.map((r: any) => r.role);
    return Array.from(new Set([...CLINICAL_ROLES, ...fromDb]));
  }, [rolePermissionsList]);

  // Mutations
  const addStaffMutation = useMutation(
    trpc.tenant.addStaff.mutationOptions({
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: trpc.tenant.staff.queryKey() });
        setIsAddOpen(false);
        setAddForm({
          name: "",
          email: "",
          role: "Doctor",
          department: "Internal Medicine",
          title: "",
          phone: "",
          licenseNumber: "",
        });
        showNotification("success", "Staff member successfully added and role assigned.");
      },
      onError: (err) => showNotification("error", err.message),
    })
  );

  const updateStaffMutation = useMutation(
    trpc.tenant.updateStaff.mutationOptions({
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: trpc.tenant.staff.queryKey() });
        setIsEditOpen(false);
        showNotification("success", "Staff profile and role updated successfully.");
      },
      onError: (err) => showNotification("error", err.message),
    })
  );

  const removeStaffMutation = useMutation(
    trpc.tenant.removeStaff.mutationOptions({
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: trpc.tenant.staff.queryKey() });
        showNotification("success", "Staff assignment removed.");
      },
      onError: (err) => showNotification("error", err.message),
    })
  );

  const updateRolePermsMutation = useMutation(
    trpc.tenant.updateRolePermissions.mutationOptions({
      onSuccess: (_, vars) => {
        qc.invalidateQueries({ queryKey: trpc.tenant.rolePermissions.queryKey() });
        qc.invalidateQueries({ queryKey: trpc.tenant.staff.queryKey() });
      },
      onError: (err) => showNotification("error", err.message),
    })
  );

  const resetRolePermsMutation = useMutation(
    trpc.tenant.resetRolePermissions.mutationOptions({
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: trpc.tenant.rolePermissions.queryKey() });
        qc.invalidateQueries({ queryKey: trpc.tenant.staff.queryKey() });
        showNotification("success", "Role permissions reset to system clinical defaults.");
      },
      onError: (err) => showNotification("error", err.message),
    })
  );

  const showNotification = (type: "success" | "error", text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 3500);
  };

  // Convert role permissions into map: { [role]: Set of permKeys }
  const rolePermsMap = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    for (const rp of rolePermissionsList) {
      map[rp.role] = new Set(rp.permissions);
    }
    return map;
  }, [rolePermissionsList]);

  // Toggle single activity permission for a role
  const handleToggleActivity = (role: string, activityKey: string, newCheckedState: boolean) => {
    const currentSet = new Set(rolePermsMap[role] || []);
    if (newCheckedState) {
      currentSet.add(activityKey);
    } else {
      currentSet.delete(activityKey);
    }

    const activityObj = ALL_ACTIVITIES.find((a) => a.key === activityKey);
    updateRolePermsMutation.mutate({
      role,
      permissions: Array.from(currentSet),
    });

    showNotification(
      "success",
      `${activityObj?.name || activityKey} is now ${newCheckedState ? "ENABLED" : "DISABLED"} for ${role}`
    );
  };

  // Batch toggle all activities for a role
  const handleSetAllForRole = (role: string, enableAll: boolean) => {
    const newPerms = enableAll ? ALL_ACTIVITIES.map((a) => a.key) : [];
    updateRolePermsMutation.mutate({
      role,
      permissions: newPerms,
    });
    showNotification("success", `${enableAll ? "Enabled all" : "Disabled all"} activities for ${role}`);
  };

  // Reset single role to defaults
  const handleResetSingleRole = (role: string) => {
    resetRolePermsMutation.mutate({ role });
  };

  // Filtered staff members
  const filteredStaff = useMemo(() => {
    return staffList.filter((s: any) => {
      const matchesRole = roleFilter === "all" || s.role === roleFilter;
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.department.toLowerCase().includes(q) ||
        s.title.toLowerCase().includes(q) ||
        s.licenseNumber.toLowerCase().includes(q) ||
        s.phone.toLowerCase().includes(q);
      return matchesRole && matchesSearch;
    });
  }, [staffList, roleFilter, search]);

  // Paginated slice for current personnel page
  const paginatedStaff = useMemo(() => {
    const start = (staffPage - 1) * staffPageSize;
    return filteredStaff.slice(start, start + staffPageSize);
  }, [filteredStaff, staffPage, staffPageSize]);

  // Metrics
  const metrics = useMemo(() => {
    const total = staffList.length;
    const active = staffList.filter((s: any) => s.status === "active").length;
    const doctors = staffList.filter((s: any) => s.role === "Doctor").length;
    const nurses = staffList.filter((s: any) =>
      ["Nurse", "Triage Nurse", "Ward Nurse"].includes(s.role)
    ).length;
    const clinicalCount = staffList.filter((s: any) =>
      ["Doctor", "Nurse", "Triage Nurse", "Ward Nurse", "Lab Technician", "Pharmacist"].includes(s.role)
    ).length;
    return { total, active, doctors, nurses, clinicalCount };
  }, [staffList]);

  // Staff members assigned to the currently selected role
  const membersOfSelectedRole = useMemo(() => {
    return staffList.filter((s: any) => s.role === selectedRole);
  }, [staffList, selectedRole]);

  // Distinct categories of activities
  const activityCategories = useMemo(() => {
    return Array.from(new Set(ALL_ACTIVITIES.map((a) => a.category)));
  }, []);

  // Open edit modal
  const handleOpenEdit = (staff: any) => {
    setEditForm({
      id: staff.id,
      name: staff.name,
      role: staff.role,
      department: staff.department || "",
      title: staff.title || "",
      phone: staff.phone || "",
      licenseNumber: staff.licenseNumber || "",
      status: staff.status || "active",
    });
    setIsEditOpen(true);
  };

  // Open view modal
  const handleOpenView = (staff: any) => {
    setSelectedStaff(staff);
    setIsViewPersonOpen(true);
  };

  return (
    <PageShell
      title="Role Management & Permissions Control"
      subtitle="Configure toggle permissions for each hospital role and access comprehensive data for all personnel."
      action={
        <div className="flex items-center gap-2">
          {activeTab === "role-control" ? (
            <button
              onClick={() => handleResetSingleRole(selectedRole)}
              disabled={resetRolePermsMutation.isPending}
              className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-lg hover:border-teal-400 transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <RefreshCw size={13} className={resetRolePermsMutation.isPending ? "animate-spin" : ""} />
              Reset {selectedRole} to Defaults
            </button>
          ) : (
            <button
              onClick={() => setIsAddOpen(true)}
              className="px-4 py-2 bg-teal-600 text-white text-xs font-semibold rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <UserPlus size={15} /> Add Personnel Member
            </button>
          )}
        </div>
      }
    >
      {/* Toast Notification */}
      {statusMessage && (
        <div
          className={`mb-5 p-3 rounded-lg border text-xs flex items-center gap-2.5 animate-in fade-in ${
            statusMessage.type === "success"
              ? "bg-teal-50 border-teal-200 text-teal-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {statusMessage.type === "success" ? <CheckCircle2 size={16} className="text-teal-600 shrink-0" /> : <AlertCircle size={16} className="text-red-600 shrink-0" />}
          <span className="font-medium">{statusMessage.text}</span>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Hospital Personnel" value={metrics.total} sub="Active team members" accent />
        <KpiCard label="Clinical Staff" value={metrics.clinicalCount} sub={`${metrics.doctors} Doctors · ${metrics.nurses} Nurses`} />
        <KpiCard label="Managed Roles" value={CLINICAL_ROLES.length} sub="Roles with toggle switches" />
        <KpiCard label="System Activities" value={ALL_ACTIVITIES.length} sub="Controllable permissions" />
      </div>

      {/* View Selector Tabs */}
      <div className="flex border-b border-slate-200 mb-6 gap-2">
        <button
          onClick={() => setActiveTab("role-control")}
          className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "role-control"
              ? "border-teal-600 text-teal-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Sliders size={16} className="text-teal-600" /> Role Activity Controls (Toggle Buttons)
        </button>
        <button
          onClick={() => setActiveTab("staff")}
          className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "staff"
              ? "border-teal-600 text-teal-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Users size={16} /> Personnel & Role Directory ({staffList.length})
        </button>
        <button
          onClick={() => setActiveTab("matrix")}
          className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "matrix"
              ? "border-teal-600 text-teal-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <ShieldCheck size={16} /> Matrix Cross-Overview
        </button>

        <Link
          href={"/nova/branch-admin/roles" as any}
          className="ml-auto pb-3 px-3 text-xs font-semibold flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 hover:underline transition"
        >
          <Sparkles size={14} /> Full Dynamic RBAC Hub & Role Merger →
        </Link>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: ROLE ACTIVITY CONTROLS (TOGGLE BUTTON SWITCHES)
         ───────────────────────────────────────────────────────────── */}
      {activeTab === "role-control" && (
        <div className="space-y-6">
          {/* Role Picker Strip */}
          <div>
            <div className="text-xs font-semibold text-slate-600 mb-2.5 flex items-center justify-between">
              <span>SELECT ROLE TO CONFIGURE PERMISSIONS:</span>
              <span className="text-[11px] text-slate-400 font-normal">
                Click a role to view & toggle its allowed activities
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2">
              {availableRoles.map((role) => {
                const isSelected = selectedRole === role;
                const activeCount = rolePermsMap[role]?.size || 0;
                const totalCount = ALL_ACTIVITIES.length;
                const memberCount = staffList.filter((s: any) => s.role === role).length;

                return (
                  <button
                    key={role}
                    onClick={() => setSelectedRole(role)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "bg-teal-600 text-white border-teal-600 shadow-md ring-2 ring-teal-300"
                        : "bg-white text-slate-700 border-slate-200 hover:border-teal-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="text-lg mb-1">{ROLE_ICONS[role] ?? "🛡️"}</div>
                    <div className="font-bold text-xs truncate">{role}</div>
                    <div
                      className={`text-[10px] mt-1 font-medium ${
                        isSelected ? "text-teal-100" : "text-slate-500"
                      }`}
                    >
                      {activeCount}/{totalCount} active
                    </div>
                    <div
                      className={`text-[10px] ${
                        isSelected ? "text-teal-200" : "text-slate-400"
                      }`}
                    >
                      {memberCount} staff
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Role Control Panel */}
          <Card className="p-5 border-teal-200 dark:border-teal-800 bg-gradient-to-r from-teal-50/30 dark:from-teal-950/20 via-white dark:via-slate-900 to-white dark:to-slate-900">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{ROLE_ICONS[selectedRole] ?? "🛡️"}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">{selectedRole} Role Controls</h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                        ROLE_COLORS[selectedRole] ?? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      {rolePermsMap[selectedRole]?.size || 0} / {ALL_ACTIVITIES.length} Activities Enabled
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Toggle activities ON or OFF below. All personnel with the role <strong>{selectedRole}</strong> will instantly receive or lose access.
                  </p>
                </div>
              </div>

              {/* Quick Batch Toggle Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleSetAllForRole(selectedRole, true)}
                  className="px-3 py-1.5 bg-teal-50 text-teal-800 border border-teal-200 rounded text-xs font-semibold hover:bg-teal-100 transition-colors flex items-center gap-1"
                >
                  <Check size={13} /> Enable All
                </button>
                <button
                  onClick={() => handleSetAllForRole(selectedRole, false)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 border border-slate-200 rounded text-xs font-semibold hover:bg-slate-200 transition-colors flex items-center gap-1"
                >
                  <X size={13} /> Disable All
                </button>
              </div>
            </div>

            {/* Personnel currently holding this role */}
            <div className="pt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-500 font-medium">Assigned Personnel:</span>
              {membersOfSelectedRole.length === 0 ? (
                <span className="text-slate-400 italic">No personnel currently assigned to this role</span>
              ) : (
                membersOfSelectedRole.map((member: any) => (
                  <span
                    key={member.id}
                    onClick={() => handleOpenView(member)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 hover:border-teal-400 hover:text-teal-700 cursor-pointer shadow-2xs transition-colors"
                  >
                    <span className="font-semibold">{member.name}</span>
                    <span className="text-[10px] text-slate-400">({member.department || "General"})</span>
                  </span>
                ))
              )}
            </div>
          </Card>

          {/* Activity Categories with Toggle Switches */}
          <div className="space-y-6">
            {activityCategories.map((category) => {
              const activities = ALL_ACTIVITIES.filter((a) => a.category === category);
              const enabledInCategory = activities.filter((a) =>
                rolePermsMap[selectedRole]?.has(a.key)
              ).length;

              return (
                <Card key={category} className="overflow-hidden">
                  {/* Category Header */}
                  <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs uppercase tracking-wider text-slate-700">
                        {category}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 font-medium">
                      {enabledInCategory} of {activities.length} enabled
                    </span>
                  </div>

                  {/* Activity Rows with Toggle Buttons */}
                  <div className="divide-y divide-slate-100">
                    {activities.map((activity) => {
                      const isAllowed = !!rolePermsMap[selectedRole]?.has(activity.key);

                      return (
                        <div
                          key={activity.key}
                          className={`px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                            isAllowed ? "bg-white" : "bg-slate-50/50"
                          }`}
                        >
                          {/* Activity Details */}
                          <div className="flex items-start gap-3">
                            <span className="text-xl mt-0.5">{activity.icon}</span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-xs text-slate-800">
                                  {activity.name}
                                </span>
                                <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                  {activity.key}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5 max-w-xl">
                                {activity.description}
                              </p>
                            </div>
                          </div>

                          {/* Toggle Switch Button & Status Badge */}
                          <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                            <span
                              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border transition-all ${
                                isAllowed
                                  ? "bg-teal-50 text-teal-700 border-teal-200"
                                  : "bg-slate-100 text-slate-400 border-slate-200"
                              }`}
                            >
                              {isAllowed ? "Allowed" : "Disabled"}
                            </span>

                            <ToggleSwitch
                              checked={isAllowed}
                              onChange={(newState) =>
                                handleToggleActivity(selectedRole, activity.key, newState)
                              }
                              disabled={updateRolePermsMutation.isPending}
                              label={activity.name}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: PERSONNEL & ROLE DIRECTORY
         ───────────────────────────────────────────────────────────── */}
      {activeTab === "staff" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <Card className="p-3.5">
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="relative w-full md:w-80">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setStaffPage(1);
                  }}
                  placeholder="Search by name, email, department, badge ID…"
                  className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <span className="text-xs text-slate-500 shrink-0">Filter Role:</span>
                <select
                  value={roleFilter}
                  onChange={(e) => {
                    setRoleFilter(e.target.value);
                    setStaffPage(1);
                  }}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 focus:outline-none focus:border-teal-500"
                >
                  <option value="all">All Roles ({staffList.length})</option>
                  {availableRoles.map((r) => (
                    <option key={r} value={r}>
                      {r === "Nurse"
                        ? "Nurse (Merged: Triage + Ward)"
                        : r === "Triage Nurse"
                        ? "Triage Nurse (Specialized: OPD)"
                        : r === "Ward Nurse"
                        ? "Ward Nurse (Specialized: Inpatient)"
                        : r}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          {/* Staff Table */}
          <Card className="overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <span className="font-semibold text-xs text-slate-700">
                Personnel Directory ({filteredStaff.length} members)
              </span>
              <span className="text-[11px] text-slate-500">
                💡 Hospital Admin has complete data for each person's role, license, and privileges.
              </span>
            </div>

            {staffLoading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading personnel…</div>
            ) : filteredStaff.length === 0 ? (
              <div className="p-12 text-center">
                <Users size={36} className="mx-auto text-slate-300 mb-2" />
                <p className="font-medium text-slate-700 text-sm">No personnel found</p>
                <p className="text-xs text-slate-400 mt-1">Try clearing your search query or click "+ Add Personnel Member".</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-medium">
                    <tr>
                      <th className="px-4 py-3">Staff Member</th>
                      <th className="px-3 py-3">Assigned Role</th>
                      <th className="px-3 py-3">Department & Title</th>
                      <th className="px-3 py-3">Contact & License</th>
                      <th className="px-3 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedStaff.map((staff: any) => (
                      <tr key={staff.id} className="hover:bg-teal-50/20 transition-colors">
                        {/* Name & Email */}
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800">{staff.name}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Mail size={11} className="text-slate-400" /> {staff.email}
                          </div>
                        </td>

                        {/* Role Badge & Permissions count */}
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                                ROLE_COLORS[staff.role] ?? "bg-slate-100 text-slate-700 border-slate-200"
                              }`}
                            >
                              {ROLE_ICONS[staff.role]} {staff.role}
                            </span>
                            {staff.role === "Nurse" && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                                🔄 Merged (2-in-1)
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                            <Key size={10} className="text-teal-600" />
                            {staff.effectivePermissions?.length || 0} activities permitted
                          </div>
                        </td>

                        {/* Department & Title */}
                        <td className="px-3 py-3">
                          <div className="font-medium text-slate-700 flex items-center gap-1">
                            <Building2 size={11} className="text-slate-400" />
                            {staff.department || "General"}
                          </div>
                          {staff.title && (
                            <div className="text-[11px] text-slate-500 mt-0.5">{staff.title}</div>
                          )}
                        </td>

                        {/* Phone & License */}
                        <td className="px-3 py-3">
                          <div className="text-slate-700 flex items-center gap-1">
                            <Phone size={11} className="text-slate-400" />
                            {staff.phone || "—"}
                          </div>
                          {staff.licenseNumber && (
                            <div className="text-[10px] font-mono text-slate-500 mt-0.5 flex items-center gap-1">
                              <Award size={10} className="text-amber-500" /> {staff.licenseNumber}
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-3 py-3 text-center">
                          <StatusBadge status={staff.status} />
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenView(staff)}
                              className="px-2 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded text-[11px] font-medium"
                              title="Inspect full person role data"
                            >
                              Role Data
                            </button>
                            <button
                              onClick={() => handleOpenEdit(staff)}
                              className="px-2 py-1 bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 rounded text-[11px] font-medium"
                              title="Edit role, title, department"
                            >
                              Edit Role
                            </button>
                            {staff.role !== "Hospital Admin" && (
                              <button
                                onClick={() => {
                                  if (confirm(`Remove ${staff.name} from hospital staff?`)) {
                                    removeStaffMutation.mutate({ id: staff.id });
                                  }
                                }}
                                className="p-1 text-slate-400 hover:text-red-600 rounded"
                                title="Remove staff"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {filteredStaff.length > 0 && (
              <Pagination
                currentPage={staffPage}
                totalItems={filteredStaff.length}
                pageSize={staffPageSize}
                onPageChange={setStaffPage}
                onPageSizeChange={setStaffPageSize}
                pageSizeOptions={[10, 25, 50]}
                itemLabel="personnel"
              />
            )}
          </Card>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 3: MATRIX CROSS-OVERVIEW (WITH MINI TOGGLES)
         ───────────────────────────────────────────────────────────── */}
      {activeTab === "matrix" && (
        <Card className="overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck size={16} className="text-teal-600" /> Cross-Role Matrix (Live Toggle Buttons)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Every toggle button switch below is live. Flip any switch to grant or revoke an activity for that role.
              </p>
            </div>
            <button
              onClick={() => {
                if (confirm("Reset all role policies to system defaults?")) {
                  resetRolePermsMutation.mutate({});
                }
              }}
              className="text-xs text-teal-600 hover:underline flex items-center gap-1"
            >
              <RefreshCw size={12} /> Reset Matrix Defaults
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  <th className="px-4 py-3 text-slate-700 font-semibold w-64">
                    Hospital Activity
                  </th>
                  {availableRoles.map((role) => (
                    <th key={role} className="px-2 py-3 text-center whitespace-nowrap">
                      <div className="font-bold text-slate-800">{role}</div>
                      <div className="text-[10px] text-slate-400">
                        {rolePermsMap[role]?.size || 0} active
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activityCategories.map((category) => (
                  <React.Fragment key={category}>
                    <tr className="bg-slate-100/70 border-y border-slate-200">
                      <td
                        colSpan={availableRoles.length + 1}
                        className="px-4 py-2 font-bold text-slate-700 text-[11px] uppercase tracking-wider"
                      >
                        {category}
                      </td>
                    </tr>

                    {ALL_ACTIVITIES.filter((a) => a.category === category).map((activity) => (
                      <tr key={activity.key} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-2.5">
                          <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                            <span>{activity.icon}</span> {activity.name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {activity.key}
                          </div>
                        </td>

                        {availableRoles.map((role) => {
                          const isAllowed = !!rolePermsMap[role]?.has(activity.key);

                          return (
                            <td key={role} className="px-2 py-2.5 text-center">
                              <MiniToggleSwitch
                                checked={isAllowed}
                                onChange={(newState) =>
                                  handleToggleActivity(role, activity.key, newState)
                                }
                                disabled={updateRolePermsMutation.isPending}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ─── MODAL: ADD PERSONNEL MEMBER ─── */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <UserPlus size={18} className="text-teal-600" />
                <h3 className="font-semibold text-slate-800 text-sm">Add New Personnel & Assign Role</h3>
              </div>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Full Name">
                  <input
                    type="text"
                    value={addForm.name}
                    onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Dr. Senait Mengistu"
                    className={inputCls}
                  />
                </FormField>
                <FormField label="Email Address">
                  <input
                    type="email"
                    value={addForm.email}
                    onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="senait@dmrh.gov.et"
                    className={inputCls}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Assigned Role">
                  <select
                    value={addForm.role}
                    onChange={(e) => setAddForm((f) => ({ ...f, role: e.target.value }))}
                    className={inputCls}
                  >
                    {availableRoles.map((r) => (
                      <option key={r} value={r}>
                        {r === "Nurse"
                          ? "Nurse (Merged: Triage + Ward)"
                          : r === "Triage Nurse"
                          ? "Triage Nurse (Specialized: OPD)"
                          : r === "Ward Nurse"
                          ? "Ward Nurse (Specialized: Inpatient)"
                          : r}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Department / Unit">
                  <input
                    type="text"
                    value={addForm.department}
                    onChange={(e) => setAddForm((f) => ({ ...f, department: e.target.value }))}
                    placeholder="e.g. Emergency, Surgery, OPD"
                    className={inputCls}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Job Title / Specialty">
                  <input
                    type="text"
                    value={addForm.title}
                    onChange={(e) => setAddForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Consultant Surgeon, Triage Nurse"
                    className={inputCls}
                  />
                </FormField>
                <FormField label="Phone Number">
                  <input
                    type="text"
                    value={addForm.phone}
                    onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="0911223344"
                    className={inputCls}
                  />
                </FormField>
              </div>

              <FormField label="Medical License / Employee Badge ID">
                <input
                  type="text"
                  value={addForm.licenseNumber}
                  onChange={(e) => setAddForm((f) => ({ ...f, licenseNumber: e.target.value }))}
                  placeholder="e.g. ETH-MD-2984"
                  className={`${inputCls} font-mono`}
                />
              </FormField>

              <div className="p-3 bg-teal-50 border border-teal-100 rounded text-xs text-teal-800">
                ℹ️ This staff member will immediately inherit all permissions configured under the <strong>{addForm.role}</strong> toggle matrix.
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button onClick={() => setIsAddOpen(false)} className={btnSecondary}>
                Cancel
              </button>
              <button
                onClick={() => addStaffMutation.mutate(addForm)}
                disabled={addStaffMutation.isPending || !addForm.name || !addForm.email}
                className={btnPrimary}
              >
                {addStaffMutation.isPending ? "Registering…" : "Register & Assign Role"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: EDIT STAFF PROFILE & ROLE ─── */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Edit2 size={18} className="text-teal-600" />
                <h3 className="font-semibold text-slate-800 text-sm">Edit Role & Personnel Details</h3>
              </div>
              <button onClick={() => setIsEditOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Full Name">
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                    className={inputCls}
                  />
                </FormField>

                <FormField label="Assigned Role">
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                    className={inputCls}
                  >
                    {availableRoles.map((r) => (
                      <option key={r} value={r}>
                        {r === "Nurse"
                          ? "Nurse (Merged: Triage + Ward)"
                          : r === "Triage Nurse"
                          ? "Triage Nurse (Specialized: OPD)"
                          : r === "Ward Nurse"
                          ? "Ward Nurse (Specialized: Inpatient)"
                          : r}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Department / Unit">
                  <input
                    type="text"
                    value={editForm.department}
                    onChange={(e) => setEditForm((f) => ({ ...f, department: e.target.value }))}
                    className={inputCls}
                  />
                </FormField>

                <FormField label="Job Title / Specialty">
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                    className={inputCls}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Phone Number">
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                    className={inputCls}
                  />
                </FormField>

                <FormField label="Account Access Status">
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as any }))}
                    className={inputCls}
                  >
                    <option value="active">Active (Access Allowed)</option>
                    <option value="suspended">Suspended (Access Revoked)</option>
                    <option value="inactive">Inactive / On Leave</option>
                  </select>
                </FormField>
              </div>

              <FormField label="Medical License / Employee Badge ID">
                <input
                  type="text"
                  value={editForm.licenseNumber}
                  onChange={(e) => setEditForm((f) => ({ ...f, licenseNumber: e.target.value }))}
                  className={`${inputCls} font-mono`}
                />
              </FormField>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button onClick={() => setIsEditOpen(false)} className={btnSecondary}>
                Cancel
              </button>
              <button
                onClick={() => updateStaffMutation.mutate(editForm)}
                disabled={updateStaffMutation.isPending}
                className={btnPrimary}
              >
                {updateStaffMutation.isPending ? "Saving Changes…" : "Save Role & Profile"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: VIEW PERSON ROLE DATA & EFFECTIVE PERMISSIONS ─── */}
      {isViewPersonOpen && selectedStaff && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <UserCheck size={18} className="text-teal-600" />
                <h3 className="font-semibold text-slate-800 text-sm">Personnel Profile & Role Permissions</h3>
              </div>
              <button onClick={() => setIsViewPersonOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Profile Card Header */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-base font-bold text-slate-800">{selectedStaff.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{selectedStaff.email}</div>
                  <div className="text-xs text-teal-700 font-medium mt-1">
                    {selectedStaff.title || "Clinical Staff"} · {selectedStaff.department || "General Hospital"}
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${
                      ROLE_COLORS[selectedStaff.role] ?? "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {ROLE_ICONS[selectedStaff.role]} {selectedStaff.role}
                  </span>
                  <div className="mt-1">
                    <StatusBadge status={selectedStaff.status} />
                  </div>
                </div>
              </div>

              {/* Data Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white border border-slate-200 rounded-lg">
                  <div className="text-slate-400 text-[10px] uppercase font-semibold">Phone Contact</div>
                  <div className="font-medium text-slate-700 mt-1">{selectedStaff.phone || "Not recorded"}</div>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-lg">
                  <div className="text-slate-400 text-[10px] uppercase font-semibold">Medical License / Badge ID</div>
                  <div className="font-medium font-mono text-slate-700 mt-1">
                    {selectedStaff.licenseNumber || "Not recorded"}
                  </div>
                </div>
              </div>

              {/* Effective Permissions Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-xs text-slate-800 flex items-center gap-1.5">
                    <Key size={14} className="text-teal-600" /> Active Role Privileges ({selectedStaff.effectivePermissions?.length || 0})
                  </span>
                  <span className="text-[11px] text-slate-400">Inherited from {selectedStaff.role} policy</span>
                </div>

                <div className="border border-slate-200 rounded-lg max-h-56 overflow-y-auto divide-y divide-slate-100">
                  {ALL_ACTIVITIES.map((activity) => {
                    const isGranted = (selectedStaff.effectivePermissions || []).includes(activity.key);
                    return (
                      <div
                        key={activity.key}
                        className={`p-2.5 text-xs flex items-center justify-between ${
                          isGranted ? "bg-white" : "bg-slate-50/60 opacity-50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{activity.icon}</span>
                          <div>
                            <div className="font-medium text-slate-800">{activity.name}</div>
                            <div className="text-[10px] text-slate-400">{activity.description}</div>
                          </div>
                        </div>
                        <div className="shrink-0 ml-3">
                          {isGranted ? (
                            <span className="px-2 py-0.5 bg-teal-100 text-teal-800 rounded font-medium text-[10px] flex items-center gap-1">
                              <Check size={11} /> Allowed
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-slate-200 text-slate-500 rounded font-medium text-[10px]">
                              Denied
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => {
                  setIsViewPersonOpen(false);
                  handleOpenEdit(selectedStaff);
                }}
                className="text-xs text-teal-700 font-semibold hover:underline flex items-center gap-1"
              >
                <Edit2 size={13} /> Edit this person's role or department →
              </button>
              <button onClick={() => setIsViewPersonOpen(false)} className={btnSecondary}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
