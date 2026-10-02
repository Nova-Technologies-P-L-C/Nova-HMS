"use client";
// ─── NURSE TRIAGE — VITALS & CHIEF COMPLAINT ──────────────────────────────────
// Role: Nurse
// Purpose: First clinical stop after a patient is registered and enters the
//          OPD waiting queue. The nurse records:
//            1. Chief complaint  — patient's own words for why they are here TODAY
//            2. Vital signs      — BP, HR, temperature, SpO₂, weight, height
//            3. Triage class     — Normal (join queue) or Urgent (prioritise)
//
// Data written to DB:
//   - VitalSigns  (via trpc.visit.recordVitals)
//   - ClinicalNote type="triage" (via trpc.visit.addNote) — carries chiefComplaint
//     so the doctor sees the presenting complaint before opening consultation.
//   - OPDTicket.status → "urgent" or "waiting" (via trpc.visit.updateTicketStatus)
//
// Workflow position:
//   OPD Queue → [this page] → Doctor Queue → Consultation
//
// Why chief complaint matters here:
//   Without it the doctor opens an empty consultation form with only vitals.
//   The nurse's complaint note pre-fills context so the doctor is not starting blind
//   and can prioritise their questions appropriately.
//
// Why triage class matters:
//   "Urgent" moves the ticket to the top of the doctor's queue and displays a
//   red badge on the OPD Queue Board screen visible to all staff.
// ──────────────────────────────────────────────────────────────────────────────
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { trpc, queryClient } from "@/utils/trpc";
import { PageShell, Card, FormField, inputCls, btnPrimary, btnSecondary, StatusBadge } from "@/components/nova/nova-ui";
import { CheckCircle, AlertTriangle } from "lucide-react";

