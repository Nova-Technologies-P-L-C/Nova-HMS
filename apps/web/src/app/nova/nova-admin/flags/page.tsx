"use client";
// Nova Admin — Global Feature Flags / Module Toggles (page 10)
import { useState } from "react";
import { PageShell, Card } from "@/components/nova/nova-ui";

const FLAGS = [
  { key: "opd_queue", label: "OPD Queue Management", desc: "Ticket-based queue, kiosk check-in", enabled: true },
  { key: "emr", label: "Electronic Medical Records", desc: "Clinical notes, diagnoses, vitals history", enabled: true },
  { key: "lab", label: "Lab & Results", desc: "Lab order workflow and result entry", enabled: true },
  { key: "pharmacy", label: "Pharmacy & Inventory", desc: "Prescription dispensing, stock management, ROP alerts", enabled: true },
  { key: "referral", label: "Referral Management", desc: "In/out referral tracking and arrival confirmation", enabled: true },
  { key: "cbhi", label: "CBHI Claims", desc: "Community-based health insurance claim submission", enabled: true },
  { key: "ward", label: "Ward / Bed Management", desc: "Phase 2 — bed board, admissions, transfers", enabled: false },
  { key: "analytics", label: "Analytics & Reporting", desc: "Dashboards for bed occupancy, revenue, disease trends", enabled: true },
  { key: "offline_sms", label: "Offline SMS Notifications", desc: "Queue SMS notifications when device is offline", enabled: true },
  { key: "amharic_ui", label: "Amharic UI Toggle", desc: "Allow per-hospital language preference", enabled: true },
];

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState(FLAGS);

  const toggle = (key: string) =>
    setFlags((prev) => prev.map((f) => f.key === key ? { ...f, enabled: !f.enabled } : f));

  return (
    <PageShell title="Global Feature Flags" subtitle="Enable or disable modules for all tenants. Per-tenant overrides are managed in Tenant Management.">
      <Card>
        <div className="divide-y divide-slate-100">
          {flags.map((flag) => (
            <div key={flag.key} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-medium text-slate-800">{flag.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{flag.desc}</p>
              </div>
              <button
                onClick={() => toggle(flag.key)}
                className={`relative w-10 h-5 rounded-full transition-colors ${flag.enabled ? "bg-teal-500" : "bg-slate-300"}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${flag.enabled ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
          ))}
        </div>
      </Card>
    </PageShell>
  );
}
