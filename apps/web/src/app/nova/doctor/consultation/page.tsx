"use client";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation } from "@tanstack/react-query";
import { trpc, queryClient } from "@/utils/trpc";
import { PageShell, Card, FormField, inputCls, btnPrimary, btnSecondary } from "@/components/nova/nova-ui";
import { CheckCircle } from "lucide-react";

// ─── CONSULTATION PAGE ─────────────────────────────────────────────────────────
// Role: Doctor
// Purpose: Core clinical encounter screen. The doctor records the patient's SOAP note,
//          ICD-10 diagnosis, and treatment plan, then transfers the visit to the
//          Billing Officer for final payment settlement.
//
// Workflow position:
//   OPD Queue → [this page] → Prescription / Lab Order / Referral → Billing
//
// Data written to DB:
//   - ClinicalNote  (visitId, chiefComplaint, examination, assessment, plan)
//   - Diagnosis     (visitId, icdCode, description)
//   - Visit.status  → "ready_for_billing"  (via transferToBilling)
//   - Notification  → sent to cashier role
//
// ⚠ PRODUCTION WARNING — hardcoded defaults below must be removed before go-live.
//   Every field that carries a pre-filled string is a patient-safety risk:
//   a doctor could accidentally save fake clinical notes on a real patient record.
//   Replace every useState("...") that contains clinical text with useState("").
// ──────────────────────────────────────────────────────────────────────────────

