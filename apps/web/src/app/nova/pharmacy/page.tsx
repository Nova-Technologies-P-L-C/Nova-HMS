"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { PageShell, KpiCard, Card, StatusBadge } from "@/components/nova/nova-ui";
import { CheckCircle, Pill } from "lucide-react";

export default function PharmacyQueuePage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<"pending" | "dispensed">("pending");

  const { data: rxList = [], isLoading } = useQuery({
    ...trpc.prescription.queue.queryOptions(),
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const { data: dispensedList = [] } = useQuery({
    ...trpc.prescription.dispensed.queryOptions(),
    refetchOnMount: true,
  });

  const dispense = useMutation(
    trpc.prescription.dispense.mutationOptions({
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: trpc.prescription.queue.queryKey() });
        qc.invalidateQueries({ queryKey: trpc.prescription.dispensed.queryKey() });
        setSelected(null);
      },
    })
  );

  const selectedRx = rxList.find((r) => r.id === selected);

  const calcQty = (freq: string, days: number) =>
    days * (freq.includes("3x") || freq.includes("3 x") ? 3 : freq.includes("2x") || freq.includes("2 x") ? 2 : freq.includes("4x") ? 4 : 1);

  const shownList = tab === "pending" ? rxList : dispensedList;

  return (
    <PageShell title="Prescription Queue" subtitle="Dispense medications to patients">
      <div className="grid grid-cols-3 gap-4 mb-6">
        <KpiCard label="Pending" value={rxList.length} accent={rxList.length > 0} />
        <KpiCard label="Dispensed today" value={dispensedList.length} />
        <KpiCard label="Total" value={rxList.length + dispensedList.length} />
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 mb-4">
        <button onClick={() => setTab("pending")}
          className={`px-4 py-1.5 text-sm rounded border transition-colors ${tab === "pending" ? "bg-teal-600 text-white border-teal-600" : "bg-white border-slate-200 text-slate-600 hover:border-teal-400"}`}>
          Pending ({rxList.length})
        </button>
        <button onClick={() => setTab("dispensed")}
          className={`px-4 py-1.5 text-sm rounded border transition-colors ${tab === "dispensed" ? "bg-teal-600 text-white border-teal-600" : "bg-white border-slate-200 text-slate-600 hover:border-teal-400"}`}>
          Dispensed ({dispensedList.length})
        </button>
      </div>

      {isLoading && <p className="text-sm text-slate-400 py-4">Loading…</p>}

      {!isLoading && shownList.length === 0 && (
        <Card className="p-12 text-center">
          <Pill size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">{tab === "pending" ? "No pending prescriptions." : "No dispensed prescriptions yet."}</p>
        </Card>
      )}

      <div className="space-y-3">
        {shownList.map((rx) => {
          const isSelected = selected === rx.id;
          return (
            <Card key={rx.id} className={`overflow-hidden transition-all ${isSelected ? "border-teal-400" : ""}`}>
              {/* Header row */}
              <div
                className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50 ${rx.status === "pending" ? "" : "bg-slate-50"}`}
                onClick={() => setSelected(isSelected ? null : rx.id)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 font-bold text-xs flex items-center justify-center shrink-0">
                    {rx.visit.patient.nameEn.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{rx.visit.patient.nameEn}</p>
                    <p className="text-xs text-slate-400">{rx.visit.patient.healthId} · {rx.lines.length} medication{rx.lines.length > 1 ? "s" : ""}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {rx.visit.patient.cbhiStatus && (
                    <span className="text-xs text-teal-600 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">CBHI</span>
                  )}
                  <StatusBadge status={rx.status} />
                  <span className="text-xs text-slate-400">{new Date(rx.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </div>

              {/* Expanded detail */}
              {isSelected && (
                <div className="border-t border-slate-100 px-4 py-4 space-y-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Medications</p>
                  {rx.lines.map((l) => {
                    const qty = calcQty(l.frequency, l.durationDays);
                    return (
                      <div key={l.id} className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <div>
                          <p className="text-xs text-slate-400">Drug</p>
                          <p className="font-semibold text-slate-800">{l.itemName}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Dose</p>
                          <p>{l.dose}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Frequency</p>
                          <p>{l.frequency}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Duration</p>
                          <p>{l.durationDays} days</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Qty to dispense</p>
                          <p className="font-bold text-teal-700 text-base">{qty} units</p>
                        </div>
                      </div>
                    );
                  })}

                  {rx.status === "pending" && (
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => dispense.mutate({ prescriptionId: rx.id })}
                        disabled={dispense.isPending}
                        className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 disabled:opacity-50 font-medium"
                      >
                        <CheckCircle size={15} />
                        {dispense.isPending ? "Dispensing…" : "Confirm & dispense"}
                      </button>
                    </div>
                  )}

                  {rx.status === "dispensed" && (
                    <div className="flex items-center gap-2 text-teal-600 text-sm">
                      <CheckCircle size={15} /> Dispensed
                    </div>
                  )}

                  {dispense.error && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                      {dispense.error.message}
                    </p>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </PageShell>
  );
}
