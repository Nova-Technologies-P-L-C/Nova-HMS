"use client";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { PageShell, Card, StatusBadge } from "@/components/nova/nova-ui";

const TABS = ["History", "Vitals", "Lab Results", "Prescriptions"] as const;
type Tab = (typeof TABS)[number];

function EMRContent() {
  const [tab, setTab] = useState<Tab>("History");
  const params = useSearchParams();
  const visitId = params.get("visitId") ?? "";
  const patientId = params.get("patientId") ?? "";

  // Load visit detail which includes patient, vitals, diagnoses, lab orders + results, prescriptions
  const { data: visit, isLoading } = useQuery({
    ...trpc.visit.get.queryOptions({ visitId: visitId || "" }),
    enabled: !!visitId,
  });

  // If patientId is passed instead (old links), search queue for their visit
  const { data: queue = [] } = useQuery({
    ...trpc.visit.queue.queryOptions(),
    enabled: !visitId && !!patientId,
  });
  const queueEntry = !visitId && patientId
    ? queue.find((q) => q.visit.patientId === patientId)
    : null;

  const { data: visitFromQueue } = useQuery({
    ...trpc.visit.get.queryOptions({ visitId: queueEntry?.visitId ?? "" }),
    enabled: !!queueEntry?.visitId,
  });

  const activeVisit = visit ?? visitFromQueue;
  const patient = activeVisit?.patient;
  const activeVisitId = visitId || queueEntry?.visitId || "";

  if (!visitId && !patientId) {
    return (
      <PageShell title="Patient EMR">
        <p className="text-slate-500 p-4">
          No patient selected.{" "}
          <Link href="/nova/doctor" className="text-teal-600 hover:underline">Go to queue →</Link>
        </p>
      </PageShell>
    );
  }

  if (isLoading) {
    return <PageShell title="Patient EMR"><p className="p-4 text-slate-400">Loading…</p></PageShell>;
  }

  if (!patient) {
    return (
      <PageShell title="Patient EMR">
        <p className="text-red-500 p-4">Patient not found.</p>
      </PageShell>
    );
  }

  const labOrders = activeVisit?.labOrders ?? [];
  const prescriptions = activeVisit?.prescriptions ?? [];
  const vitals = activeVisit?.vitals ?? [];
  const diagnoses = activeVisit?.diagnoses ?? [];

  return (
    <PageShell
      title="Patient EMR"
      subtitle={`${patient.nameEn} · ${patient.healthId}`}
      action={
        <Link
          href={`/nova/doctor/consultation?visitId=${activeVisitId}`}
          className="px-4 py-2 bg-teal-600 text-white text-sm rounded hover:bg-teal-700 font-medium"
        >
          Start consultation →
        </Link>
      }
    >
      <div className="flex items-center gap-2 mb-5 text-xs text-slate-500">
        <span className="px-2 py-1 bg-slate-200 rounded">1 Register</span>
        <span className="text-slate-300">→</span>
        <span className="px-2 py-1 bg-slate-200 rounded">2 Triage</span>
        <span className="text-slate-300">→</span>
        <span className="px-2 py-1 bg-teal-600 text-white rounded font-medium">3 EMR Review</span>
        <span className="text-slate-300">→</span>
        <span className="px-2 py-1 bg-slate-100 rounded">4 Consultation</span>
        <span className="text-slate-300">→</span>
        <span className="px-2 py-1 bg-slate-100 rounded">5 Treatment</span>
      </div>

      {/* Patient card */}
      <Card className="p-4 mb-5 flex flex-wrap gap-5 items-start">
        <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-700 font-bold text-sm flex items-center justify-center shrink-0">
          {patient.nameEn.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Name", value: patient.nameEn + (patient.nameAm ? ` (${patient.nameAm})` : "") },
            { label: "DOB", value: patient.dob },
            { label: "Sex", value: patient.sex === "M" ? "Male" : "Female" },
            { label: "Phone", value: patient.phone || "—" },
            { label: "Health ID", value: patient.healthId },
            { label: "Kebele", value: patient.kebele || "—" },
            { label: "CBHI", value: patient.cbhiStatus ? "✓ Enrolled" : "Not enrolled" },
          ].map((f) => (
            <div key={f.label}>
              <p className="text-xs text-slate-400">{f.label}</p>
              <p className="text-sm text-slate-800 font-medium">{f.value}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto">
        {TABS.map((t) => {
          const count = t === "Lab Results" ? labOrders.length
            : t === "Prescriptions" ? prescriptions.length
            : t === "Vitals" ? vitals.length
            : diagnoses.length;
          return (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 text-sm rounded whitespace-nowrap flex items-center gap-1.5 ${tab === t ? "bg-teal-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-teal-400"}`}>
              {t}
              {count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t ? "bg-teal-500" : "bg-slate-100 text-slate-500"}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* History tab */}
      {tab === "History" && (
        <div className="space-y-3">
          {diagnoses.length === 0 && <p className="text-slate-400 text-sm">No diagnoses recorded yet.</p>}
          {diagnoses.map((d) => (
            <Card key={d.id} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded mr-2">{d.icdCode}</span>
                  <span className="font-medium text-slate-800">{d.description}</span>
                </div>
                <span className="text-xs text-slate-400 shrink-0">{new Date(d.diagnosedAt).toLocaleDateString()}</span>
              </div>
              {d.notes && <p className="text-sm text-slate-600">{d.notes}</p>}
            </Card>
          ))}
        </div>
      )}

      {/* Vitals tab */}
      {tab === "Vitals" && (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {["Date", "BP", "HR (bpm)", "Temp (°C)", "SpO₂ (%)", "Weight (kg)"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vitals.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400 text-sm">No vitals recorded yet.</td></tr>
                )}
                {vitals.map((v) => (
                  <tr key={v.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3">{new Date(v.recordedAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">{v.bpSystolic && v.bpDiastolic ? `${v.bpSystolic}/${v.bpDiastolic}` : "—"}</td>
                    <td className="px-4 py-3">{v.heartRate ?? "—"}</td>
                    <td className="px-4 py-3">{v.temperature ?? "—"}</td>
                    <td className="px-4 py-3">{v.spo2 ? `${v.spo2}%` : "—"}</td>
                    <td className="px-4 py-3">{v.weight ? `${v.weight} kg` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Lab Results tab */}
      {tab === "Lab Results" && (
        <div className="space-y-3">
          {labOrders.length === 0 && (
            <p className="text-slate-400 text-sm">No lab orders for this visit.</p>
          )}
          {labOrders.map((o) => {
            const hasResult = !!o.result;
            const resultData = o.result ? (() => {
              try { return JSON.parse(o.result.resultsJson); } catch { return null; }
            })() : null;
            return (
              <Card key={o.id} className={`p-4 ${hasResult ? "border-teal-200" : ""}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-slate-800">{o.testName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Date(o.orderedAt).toLocaleString()} · {o.priority}
                    </p>
                  </div>
                  <StatusBadge status={o.status} />
                </div>
                {hasResult && o.result && (
                  <div className="mt-2 p-3 bg-teal-50 border border-teal-100 rounded-lg">
                    <p className="text-xs font-semibold text-teal-700 mb-1">✓ Result available</p>
                    {resultData && Array.isArray(resultData) && resultData.map((r: { name?: string; value: string }, i: number) => (
                      <p key={i} className="text-sm text-slate-700">
                        {r.name ? `${r.name}: ` : ""}<strong>{r.value}</strong>
                      </p>
                    ))}
                    <p className="text-xs text-teal-600 mt-1 font-medium">
                      Interpretation: {o.result.interpretation}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Entered {new Date(o.result.enteredAt).toLocaleString()}
                    </p>
                  </div>
                )}
                {!hasResult && o.status !== "completed" && (
                  <p className="text-xs text-slate-400 mt-1">Awaiting result from lab…</p>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Prescriptions tab */}
      {tab === "Prescriptions" && (
        <div className="space-y-3">
          {prescriptions.length === 0 && (
            <p className="text-slate-400 text-sm">No prescriptions for this visit.</p>
          )}
          {prescriptions.map((rx) => (
            <Card key={rx.id} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <p className="text-xs text-slate-500">{new Date(rx.createdAt).toLocaleDateString()}</p>
                <StatusBadge status={rx.status} />
              </div>
              {rx.lines.map((l) => (
                <div key={l.id} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
                  <p className="text-sm text-slate-800 font-medium">{l.itemName}</p>
                  <p className="text-xs text-slate-500">{l.dose} · {l.frequency} · {l.durationDays}d</p>
                </div>
              ))}
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
}

export default function EMRPage() {
  return (
    <Suspense fallback={<PageShell title="Patient EMR"><p className="p-4 text-slate-400">Loading…</p></PageShell>}>
      <EMRContent />
    </Suspense>
  );
}
