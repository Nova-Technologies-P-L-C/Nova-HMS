"use client";
import React, { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import {
  Activity, Users, Building2, FileText, BarChart3, Settings, ClipboardList,
  Stethoscope, FlaskConical, Pill, CreditCard, ArrowLeftRight, Bed,
  Search, QrCode, Bell, User, Home, Globe, ShieldCheck, ToggleLeft, Layers, Banknote,
  Crown, Palette
} from "lucide-react";
import { useNovaRole } from "./nova-role-context";
import { useNovaTheme } from "./nova-theme-context";
import { type Role } from "@/lib/nova-mock-data";

const NAV_BY_ROLE: Record<Role, { label: string; href: string; icon: React.ReactNode }[]> = {
  "Organizational Admin": [
    { label: "Executive Cockpit", href: "/nova/org-admin", icon: <Crown size={16} /> },
    { label: "Financial & Revenue Reports", href: "/nova/org-admin/finance", icon: <Banknote size={16} /> },
    { label: "Pharmacy Capital Valuation", href: "/nova/org-admin/inventory-risk", icon: <Layers size={16} /> },
    { label: "Staff & Workforce Roster", href: "/nova/branch-admin/staff", icon: <Users size={16} /> },
    { label: "Executive Reports", href: "/nova/branch-admin/reports", icon: <BarChart3 size={16} /> },
  ],
  "Branch Admin": [
    { label: "Dashboard", href: "/nova/branch-admin", icon: <Home size={16} /> },
    { label: "Staff & Users", href: "/nova/branch-admin/staff", icon: <Users size={16} /> },
    { label: "Role Permissions (RBAC)", href: "/nova/branch-admin/roles", icon: <ShieldCheck size={16} /> },
    { label: "Service Tariffs & Pricing", href: "/nova/branch-admin/tariffs", icon: <Banknote size={16} /> },
    { label: "Reports & Analytics", href: "/nova/branch-admin/reports", icon: <BarChart3 size={16} /> },
    { label: "Audit & Security", href: "/nova/branch-admin/audit", icon: <ClipboardList size={16} /> },
    { label: "UI Appearance & Branding", href: "/nova/branch-admin/appearance", icon: <Palette size={16} /> },
    { label: "Settings", href: "/nova/branch-admin/settings", icon: <Settings size={16} /> },
  ],
  "Hospital Admin": [
    { label: "Dashboard", href: "/nova/hospital-admin", icon: <Home size={16} /> },
    { label: "Staff & Users", href: "/nova/hospital-admin/staff", icon: <Users size={16} /> },
    { label: "Role Permissions (RBAC)", href: "/nova/branch-admin/roles", icon: <ShieldCheck size={16} /> },
    { label: "Service Tariffs & Pricing", href: "/nova/hospital-admin/tariffs", icon: <Banknote size={16} /> },
    { label: "Reports & Analytics", href: "/nova/hospital-admin/reports", icon: <BarChart3 size={16} /> },
    { label: "Audit & Security", href: "/nova/hospital-admin/audit", icon: <ClipboardList size={16} /> },
    { label: "UI Appearance & Branding", href: "/nova/branch-admin/appearance", icon: <Palette size={16} /> },
    { label: "Settings", href: "/nova/hospital-admin/settings", icon: <Settings size={16} /> },
  ],
  "Receptionist": [
    { label: "Patient Registration & Kiosk", href: "/nova/reception/register", icon: <User size={16} /> },
    { label: "OPD Queue Board", href: "/nova/reception/queue", icon: <Activity size={16} /> },
    { label: "Appointments", href: "/nova/reception/appointments", icon: <ClipboardList size={16} /> },
  ],
  "Doctor": [
    { label: "My Queue", href: "/nova/doctor", icon: <Activity size={16} /> },
    { label: "Patient EMR", href: "/nova/doctor/emr", icon: <FileText size={16} /> },
    { label: "Consultation", href: "/nova/doctor/consultation", icon: <Stethoscope size={16} /> },
    { label: "Lab Order", href: "/nova/doctor/lab-order", icon: <FlaskConical size={16} /> },
    { label: "e-Prescription", href: "/nova/doctor/prescription", icon: <Pill size={16} /> },
    { label: "Referral", href: "/nova/doctor/referral", icon: <ArrowLeftRight size={16} /> },
  ],
  "Triage Nurse": [
    { label: "Triage Intake Station", href: "/nova/triage", icon: <Activity size={16} /> },
    { label: "OPD Queue Board", href: "/nova/reception/queue", icon: <ClipboardList size={16} /> },
    { label: "Rapid Vitals Entry", href: "/nova/nurse/vitals", icon: <Stethoscope size={16} /> },
  ],
  "Ward Nurse": [
    { label: "Inpatient Bed Census", href: "/nova/nurse", icon: <Bed size={16} /> },
    { label: "MAR Drug Schedule", href: "/nova/nurse/mar", icon: <Pill size={16} /> },
    { label: "Shift Nursing Notes", href: "/nova/nurse/notes", icon: <FileText size={16} /> },
    { label: "Bedside Vitals", href: "/nova/nurse/vitals", icon: <Activity size={16} /> },
  ],
  "Nurse": [
    { label: "Inpatient Beds", href: "/nova/nurse", icon: <Bed size={16} /> },
    { label: "Triage Station", href: "/nova/triage", icon: <Activity size={16} /> },
    { label: "MAR Drug Schedule", href: "/nova/nurse/mar", icon: <Pill size={16} /> },
    { label: "Nursing Notes", href: "/nova/nurse/notes", icon: <FileText size={16} /> },
  ],
  "Lab Technician": [
    { label: "Orders Queue", href: "/nova/lab", icon: <FlaskConical size={16} /> },
    { label: "Result Entry", href: "/nova/lab/result", icon: <ClipboardList size={16} /> },
  ],
  "Pharmacist": [
    { label: "Rx Queue", href: "/nova/pharmacy", icon: <Pill size={16} /> },
    { label: "Inventory Ledger", href: "/nova/pharmacy/inventory", icon: <Layers size={16} /> },
    { label: "Receive Stock", href: "/nova/pharmacy/receive", icon: <ArrowLeftRight size={16} /> },
    { label: "Requisition / RRF", href: "/nova/pharmacy/requisition", icon: <FileText size={16} /> },
    { label: "Expiry Management", href: "/nova/pharmacy/expiry", icon: <Bell size={16} /> },
    { label: "Reconciliation", href: "/nova/pharmacy/reconciliation", icon: <ClipboardList size={16} /> },
    { label: "Demand Forecast", href: "/nova/pharmacy/forecast", icon: <BarChart3 size={16} /> },
    { label: "Locations", href: "/nova/pharmacy/locations", icon: <Building2 size={16} /> },
    { label: "ROP Alerts", href: "/nova/pharmacy/rop-alerts", icon: <Activity size={16} /> },
  ],
  "Billing Officer": [
    { label: "Billing & POS Counter", href: "/nova/billing", icon: <CreditCard size={16} /> },
    { label: "CBHI Claims", href: "/nova/billing/cbhi", icon: <ShieldCheck size={16} /> },
    { label: "Fee Waivers", href: "/nova/billing/waivers", icon: <FileText size={16} /> },
    { label: "Invoices", href: "/nova/billing/invoices", icon: <ClipboardList size={16} /> },
  ],
  "Accountant": [
    { label: "Billing & POS Counter", href: "/nova/billing", icon: <CreditCard size={16} /> },
    { label: "CBHI Claims", href: "/nova/billing/cbhi", icon: <ShieldCheck size={16} /> },
    { label: "Fee Waivers", href: "/nova/billing/waivers", icon: <FileText size={16} /> },
    { label: "Invoices", href: "/nova/billing/invoices", icon: <ClipboardList size={16} /> },
  ],
  "Referral Coordinator": [
    { label: "Inbox / Outbox", href: "/nova/referral", icon: <ArrowLeftRight size={16} /> },
    { label: "Tracking", href: "/nova/referral/tracking", icon: <Activity size={16} /> },
  ],
  "Ward Manager": [
    { label: "Bed Board", href: "/nova/ward", icon: <Bed size={16} /> },
    { label: "Admissions", href: "/nova/ward/admissions", icon: <ClipboardList size={16} /> },
  ],
  "Nova Admin": [
    { label: "Platform Dashboard", href: "/nova/nova-admin", icon: <Globe size={16} /> },
    { label: "Tenant Management", href: "/nova/nova-admin/tenants", icon: <Building2 size={16} /> },
    { label: "Billing", href: "/nova/nova-admin/billing", icon: <CreditCard size={16} /> },
    { label: "Feature Flags", href: "/nova/nova-admin/flags", icon: <ToggleLeft size={16} /> },
  ],
};

const SHARED_NAV = [
  { label: "Patient Search", href: "/nova/shared/search", icon: <Search size={16} /> },
  { label: "QR Scanner", href: "/nova/shared/qr", icon: <QrCode size={16} /> },
  { label: "Notifications", href: "/nova/shared/notifications", icon: <Bell size={16} /> },
  { label: "My Profile", href: "/nova/shared/profile", icon: <User size={16} /> },
];

const PERMISSION_NAV_MAP: {
  permission: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  doctorOnly?: boolean;
}[] = [
  { permission: "clinical.notes.create", label: "Consultation", href: "/nova/doctor/consultation", icon: <Stethoscope size={16} />, doctorOnly: true },
  { permission: "clinical.notes.view", label: "Patient EMR", href: "/nova/doctor/emr", icon: <FileText size={16} />, doctorOnly: true },
  { permission: "clinical.vitals.record", label: "Vitals Entry", href: "/nova/nurse/vitals", icon: <Activity size={16} /> },
  { permission: "ward.mar.administer", label: "Nursing Notes & MAR", href: "/nova/nurse/notes", icon: <ClipboardList size={16} /> },
  { permission: "ward.admit", label: "Bed Board", href: "/nova/ward", icon: <Bed size={16} /> },
  { permission: "ward.discharge", label: "Admissions", href: "/nova/ward/admissions", icon: <ClipboardList size={16} /> },
  { permission: "lab.order.create", label: "Lab Order", href: "/nova/doctor/lab-order", icon: <FlaskConical size={16} />, doctorOnly: true },
  { permission: "lab.results.enter", label: "Lab Workstation", href: "/nova/lab/result", icon: <FlaskConical size={16} /> },
  { permission: "rx.prescribe", label: "e-Prescription", href: "/nova/doctor/prescription", icon: <Pill size={16} />, doctorOnly: true },
  { permission: "rx.dispense", label: "Rx Dispensing", href: "/nova/pharmacy", icon: <Pill size={16} /> },
  { permission: "inventory.manage", label: "Inventory Ledger", href: "/nova/pharmacy/inventory", icon: <Layers size={16} /> },
  { permission: "billing.collect", label: "POS Billing", href: "/nova/billing", icon: <CreditCard size={16} /> },
  { permission: "billing.waiver.approve", label: "Fee Waivers", href: "/nova/branch-admin/fee-waivers", icon: <FileText size={16} /> },
  { permission: "tariff.manage", label: "Service Tariffs", href: "/nova/branch-admin/tariffs", icon: <Banknote size={16} /> },
  { permission: "admin.staff.manage", label: "Staff & Roles", href: "/nova/branch-admin/staff", icon: <Users size={16} /> },
  { permission: "admin.roles.manage", label: "Role Permissions (RBAC)", href: "/nova/branch-admin/roles", icon: <ShieldCheck size={16} /> },
  { permission: "admin.reports.view", label: "Reports", href: "/nova/branch-admin/reports", icon: <BarChart3 size={16} /> },
  { permission: "admin.audit.view", label: "Audit Log", href: "/nova/branch-admin/audit", icon: <ClipboardList size={16} /> },
];

export default function NovaSidebar() {
  const pathname = usePathname();
  const { role } = useNovaRole();

  const { data: rolePermissionsList = [] } = useQuery({
    ...trpc.tenant.rolePermissions.queryOptions(),
    staleTime: 30_000,
  });

  const activeRoleRecord = rolePermissionsList.find((r) => r.role === role);

  const nav = useMemo(() => {
    let baseNav = (NAV_BY_ROLE as any)[role] ? [...(NAV_BY_ROLE as any)[role]] : [];
    const existingHrefs = new Set(baseNav.map((n: any) => n.href));
    const isAdmin = role === "Organizational Admin" || role === "Branch Admin" || role === "Hospital Admin" || role === "Nova Admin";
    const isDoctor = role === "Doctor";
    const isNurseRole = role === "Ward Nurse" || role === "Triage Nurse" || role === "Nurse";

    // For non-admin roles (clinical, pharmacy, lab, nursing, reception, or custom merged roles),
    // dynamically include any extra activities unlocked by granted permissions.
    // Administrators keep their dedicated, uncluttered executive navigation.
    if (!isAdmin && activeRoleRecord?.permissions) {
      const perms = new Set(activeRoleRecord.permissions);
      for (const item of PERMISSION_NAV_MAP) {
        // Enforce strict clinical boundaries:
        // Consultation and physician-specific clinical routes are strictly restricted to Doctors
        if (item.doctorOnly && !isDoctor) {
          continue;
        }

        // Nurses must never receive doctor encounter or consultation routes
        if (isNurseRole && item.href.startsWith("/nova/doctor/")) {
          continue;
        }

        if (perms.has(item.permission) && !existingHrefs.has(item.href)) {
          baseNav.push({
            label: item.label,
            href: item.href,
            icon: item.icon,
          });
          existingHrefs.add(item.href);
        }
      }
    }

    // Explicit safeguard: Ensure Consultation is NEVER in navigation for nurses or non-doctors
    if (!isDoctor && !isAdmin) {
      baseNav = baseNav.filter((n: any) => n.href !== "/nova/doctor/consultation");
    }

    if (baseNav.length === 0) {
      baseNav.push({ label: "Dashboard", href: "/nova/branch-admin", icon: <Home size={16} /> });
    }

    return baseNav;
  }, [role, activeRoleRecord]);

  const { theme } = useNovaTheme();
  const isWhiteSidebar = theme.sidebarTheme === "white";

  return (
    <aside
      className={`flex flex-col h-full w-56 shrink-0 transition-colors ${
        isWhiteSidebar
          ? "bg-white text-slate-800 border-r border-slate-200"
          : "text-slate-100 border-r border-slate-700/60"
      }`}
      style={{ backgroundColor: theme.sidebarBg }}
    >
      {/* Logo */}
      <div
        className={`flex items-center gap-2.5 px-4 py-4 border-b ${
          isWhiteSidebar ? "border-slate-200" : "border-slate-700/60"
        }`}
      >
        <div
          className="w-7 h-7 flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-xs"
          style={{
            backgroundColor: theme.primaryColor,
            borderRadius: `${Math.min(theme.radius, 10)}px`,
          }}
        >
          {theme.logoBadge || "N"}
        </div>
        <span
          className={`font-semibold tracking-wide truncate text-sm ${
            isWhiteSidebar ? "text-slate-900" : "text-white"
          }`}
          title={theme.hospitalName || "Nova HMS"}
        >
          {theme.hospitalName || "Nova HMS"}
        </span>
      </div>

      {/* Role badge — locked to logged-in user's role */}
      <div className="px-3 pt-3 pb-2">
        <p className={`text-[10px] uppercase tracking-wider mb-1 font-semibold ${isWhiteSidebar ? "text-slate-400" : "text-slate-500"}`}>
          Role
        </p>
        <div
          className="px-2 py-1.5 border text-xs font-semibold"
          style={{
            backgroundColor: isWhiteSidebar ? `${theme.primaryColor}15` : `${theme.primaryColor}25`,
            borderColor: `${theme.primaryColor}50`,
            color: isWhiteSidebar ? theme.primaryColor : "#e2e8f0",
            borderRadius: `${Math.min(theme.radius, 8)}px`,
          }}
        >
          {role}
        </div>
      </div>

      {/* Role Nav */}
      <nav className="flex-1 overflow-y-auto px-2 pt-1">
        {nav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href as any}
              style={
                active
                  ? {
                      backgroundColor: theme.primaryColor,
                      color: "#ffffff",
                      borderRadius: `${Math.min(theme.radius, 8)}px`,
                    }
                  : {
                      borderRadius: `${Math.min(theme.radius, 8)}px`,
                    }
              }
              className={`flex items-center gap-2.5 px-3 py-2 text-sm mb-0.5 font-medium transition-colors ${
                active
                  ? "shadow-xs"
                  : isWhiteSidebar
                  ? "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className={active ? "text-white" : isWhiteSidebar ? "text-slate-500" : "text-slate-400"}>
                {item.icon}
              </span>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}

        {/* Shared - hidden for Organizational Admin */}
        {role !== "Organizational Admin" && !pathname.startsWith("/nova/org-admin") && (
          <>
            <p className={`text-[10px] uppercase tracking-wider px-2 py-1 mt-3 font-semibold ${isWhiteSidebar ? "text-slate-400" : "text-slate-500"}`}>
              Shared
            </p>
            {SHARED_NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href as any}
                  style={
                    active
                      ? {
                          backgroundColor: theme.primaryColor,
                          color: "#ffffff",
                          borderRadius: `${Math.min(theme.radius, 8)}px`,
                        }
                      : {
                          borderRadius: `${Math.min(theme.radius, 8)}px`,
                        }
                  }
                  className={`flex items-center gap-2.5 px-3 py-2 text-sm mb-0.5 font-medium transition-colors ${
                    active
                      ? "shadow-xs"
                      : isWhiteSidebar
                      ? "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span className={active ? "text-white" : isWhiteSidebar ? "text-slate-500" : "text-slate-400"}>
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* Public pages link */}
      <div className={`px-3 py-3 border-t ${isWhiteSidebar ? "border-slate-200" : "border-slate-700/60"}`}>
        <Link
          href="/nova"
          className={`flex items-center gap-2 text-xs transition-colors ${
            isWhiteSidebar ? "text-slate-500 hover:text-slate-800" : "text-slate-400 hover:text-white"
          }`}
        >
          <Globe size={13} />
          Public / Marketing pages
        </Link>
      </div>
    </aside>
  );
}
