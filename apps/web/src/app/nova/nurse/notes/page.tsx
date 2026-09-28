"use client";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { trpc, queryClient } from "@/utils/trpc";
import { PageShell, Card, btnPrimary, btnSecondary, inputCls } from "@/components/nova/nova-ui";
import { CheckCircle, FileText } from "lucide-react";

export default function NursingNotesPage() {
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const [newNote, setNewNote] = useState("");
  const [saved, setSaved] = useState(false);

  // Get all active admissions (ward patients)
  const { data: admissions = [], isLoading: loadingAdmissions } = useQuery({
    ...trpc.ward.admissions.queryOptions(),
    refetchOnMount: true,
  });

  // Get the selected patient's visit detail (for existing notes)
  const { data: visits = [] } = useQuery({
    ...trpc.visit.queue.queryOptions(),
    refetchOnMount: true,
  });

  // Find the most recent open visit for the selected patient via queue
  const patientTicket = visits.find((v) => v.visit.patientId === selectedPatientId);
  const visitId = selectedVisitId || patientTicket?.visitId || null;

  const { data: visitDetail, refetch: refetchVisit } = useQuery({
    ...trpc.visit.get.queryOptions({ visitId: visitId ?? "" }),
    enabled: !!visitId,
  });

  const addNote = useMutation(trpc.visit.addNote.mutationOptions());

  const selectedAdmission = admissions.find((a) => a.patientId === selectedPatientId);

  const handleSaveNote = async () => {
    if (!newNote.trim() || !visitId) return;
    await addNote.mutateAsync({
      visitId,
      noteType: "nursing",
      chiefComplaint: "",
      examination: newNote,
      assessment: "",
      plan: "",
    });
    setNewNote("");
    setSaved(true);
    refetchVisit();
    setTimeout(() => setSaved(false), 3000);
  };

  const nursingNotes = visitDetail?.notes.filter((n) => n.noteType === "nursing") ?? [];

  return (
    <PageShell title="Nursing Notes" subtitle="Select a patient to view and add notes">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* Patient selector */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Ward patients ({admissions.length})
          </p>
          {loadingAdmissions && <p className="text-sm text-slate-400">Loading…</p>}
          {!loadingAdmissions && admissions.length === 0 && (
            <p className="text-sm text-slate-400">No patients currently admitted.</p>
          )}
          {admissions.map((a) => (
            <button
              key={a.id}
              onClick={() => {
                setSelectedPatientId(a.patientId);
                setSelectedVisitId(null);
                setSaved(false);
                setNewNote("");
              }}
              className={`w-full text-left px-3 py-3 rounded-lg border text-sm transition-colors ${
                selectedPatientId === a.patientId
                  ? "border-teal-500 bg-teal-50"
                  : "border-slate-200 bg-white hover:border-teal-300"
              }`}
            >
              <p className="font-medium text-slate-800">{a.patient.nameEn}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {a.bed.ward} · Bed {a.bed.room} · {a.patient.healthId}
              </p>
            </button>
          ))}
        </div>

        {/* Notes panel */}
        <div className="md:col-span-2 space-y-4">
          {!selectedPatientId ? (
            <Card className="p-12 text-center">
              <FileText size={32} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Select a patient from the left to view and add nursing notes.</p>
            </Card>
          ) : (
            <>
              {/* Patient header */}
              {selectedAdmission && (
                <Card className="p-4 bg-slate-50 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-700 font-bold text-sm flex items-center justify-center shrink-0">
                    {selectedAdmission.patient.nameEn.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{selectedAdmission.patient.nameEn}</p>
                    <p className="text-xs text-slate-500">
                      {selectedAdmission.bed.ward} · Bed {selectedAdmission.bed.room} ·
                      Admitted {new Date(selectedAdmission.admittedAt).toLocaleDateString()}
                    </p>
                  </div>
                </Card>
              )}

              {/* Add note */}
              <Card className="p-5">
                <h3 className="font-semibold text-slate-800 mb-3">New nursing note</h3>
                {!visitId && (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-3">
                    No open visit found for this patient — notes require an active visit.
                  </p>
                )}
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className={`${inputCls} resize-none h-28 mb-3`}
                  placeholder="Enter nursing observation, care given, patient response, medications administered…"
                  disabled={!visitId}
                />
                {saved && (
                  <div className="flex items-center gap-2 text-teal-600 text-xs mb-2">
                    <CheckCircle size={14} /> Note saved successfully
                  </div>
                )}
                {addNote.error && (
                  <p className="text-xs text-red-600 mb-2">{addNote.error.message}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveNote}
                    disabled={!newNote.trim() || !visitId || addNote.isPending}
                    className={`${btnPrimary} disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {addNote.isPending ? "Saving…" : "Save note"}
                  </button>
                  <button onClick={() => setNewNote("")} className={btnSecondary}>Clear</button>
                </div>
              </Card>

              {/* Previous notes */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Previous notes ({nursingNotes.length})
                </p>
                {nursingNotes.length === 0 && (
                  <p className="text-sm text-slate-400">No nursing notes recorded yet for this visit.</p>
                )}
                {nursingNotes.map((n) => (
                  <Card key={n.id} className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-medium text-teal-700">Nurse</p>
                      <p className="text-xs text-slate-400">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">{n.examination}</p>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </PageShell>
  );
}
