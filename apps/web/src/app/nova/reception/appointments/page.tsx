"use client";
// Reception — Appointment Scheduling (page 21)
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { PageShell, DataTable, StatusBadge, Card, FormField, inputCls, btnPrimary, btnSecondary } from "@/components/nova/nova-ui";

export default function AppointmentsPage() {
  const [showNew, setShowNew] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [doctor, setDoctor] = useState("");
  const [dept, setDept] = useState("OPD");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const qc = useQueryClient();
  const { data: appointments = [] } = useQuery(trpc.appointment.list.queryOptions());
  const { data: patientPage } = useQuery(trpc.patient.list.queryOptions({ page: 1, limit: 100 }));
  const { data: staff = [] } = useQuery(trpc.tenant.staff.queryOptions());
  const create = useMutation(trpc.appointment.create.mutationOptions({
    onSuccess: () => {
      setShowNew(false);
      setPatientId("");
      setDoctor("");
      setDate("");
      setTime("");
      qc.invalidateQueries({ queryKey: trpc.appointment.list.queryKey() });
    },
  }));
  const updateStatus = useMutation(trpc.appointment.updateStatus.mutationOptions({
    onSuccess: () => qc.invalidateQueries({ queryKey: trpc.appointment.list.queryKey() }),
  }));

  const patients = patientPage?.patients ?? [];
  const doctors = staff.filter((s) => s.role === "Doctor");

  return (
    <PageShell
      title="Appointment Scheduling"
      subtitle={`${appointments.length} upcoming appointments`}
      action={<button onClick={() => setShowNew(!showNew)} className={btnPrimary}>+ New appointment</button>}
    >
      {showNew && (
        <Card className="p-5 mb-5 border-teal-200">
          <h3 className="font-semibold text-slate-800 mb-4">Schedule appointment</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <FormField label="Patient">
              <select value={patientId} onChange={(e) => setPatientId(e.target.value)} className={inputCls}>
                <option value="">Select patient</option>
                {patients.map((p) => <option key={p.id} value={p.id}>{p.nameEn} — {p.healthId} {p.email ? `(${p.email})` : ""}</option>)}
              </select>
            </FormField>
            <FormField label="Doctor">
              <select value={doctor} onChange={(e) => setDoctor(e.target.value)} className={inputCls}>
                <option value="">Select doctor</option>
                {doctors.map((d) => <option key={d.user.id} value={d.user.name ?? ""}>{d.user.name}</option>)}
              </select>
            </FormField>
            <FormField label="Department"><input value={dept} onChange={(e) => setDept(e.target.value)} className={inputCls} placeholder="OPD" /></FormField>
            <FormField label="Date"><input value={date} onChange={(e) => setDate(e.target.value)} type="date" className={inputCls} /></FormField>
            <FormField label="Time"><input value={time} onChange={(e) => setTime(e.target.value)} type="time" className={inputCls} /></FormField>
            <FormField label="Notes"><input className={inputCls} placeholder="Reason for visit (optional)" /></FormField>
          </div>
          {patientId && (
            <div className="mb-4 text-xs px-3 py-2 rounded-lg bg-teal-50 border border-teal-100 text-teal-800 flex items-center gap-2">
              <span>✉️</span>
              {(() => {
                const sel = patients.find((p) => p.id === patientId);
                return sel?.email ? (
                  <span>Brevo notification email will be dispatched to <strong>{sel.email}</strong> upon confirmation.</span>
                ) : (
                  <span className="text-amber-700">Patient has no registered email. Booking will proceed without email dispatch.</span>
                );
              })()}
            </div>
          )}
          <div className="flex gap-2">
            <button disabled={!patientId || !doctor || !date || !time || create.isPending} onClick={() => create.mutate({ patientId, doctor, dept, date, time })} className={btnPrimary}>Book appointment</button>
            <button className={btnSecondary} onClick={() => setShowNew(false)}>Cancel</button>
          </div>
        </Card>
      )}

      <DataTable
        columns={["ID", "Patient", "Doctor", "Department", "Date", "Time", "Status", ""]}
        rows={appointments.map((a) => [
          <span className="font-mono text-xs">{a.id}</span>,
          <span className="font-medium">{a.patient.nameEn}</span>,
          a.doctor,
          a.dept,
          a.date,
          a.time,
          <StatusBadge status={a.status} />,
          <div className="flex gap-2">
            <button onClick={() => updateStatus.mutate({ id: a.id, status: "cancelled" })} className="text-xs text-red-500 hover:underline">Cancel</button>
          </div>,
        ])}
      />
    </PageShell>
  );
}
