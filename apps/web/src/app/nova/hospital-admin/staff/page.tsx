"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { PageShell, DataTable, StatusBadge, Card, FormField, inputCls, btnPrimary, btnSecondary } from "@/components/nova/nova-ui";

const CLINICAL_ROLES = ["Doctor", "Nurse", "Receptionist", "Lab Technician", "Pharmacist", "Billing Officer", "Referral Coordinator", "Ward Manager", "Hospital Admin"];

const PERMISSIONS = [
  { label: "View clinical notes", roles: ["Doctor", "Nurse"] },
  { label: "Edit clinical notes", roles: ["Doctor"] },
  { label: "Order lab tests", roles: ["Doctor"] },
  { label: "Enter lab results", roles: ["Lab Technician"] },
  { label: "Dispense prescriptions", roles: ["Pharmacist"] },
  { label: "View billing", roles: ["Billing Officer", "Hospital Admin"] },
  { label: "Approve fee waivers", roles: ["Hospital Admin"] },
  { label: "Manage staff", roles: ["Hospital Admin"] },
  { label: "View audit log", roles: ["Hospital Admin"] },
];

export default function StaffManagementPage() {
  const [showAdd, setShowAdd] = useState(false);
  const [tab, setTab] = useState<"staff" | "permissions">("staff");

  const { data: staffList = [], isLoading } = useQuery({
    ...trpc.tenant.staff.queryOptions(),
    refetchOnMount: true,
  });

  return (
    <PageShell
      title="Staff & Role Management"
      subtitle={`${staffList.length} staff members`}
      action={<button onClick={() => setShowAdd(!showAdd)} className={btnPrimary}>+ Add staff</button>}
    >
      {showAdd && (
        <Card className="p-5 mb-5 border-teal-200">
          <h3 className="font-semibold text-slate-800 mb-4">Invite new staff member</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <FormField label="Full name"><input className={inputCls} placeholder="Dr. Abebe Kebede" /></FormField>
            <FormField label="Email"><input className={inputCls} placeholder="abebe@dmrh.gov.et" /></FormField>
            <FormField label="Role">
              <select className={inputCls}>
                {CLINICAL_ROLES.map((r) => <option key={r}>{r}</option>)}
              </select>
            </FormField>
            <FormField label="Department"><input className={inputCls} placeholder="OPD, Ward A…" /></FormField>
          </div>
          <div className="flex gap-2">
            <button className={btnPrimary}>Send invite</button>
            <button className={btnSecondary} onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
        </Card>
      )}

      <div className="flex gap-1 mb-4">
        {(["staff", "permissions"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm rounded transition-colors capitalize ${tab === t ? "bg-teal-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-teal-400"}`}>
            {t === "staff" ? "Staff list" : "Permission matrix"}
          </button>
        ))}
      </div>

      {tab === "staff" && (
        <>
          {isLoading && <p className="text-sm text-slate-400">Loading…</p>}
          <DataTable
            columns={["Name", "Email", "Role", "Status", ""]}
            rows={staffList.map((s) => [
              <span className="font-medium text-slate-800">{s.user.name}</span>,
              <span className="text-xs text-slate-500">{s.user.email}</span>,
              <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">{s.role}</span>,
              <StatusBadge status={s.status} />,
              <div className="flex gap-2">
                <button className="text-xs text-teal-600 hover:underline">Edit role</button>
              </div>,
            ])}
          />
        </>
      )}

      {tab === "permissions" && (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-slate-500 font-semibold">Permission</th>
                  {CLINICAL_ROLES.slice(0, 6).map((r) => (
                    <th key={r} className="px-3 py-3 text-slate-500 font-semibold text-center whitespace-nowrap">{r}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERMISSIONS.map((p) => (
                  <tr key={p.label} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-700">{p.label}</td>
                    {CLINICAL_ROLES.slice(0, 6).map((r) => (
                      <td key={r} className="px-3 py-2.5 text-center">
                        {p.roles.includes(r) ? <span className="text-teal-500 font-bold">✓</span> : <span className="text-slate-200">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </PageShell>
  );
}