function VitalsContent() {
  const router      = useRouter();
  const params      = useSearchParams();
  const visitIdParam = params.get("visitId") ?? "";

  // Load the live OPD queue so the nurse can pick from waiting patients
  const { data: queue = [], refetch: refetchQueue } = useQuery({
    ...trpc.visit.queue.queryOptions(),
    refetchOnMount:       true,
    refetchOnWindowFocus: true,
  });

  const [selectedVisitId, setSelectedVisitId] = useState(visitIdParam);

  // The queue entry for the currently selected visit
  const activeTicket = queue.find((q) => q.visitId === selectedVisitId);

  // Only show waiting / urgent patients — done patients are not triaged again
  const waitingPatients = queue.filter((q) => q.status === "waiting" || q.status === "urgent");

  // Load full visit detail once a patient is selected
  const { data: visit } = useQuery({
    ...trpc.visit.get.queryOptions({ visitId: selectedVisitId }),
    enabled: !!selectedVisitId,
  });

  // ── Vital signs form state ─────────────────────────────────────────────────
  // All fields start empty — the nurse must enter the actual measured values.
  // Do NOT pre-fill vitals with any default numbers (safety risk).
  const [vitals, setVitals] = useState({
    bpSystolic:  "",
    bpDiastolic: "",
    heartRate:   "",
    temperature: "",
    spo2:        "",
    weight:      "",
    height:      "",
  });

  // ── P3: Chief complaint ────────────────────────────────────────────────────
  // The patient's own description of why they came today.
  // Saved as a ClinicalNote (noteType="triage") so the doctor can see it
  // in the consultation sidebar without re-asking the patient.
  const [chiefComplaint, setChiefComplaint] = useState("");

  // Triage classification — drives OPD ticket priority
  const [urgency, setUrgency] = useState<"normal" | "urgent">("normal");
  const [saved,   setSaved]   = useState(false);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const recordVitals = useMutation(trpc.visit.recordVitals.mutationOptions());

  // addNote with noteType="triage" stores the chief complaint so it appears
  // in the doctor's consultation sidebar under "Triage complaint (Nurse)"
  const addTriageNote = useMutation(trpc.visit.addNote.mutationOptions());

  const updateStatus = useMutation({
    ...trpc.visit.updateTicketStatus.mutationOptions(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: trpc.visit.queue.queryKey() }),
  });

  const handleSave = async () => {
    if (!selectedVisitId || !activeTicket) return;

    // 1. Persist vital signs to VitalSigns table
    await recordVitals.mutateAsync({
      visitId:     selectedVisitId,
      bpSystolic:  vitals.bpSystolic  ? Number(vitals.bpSystolic)  : undefined,
      bpDiastolic: vitals.bpDiastolic ? Number(vitals.bpDiastolic) : undefined,
      heartRate:   vitals.heartRate   ? Number(vitals.heartRate)   : undefined,
      temperature: vitals.temperature ? Number(vitals.temperature) : undefined,
      spo2:        vitals.spo2        ? Number(vitals.spo2)        : undefined,
      weight:      vitals.weight      ? Number(vitals.weight)      : undefined,
      height:      vitals.height      ? Number(vitals.height)      : undefined,
    });

    // 2. Save chief complaint as a triage clinical note (P3)
    //    The doctor will see this in the consultation sidebar under "Triage complaint (Nurse)"
    if (chiefComplaint.trim()) {
      await addTriageNote.mutateAsync({
        visitId:        selectedVisitId,
        noteType:       "triage",
        chiefComplaint: chiefComplaint.trim(),
        // history/examination/assessment/plan are left blank at triage — doctor fills those
      });
    }

    // 3. Update queue ticket status — urgent moves to top of doctor's queue
    await updateStatus.mutateAsync({
      ticketId: activeTicket.id,
      status:   urgency === "urgent" ? "urgent" : "waiting",
    });

    setSaved(true);
  };

  const isLoading = recordVitals.isPending || addTriageNote.isPending || updateStatus.isPending;

  // ── Success screen ─────────────────────────────────────────────────────────
  if (saved && activeTicket) {
    return (
      <PageShell title="Vitals Entry">
        <Card className="p-10 text-center max-w-md mx-auto">
          <CheckCircle size={48} className="text-teal-500 mx-auto mb-4" />
          <h2 className="font-bold text-slate-800 text-lg mb-1">Triage complete</h2>
          <p className="text-slate-600 font-medium mb-1">{visit?.patient?.nameEn}</p>
          <p className="text-sm text-slate-500 mb-2">
            Ticket: <strong>{activeTicket.ticketNumber}</strong>
          </p>
          {chiefComplaint.trim() && (
            <p className="text-xs text-slate-400 italic mb-2">
              Chief complaint recorded: &ldquo;{chiefComplaint.trim()}&rdquo;
            </p>
          )}
          {urgency === "urgent" && (
            <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2">
              <AlertTriangle size={14} /> Marked as URGENT — patient prioritised in doctor queue
            </div>
          )}
          <p className="text-xs text-slate-400 mb-6">Patient is ready for doctor consultation.</p>
          <div className="flex gap-2 justify-center">
            <button onClick={() => router.push("/nova/doctor")} className={btnPrimary}>
              Notify doctor →
            </button>
            <button
              onClick={() => {
                setSaved(false);
                setSelectedVisitId("");
                setChiefComplaint("");
                setVitals({ bpSystolic: "", bpDiastolic: "", heartRate: "", temperature: "", spo2: "", weight: "", height: "" });
                setUrgency("normal");
              }}
              className={btnSecondary}
            >
              Next patient
            </button>
          </div>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell title="Nurse Triage — Vitals & Chief Complaint" subtitle="Step 2 of patient journey">
      {/* Patient journey breadcrumb */}
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

      {/* Patient selector — nurse picks from the waiting queue */}
      <Card className="p-4 mb-5 border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-slate-700">Select patient to triage</p>
          <button onClick={() => refetchQueue()} className="text-xs text-teal-600 hover:underline">
            ↻ Refresh queue
          </button>
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

      {!selectedVisitId && (
        <p className="text-sm text-slate-400 text-center py-8">← Select a patient above to record triage</p>
      )}

      {selectedVisitId && visit && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* ── Left / main column: chief complaint + vitals + triage class ── */}
          <div className="md:col-span-2 space-y-5">

            {/* Patient identity strip */}
            <Card className="p-4 flex items-center gap-4 bg-slate-50">
              <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-700 font-bold text-sm flex items-center justify-center shrink-0">
                {visit.patient.nameEn.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-800">{visit.patient.nameEn}</p>
                {visit.patient.nameAm && (
                  <p className="text-xs text-slate-400">{visit.patient.nameAm}</p>
                )}
                <p className="text-xs text-slate-500">
                  {visit.patient.healthId} · {visit.patient.sex === "M" ? "Male" : "Female"} · DOB {visit.patient.dob}
                </p>
              </div>
              {activeTicket && (
                <span className="font-mono font-bold text-teal-700">{activeTicket.ticketNumber}</span>
              )}
            </Card>

            {/* P3: Chief complaint — patient's own words */}
            <Card className="p-5">
              <h3 className="font-semibold text-slate-800 mb-1">Chief complaint *</h3>
              <p className="text-xs text-slate-400 mb-3">
                Ask the patient: &ldquo;What brings you to the hospital today?&rdquo; — record their answer here.
                The doctor will see this before opening consultation.
              </p>
              <textarea
                className={`${inputCls} resize-none h-20 w-full`}
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
                placeholder="e.g. Fever and headache for 3 days, severe cough since yesterday…"
              />
              {chiefComplaint.trim().length > 0 && chiefComplaint.trim().length < 5 && (
                <p className="text-xs text-amber-600 mt-1">
                  Please describe the complaint with a few more words.
                </p>
              )}
            </Card>

            {/* Vital signs */}
            <Card className="p-5">
              <h3 className="font-semibold text-slate-800 mb-4">Vital signs</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="BP Systolic (mmHg)">
                  <input
                    type="number"
                    className={inputCls}
                    value={vitals.bpSystolic}
                    onChange={(e) => setVitals((v) => ({ ...v, bpSystolic: e.target.value }))}
                    placeholder="e.g. 120"
                  />
                </FormField>
                <FormField label="BP Diastolic (mmHg)">
                  <input
                    type="number"
                    className={inputCls}
                    value={vitals.bpDiastolic}
                    onChange={(e) => setVitals((v) => ({ ...v, bpDiastolic: e.target.value }))}
                    placeholder="e.g. 80"
                  />
                </FormField>
                <FormField label="Heart rate (bpm)">
                  <input
                    type="number"
                    className={inputCls}
                    value={vitals.heartRate}
                    onChange={(e) => setVitals((v) => ({ ...v, heartRate: e.target.value }))}
                    placeholder="e.g. 88"
                  />
                </FormField>
                <FormField label="Temperature (°C)">
                  <input
                    type="number"
                    step="0.1"
                    className={inputCls}
                    value={vitals.temperature}
                    onChange={(e) => setVitals((v) => ({ ...v, temperature: e.target.value }))}
                    placeholder="e.g. 37.2"
                  />
                </FormField>
                <FormField label="SpO₂ (%)">
                  <input
                    type="number"
                    className={inputCls}
                    value={vitals.spo2}
                    onChange={(e) => setVitals((v) => ({ ...v, spo2: e.target.value }))}
                    placeholder="e.g. 97"
                  />
                </FormField>
                <FormField label="Weight (kg)">
                  <input
                    type="number"
                    step="0.1"
                    className={inputCls}
                    value={vitals.weight}
                    onChange={(e) => setVitals((v) => ({ ...v, weight: e.target.value }))}
                    placeholder="e.g. 72"
                  />
                </FormField>
                <FormField label="Height (cm)">
                  <input
                    type="number"
                    className={inputCls}
                    value={vitals.height}
                    onChange={(e) => setVitals((v) => ({ ...v, height: e.target.value }))}
                    placeholder="e.g. 175"
                  />
                </FormField>
              </div>
            </Card>

            {/* Triage classification */}
            <Card className="p-4">
              <h3 className="font-semibold text-slate-800 mb-3">Triage classification</h3>
              <div className="flex gap-3">
                <button
                  onClick={() => setUrgency("normal")}
                  className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                    urgency === "normal"
                      ? "bg-teal-600 text-white border-teal-600"
                      : "bg-white text-slate-700 border-slate-200 hover:border-teal-400"
                  }`}
                >
                  ✓ Normal — join queue
                </button>
                <button
                  onClick={() => setUrgency("urgent")}
                  className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                    urgency === "urgent"
                      ? "bg-red-600 text-white border-red-600"
                      : "bg-white text-red-600 border-red-200 hover:bg-red-50"
                  }`}
                >
                  ⚠ Urgent — prioritise
                </button>
              </div>
            </Card>

            {/* Validation: chief complaint is required */}
            {chiefComplaint.trim().length === 0 && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                ⚠ Chief complaint is required — ask the patient why they are here today before saving.
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={isLoading || !activeTicket || chiefComplaint.trim().length < 3}
                className={`${btnPrimary} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isLoading ? "Saving…" : "Save triage & send to doctor queue"}
              </button>
              <button className={btnSecondary} onClick={() => setSelectedVisitId("")}>
                Cancel
              </button>
            </div>
          </div>

          {/* ── Right column: previous vitals for context ── */}
          <div>
            {visit.vitals.length > 0 && (
              <Card className="p-4">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Previous vitals</p>
                <div className="space-y-3">
                  {visit.vitals.slice(0, 3).map((v) => (
                    <div key={v.id} className="text-xs border-b border-slate-100 pb-2 last:border-0">
                      <p className="font-medium text-slate-600 mb-1">
                        {new Date(v.recordedAt).toLocaleDateString()}
                      </p>
                      <div className="grid grid-cols-2 gap-1 text-slate-500">
                        {v.bpSystolic && <span>BP: {v.bpSystolic}/{v.bpDiastolic}</span>}
                        {v.heartRate  && <span>HR: {v.heartRate}</span>}
                        {v.temperature && <span>Temp: {v.temperature}°C</span>}
                        {v.spo2       && <span>SpO₂: {v.spo2}%</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* CBHI badge — quick reference for billing team */}
            {visit.patient.cbhiStatus && (
              <div className="mt-4 p-3 bg-teal-50 border border-teal-200 rounded-lg text-xs text-teal-800">
                🛡️ <strong>CBHI Member</strong> — services covered by Community-Based Health Insurance
              </div>
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
