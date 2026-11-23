"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { PageShell, Card, inputCls, btnPrimary, btnSecondary } from "@/components/nova/nova-ui";
import {
  CheckCircle,
  FileText,
  Search,
  Bed,
  UserCheck,
  Clock,
  Sparkles,
  ClipboardList,
  Send,
  X,
  RefreshCw,
  Activity,
  Pill,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

const NOTE_TEMPLATES = [
  {
    label: "Routine Shift Round",
    category: "Shift Round",
    text: "Patient resting comfortably in bed. Vitals monitored and stable. No acute distress reported. Tolerating oral diet and fluids well. Call bell within easy reach.",
  },
  {
    label: "IV Line & Therapy",
    category: "IV Care",
    text: "Peripheral IV cannula patent and secure. No erythema, tenderness, or swelling observed. Prescribed intravenous fluids running at designated drop rate.",
  },
  {
    label: "Wound Dressing",
    category: "Wound Care",
    text: "Surgical wound dressing inspected and renewed using aseptic technique. Incision site clean, margins well-approximated, no active bleeding or discharge.",
  },
  {
    label: "Medicine Given",
    category: "Medication",
    text: "Scheduled doses administered per medicine plan. Patient swallowed medication with water. Monitored with zero adverse reaction.",
  },
  {
    label: "Doctor Follow-up",
    category: "Doctor Orders",
    text: "Attending physician conducted ward rounds and updated treatment plan. New orders noted and executed.",
  },
];

function calculateAge(dobString?: string) {
  if (!dobString) return "—";
  const birth = new Date(dobString);
  if (isNaN(birth.getTime())) return "—";
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    years--;
  }
  return years > 0 ? `${years}y` : "< 1y";
}

