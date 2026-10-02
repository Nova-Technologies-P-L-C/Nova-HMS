"use client";

// =============================================================================
// Nova HMS — Role-Based Navigation Sidebar
// =============================================================================
//
// The sidebar is the primary navigation component for all authenticated
// hospital staff. It dynamically renders a different set of navigation links
// depending on the logged-in user's role.
//
// Design principles:
//   - Each role only sees the modules relevant to their workflow
//     (principle of least privilege for UI surface area)
//   - Active link is highlighted with the teal brand colour
//   - A shared "Shared" section at the bottom gives all roles access to
//     cross-cutting tools: patient search, QR scanner, notifications, profile
//
// Role → Navigation mapping (NAV_BY_ROLE):
//   Each key maps a Role string to an array of nav items, each with:
//     label — Display text shown next to the icon
//     href  — Next.js route path (type-checked via `as any` for dynamic paths)
//     icon  — Lucide icon component at 16px
//
// Visual design:
//   Background: #0f2435 (deep navy — professional medical/government aesthetic)
//   Active link: teal-600 fill
//   Inactive:    slate-300 text with slate-700 hover
//   Logo badge:  teal-500 rounded square with "N"
//
// Role badge:
//   Displayed below the logo — reminds the user which role they are acting under.
//   Important in hospitals where the same person may have different roles on
//   different shifts (e.g. a doctor who also acts as duty administrator).
//
// Ethiopian hospital role context:
//   "Hospital Admin"        — Department head / facility manager
//   "Receptionist"          — OPD front desk / card room staff
//   "Doctor"                — Consulting physician
//   "Nurse"                 — Triage & ward nurse
//   "Lab Technician"        — Laboratory staff
//   "Pharmacist"            — Pharmacy dispensary staff
//   "Billing Officer"       — Cashier / accounts department
//   "Referral Coordinator"  — Referral desk officer
//   "Ward Manager"          — Ward/inpatient unit manager
//   "Nova Admin"            — Platform super-admin (Nova Technologies staff)
// =============================================================================

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity, Users, Building2, FileText, BarChart3, Settings, ClipboardList,
  Stethoscope, FlaskConical, Pill, CreditCard, ArrowLeftRight, Bed,
  Search, QrCode, Bell, User, Home, Globe, ShieldCheck, ToggleLeft, Layers, Banknote
} from "lucide-react";
import { useNovaRole } from "./nova-role-context";
import { type Role } from "@/lib/nova-mock-data";

