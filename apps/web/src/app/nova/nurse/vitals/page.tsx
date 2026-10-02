"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { trpc, queryClient } from "@/utils/trpc";
import { PageShell, Card, FormField, inputCls, btnPrimary, btnSecondary, StatusBadge } from "@/components/nova/nova-ui";
import { CheckCircle, AlertTriangle } from "lucide-react";

function VitalsContent() {
  const router = useRouter();
  const params = useSearchParams();
  const visitIdParam = params.get("visitId") ?? "";

  const { data: queue = [], refetch: refetchQueue } = useQuery({
    ...trpc.visit.queue.queryOptions(),
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
  const [selectedVisitId, setSelectedVisitId] = useState(visitIdParam);

  // Only auto-select if visitId was passed explicitly in URL
  const activeTicket = queue.find((q) => q.visitId === selectedVisitId);
  const visitId = selectedVisitId;

  const waitingPatients = queue.filter((q) => q.status === "waiting" || q.status === "urgent");

  const { data: visit } = useQuery({
    ...trpc.visit.get.queryOptions({ visitId }),
    enabled: !!visitId,
  });

  const [vitals, setVitals] = useState({ bpSystolic: "130", bpDiastolic: "85", heartRate: "88", temperature: "37.2", spo2: "97", weight: "72", height: "175" });
  const [urgency, setUrgency] = useState<"normal" | "urgent">("normal");
  const [saved, setSaved] = useState(false);

  const recordVitals = useMutation(trpc.visit.recordVitals.mutationOptions());
  const updateStatus = useMutation({
    ...trpc.visit.updateTicketStatus.mutationOptions(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: trpc.visit.queue.queryKey() }),
  });

  const handleSave = async () => {
    if (!visitId || !activeTicket) return;
    await recordVitals.mutateAsync({
      visitId,
      bpSystolic: Number(vitals.bpSystolic),
      bpDiastolic: Number(vitals.bpDiastolic),
      heartRate: Number(vitals.heartRate),
      temperature: Number(vitals.temperature),
      spo2: Number(vitals.spo2),
      weight: Number(vitals.weight),
      height: Number(vitals.height),
    });
    await updateStatus.mutateAsync({
      ticketId: activeTicket.id,
      status: urgency === "urgent" ? "urgent" : "waiting",
    });
    setSaved(true);
  };

  const isLoading = recordVitals.isPending || updateStatus.isPending;

  if (saved && activeTicket) {
    return (
      <PageShell title="Vitals Entry">
        <Card className="p-10 text-center max-w-md mx-auto">
          <CheckCircle size={48} className="text-teal-500 mx-auto mb-4" />
          <h2 className="font-bold text-slate-800 text-lg mb-1">Vitals recorded</h2>
          <p className="text-slate-600 font-medium mb-1">{visit?.patient?.nameEn}</p>
          <p className="text-sm text-slate-500 mb-2">Ticket: <strong>{activeTicket.ticketNumber}</strong></p>
          {urgency === "urgent" && (
            <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2">
              <AlertTriangle size={14} /> Marked as URGENT — patient prioritised
            </div>
          )}
          <p className="text-xs text-slate-400 mb-6">Patient is ready for doctor consultation.</p>
          <div className="flex gap-2 justify-center">
            <button onClick={() => router.push("/nova/doctor")} className={btnPrimary}>Notify doctor →</button>
            <button onClick={() => { setSaved(false); setSelectedVisitId(""); }} className={btnSecondary}>Next patient</button>
          </div>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell title="Nurse Triage — Vitals Entry" subtitle="Step 2 of patient journey">
      <div className="flex items-center gap-2 mb-5 text-xs text-slate-500">
        <span className="px-2 py-1 bg-slate-200 rounded">1 Register</span>
        <span className="text-slate-300">→</span>
        <span className="px-2 py-1 bg-slate-200 rounded">2 Queue</span>
        <span className="text-slate-300">→</span>
        <span className="px-2 py-1 bg-teal-600 text-white rounded font-medium">3 Triage</span>
        <span className="text-slate-300">→</span>
        <span className="px-2 py-1 bg-slate-100 rounded">4 Doctor</span>
        <span className="text-slate-300">→</span>
        <span className="px-2 py-1 bg-slate-100 rounded">5 Treatment</span>
      </div>

      {/* Always show selector panel + currently selected patient at top */}
      <Card className="p-4 mb-5 border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-slate-700">Select patient to triage</p>
          <button onClick={() => refetchQueue()} className="text-xs text-teal-600 hover:underline">↻ Refresh queue</button>
        </div>
        {waitingPatients.length === 0 ? (
          <p className="text-sm text-slate-400">No patients waiting in queue right now.</p>
        ) : (
          <div className="space-y-2">
            {waitingPatients.map((q) => (
              <button
                key={q.id}
                onClick={() => setSelectedVisitId(q.visitId)}
                className={`w-full text-left px-3 py-2 rounded border text-sm flex items-center justify-between transition-colors ${
                  selectedVisitId === q.visitId
                    ? "border-teal-500 bg-teal-50"
                    : "border-slate-200 hover:border-teal-400 bg-white"
                }`}
              >
                <span>
                  <strong className="font-mono text-teal-700">{q.ticketNumber}</strong>
                  <span className="ml-2 text-slate-700">{q.visit.patient.nameEn}</span>
                  <span className="ml-2 text-xs text-slate-400">{q.visit.patient.healthId}</span>
                </span>
                <StatusBadge status={q.status} />
              </button>
            ))}
          </div>
        )}
      </Card>

      {!visitId && (
        <p className="text-sm text-slate-400 text-center py-8">← Select a patient above to record vitals</p>
      )}

      {visitId && visit && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="md:col-span-2 space-y-5">
            <Card className="p-4 flex items-center gap-4 bg-slate-50">
              <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-700 font-bold text-sm flex items-center justify-center shrink-0">
                {visit.patient.nameEn.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-800">{visit.patient.nameEn}</p>
                <p className="text-xs text-slate-500">{visit.patient.healthId} · {visit.patient.sex === "M" ? "Male" : "Female"} · DOB {visit.patient.dob}</p>
              </div>
              {activeTicket && <span className="font-mono font-bold text-teal-700">{activeTicket.ticketNumber}</span>}
            </Card>

            <Card className="p-5">
              <h3 className="font-semibold text-slate-800 mb-4">Vital signs</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="BP Systolic (mmHg)">
                  <input type="number" className={inputCls} value={vitals.bpSystolic} onChange={(e) => setVitals((v) => ({ ...v, bpSystolic: e.target.value }))} />
                </FormField>
                <FormField label="BP Diastolic (mmHg)">
                  <input type="number" className={inputCls} value={vitals.bpDiastolic} onChange={(e) => setVitals((v) => ({ ...v, bpDiastolic: e.target.value }))} />
                </FormField>
                <FormField label="Heart rate (bpm)">
                  <input type="number" className={inputCls} value={vitals.heartRate} onChange={(e) => setVitals((v) => ({ ...v, heartRate: e.target.value }))} />
                </FormField>
                <FormField label="Temperature (°C)">
                  <input type="number" step="0.1" className={inputCls} value={vitals.temperature} onChange={(e) => setVitals((v) => ({ ...v, temperature: e.target.value }))} />
                </FormField>
                <FormField label="SpO₂ (%)">
                  <input type="number" className={inputCls} value={vitals.spo2} onChange={(e) => setVitals((v) => ({ ...v, spo2: e.target.value }))} />
                </FormField>
                <FormField label="Weight (kg)">
                  <input type="number" step="0.1" className={inputCls} value={vitals.weight} onChange={(e) => setVitals((v) => ({ ...v, weight: e.target.value }))} />
                </FormField>
                <FormField label="Height (cm)">
                  <input type="number" className={inputCls} value={vitals.height} onChange={(e) => setVitals((v) => ({ ...v, height: e.target.value }))} />
                </FormField>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold text-slate-800 mb-3">Triage classification</h3>
              <div className="flex gap-3">
                <button onClick={() => setUrgency("normal")} className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${urgency === "normal" ? "bg-teal-600 text-white border-teal-600" : "bg-white text-slate-700 border-slate-200 hover:border-teal-400"}`}>
                  ✓ Normal — join queue
                </button>
                <button onClick={() => setUrgency("urgent")} className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${urgency === "urgent" ? "bg-red-600 text-white border-red-600" : "bg-white text-red-600 border-red-200 hover:bg-red-50"}`}>
                  ⚠ Urgent — prioritise
                </button>
              </div>
            </Card>

            <div className="flex gap-2">
              <button onClick={handleSave} disabled={isLoading} className={`${btnPrimary} ${isLoading ? "opacity-60" : ""}`}>
                {isLoading ? "Saving…" : "Save vitals & update queue"}
              </button>
              <button className={btnSecondary}>Cancel</button>
            </div>
          </div>

          <div>
            {visit.vitals.length > 0 && (
              <Card className="p-4">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Previous vitals</p>
                <div className="space-y-3">
                  {visit.vitals.slice(0, 3).map((v) => (
                    <div key={v.id} className="text-xs border-b border-slate-100 pb-2 last:border-0">
                      <p className="font-medium text-slate-600 mb-1">{new Date(v.recordedAt).toLocaleDateString()}</p>
                      <div className="grid grid-cols-2 gap-1 text-slate-500">
                        {v.bpSystolic && <span>BP: {v.bpSystolic}/{v.bpDiastolic}</span>}
                        {v.heartRate && <span>HR: {v.heartRate}</span>}
                        {v.temperature && <span>Temp: {v.temperature}°C</span>}
                        {v.spo2 && <span>SpO₂: {v.spo2}%</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      )}
    </PageShell>
  );
}

export default function VitalsEntryPage() {
  return (
    <Suspense fallback={<PageShell title="Vitals Entry"><p className="p-4 text-slate-400">Loading…</p></PageShell>}>
      <VitalsContent />
    </Suspense>
  );
}
