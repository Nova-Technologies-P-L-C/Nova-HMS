"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { PageShell, Card, FormField, inputCls, btnPrimary, btnSecondary, StatusBadge } from "@/components/nova/nova-ui";
import { CheckCircle, Plus, Trash2, ArrowLeft } from "lucide-react";
import { PatientHistoryViewer } from "@/components/nova/patient-history-viewer";

type RxLine = { drug: string; dose: string; freq: string; days: string };

const COMMON_DRUGS = [
  "Amoxicillin 500mg", "Paracetamol 500mg", "Metformin 500mg", "Ibuprofen 400mg",
  "Ciprofloxacin 500mg", "Artemether/Lumefantrine 80/480mg", "ORS Sachet",
  "Omeprazole 20mg", "Atenolol 50mg", "Metronidazole 400mg",
];

function PrescriptionContent() {
  const router = useRouter();
  const params = useSearchParams();
  const visitId = params.get("visitId") ?? "";
  const qc = useQueryClient();

  const { data: visit } = useQuery({
    ...trpc.visit.get.queryOptions({ visitId }),
    enabled: !!visitId,
  });

  const [lines, setLines] = useState<RxLine[]>([{ drug: "", dose: "1 tablet", freq: "3x daily", days: "7" }]);
  const [pharmNotes, setPharmNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Check URL query parameters for prefilled medication (e.g. from 1-click re-prescribe)
  useEffect(() => {
    const qDrug = params.get("drug");
    if (qDrug) {
      const qDose = params.get("dose") || "1 tablet";
      const qFreq = params.get("freq") || "3x daily";
      const qDays = params.get("days") || "7";
      setLines([{ drug: qDrug, dose: qDose, freq: qFreq, days: qDays }]);
    }
  }, [params]);

  const handleRePrescribe = (med: { drug: string; dose: string; freq: string; days: number }) => {
    setLines((prev) => {
      if (prev.length === 1 && !prev[0].drug.trim()) {
        return [{ drug: med.drug, dose: med.dose, freq: med.freq, days: String(med.days) }];
      }
      return [...prev, { drug: med.drug, dose: med.dose, freq: med.freq, days: String(med.days) }];
    });
  };

  const writePrescription = useMutation(trpc.prescription.create.mutationOptions({
    onSuccess: () => qc.invalidateQueries({ queryKey: trpc.prescription.queue.queryKey() }),
  }));

  const addLine = () => setLines((l) => [...l, { drug: "", dose: "1 tablet", freq: "Once daily", days: "7" }]);
  const removeLine = (i: number) => setLines((l) => l.filter((_, idx) => idx !== i));
  const update = (i: number, field: keyof RxLine, val: string) =>
    setLines((l) => l.map((line, idx) => idx === i ? { ...line, [field]: val } : line));

  const handleSubmit = async () => {
    if (!visitId) return;
    const validLines = lines.filter((l) => l.drug.trim());
    if (validLines.length === 0) return;
    await writePrescription.mutateAsync({
      visitId,
      lines: validLines.map((l) => ({
        itemId: "",
        itemName: l.drug,
        dose: l.dose,
        frequency: l.freq,
        durationDays: Number(l.days) || 7,
      })),
    });
    setSubmitted(true);
  };

  const prevRx = visit?.prescriptions ?? [];

  if (submitted) {
    return (
      <PageShell title="e-Prescription">
        <Card className="p-10 text-center max-w-md mx-auto">
          <CheckCircle size={48} className="text-teal-500 mx-auto mb-4" />
          <h2 className="font-bold text-slate-800 text-lg mb-2">Prescription sent to pharmacy</h2>
          <p className="text-sm text-slate-500 mb-6">
            {visit?.patient?.nameEn} — {lines.filter((l) => l.drug).length} medication(s)
          </p>
          <div className="flex gap-2 justify-center">
            <button onClick={() => router.push("/nova/pharmacy")} className={btnPrimary}>Go to pharmacy →</button>
            <button onClick={() => { setSubmitted(false); setLines([{ drug: "", dose: "1 tablet", freq: "3x daily", days: "7" }]); }} className={btnSecondary}>New prescription</button>
          </div>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="e-Prescription"
      subtitle={visit ? `${visit.patient.nameEn} · ${visit.patient.healthId}` : visitId ? "Loading…" : "No visit selected"}
    >
      {!visitId && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm mb-4">
          No visit selected. <a href="/nova/doctor" className="underline">Go to doctor queue →</a>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Active Prescription Writer */}
        <div className="lg:col-span-6 space-y-5">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">Medications</h3>
              <button onClick={addLine} className="flex items-center gap-1 text-xs text-teal-600 hover:underline">
                <Plus size={13} /> Add medication
              </button>
            </div>
            <div className="space-y-4">
              {lines.map((line, i) => (
                <div key={i} className="p-3 rounded-lg border border-slate-100 bg-slate-50">
                  <div className="grid grid-cols-2 gap-3 mb-2">
                    <FormField label="Drug / strength">
                      <input
                        list="drug-list"
                        value={line.drug}
                        onChange={(e) => update(i, "drug", e.target.value)}
                        className={inputCls}
                        placeholder="e.g. Amoxicillin 500mg"
                      />
                      <datalist id="drug-list">
                        {COMMON_DRUGS.map((d) => <option key={d} value={d} />)}
                      </datalist>
                    </FormField>
                    <FormField label="Dose">
                      <input value={line.dose} onChange={(e) => update(i, "dose", e.target.value)} className={inputCls} placeholder="1 tablet" />
                    </FormField>
                    <FormField label="Frequency">
                      <select value={line.freq} onChange={(e) => update(i, "freq", e.target.value)} className={inputCls}>
                        {["Once daily", "2x daily", "3x daily", "4x daily", "Every 8hrs", "As needed"].map((f) => <option key={f}>{f}</option>)}
                      </select>
                    </FormField>
                    <FormField label="Duration (days)">
                      <input type="number" min={1} value={line.days} onChange={(e) => update(i, "days", e.target.value)} className={inputCls} />
                    </FormField>
                  </div>
                  {lines.length > 1 && (
                    <button onClick={() => removeLine(i)} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700">
                      <Trash2 size={12} /> Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-slate-800 mb-3">Notes to pharmacist</h3>
            <textarea
              className={`${inputCls} resize-none h-16`}
              value={pharmNotes}
              onChange={(e) => setPharmNotes(e.target.value)}
              placeholder="Any special dispensing instructions…"
            />
          </Card>

          {writePrescription.error && <p className="text-sm text-red-600">{writePrescription.error.message}</p>}

          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={!visitId || lines.every((l) => !l.drug) || writePrescription.isPending}
              className={`${btnPrimary} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {writePrescription.isPending ? "Sending…" : "Send to pharmacy →"}
            </button>
            <button onClick={() => router.back()} className={btnSecondary}>Cancel</button>
          </div>
        </div>

        {/* Right: Patient Longitudinal History & Previous Prescriptions */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between pb-1">
            <h3 className="font-bold text-slate-800 text-sm">
              Longitudinal History & Past Prescriptions
            </h3>
            <span className="text-[11px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded font-medium border border-teal-200">
              💡 Click "+ Re-prescribe" to copy into prescription
            </span>
          </div>

          <PatientHistoryViewer
            visitId={visitId}
            onSelectPrescription={handleRePrescribe}
            defaultTab="prescriptions"
            showAllergyAdder={true}
          />
        </div>
      </div>
    </PageShell>
  );
}

export default function PrescriptionPage() {
  return (
    <Suspense fallback={<PageShell title="e-Prescription"><p className="p-4 text-slate-400">Loading…</p></PageShell>}>
      <PrescriptionContent />
    </Suspense>
  );
}