function NurseNotesContent() {
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const paramPatientId = searchParams.get("patientId") || "";

  const [selectedPatientId, setSelectedPatientId] = useState<string>(paramPatientId);
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const [selectedWard, setSelectedWard] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [noteCategory, setNoteCategory] = useState("Shift Round");
  const [noteTitle, setNoteTitle] = useState("");
  const [newNote, setNewNote] = useState("");
  const [saved, setSaved] = useState(false);

  // Load active ward admissions (strictly inpatients)
  const {
    data: admissions = [],
    isLoading: loadingAdmissions,
    refetch: refetchAdmissions,
    isRefetching: isAdmissionsRefetching,
  } = useQuery({
    ...trpc.ward.admissions.queryOptions(),
    refetchOnMount: true,
  });

  // Automatically select first patient or patient from URL parameter
  useEffect(() => {
    if (paramPatientId) {
      setSelectedPatientId(paramPatientId);
    } else if (!selectedPatientId && admissions.length > 0) {
      setSelectedPatientId(admissions[0].patientId);
      setSelectedVisitId(admissions[0].visitId || null);
    }
  }, [paramPatientId, admissions, selectedPatientId]);

  // When selected patient changes, keep visitId in sync
  useEffect(() => {
    if (selectedPatientId) {
      const match = admissions.find((a) => a.patientId === selectedPatientId);
      if (match) {
        setSelectedVisitId(match.visitId || null);
      }
    }
  }, [selectedPatientId, admissions]);

  // Load patient notes history
  const {
    data: patientNotes = [],
    refetch: refetchNotes,
    isLoading: loadingNotes,
  } = useQuery({
    ...trpc.visit.patientNotes.queryOptions({ patientId: selectedPatientId || "" }),
    enabled: !!selectedPatientId,
  });

  const addNote = useMutation(
    trpc.visit.addNote.mutationOptions({
      onSuccess: () => {
        setNewNote("");
        setNoteTitle("");
        setSaved(true);
        refetchNotes();
        qc.invalidateQueries({ queryKey: trpc.visit.get.queryKey() });
        toast.success("Nurse note saved successfully");
        setTimeout(() => setSaved(false), 3500);
      },
      onError: (err) => {
        toast.error(err.message || "Failed to save note");
      },
    })
  );

  // Wards list
  const wards = useMemo(() => {
    const list = Array.from(new Set(admissions.map((a) => a.bed?.ward).filter(Boolean)));
    return ["All", ...list];
  }, [admissions]);

  // Filter admissions by ward & search
  const filteredAdmissions = useMemo(() => {
    return admissions.filter((a) => {
      const matchesWard = selectedWard === "All" || a.bed?.ward === selectedWard;
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        a.patient?.nameEn?.toLowerCase().includes(q) ||
        a.patient?.nameAm?.includes(q) ||
        a.patient?.healthId?.toLowerCase().includes(q) ||
        a.bed?.room?.toLowerCase().includes(q) ||
        a.bed?.ward?.toLowerCase().includes(q);

      return matchesWard && matchesSearch;
    });
  }, [admissions, selectedWard, search]);

  const selectedAdmission = admissions.find((a) => a.patientId === selectedPatientId) || null;

  const handleSelectPatient = (patientId: string, visitId?: string | null) => {
    setSelectedPatientId(patientId);
    setSelectedVisitId(visitId || null);
    setSaved(false);
  };

  const handleSaveNote = async () => {
    if (!newNote.trim() || !selectedPatientId) return;

    await addNote.mutateAsync({
      patientId: selectedPatientId,
      visitId: selectedVisitId || undefined,
      noteType: "nursing",
      chiefComplaint: noteTitle.trim() || noteCategory,
      examination: `[${noteCategory}] ${newNote.trim()}`,
      assessment: noteCategory,
      plan: "",
    });
  };

  const handleApplyTemplate = (tmpl: (typeof NOTE_TEMPLATES)[0]) => {
    setNoteCategory(tmpl.category);
    setNoteTitle(tmpl.label);
    setNewNote(tmpl.text);
  };

  return (
    <PageShell
      title="Nurse Notes"
      subtitle="Shift rounds, bedside clinical observations, and patient care history"
      action={
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              refetchAdmissions();
              refetchNotes();
            }}
            disabled={isAdmissionsRefetching}
            className="p-2 text-xs font-medium rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-xs"
            title="Refresh notes and patients"
          >
            <RefreshCw size={14} className={isAdmissionsRefetching ? "animate-spin text-teal-600" : ""} />
          </button>

          <Link
            href="/nova/nurse"
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Bed size={14} className="text-teal-600" />
            <span>Ward Patients</span>
          </Link>

          <Link
            href="/nova/nurse/mar"
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Pill size={14} className="text-teal-600" />
            <span>Give Medicines</span>
          </Link>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start pb-12 w-full max-w-[1700px] mx-auto">
        {/* ── LEFT COLUMN: ADMITTED WARD PATIENTS LIST (NO OPD) ── */}
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
            {/* Header & Count */}
            <div className="p-3 border-b border-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bed size={16} className="text-teal-600" />
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                    Ward Patients ({filteredAdmissions.length})
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400">
                  Admitted inpatients
                </span>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search patient, bed, or ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={`${inputCls} pl-8.5 pr-7 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80`}
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Ward filter pills */}
              <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-thin">
                {wards.map((ward) => {
                  const isActive = selectedWard === ward;
                  return (
                    <button
                      key={ward}
                      onClick={() => setSelectedWard(ward)}
                      className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold transition-all shrink-0 ${
                        isActive
                          ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                      }`}
                    >
                      {ward === "All" ? "All Wards" : ward}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Patients List */}
            <div className="max-h-[620px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {loadingAdmissions && (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Loading admitted patients…
                </div>
              )}

              {!loadingAdmissions && filteredAdmissions.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-xs space-y-2">
                  <p>No admitted patients found.</p>
                  <Link
                    href="/nova/ward/admissions"
                    className="inline-block text-teal-600 dark:text-teal-400 font-semibold hover:underline"
                  >
                    Admit a patient →
                  </Link>
                </div>
              )}

              {filteredAdmissions.map((a) => {
                const isSelected = selectedPatientId === a.patientId;
                const patient = a.patient;
                const bed = a.bed;

                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => handleSelectPatient(a.patientId, a.visitId)}
                    className={`w-full text-left p-3 transition-colors flex items-center justify-between ${
                      isSelected
                        ? "bg-teal-50/70 dark:bg-teal-950/40 border-l-4 border-teal-600 dark:border-teal-400"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-bold text-xs truncate ${
                            isSelected
                              ? "text-teal-950 dark:text-teal-100"
                              : "text-slate-800 dark:text-slate-200"
                          }`}
                        >
                          {patient?.nameEn || "Patient"}
                        </span>
                        {patient?.nameAm && (
                          <span className="text-[10px] text-slate-400 truncate">
                            ({patient.nameAm})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                        <span className="font-semibold text-slate-600 dark:text-slate-300">
                          Bed {bed?.room}
                        </span>
                        <span>•</span>
                        <span>{bed?.ward || "Ward"}</span>
                        <span>•</span>
                        <span className="font-mono text-[10px]">{patient?.healthId}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-1">
                        <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded text-slate-600 dark:text-slate-300">
                          Day {a.daysElapsed || 1}
                        </span>
                        <span>Nurse: {a.assignedNurseName || "On duty"}</span>
                      </div>
                    </div>

                    <ChevronRight
                      size={14}
                      className={
                        isSelected ? "text-teal-600 dark:text-teal-400" : "text-slate-300"
                      }
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: NOTE WRITER & CARE HISTORY ── */}
        <div className="lg:col-span-8 space-y-4">
          {!selectedAdmission ? (
            <Card className="p-16 text-center border-dashed border-2 border-slate-200 dark:border-slate-800">
              <ClipboardList size={40} className="text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="font-bold text-slate-700 dark:text-slate-300 text-base mb-1">
                Select a Ward Patient to Write Notes
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Choose an admitted patient from the left panel to review previous care notes or record a new shift note.
              </p>
            </Card>
          ) : (
            <>
              {/* Selected Patient Banner */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-600 text-white font-black text-sm flex items-center justify-center shrink-0">
                    {selectedAdmission.patient?.nameEn?.slice(0, 2).toUpperCase() || "PT"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base">
                        {selectedAdmission.patient?.nameEn}
                      </h3>
                      {selectedAdmission.patient?.nameAm && (
                        <span className="text-xs text-slate-400">
                          ({selectedAdmission.patient.nameAm})
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                        Bed {selectedAdmission.bed?.room} · {selectedAdmission.bed?.ward}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
                      <span className="font-mono font-medium">ID: {selectedAdmission.patient?.healthId}</span>
                      <span>•</span>
                      <span>
                        {selectedAdmission.patient?.sex?.toUpperCase() === "M" ? "Male" : selectedAdmission.patient?.sex?.toUpperCase() === "F" ? "Female" : "—"}{" "}
                        · {calculateAge(selectedAdmission.patient?.dob)}
                      </span>
                      <span>•</span>
                      <span>Day {selectedAdmission.daysElapsed || 1} Admitted</span>
                      <span>•</span>
                      <span>Duty Nurse: <strong>{selectedAdmission.assignedNurseName || "On duty"}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/nova/nurse/vitals?visitId=${selectedAdmission.visitId || ""}`}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors flex items-center gap-1"
                  >
                    <Activity size={12} className="text-teal-600" />
                    <span>Vitals</span>
                  </Link>
                  <Link
                    href={`/nova/nurse/mar?patientId=${selectedAdmission.patientId}`}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors flex items-center gap-1"
                  >
                    <Pill size={12} className="text-teal-600" />
                    <span>Medicines</span>
                  </Link>
                </div>
              </div>

              {/* Note Input Box */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 border-slate-100 dark:border-slate-800">
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Write Nurse Note</h4>
                    <p className="text-[11px] text-slate-400">Document patient status, observations, and care given</p>
                  </div>

                  {/* Note Category */}
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-slate-400">Category:</span>
                    <select
                      className="text-xs py-1 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium text-slate-700 dark:text-slate-200"
                      value={noteCategory}
                      onChange={(e) => setNoteCategory(e.target.value)}
                    >
                      <option value="Shift Round">Shift Round</option>
                      <option value="Vitals Observation">Vitals Check</option>
                      <option value="IV Care">IV Therapy</option>
                      <option value="Wound Care">Wound Care</option>
                      <option value="Medication">Medicine Given</option>
                      <option value="Doctor Orders">Doctor Orders</option>
                    </select>
                  </div>
                </div>

                {/* 1-Click Fast Templates */}
                <div>
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2">
                    <Sparkles size={12} className="text-teal-600" />
                    <span>Quick templates:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {NOTE_TEMPLATES.map((tmpl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleApplyTemplate(tmpl)}
                        className="text-[11px] px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 hover:text-teal-700 dark:hover:text-teal-300 hover:border-teal-300 border border-slate-200 dark:border-slate-700 transition-colors text-slate-600 dark:text-slate-300 font-medium"
                      >
                        + {tmpl.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Optional Note Heading / Title */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Subject / Focus (Optional)
                  </label>
                  <input
                    type="text"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    placeholder="e.g. Morning Shift Round, Pre-op Check, Wound Cleaned…"
                    className={`${inputCls} text-xs py-2`}
                  />
                </div>

                {/* Main Note Body */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Observation & Care Given
                  </label>
                  <textarea
                    rows={4}
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Type details about the patient's condition, care given, vital changes, or physician instructions…"
                    className={`${inputCls} text-xs py-2.5 resize-y leading-relaxed`}
                  />
                </div>

                {saved && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                    <CheckCircle size={16} className="text-emerald-600 shrink-0" />
                    <span className="font-medium">Nurse note saved successfully.</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400">
                    Visible to doctors and nurses on duty
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setNewNote("");
                        setNoteTitle("");
                      }}
                      className={btnSecondary}
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      disabled={!newNote.trim() || addNote.isPending}
                      onClick={handleSaveNote}
                      className={`${btnPrimary} flex items-center gap-1.5`}
                    >
                      <Send size={13} />
                      <span>{addNote.isPending ? "Saving…" : "Save Note"}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Past Nursing Notes History */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-1.5">
                    <FileText size={15} className="text-teal-600" />
                    <span>Past Notes History</span>
                  </h4>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {patientNotes.length} note{patientNotes.length === 1 ? "" : "s"} recorded
                  </span>
                </div>

                {loadingNotes ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    Loading notes…
                  </div>
                ) : patientNotes.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl">
                    <p className="text-xs text-slate-400">
                      No notes recorded yet for this patient. Write the first note above.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {patientNotes.map((n) => (
                      <div
                        key={n.id}
                        className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 border-l-teal-500 rounded-xl shadow-xs"
                      >
                        <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-100 dark:border-slate-800 text-xs">
                          <span className="font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wider text-[11px]">
                            {n.chiefComplaint || n.noteType.toUpperCase()}
                          </span>
                          <span className="text-slate-400 font-mono text-[11px]">
                            {new Date(n.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                          {n.examination || n.plan || n.assessment || "Note entry"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </PageShell>
  );
}

export default function NursingNotesPage() {
  return (
    <Suspense
      fallback={
        <PageShell title="Nurse Notes">
          <div className="p-12 text-center text-slate-400 text-sm">
            Loading Nurse Notes…
          </div>
        </PageShell>
      }
    >
      <NurseNotesContent />
    </Suspense>
  );
}
