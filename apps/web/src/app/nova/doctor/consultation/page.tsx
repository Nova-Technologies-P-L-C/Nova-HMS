"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation } from "@tanstack/react-query";
import { trpc, queryClient } from "@/utils/trpc";
import { PageShell, Card, FormField, inputCls, btnPrimary, btnSecondary } from "@/components/nova/nova-ui";
import { CheckCircle, History, Pill, FileText, FlaskConical, ArrowRight, Stethoscope, Bed, ShieldAlert } from "lucide-react";
import { PatientHistoryViewer } from "@/components/nova/patient-history-viewer";
import { useNovaRole } from "@/components/nova/nova-role-context";
import { toast } from "sonner";

function ConsultationContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { role } = useNovaRole();
  const visitId = params.get("visitId") ?? "";

  const isDoctor = role === "Doctor";
  const isAdmin = role === "Organizational Admin" || role === "Branch Admin" || role === "Hospital Admin" || role === "Nova Admin";

  const { data: visit } = useQuery({
    ...trpc.visit.get.queryOptions({ visitId }),
    enabled: !!visitId && (isDoctor || isAdmin),
  });

  const [complaint, setComplaint] = useState("Patient presents with sore throat, mild fever for 3 days.");
  const [icd, setIcd] = useState("J06.9");
  const [diagnosis, setDiagnosis] = useState("Acute upper respiratory infection");
  const [notes, setNotes] = useState("Throat erythematous, no exudate. Lungs clear.");
  const [planRx, setPlanRx] = useState(true);
  const [planLab, setPlanLab] = useState(false);
  const [planRefer, setPlanRefer] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  // Pre-fill existing draft notes and diagnosis if returning to a visit
  useEffect(() => {
    if (!visit) return;
    const latestNote = visit.notes?.[0];
    const latestDiag = visit.diagnoses?.[0];
    if (latestNote) {
      if (latestNote.chiefComplaint) setComplaint(latestNote.chiefComplaint);
      if (latestNote.examination) setNotes(latestNote.examination);
    }
    if (latestDiag) {
      if (latestDiag.icdCode) setIcd(latestDiag.icdCode);
      if (latestDiag.description) setDiagnosis(latestDiag.description);
    }
  }, [visit]);

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
    try {
      await addNote.mutateAsync({ visitId, noteType: "consultation", chiefComplaint: complaint, examination: notes, assessment: diagnosis, plan: "" });
      await addDiagnosis.mutateAsync({ visitId, icdCode: icd, description: diagnosis, notes });
      await transferToBilling.mutateAsync({ visitId });
      setSaved(true);
    } catch {
      toast.error("Failed to complete consultation and transfer to billing");
    }
  };

  const handleSaveDraft = async () => {
    if (!visitId) return;
    try {
      setSavingDraft(true);
      await addNote.mutateAsync({
        visitId,
        noteType: "consultation",
        chiefComplaint: complaint,
        examination: notes,
        assessment: diagnosis,
        plan: "",
      });
      await addDiagnosis.mutateAsync({
        visitId,
        icdCode: icd,
        description: diagnosis,
        notes,
      });
      queryClient.invalidateQueries({ queryKey: trpc.visit.get.queryKey({ visitId }) });
      toast.success("Consultation draft saved", {
        description: "Notes and diagnosis saved to record. Patient remains in your consultation queue.",
      });
    } catch {
      toast.error("Failed to save draft");
    } finally {
      setSavingDraft(false);
    }
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

  // Strict Clinical Role Boundary: Consultation is strictly reserved for Doctors
  if (!isDoctor && !isAdmin) {
    return (
      <PageShell
        title="Consultation Encounter"
        subtitle="Clinical Access Governance"
      >
        <Card className="max-w-xl mx-auto p-8 my-8 text-center border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 shadow-xs">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-300 dark:border-amber-700">
            <Stethoscope size={32} />
          </div>
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 mb-3">
            Doctor Role Exclusive
          </span>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Physician Consultation Station</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
            Medical consultation encounters, clinical diagnoses (ICD-10), and treatment orders are reserved exclusively for licensed <strong>Medical Doctors</strong>.
          </p>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-left text-xs space-y-2 mb-6 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Your Current Role:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">{role}</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              {role === "Ward Nurse" || role === "Nurse" ? (
                <>For inpatient bedside charting, scheduled Medication Administration (MAR), and nurse shift handovers, please access <strong>Shift Nursing Notes</strong>.</>
              ) : role === "Triage Nurse" ? (
                <>For emergency and OPD front intake, vitals, and acuity tagging, please access the <strong>Triage Intake Station</strong>.</>
              ) : (
                <>Please access your assigned department workstation from the navigation sidebar.</>
              )}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {role === "Ward Nurse" || role === "Nurse" ? (
              <>
                <Link
                  href="/nova/nurse/notes"
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 shadow-xs"
                >
                  <FileText size={16} /> Open Shift Nursing Notes →
                </Link>
                <Link
                  href="/nova/nurse"
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  <Bed size={16} /> Inpatient Bed Census
                </Link>
              </>
            ) : role === "Triage Nurse" ? (
              <Link
                href={"/nova/triage" as any}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 shadow-xs"
              >
                Go to Triage Station →
              </Link>
            ) : (
              <button
                onClick={() => router.back()}
                className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                ← Return to Previous Page
              </button>
            )}
          </div>
        </Card>
      </PageShell>
    );
  }

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
          {/* Verified Lab Results if tests were ordered for this visit */}
          {visit && visit.labOrders && visit.labOrders.length > 0 && (
            <Card className="p-5 border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/30 dark:bg-emerald-950/20 shadow-xs">
              <div className="flex items-center justify-between mb-3 border-b border-emerald-100 dark:border-emerald-900/40 pb-2">
                <div className="flex items-center gap-2">
                  <FlaskConical className="text-emerald-600 dark:text-emerald-400" size={18} />
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                    Verified Laboratory Test Findings ({visit.labOrders.length})
                  </h3>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200">
                  {visit.labOrders.filter((l) => l.status === "completed").length}/{visit.labOrders.length} Completed
                </span>
              </div>

              <div className="space-y-3">
                {visit.labOrders.map((order) => {
                  let parsedResults: any[] = [];
                  if (order.result?.resultsJson) {
                    try {
                      parsedResults = JSON.parse(order.result.resultsJson);
                    } catch {}
                  }

                  return (
                    <div
                      key={order.id}
                      className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs"
                    >
                      <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-100">
                          {order.testName}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            order.status === "completed"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200"
                          }`}
                        >
                          {order.status === "completed" ? "✓ Verified & Approved" : "Processing in Lab"}
                        </span>
                      </div>

                      {parsedResults.length > 0 ? (
                        <div className="overflow-x-auto mt-2">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-left text-slate-400 border-b border-slate-100 dark:border-slate-800">
                                <th className="pb-1 font-semibold">Parameter</th>
                                <th className="pb-1 font-semibold">Observed Value</th>
                                <th className="pb-1 font-semibold">Ref Range</th>
                                <th className="pb-1 font-semibold">Flag</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {parsedResults.map((r, i) => (
                                <tr key={i} className="text-slate-700 dark:text-slate-200">
                                  <td className="py-1 font-medium">{r.name}</td>
                                  <td className="py-1 font-bold text-teal-700 dark:text-teal-300">
                                    {r.value} {r.unit}
                                  </td>
                                  <td className="py-1 text-slate-400">{r.refRange || "—"}</td>
                                  <td className="py-1">
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                        r.flag === "critical"
                                          ? "bg-red-500 text-white animate-pulse"
                                          : r.flag === "high" || r.flag === "low"
                                          ? "bg-amber-500 text-white"
                                          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200"
                                      }`}
                                    >
                                      {r.flag}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : order.result?.interpretation ? (
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                          <strong>Findings:</strong> {order.result.interpretation}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400 italic mt-1">
                          Specimen has been received by laboratory technician. Result pending.
                        </p>
                      )}

                      {order.result?.interpretation && parsedResults.length > 0 && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <strong>Technician Interpretation:</strong> {order.result.interpretation}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          <Card className="p-5">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Chief complaint</h3>
            <textarea className={`${inputCls} resize-none h-20`} value={complaint} onChange={(e) => setComplaint(e.target.value)} />
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Diagnosis</h3>
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
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Treatment plan</h3>
            <div className="space-y-2">
              {[
                { label: "Write prescription", val: planRx, set: setPlanRx },
                { label: "Order lab test", val: planLab, set: setPlanLab },
                { label: "Create referral", val: planRefer, set: setPlanRefer },
              ].map((item) => (
                <label key={item.label} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={item.val} onChange={(e) => item.set(e.target.checked)} className="accent-teal-600 w-4 h-4" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">{item.label}</span>
                </label>
              ))}
            </div>
          </Card>

          <div className="flex gap-2">
            <button onClick={handleSaveAndTransfer} disabled={!visitId || isLoading} className={`${btnPrimary} ${(!visitId || isLoading) ? "opacity-50 cursor-not-allowed" : ""}`}>
              {isLoading ? "Saving & Transferring…" : "✓ Complete & Transfer to Billing →"}
            </button>
            <button onClick={handleSaveDraft} disabled={!visitId || isLoading || savingDraft} className={btnSecondary}>
              {savingDraft ? "Saving draft…" : "Save draft"}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {visit && (
            <Card className="p-4 bg-slate-50 dark:bg-slate-800/60">
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Patient</p>
              <p className="font-semibold text-slate-800 dark:text-slate-100">{visit.patient.nameEn}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{visit.patient.healthId} · {visit.patient.sex === "M" ? "Male" : "Female"}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">DOB: {visit.patient.dob}</p>
              {visit.patient.cbhiStatus && <p className="text-xs text-teal-600 dark:text-teal-400 mt-1">✓ CBHI</p>}
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
            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 font-semibold">Clinical Actions</p>
            <Link
              href={`/nova/doctor/prescription?visitId=${visitId}`}
              className="flex items-center justify-between w-full px-3 py-2 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 rounded text-xs font-semibold hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors"
            >
              <span className="flex items-center gap-1.5"><Pill size={14} /> Prescribe Medications</span>
              <ArrowRight size={13} />
            </Link>
            <Link
              href={`/nova/doctor/lab-order?visitId=${visitId}`}
              className="flex items-center justify-between w-full px-3 py-2 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            >
              <span className="flex items-center gap-1.5"><FlaskConical size={14} /> Order Lab Tests</span>
              <ArrowRight size={13} />
            </Link>
            <Link
              href={`/nova/doctor/emr?visitId=${visitId}`}
              className="flex items-center justify-between w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <span className="flex items-center gap-1.5"><FileText size={14} /> View Full EMR</span>
              <ArrowRight size={13} />
            </Link>
          </Card>
        </div>
      </div>

      {/* Patient Longitudinal History: Previous Prescriptions, Diagnoses, Notes, Labs */}
      <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">
                Patient Medical History & Previous Treatments
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Longitudinal records across all visits · Previous prescriptions, nursing notes, diagnoses & lab reports for{" "}
              <strong>{visit?.patient?.nameEn || "patient"}</strong>
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 font-semibold rounded-full">
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
