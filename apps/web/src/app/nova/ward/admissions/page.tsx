"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { PageShell, Card, FormField, inputCls, btnPrimary, btnSecondary, StatusBadge } from "@/components/nova/nova-ui";
import { CheckCircle, Bed } from "lucide-react";

export default function AdmissionsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"admit" | "active" | "discharge">("active");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedBedId, setSelectedBedId] = useState("");
  const [selectedAdmissionId, setSelectedAdmissionId] = useState("");
  const [dischargeCondition, setDischargeCondition] = useState("Improved");
  const [admitSuccess, setAdmitSuccess] = useState(false);

  const { data: beds = [] } = useQuery({ ...trpc.ward.beds.queryOptions(), refetchOnMount: true });
  const { data: admissions = [] } = useQuery({ ...trpc.ward.admissions.queryOptions(), refetchOnMount: true });
  const { data: queue = [] } = useQuery(trpc.visit.queue.queryOptions());

  const availableBeds = beds.filter((b) => b.status === "available");
  const queuePatients = queue.filter((q) => q.status !== "done");

  const admit = useMutation(trpc.ward.admit.mutationOptions({
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: trpc.ward.beds.queryKey() });
      qc.invalidateQueries({ queryKey: trpc.ward.admissions.queryKey() });
      setAdmitSuccess(true);
      setSelectedPatientId(""); setSelectedBedId("");
    },
  }));

  const discharge = useMutation(trpc.ward.discharge.mutationOptions({
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: trpc.ward.beds.queryKey() });
      qc.invalidateQueries({ queryKey: trpc.ward.admissions.queryKey() });
      setSelectedAdmissionId("");
    },
  }));

  return (
    <PageShell title="Admissions & Discharges">
      <div className="flex gap-1 mb-5">
        {(["active", "admit", "discharge"] as const).map((t) => (
          <button key={t} onClick={() => { setTab(t); setAdmitSuccess(false); }}
            className={`px-4 py-1.5 text-sm rounded transition-colors ${tab === t ? "bg-teal-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-teal-400"}`}>
            {t === "active" ? `Active admissions (${admissions.length})` : t === "admit" ? "Admit patient" : "Discharge patient"}
          </button>
        ))}
      </div>

      {/* Active admissions */}
      {tab === "active" && (
        <div className="space-y-3">
          {admissions.length === 0 && (
            <Card className="p-12 text-center">
              <Bed size={32} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No active admissions.</p>
            </Card>
          )}
          {admissions.map((a) => (
            <Card key={a.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-center w-14">
                  <p className="text-xs text-slate-400">{a.bed.ward}</p>
                  <p className="font-bold text-slate-700">Bed {a.bed.room}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{a.patient.nameEn}</p>
                  <p className="text-xs text-slate-500">{a.patient.healthId} · Admitted {new Date(a.admittedAt).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status="occupied" />
                <button
                  onClick={() => { setSelectedAdmissionId(a.id); setTab("discharge"); }}
                  className="text-xs px-3 py-1.5 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 border border-slate-200"
                >
                  Discharge →
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Admit patient */}
      {tab === "admit" && (
        <Card className="p-5 max-w-xl">
          {admitSuccess ? (
            <div className="text-center py-6">
              <CheckCircle size={40} className="text-teal-500 mx-auto mb-3" />
              <p className="font-semibold text-slate-800">Patient admitted successfully</p>
              <button onClick={() => { setAdmitSuccess(false); setTab("active"); }} className={`mt-4 ${btnPrimary}`}>View admissions</button>
            </div>
          ) : (
            <>
              <h3 className="font-semibold text-slate-800 mb-4">New admission</h3>
              <div className="space-y-3">
                <FormField label="Patient (from OPD queue)">
                  <select className={inputCls} value={selectedPatientId} onChange={(e) => setSelectedPatientId(e.target.value)}>
                    <option value="">Select patient…</option>
                    {queuePatients.map((q) => (
                      <option key={q.visitId} value={q.visit.patientId}>
                        {q.visit.patient.nameEn} — {q.visit.patient.healthId} ({q.ticketNumber})
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Available bed">
                  <select className={inputCls} value={selectedBedId} onChange={(e) => setSelectedBedId(e.target.value)}>
                    <option value="">Select bed…</option>
                    {availableBeds.map((b) => (
                      <option key={b.id} value={b.id}>{b.ward} — Bed {b.room}</option>
                    ))}
                  </select>
                </FormField>
              </div>
              {admit.error && <p className="text-sm text-red-600 mt-2">{admit.error.message}</p>}
              <div className="flex gap-2 mt-4">
                <button
                  className={btnPrimary}
                  disabled={!selectedPatientId || !selectedBedId || admit.isPending}
                  onClick={() => admit.mutate({ patientId: selectedPatientId, bedId: selectedBedId })}
                >
                  {admit.isPending ? "Admitting…" : "Admit patient"}
                </button>
                <button className={btnSecondary} onClick={() => setTab("active")}>Cancel</button>
              </div>
            </>
          )}
        </Card>
      )}

      {/* Discharge patient */}
      {tab === "discharge" && (
        <Card className="p-5 max-w-xl">
          <h3 className="font-semibold text-slate-800 mb-4">Discharge patient</h3>
          <div className="space-y-3">
            <FormField label="Patient">
              <select className={inputCls} value={selectedAdmissionId} onChange={(e) => setSelectedAdmissionId(e.target.value)}>
                <option value="">Select admission…</option>
                {admissions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.patient.nameEn} — {a.bed.ward} Bed {a.bed.room}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Discharge condition">
              <select className={inputCls} value={dischargeCondition} onChange={(e) => setDischargeCondition(e.target.value)}>
                {["Improved", "Recovered", "Against medical advice", "Transferred", "Deceased"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </FormField>
          </div>
          {discharge.error && <p className="text-sm text-red-600 mt-2">{discharge.error.message}</p>}
          <div className="flex gap-2 mt-4">
            <button
              className={btnPrimary}
              disabled={!selectedAdmissionId || discharge.isPending}
              onClick={() => discharge.mutate({ admissionId: selectedAdmissionId })}
            >
              {discharge.isPending ? "Discharging…" : "Discharge & free bed"}
            </button>
            <button className={btnSecondary} onClick={() => setTab("active")}>Cancel</button>
          </div>
        </Card>
      )}
    </PageShell>
  );
}
