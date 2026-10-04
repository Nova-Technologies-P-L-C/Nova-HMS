"use client";

import { useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { PageShell, Card, StatusBadge, inputCls, btnPrimary, btnSecondary } from "@/components/nova/nova-ui";
import {
  FlaskConical,
  ClipboardList,
  Send,
  User,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  Plus,
  Trash2,
  Printer,
  FileCheck,
  BedDouble,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Phone,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";

type PageTab = "enter" | "completed";

type ParamRow = {
  name: string;
  value: string;
  unit: string;
  refRange: string;
  flag: "normal" | "high" | "low" | "critical";
};

// Standard test templates with clinical reference intervals
const TEST_TEMPLATES: Record<string, { rows: ParamRow[]; defaultInterpretation: string }> = {
  cbc: {
    defaultInterpretation: "Normal",
    rows: [
      { name: "White Blood Cells (WBC)", value: "7.2", unit: "10^3/µL", refRange: "4.0 - 10.0", flag: "normal" },
      { name: "Red Blood Cells (RBC)", value: "4.8", unit: "10^6/µL", refRange: "4.2 - 5.8", flag: "normal" },
      { name: "Hemoglobin (Hgb)", value: "14.5", unit: "g/dL", refRange: "12.0 - 16.5", flag: "normal" },
      { name: "Hematocrit (Hct)", value: "43.0", unit: "%", refRange: "36.0 - 48.0", flag: "normal" },
      { name: "Platelet Count (PLT)", value: "260", unit: "10^3/µL", refRange: "150 - 450", flag: "normal" },
      { name: "Neutrophils", value: "60", unit: "%", refRange: "40 - 75", flag: "normal" },
      { name: "Lymphocytes", value: "32", unit: "%", refRange: "20 - 45", flag: "normal" },
    ],
  },
  urinalysis: {
    defaultInterpretation: "Normal",
    rows: [
      { name: "Color", value: "Pale Yellow", unit: "", refRange: "Straw - Amber", flag: "normal" },
      { name: "Clarity / Appearance", value: "Clear", unit: "", refRange: "Clear", flag: "normal" },
      { name: "pH", value: "6.0", unit: "", refRange: "5.0 - 7.5", flag: "normal" },
      { name: "Specific Gravity", value: "1.015", unit: "", refRange: "1.005 - 1.030", flag: "normal" },
      { name: "Protein", value: "Negative", unit: "", refRange: "Negative", flag: "normal" },
      { name: "Glucose", value: "Negative", unit: "", refRange: "Negative", flag: "normal" },
      { name: "Ketones", value: "Negative", unit: "", refRange: "Negative", flag: "normal" },
      { name: "Nitrite", value: "Negative", unit: "", refRange: "Negative", flag: "normal" },
      { name: "Leukocyte Esterase", value: "Negative", unit: "", refRange: "Negative", flag: "normal" },
      { name: "Microscopy - Pus Cells", value: "0 - 2", unit: "/hpf", refRange: "0 - 5", flag: "normal" },
      { name: "Microscopy - RBC", value: "0 - 1", unit: "/hpf", refRange: "0 - 2", flag: "normal" },
    ],
  },
  malaria: {
    defaultInterpretation: "Negative",
    rows: [
      { name: "Malaria Rapid Diagnostic Test (RDT)", value: "Negative", unit: "", refRange: "Negative", flag: "normal" },
      { name: "Blood Film (Thick & Thin)", value: "No hemoparasites seen", unit: "", refRange: "No parasites seen", flag: "normal" },
    ],
  },
  lipid: {
    defaultInterpretation: "Normal",
    rows: [
      { name: "Total Cholesterol", value: "185", unit: "mg/dL", refRange: "< 200", flag: "normal" },
      { name: "Triglycerides", value: "130", unit: "mg/dL", refRange: "< 150", flag: "normal" },
      { name: "HDL Cholesterol", value: "52", unit: "mg/dL", refRange: "> 40", flag: "normal" },
      { name: "LDL Cholesterol", value: "98", unit: "mg/dL", refRange: "< 100", flag: "normal" },
    ],
  },
  sugar: {
    defaultInterpretation: "Normal",
    rows: [
      { name: "Fasting Blood Sugar (FBS)", value: "92", unit: "mg/dL", refRange: "70 - 100", flag: "normal" },
    ],
  },
  renal: {
    defaultInterpretation: "Normal",
    rows: [
      { name: "Serum Creatinine", value: "0.9", unit: "mg/dL", refRange: "0.6 - 1.2", flag: "normal" },
      { name: "Blood Urea Nitrogen (BUN)", value: "14", unit: "mg/dL", refRange: "7 - 20", flag: "normal" },
      { name: "eGFR", value: "98", unit: "mL/min/1.73m²", refRange: "> 90", flag: "normal" },
    ],
  },
  liver: {
    defaultInterpretation: "Normal",
    rows: [
      { name: "ALT (SGPT)", value: "24", unit: "U/L", refRange: "7 - 56", flag: "normal" },
      { name: "AST (SGOT)", value: "22", unit: "U/L", refRange: "10 - 40", flag: "normal" },
      { name: "Alkaline Phosphatase (ALP)", value: "78", unit: "U/L", refRange: "44 - 147", flag: "normal" },
      { name: "Total Bilirubin", value: "0.7", unit: "mg/dL", refRange: "0.1 - 1.2", flag: "normal" },
    ],
  },
  stool: {
    defaultInterpretation: "Normal",
    rows: [
      { name: "Color & Consistency", value: "Brown, Formed", unit: "", refRange: "Brown, Formed", flag: "normal" },
      { name: "Ova / Cysts / Parasites", value: "None seen", unit: "", refRange: "None seen", flag: "normal" },
      { name: "Pus Cells", value: "0 - 1", unit: "/hpf", refRange: "None seen", flag: "normal" },
      { name: "Occult Blood", value: "Negative", unit: "", refRange: "Negative", flag: "normal" },
    ],
  },
  widal: {
    defaultInterpretation: "Normal",
    rows: [
      { name: "S. Typhi 'O' Antigen", value: "< 1:80", unit: "Titre", refRange: "< 1:80", flag: "normal" },
      { name: "S. Typhi 'H' Antigen", value: "< 1:80", unit: "Titre", refRange: "< 1:80", flag: "normal" },
    ],
  },
};

function getTemplateForTest(testName: string): { rows: ParamRow[]; defaultInterpretation: string } {
  const lower = testName.toLowerCase();
  for (const [key, val] of Object.entries(TEST_TEMPLATES)) {
    if (lower.includes(key)) {
      return {
        defaultInterpretation: val.defaultInterpretation,
        rows: val.rows.map((r) => ({ ...r })),
      };
    }
  }
  // Generic single-parameter template
  return {
    defaultInterpretation: "Normal",
    rows: [{ name: testName, value: "", unit: "", refRange: "", flag: "normal" }],
  };
}

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

function LabResultContent() {
  const router = useRouter();
  const params = useSearchParams();
  const orderIdParam = params.get("orderId") ?? "";
  const qc = useQueryClient();

  const [pageTab, setPageTab] = useState<PageTab>(orderIdParam ? "enter" : "enter");
  const [searchQuery, setSearchQuery] = useState("");
  const [completedSearch, setCompletedSearch] = useState("");

  // Pending / in-progress orders (for lab tech entry)
  const { data: pendingOrders = [], refetch: refetchQueue } = useQuery({
    ...trpc.lab.queue.queryOptions(),
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Completed results (for technician and doctor review)
  const { data: completedOrders = [], refetch: refetchCompleted } = useQuery({
    ...trpc.lab.completed.queryOptions(),
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const [selectedOrderId, setSelectedOrderId] = useState<string>(orderIdParam);

  // Auto-select first order if none selected or matched
  const order = useMemo(() => {
    if (selectedOrderId) {
      return pendingOrders.find((o) => o.id === selectedOrderId) || null;
    }
    return pendingOrders[0] || null;
  }, [pendingOrders, selectedOrderId]);

  // Form states
  const [paramRows, setParamRows] = useState<ParamRow[]>(() => {
    const defaultOrder = pendingOrders.find((o) => o.id === (orderIdParam || pendingOrders[0]?.id));
    return defaultOrder ? getTemplateForTest(defaultOrder.testName).rows : [];
  });

  const [interpretation, setInterpretation] = useState("Normal");
  const [technicianNotes, setTechnicianNotes] = useState("");
  const [submittedResult, setSubmittedResult] = useState<{
    order: NonNullable<typeof order>;
    rows: ParamRow[];
    interpretation: string;
  } | null>(null);

  // When selected order changes, initialize structured parameters
  const handleSelectOrder = (newOrder: (typeof pendingOrders)[number]) => {
    setSelectedOrderId(newOrder.id);
    const template = getTemplateForTest(newOrder.testName);
    setParamRows(template.rows);
    setInterpretation(template.defaultInterpretation);
    setTechnicianNotes("");
  };

  const startOrder = useMutation(
    trpc.lab.updateStatus.mutationOptions({
      onSuccess: () => qc.invalidateQueries({ queryKey: trpc.lab.queue.queryKey() }),
    })
  );

  const enterResult = useMutation(
    trpc.lab.enterResult.mutationOptions({
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: trpc.lab.queue.queryKey() });
        qc.invalidateQueries({ queryKey: trpc.lab.completed.queryKey() });
      },
    })
  );

  const handleStart = async () => {
    if (!order) return;
    await startOrder.mutateAsync({ orderId: order.id, status: "in-progress" });
  };

  const handleUpdateRow = (index: number, field: keyof ParamRow, val: string) => {
    setParamRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: val } : row))
    );
  };

  const handleAddRow = () => {
    setParamRows((prev) => [
      ...prev,
      { name: "Additional Parameter", value: "", unit: "", refRange: "", flag: "normal" },
    ]);
  };

  const handleRemoveRow = (index: number) => {
    setParamRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleApplyNormalPreset = () => {
    if (!order) return;
    const template = getTemplateForTest(order.testName);
    setParamRows(template.rows);
    setInterpretation("Normal");
  };

  const handleSendToDoctor = async () => {
    if (!order || paramRows.length === 0) return;
    const fullInterpretation = technicianNotes.trim()
      ? `${interpretation} — ${technicianNotes.trim()}`
      : interpretation;

    await enterResult.mutateAsync({
      orderId: order.id,
      results: paramRows.map((r) => ({
        name: r.name,
        value: r.value || "Not evaluated",
        unit: r.unit || "",
        refRange: r.refRange || "",
        flag: r.flag || "normal",
      })),
      interpretation: fullInterpretation,
    });

    setSubmittedResult({
      order,
      rows: paramRows,
      interpretation: fullInterpretation,
    });
  };

  // Filtered lists
  const filteredPending = useMemo(() => {
    if (!searchQuery.trim()) return pendingOrders;
    const q = searchQuery.toLowerCase();
    return pendingOrders.filter(
      (o) =>
        o.testName.toLowerCase().includes(q) ||
        o.visit.patient.nameEn.toLowerCase().includes(q) ||
        (o.visit.patient.nameAm && o.visit.patient.nameAm.toLowerCase().includes(q)) ||
        o.visit.patient.healthId.toLowerCase().includes(q)
    );
  }, [pendingOrders, searchQuery]);

  const filteredCompleted = useMemo(() => {
    if (!completedSearch.trim()) return completedOrders;
    const q = completedSearch.toLowerCase();
    return completedOrders.filter(
      (o) =>
        o.testName.toLowerCase().includes(q) ||
        o.visit.patient.nameEn.toLowerCase().includes(q) ||
        (o.visit.patient.nameAm && o.visit.patient.nameAm.toLowerCase().includes(q)) ||
        o.visit.patient.healthId.toLowerCase().includes(q)
    );
  }, [completedOrders, completedSearch]);

  // Submission Success Modal / Banner
  if (submittedResult) {
    const { order: subOrder, rows, interpretation: subInterp } = submittedResult;
    const activeBed = subOrder.visit.admissions?.[0]?.bed;
    return (
      <PageShell title="Laboratory Result Sign-Off">
        <Card className="p-8 max-w-2xl mx-auto shadow-md border-emerald-200 bg-white">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="font-bold text-slate-800 text-xl text-center mb-1">
            Diagnostic Result Signed Off & Sent to Doctor
          </h2>
          <p className="text-center text-xs text-slate-500 mb-6">
            Verified report has been accrued into the patient's EMR encounter and is immediately viewable by the attending clinician.
          </p>

          {/* Patient and Test Summary Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-5 text-xs space-y-2">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div>
                <p className="text-sm font-bold text-slate-800">{subOrder.visit.patient.nameEn}</p>
                <p className="text-slate-500">
                  Health ID: <span className="font-mono font-medium">{subOrder.visit.patient.healthId}</span> · {subOrder.visit.patient.sex === "M" ? "Male" : "Female"} ({calculateAge(subOrder.visit.patient.dob)})
                </p>
              </div>
              <div className="text-right">
                <span className="font-semibold text-teal-800 text-sm">{subOrder.testName}</span>
                <p className="text-slate-400">Order ID: #{subOrder.id.slice(-6)}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-600">
                Location: <strong>{activeBed ? `Inpatient: ${activeBed.ward}, Room ${activeBed.room}` : "OPD Consultation"}</strong>
              </span>
              <span className="text-slate-600">
                Interpretation:{" "}
                <strong className={subInterp.includes("Critical") ? "text-red-600" : "text-emerald-700"}>
                  {subInterp}
                </strong>
              </span>
            </div>
          </div>

          {/* Structured Values Table */}
          <div className="overflow-x-auto rounded border border-slate-200 mb-6">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Test Parameter</th>
                  <th className="px-3 py-2 text-left font-semibold">Measured Value</th>
                  <th className="px-3 py-2 text-left font-semibold">Units</th>
                  <th className="px-3 py-2 text-left font-semibold">Reference Range</th>
                  <th className="px-3 py-2 text-left font-semibold">Flag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium text-slate-800">{r.name}</td>
                    <td className="px-3 py-2 font-bold text-slate-900">{r.value}</td>
                    <td className="px-3 py-2 text-slate-500">{r.unit || "—"}</td>
                    <td className="px-3 py-2 text-slate-500">{r.refRange || "—"}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          r.flag === "critical"
                            ? "bg-red-100 text-red-800"
                            : r.flag === "high" || r.flag === "low"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {r.flag}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => {
                setSubmittedResult(null);
                setPageTab("completed");
                refetchCompleted();
              }}
              className={btnPrimary}
            >
              <ClipboardList size={14} className="mr-1.5 inline" /> View in Completed Results
            </button>
            <button
              onClick={() => {
                setSubmittedResult(null);
                setSelectedOrderId("");
                setParamRows([]);
                refetchQueue();
              }}
              className={btnSecondary}
            >
              <RotateCcw size={14} className="mr-1.5 inline" /> Enter Next Result
            </button>
            <Link
              href={`/nova/doctor/emr?visitId=${subOrder.visitId}`}
              className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-semibold rounded hover:bg-slate-50"
            >
              Open Patient EMR →
            </Link>
          </div>
        </Card>
      </PageShell>
    );
  }

  const activeInpatientBed = order?.visit?.admissions?.[0]?.bed;

  return (
    <PageShell
      title="Laboratory Workstation"
      subtitle="Lab Technician result entry, parameter verification & service clearance"
    >
      {/* Page Tabs */}
      <div className="flex items-center gap-2 mb-5">
        <button
          onClick={() => setPageTab("enter")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border transition-all ${
            pageTab === "enter"
              ? "bg-teal-600 text-white border-teal-600 shadow-xs"
              : "bg-white border-slate-200 text-slate-700 hover:border-teal-400"
          }`}
        >
          <FlaskConical size={14} />
          <span>Pending Result Entry</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] ${
              pageTab === "enter" ? "bg-teal-700 text-teal-100" : "bg-slate-200 text-slate-700"
            }`}
          >
            {pendingOrders.length}
          </span>
        </button>

        <button
          onClick={() => setPageTab("completed")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border transition-all ${
            pageTab === "completed"
              ? "bg-teal-600 text-white border-teal-600 shadow-xs"
              : "bg-white border-slate-200 text-slate-700 hover:border-teal-400"
          }`}
        >
          <ClipboardList size={14} />
          <span>Completed Diagnostic Results</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] ${
              pageTab === "completed" ? "bg-teal-700 text-teal-100" : "bg-slate-200 text-slate-700"
            }`}
          >
            {completedOrders.length}
          </span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: ENTER RESULT
      ───────────────────────────────────────────────────────────── */}
      {pageTab === "enter" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Orders Queue with Search */}
          <div className="lg:col-span-4 space-y-3">
            {/* Search Box */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search patient, health ID, test…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-1">
              <span>Specimen Queue ({filteredPending.length})</span>
              <button
                onClick={() => refetchQueue()}
                className="text-teal-700 hover:underline capitalize font-medium"
              >
                ↻ Refresh
              </button>
            </div>

            {filteredPending.length === 0 ? (
              <Card className="p-8 text-center bg-white border-slate-200">
                <FlaskConical className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-700">No matching orders in queue</p>
                <p className="text-[11px] text-slate-400 mt-0.5">All pending tests have been completed!</p>
              </Card>
            ) : (
              <div className="space-y-2 max-h-[750px] overflow-y-auto pr-1">
                {filteredPending.map((o) => {
                  const isSelected = order?.id === o.id;
                  const isUrgent = o.priority === "urgent";
                  const hasActiveAdmission = o.visit.admissions && o.visit.admissions.length > 0;
                  const bed = o.visit.admissions?.[0]?.bed;

                  return (
                    <div
                      key={o.id}
                      onClick={() => handleSelectOrder(o)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? "border-teal-600 bg-teal-50/80 shadow-xs"
                          : "border-slate-200 bg-white hover:border-teal-300"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="font-bold text-slate-900 text-xs">{o.testName}</span>
                        <div className="flex items-center gap-1">
                          {isUrgent && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-red-100 text-red-700 animate-pulse">
                              STAT
                            </span>
                          )}
                          <StatusBadge status={o.status} />
                        </div>
                      </div>

                      {/* Clear Patient Context */}
                      <div className="text-xs text-slate-700 space-y-0.5">
                        <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <User size={13} className="text-slate-400" />
                          <span>{o.visit.patient.nameEn}</span>
                        </p>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                          <span className="font-mono">{o.visit.patient.healthId}</span>
                          <span>
                            {o.visit.patient.sex === "M" ? "Male" : "Female"} · {calculateAge(o.visit.patient.dob)}
                          </span>
                        </div>
                      </div>

                      {/* Inpatient Bed or OPD Badge */}
                      <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100 text-[11px]">
                        {hasActiveAdmission && bed ? (
                          <span className="text-purple-700 font-semibold flex items-center gap-1">
                            <BedDouble size={12} /> {bed.ward}, {bed.room}
                          </span>
                        ) : (
                          <span className="text-slate-500">OPD Encounter</span>
                        )}
                        <span className="text-slate-400 flex items-center gap-1">
                          <Clock size={11} /> {new Date(o.orderedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Clear Patient Identity Banner + Results Entry Form */}
          <div className="lg:col-span-8 space-y-4">
            {!order ? (
              <Card className="p-16 text-center bg-white border-slate-200">
                <FlaskConical size={40} className="text-slate-300 mx-auto mb-3" />
                <h3 className="font-bold text-slate-800 text-base mb-1">No Laboratory Order Selected</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Select a patient test order from the left specimen queue to view complete patient details and record verified results.
                </p>
              </Card>
            ) : (
              <>
                {/* ── 1. Clear Patient Identity Banner ── */}
                <Card className="p-4 bg-white border border-slate-200 shadow-xs">
                  <div className="flex flex-wrap items-start justify-between gap-4 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-teal-100 text-teal-800 font-bold text-base flex items-center justify-center shrink-0 border border-teal-200">
                        {order.visit.patient.nameEn.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="font-bold text-slate-900 text-base">
                            {order.visit.patient.nameEn}
                          </h2>
                          {order.visit.patient.nameAm && (
                            <span className="text-xs text-slate-500 font-medium">({order.visit.patient.nameAm})</span>
                          )}
                          {order.visit.patient.cbhiStatus ? (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                              <ShieldCheck size={12} /> CBHI Enrolled
                            </span>
                          ) : (
                            <span className="text-[11px] px-2 py-0.5 rounded font-medium bg-slate-100 text-slate-600">
                              Self-Pay / Cash
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                          <span>
                            Health ID: <strong className="font-mono text-slate-700">{order.visit.patient.healthId}</strong>
                          </span>
                          <span>•</span>
                          <span>Gender: <strong>{order.visit.patient.sex === "M" ? "Male" : "Female"}</strong></span>
                          <span>•</span>
                          <span>Age: <strong>{calculateAge(order.visit.patient.dob)}</strong></span>
                          {order.visit.patient.phone && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Phone size={11} /> {order.visit.patient.phone}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Test & Urgency Status */}
                    <div className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-base font-bold text-teal-800">{order.testName}</span>
                        {order.priority === "urgent" ? (
                          <span className="text-xs px-2 py-0.5 rounded font-bold bg-red-100 text-red-700 animate-pulse border border-red-300">
                            🚨 STAT / URGENT
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded font-medium bg-slate-100 text-slate-600">
                            Routine
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Ordered on {new Date(order.orderedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                      </p>
                    </div>
                  </div>

                  {/* Ward / OPD Location & Doctor Indication Ribbon */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 text-xs">
                    <div className="flex items-center gap-4 text-slate-600">
                      {activeInpatientBed ? (
                        <span className="flex items-center gap-1.5 text-purple-800 font-semibold bg-purple-50 px-2 py-1 rounded border border-purple-200">
                          <BedDouble size={14} /> Admitted Inpatient: {activeInpatientBed.ward}, Room {activeInpatientBed.room} (Bed {activeInpatientBed.id})
                        </span>
                      ) : (
                        <span className="text-slate-600 bg-slate-100 px-2 py-1 rounded">
                          OPD Consultation Encounter
                        </span>
                      )}

                      {order.indication && (
                        <span>
                          Clinical Indication: <strong className="text-slate-800">{order.indication}</strong>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {order.status === "pending" && (
                        <button
                          type="button"
                          onClick={handleStart}
                          disabled={startOrder.isPending}
                          className="px-3 py-1 bg-amber-500 text-white rounded text-xs font-semibold hover:bg-amber-600 disabled:opacity-50 transition-colors"
                        >
                          {startOrder.isPending ? "Starting…" : "▶ Mark In-Progress"}
                        </button>
                      )}
                      <Link
                        href={`/nova/doctor/emr?visitId=${order.visitId}`}
                        target="_blank"
                        className="text-teal-700 hover:underline text-xs flex items-center gap-1 font-medium"
                      >
                        Patient EMR <ArrowRight size={11} />
                      </Link>
                    </div>
                  </div>
                </Card>

                {/* ── 2. Structured Laboratory Results Entry Form ── */}
                <Card className="p-5 bg-white border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">
                        Measured Test Parameters & Quantitative Findings
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Record values for {order.testName}. Pre-filled standard clinical reference intervals are shown.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleApplyNormalPreset}
                        className="flex items-center gap-1 text-xs px-2.5 py-1 bg-teal-50 text-teal-700 rounded border border-teal-200 hover:bg-teal-100 font-semibold"
                        title="Quick-fill standard normal reference range preset"
                      >
                        <Sparkles size={12} /> Auto-Fill Normal Preset
                      </button>
                      <button
                        type="button"
                        onClick={handleAddRow}
                        className="flex items-center gap-1 text-xs px-2.5 py-1 bg-slate-100 text-slate-700 rounded border border-slate-200 hover:bg-slate-200 font-medium"
                      >
                        <Plus size={12} /> Add Row
                      </button>
                    </div>
                  </div>

                  {/* Parameter Entry Table */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
                          <th className="px-3 py-2 text-left font-bold">Parameter Name</th>
                          <th className="px-3 py-2 text-left font-bold w-44">Measured Result Value</th>
                          <th className="px-3 py-2 text-left font-bold w-24">Unit</th>
                          <th className="px-3 py-2 text-left font-bold w-32">Reference Interval</th>
                          <th className="px-3 py-2 text-left font-bold w-28">Clinical Flag</th>
                          <th className="px-2 py-2 text-center w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paramRows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/70">
                            {/* Parameter Name */}
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={row.name}
                                onChange={(e) => handleUpdateRow(idx, "name", e.target.value)}
                                className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-800 focus:outline-none focus:border-teal-500"
                              />
                            </td>

                            {/* Measured Value */}
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={row.value}
                                placeholder="Enter value…"
                                onChange={(e) => handleUpdateRow(idx, "value", e.target.value)}
                                className={`w-full px-2.5 py-1 border rounded text-xs font-bold focus:outline-none ${
                                  row.flag === "critical"
                                    ? "bg-red-50 border-red-300 text-red-900"
                                    : row.flag === "high" || row.flag === "low"
                                    ? "bg-amber-50 border-amber-300 text-amber-900"
                                    : "bg-white border-slate-300 text-slate-900 focus:border-teal-500"
                                }`}
                              />
                            </td>

                            {/* Unit */}
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={row.unit}
                                placeholder="—"
                                onChange={(e) => handleUpdateRow(idx, "unit", e.target.value)}
                                className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-600 focus:outline-none focus:border-teal-500"
                              />
                            </td>

                            {/* Reference Range */}
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={row.refRange}
                                placeholder="Normal range"
                                onChange={(e) => handleUpdateRow(idx, "refRange", e.target.value)}
                                className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-500 focus:outline-none focus:border-teal-500"
                              />
                            </td>

                            {/* Flag Selection */}
                            <td className="px-3 py-2">
                              <select
                                value={row.flag}
                                onChange={(e) =>
                                  handleUpdateRow(idx, "flag", e.target.value as ParamRow["flag"])
                                }
                                className={`w-full px-2 py-1 rounded text-xs font-bold border ${
                                  row.flag === "critical"
                                    ? "bg-red-100 text-red-800 border-red-300"
                                    : row.flag === "high"
                                    ? "bg-amber-100 text-amber-800 border-amber-300"
                                    : row.flag === "low"
                                    ? "bg-blue-100 text-blue-800 border-blue-300"
                                    : "bg-emerald-50 text-emerald-800 border-emerald-200"
                                }`}
                              >
                                <option value="normal">Normal</option>
                                <option value="high">High ↑</option>
                                <option value="low">Low ↓</option>
                                <option value="critical">Critical ⚠</option>
                              </select>
                            </td>

                            {/* Remove row */}
                            <td className="px-2 py-2 text-center">
                              {paramRows.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveRow(idx)}
                                  className="text-slate-300 hover:text-red-500 transition-colors p-1"
                                  title="Remove parameter"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>

                {/* ── 3. Diagnostic Interpretation & Sign-Off ── */}
                <Card className="p-5 bg-white border border-slate-200 shadow-xs space-y-4">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm mb-1">
                      Clinical Impression & Overall Interpretation
                    </h3>
                    <p className="text-[11px] text-slate-500 mb-3">
                      Select the diagnostic conclusion to alert the ordering doctor.
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {[
                        { label: "Normal", color: "bg-emerald-600 text-white border-emerald-600" },
                        { label: "Abnormal — High", color: "bg-amber-600 text-white border-amber-600" },
                        { label: "Abnormal — Low", color: "bg-blue-600 text-white border-blue-600" },
                        { label: "Critical Alert ⚠", color: "bg-red-600 text-white border-red-600" },
                      ].map((opt) => (
                        <button
                          key={opt.label}
                          type="button"
                          onClick={() => setInterpretation(opt.label)}
                          className={`px-3 py-2 rounded-lg border text-xs font-bold transition-all ${
                            interpretation === opt.label
                              ? opt.color
                              : "bg-white border-slate-200 text-slate-700 hover:border-teal-400"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Technician Remarks */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Technician Remarks & Verification Notes (Optional):
                    </label>
                    <textarea
                      value={technicianNotes}
                      onChange={(e) => setTechnicianNotes(e.target.value)}
                      placeholder="e.g. Specimen verified on secondary chemistry analyzer. Panic value communicated to Dr. Dawit."
                      className={`${inputCls} resize-none h-16`}
                    />
                  </div>

                  {enterResult.error && (
                    <p className="text-xs font-semibold text-red-600 bg-red-50 p-2 rounded border border-red-200">
                      {enterResult.error.message}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleApplyNormalPreset()}
                      className="text-xs text-slate-500 hover:text-slate-800"
                    >
                      Reset to Defaults
                    </button>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={paramRows.length === 0 || enterResult.isPending}
                        onClick={handleSendToDoctor}
                        className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white text-xs rounded-lg hover:bg-teal-700 disabled:opacity-50 font-bold shadow-xs transition-colors"
                      >
                        <Send size={14} />
                        {enterResult.isPending ? "Signing off & Sending…" : "Sign Off & Send Result to Doctor →"}
                      </button>
                    </div>
                  </div>
                </Card>
              </>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: COMPLETED RESULTS
      ───────────────────────────────────────────────────────────── */}
      {pageTab === "completed" && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="flex items-center justify-between gap-4 max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search completed results by patient, ID, test…"
                value={completedSearch}
                onChange={(e) => setCompletedSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-teal-500"
              />
            </div>
            <button
              onClick={() => refetchCompleted()}
              className="text-xs text-teal-700 hover:underline font-semibold"
            >
              ↻ Refresh
            </button>
          </div>

          {filteredCompleted.length === 0 ? (
            <Card className="p-16 text-center bg-white border-slate-200">
              <ClipboardList size={36} className="text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700">No completed lab results found</p>
              <p className="text-xs text-slate-400 mt-1">
                Completed and verified laboratory records will appear here for review.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredCompleted.map((o) => {
                let parsedRows: ParamRow[] = [];
                if (o.result?.resultsJson) {
                  try {
                    parsedRows = JSON.parse(o.result.resultsJson);
                  } catch {
                    parsedRows = [];
                  }
                }

                const flag = parsedRows.some((r) => r.flag === "critical")
                  ? "critical"
                  : parsedRows.some((r) => r.flag === "high" || r.flag === "low")
                  ? "abnormal"
                  : "normal";

                const bed = o.visit.admissions?.[0]?.bed;

                return (
                  <Card key={o.id} className="p-4 bg-white border border-slate-200 shadow-xs">
                    <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{o.testName}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              flag === "critical"
                                ? "bg-red-100 text-red-800"
                                : flag === "abnormal"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {o.result?.interpretation || "Completed"}
                          </span>
                          {o.priority === "urgent" && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-red-50 text-red-700 rounded font-semibold border border-red-200">
                              STAT
                            </span>
                          )}
                        </div>

                        {/* Patient info */}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-1">
                          <span className="font-semibold text-slate-800">
                            {o.visit.patient.nameEn}
                          </span>
                          <span>•</span>
                          <span className="font-mono text-slate-500">{o.visit.patient.healthId}</span>
                          <span>•</span>
                          <span>{o.visit.patient.sex === "M" ? "Male" : "Female"} ({calculateAge(o.visit.patient.dob)})</span>
                          {bed && (
                            <>
                              <span>•</span>
                              <span className="text-purple-700 font-semibold">
                                Ward: {bed.ward}, {bed.room}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/nova/doctor/emr?visitId=${o.visitId}`}
                          className="px-3 py-1.5 bg-teal-50 border border-teal-200 text-teal-700 rounded text-xs font-semibold hover:bg-teal-100 flex items-center gap-1"
                        >
                          <span>Open Patient EMR</span>
                          <ArrowRight size={12} />
                        </Link>
                      </div>
                    </div>

                    {/* Breakdown of parameters */}
                    {Array.isArray(parsedRows) && parsedRows.length > 0 && (
                      <div className="mt-3 overflow-x-auto">
                        <table className="min-w-full text-xs">
                          <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase">
                            <tr>
                              <th className="px-3 py-1.5 text-left font-semibold">Parameter</th>
                              <th className="px-3 py-1.5 text-left font-semibold">Value</th>
                              <th className="px-3 py-1.5 text-left font-semibold">Unit</th>
                              <th className="px-3 py-1.5 text-left font-semibold">Reference Range</th>
                              <th className="px-3 py-1.5 text-left font-semibold">Flag</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {parsedRows.map((r, i) => (
                              <tr key={i} className="hover:bg-slate-50">
                                <td className="px-3 py-1.5 font-medium text-slate-700">{r.name}</td>
                                <td className="px-3 py-1.5 font-bold text-slate-900">{r.value}</td>
                                <td className="px-3 py-1.5 text-slate-500">{r.unit || "—"}</td>
                                <td className="px-3 py-1.5 text-slate-500">{r.refRange || "—"}</td>
                                <td className="px-3 py-1.5">
                                  <span
                                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                                      r.flag === "critical"
                                        ? "bg-red-100 text-red-800"
                                        : r.flag === "high" || r.flag === "low"
                                        ? "bg-amber-100 text-amber-800"
                                        : "bg-emerald-100 text-emerald-800"
                                    }`}
                                  >
                                    {r.flag}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-100 text-[11px] text-slate-400">
                      <span>Verified & Entered: {o.result ? new Date(o.result.enteredAt).toLocaleString() : "—"}</span>
                      <span>Order Ref: #{o.id.slice(-6)}</span>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}

export default function LabResultEntryPage() {
  return (
    <Suspense
      fallback={
        <PageShell title="Laboratory Workstation">
          <p className="p-6 text-slate-400">Loading lab workstation…</p>
        </PageShell>
      }
    >
      <LabResultContent />
    </Suspense>
  );
}