function ConsultationContent() {
  const router = useRouter();
  const params = useSearchParams();
  const visitId = params.get("visitId") ?? "";

  // Fetch full visit detail (patient demographics, vitals, prior diagnoses)
  const { data: visit } = useQuery({
    ...trpc.visit.get.queryOptions({ visitId }),
    enabled: !!visitId,
  });

  // ─── Clinical form state ──────────────────────────────────────────────────
  // TODO (CRITICAL — P1): Replace all pre-filled strings with empty string "".
  // These hardcoded values will save incorrect clinical data on real patients.
  const [complaint, setComplaint] = useState("Patient presents with sore throat, mild fever for 3 days."); // ← REMOVE default
  const [icd, setIcd] = useState("J06.9");                                   // ← REMOVE default
  const [diagnosis, setDiagnosis] = useState("Acute upper respiratory infection"); // ← REMOVE default
  const [notes, setNotes] = useState("Throat erythematous, no exudate. Lungs clear."); // ← REMOVE default
  const [planRx, setPlanRx] = useState(true);    // should default false — doctor explicitly chooses
  const [planLab, setPlanLab] = useState(false);
  const [planRefer, setPlanRefer] = useState(false);
  const [saved, setSaved] = useState(false);

  // Save SOAP note + ICD diagnosis, then change visit status → ready_for_billing
  const addNote = useMutation(trpc.visit.addNote.mutationOptions());
  const addDiagnosis = useMutation(trpc.visit.addDiagnosis.mutationOptions());
  const transferToBilling = useMutation({
    ...trpc.visit.transferToBilling.mutationOptions(),
    onSuccess: () => {
      // Invalidate queue so doctor's panel and billing panel both reflect new status
      queryClient.invalidateQueries({ queryKey: trpc.visit.queue.queryKey() });
      queryClient.invalidateQueries({ queryKey: trpc.billing.settlementQueue.queryKey() });
    },
  });

  // "Complete & Transfer" — saves note + diagnosis, then moves visit to billing queue
  const handleSaveAndTransfer = async () => {
    if (!visitId) return;
    // TODO (P12): also pass history, examination, and plan fields once SOAP form is expanded
    await addNote.mutateAsync({ visitId, noteType: "consultation", chiefComplaint: complaint, examination: notes, assessment: diagnosis, plan: "" });
    await addDiagnosis.mutateAsync({ visitId, icdCode: icd, description: diagnosis, notes });
    await transferToBilling.mutateAsync({ visitId });
    setSaved(true);
  };

  // "Save draft" — persists clinical note without changing visit status.
  // Allows the doctor to pause and return without losing work.
  const handleSaveDraft = async () => {
    if (!visitId) return;
    await addNote.mutateAsync({ visitId, noteType: "consultation", chiefComplaint: complaint, examination: notes, assessment: diagnosis, plan: "" });
    await addDiagnosis.mutateAsync({ visitId, icdCode: icd, description: diagnosis, notes });
    setSaved(true);
  };

  const isLoading = addNote.isPending || addDiagnosis.isPending || transferToBilling.isPending;

  // ─── Success state ─────────────────────────────────────────────────────────
  // Shown after the doctor transfers the visit. Provides quick links to
  // Billing, Prescription, Lab Order, and Referral pages.
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
            {visit.patient.nameEn} · {icd} — {diagnosis}. All diagnostic tests and medications have been accrued to the patient&apos;s visit bill.
          </p>
          <div className="space-y-2">
            {/* Primary CTA — open billing screen to settle this visit immediately */}
            <Link href={`/nova/billing`} className="flex items-center justify-between w-full px-4 py-3 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 shadow-sm">
              <span>💳 Open in Billing &amp; Settle Now</span><span>→</span>
            </Link>
            {/* Conditional follow-on actions based on doctor's treatment plan */}
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
      {/* Patient journey breadcrumb — helps staff understand where they are in the flow */}
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

      {/* Guard: prevent rendering form without a visitId */}
      {!visitId && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm mb-4">
          No visit selected. <Link href="/nova/doctor" className="underline">Go to doctor queue →</Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* ── Left column: clinical data entry ── */}
        <div className="md:col-span-2 space-y-5">

          {/* S — Subjective: patient's own words */}
          <Card className="p-5">
            <h3 className="font-semibold text-slate-800 mb-3">Chief complaint</h3>
            {/* TODO (CRITICAL — P1): Remove default value. Must be blank on a real patient. */}
            <textarea className={`${inputCls} resize-none h-20`} value={complaint} onChange={(e) => setComplaint(e.target.value)} />
          </Card>

          {/* A — Assessment: coded diagnosis */}
          <Card className="p-5">
            <h3 className="font-semibold text-slate-800 mb-4">Diagnosis</h3>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="ICD-10 code">
                {/* TODO (CRITICAL — P1): Remove "J06.9" default. */}
                <input className={inputCls} value={icd} onChange={(e) => setIcd(e.target.value)} placeholder="J06.9" />
              </FormField>
              <FormField label="Diagnosis description">
                {/* TODO (CRITICAL — P1): Remove "Acute upper respiratory infection" default. */}
                <input className={inputCls} value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
              </FormField>
            </div>
            <div className="mt-3">
              <FormField label="Clinical notes">
                {/* O — Objective: examination findings. TODO (P1): Remove default value. */}
                <textarea className={`${inputCls} resize-none h-24`} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </FormField>
            </div>
          </Card>

          {/* P — Plan: follow-on actions the doctor intends */}
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
            {/* Primary action: saves clinical data AND moves visit to billing queue */}
            <button onClick={handleSaveAndTransfer} disabled={!visitId || isLoading} className={`${btnPrimary} ${(!visitId || isLoading) ? "opacity-50 cursor-not-allowed" : ""}`}>
              {isLoading ? "Saving & Transferring…" : "✓ Complete & Transfer to Billing →"}
            </button>
            {/* Secondary action: saves data only, does NOT change visit status */}
            <button onClick={handleSaveDraft} disabled={!visitId || isLoading} className={btnSecondary}>
              Save draft
            </button>
          </div>
        </div>

        {/* ── Right column: patient context panel ── */}
        <div className="space-y-4">
          {/* Patient identity card — pulled from the visit's patient relation */}
          {visit && (
            <Card className="p-4 bg-slate-50">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Patient</p>
              <p className="font-semibold text-slate-800">{visit.patient.nameEn}</p>
              <p className="text-xs text-slate-500">{visit.patient.healthId} · {visit.patient.sex === "M" ? "Male" : "Female"}</p>
              <p className="text-xs text-slate-500 mt-1">DOB: {visit.patient.dob}</p>
              {visit.patient.cbhiStatus && <p className="text-xs text-teal-600 mt-1">✓ CBHI</p>}
            </Card>
          )}

          {/* Most recent vitals recorded by the nurse at triage */}
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

          {/* TODO (P3): Also show triage chief complaint captured by the nurse.
              Currently the nurse vitals page does not record a chief complaint note.
              Once added, filter visit.notes where noteType === "triage" and display it here. */}

          {/* Historical diagnoses from previous visits — clinical safety context */}
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
