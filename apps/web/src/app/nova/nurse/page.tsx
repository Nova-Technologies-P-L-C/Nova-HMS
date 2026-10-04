"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { PageShell, KpiCard, Card, StatusBadge } from "@/components/nova/nova-ui";

export default function NurseDashboard() {
  const { data: admissions = [], isLoading } = useQuery({
    ...trpc.ward.admissions.queryOptions(),
    refetchOnMount: true,
  });

  return (
    <PageShell
      title="Ward Nurse Dashboard"
      subtitle="Inpatient Bed Census · MAR drug administration · Bedside care & nursing shift handover"
      action={
        <Link
          href={"/nova/triage" as any}
          className="px-3.5 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-1.5 shadow-sm"
        >
          <span>🩺</span> Go to Triage Station →
        </Link>
      }
    >
      <div className="grid grid-cols-3 gap-4 mb-6">
        <KpiCard label="Assigned patients" value={admissions.length} accent />
        <KpiCard label="Vitals due" value={admissions.length} sub="check each patient" />
        <KpiCard label="MAR pending" value={admissions.length} sub="medications due" />
      </div>

      <Card>
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="font-medium text-slate-800 text-sm">Admitted patients</p>
        </div>
        {isLoading && <p className="px-4 py-6 text-sm text-slate-400">Loading…</p>}
        {!isLoading && admissions.length === 0 && (
          <p className="px-4 py-8 text-sm text-slate-400 text-center">No patients currently admitted to any ward.</p>
        )}
        <div className="divide-y divide-slate-50">
          {admissions.map((a) => (
            <div key={a.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="text-center w-14">
                  <p className="text-xs text-slate-400">{a.bed.ward}</p>
                  <p className="font-bold text-slate-700">Bed {a.bed.room}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{a.patient.nameEn}</p>
                  <p className="text-xs text-slate-400">
                    Admitted {new Date(a.admittedAt).toLocaleDateString()} · {a.patient.healthId}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status="occupied" />
                <div className="flex gap-1">
                  <Link href="/nova/nurse/vitals" className="text-xs px-2 py-1 bg-teal-50 text-teal-700 rounded border border-teal-200 hover:bg-teal-100">Vitals</Link>
                  <Link href="/nova/nurse/mar" className="text-xs px-2 py-1 bg-slate-50 text-slate-700 rounded border border-slate-200 hover:bg-slate-100">MAR</Link>
                  <Link href="/nova/nurse/notes" className="text-xs px-2 py-1 bg-slate-50 text-slate-700 rounded border border-slate-200 hover:bg-slate-100">Notes</Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </PageShell>
  );
}
