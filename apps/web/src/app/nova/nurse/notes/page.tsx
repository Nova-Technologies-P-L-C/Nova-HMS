"use client";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { PageShell, Card, btnPrimary, btnSecondary, inputCls } from "@/components/nova/nova-ui";
import {
  CheckCircle,
  FileText,
  Search,
  Bed,
  UserCheck,
  Clock,
  Sparkles,
  ClipboardList,
  ShieldCheck,
  Send,
} from "lucide-react";

const NOTE_TEMPLATES = [
  {
    label: "Routine Shift Round",
    category: "Shift Round",
    text: "Patient resting comfortably in bed. Vitals monitored and stable. No acute distress reported. Tolerating oral diet and fluids well. Call bell within easy reach.",
  },
  {
    label: "IV Line & Therapy",
    category: "IV Care",
    text: "Peripheral IV cannula patent and secure. No erythema, tenderness, or infiltration observed. Prescribed intravenous infusion running at designated drop rate.",
  },
  {
    label: "Wound Dressing",
    category: "Wound Care",
    text: "Surgical wound dressing inspected and renewed using aseptic technique. Incision site clean, margins well-approximated, no active bleeding or purulent discharge.",
  },
  {
    label: "Medication Administered",
    category: "Medication",
    text: "Scheduled doses administered per MAR after double-checking 5 rights. Patient swallowed medication with water. Monitored for 30 minutes with zero adverse reaction.",
  },
  {
    label: "Doctor Follow-up",
    category: "Doctor Orders",
    text: "Attending physician conducted ward rounds and updated treatment plan. New laboratory orders noted and forwarded to laboratory technician.",
  },
];

