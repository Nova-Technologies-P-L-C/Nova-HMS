"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { Card, StatusBadge, inputCls, btnPrimary, btnSecondary } from "./nova-ui";
import { 
  Pill, 
  Stethoscope, 
  FileText, 
  FlaskConical, 
  Activity, 
  AlertTriangle, 
  Plus, 
  Check, 
  Clock, 
  User, 
  BedDouble, 
  ShieldCheck,
  ChevronRight,
  Copy
} from "lucide-react";

interface PatientHistoryViewerProps {
  patientId?: string;
  visitId?: string;
  onSelectPrescription?: (rx: {
    drug: string;
    dose: string;
    freq: string;
    days: number;
  }) => void;
  onSelectDiagnosis?: (diag: {
    icdCode: string;
    description: string;
    notes?: string;
  }) => void;
  showAllergyAdder?: boolean;
  compact?: boolean;
  defaultTab?: "prescriptions" | "diagnoses" | "notes" | "labs" | "vitals";
}

export function PatientHistoryViewer({
  patientId,
  visitId,
  onSelectPrescription,
  onSelectDiagnosis,
  showAllergyAdder = true,
  compact = false,
  defaultTab = "prescriptions",
}: PatientHistoryViewerProps) {
  const [tab, setTab] = useState<"prescriptions" | "diagnoses" | "notes" | "labs" | "vitals">(defaultTab);
  const [isAddingAllergy, setIsAddingAllergy] = useState(false);
  const [allergySubstance, setAllergySubstance] = useState("");
  const [allergyReaction, setAllergyReaction] = useState("");
  const [allergySeverity, setAllergySeverity] = useState("moderate");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const qc = useQueryClient();

  const { data: history, isLoading, error } = useQuery({
    ...trpc.patient.getMedicalHistory.queryOptions({ patientId, visitId }),
    enabled: !!patientId || !!visitId,
  });

  const addAllergyMutation = useMutation(
    trpc.patient.addAllergy.mutationOptions({
      onSuccess: () => {
        setIsAddingAllergy(false);
        setAllergySubstance("");
        setAllergyReaction("");
        qc.invalidateQueries({ queryKey: trpc.patient.getMedicalHistory.queryKey() });
      },
    })
  );

  const handleAddAllergy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!history?.patient?.id || !allergySubstance.trim()) return;
    await addAllergyMutation.mutateAsync({
      patientId: history.patient.id,
      substance: allergySubstance.trim(),
      reaction: allergyReaction.trim(),
      severity: allergySeverity,
    });
  };

  const handleCopyPrescription = (l: { itemName: string; dose: string; frequency: string; durationDays: number }, id: string) => {
    if (onSelectPrescription) {
      onSelectPrescription({
        drug: l.itemName,
        dose: l.dose,
        freq: l.frequency,
        days: l.durationDays,
      });
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleCopyDiagnosis = (d: { icdCode: string; description: string; notes?: string }) => {
    if (onSelectDiagnosis) {
      onSelectDiagnosis({
        icdCode: d.icdCode,
        description: d.description,
        notes: d.notes,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 text-center text-slate-400 bg-white rounded-lg border border-slate-200">
        <Activity className="w-5 h-5 animate-spin mx-auto mb-2 text-teal-600" />
        <p className="text-xs">Loading patient longitudinal history…</p>
      </div>
    );
  }

  if (error || !history) {
    return (
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
        Patient historical record is currently unavailable.
      </div>
    );
  }

  const {
    patient,
    allergies,
    activeAdmission,
    totalVisits,
    allPrescriptions,
    allDiagnoses,
    allNotes,
    allLabOrders,
    allVitals,
  } = history;

  // Flatten lines for total prescription items count
  const allMedicationLines = allPrescriptions.flatMap((rx) =>
    rx.lines.map((line) => ({
      ...line,
      rxId: rx.prescriptionId,
      visitId: rx.visitId,
      visitDate: rx.visitDate,
      prescribedAt: rx.prescribedAt,
      prescribedBy: rx.prescribedBy,
      rxStatus: rx.status,
      isCurrentVisit: rx.isCurrentVisit,
    }))
  );

  return (
    <div className="space-y-4">
      {/* ⚠️ Critical Clinical Alerts Banner (Allergies & Inpatient Status) */}
      <div className="space-y-2">
        {allergies.length > 0 ? (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-red-700">
                  Known Drug & Environmental Allergies ({allergies.length})
                </span>
                {showAllergyAdder && !isAddingAllergy && (
                  <button
                    onClick={() => setIsAddingAllergy(true)}
                    className="text-[11px] text-red-700 font-semibold hover:underline flex items-center gap-1"
                  >
                    <Plus size={12} /> Add Allergy
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {allergies.map((a) => (
                  <span
                    key={a.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800 border border-red-300"
                  >
                    <span>⚠️ {a.substance}</span>
                    {a.reaction && <span className="font-normal text-red-600">({a.reaction})</span>}
                    <span className="text-[10px] uppercase font-bold text-red-700 bg-red-200 px-1 rounded">
                      {a.severity}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-800">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>No recorded drug allergies for this patient.</span>
            </span>
            {showAllergyAdder && !isAddingAllergy && (
              <button
                onClick={() => setIsAddingAllergy(true)}
                className="text-teal-700 font-medium hover:underline text-[11px] flex items-center gap-1"
              >
                <Plus size={11} /> Record Allergy
              </button>
            )}
          </div>
        )}

        {/* Quick Add Allergy Inline Form */}
        {isAddingAllergy && (
          <form
            onSubmit={handleAddAllergy}
            className="p-3 bg-red-50/70 border border-red-300 rounded-lg text-xs space-y-2"
          >
            <p className="font-bold text-red-800">Record New Drug Allergy for {patient.nameEn}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Substance (e.g. Penicillin, Sulfa)"
                value={allergySubstance}
                onChange={(e) => setAllergySubstance(e.target.value)}
                required
                className="px-2 py-1 bg-white border border-red-200 rounded text-slate-800 text-xs"
              />
              <input
                type="text"
                placeholder="Reaction (e.g. Hives, Anaphylaxis)"
                value={allergyReaction}
                onChange={(e) => setAllergyReaction(e.target.value)}
                className="px-2 py-1 bg-white border border-red-200 rounded text-slate-800 text-xs"
              />
              <div className="flex gap-1.5">
                <select
                  value={allergySeverity}
                  onChange={(e) => setAllergySeverity(e.target.value)}
                  className="flex-1 px-2 py-1 bg-white border border-red-200 rounded text-slate-800 text-xs"
                >
                  <option value="mild">Mild</option>
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe</option>
                </select>
                <button
                  type="submit"
                  disabled={addAllergyMutation.isPending}
                  className="px-2.5 py-1 bg-red-600 text-white rounded font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingAllergy(false)}
                  className="px-2 py-1 bg-slate-200 text-slate-700 rounded hover:bg-slate-300"
                >
                  ✕
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Inpatient Ward Admission Alert */}
        {activeAdmission && (
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BedDouble className="w-5 h-5 text-purple-600 shrink-0" />
              <div>
                <p className="text-xs font-bold text-purple-900">
                  Currently Admitted Inpatient: {activeAdmission.ward}, Room {activeAdmission.room} (Bed {activeAdmission.bedId})
                </p>
                <p className="text-[11px] text-purple-700">
                  Duty Nurse: <span className="font-semibold">{activeAdmission.assignedNurseName}</span> · Admitted {new Date(activeAdmission.admittedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-purple-200 text-purple-800">
              Active Inpatient
            </span>
          </div>
        )}
      </div>

      {/* Tabs Navigation Header */}
      <div className="flex items-center gap-1 border-b border-slate-200 pb-1 overflow-x-auto text-xs">
        <button
          onClick={() => setTab("prescriptions")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-md font-medium whitespace-nowrap transition-colors ${
            tab === "prescriptions"
              ? "bg-teal-600 text-white font-semibold shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Pill size={14} />
          <span>Previous Prescriptions</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              tab === "prescriptions" ? "bg-teal-700 text-teal-100" : "bg-slate-200 text-slate-700"
            }`}
          >
            {allMedicationLines.length}
          </span>
        </button>

        <button
          onClick={() => setTab("diagnoses")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-md font-medium whitespace-nowrap transition-colors ${
            tab === "diagnoses"
              ? "bg-teal-600 text-white font-semibold shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Stethoscope size={14} />
          <span>Past Diagnoses</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              tab === "diagnoses" ? "bg-teal-700 text-teal-100" : "bg-slate-200 text-slate-700"
            }`}
          >
            {allDiagnoses.length}
          </span>
        </button>

        <button
          onClick={() => setTab("notes")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-md font-medium whitespace-nowrap transition-colors ${
            tab === "notes"
              ? "bg-teal-600 text-white font-semibold shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <FileText size={14} />
          <span>Clinical & Nurse Notes</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              tab === "notes" ? "bg-teal-700 text-teal-100" : "bg-slate-200 text-slate-700"
            }`}
          >
            {allNotes.length}
          </span>
        </button>

        <button
          onClick={() => setTab("labs")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-md font-medium whitespace-nowrap transition-colors ${
            tab === "labs"
              ? "bg-teal-600 text-white font-semibold shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <FlaskConical size={14} />
          <span>Lab Results</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              tab === "labs" ? "bg-teal-700 text-teal-100" : "bg-slate-200 text-slate-700"
            }`}
          >
            {allLabOrders.length}
          </span>
        </button>

        <button
          onClick={() => setTab("vitals")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-md font-medium whitespace-nowrap transition-colors ${
            tab === "vitals"
              ? "bg-teal-600 text-white font-semibold shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Activity size={14} />
          <span>Vitals Trends</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              tab === "vitals" ? "bg-teal-700 text-teal-100" : "bg-slate-200 text-slate-700"
            }`}
          >
            {allVitals.length}
          </span>
        </button>
      </div>

      {/* Tab 1: 💊 Previous Prescriptions & Treatments */}
      {tab === "prescriptions" && (
        <div className="space-y-3">
          {allMedicationLines.length === 0 ? (
            <div className="p-6 text-center text-slate-400 bg-white rounded-lg border border-slate-200 text-xs">
              <Pill className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-medium text-slate-600">No previous prescriptions found</p>
              <p className="text-slate-400 mt-0.5">This patient has no recorded medications across past visits.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span>Total Medications Prescribed: <strong>{allMedicationLines.length}</strong> across {totalVisits} visit(s)</span>
                {onSelectPrescription && (
                  <span className="text-teal-700 font-medium">💡 Click "+ Re-prescribe" to copy dosage directly into current prescription</span>
                )}
              </div>

              {allPrescriptions.map((rx) => (
                <Card key={rx.prescriptionId} className="p-3.5 bg-white border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-700">
                        Visit Date: {new Date(rx.visitDate).toLocaleDateString()}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        ({new Date(rx.prescribedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})
                      </span>
                      {rx.isCurrentVisit ? (
                        <span className="px-1.5 py-0.5 bg-teal-100 text-teal-800 text-[10px] font-bold rounded">
                          Current Visit
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-medium rounded">
                          Prior Visit
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-400">Dr: {rx.prescribedBy || "Attending"}</span>
                      <StatusBadge status={rx.status} />
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {rx.lines.map((line) => {
                      const isCopied = copiedId === line.id;
                      return (
                        <div
                          key={line.id}
                          className="py-2 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800 text-sm">{line.itemName}</span>
                              {line.status === "dispensed" && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded font-medium border border-emerald-200">
                                  ✓ Dispensed
                                </span>
                              )}
                              {line.paymentStatus === "cbhi_covered" && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-teal-50 text-teal-700 rounded font-medium border border-teal-200">
                                  CBHI
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-slate-600 mt-0.5">
                              <span><strong>Dose:</strong> {line.dose}</span>
                              <span>•</span>
                              <span><strong>Frequency:</strong> {line.frequency}</span>
                              <span>•</span>
                              <span><strong>Duration:</strong> {line.durationDays} day(s)</span>
                            </div>
                          </div>

                          {/* 1-Click Action to Copy / Re-prescribe */}
                          {onSelectPrescription ? (
                            <button
                              type="button"
                              onClick={() => handleCopyPrescription(line, line.id)}
                              className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-md font-semibold text-xs transition-colors ${
                                isCopied
                                  ? "bg-emerald-600 text-white"
                                  : "bg-teal-50 text-teal-700 border border-teal-300 hover:bg-teal-600 hover:text-white"
                              }`}
                            >
                              {isCopied ? (
                                <>
                                  <Check size={13} />
                                  <span>Added!</span>
                                </>
                              ) : (
                                <>
                                  <Plus size={13} />
                                  <span>Re-prescribe</span>
                                </>
                              )}
                            </button>
                          ) : visitId ? (
                            <a
                              href={`/nova/doctor/prescription?visitId=${visitId}&drug=${encodeURIComponent(line.itemName)}&dose=${encodeURIComponent(line.dose)}&freq=${encodeURIComponent(line.frequency)}&days=${line.durationDays}`}
                              className="shrink-0 flex items-center gap-1 px-2.5 py-1 bg-slate-50 text-slate-700 border border-slate-200 rounded hover:bg-teal-50 hover:text-teal-700 text-xs font-medium"
                            >
                              <Copy size={12} />
                              <span>Prescribe →</span>
                            </a>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: 🩺 Past Diagnoses */}
      {tab === "diagnoses" && (
        <div className="space-y-3">
          {allDiagnoses.length === 0 ? (
            <div className="p-6 text-center text-slate-400 bg-white rounded-lg border border-slate-200 text-xs">
              <Stethoscope className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-medium text-slate-600">No diagnoses recorded</p>
              <p className="text-slate-400 mt-0.5">No diagnostic conditions have been documented for this patient.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span>Historical Clinical Diagnoses ({allDiagnoses.length})</span>
                {onSelectDiagnosis && (
                  <span className="text-teal-700 font-medium">💡 Click "Use Diagnosis" to fill current encounter</span>
                )}
              </div>

              {allDiagnoses.map((d) => (
                <Card key={d.id} className="p-3.5 bg-white border border-slate-200 shadow-xs">
                  <div className="flex items-start justify-between gap-3 text-xs">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded">
                          {d.icdCode}
                        </span>
                        <span className="font-semibold text-slate-800 text-sm">{d.description}</span>
                        {d.isCurrentVisit && (
                          <span className="px-1.5 py-0.5 bg-teal-100 text-teal-800 text-[10px] font-bold rounded">
                            Current Visit
                          </span>
                        )}
                      </div>
                      {d.notes && (
                        <p className="text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 mt-1.5">
                          {d.notes}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-2">
                        <span>Diagnosed on: <strong>{new Date(d.diagnosedAt).toLocaleDateString()}</strong></span>
                        <span>•</span>
                        <span>Doctor: {d.diagnosedBy || "Consultant"}</span>
                      </div>
                    </div>

                    {onSelectDiagnosis && (
                      <button
                        type="button"
                        onClick={() => handleCopyDiagnosis(d)}
                        className="shrink-0 flex items-center gap-1 px-3 py-1.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-md hover:bg-teal-600 hover:text-white font-semibold text-xs transition-colors"
                      >
                        <Check size={13} />
                        <span>Use Diagnosis</span>
                      </button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: 📝 Clinical & Nurse Notes */}
      {tab === "notes" && (
        <div className="space-y-3">
          {allNotes.length === 0 ? (
            <div className="p-6 text-center text-slate-400 bg-white rounded-lg border border-slate-200 text-xs">
              <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-medium text-slate-600">No clinical notes recorded</p>
              <p className="text-slate-400 mt-0.5">Doctor assessments and nurse ward notes will appear here.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {allNotes.map((n) => (
                <Card key={n.id} className="p-4 bg-white border border-slate-200 shadow-xs text-xs space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="font-bold capitalize px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-xs">
                        {n.noteType.replace(/_/g, " ")}
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        {new Date(n.createdAt).toLocaleDateString()} {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {n.isCurrentVisit && (
                        <span className="px-1.5 py-0.5 bg-teal-100 text-teal-800 text-[10px] font-bold rounded">
                          Current Visit
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400">Author: {n.authorId || "Clinical Staff"}</span>
                  </div>

                  {n.chiefComplaint && (
                    <div>
                      <span className="font-semibold text-slate-700">Chief Complaint:</span>
                      <p className="text-slate-600 mt-0.5 pl-2 border-l-2 border-slate-200">{n.chiefComplaint}</p>
                    </div>
                  )}

                  {n.examination && (
                    <div>
                      <span className="font-semibold text-slate-700">Examination Findings:</span>
                      <p className="text-slate-600 mt-0.5 pl-2 border-l-2 border-blue-200">{n.examination}</p>
                    </div>
                  )}

                  {n.assessment && (
                    <div>
                      <span className="font-semibold text-slate-700">Assessment / Impression:</span>
                      <p className="text-slate-600 mt-0.5 pl-2 border-l-2 border-emerald-200">{n.assessment}</p>
                    </div>
                  )}

                  {n.plan && (
                    <div>
                      <span className="font-semibold text-slate-700">Care Plan / Nursing Action:</span>
                      <p className="text-slate-600 mt-0.5 pl-2 border-l-2 border-teal-200">{n.plan}</p>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: 🔬 Lab Orders & Results */}
      {tab === "labs" && (
        <div className="space-y-3">
          {allLabOrders.length === 0 ? (
            <div className="p-6 text-center text-slate-400 bg-white rounded-lg border border-slate-200 text-xs">
              <FlaskConical className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-medium text-slate-600">No lab investigations</p>
              <p className="text-slate-400 mt-0.5">Laboratory tests and diagnostic findings will appear here.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {allLabOrders.map((lo) => {
                let parsedResults = null;
                if (lo.result?.resultsJson) {
                  try {
                    parsedResults = JSON.parse(lo.result.resultsJson);
                  } catch {
                    parsedResults = null;
                  }
                }

                return (
                  <Card key={lo.id} className="p-3.5 bg-white border border-slate-200 shadow-xs text-xs space-y-2">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-sm">{lo.testName}</span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(lo.orderedAt).toLocaleDateString()}
                        </span>
                        {lo.isCurrentVisit && (
                          <span className="px-1.5 py-0.5 bg-teal-100 text-teal-800 text-[10px] font-bold rounded">
                            Current Visit
                          </span>
                        )}
                      </div>
                      <StatusBadge status={lo.status} />
                    </div>

                    {lo.result ? (
                      <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-lg space-y-1.5">
                        <div className="flex items-center justify-between text-teal-800 font-semibold text-xs">
                          <span>✓ Diagnostic Findings Available</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            Entered {new Date(lo.result.enteredAt).toLocaleString()}
                          </span>
                        </div>

                        {Array.isArray(parsedResults) && (
                          <div className="space-y-1 mt-1 bg-white p-2 rounded border border-teal-100">
                            {parsedResults.map((r: { name?: string; value: string; unit?: string; refRange?: string }, i: number) => (
                              <div key={i} className="flex justify-between items-center py-0.5 text-slate-700 border-b border-slate-50 last:border-0">
                                <span className="font-medium">{r.name || "Test Result"}</span>
                                <span className="font-bold text-slate-900">
                                  {r.value} {r.unit || ""} {r.refRange ? `(${r.refRange})` : ""}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {lo.result.interpretation && (
                          <p className="text-xs text-teal-900 mt-1">
                            <strong>Interpretation:</strong> {lo.result.interpretation}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-slate-400 italic">
                        {lo.status === "completed" ? "Completed without structured report" : "Specimen analysis in progress…"}
                      </p>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: 📊 Vitals Trends */}
      {tab === "vitals" && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
                  <th className="px-3 py-2 text-left font-semibold">Date & Time</th>
                  <th className="px-3 py-2 text-left font-semibold">BP (mmHg)</th>
                  <th className="px-3 py-2 text-left font-semibold">Heart Rate</th>
                  <th className="px-3 py-2 text-left font-semibold">Temp (°C)</th>
                  <th className="px-3 py-2 text-left font-semibold">SpO₂ (%)</th>
                  <th className="px-3 py-2 text-left font-semibold">Weight</th>
                  <th className="px-3 py-2 text-left font-semibold">Encounter</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allVitals.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                      No vital signs on record.
                    </td>
                  </tr>
                ) : (
                  allVitals.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium text-slate-700 whitespace-nowrap">
                        {new Date(v.recordedAt).toLocaleDateString()} {new Date(v.recordedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-3 py-2 font-mono font-semibold text-slate-800">
                        {v.bpSystolic && v.bpDiastolic ? `${v.bpSystolic}/${v.bpDiastolic}` : "—"}
                      </td>
                      <td className="px-3 py-2">{v.heartRate ? `${v.heartRate} bpm` : "—"}</td>
                      <td className="px-3 py-2">{v.temperature ? `${v.temperature} °C` : "—"}</td>
                      <td className="px-3 py-2">{v.spo2 ? `${v.spo2}%` : "—"}</td>
                      <td className="px-3 py-2">{v.weight ? `${v.weight} kg` : "—"}</td>
                      <td className="px-3 py-2">
                        {v.isCurrentVisit ? (
                          <span className="px-1.5 py-0.5 bg-teal-100 text-teal-800 text-[10px] font-bold rounded">
                            Current
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">Past</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
