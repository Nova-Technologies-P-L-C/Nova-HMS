"use client";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation } from "@tanstack/react-query";
import { trpc, queryClient } from "@/utils/trpc";
import { PageShell, Card, FormField, inputCls, btnPrimary, btnSecondary } from "@/components/nova/nova-ui";
import { CheckCircle, History, Pill, FileText, FlaskConical, ArrowRight } from "lucide-react";
import { PatientHistoryViewer } from "@/components/nova/patient-history-viewer";

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
  const transferToBilling = useMutation({
    ...trpc.visit.transferToBilling.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.visit.queue.queryKey() });
      queryClient.invalidateQueries({ queryKey: trpc.billing.settlementQueue.queryKey() });
    },
  });

  const handleSaveAndTransfer = async () => {
    if (!visitId) return;
    await addNote.mutateAsync({ visitId, noteType: "consultation", chiefComplaint: complaint, examination: notes, assessment: diagnosis, plan: "" });
    await addDiagnosis.mutateAsync({ visitId, icdCode: icd, description: diagnosis, notes });
    await transferToBilling.mutateAsync({ visitId });
    setSaved(true);
  };

  const handleSaveDraft = async () => {
    if (!visitId) return;
    await addNote.mutateAsync({ visitId, noteType: "consultation", chiefComplaint: complaint, examination: notes, assessment: diagnosis, plan: "" });
    await addDiagnosis.mutateAsync({ visitId, icdCode: icd, description: diagnosis, notes });
    setSaved(true);
  };

  const handleSelectDiagnosis = (d: { icdCode: string; description: string; notes?: string }) => {
    setIcd(d.icdCode);
    setDiagnosis(d.description);
    if (d.notes) {
      setNotes((prev) => (prev ? `${prev}\n[History Note]: ${d.notes}` : d.notes || ""));
    }
  };

  const handleSelectPrescription = (med: { drug: string; dose: string; freq: string; days: number }) => {
    router.push(
      `/nova/doctor/prescription?visitId=${visitId}&drug=${encodeURIComponent(med.drug)}&dose=${encodeURIComponent(
        med.dose
      )}&freq=${encodeURIComponent(med.freq)}&days=${med.days}`
    );
  };

  const isLoading = addNote.isPending || addDiagnosis.isPending || transferToBilling.isPending;

  if (saved && visit) {
    return (
      <PageShell title="Consultation Encounter">
        <Card className="p-8 max-w-lg mx-auto">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle size={32} />
          </div>
          <h2 className="font-bold text-slate-800 text-lg mb-1 text-center">Consultation Completed</h2>
          <p className="text-sm text-center text-emerald-700 font-semibold mb-2">
            ✓ Transferred to Billing Role for Final Settlement
          </p>
          <p className="text-slate-500 text-center text-xs mb-5">
            {visit.patient.nameEn} · {icd} — {diagnosis}. All diagnostic tests and medications have been accrued to the patient's visit bill.
          </p>
          <div className="space-y-2">
            <Link href={`/nova/billing`} className="flex items-center justify-between w-full px-4 py-3 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 shadow-sm">
              <span>💳 Open in Billing & Settle Now</span><span>→</span>
            </Link>
            {planRx && (
              <Link href={`/nova/doctor/prescription?visitId=${visitId}`} className="flex items-center justify-between w-full px-4 py-2.5 bg-teal-50 border border-teal-200 rounded-lg text-sm text-teal-700 hover:bg-teal-100">
                <span>✍ Prescribe Medications</span><span>→</span>
              </Link>
            )}
            {planLab && (
              <Link href={`/nova/doctor/lab-order?visitId=${visitId}`} className="flex items-center justify-between w-full px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 hover:bg-blue-100">
                <span>🔬 Order Lab Tests</span><span>→</span>
              </Link>
            )}
            {planRefer && (
              <Link href={`/nova/doctor/referral?visitId=${visitId}`} className="flex items-center justify-between w-full px-4 py-2.5 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-700 hover:bg-purple-100">
                <span>↗ Create Referral</span><span>→</span>
              </Link>
            )}
            <button onClick={() => router.push("/nova/doctor")} className={`w-full ${btnSecondary} mt-2`}>Back to Doctor Queue</button>
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
            <button onClick={handleSaveAndTransfer} disabled={!visitId || isLoading} className={`${btnPrimary} ${(!visitId || isLoading) ? "opacity-50 cursor-not-allowed" : ""}`}>
              {isLoading ? "Saving & Transferring…" : "✓ Complete & Transfer to Billing →"}
            </button>
            <button onClick={handleSaveDraft} disabled={!visitId || isLoading} className={btnSecondary}>
              Save draft
            </button>
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
          <Card className="p-4 space-y-2">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-semibold">Clinical Actions</p>
            <Link
              href={`/nova/doctor/prescription?visitId=${visitId}`}
              className="flex items-center justify-between w-full px-3 py-2 bg-teal-50 border border-teal-200 text-teal-700 rounded text-xs font-semibold hover:bg-teal-100 transition-colors"
            >
              <span className="flex items-center gap-1.5"><Pill size={14} /> Prescribe Medications</span>
              <ArrowRight size={13} />
            </Link>
            <Link
              href={`/nova/doctor/lab-order?visitId=${visitId}`}
              className="flex items-center justify-between w-full px-3 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded text-xs font-semibold hover:bg-blue-100 transition-colors"
            >
              <span className="flex items-center gap-1.5"><FlaskConical size={14} /> Order Lab Tests</span>
              <ArrowRight size={13} />
            </Link>
            <Link
              href={`/nova/doctor/emr?visitId=${visitId}`}
              className="flex items-center justify-between w-full px-3 py-2 bg-slate-100 border border-slate-200 text-slate-700 rounded text-xs font-semibold hover:bg-slate-200 transition-colors"
            >
              <span className="flex items-center gap-1.5"><FileText size={14} /> View Full EMR</span>
              <ArrowRight size={13} />
            </Link>
          </Card>
        </div>
      </div>

      {/* Patient Longitudinal History: Previous Prescriptions, Diagnoses, Notes, Labs */}
      <div className="mt-8 pt-6 border-t border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-teal-600" />
              <h3 className="font-bold text-slate-800 text-base">
                Patient Medical History & Previous Treatments
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Longitudinal records across all visits · Previous prescriptions, nursing notes, diagnoses & lab reports for{" "}
              <strong>{visit?.patient?.nameEn || "patient"}</strong>
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 bg-teal-50 border border-teal-200 text-teal-700 font-semibold rounded-full">
            💡 1-Click Re-prescribe & Auto-fill Diagnosis
          </span>
        </div>

        <PatientHistoryViewer
          visitId={visitId}
          onSelectDiagnosis={handleSelectDiagnosis}
          onSelectPrescription={handleSelectPrescription}
          showAllergyAdder={true}
        />
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
