"use client";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation } from "@tanstack/react-query";
import { trpc, queryClient } from "@/utils/trpc";
import { PageShell, Card, FormField, inputCls, btnPrimary, btnSecondary } from "@/components/nova/nova-ui";
import { CheckCircle } from "lucide-react";

function ConsultationContent() {
  const router = useRouter();
  const params = useSearchParams();
  const visitId = params.get("visitId") ?? "";

  const { data: visit } = useQuery({
    ...trpc.visit.get.queryOptions({ visitId }),
    enabled: !!visitId,
  });

  const [complaint, setComplaint] = useState("Patient presents with sore throat, mild fever for 3 days.");
  const [icd, setIcd] = useState("J06.9");
  const [diagnosis, setDiagnosis] = useState("Acute upper respiratory infection");
  const [notes, setNotes] = useState("Throat erythematous, no exudate. Lungs clear.");
  const [planRx, setPlanRx] = useState(true);
  const [planLab, setPlanLab] = useState(false);
  const [planRefer, setPlanRefer] = useState(false);
  const [saved, setSaved] = useState(false);

  const addNote = useMutation(trpc.visit.addNote.mutationOptions());
  const addDiagnosis = useMutation(trpc.visit.addDiagnosis.mutationOptions());
  const closeVisit = useMutation({
    ...trpc.visit.closeVisit.mutationOptions(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: trpc.visit.queue.queryKey() }),
  });

  const handleSave = async () => {
    if (!visitId) return;
    await addNote.mutateAsync({ visitId, noteType: "consultation", chiefComplaint: complaint, examination: notes, assessment: diagnosis, plan: "" });
    await addDiagnosis.mutateAsync({ visitId, icdCode: icd, description: diagnosis, notes });
    setSaved(true);
  };

  const isLoading = addNote.isPending || addDiagnosis.isPending;

  if (saved && visit) {
    return (
      <PageShell title="Consultation">
        <Card className="p-8 max-w-lg mx-auto">
          <CheckCircle size={40} className="text-teal-500 mb-4" />
          <h2 className="font-bold text-slate-800 text-lg mb-1">Consultation saved</h2>
          <p className="text-slate-600 mb-4">{visit.patient.nameEn} · {icd} — {diagnosis}</p>
          <p className="text-sm text-slate-500 mb-5">Choose next actions:</p>
          <div className="space-y-2">
            {planRx && (
              <Link href={`/nova/doctor/prescription?visitId=${visitId}`} className="flex items-center justify-between w-full px-4 py-3 bg-teal-50 border border-teal-200 rounded-lg text-sm text-teal-700 hover:bg-teal-100">
                <span>✍ Write prescription</span><span>→</span>
              </Link>
            )}
            {planLab && (
              <Link href={`/nova/doctor/lab-order?visitId=${visitId}`} className="flex items-center justify-between w-full px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 hover:bg-blue-100">
                <span>🔬 Order lab test</span><span>→</span>
              </Link>
            )}
            {planRefer && (
              <Link href={`/nova/doctor/referral?visitId=${visitId}`} className="flex items-center justify-between w-full px-4 py-3 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-700 hover:bg-purple-100">
                <span>↗ Create referral</span><span>→</span>
              </Link>
            )}
            <Link href="/nova/billing/invoices" className="flex items-center justify-between w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-100">
              <span>💳 Go to Billing</span><span>→</span>
            </Link>
            <button onClick={() => router.push("/nova/doctor")} className={`w-full ${btnSecondary} mt-2`}>Back to queue</button>
          </div>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Consultation"
      subtitle={visit ? `${visit.patient.nameEn} · ${visit.patient.healthId}` : "Loading…"}
    >
      <div className="flex items-center gap-2 mb-5 text-xs text-slate-500">
        <span className="px-2 py-1 bg-slate-200 rounded">1 Register</span>
        <span className="text-slate-300">→</span>
        <span className="px-2 py-1 bg-slate-200 rounded">2 Triage</span>
        <span className="text-slate-300">→</span>
        <span className="px-2 py-1 bg-slate-200 rounded">3 Queue</span>
        <span className="text-slate-300">→</span>
        <span className="px-2 py-1 bg-teal-600 text-white rounded font-medium">4 Consultation</span>
        <span className="text-slate-300">→</span>
        <span className="px-2 py-1 bg-slate-100 rounded">5 Treatment</span>
      </div>

      {!visitId && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm mb-4">
          No visit selected. <Link href="/nova/doctor" className="underline">Go to doctor queue →</Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="md:col-span-2 space-y-5">
          <Card className="p-5">
            <h3 className="font-semibold text-slate-800 mb-3">Chief complaint</h3>
            <textarea className={`${inputCls} resize-none h-20`} value={complaint} onChange={(e) => setComplaint(e.target.value)} />
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-slate-800 mb-4">Diagnosis</h3>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="ICD-10 code">
                <input className={inputCls} value={icd} onChange={(e) => setIcd(e.target.value)} placeholder="J06.9" />
              </FormField>
              <FormField label="Diagnosis description">
                <input className={inputCls} value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
              </FormField>
            </div>
            <div className="mt-3">
              <FormField label="Clinical notes">
                <textarea className={`${inputCls} resize-none h-24`} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </FormField>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-slate-800 mb-3">Treatment plan</h3>
            <div className="space-y-2">
              {[
                { label: "Write prescription", val: planRx, set: setPlanRx },
                { label: "Order lab test", val: planLab, set: setPlanLab },
                { label: "Create referral", val: planRefer, set: setPlanRefer },
              ].map((item) => (
                <label key={item.label} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={item.val} onChange={(e) => item.set(e.target.checked)} className="accent-teal-600 w-4 h-4" />
                  <span className="text-sm text-slate-700">{item.label}</span>
                </label>
              ))}
            </div>
          </Card>

          <div className="flex gap-2">
            <button onClick={handleSave} disabled={!visitId || isLoading} className={`${btnPrimary} ${(!visitId || isLoading) ? "opacity-50 cursor-not-allowed" : ""}`}>
              {isLoading ? "Saving…" : "Save & close encounter →"}
            </button>
            <button className={btnSecondary}>Save draft</button>
          </div>
        </div>

        <div className="space-y-4">
          {visit && (
            <Card className="p-4 bg-slate-50">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Patient</p>
              <p className="font-semibold text-slate-800">{visit.patient.nameEn}</p>
              <p className="text-xs text-slate-500">{visit.patient.healthId} · {visit.patient.sex === "M" ? "Male" : "Female"}</p>
              <p className="text-xs text-slate-500 mt-1">DOB: {visit.patient.dob}</p>
              {visit.patient.cbhiStatus && <p className="text-xs text-teal-600 mt-1">✓ CBHI</p>}
            </Card>
          )}
          {visit && visit.vitals.length > 0 && (
            <Card className="p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Latest vitals</p>
              {(() => {
                const v = visit.vitals[0];
                return (
                  <div className="text-xs text-slate-600 space-y-1">
                    {v.bpSystolic && <p>BP: {v.bpSystolic}/{v.bpDiastolic} mmHg</p>}
                    {v.heartRate && <p>HR: {v.heartRate} bpm</p>}
                    {v.temperature && <p>Temp: {v.temperature}°C</p>}
                    {v.spo2 && <p>SpO₂: {v.spo2}%</p>}
                    {v.weight && <p>Weight: {v.weight} kg</p>}
                  </div>
                );
              })()}
            </Card>
          )}
          {visit && visit.diagnoses.length > 0 && (
            <Card className="p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Previous diagnoses</p>
              {visit.diagnoses.map((d) => (
                <div key={d.id} className="mb-3 pb-3 border-b border-slate-100 last:border-0 last:mb-0">
                  <p className="text-xs font-mono text-slate-400">{new Date(d.diagnosedAt).toLocaleDateString()}</p>
                  <p className="text-sm text-slate-700 font-medium">{d.description}</p>
                  <p className="text-xs text-slate-500">{d.icdCode}</p>
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>
    </PageShell>
  );
}

export default function ConsultationPage() {
  return (
    <Suspense fallback={<PageShell title="Consultation"><p className="p-4 text-slate-400">Loading…</p></PageShell>}>
      <ConsultationContent />
    </Suspense>
  );
}
