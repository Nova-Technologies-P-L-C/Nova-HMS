"use client";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { PageShell, Card, FormField, inputCls, btnPrimary, btnSecondary } from "@/components/nova/nova-ui";
import { CheckCircle } from "lucide-react";

const LAB_TESTS = [
  "CBC (Complete Blood Count)", "Fasting Blood Sugar", "HbA1c", "Lipid Profile",
  "Liver Function Tests", "Renal Function Tests", "Malaria RDT", "Urinalysis",
  "Thyroid Function (TSH)", "HIV Rapid Test", "Hepatitis B Surface Antigen",
  "Widal Test", "Stool Microscopy", "Sputum AFB (TB)",
];

function LabOrderContent() {
  const router = useRouter();
  const params = useSearchParams();
  const visitId = params.get("visitId") ?? "";
  const qc = useQueryClient();

  const { data: visit } = useQuery({
    ...trpc.visit.get.queryOptions({ visitId }),
    enabled: !!visitId,
  });

  const { data: labTariffs = [] } = useQuery(
    trpc.tariff.list.queryOptions({ category: "lab", activeOnly: true })
  );

  const availableTests = labTariffs.length > 0
    ? labTariffs.map((t) => ({ name: t.name, price: t.price }))
    : LAB_TESTS.map((t) => ({ name: t, price: undefined }));

  const [selected, setSelected] = useState<string[]>([]);
  const [priority, setPriority] = useState<"routine" | "urgent">("routine");
  const [indication, setIndication] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const orderLab = useMutation(trpc.lab.order.mutationOptions({
    onSuccess: () => qc.invalidateQueries({ queryKey: trpc.lab.queue.queryKey() }),
  }));

  const toggle = (t: string) =>
    setSelected((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);

  const handleSubmit = async () => {
    if (!visitId || selected.length === 0) return;
    for (const testName of selected) {
      await orderLab.mutateAsync({ visitId, testName, priority, indication });
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <PageShell title="Lab Order">
        <Card className="p-10 text-center max-w-md mx-auto">
          <CheckCircle size={48} className="text-teal-500 mx-auto mb-4" />
          <h2 className="font-bold text-slate-800 text-lg mb-2">Lab order sent</h2>
          <p className="text-sm text-slate-500 mb-2">Tests ordered for <strong>{visit?.patient?.nameEn}</strong>:</p>
          <ul className="text-sm text-slate-700 mb-6 space-y-1">
            {selected.map((t) => <li key={t} className="flex items-center gap-2 justify-center"><span className="text-teal-500">✓</span>{t}</li>)}
          </ul>
          <div className="flex gap-2 justify-center">
            <button onClick={() => router.push("/nova/lab")} className={btnPrimary}>Go to lab queue →</button>
            <button onClick={() => { setSubmitted(false); setSelected([]); }} className={btnSecondary}>New order</button>
          </div>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Lab Order"
      subtitle={visit ? `${visit.patient.nameEn} · ${visit.patient.healthId}` : visitId ? "Loading…" : "No visit selected"}
    >
      {!visitId && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm mb-4">
          No visit selected. <a href="/nova/doctor" className="underline">Go to doctor queue →</a>
        </div>
      )}
      <div className="max-w-xl space-y-5">
        <Card className="p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Select tests</h3>
          <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto pr-1">
            {availableTests.map((t) => (
              <label
                key={t.name}
                className="flex items-center justify-between p-2.5 rounded border border-slate-100 hover:border-teal-300 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selected.includes(t.name)}
                    onChange={() => toggle(t.name)}
                    className="accent-teal-600 w-4 h-4"
                  />
                  <span className="text-sm text-slate-700">{t.name}</span>
                </div>
                {t.price !== undefined && (
                  <span className="text-xs px-2 py-0.5 rounded font-medium bg-slate-100 text-slate-600">
                    ETB {t.price}
                  </span>
                )}
              </label>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Order details</h3>
          <div className="space-y-3">
            <FormField label="Priority">
              <select className={inputCls} value={priority} onChange={(e) => setPriority(e.target.value as "routine" | "urgent")}>
                <option value="routine">Routine</option>
                <option value="urgent">Urgent</option>
              </select>
            </FormField>
            <FormField label="Clinical indication">
              <textarea className={`${inputCls} resize-none h-16`} value={indication} onChange={(e) => setIndication(e.target.value)} placeholder="Any relevant clinical context…" />
            </FormField>
          </div>
        </Card>

        {selected.length > 0 && (
          <p className="text-sm text-teal-700">{selected.length} test{selected.length > 1 ? "s" : ""} selected</p>
        )}
        {orderLab.error && <p className="text-sm text-red-600">{orderLab.error.message}</p>}

        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            disabled={selected.length === 0 || !visitId || orderLab.isPending}
            className={`${btnPrimary} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {orderLab.isPending ? "Sending…" : "Send to lab →"}
          </button>
          <button onClick={() => router.back()} className={btnSecondary}>Cancel</button>
        </div>
      </div>
    </PageShell>
  );
}

export default function LabOrderPage() {
  return (
    <Suspense fallback={<PageShell title="Lab Order"><p className="p-4 text-slate-400">Loading…</p></PageShell>}>
      <LabOrderContent />
    </Suspense>
  );
}
