"use client";
// Nova Admin — Tenant Management (page 8)
import { useState } from "react";
import { HOSPITALS } from "@/lib/nova-mock-data";
import { PageShell, DataTable, StatusBadge, Card, FormField, inputCls, btnPrimary, btnSecondary, btnDanger } from "@/components/nova/nova-ui";

export default function TenantManagement() {
  const [selected, setSelected] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const tenant = HOSPITALS.find((h) => h.id === selected);

  return (
    <PageShell
      title="Tenant Management"
      subtitle="Add, configure, or suspend hospital workspaces"
      action={
        <button onClick={() => setShowAdd(true)} className={btnPrimary}>+ Add hospital</button>
      }
    >
      {showAdd && (
        <Card className="p-5 mb-6 border-teal-200">
          <h3 className="font-semibold text-slate-800 mb-4">Add new hospital tenant</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <FormField label="Hospital name">
              <input className={inputCls} placeholder="Jimma General Hospital" />
            </FormField>
            <FormField label="Region">
              <select className={inputCls}><option>Amhara</option><option>Oromia</option><option>Addis Ababa</option></select>
            </FormField>
            <FormField label="Plan">
              <select className={inputCls}><option>Basic OPD</option><option>Full Clinical</option><option>Enterprise Multi-Facility</option></select>
            </FormField>
            <FormField label="Admin email">
              <input className={inputCls} placeholder="admin@hospital.gov.et" />
            </FormField>
          </div>
          <div className="flex gap-2">
            <button className={btnPrimary}>Create workspace</button>
            <button className={btnSecondary} onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
        </Card>
      )}

      <DataTable
        columns={["Hospital", "Region", "Plan", "Patients", "Staff", "Status", "Actions"]}
        rows={HOSPITALS.map((h) => [
          <button onClick={() => setSelected(h.id === selected ? null : h.id)} className="font-medium text-teal-700 hover:underline text-left">{h.name}</button>,
          h.region,
          <span className="text-xs">{h.plan}</span>,
          h.patients.toLocaleString(),
          h.staff,
          <StatusBadge status={h.status} />,
          <div className="flex gap-2">
            <button className="text-xs text-teal-600 hover:underline">Edit</button>
            {h.status !== "suspended"
              ? <button className="text-xs text-red-500 hover:underline">Suspend</button>
              : <button className="text-xs text-emerald-600 hover:underline">Reactivate</button>
            }
          </div>,
        ])}
      />

      {tenant && (
        <Card className="mt-6 p-5">
          <h3 className="font-semibold text-slate-800 mb-3">{tenant.name} — Details</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div><p className="text-xs text-slate-500 mb-0.5">Region</p><p>{tenant.region}</p></div>
            <div><p className="text-xs text-slate-500 mb-0.5">Plan</p><p>{tenant.plan}</p></div>
            <div><p className="text-xs text-slate-500 mb-0.5">Status</p><StatusBadge status={tenant.status} /></div>
            <div><p className="text-xs text-slate-500 mb-0.5">Patients</p><p>{tenant.patients.toLocaleString()}</p></div>
            <div><p className="text-xs text-slate-500 mb-0.5">Staff</p><p>{tenant.staff}</p></div>
            <div><p className="text-xs text-slate-500 mb-0.5">Member since</p><p>{tenant.since}</p></div>
          </div>
          <div className="flex gap-2 mt-4">
            <button className={btnSecondary}>View usage</button>
            <button className={btnDanger}>Suspend workspace</button>
          </div>
        </Card>
      )}
    </PageShell>
  );
}
