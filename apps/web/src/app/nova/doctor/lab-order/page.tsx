"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { PageShell, Card, FormField, inputCls, btnPrimary, btnSecondary, StatusBadge } from "@/components/nova/nova-ui";
import { useNovaRole } from "@/components/nova/nova-role-context";
import { getDepartmentConfig, doesTicketBelongToDepartment } from "@/lib/department-configs";
import {
  CheckCircle,
  FlaskConical,
  Search,
  Plus,
  X,
  AlertTriangle,
  Clock,
  Zap,
  Activity,
  Heart,
  Thermometer,
  Wind,
  Filter,
  Check,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ArrowLeft,
  FileText,
  User,
  Sparkles,
  Layers,
  Info,
  Trash2,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";

interface LabCatalogItem {
  id: string;
  name: string;
  category: "Hematology" | "Biochemistry" | "Serology" | "Microbiology" | "Endocrine" | "Specialty" | "Custom";
  specimen: string;
  turnaround: string;
  isStat?: boolean;
  fasting?: boolean;
  isCommon?: boolean;
}

const COMPREHENSIVE_LAB_CATALOG: LabCatalogItem[] = [
  // ─── HIGH-VOLUME / MOST ORDERED ROUTINE TESTS (DISPLAYED FIRST ON TOP) ───
  { id: "cbc", name: "CBC (Complete Blood Count with Differential)", category: "Hematology", specimen: "Whole Blood (EDTA)", turnaround: "15-30 min", isStat: true, isCommon: true },
  { id: "urinalysis", name: "Urinalysis (Complete Dipstick + Microscopy)", category: "Microbiology", specimen: "Fresh Random Urine", turnaround: "15 min", isStat: true, isCommon: true },
  { id: "malaria", name: "Malaria Rapid Test (RDT) & Blood Film", category: "Serology", specimen: "Whole Blood (EDTA)", turnaround: "15 min", isStat: true, isCommon: true },
  { id: "fbs", name: "Fasting Blood Sugar (FBS)", category: "Biochemistry", specimen: "Fluoride / Serum", turnaround: "15-20 min", fasting: true, isCommon: true },
  { id: "rbs", name: "Random Blood Sugar (RBS)", category: "Biochemistry", specimen: "Serum / Capillary", turnaround: "10 min", isStat: true, isCommon: true },
  { id: "widal", name: "Widal Slide Agglutination (Typhoid)", category: "Serology", specimen: "Serum", turnaround: "20 min", isCommon: true },
  { id: "rft", name: "Renal Function Tests (RFT: BUN, Creatinine, Urea)", category: "Biochemistry", specimen: "Serum (SST)", turnaround: "45 min", isStat: true, isCommon: true },
  { id: "lft", name: "Liver Function Tests (LFT: AST, ALT, ALP, Bilirubin)", category: "Biochemistry", specimen: "Serum (SST)", turnaround: "45-60 min", isCommon: true },
  { id: "lipid", name: "Lipid Profile (Total Chol, HDL, LDL, Triglycerides)", category: "Biochemistry", specimen: "Serum (SST)", turnaround: "45 min", fasting: true, isCommon: true },
  { id: "blood_group", name: "Blood Grouping & Rh Factor", category: "Hematology", specimen: "Whole Blood (EDTA)", turnaround: "15 min", isStat: true, isCommon: true },
  { id: "stool_exam", name: "Stool Examination (Microscopy for O&P)", category: "Microbiology", specimen: "Fresh Stool", turnaround: "20 min", isCommon: true },
  { id: "hba1c", name: "HbA1c (Glycated Hemoglobin)", category: "Biochemistry", specimen: "Whole Blood (EDTA)", turnaround: "20 min", isCommon: true },
  { id: "electrolytes", name: "Serum Electrolytes (Na+, K+, Cl-)", category: "Biochemistry", specimen: "Serum (SST)", turnaround: "30 min", isStat: true, isCommon: true },
  { id: "upt", name: "Urine Pregnancy Test (hCG Rapid)", category: "Endocrine", specimen: "Random Urine", turnaround: "5 min", isStat: true, isCommon: true },
  { id: "hiv", name: "HIV 1/2 Rapid Diagnostic Screen", category: "Serology", specimen: "Whole Blood / Serum", turnaround: "15 min", isCommon: true },
  { id: "hpylori_stool", name: "H. Pylori Stool Antigen", category: "Serology", specimen: "Fresh Stool", turnaround: "15 min", isCommon: true },
  { id: "esr", name: "ESR (Erythrocyte Sedimentation Rate)", category: "Hematology", specimen: "Citrated Blood", turnaround: "60 min", isCommon: true },
  { id: "sputum_afb", name: "Sputum AFB / GeneXpert (TB)", category: "Microbiology", specimen: "Early Morning Sputum", turnaround: "2-24 hrs", isCommon: true },
  { id: "hbsag", name: "Hepatitis B Surface Antigen (HBsAg)", category: "Serology", specimen: "Serum", turnaround: "15 min", isCommon: true },
  { id: "crp", name: "C-Reactive Protein (CRP - Quantitative)", category: "Serology", specimen: "Serum (SST)", turnaround: "20 min", isStat: true, isCommon: true },

  // ─── ADDITIONAL SPECIALIZED INVESTIGATIONS ───
  { id: "bf", name: "Peripheral Blood Smear / Film (BF)", category: "Hematology", specimen: "Capillary / EDTA", turnaround: "30 min", isStat: true },
  { id: "pt_inr", name: "Coagulation Profile (PT / INR)", category: "Hematology", specimen: "Sodium Citrate Tube", turnaround: "30-45 min", isStat: true },
  { id: "aptt", name: "aPTT (Activated Partial Thromboplastin Time)", category: "Hematology", specimen: "Sodium Citrate Tube", turnaround: "30-45 min", isStat: true },
  { id: "retic", name: "Reticulocyte Count", category: "Hematology", specimen: "Whole Blood (EDTA)", turnaround: "45 min" },
  { id: "sickling", name: "Sickle Cell Screening Test", category: "Hematology", specimen: "Whole Blood (EDTA)", turnaround: "30 min" },
  { id: "uric_acid", name: "Serum Uric Acid", category: "Biochemistry", specimen: "Serum (SST)", turnaround: "40 min" },
  { id: "amylase_lipase", name: "Serum Amylase & Lipase", category: "Biochemistry", specimen: "Serum (SST)", turnaround: "45 min", isStat: true },
  { id: "troponin", name: "Cardiac Troponin I / T (STAT)", category: "Biochemistry", specimen: "Whole Blood / Serum", turnaround: "15 min", isStat: true },
  { id: "calcium", name: "Serum Calcium & Inorganic Phosphate", category: "Biochemistry", specimen: "Serum (SST)", turnaround: "45 min" },
  { id: "weil_felix", name: "Weil-Felix Agglutination (Typhus)", category: "Serology", specimen: "Serum", turnaround: "20 min" },
  { id: "hcv", name: "Hepatitis C Virus Antibody (HCV Ab)", category: "Serology", specimen: "Serum", turnaround: "15 min" },
  { id: "syphilis", name: "Syphilis Rapid / RPR / VDRL", category: "Serology", specimen: "Serum", turnaround: "15 min" },
  { id: "hpylori_serum", name: "H. Pylori Serum Antibody", category: "Serology", specimen: "Serum", turnaround: "15 min" },
  { id: "aso", name: "ASO Titre (Antistreptolysin O)", category: "Serology", specimen: "Serum", turnaround: "30 min" },
  { id: "covid", name: "COVID-19 Ag Rapid Test", category: "Serology", specimen: "Nasopharyngeal Swab", turnaround: "15 min", isStat: true },
  { id: "urine_cs", name: "Urine Culture & Sensitivity (C&S)", category: "Microbiology", specimen: "Mid-stream Sterile Urine", turnaround: "48-72 hrs" },
  { id: "stool_fobt", name: "Stool Occult Blood (FOBT)", category: "Microbiology", specimen: "Fresh Stool", turnaround: "15 min" },
  { id: "wet_mount", name: "Urethral / Vaginal Wet Mount & Gram Stain", category: "Microbiology", specimen: "Swab / Discharge", turnaround: "20 min" },
  { id: "blood_cs", name: "Blood Culture & Sensitivity (C&S)", category: "Microbiology", specimen: "Sterile Venipuncture", turnaround: "48-72 hrs" },
  { id: "wound_cs", name: "Wound Swab Culture & Sensitivity", category: "Microbiology", specimen: "Sterile Swab", turnaround: "48-72 hrs" },
  { id: "tsh", name: "Thyroid Profile (TSH, Free T3, Free T4)", category: "Endocrine", specimen: "Serum (SST)", turnaround: "2 hrs" },
  { id: "beta_hcg", name: "Serum Beta-hCG (Quantitative)", category: "Endocrine", specimen: "Serum (SST)", turnaround: "1 hr" },
  { id: "psa", name: "PSA (Prostate Specific Antigen)", category: "Endocrine", specimen: "Serum (SST)", turnaround: "2 hrs" },
  { id: "ferritin", name: "Serum Ferritin & Iron Studies", category: "Endocrine", specimen: "Serum (SST)", turnaround: "2 hrs" },
  { id: "vit_d", name: "Vitamin D (25-OH Total)", category: "Endocrine", specimen: "Serum (SST)", turnaround: "3-4 hrs" },
  { id: "vit_b12", name: "Vitamin B12 & Serum Folate", category: "Endocrine", specimen: "Serum (SST)", turnaround: "3-4 hrs" },

  // ─── SPECIALTY IMAGING & CLINIC PROCEDURES ───
  { id: "dental_iopa", name: "Single Tooth X-Ray (IOPA)", category: "Specialty", specimen: "Dental X-Ray", turnaround: "10 min", isStat: true },
  { id: "dental_opg", name: "Full Jaw Panoramic X-Ray (OPG)", category: "Specialty", specimen: "Dental X-Ray", turnaround: "15 min" },
  { id: "eye_refraction", name: "Glasses & Vision Check (Autorefraction)", category: "Specialty", specimen: "Eye Clinic", turnaround: "10 min", isStat: true },
  { id: "eye_tonometry", name: "Eye Pressure Test (Goldmann Tonometry)", category: "Specialty", specimen: "Eye Clinic", turnaround: "10 min", isStat: true },
  { id: "anc_panel", name: "Full ANC Panel (CBC, Blood Group, HIV, VDRL, HBsAg)", category: "Specialty", specimen: "Blood / Serum", turnaround: "30 min", isStat: true },
  { id: "ogtt", name: "Pregnancy Sugar Test (OGTT 75g)", category: "Biochemistry", specimen: "Serum (Timed)", turnaround: "2 hrs", fasting: true },
];

const COMMON_INDICATIONS = [
  "Malaria / Fever",
  "Typhoid",
  "Abdominal Pain",
  "Antenatal (ANC)",
  "Pre-Op Clearance",
  "Diabetes / BP Check",
  "Fatigue / Weight Loss",
  "UTI",
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

function LabOrderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { doctorDepartment } = useNovaRole();
  const rawVisitId = searchParams.get("visitId") ?? "";
  const urlDept = searchParams.get("dept");
  const urlTestCode = searchParams.get("testCode");
  const [selectedVisitId, setSelectedVisitId] = useState<string>(rawVisitId);
  const activeVisitId = selectedVisitId || rawVisitId;
  const deptConfig = useMemo(() => getDepartmentConfig(urlDept || doctorDepartment), [urlDept, doctorDepartment]);

  const qc = useQueryClient();

  // Active visit query
  const { data: visit, isLoading: isVisitLoading } = useQuery({
    ...trpc.visit.get.queryOptions({ visitId: activeVisitId }),
    enabled: !!activeVisitId,
  });

  // Doctor active OPD queue for top switcher
  const { data: queue = [] } = useQuery({
    ...trpc.visit.queue.queryOptions(),
  });

  // Database hospital tariffs for lab
  const { data: labTariffs = [] } = useQuery(
    trpc.tariff.list.queryOptions({ category: "lab", activeOnly: true })
  );

  // State management
  const [selected, setSelected] = useState<string[]>([]);
  const [customTests, setCustomTests] = useState<LabCatalogItem[]>([]);
  const [newCustomName, setNewCustomName] = useState("");
  const [newCustomSpecimen, setNewCustomSpecimen] = useState("Blood / Serum");
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [showRequisitionDrawer, setShowRequisitionDrawer] = useState(false);

  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [priority, setPriority] = useState<"routine" | "urgent">("routine");
  const [indication, setIndication] = useState("");
  const [isFasting, setIsFasting] = useState(false);
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Pre-select test if navigated from Consultation quick-order chip (?testCode=...)
  useEffect(() => {
    if (!urlTestCode) return;
    const match = COMPREHENSIVE_LAB_CATALOG.find(
      (item) => item.id.toLowerCase() === urlTestCode.toLowerCase() || item.name.toLowerCase().includes(urlTestCode.toLowerCase())
    );
    if (match) {
      setSelected((prev) => (prev.includes(match.name) ? prev : [...prev, match.name]));
    }
  }, [urlTestCode]);

  // Merge presets + database tariffs + doctor custom tests
  // Prioritize Custom -> Active Doctor Specialty tests -> Most Ordered tests
  const fullCatalog = useMemo(() => {
    const map = new Map<string, LabCatalogItem>();

    // 1. Add preset catalog
    for (const item of COMPREHENSIVE_LAB_CATALOG) {
      map.set(item.name.toLowerCase().trim(), item);
    }

    // 2. Add database tariffs not in preset
    for (const tariff of labTariffs) {
      const key = tariff.name.toLowerCase().trim();
      if (!map.has(key)) {
        map.set(key, {
          id: `tariff-${tariff.id}`,
          name: tariff.name,
          category: "Biochemistry",
          specimen: "Standard Sample",
          turnaround: "Routine",
        });
      }
    }

    // 3. Add doctor custom tests
    for (const custom of customTests) {
      map.set(custom.name.toLowerCase().trim(), custom);
    }

    const preferredSet = new Set(deptConfig.preferredLabIds);
    const items = Array.from(map.values());
    return items.sort((a, b) => {
      if (a.category === "Custom" && b.category !== "Custom") return -1;
      if (b.category === "Custom" && a.category !== "Custom") return 1;
      const aPref = preferredSet.has(a.id);
      const bPref = preferredSet.has(b.id);
      if (aPref && !bPref) return -1;
      if (!aPref && bPref) return 1;
      if (a.isCommon && !b.isCommon) return -1;
      if (!a.isCommon && b.isCommon) return 1;
      return 0;
    });
  }, [labTariffs, customTests, deptConfig.preferredLabIds]);

  // Categories list with counts (simple 1-word clear labels)
  const categories = useMemo(() => {
    const counts: Record<string, number> = {
      All: fullCatalog.length,
      Specialty: 0,
      Hematology: 0,
      Biochemistry: 0,
      Serology: 0,
      Microbiology: 0,
      Endocrine: 0,
      Custom: customTests.length,
    };
    for (const item of fullCatalog) {
      if (counts[item.category] !== undefined) {
        counts[item.category]++;
      }
    }
    return [
      { key: "All", label: "All", count: counts.All },
      ...(counts.Specialty > 0 ? [{ key: "Specialty", label: `${deptConfig.shortLabel} / Special`, count: counts.Specialty }] : []),
      { key: "Hematology", label: "Blood", count: counts.Hematology },
      { key: "Biochemistry", label: "Biochemistry", count: counts.Biochemistry },
      { key: "Serology", label: "Infections", count: counts.Serology },
      { key: "Microbiology", label: "Urine & Stool", count: counts.Microbiology },
      { key: "Endocrine", label: "Hormones", count: counts.Endocrine },
      ...(customTests.length > 0 ? [{ key: "Custom", label: "Custom", count: counts.Custom }] : []),
    ];
  }, [fullCatalog, customTests, deptConfig.shortLabel]);

  // Filtered tests based on search and active category
  const filteredTests = useMemo(() => {
    return fullCatalog.filter((item) => {
      const matchesCategory =
        activeCategory === "All" ||
        item.category.toLowerCase() === activeCategory.toLowerCase();

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.specimen.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [fullCatalog, activeCategory, searchQuery]);

  // Lab order TRPC mutation
  const orderLab = useMutation(
    trpc.lab.order.mutationOptions({
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: trpc.lab.queue.queryKey() });
        qc.invalidateQueries({ queryKey: trpc.visit.queue.queryKey() });
        if (activeVisitId) {
          qc.invalidateQueries({ queryKey: trpc.visit.get.queryKey({ visitId: activeVisitId }) });
        }
      },
    })
  );

  // Toggle test in selection
  const toggleTest = (testName: string) => {
    setSelected((prev) =>
      prev.includes(testName) ? prev.filter((x) => x !== testName) : [...prev, testName]
    );
  };

  // Add custom test
  const handleAddCustomTest = () => {
    const trimmed = newCustomName.trim();
    if (!trimmed) {
      toast.error("Please enter a test name");
      return;
    }
    const customItem: LabCatalogItem = {
      id: `custom-${Date.now()}`,
      name: trimmed,
      category: "Custom",
      specimen: newCustomSpecimen.trim() || "Sample",
      turnaround: "Special",
      isStat: priority === "urgent",
    };
    setCustomTests((prev) => [customItem, ...prev]);
    setSelected((prev) => [...prev, customItem.name]);
    setNewCustomName("");
    setShowAddCustom(false);
    toast.success(`Added: ${trimmed}`);
  };

  // Submit lab orders
  const handleSubmit = async () => {
    if (!activeVisitId) {
      toast.error("Please select a patient first");
      return;
    }
    if (selected.length === 0) {
      toast.error("Please select at least one test");
      return;
    }

    setSubmitting(true);
    try {
      const fullIndication = [
        indication ? `Reason: ${indication}` : "",
        isFasting ? "[Fasting Required]" : "",
        specialInstructions ? `Notes: ${specialInstructions}` : "",
      ]
        .filter(Boolean)
        .join(" | ");

      // Submit all selected tests in parallel
      await Promise.all(
        selected.map((testName) =>
          orderLab.mutateAsync({
            visitId: activeVisitId,
            testName,
            priority,
            indication: fullIndication || "Routine check",
          })
        )
      );

      setSubmitted(true);
      toast.success(`${selected.length} tests sent to lab`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to send order");
    } finally {
      setSubmitting(false);
    }
  };

  // Confirmation view after submission
  if (submitted) {
    return (
      <PageShell title="Lab Order Sent">
        <div className="max-w-xl mx-auto py-8">
          <Card className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md rounded-2xl">
            <div className="w-16 h-16 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-full flex items-center justify-center mx-auto mb-4 ring-8 ring-teal-50/50 dark:ring-teal-900/10">
              <CheckCircle size={36} />
            </div>

            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">
              Order Sent to Lab
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              Tests ordered for{" "}
              <strong className="text-slate-800 dark:text-slate-200">
                {visit?.patient?.nameEn || "Patient"}
              </strong>{" "}
              ({visit?.patient?.healthId || "MRN"})
            </p>

            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700 text-left mb-5">
              <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-200 dark:border-slate-700">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Tests ({selected.length})
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    priority === "urgent"
                      ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                      : "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300"
                  }`}
                >
                  {priority === "urgent" ? "⚡ STAT" : "Routine"}
                </span>
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-700 dark:text-slate-200">
                {selected.map((t) => (
                  <li key={t} className="flex items-center gap-1.5 truncate">
                    <span className="text-teal-500 font-bold">✓</span>
                    <span className="truncate">{t}</span>
                  </li>
                ))}
              </ul>

              {indication && (
                <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
                  <span className="font-semibold text-slate-500">Reason:</span> {indication}
                </div>
              )}
            </div>

            <div className="p-3 rounded-lg bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 text-xs text-teal-800 dark:text-teal-300 text-left mb-6 flex items-start gap-2">
              <Info size={16} className="shrink-0 mt-0.5 text-teal-600 dark:text-teal-400" />
              <p className="leading-relaxed">
                Patient is marked as <strong>🔬 In Lab</strong>. When results are ready, an alert will highlight this patient in your queue.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
              <button
                onClick={() => router.push(`/nova/doctor/consultation?visitId=${activeVisitId}`)}
                className={btnPrimary}
              >
                Consultation
              </button>
              <button
                onClick={() => router.push("/nova/doctor")}
                className={btnSecondary}
              >
                Doctor Queue
              </button>
            </div>
          </Card>
        </div>
      </PageShell>
    );
  }

  const latestVitals = visit?.vitals?.[0];
  const existingLabOrders = visit?.labOrders || [];

  // Next 2 waiting patients in doctor's department (fallback to any waiting)
  const deptWaiting = queue.filter(
    (q) => q.visitId !== activeVisitId && q.status !== "done" && doesTicketBelongToDepartment(q.department, deptConfig.id)
  );
  const nextPatients = (deptWaiting.length > 0 ? deptWaiting : queue.filter((q) => q.visitId !== activeVisitId && q.status !== "done")).slice(0, 2);

  return (
    <PageShell
      title={`${deptConfig.shortLabel} — ${deptConfig.sidebarLabels.labOrder}`}
      subtitle={`Top tests for ${deptConfig.shortLabel} appear first`}
      action={
        <div className="flex items-center gap-2">
          {activeVisitId && (
            <Link
              href={`/nova/doctor/consultation?visitId=${activeVisitId}&dept=${deptConfig.id}`}
              className="text-xs text-slate-600 dark:text-slate-300 hover:text-nova-primary flex items-center gap-1 font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg shadow-xs transition-colors"
            >
              <ArrowLeft size={14} /> {deptConfig.sidebarLabels.consult}
            </Link>
          )}
        </div>
      }
    >
      <div className="space-y-3.5 pb-28 w-full max-w-[1600px] mx-auto">
        {/* ── UNIFIED COMPACT PATIENT & QUEUE BAR ── */}
        {visit ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Active Patient Details & Vitals */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold text-sm shrink-0">
                {visit.patient.nameEn.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                    {visit.patient.nameEn}
                  </h2>
                  <span className="font-mono text-[11px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                    {visit.patient.healthId}
                  </span>
                  <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {visit.patient.sex?.toUpperCase() === "M" ? "Male" : visit.patient.sex?.toUpperCase() === "F" ? "Female" : "—"} · {calculateAge(visit.patient.dob)}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Ticket: <strong className="text-slate-700 dark:text-slate-300">{visit.ticket?.ticketNumber || "#OPD"}</strong>
                  </span>
                </div>

                {/* Inline Vitals Snapshot */}
                {latestVitals && (
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                    {latestVitals.bpSystolic && latestVitals.bpDiastolic && (
                      <span className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                        <Heart size={11} className="text-rose-500" /> {latestVitals.bpSystolic}/{latestVitals.bpDiastolic}
                      </span>
                    )}
                    {latestVitals.heartRate && (
                      <span className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                        <Activity size={11} className="text-teal-500" /> {latestVitals.heartRate} bpm
                      </span>
                    )}
                    {latestVitals.temperature && (
                      <span className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                        <Thermometer size={11} className="text-amber-500" /> {latestVitals.temperature}°C
                      </span>
                    )}
                    {latestVitals.spo2 && (
                      <span className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                        <Wind size={11} className="text-sky-500" /> {latestVitals.spo2}%
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Compact Switcher: Next 2 Patients */}
            {nextPatients.length > 0 && (
              <div className="flex items-center gap-1.5 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 pt-2 lg:pt-0 lg:pl-3 shrink-0">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
                  Next:
                </span>
                {nextPatients.map((q) => (
                  <button
                    key={q.id}
                    onClick={() => {
                      setSelectedVisitId(q.visitId);
                      router.replace(`/nova/doctor/lab-order?visitId=${q.visitId}`);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs transition-colors"
                    title={`Switch to ${q.visit?.patient?.nameEn}`}
                  >
                    <span className="font-mono font-bold text-teal-600 dark:text-teal-400 text-[11px]">
                      {q.ticketNumber}
                    </span>
                    <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[90px]">
                      {q.visit?.patient?.nameEn}
                    </span>
                  </button>
                ))}
                <Link
                  href="/nova/doctor"
                  className="text-[11px] text-slate-400 hover:text-teal-600 ml-1 hover:underline"
                  title="View full doctor queue"
                >
                  Queue →
                </Link>
              </div>
            )}
          </div>
        ) : (
          /* Merged No-Visit Bar with Immediate 1-Click Pick for Next 2 Patients */
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                <User size={15} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  No Patient Selected
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Pick a waiting patient to order tests:
                </p>
              </div>
            </div>

            {/* Next 2 patients in queue to pick directly */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
                Next:
              </span>
              {nextPatients.length > 0 ? (
                <>
                  {nextPatients.map((q) => (
                    <button
                      key={q.id}
                      onClick={() => {
                        setSelectedVisitId(q.visitId);
                        router.replace(`/nova/doctor/lab-order?visitId=${q.visitId}`);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/30 border border-teal-500/50 hover:bg-teal-100 dark:hover:bg-teal-900/40 text-teal-900 dark:text-teal-100 text-xs font-medium transition-colors"
                    >
                      <span className="font-mono font-bold text-teal-700 dark:text-teal-300">{q.ticketNumber}</span>
                      <span className="font-semibold">{q.visit?.patient?.nameEn}</span>
                      <span className="text-[10px] text-teal-600/80">({q.visit?.patient?.sex?.toUpperCase() || "—"})</span>
                    </button>
                  ))}
                  <Link href="/nova/doctor" className="text-xs text-teal-600 font-semibold hover:underline ml-1">
                    Queue ({queue.length}) →
                  </Link>
                </>
              ) : (
                <Link href="/nova/doctor" className="text-xs text-teal-600 underline font-semibold">
                  Doctor Queue →
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Existing lab orders banner if any */}
        {existingLabOrders.length > 0 && (
          <div className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700/80 rounded-xl p-2.5 px-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <FlaskConical size={14} className="text-teal-600" />
              <span className="font-semibold">Already ordered today ({existingLabOrders.length}):</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {existingLabOrders.map((lo: any) => (
                  <span
                    key={lo.id}
                    className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                  >
                    {lo.testName}{" "}
                    <span className="text-slate-400 font-normal">({lo.status})</span>
                  </span>
                ))}
              </div>
            </div>
            <span className="text-[11px] text-slate-400">Avoid duplicate orders</span>
          </div>
        )}

        {/* ── SEARCH & FILTER TOOLBAR + CUSTOM TEST BUTTON ── */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs space-y-2.5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                placeholder="Search tests (e.g. CBC, malaria, urine)..."
                className={`${inputCls} pl-10 pr-9 py-2 text-sm bg-slate-50 dark:bg-slate-800/80`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Custom Test Button */}
            <button
              onClick={() => setShowAddCustom(!showAddCustom)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shrink-0 border ${
                showAddCustom
                  ? "bg-teal-600 text-white border-teal-600 shadow-xs"
                  : "bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800 hover:bg-teal-100"
              }`}
            >
              <Plus size={14} />
              <span>{showAddCustom ? "Cancel" : "+ Custom Test"}</span>
            </button>
          </div>

          {/* Collapsible Custom Test Creator Row */}
          {showAddCustom && (
            <div className="p-3 rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800/60 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end animate-in fade-in duration-150">
              <div className="sm:col-span-6">
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Test Name *
                </label>
                <input
                  type="text"
                  className={`${inputCls} text-xs py-2 bg-white dark:bg-slate-800`}
                  placeholder="e.g. CSF, Biopsy, Fluid analysis..."
                  value={newCustomName}
                  onChange={(e) => setNewCustomName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddCustomTest();
                  }}
                  autoFocus
                />
              </div>
              <div className="sm:col-span-4">
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Sample Type
                </label>
                <input
                  type="text"
                  className={`${inputCls} text-xs py-2 bg-white dark:bg-slate-800`}
                  placeholder="e.g. Blood, Urine, Swab..."
                  value={newCustomSpecimen}
                  onChange={(e) => setNewCustomSpecimen(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2 flex items-center gap-1.5">
                <button
                  onClick={handleAddCustomTest}
                  className={`${btnPrimary} w-full text-xs py-2 font-semibold`}
                >
                  Add Test
                </button>
                <button
                  onClick={() => setShowAddCustom(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded border border-slate-200 dark:border-slate-700"
                >
                  <X size={15} />
                </button>
              </div>
            </div>
          )}

          {/* Category Filter Pills (Short & Simple) */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {categories.map((cat) => {
              const isActive = activeCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
                    isActive
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  <span>{cat.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isActive
                        ? "bg-white/20 dark:bg-slate-900/20 text-white dark:text-slate-900"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── 3. FULL-WIDTH TEST CATALOG GRID ── */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Tests ({filteredTests.length})
              </span>
              {selected.length > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-200 flex items-center gap-1">
                  <Check size={12} /> {selected.length} selected
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs">
              <button
                onClick={() => {
                  const allNames = filteredTests.map((t) => t.name);
                  setSelected((prev) => Array.from(new Set([...prev, ...allNames])));
                }}
                className="text-teal-600 dark:text-teal-400 font-medium hover:underline"
              >
                Select All
              </button>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <button
                onClick={() => setSelected([])}
                className="text-slate-400 hover:text-slate-600 font-medium"
              >
                Clear
              </button>
            </div>
          </div>

          {filteredTests.length === 0 ? (
            <div className="py-14 text-center text-slate-400 space-y-2">
              <FlaskConical size={36} className="mx-auto opacity-40 mb-2" />
              <p className="text-sm font-medium">No tests found matching "{searchQuery}"</p>
              <p className="text-xs text-slate-500">
                Click <strong>+ Custom Test</strong> above to add it.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 max-h-[660px] overflow-y-auto pr-1 scrollbar-thin">
              {filteredTests.map((test) => {
                const isChecked = selected.includes(test.name);
                return (
                  <label
                    key={test.id}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 select-none ${
                      isChecked
                        ? "bg-teal-50/70 dark:bg-teal-950/30 border-teal-500 ring-1 ring-teal-500/30 shadow-xs"
                        : "bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleTest(test.name)}
                      className="mt-1 accent-teal-600 w-4 h-4 cursor-pointer rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`text-sm font-semibold truncate ${
                            isChecked
                              ? "text-teal-950 dark:text-teal-100"
                              : "text-slate-800 dark:text-slate-200"
                          }`}
                        >
                          {test.name}
                        </span>
                        {test.isStat && (
                          <span
                            className="shrink-0 text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center gap-0.5"
                            title="Fast STAT"
                          >
                            <Zap size={10} /> STAT
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                        {deptConfig.preferredLabIds.includes(test.id) ? (
                          <span className="text-[10px] text-teal-800 dark:text-teal-200 font-bold bg-teal-50 dark:bg-teal-950/60 px-1.5 rounded border border-teal-200 dark:border-teal-800">
                            {deptConfig.shortLabel} Top
                          </span>
                        ) : test.isCommon ? (
                          <span className="text-[10px] text-slate-600 dark:text-slate-300 font-semibold bg-slate-100 dark:bg-slate-800 px-1 rounded">
                            Common
                          </span>
                        ) : null}
                        <span className="px-1.5 py-0.2 rounded bg-slate-200/60 dark:bg-slate-700/60 font-medium">
                          {test.category}
                        </span>
                        <span>•</span>
                        <span className="truncate">{test.specimen}</span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5 text-slate-400">
                          <Clock size={11} /> {test.turnaround}
                        </span>
                        {test.fasting && (
                          <span className="text-amber-600 dark:text-amber-400 font-semibold text-[10px]">
                            Fasting
                          </span>
                        )}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* ── 4. MODERN FLOATING REQUISITION ACTION DOCK ── */}
        {selected.length > 0 && (
          <div className="fixed bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-1rem)] sm:w-[95%] max-w-5xl z-40 transition-all duration-200">
            {/* Expandable Requisition Inspector Drawer */}
            {showRequisitionDrawer && (
              <div className="mb-2 p-3.5 sm:p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl space-y-4 max-h-[65dvh] overflow-y-auto animate-in slide-in-from-bottom-2 duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <FlaskConical size={16} className="text-teal-600" />
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      Selected Tests ({selected.length})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelected([])}
                      className="text-xs text-red-500 hover:underline font-medium"
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => setShowRequisitionDrawer(false)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* Selected Tests Tags Grid */}
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
                  {selected.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                    >
                      <span>{t}</span>
                      <button
                        onClick={() => toggleTest(t)}
                        className="text-slate-400 hover:text-red-500"
                        title="Remove test"
                      >
                        <X size={13} />
                      </button>
                    </span>
                  ))}
                </div>

                {/* Reason / Indication */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      Reason for test (click or type):
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {COMMON_INDICATIONS.map((ind) => (
                      <button
                        key={ind}
                        type="button"
                        onClick={() => setIndication(ind)}
                        className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                          indication === ind
                            ? "bg-teal-50 border-teal-500 text-teal-800 font-semibold dark:bg-teal-950/40 dark:text-teal-200"
                            : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                        }`}
                      >
                        {ind}
                      </button>
                    ))}
                  </div>
                  <textarea
                    className={`${inputCls} resize-none h-16 text-xs`}
                    value={indication}
                    onChange={(e) => setIndication(e.target.value)}
                    placeholder="Clinical notes or diagnosis..."
                  />
                </div>

                {/* Fasting & Special Instructions */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isFasting}
                      onChange={(e) => setIsFasting(e.target.checked)}
                      className="accent-teal-600 w-3.5 h-3.5 rounded cursor-pointer"
                    />
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      Patient must be fasting
                    </span>
                  </label>
                  <input
                    type="text"
                    className={`${inputCls} text-xs py-1.5 flex-1 max-w-md`}
                    placeholder="Special instructions (optional)..."
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Main Dock Bar */}
            <div className="bg-slate-900 text-white dark:bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-3 px-4 sm:px-5 flex items-center justify-between gap-3 flex-wrap backdrop-blur-md">
              {/* Left: Selected count & review toggle */}
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setShowRequisitionDrawer(!showRequisitionDrawer)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 font-bold text-xs border border-teal-500/30 transition-colors"
                >
                  <FlaskConical size={15} className="text-teal-400" />
                  <span>{selected.length} {selected.length === 1 ? "Test" : "Tests"}</span>
                  {showRequisitionDrawer ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </button>

                {/* Quick preview of selected tests */}
                <div className="hidden md:flex items-center gap-1.5 max-w-[280px] overflow-hidden text-xs text-slate-300">
                  <span className="truncate">{selected.slice(0, 2).join(", ")}</span>
                  {selected.length > 2 && (
                    <span className="text-slate-400 text-[11px] font-semibold">+{selected.length - 2} more</span>
                  )}
                </div>
              </div>

              {/* Middle: Priority & Quick Indication */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Priority Toggle */}
                <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setPriority("routine")}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                      priority === "routine"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Routine
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriority("urgent")}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${
                      priority === "urgent"
                        ? "bg-red-600 text-white shadow-xs"
                        : "text-slate-400 hover:text-red-400"
                    }`}
                  >
                    <Zap size={11} /> STAT
                  </button>
                </div>

                {/* Inline indication input */}
                <input
                  type="text"
                  placeholder="Reason for test..."
                  value={indication}
                  onChange={(e) => setIndication(e.target.value)}
                  className="hidden lg:block bg-slate-800 border border-slate-700 text-xs px-3 py-1.5 rounded-lg text-white placeholder:text-slate-400 w-48 focus:outline-none focus:border-teal-400"
                />
              </div>

              {/* Right: Submit Button */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSubmit}
                  disabled={selected.length === 0 || !activeVisitId || submitting}
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <FlaskConical size={14} /> Send to Lab ({selected.length}) →
                    </>
                  )}
                </button>

                <button
                  onClick={() => setSelected([])}
                  className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors"
                  title="Clear all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}

export default function LabOrderPage() {
  return (
    <Suspense
      fallback={
        <PageShell title="Lab Order">
          <div className="p-8 text-center text-slate-400">Loading…</div>
        </PageShell>
      }
    >
      <LabOrderContent />
    </Suspense>
  );
}
