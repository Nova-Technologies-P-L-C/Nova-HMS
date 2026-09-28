"use client";
// Hospital Admin — Department Management (page 13)
import { useState } from "react";
import { DEPARTMENTS } from "@/lib/nova-mock-data";
import { PageShell, DataTable, Card, FormField, inputCls, btnPrimary, btnSecondary } from "@/components/nova/nova-ui";

export default function DepartmentManagementPage() {
  const [showAdd, setShowAdd] = useState(false);

  return (
    <PageShell
      title="Department Management"
      subtitle={`${DEPARTMENTS.length} departments`}
      action={<button onClick={() => setShowAdd(!showAdd)} className={btnPrimary}>+ Add department</button>}
    >
      {showAdd && (
        <Card className="p-5 mb-5 border-teal-200">
          <h3 className="font-semibold text-slate-800 mb-4">Add department</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <FormField label="Name (English)"><input className={inputCls} placeholder="Cardiology" /></FormField>
            <FormField label="Name (Amharic)"><input className={inputCls} placeholder="ካርዲዮሎጂ" /></FormField>
            <FormField label="Department head"><input className={inputCls} placeholder="Dr. Name" /></FormField>
            <FormField label="Rooms / beds"><input type="number" className={inputCls} placeholder="4" /></FormField>
          </div>
          <div className="flex gap-2">
            <button className={btnPrimary}>Save</button>
            <button className={btnSecondary} onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
        </Card>
      )}

      <DataTable
        columns={["ID", "Department", "Amharic Name", "Head", "Staff", "Rooms", ""]}
        rows={DEPARTMENTS.map((d) => [
          <span className="font-mono text-xs text-slate-400">{d.id}</span>,
          <span className="font-medium text-slate-800">{d.name}</span>,
          <span className="text-slate-500">{d.nameAm}</span>,
          d.head,
          d.staff,
          d.rooms,
          <div className="flex gap-2">
            <button className="text-xs text-teal-600 hover:underline">Edit</button>
            <button className="text-xs text-red-500 hover:underline">Remove</button>
          </div>,
        ])}
      />
    </PageShell>
  );
}
