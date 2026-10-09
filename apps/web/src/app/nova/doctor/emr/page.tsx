"use client";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { PageShell, Card, StatusBadge } from "@/components/nova/nova-ui";
import { PatientHistoryViewer } from "@/components/nova/patient-history-viewer";
import { Pill, FlaskConical, Stethoscope } from "lucide-react";

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

      {/* Quick Action Navigation Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <Link
          href={`/nova/doctor/consultation?visitId=${activeVisitId}`}
          className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white rounded-md text-xs font-semibold hover:bg-teal-700 shadow-xs"
        >
          <Stethoscope size={14} /> Start Consultation
        </Link>
        <Link
          href={`/nova/doctor/prescription?visitId=${activeVisitId}`}
          className="flex items-center gap-1.5 px-4 py-2 bg-teal-50 border border-teal-300 text-teal-700 rounded-md text-xs font-semibold hover:bg-teal-100"
        >
          <Pill size={14} /> Write / Re-prescribe Medications
        </Link>
        <Link
          href={`/nova/doctor/lab-order?visitId=${activeVisitId}`}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 border border-blue-300 text-blue-700 rounded-md text-xs font-semibold hover:bg-blue-100"
        >
          <FlaskConical size={14} /> Order Lab Investigations
        </Link>
      </div>

      {/* Patient Longitudinal History (Prescriptions, Diagnoses, Notes, Labs, Vitals) */}
      <PatientHistoryViewer
        patientId={patient.id}
        visitId={activeVisitId}
        defaultTab="prescriptions"
        showAllergyAdder={true}
      />
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
