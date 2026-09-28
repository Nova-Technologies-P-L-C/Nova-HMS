"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity, Users, Building2, FileText, BarChart3, Settings, ClipboardList,
  Stethoscope, FlaskConical, Pill, CreditCard, ArrowLeftRight, Bed,
  Search, QrCode, Bell, User, Home, Globe, ShieldCheck, ToggleLeft, Layers
} from "lucide-react";
import { useNovaRole } from "./nova-role-context";
import { type Role } from "@/lib/nova-mock-data";

const NAV_BY_ROLE: Record<Role, { label: string; href: string; icon: React.ReactNode }[]> = {
  "Hospital Admin": [
    { label: "Dashboard", href: "/nova/hospital-admin", icon: <Home size={16} /> },
    { label: "Staff & Roles", href: "/nova/hospital-admin/staff", icon: <Users size={16} /> },
    { label: "Departments", href: "/nova/hospital-admin/departments", icon: <Building2 size={16} /> },
    { label: "Fee Waivers", href: "/nova/hospital-admin/fee-waivers", icon: <FileText size={16} /> },
    { label: "Reports", href: "/nova/hospital-admin/reports", icon: <BarChart3 size={16} /> },
    { label: "Settings", href: "/nova/hospital-admin/settings", icon: <Settings size={16} /> },
    { label: "Audit Log", href: "/nova/hospital-admin/audit", icon: <ClipboardList size={16} /> },
  ],
  "Receptionist": [
    { label: "Patient Registration", href: "/nova/reception/register", icon: <User size={16} /> },
    { label: "Kiosk Check-in", href: "/nova/reception/kiosk", icon: <QrCode size={16} /> },
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
  "Nurse": [
    { label: "My Patients", href: "/nova/nurse", icon: <Users size={16} /> },
    { label: "Vitals Entry", href: "/nova/nurse/vitals", icon: <Activity size={16} /> },
    { label: "MAR", href: "/nova/nurse/mar", icon: <Pill size={16} /> },
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
    { label: "Billing Dashboard", href: "/nova/billing", icon: <CreditCard size={16} /> },
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
  { label: "Empty / Error states", href: "/nova/shared/empty-states", icon: <Home size={16} /> },
];

export default function NovaSidebar() {
  const pathname = usePathname();
  const { role } = useNovaRole();

  const nav = NAV_BY_ROLE[role] ?? [];

  return (
    <aside className="flex flex-col h-full w-56 shrink-0 bg-[#0f2435] text-slate-100 border-r border-slate-700">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-4 border-b border-slate-700">
        <div className="w-7 h-7 rounded bg-teal-500 flex items-center justify-center font-bold text-white text-sm">N</div>
        <span className="font-semibold text-white tracking-wide">Nova HMS</span>
      </div>

      {/* Role badge — locked to logged-in user's role */}
      <div className="px-3 pt-3 pb-2">
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Role</p>
        <div className="px-2 py-1.5 bg-teal-700/40 border border-teal-600/50 rounded text-xs text-teal-200 font-medium">
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
              className={`flex items-center gap-2.5 px-3 py-2 rounded text-sm mb-0.5 transition-colors ${
                active
                  ? "bg-teal-600 text-white"
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}

        {/* Shared */}
        <p className="text-xs text-slate-500 uppercase tracking-wider px-2 py-1 mt-3">Shared</p>
        {SHARED_NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href as any}
              className={`flex items-center gap-2.5 px-3 py-2 rounded text-sm mb-0.5 transition-colors ${
                active
                  ? "bg-teal-600 text-white"
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Public pages link */}
      <div className="px-3 py-3 border-t border-slate-700">
        <Link href="/nova" className="flex items-center gap-2 text-xs text-slate-400 hover:text-teal-400 transition-colors">
          <Globe size={13} />
          Public / Marketing pages
        </Link>
      </div>
    </aside>
  );
}