export default function NursingNotesPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"inpatient" | "opd" | "all">("inpatient");
  const [search, setSearch] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const [noteCategory, setNoteCategory] = useState("Shift Round");
  const [noteTitle, setNoteTitle] = useState("");
  const [newNote, setNewNote] = useState("");
  const [saved, setSaved] = useState(false);

  // Load unified worklist (ward admissions + OPD triage patients)
  const { data: worklist, isLoading: loadingWorklist } = useQuery({
    ...trpc.visit.nurseWorklist.queryOptions(),
    refetchOnMount: true,
  });

  // Load patient notes history
  const { data: patientNotes = [], refetch: refetchNotes } = useQuery({
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
        setTimeout(() => setSaved(false), 3500);
      },
    })
  );

  const wardPatients = worklist?.wardAdmissions ?? [];
  const opdPatients = worklist?.opdQueue ?? [];

  // Filter patients based on tab & search
  const filteredList = useMemo(() => {
    let list: Array<{
      id: string;
      patientId: string;
      visitId?: string | null;
      patient: any;
      badge: string;
      subtext: string;
      assignedNurseName: string;
      type: "inpatient" | "opd";
    }> = [];

    if (activeTab === "inpatient" || activeTab === "all") {
      list.push(
        ...wardPatients.map((w) => ({
          id: `inpatient-${w.id}`,
          patientId: w.patientId,
          visitId: w.visitId,
          patient: w.patient,
          badge: `${w.ward} · Bed #${w.room}`,
          subtext: `${w.daysStayed}d stayed`,
          assignedNurseName: w.assignedNurseName,
          type: "inpatient" as const,
        }))
      );
    }

    if (activeTab === "opd" || activeTab === "all") {
      list.push(
        ...opdPatients.map((o) => ({
          id: `opd-${o.id}`,
          patientId: o.patientId,
          visitId: o.visitId,
          patient: o.patient,
          badge: `OPD Ticket ${o.ticketNumber}`,
          subtext: o.status === "urgent" ? "Urgent Triage" : "Waiting",
          assignedNurseName: o.assignedNurseName,
          type: "opd" as const,
        }))
      );
    }

    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (item) =>
        item.patient.nameEn.toLowerCase().includes(q) ||
        item.patient.healthId.toLowerCase().includes(q) ||
        item.badge.toLowerCase().includes(q)
    );
  }, [wardPatients, opdPatients, activeTab, search]);

  const selectedItem = filteredList.find((i) => i.patientId === selectedPatientId);

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

  const handleApplyTemplate = (tmpl: typeof NOTE_TEMPLATES[0]) => {
    setNoteCategory(tmpl.category);
    setNoteTitle(tmpl.label);
    setNewNote(tmpl.text);
  };

  return (
    <PageShell
      title="Nursing Clinical Notes & Observations"
      subtitle="Shift rounds, vital observations, IV therapy & care documentation"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Clear Patient Selector */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="p-4 border-slate-200">
            {/* Tab switchers */}
            <div className="flex p-1 bg-slate-100 rounded-xl mb-3 text-xs font-semibold text-slate-600">
              <button
                type="button"
                onClick={() => setActiveTab("inpatient")}
                className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === "inpatient" ? "bg-white text-teal-700 shadow-xs font-bold" : "hover:text-slate-900"
                }`}
              >
                <Bed size={13} />
                <span>Ward Beds ({wardPatients.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("opd")}
                className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === "opd" ? "bg-white text-teal-700 shadow-xs font-bold" : "hover:text-slate-900"
                }`}
              >
                <Clock size={13} />
                <span>OPD Triage ({opdPatients.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`py-1.5 px-3 rounded-lg transition-all ${
                  activeTab === "all" ? "bg-white text-teal-700 shadow-xs font-bold" : "hover:text-slate-900"
                }`}
              >
                All
              </button>
            </div>

            {/* Live Search */}
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search patient name, MRN, bed…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`${inputCls} pl-8 text-xs`}
              />
            </div>

            {/* Patient List */}
            <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
              {loadingWorklist && (
                <p className="text-xs text-slate-400 py-6 text-center">Loading patients list…</p>
              )}

              {!loadingWorklist && filteredList.length === 0 && (
                <div className="text-center py-10 px-4">
                  <p className="text-xs text-slate-400">No patients found matching this view.</p>
                </div>
              )}

              {filteredList.map((item) => {
                const isSelected = selectedPatientId === item.patientId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectPatient(item.patientId, item.visitId)}
                    className={`w-full text-left p-3 rounded-xl border transition-all text-xs flex flex-col gap-1.5 ${
                      isSelected
                        ? "border-teal-500 bg-teal-50/70 shadow-xs"
                        : "border-slate-200 hover:border-teal-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <p className="font-bold text-slate-900 text-sm">{item.patient.nameEn}</p>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          item.type === "inpatient"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {item.badge}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-500 text-[11px]">
                      <span className="font-mono">{item.patient.healthId}</span>
                      <span>{item.subtext}</span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                      <span className="text-slate-400 flex items-center gap-1">
                        <UserCheck size={11} className="text-teal-600" />
                        <span>Nurse: <strong>{item.assignedNurseName}</strong></span>
                      </span>
                      {item.patient.cbhiStatus && (
                        <span className="text-teal-700 font-bold flex items-center gap-0.5">
                          <ShieldCheck size={10} /> CBHI
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right Column: Note Writer & Patient Clinical History */}
        <div className="lg:col-span-7 space-y-5">
          {!selectedItem ? (
            <Card className="p-16 text-center border-dashed border-2 border-slate-200">
              <ClipboardList size={40} className="text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-slate-700 text-base mb-1">
                Select a Patient to Document Nursing Care
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Click on any admitted ward patient or OPD triage patient from the left column to view their past notes and write new shift observations.
              </p>
            </Card>
          ) : (
            <>
              {/* Patient Banner */}
              <Card className="p-4 bg-gradient-to-r from-teal-50/50 via-white to-white border-teal-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-teal-600 text-white font-black text-sm flex items-center justify-center shrink-0">
                    {selectedItem.patient.nameEn.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">
                      {selectedItem.patient.nameEn}
                    </h3>
                    <p className="text-xs text-slate-500">
                      MRN: <span className="font-mono font-medium">{selectedItem.patient.healthId}</span> · {selectedItem.badge} · Duty Nurse: <strong>{selectedItem.assignedNurseName}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-teal-100 text-teal-800">
                    Active Patient Record
                  </span>
                </div>
              </Card>

              {/* Note Input Box */}
              <Card className="p-5 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 border-slate-100">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Write Nursing Note</h4>
                    <p className="text-[11px] text-slate-400">Document clinical status, care administered, and response</p>
                  </div>

                  {/* Note Category */}
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-slate-400">Category:</span>
                    <select
                      className="text-xs py-1 px-2 rounded-lg border border-slate-200 bg-slate-50 font-medium text-slate-700"
                      value={noteCategory}
                      onChange={(e) => setNoteCategory(e.target.value)}
                    >
                      <option value="Shift Round">Shift Routine Round</option>
                      <option value="Vitals Observation">Vitals Observation</option>
                      <option value="IV Care">IV Therapy & Infusion</option>
                      <option value="Wound Care">Wound Care & Dressing</option>
                      <option value="Medication">Medication Administration</option>
                      <option value="Doctor Orders">Doctor Orders Follow-up</option>
                    </select>
                  </div>
                </div>

                {/* 1-Click Fast Templates */}
                <div>
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 mb-2">
                    <Sparkles size={12} className="text-teal-600" />
                    <span>1-Click Nursing Templates (Click to Auto-fill):</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {NOTE_TEMPLATES.map((tmpl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleApplyTemplate(tmpl)}
                        className="text-[11px] px-2.5 py-1 rounded-md bg-slate-100 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300 border border-slate-200 transition-colors text-slate-600 font-medium"
                      >
                        + {tmpl.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Optional Note Heading / Title */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Note Subject / Focus (Optional)
                  </label>
                  <input
                    type="text"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    placeholder="e.g. Morning Shift Round, Pre-op Preparation, Post-analgesic check…"
                    className={`${inputCls} text-xs py-2`}
                  />
                </div>

                {/* Main Note Body */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Clinical Observation & Nursing Actions
                  </label>
                  <textarea
                    rows={4}
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Type detailed nursing observation, care delivered, vital changes, or patient feedback here…"
                    className={`${inputCls} text-xs py-2.5 resize-y leading-relaxed`}
                  />
                </div>

                {saved && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle size={16} className="text-emerald-600 shrink-0" />
                    <span className="font-medium">Nursing note successfully recorded and permanently saved in patient EMR!</span>
                  </div>
                )}

                {addNote.error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                    {addNote.error.message}
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400">
                    Logged under Nurse account · Visible to Doctors & Care Team
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
                      <span>{addNote.isPending ? "Recording…" : "Save Nursing Note"}</span>
                    </button>
                  </div>
                </div>
              </Card>

              {/* Past Nursing Notes History */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <FileText size={15} className="text-teal-600" />
                    <span>Chronological Care History</span>
                  </h4>
                  <span className="text-xs text-slate-500 font-medium">
                    {patientNotes.length} recorded note{patientNotes.length === 1 ? "" : "s"}
                  </span>
                </div>

                {patientNotes.length === 0 ? (
                  <Card className="p-8 text-center bg-slate-50/50">
                    <p className="text-xs text-slate-400">
                      No notes recorded yet for this patient. Add the first observation above!
                    </p>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {patientNotes.map((n) => (
                      <Card key={n.id} className="p-4 border-l-4 border-l-teal-500">
                        <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-100 text-xs">
                          <span className="font-bold text-teal-800 uppercase tracking-wider text-[11px]">
                            {n.chiefComplaint || n.noteType.toUpperCase()}
                          </span>
                          <span className="text-slate-400 font-mono text-[11px]">
                            {new Date(n.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                          {n.examination || n.plan || n.assessment || "Note entry"}
                        </p>
                      </Card>
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

