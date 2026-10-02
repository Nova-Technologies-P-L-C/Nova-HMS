"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { PageShell, Card, StatusBadge } from "@/components/nova/nova-ui";
import { FileText } from "lucide-react";

const SCHEDULE = ["08:00", "14:00", "20:00"];
type AdminRecord = Record<string, Record<string, "given" | "held" | "refused" | null>>;

const STATUS_STYLE: Record<string, string> = {
  given: "bg-teal-500 text-white",
  held: "bg-amber-400 text-white",
  refused: "bg-red-400 text-white",
};

export default function MARPage() {
  const qc = useQueryClient();
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [records, setRecords] = useState<AdminRecord>({});

  const { data: admissions = [], isLoading } = useQuery({
    ...trpc.ward.admissions.queryOptions(),
    refetchOnMount: true,
  });

  // Get prescriptions for the selected patient via the queue visits
  const { data: queue = [] } = useQuery(trpc.visit.queue.queryOptions());
  const patientTicket = queue.find((q) => q.visit.patientId === selectedPatientId);

  const { data: visitDetail } = useQuery({
    ...trpc.visit.get.queryOptions({ visitId: patientTicket?.visitId ?? "" }),
    enabled: !!patientTicket?.visitId,
  });

  const dispense = useMutation(trpc.prescription.dispense.mutationOptions({
    onSuccess: () => qc.invalidateQueries({ queryKey: trpc.visit.get.queryKey() }),
  }));

  const mark = (rxId: string, time: string, status: "given" | "held" | "refused") => {
    setRecords((prev) => ({ ...prev, [rxId]: { ...prev[rxId], [time]: status } }));
    // Mark as dispensed on "given"
    if (status === "given") {
      dispense.mutate({ prescriptionId: rxId });
    }
  };

  const selectedAdmission = admissions.find((a) => a.patientId === selectedPatientId);
  const prescriptions = visitDetail?.prescriptions ?? [];

  return (
    <PageShell title="Medication Administration Record">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        {/* Patient list */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Ward patients
          </p>
          {isLoading && <p className="text-sm text-slate-400">Loading…</p>}
          {!isLoading && admissions.length === 0 && (
            <p className="text-sm text-slate-400">No admitted patients.</p>
          )}
          {admissions.map((a) => (
            <button
              key={a.id}
              onClick={() => setSelectedPatientId(a.patientId)}
              className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                selectedPatientId === a.patientId
                  ? "border-teal-500 bg-teal-50"
                  : "border-slate-200 bg-white hover:border-teal-300"
              }`}
            >
              <p className="font-medium text-slate-800">{a.patient.nameEn}</p>
              <p className="text-xs text-slate-500">{a.bed.ward} · Bed {a.bed.room}</p>
            </button>
          ))}
        </div>

        {/* MAR table */}
        <div className="md:col-span-3">
          {!selectedPatientId ? (
            <Card className="p-12 text-center">
              <FileText size={32} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Select a patient to view their MAR.</p>
            </Card>
          ) : (
            <Card>
              {selectedAdmission && (
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                  <p className="font-semibold text-slate-800">{selectedAdmission.patient.nameEn}</p>
                  <p className="text-xs text-slate-500">{selectedAdmission.bed.ward} · Bed {selectedAdmission.bed.room}</p>
                </div>
              )}
              {prescriptions.length === 0 ? (
                <p className="px-4 py-8 text-sm text-slate-400 text-center">No prescriptions found for this patient.</p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Medication</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                          {SCHEDULE.map((t) => (
                            <th key={t} className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">{t}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {prescriptions.map((rx) =>
                          rx.lines.map((line) => (
                            <tr key={line.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                              <td className="px-4 py-3">
                                <p className="font-medium text-slate-800">{line.itemName}</p>
                                <p className="text-xs text-slate-400">{line.dose} · {line.frequency}</p>
                              </td>
                              <td className="px-4 py-3"><StatusBadge status={rx.status} /></td>
                              {SCHEDULE.map((t) => {
                                const val = records[line.id]?.[t];
                                return (
                                  <td key={t} className="px-4 py-3 text-center">
                                    {val ? (
                                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLE[val]}`}>{val}</span>
                                    ) : (
                                      <div className="flex gap-1 justify-center">
                                        <button onClick={() => mark(line.id, t, "given")} className="w-6 h-6 text-xs bg-teal-50 text-teal-600 rounded hover:bg-teal-100 border border-teal-200" title="Given">G</button>
                                        <button onClick={() => mark(line.id, t, "held")} className="w-6 h-6 text-xs bg-amber-50 text-amber-600 rounded hover:bg-amber-100 border border-amber-200" title="Held">H</button>
                                        <button onClick={() => mark(line.id, t, "refused")} className="w-6 h-6 text-xs bg-red-50 text-red-500 rounded hover:bg-red-100 border border-red-200" title="Refused">R</button>
                                      </div>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex gap-4 text-xs text-slate-500">
                    <span><span className="inline-block w-3 h-3 bg-teal-500 rounded-full mr-1" />G = Given</span>
                    <span><span className="inline-block w-3 h-3 bg-amber-400 rounded-full mr-1" />H = Held</span>
                    <span><span className="inline-block w-3 h-3 bg-red-400 rounded-full mr-1" />R = Refused</span>
                  </div>
                </>
              )}
            </Card>
          )}
        </div>
      </div>
    </PageShell>
  );
}
