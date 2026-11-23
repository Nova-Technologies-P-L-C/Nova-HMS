"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation } from "@tanstack/react-query";
import { trpc, queryClient } from "@/utils/trpc";
import { PageShell, Card, FormField, inputCls, btnPrimary, btnSecondary, StatusBadge } from "@/components/nova/nova-ui";
import {
  CheckCircle,
  History,
  Pill,
  FileText,
  FlaskConical,
  ArrowRight,
  Stethoscope,
  Bed,
  ShieldAlert,
  Clock,
  Activity,
  Heart,
  Thermometer,
  Wind,
  Weight,
  AlertTriangle,
  Sparkles,
  ChevronRight,
  Search,
  X,
  Plus,
  Calendar,
  Eye,
  ShieldCheck,
  HeartPulse,
  RotateCcw,
} from "lucide-react";
import { getDepartmentConfig, ALL_DEPARTMENTS, type DepartmentConfig } from "@/lib/department-configs";
import { PatientHistoryViewer } from "@/components/nova/patient-history-viewer";
import { useNovaRole } from "@/components/nova/nova-role-context";
import { toast } from "sonner";

// Common clinical ICD-10 quick diagnosis presets
const COMMON_DIAGNOSES = [
  { icd: "J06.9", name: "Acute Upper Respiratory Infection" },
  { icd: "J02.9", name: "Acute Pharyngitis / Tonsillitis" },
  { icd: "J18.9", name: "Community-Acquired Pneumonia" },
  { icd: "I10", name: "Essential Primary Hypertension" },
  { icd: "E11.9", name: "Type 2 Diabetes Mellitus" },
  { icd: "K29.7", name: "Gastritis / Dyspepsia" },
  { icd: "A09", name: "Infectious Gastroenteritis" },
  { icd: "N39.0", name: "Urinary Tract Infection" },
  { icd: "B54", name: "Unspecified Malaria" },
  { icd: "A01.0", name: "Typhoid Fever" },
  { icd: "M54.5", name: "Low Back Pain" },
];

// Common Review of Systems (ROS) chips
const ROS_SYMPTOMS = [
  "Fever",
  "Cough",
  "Dyspnea",
  "Chest Pain",
  "Headache",
  "Vomiting",
  "Diarrhea",
  "Abdominal Pain",
  "Fatigue",
  "Dysuria",
  "Skin Rash",
];

// Quick Follow-up intervals
const FOLLOW_UP_OPTIONS = [
  "Return in 3 days",
  "Return in 1 week",
  "Return in 2 weeks",
  "Return in 1 month",
  "PRN (If symptoms worsen)",
];

function calculateAge(dobString?: string) {
  if (!dobString) return "—";
  const birth = new Date(dobString);
  if (isNaN(birth.getTime())) return dobString;
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  if (
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
  ) {
    years--;
  }
  return `${years} yrs`;
}

function ConsultationContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { role, doctorDepartment, setDoctorDepartment } = useNovaRole();
  const urlVisitId = params.get("visitId") ?? "";
  const urlDept = params.get("dept");

  const [activeVisitId, setActiveVisitId] = useState<string>(urlVisitId);
  const [activeDeptId, setActiveDeptId] = useState<string>(() => {
    return urlDept || doctorDepartment || "general_opd";
  });

  // Sync internal state when URL changes externally
  useEffect(() => {
    if (urlVisitId && urlVisitId !== activeVisitId) {
      setActiveVisitId(urlVisitId);
    }
  }, [urlVisitId]);

  useEffect(() => {
    if (urlDept && urlDept !== activeDeptId) {
      setActiveDeptId(urlDept);
    }
  }, [urlDept]);

  const deptConfig = useMemo(() => getDepartmentConfig(activeDeptId), [activeDeptId]);

  // Structured Specialty Assessment Form State (JSON-configured per department)
  const [specialtyData, setSpecialtyData] = useState<Record<string, any>>({});
  const [showGeneralDiagnoses, setShowGeneralDiagnoses] = useState(false);

  // Initialize or update default specialty data whenever active department changes
  useEffect(() => {
    setSpecialtyData((prev) => {
      const next = { ...prev };
      deptConfig.assessmentFields.forEach((field) => {
        if (next[field.key] === undefined && field.defaultValue !== undefined) {
          next[field.key] = field.defaultValue;
        }
      });
      return next;
    });
  }, [deptConfig]);

  const isDoctor = role === "Doctor";
  const isAdmin =
    role === "Organizational Admin" ||
    role === "Branch Admin" ||
    role === "Hospital Admin" ||
    role === "Nova Admin";

  // 1. Fetch active doctor queue visits
  const { data: queue = [], isLoading: isQueueLoading } = useQuery({
    ...trpc.visit.queue.queryOptions(),
    enabled: isDoctor || isAdmin,
  });

  // 2. Fetch specific visit detail
  const { data: visit, isLoading: isVisitLoading } = useQuery({
    ...trpc.visit.get.queryOptions({ visitId: activeVisitId }),
    enabled: !!activeVisitId && (isDoctor || isAdmin),
  });

  // Structured Consultation Form State
  // Subjective (S)
  const [complaint, setComplaint] = useState("");
  const [duration, setDuration] = useState("3 days");
  const [severity, setSeverity] = useState<"Mild" | "Moderate" | "Severe">("Moderate");
  const [hpi, setHpi] = useState("");
  const [selectedRos, setSelectedRos] = useState<string[]>([]);

  // Objective (O)
  const [generalExam, setGeneralExam] = useState("Alert, oriented, in no acute distress.");
  const [heent, setHeent] = useState("Normocephalic, throat normal, no congestion.");
  const [chest, setChest] = useState("Bilateral clear breath sounds, no wheeze/creps.");
  const [cvs, setCvs] = useState("S1, S2 audible, regular rate, no murmurs.");
  const [abdomen, setAbdomen] = useState("Soft, non-tender, non-distended.");
  const [otherExam, setOtherExam] = useState("");

  // Assessment (A)
  const [icd, setIcd] = useState("J06.9");
  const [diagnosis, setDiagnosis] = useState("Acute upper respiratory infection");
  const [secondaryDiagnoses, setSecondaryDiagnoses] = useState("");
  const [clinicalAssessment, setClinicalAssessment] = useState("");

  // Plan (P)
  const [patientAdvice, setPatientAdvice] = useState("Adequate fluid intake, warm fluids, adequate rest.");
  const [followUp, setFollowUp] = useState("Return in 3 days");
  const [planRx, setPlanRx] = useState(true);
  const [planLab, setPlanLab] = useState(false);
  const [planRefer, setPlanRefer] = useState(false);
  const [planAdmit, setPlanAdmit] = useState(false);

  const [saved, setSaved] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  // Pre-fill existing draft notes and diagnosis if returning to a visit
  useEffect(() => {
    if (!visit) return;
    const latestNote = visit.notes?.[0];
    const latestDiag = visit.diagnoses?.[0];

    if (latestNote) {
      if (latestNote.chiefComplaint) setComplaint(latestNote.chiefComplaint);
      if (latestNote.history) setHpi(latestNote.history);
      if (latestNote.examination) {
        setOtherExam(latestNote.examination);
        // Extract saved specialty fields if available
        deptConfig.assessmentFields.forEach((f) => {
          const regex = new RegExp(`• ${f.label}: (.*)`);
          const match = latestNote.examination.match(regex);
          if (match && match[1]) {
            let val = match[1].trim();
            if (f.unit && val.endsWith(f.unit)) {
              val = val.slice(0, -f.unit.length).trim();
            }
            setSpecialtyData((prev) => ({ ...prev, [f.key]: val }));
          }
        });
      }
      if (latestNote.assessment) setClinicalAssessment(latestNote.assessment);
      if (latestNote.plan) setPatientAdvice(latestNote.plan);
    } else {
      // Clean start for fresh visit
      setComplaint("");
      setHpi("");
    }

    if (latestDiag) {
      if (latestDiag.icdCode) setIcd(latestDiag.icdCode);
      if (latestDiag.description) setDiagnosis(latestDiag.description);
    }
  }, [visit, deptConfig]);

  const addNote = useMutation(trpc.visit.addNote.mutationOptions());
  const addDiagnosis = useMutation(trpc.visit.addDiagnosis.mutationOptions());
  const transferToBilling = useMutation({
    ...trpc.visit.transferToBilling.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.visit.queue.queryKey() });
      queryClient.invalidateQueries({ queryKey: trpc.billing.settlementQueue.queryKey() });
    },
  });

  const toggleRos = (item: string) => {
    setSelectedRos((prev) =>
      prev.includes(item) ? prev.filter((s) => s !== item) : [...prev, item]
    );
  };

  const handleSelectPresetDiagnosis = (preset: { icd: string; name: string }) => {
    setIcd(preset.icd);
    setDiagnosis(preset.name);
  };

  // Helper for Dental FDI Tooth Odontogram toggle
  const toggleDentalTooth = (toothNum: string) => {
    const raw = String(specialtyData.affectedTeeth || "");
    const teethArr = raw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const exists = teethArr.includes(toothNum);
    const updated = exists ? teethArr.filter((t) => t !== toothNum) : [...teethArr, toothNum];
    setSpecialtyData((prev) => ({
      ...prev,
      affectedTeeth: updated.join(", "),
    }));
  };

  // Compile structured clinical note strings
  const compileSpecialtyString = () => {
    const lines: string[] = [`[Specialty Assessment: ${deptConfig.name}]`];
    deptConfig.assessmentFields.forEach((f) => {
      const val = specialtyData[f.key];
      if (val !== undefined && val !== "" && val !== null) {
        lines.push(`• ${f.label}: ${val}${f.unit ? " " + f.unit : ""}`);
      }
    });
    return lines.length > 1 ? lines.join("\n") : "";
  };

  const compileHistoryString = () => {
    const parts: string[] = [];
    if (hpi.trim()) parts.push(hpi.trim());
    if (duration) parts.push(`Duration: ${duration}`);
    if (severity) parts.push(`Severity: ${severity}`);
    if (selectedRos.length > 0) parts.push(`Review of Systems: ${selectedRos.join(", ")}`);
    return parts.join("\n");
  };

  const compileExamString = () => {
    const parts = [
      `General: ${generalExam}`,
      `HEENT: ${heent}`,
      `Chest: ${chest}`,
      `CVS: ${cvs}`,
      `Abdomen: ${abdomen}`,
    ];
    if (otherExam.trim()) parts.push(`Other Exam: ${otherExam.trim()}`);
    const specStr = compileSpecialtyString();
    if (specStr) parts.push("\n" + specStr);
    return parts.join("\n");
  };

  const compilePlanString = () => {
    const parts = [
      patientAdvice.trim(),
      followUp ? `Follow-up: ${followUp}` : "",
      planAdmit ? "[Action: Inpatient Admission Required]" : "",
      planRefer ? "[Action: External Specialist Referral Required]" : "",
    ].filter(Boolean);
    return parts.join("\n");
  };

  const handleSaveAndTransfer = async () => {
    if (!activeVisitId) return;
    try {
      const fullHistory = compileHistoryString();
      const fullExam = compileExamString();
      const fullPlan = compilePlanString();
      const fullAssessment = [diagnosis, secondaryDiagnoses ? `Secondary: ${secondaryDiagnoses}` : "", clinicalAssessment]
        .filter(Boolean)
        .join(" | ");

      await addNote.mutateAsync({
        visitId: activeVisitId,
        noteType: "consultation",
        chiefComplaint: complaint || "General consultation",
        history: fullHistory,
        examination: fullExam,
        assessment: fullAssessment,
        plan: fullPlan,
      });

      await addDiagnosis.mutateAsync({
        visitId: activeVisitId,
        icdCode: icd || "Z00.0",
        description: diagnosis || "General examination",
        notes: fullAssessment,
      });

      await transferToBilling.mutateAsync({ visitId: activeVisitId });
      setSaved(true);
      toast.success("Consultation completed and transferred to billing");
    } catch {
      toast.error("Failed to complete consultation and transfer to billing");
    }
  };

  const handleSaveDraft = async () => {
    if (!activeVisitId) return;
    try {
      setSavingDraft(true);
      const fullHistory = compileHistoryString();
      const fullExam = compileExamString();
      const fullPlan = compilePlanString();
      const fullAssessment = [diagnosis, secondaryDiagnoses ? `Secondary: ${secondaryDiagnoses}` : "", clinicalAssessment]
        .filter(Boolean)
        .join(" | ");

      await addNote.mutateAsync({
        visitId: activeVisitId,
        noteType: "consultation",
        chiefComplaint: complaint,
        history: fullHistory,
        examination: fullExam,
        assessment: fullAssessment,
        plan: fullPlan,
      });

      await addDiagnosis.mutateAsync({
        visitId: activeVisitId,
        icdCode: icd || "Z00.0",
        description: diagnosis,
        notes: fullAssessment,
      });

      queryClient.invalidateQueries({ queryKey: trpc.visit.get.queryKey({ visitId: activeVisitId }) });
      toast.success("Consultation draft saved");
    } catch {
      toast.error("Failed to save draft");
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSelectDiagnosis = (d: { icdCode: string; description: string; notes?: string }) => {
    setIcd(d.icdCode);
    setDiagnosis(d.description);
    if (d.notes) {
      setClinicalAssessment((prev) => (prev ? `${prev}\n[History]: ${d.notes}` : d.notes || ""));
    }
  };

  const handleSelectPrescription = (med: { drug: string; dose: string; freq: string; days: number }) => {
    router.push(
      `/nova/doctor/prescription?visitId=${activeVisitId}&drug=${encodeURIComponent(med.drug)}&dose=${encodeURIComponent(
        med.dose
      )}&freq=${encodeURIComponent(med.freq)}&days=${med.days}`
    );
  };

  const handleSelectQueueVisit = (vId: string) => {
    setActiveVisitId(vId);
    window.history.pushState(null, "", `/nova/doctor/consultation?visitId=${vId}`);
  };

  const isLoading = addNote.isPending || addDiagnosis.isPending || transferToBilling.isPending;

  // Strict Clinical Role Boundary: Consultation is strictly reserved for Doctors
  if (!isDoctor && !isAdmin) {
    return (
      <PageShell title="Consultation Encounter" subtitle="Clinical Access Governance">
        <Card className="max-w-xl mx-auto p-8 my-8 text-center border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 shadow-xs">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-300 dark:border-amber-700">
            <Stethoscope size={32} />
          </div>
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 mb-3">
            Doctor Role Exclusive
          </span>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Physician Consultation Station</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
            Medical consultation encounters, clinical diagnoses (ICD-10), and treatment orders are reserved exclusively for licensed <strong>Medical Doctors</strong>.
          </p>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-left text-xs space-y-2 mb-6 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Your Role:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">{role}</span>
            </div>
          </div>

          <button
            onClick={() => router.back()}
            className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-200"
          >
            ← Return to Previous Page
          </button>
        </Card>
      </PageShell>
    );
  }

  // Completed State View
  if (saved && visit) {
    return (
      <PageShell title="Consultation Encounter">
        <Card className="p-8 max-w-lg mx-auto border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle size={32} />
          </div>
          <h2 className="font-bold text-slate-900 dark:text-slate-100 text-lg mb-1 text-center">Consultation Completed</h2>
          <p className="text-sm text-center text-emerald-700 dark:text-emerald-400 font-semibold mb-2">
            ✓ Transferred to Billing Settlement Queue
          </p>
          <p className="text-slate-500 text-center text-xs mb-5">
            {visit.patient.nameEn} · {icd} — {diagnosis}. Diagnostic orders and prescriptions recorded.
          </p>
          <div className="space-y-2">
            <Link
              href="/nova/billing"
              className="flex items-center justify-between w-full px-4 py-2.5 bg-teal-600 text-white rounded-lg text-xs font-semibold hover:bg-teal-700 shadow-xs"
            >
              <span>Open in Billing & Settle</span>
              <ArrowRight size={13} />
            </Link>
            {planRx && (
              <Link
                href={`/nova/doctor/prescription?visitId=${activeVisitId}`}
                className="flex items-center justify-between w-full px-4 py-2 bg-teal-50 border border-teal-200 rounded-lg text-xs font-medium text-teal-700 hover:bg-teal-100"
              >
                <span>Write Prescription</span>
                <ArrowRight size={13} />
              </Link>
            )}
            {planLab && (
              <Link
                href={`/nova/doctor/lab-order?visitId=${activeVisitId}`}
                className="flex items-center justify-between w-full px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs font-medium text-blue-700 hover:bg-blue-100"
              >
                <span>Order Lab Tests</span>
                <ArrowRight size={13} />
              </Link>
            )}
            <button
              onClick={() => router.push("/nova/doctor")}
              className={`w-full ${btnSecondary} text-xs mt-2`}
            >
              Back to Doctor Queue
            </button>
          </div>
        </Card>
      </PageShell>
    );
  }

  const patient = visit?.patient;
  const latestVitals = visit?.vitals?.[0];

  return (
    <PageShell
      title={deptConfig.bannerTitle}
      subtitle={
        patient
          ? `${patient.nameEn} · ${patient.healthId} · ${deptConfig.defaultRoom}`
          : `${deptConfig.name} · Direct Clinical Examination & Orders`
      }
      action={
        <div className="flex items-center gap-2">
          {/* Department Specialty Switcher */}
          <div className="flex items-center gap-1.5">
            <span className={`px-2 py-1 rounded text-xs font-bold border hidden sm:inline-block ${deptConfig.badgeColor}`}>
              {deptConfig.code}
            </span>
            <select
              value={deptConfig.id}
              onChange={(e) => {
                setActiveDeptId(e.target.value);
                setDoctorDepartment(e.target.value);
              }}
              className="text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-700 dark:text-slate-200 hover:border-teal-400 focus:outline-none"
              title="Switch Clinical Specialty Layout"
            >
              {ALL_DEPARTMENTS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {activeVisitId && (
            <button
              onClick={handleSaveDraft}
              disabled={isLoading || savingDraft}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-md transition"
            >
              {savingDraft ? "Saving…" : "Save Draft"}
            </button>
          )}

          {activeVisitId && (
            <button
              onClick={handleSaveAndTransfer}
              disabled={isLoading}
              className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-md shadow-xs transition"
            >
              {isLoading ? "Finalizing…" : "Complete & Transfer to Billing →"}
            </button>
          )}

          <Link
            href="/nova/doctor"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-md transition"
          >
            <Clock size={13} className="text-slate-500" /> Queue
          </Link>
        </div>
      }
    >
      {/* ───────────────────────────────────────────────────────────── */}
      {/* SECTION 1: TOP OPD QUEUE STRIP (Fast Switching) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 mb-4 shadow-xs">
        <div className="flex items-center justify-between gap-3 mb-2 px-1">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-600" />
            </span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Waiting Queue ({queue.length})
            </span>
          </div>

          <span className="text-[11px] text-slate-400">
            Click any waiting patient to consult
          </span>
        </div>

        {queue.length === 0 ? (
          <p className="text-xs text-slate-400 px-1 py-1">
            No patients currently waiting in the OPD queue.
          </p>
        ) : (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {queue.map((ticket) => {
              const isSelected = ticket.visitId === activeVisitId;
              const p = ticket.visit.patient;
              return (
                <button
                  key={ticket.id}
                  onClick={() => handleSelectQueueVisit(ticket.visitId)}
                  className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition border cursor-pointer ${
                    isSelected
                      ? "bg-teal-600 text-white border-teal-600 shadow-xs ring-2 ring-teal-300 dark:ring-teal-700 font-semibold"
                      : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-teal-400 hover:bg-teal-50/40"
                  }`}
                >
                  <span
                    className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      isSelected
                        ? "bg-teal-700 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    #{ticket.ticketNumber}
                  </span>
                  <span className="truncate max-w-[120px]">{p.nameEn}</span>
                  <span
                    className={`text-[9px] font-bold px-1 rounded ${
                      p.sex === "M"
                        ? "bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300"
                        : "bg-pink-100 dark:bg-pink-900/60 text-pink-700 dark:text-pink-300"
                    }`}
                  >
                    {p.sex}
                  </span>
                  <span className="text-[10px] opacity-80">{calculateAge(p.dob)}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SECTION 2: PATIENT HEADER & VITALS BIOMETRICS STRIP */}
      {/* ───────────────────────────────────────────────────────────── */}
      {patient ? (
        <>
          <Card className="p-4 mb-4 border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-full bg-teal-50 dark:bg-teal-950/70 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 font-bold text-sm flex items-center justify-center shrink-0">
                  {patient.nameEn.slice(0, 2).toUpperCase()}
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {patient.nameEn}
                    </h2>
                    {patient.nameAm && (
                      <span className="text-xs text-slate-400">({patient.nameAm})</span>
                    )}
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        patient.sex === "M"
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "bg-pink-50 text-pink-700 border border-pink-200"
                      }`}
                    >
                      {patient.sex === "M" ? "M" : "F"}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      {calculateAge(patient.dob)}
                    </span>
                    {visit?.ticket && (
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                        Ticket #{visit.ticket.ticketNumber}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                    <span>
                      Health ID:{" "}
                      <strong className="text-slate-800 dark:text-slate-200 font-mono">
                        {patient.healthId}
                      </strong>
                    </span>
                    <span>·</span>
                    <span>Phone: {patient.phone || "—"}</span>
                    <span>·</span>
                    <span>Kebele: {(patient as any).kebele || "—"}</span>
                    <span>·</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-teal-50 text-teal-700 border border-teal-200 font-medium">
                      Standard
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Navigation actions */}
              <div className="flex items-center gap-2">
                <Link
                  href={`/nova/doctor/prescription?visitId=${activeVisitId}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-700 rounded-md text-xs font-semibold transition"
                >
                  <Pill size={13} /> Prescribe
                </Link>
                <Link
                  href={`/nova/doctor/lab-order?visitId=${activeVisitId}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-md text-xs font-semibold transition"
                >
                  <FlaskConical size={13} /> Order Lab
                </Link>
                <Link
                  href={`/nova/doctor/emr?visitId=${activeVisitId}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-md text-xs font-semibold transition"
                >
                  <FileText size={13} /> Patient EMR
                </Link>
              </div>
            </div>
          </Card>

          {/* Vitals Biometric Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-medium uppercase tracking-wider">Blood Pressure</span>
                <Activity size={13} className="text-teal-600" />
              </div>
              <p className="text-base font-bold text-slate-900 dark:text-slate-100">
                {latestVitals?.bpSystolic && latestVitals?.bpDiastolic
                  ? `${latestVitals.bpSystolic}/${latestVitals.bpDiastolic} mmHg`
                  : "-- / -- mmHg"}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {latestVitals ? "Recorded at Triage" : "Not measured"}
              </p>
            </div>

            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-medium uppercase tracking-wider">Heart Rate</span>
                <Heart size={13} className="text-red-500" />
              </div>
              <p className="text-base font-bold text-slate-900 dark:text-slate-100">
                {latestVitals?.heartRate ? `${latestVitals.heartRate} bpm` : "-- bpm"}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {latestVitals?.heartRate ? "Pulse rate" : "Not measured"}
              </p>
            </div>

            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-medium uppercase tracking-wider">Temperature</span>
                <Thermometer size={13} className="text-amber-500" />
              </div>
              <p className="text-base font-bold text-slate-900 dark:text-slate-100">
                {latestVitals?.temperature ? `${latestVitals.temperature} °C` : "--.- °C"}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {latestVitals?.temperature ? "Body temp" : "Not measured"}
              </p>
            </div>

            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-medium uppercase tracking-wider">Oxygen SpO2</span>
                <Wind size={13} className="text-blue-500" />
              </div>
              <p className="text-base font-bold text-slate-900 dark:text-slate-100">
                {latestVitals?.spo2 ? `${latestVitals.spo2} %` : "-- %"}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {latestVitals?.spo2 ? "Pulse oximetry" : "Not measured"}
              </p>
            </div>

            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-medium uppercase tracking-wider">Weight / BMI</span>
                <Weight size={13} className="text-purple-500" />
              </div>
              <p className="text-base font-bold text-slate-900 dark:text-slate-100">
                {latestVitals?.weight ? `${latestVitals.weight} kg` : "-- kg"}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {latestVitals?.weight ? "Anthropometry" : "Not measured"}
              </p>
            </div>
          </div>
        </>
      ) : (
        /* Standby Selection Card when no visit is selected */
        <Card className="p-4 mb-4 border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border border-dashed border-teal-500 bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center shrink-0">
                <Stethoscope size={18} className="animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Select a Patient to Consult
                </h3>
                <p className="text-xs text-slate-500">
                  Pick any patient from the waiting queue above to begin clinical examination.
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded">
              Awaiting Patient Call
            </span>
          </div>
        </Card>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SECTION 3: STRUCTURED CLINICAL CONSULTATION WORKSPACE (SOAP) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeVisitId ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* LEFT 2 COLUMNS: Main SOAP Documentation */}
          <div className="lg:col-span-2 space-y-4">
            {/* 1. SUBJECTIVE: Chief Complaint, HPI & Review of Systems */}
            <Card className="p-4 border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center">
                    S
                  </span>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-xs uppercase tracking-wider">
                    Subjective (Complaints & Clinical History)
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">Severity:</span>
                  {(["Mild", "Moderate", "Severe"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSeverity(s)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                        severity === s
                          ? s === "Severe"
                            ? "bg-red-600 text-white"
                            : s === "Moderate"
                            ? "bg-amber-600 text-white"
                            : "bg-teal-600 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                      Chief Complaint
                    </label>
                    <input
                      type="text"
                      className={inputCls}
                      placeholder="e.g. Sore throat, productive cough, fever"
                      value={complaint}
                      onChange={(e) => setComplaint(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                      Symptom Duration
                    </label>
                    <input
                      type="text"
                      className={inputCls}
                      placeholder="e.g. 3 days, 1 week"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                    />
                  </div>
                </div>

                {/* Review of Systems (ROS) Quick Symptom Tags */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                    Review of Systems (Quick Tagging)
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {ROS_SYMPTOMS.map((sym) => {
                      const isChecked = selectedRos.includes(sym);
                      return (
                        <button
                          key={sym}
                          type="button"
                          onClick={() => toggleRos(sym)}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                            isChecked
                              ? "bg-teal-600 text-white shadow-2xs"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                          }`}
                        >
                          {isChecked ? "✓ " : "+ "}
                          {sym}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                    History of Present Illness (HPI)
                  </label>
                  <textarea
                    className={`${inputCls} resize-none h-16`}
                    placeholder="Onset, character, radiation, relieving and aggravating factors..."
                    value={hpi}
                    onChange={(e) => setHpi(e.target.value)}
                  />
                </div>
              </div>
            </Card>

            {/* 2. OBJECTIVE: Physical Examination & Organ Systems */}
            <Card className="p-4 border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center">
                    O
                  </span>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-xs uppercase tracking-wider">
                    Objective (Physical Examination)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setGeneralExam("Alert, oriented, in no acute distress.");
                    setHeent("Normocephalic, throat normal, no congestion.");
                    setChest("Bilateral clear breath sounds, no wheeze/creps.");
                    setCvs("S1, S2 audible, regular rate, no murmurs.");
                    setAbdomen("Soft, non-tender, non-distended.");
                  }}
                  className="text-[11px] text-teal-700 dark:text-teal-400 font-semibold hover:underline"
                >
                  Reset Standard Normal
                </button>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                      General Appearance
                    </label>
                    <input
                      type="text"
                      className={inputCls}
                      value={generalExam}
                      onChange={(e) => setGeneralExam(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                      HEENT (Head, Eyes, Throat)
                    </label>
                    <input
                      type="text"
                      className={inputCls}
                      value={heent}
                      onChange={(e) => setHeent(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                      Respiratory / Chest
                    </label>
                    <input
                      type="text"
                      className={inputCls}
                      value={chest}
                      onChange={(e) => setChest(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                      Cardiovascular
                    </label>
                    <input
                      type="text"
                      className={inputCls}
                      value={cvs}
                      onChange={(e) => setCvs(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                      Abdomen
                    </label>
                    <input
                      type="text"
                      className={inputCls}
                      value={abdomen}
                      onChange={(e) => setAbdomen(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                    Other Clinical Examination Findings
                  </label>
                  <input
                    type="text"
                    className={inputCls}
                    placeholder="Musculoskeletal, skin, neurological findings..."
                    value={otherExam}
                    onChange={(e) => setOtherExam(e.target.value)}
                  />
                </div>
              </div>
            </Card>

            {/* ─── 2.5 SPECIALTY CLINICAL ASSESSMENT (Dynamic by Department JSON Config) ─── */}
            <Card className="p-4 border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs border ${deptConfig.badgeColor}`}>
                    {deptConfig.code}
                  </span>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      {deptConfig.name} Specialty Evaluation
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      Tailored clinical assessment schema & specialty fields
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const defaults: Record<string, any> = {};
                      deptConfig.assessmentFields.forEach((f) => {
                        if (f.defaultValue !== undefined) defaults[f.key] = f.defaultValue;
                      });
                      setSpecialtyData(defaults);
                    }}
                    className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-medium flex items-center gap-1"
                    title="Reset specialty fields"
                  >
                    <RotateCcw size={11} /> Reset Defaults
                  </button>
                </div>
              </div>

              {/* SPECIALTY: DENTAL OPERATORY & TOOTH CHART */}
              {deptConfig.id === "dental" && (
                <div className="space-y-4 mb-4">
                  {/* FDI Odontogram Interactive Tooth Chart */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        Interactive Tooth Odontogram (FDI Two-Digit System)
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Click teeth to toggle affected list
                      </span>
                    </div>

                    {/* Upper Arch */}
                    <div className="mb-2">
                      <div className="text-[10px] font-semibold text-slate-400 text-center mb-1">
                        MAXILLARY (UPPER JAW)
                      </div>
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        {/* Upper Right 18..11 */}
                        <div className="flex items-center gap-0.5 border-r border-slate-300 dark:border-slate-600 pr-1 mr-1">
                          {["18", "17", "16", "15", "14", "13", "12", "11"].map((t) => {
                            const selected = (specialtyData.affectedTeeth || "").includes(t);
                            return (
                              <button
                                key={t}
                                type="button"
                                onClick={() => toggleDentalTooth(t)}
                                className={`w-7 h-8 rounded text-[10px] font-mono font-bold transition flex flex-col items-center justify-center border cursor-pointer ${
                                  selected
                                    ? "bg-cyan-600 text-white border-cyan-600 shadow-2xs"
                                    : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-cyan-400"
                                }`}
                                title={`Tooth ${t}`}
                              >
                                <span>{t}</span>
                              </button>
                            );
                          })}
                        </div>
                        {/* Upper Left 21..28 */}
                        <div className="flex items-center gap-0.5">
                          {["21", "22", "23", "24", "25", "26", "27", "28"].map((t) => {
                            const selected = (specialtyData.affectedTeeth || "").includes(t);
                            return (
                              <button
                                key={t}
                                type="button"
                                onClick={() => toggleDentalTooth(t)}
                                className={`w-7 h-8 rounded text-[10px] font-mono font-bold transition flex flex-col items-center justify-center border cursor-pointer ${
                                  selected
                                    ? "bg-cyan-600 text-white border-cyan-600 shadow-2xs"
                                    : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-cyan-400"
                                }`}
                                title={`Tooth ${t}`}
                              >
                                <span>{t}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Lower Arch */}
                    <div>
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        {/* Lower Right 48..41 */}
                        <div className="flex items-center gap-0.5 border-r border-slate-300 dark:border-slate-600 pr-1 mr-1">
                          {["48", "47", "46", "45", "44", "43", "42", "41"].map((t) => {
                            const selected = (specialtyData.affectedTeeth || "").includes(t);
                            return (
                              <button
                                key={t}
                                type="button"
                                onClick={() => toggleDentalTooth(t)}
                                className={`w-7 h-8 rounded text-[10px] font-mono font-bold transition flex flex-col items-center justify-center border cursor-pointer ${
                                  selected
                                    ? "bg-cyan-600 text-white border-cyan-600 shadow-2xs"
                                    : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-cyan-400"
                                }`}
                                title={`Tooth ${t}`}
                              >
                                <span>{t}</span>
                              </button>
                            );
                          })}
                        </div>
                        {/* Lower Left 31..38 */}
                        <div className="flex items-center gap-0.5">
                          {["31", "32", "33", "34", "35", "36", "37", "38"].map((t) => {
                            const selected = (specialtyData.affectedTeeth || "").includes(t);
                            return (
                              <button
                                key={t}
                                type="button"
                                onClick={() => toggleDentalTooth(t)}
                                className={`w-7 h-8 rounded text-[10px] font-mono font-bold transition flex flex-col items-center justify-center border cursor-pointer ${
                                  selected
                                    ? "bg-cyan-600 text-white border-cyan-600 shadow-2xs"
                                    : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-cyan-400"
                                }`}
                                title={`Tooth ${t}`}
                              >
                                <span>{t}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="text-[10px] font-semibold text-slate-400 text-center mt-1">
                        MANDIBULAR (LOWER JAW)
                      </div>
                    </div>

                    <div className="mt-2 text-center text-xs">
                      <span className="text-slate-500 font-medium">Selected Teeth: </span>
                      <span className="font-mono font-bold text-cyan-700 dark:text-cyan-300">
                        {specialtyData.affectedTeeth || "None selected"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* SPECIALTY: PEDIATRICS MUAC BADGE GUIDE */}
              {deptConfig.id === "pediatrics" && specialtyData.muac && (
                <div className="mb-3 p-2.5 rounded-lg border text-xs flex items-center justify-between bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Nutrition Triage Assessment (MUAC {specialtyData.muac} cm):
                  </span>
                  {parseFloat(specialtyData.muac) < 11.5 ? (
                    <span className="px-2 py-0.5 rounded font-bold bg-rose-100 text-rose-800 border border-rose-300">
                      🚨 Severe Acute Malnutrition (SAM)
                    </span>
                  ) : parseFloat(specialtyData.muac) <= 12.5 ? (
                    <span className="px-2 py-0.5 rounded font-bold bg-amber-100 text-amber-800 border border-amber-300">
                      ⚠️ Moderate Acute Malnutrition (MAM)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      ✓ Normal Nutrition Status
                    </span>
                  )}
                </div>
              )}

              {/* SPECIALTY: OB/GYN FETAL HEART RATE BADGE */}
              {deptConfig.id === "ob_gyn" && specialtyData.fetalHeartRate && (
                <div className="mb-3 p-2.5 rounded-lg border text-xs flex items-center justify-between bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Fetal Well-being (FHR {specialtyData.fetalHeartRate} bpm):
                  </span>
                  {parseInt(specialtyData.fetalHeartRate, 10) >= 120 && parseInt(specialtyData.fetalHeartRate, 10) <= 160 ? (
                    <span className="px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800">
                      ✓ Normal Baseline (120–160 bpm)
                    </span>
                  ) : parseInt(specialtyData.fetalHeartRate, 10) < 120 ? (
                    <span className="px-2 py-0.5 rounded font-bold bg-rose-100 text-rose-800">
                      🚨 Fetal Bradycardia (&lt;120 bpm)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded font-bold bg-amber-100 text-amber-800">
                      ⚠️ Fetal Tachycardia (&gt;160 bpm)
                    </span>
                  )}
                </div>
              )}

              {/* DYNAMIC SCHEMA FIELDS (From Department Config) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {deptConfig.assessmentFields
                  .filter((f) => !(deptConfig.id === "dental" && f.key === "affectedTeeth"))
                  .map((field) => (
                    <div
                      key={field.key}
                      className={field.type === "textarea" ? "sm:col-span-2" : ""}
                    >
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center justify-between mb-1">
                        <span>{field.label}</span>
                        {field.category && (
                          <span className="text-[10px] text-slate-400 font-normal">
                            {field.category}
                          </span>
                        )}
                      </label>

                      {field.type === "select" && field.options ? (
                        <select
                          className={inputCls}
                          value={specialtyData[field.key] ?? field.defaultValue ?? ""}
                          onChange={(e) =>
                            setSpecialtyData((prev) => ({ ...prev, [field.key]: e.target.value }))
                          }
                        >
                          {field.options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : field.type === "number" ? (
                        <div className="relative">
                          <input
                            type="number"
                            step="any"
                            className={inputCls}
                            placeholder={field.placeholder}
                            value={specialtyData[field.key] ?? ""}
                            onChange={(e) =>
                              setSpecialtyData((prev) => ({ ...prev, [field.key]: e.target.value }))
                            }
                          />
                          {field.unit && (
                            <span className="absolute right-3 top-2 text-xs text-slate-400 pointer-events-none">
                              {field.unit}
                            </span>
                          )}
                        </div>
                      ) : field.type === "textarea" ? (
                        <textarea
                          rows={2}
                          className={inputCls}
                          placeholder={field.placeholder}
                          value={specialtyData[field.key] ?? ""}
                          onChange={(e) =>
                            setSpecialtyData((prev) => ({ ...prev, [field.key]: e.target.value }))
                          }
                        />
                      ) : (
                        <input
                          type="text"
                          className={inputCls}
                          placeholder={field.placeholder}
                          value={specialtyData[field.key] ?? ""}
                          onChange={(e) =>
                            setSpecialtyData((prev) => ({ ...prev, [field.key]: e.target.value }))
                          }
                        />
                      )}

                      {field.helpText && (
                        <p className="text-[10px] text-slate-400 mt-0.5">{field.helpText}</p>
                      )}
                    </div>
                  ))}
              </div>
            </Card>

            {/* 3. ASSESSMENT: Primary Diagnosis & Differential ICD Codes */}
            <Card className="p-4 border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center">
                  A
                </span>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-xs uppercase tracking-wider">
                  Assessment (Clinical Diagnoses)
                </h3>
              </div>

              {/* Quick Common Diagnosis Chips */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] text-slate-400 font-medium">
                    {showGeneralDiagnoses ? "General Outpatient" : deptConfig.name} Diagnostic Presets:
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowGeneralDiagnoses(!showGeneralDiagnoses)}
                    className="text-[10px] text-teal-700 dark:text-teal-400 font-semibold hover:underline cursor-pointer"
                  >
                    {showGeneralDiagnoses ? "← Switch to Specialty Presets" : "Show General Presets →"}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(showGeneralDiagnoses ? COMMON_DIAGNOSES : deptConfig.quickDiagnoses).map((item) => (
                    <button
                      key={item.icd}
                      type="button"
                      onClick={() => handleSelectPresetDiagnosis(item)}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer border ${
                        icd === item.icd
                          ? "bg-teal-600 text-white border-teal-600 font-bold shadow-2xs"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-teal-400"
                      }`}
                    >
                      <span className="font-mono text-[10px] opacity-80 mr-1">{item.icd}</span>
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                    ICD-10 Code
                  </label>
                  <input
                    type="text"
                    className={inputCls}
                    placeholder="e.g. J06.9"
                    value={icd}
                    onChange={(e) => setIcd(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                    Primary Diagnosis Description
                  </label>
                  <input
                    type="text"
                    className={inputCls}
                    placeholder="e.g. Acute upper respiratory infection"
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                    Secondary Diagnoses / Chronic Conditions
                  </label>
                  <input
                    type="text"
                    className={inputCls}
                    placeholder="e.g. Known Essential HTN, T2DM"
                    value={secondaryDiagnoses}
                    onChange={(e) => setSecondaryDiagnoses(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                    Clinical Impression / Remarks
                  </label>
                  <input
                    type="text"
                    className={inputCls}
                    placeholder="e.g. Viral etiology favored, monitor temp"
                    value={clinicalAssessment}
                    onChange={(e) => setClinicalAssessment(e.target.value)}
                  />
                </div>
              </div>
            </Card>

            {/* 4. PLAN: Treatment Orders, Instructions & Follow-up */}
            <Card className="p-4 border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center">
                  P
                </span>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-xs uppercase tracking-wider">
                  Plan & Treatment Orders
                </h3>
              </div>

              {/* Treatment Action Checkboxes */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                {[
                  { label: "Prescription", val: planRx, set: setPlanRx, icon: Pill },
                  { label: "Order Lab", val: planLab, set: setPlanLab, icon: FlaskConical },
                  { label: "Admit to Ward", val: planAdmit, set: setPlanAdmit, icon: Bed },
                  { label: "Referral", val: planRefer, set: setPlanRefer, icon: ArrowRight },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <label
                      key={item.label}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-semibold cursor-pointer transition ${
                        item.val
                          ? "bg-teal-50 dark:bg-teal-950/40 border-teal-300 dark:border-teal-700 text-teal-800 dark:text-teal-200"
                          : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={item.val}
                        onChange={(e) => item.set(e.target.checked)}
                        className="accent-teal-600 rounded"
                      />
                      <Icon size={14} className={item.val ? "text-teal-600" : "text-slate-400"} />
                      <span>{item.label}</span>
                    </label>
                  );
                })}
              </div>

              {/* Specialty Diagnostic Lab Quick Orders */}
              {deptConfig.quickLabTests.length > 0 && (
                <div className="p-3 mb-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <FlaskConical size={12} className="text-teal-600" />
                      {deptConfig.code} Common Diagnostic Investigations:
                    </span>
                    <Link
                      href={`/nova/doctor/lab-order?visitId=${activeVisitId}`}
                      className="text-[10px] font-semibold text-teal-700 hover:underline"
                    >
                      Full Catalog →
                    </Link>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {deptConfig.quickLabTests.map((t) => (
                      <Link
                        key={t.code}
                        href={`/nova/doctor/lab-order?visitId=${activeVisitId}&testCode=${t.code}`}
                        className="px-2 py-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:border-teal-400 hover:text-teal-700 flex items-center gap-1 shadow-2xs transition"
                      >
                        <Plus size={10} className="text-teal-600" />
                        <span>{t.name}</span>
                        <span className="text-[9px] text-slate-400">({t.category})</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                    Patient Education & Lifestyle Advice
                  </label>
                  <input
                    type="text"
                    className={inputCls}
                    value={patientAdvice}
                    onChange={(e) => setPatientAdvice(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                    Follow-up Instructions
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {FOLLOW_UP_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setFollowUp(opt)}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold transition border ${
                          followUp === opt
                            ? "bg-slate-800 text-white border-slate-800"
                            : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    className={inputCls}
                    value={followUp}
                    onChange={(e) => setFollowUp(e.target.value)}
                  />
                </div>
              </div>
            </Card>

            {/* Bottom Actions Bar */}
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleSaveAndTransfer}
                disabled={!activeVisitId || isLoading}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg shadow-xs transition disabled:opacity-50"
              >
                {isLoading ? "Finalizing…" : "✓ Complete & Transfer to Billing →"}
              </button>

              <button
                onClick={handleSaveDraft}
                disabled={!activeVisitId || isLoading || savingDraft}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition disabled:opacity-50"
              >
                {savingDraft ? "Saving…" : "Save Draft"}
              </button>
            </div>
          </div>

          {/* RIGHT 1 COLUMN: Verified Lab Results & Clinical Navigation */}
          <div className="space-y-4">
            {/* Verified Lab Findings */}
            {visit && visit.labOrders && visit.labOrders.length > 0 ? (
              <Card className="p-4 border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <FlaskConical className="text-teal-600" size={15} />
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                      Lab Results ({visit.labOrders.length})
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                    {visit.labOrders.filter((l) => l.status === "completed").length} Ready
                  </span>
                </div>

                <div className="space-y-2">
                  {visit.labOrders.map((order) => {
                    let parsedResults: any[] = [];
                    if (order.result?.resultsJson) {
                      try {
                        parsedResults = JSON.parse(order.result.resultsJson);
                      } catch {}
                    }

                    return (
                      <div
                        key={order.id}
                        className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 text-xs"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-800 dark:text-slate-100">
                            {order.testName}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                              order.status === "completed"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {order.status === "completed" ? "Ready" : "In Lab"}
                          </span>
                        </div>

                        {parsedResults.length > 0 ? (
                          <div className="space-y-1 mt-1 text-[11px]">
                            {parsedResults.map((r, i) => (
                              <div key={i} className="flex items-center justify-between">
                                <span className="text-slate-600 dark:text-slate-400">{r.name}</span>
                                <span className="font-bold text-teal-700 dark:text-teal-300">
                                  {r.value} {r.unit}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : order.result?.interpretation ? (
                          <p className="text-[11px] text-slate-600 mt-1">
                            {order.result.interpretation}
                          </p>
                        ) : (
                          <p className="text-[11px] text-slate-400 italic">Processing in lab…</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            ) : null}

            {/* Quick Treatment Jump Links */}
            <Card className="p-4 space-y-2 border-slate-200 dark:border-slate-800 shadow-xs">
              <p className="text-[11px] text-slate-400 uppercase tracking-wider font-bold mb-2">
                Clinical Order Station
              </p>

              <Link
                href={`/nova/doctor/prescription?visitId=${activeVisitId}`}
                className="flex items-center justify-between w-full px-3 py-2 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 rounded text-xs font-semibold hover:bg-teal-100 transition"
              >
                <span className="flex items-center gap-1.5">
                  <Pill size={13} /> Prescribe Medications
                </span>
                <ChevronRight size={13} />
              </Link>

              <Link
                href={`/nova/doctor/lab-order?visitId=${activeVisitId}`}
                className="flex items-center justify-between w-full px-3 py-2 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded text-xs font-semibold hover:bg-blue-100 transition"
              >
                <span className="flex items-center gap-1.5">
                  <FlaskConical size={13} /> Order Lab Investigations
                </span>
                <ChevronRight size={13} />
              </Link>

              <Link
                href={`/nova/ward/admissions?tab=admit&patientId=${visit?.patientId ?? ""}&visitId=${activeVisitId}`}
                className="flex items-center justify-between w-full px-3 py-2 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 rounded text-xs font-semibold hover:bg-purple-100 transition"
              >
                <span className="flex items-center gap-1.5">
                  <Bed size={13} /> Admit to Inpatient Ward
                </span>
                <ChevronRight size={13} />
              </Link>

              <Link
                href={`/nova/doctor/emr?visitId=${activeVisitId}`}
                className="flex items-center justify-between w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs font-semibold hover:bg-slate-200 transition"
              >
                <span className="flex items-center gap-1.5">
                  <FileText size={13} /> Full Medical History (EMR)
                </span>
                <ChevronRight size={13} />
              </Link>
            </Card>
          </div>
        </div>
      ) : null}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SECTION 4: PATIENT LONGITUDINAL MEDICAL HISTORY (Bottom Drawer) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeVisitId && (
        <div className="mt-8 pt-5 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-teal-600" />
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                Patient Medical History & Past Encounters
              </h3>
            </div>
            <span className="text-[11px] px-2 py-0.5 bg-teal-50 border border-teal-200 text-teal-700 font-semibold rounded">
              1-Click Re-prescribe & Auto-fill Diagnosis
            </span>
          </div>

          <PatientHistoryViewer
            visitId={activeVisitId}
            onSelectDiagnosis={handleSelectDiagnosis}
            onSelectPrescription={handleSelectPrescription}
            showAllergyAdder={true}
          />
        </div>
      )}
    </PageShell>
  );
}

export default function ConsultationPage() {
  return (
    <Suspense
      fallback={
        <PageShell title="Consultation">
          <p className="p-4 text-slate-400 text-xs">Loading consultation room…</p>
        </PageShell>
      }
    >
      <ConsultationContent />
    </Suspense>
  );
}