// ─── Role → Navigation Map ────────────────────────────────────────────────────
// Each role gets a curated list of navigation items relevant to their workflow.
// This map is the single place to add, remove, or reorder navigation items per role.
// Adding a new module: create the route page, then add its entry here.
const NAV_BY_ROLE: Record<Role, { label: string; href: string; icon: React.ReactNode }[]> = {

  // Hospital Admin — facility management, pricing, staff, reports, audit trail
  "Hospital Admin": [
    { label: "Dashboard",              href: "/nova/hospital-admin",              icon: <Home size={16} /> },
    { label: "Service Tariffs & Pricing", href: "/nova/hospital-admin/tariffs",   icon: <Banknote size={16} /> }, // Fee schedule management
    { label: "Staff & Roles",          href: "/nova/hospital-admin/staff",        icon: <Users size={16} /> },
    { label: "Departments",            href: "/nova/hospital-admin/departments",  icon: <Building2 size={16} /> },
    { label: "Fee Waivers",            href: "/nova/hospital-admin/fee-waivers",  icon: <FileText size={16} /> }, // Approve/reject waiver requests
    { label: "Reports",                href: "/nova/hospital-admin/reports",      icon: <BarChart3 size={16} /> },
    { label: "Settings",               href: "/nova/hospital-admin/settings",     icon: <Settings size={16} /> },
    { label: "Audit Log",              href: "/nova/hospital-admin/audit",        icon: <ClipboardList size={16} /> }, // Compliance & governance
  ],

  // Receptionist — patient registration, OPD queue, kiosk check-in, appointments
  // This is the highest-traffic role — reception staff use these constantly
  "Receptionist": [
    { label: "Patient Registration",   href: "/nova/reception/register",          icon: <User size={16} /> },     // New patient card
    { label: "Kiosk Check-in",         href: "/nova/reception/kiosk",             icon: <QrCode size={16} /> },   // QR code / health ID self check-in
    { label: "OPD Queue Board",        href: "/nova/reception/queue",             icon: <Activity size={16} /> }, // Live queue display
    { label: "Appointments",           href: "/nova/reception/appointments",      icon: <ClipboardList size={16} /> },
  ],

  // Doctor — patient queue, EMR, consultation, lab orders, prescriptions, referrals
  "Doctor": [
    { label: "My Queue",               href: "/nova/doctor",                      icon: <Activity size={16} /> }, // Today's patients waiting for this doctor
    { label: "Patient EMR",            href: "/nova/doctor/emr",                  icon: <FileText size={16} /> }, // Electronic Medical Record lookup
    { label: "Consultation",           href: "/nova/doctor/consultation",         icon: <Stethoscope size={16} /> }, // SOAP note + diagnosis entry
    { label: "Lab Order",              href: "/nova/doctor/lab-order",            icon: <FlaskConical size={16} /> },
    { label: "e-Prescription",         href: "/nova/doctor/prescription",         icon: <Pill size={16} /> },
    { label: "Referral",               href: "/nova/doctor/referral",             icon: <ArrowLeftRight size={16} /> },
  ],

  // Nurse — patient list, vitals entry, medication administration record (MAR), notes
  "Nurse": [
    { label: "My Patients",            href: "/nova/nurse",                       icon: <Users size={16} /> },
    { label: "Vitals Entry",           href: "/nova/nurse/vitals",                icon: <Activity size={16} /> }, // BP, temp, SpO2, weight, height
    { label: "MAR",                    href: "/nova/nurse/mar",                   icon: <Pill size={16} /> },     // Medication Administration Record
    { label: "Nursing Notes",          href: "/nova/nurse/notes",                 icon: <FileText size={16} /> },
  ],

  // Lab Technician — pending orders queue, result entry
  "Lab Technician": [
    { label: "Orders Queue",           href: "/nova/lab",                         icon: <FlaskConical size={16} /> }, // Pending lab tests to process
    { label: "Result Entry",           href: "/nova/lab/result",                  icon: <ClipboardList size={16} /> },
  ],

  // Pharmacist — prescription queue, inventory, stock management, requisitions
  // Pharmacy has the most menu items — it is a full supply chain management module
  "Pharmacist": [
    { label: "Rx Queue",               href: "/nova/pharmacy",                    icon: <Pill size={16} /> },           // Pending prescriptions to dispense
    { label: "Inventory Ledger",       href: "/nova/pharmacy/inventory",          icon: <Layers size={16} /> },         // Full drug stock list
    { label: "Receive Stock",          href: "/nova/pharmacy/receive",            icon: <ArrowLeftRight size={16} /> }, // Goods receipt from supplier
    { label: "Requisition / RRF",      href: "/nova/pharmacy/requisition",        icon: <FileText size={16} /> },       // PFSA Requisition & Report Form
    { label: "Expiry Management",      href: "/nova/pharmacy/expiry",             icon: <Bell size={16} /> },           // Drugs expiring within 90 days
    { label: "Reconciliation",         href: "/nova/pharmacy/reconciliation",     icon: <ClipboardList size={16} /> },  // Cycle count / variance report
    { label: "Demand Forecast",        href: "/nova/pharmacy/forecast",           icon: <BarChart3 size={16} /> },      // AMC-based reorder forecasting
    { label: "Locations",              href: "/nova/pharmacy/locations",          icon: <Building2 size={16} /> },      // Pharmacy store locations management
    { label: "ROP Alerts",             href: "/nova/pharmacy/rop-alerts",         icon: <Activity size={16} /> },       // Items at or below reorder point
  ],

  // Billing Officer (Cashier) — invoicing, CBHI claims, fee waivers
  "Billing Officer": [
    { label: "Billing Dashboard",      href: "/nova/billing",                     icon: <CreditCard size={16} /> },
    { label: "CBHI Claims",            href: "/nova/billing/cbhi",                icon: <ShieldCheck size={16} /> }, // Community-Based Health Insurance
    { label: "Fee Waivers",            href: "/nova/billing/waivers",             icon: <FileText size={16} /> },    // Request/view waivers for indigent patients
    { label: "Invoices",               href: "/nova/billing/invoices",            icon: <ClipboardList size={16} /> },
  ],

  // Referral Coordinator — manage outgoing and incoming patient referrals
  "Referral Coordinator": [
    { label: "Inbox / Outbox",         href: "/nova/referral",                    icon: <ArrowLeftRight size={16} /> }, // All referrals in/out
    { label: "Tracking",               href: "/nova/referral/tracking",           icon: <Activity size={16} /> },       // Status tracking (pending, in-transit, arrived, lost)
  ],

  // Ward Manager — bed board, admissions management
  "Ward Manager": [
    { label: "Bed Board",              href: "/nova/ward",                        icon: <Bed size={16} /> },         // Visual grid of all beds and occupancy
    { label: "Admissions",             href: "/nova/ward/admissions",             icon: <ClipboardList size={16} /> },
  ],

  // Nova Admin — platform-level super-admin (Nova Technologies internal)
  // Has access to all tenants — used for support, onboarding, and platform management
  "Nova Admin": [
    { label: "Platform Dashboard",     href: "/nova/nova-admin",                  icon: <Globe size={16} /> },
    { label: "Tenant Management",      href: "/nova/nova-admin/tenants",          icon: <Building2 size={16} /> }, // All subscribed hospitals
    { label: "Billing",                href: "/nova/nova-admin/billing",          icon: <CreditCard size={16} /> },
    { label: "Feature Flags",          href: "/nova/nova-admin/flags",            icon: <ToggleLeft size={16} /> }, // Per-tenant module toggles
  ],
};

// ─── Shared Navigation ────────────────────────────────────────────────────────
// Cross-cutting tools available to ALL roles regardless of their primary workflow.
// Placed at the bottom of the sidebar under a "Shared" section divider.
const SHARED_NAV = [
  { label: "Patient Search",     href: "/nova/shared/search",        icon: <Search size={16} /> },   // Search by name, healthId, phone
  { label: "QR Scanner",         href: "/nova/shared/qr",            icon: <QrCode size={16} /> },   // Scan patient card QR code
  { label: "Notifications",      href: "/nova/shared/notifications",  icon: <Bell size={16} /> },    // In-app alerts (lab results, referrals, billing)
  { label: "My Profile",         href: "/nova/shared/profile",        icon: <User size={16} /> },
  { label: "Empty / Error states", href: "/nova/shared/empty-states", icon: <Home size={16} /> },   // Dev utility — view empty/error UI states
];

// ─── Sidebar Component ────────────────────────────────────────────────────────
export default function NovaSidebar() {
  // Current URL path — used to compute the active link highlight
  const pathname = usePathname();

  // Read the current user's role from the role context (populated from localStorage after login)
  const { role } = useNovaRole();

  // Resolve the navigation items for this role.
  // Falls back to empty array if the role is unrecognised (defensive guard).
  const nav = NAV_BY_ROLE[role] ?? [];

  return (
    <aside className="flex flex-col h-full w-56 shrink-0 bg-[#0f2435] text-slate-100 border-r border-slate-700">

      {/* ── Logo / Brand ──────────────────────────────────────────────────────
          Fixed header with the Nova HMS logo mark and wordmark.
          The "N" badge uses teal-500 — consistent with the primary brand colour.
          In production this could be replaced with the hospital's own logo mark. */}
      <div className="flex items-center gap-2 px-4 py-4 border-b border-slate-700">
        <div className="w-7 h-7 rounded bg-teal-500 flex items-center justify-center font-bold text-white text-sm">N</div>
        <span className="font-semibold text-white tracking-wide">Nova HMS</span>
      </div>

      {/* ── Role Badge ────────────────────────────────────────────────────────
          Displays the user's current role in a subtle teal badge.
          Helps staff confirm which role they are operating under —
          important when a user can hold multiple roles across hospitals. */}
      <div className="px-3 pt-3 pb-2">
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Role</p>
        <div className="px-2 py-1.5 bg-teal-700/40 border border-teal-600/50 rounded text-xs text-teal-200 font-medium">
          {role}
        </div>
      </div>

      {/* ── Role Navigation ───────────────────────────────────────────────────
          Scrollable nav list — the `overflow-y-auto` allows long role nav lists
          (e.g. Pharmacist with 9 items) to scroll without overflowing the sidebar.
          Active state: teal-600 fill + white text
          Inactive state: slate-300 text + slate-700 hover background */}
      <nav className="flex-1 overflow-y-auto px-2 pt-1">
        {nav.map((item) => {
          // Mark a link as active if the current path exactly matches or is a
          // sub-route of the item's href (e.g. /nova/doctor/consultation is
          // active for the "Consultation" item with href /nova/doctor/consultation)
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href as any} // `as any` needed for typed Next.js route paths
              className={`flex items-center gap-2.5 px-3 py-2 rounded text-sm mb-0.5 transition-colors ${
                active
                  ? "bg-teal-600 text-white"                       // Active: teal fill
                  : "text-slate-300 hover:bg-slate-700 hover:text-white" // Inactive: subtle hover
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}

        {/* ── Shared Section Divider ──────────────────────────────────────────
            "SHARED" label acts as a visual separator between role-specific
            nav and cross-cutting tools available to all roles. */}
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

      {/* ── Footer: Public Pages Link ─────────────────────────────────────────
          Allows staff to navigate to the public marketing pages without logging out.
          Useful for sharing the pricing page or documentation with management. */}
      <div className="px-3 py-3 border-t border-slate-700">
        <Link
          href="/nova"
          className="flex items-center gap-2 text-xs text-slate-400 hover:text-teal-400 transition-colors"
        >
          <Globe size={13} />
          Public / Marketing pages
        </Link>
      </div>
    </aside>
  );
}
