"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { PageShell, Card, FormField, inputCls, btnPrimary, btnSecondary, StatusBadge } from "@/components/nova/nova-ui";
import {
  CheckCircle,
  Pill,
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
  Info,
  Trash2,
  History,
  ShieldAlert,
} from "lucide-react";
import { PatientHistoryViewer } from "@/components/nova/patient-history-viewer";
import { toast } from "sonner";

interface DrugItem {
  id: string;
  name: string;
  category: "Antibiotics" | "Pain" | "Stomach" | "Cardio" | "Infections" | "Breathing" | "Diabetes" | "Custom";
  form: string; // e.g. "Tablet", "Capsule", "Syrup", "Injection", "Inhaler"
  defaultDose: string;
  defaultFreq: string;
  defaultDays: number;
  instructions?: string;
  isCommon?: boolean;
}

const COMPREHENSIVE_DRUG_CATALOG: DrugItem[] = [
  // ─── HIGH-VOLUME / MOST PRESCRIBED MEDICINES (TOP OF CATALOG) ───
  { id: "amox", name: "Amoxicillin 500mg Caps", category: "Antibiotics", form: "Capsule", defaultDose: "1 capsule", defaultFreq: "3x daily", defaultDays: 5, instructions: "Take after meals", isCommon: true },
  { id: "pcm", name: "Paracetamol 500mg Tabs", category: "Pain", form: "Tablet", defaultDose: "2 tablets", defaultFreq: "3x daily", defaultDays: 3, instructions: "Take for fever or pain", isCommon: true },
  { id: "ibup", name: "Ibuprofen 400mg Tabs", category: "Pain", form: "Tablet", defaultDose: "1 tablet", defaultFreq: "3x daily", defaultDays: 5, instructions: "Take with food", isCommon: true },
  { id: "omep", name: "Omeprazole 20mg Caps", category: "Stomach", form: "Capsule", defaultDose: "1 capsule", defaultFreq: "Once daily", defaultDays: 14, instructions: "Take 30 min before breakfast", isCommon: true },
  { id: "coartem", name: "Artemether / Lumefantrine (Co-Artem)", category: "Infections", form: "Tablet", defaultDose: "4 tablets", defaultFreq: "2x daily", defaultDays: 3, instructions: "Take with a fatty meal", isCommon: true },
  { id: "cipro", name: "Ciprofloxacin 500mg Tabs", category: "Antibiotics", form: "Tablet", defaultDose: "1 tablet", defaultFreq: "2x daily", defaultDays: 5, instructions: "Drink plenty of water", isCommon: true },
  { id: "metform", name: "Metformin 500mg Tabs", category: "Diabetes", form: "Tablet", defaultDose: "1 tablet", defaultFreq: "2x daily", defaultDays: 30, instructions: "Take with meals", isCommon: true },
  { id: "ors", name: "ORS Sachets + Zinc Sulfate 20mg", category: "Diabetes", form: "Sachet", defaultDose: "1 sachet in 1L water", defaultFreq: "As needed", defaultDays: 5, instructions: "Drink after each loose stool", isCommon: true },
  { id: "amlo", name: "Amlodipine 5mg Tabs", category: "Cardio", form: "Tablet", defaultDose: "1 tablet", defaultFreq: "Once daily", defaultDays: 30, instructions: "Take in the morning", isCommon: true },
  { id: "metron", name: "Metronidazole 400mg Tabs", category: "Antibiotics", form: "Tablet", defaultDose: "1 tablet", defaultFreq: "3x daily", defaultDays: 5, instructions: "Avoid alcohol completely", isCommon: true },
  { id: "azith", name: "Azithromycin 500mg Tabs", category: "Antibiotics", form: "Tablet", defaultDose: "1 tablet", defaultFreq: "Once daily", defaultDays: 3, instructions: "Take 1 hr before meals", isCommon: true },
  { id: "salbut", name: "Salbutamol Inhaler 100mcg", category: "Breathing", form: "Inhaler", defaultDose: "2 puffs", defaultFreq: "As needed", defaultDays: 30, instructions: "Inhale when short of breath", isCommon: true },
  { id: "diclo", name: "Diclofenac 50mg Tabs", category: "Pain", form: "Tablet", defaultDose: "1 tablet", defaultFreq: "2x daily", defaultDays: 5, instructions: "Take after meals", isCommon: true },
  { id: "cetir", name: "Cetirizine 10mg Tabs", category: "Breathing", form: "Tablet", defaultDose: "1 tablet", defaultFreq: "Once daily", defaultDays: 7, instructions: "Take at bedtime", isCommon: true },
  { id: "ceftri", name: "Ceftriaxone 1g Injection", category: "Antibiotics", form: "Injection", defaultDose: "1g IV/IM", defaultFreq: "Once daily", defaultDays: 3, instructions: "Administer sterile injection", isCommon: true },

  // ─── ANTIBIOTICS & ANTI-INFECTIVES ───
  { id: "aug", name: "Amoxicillin + Clavulanic Acid 625mg", category: "Antibiotics", form: "Tablet", defaultDose: "1 tablet", defaultFreq: "2x daily", defaultDays: 7, instructions: "With food" },
  { id: "doxy", name: "Doxycycline 100mg Caps", category: "Antibiotics", form: "Capsule", defaultDose: "1 capsule", defaultFreq: "2x daily", defaultDays: 7, instructions: "Stay upright 30 min" },
  { id: "ampclox", name: "Ampicillin / Cloxacillin 500mg Caps", category: "Antibiotics", form: "Capsule", defaultDose: "1 capsule", defaultFreq: "4x daily", defaultDays: 5, instructions: "1 hr before food" },
  { id: "cotrim", name: "Co-Trimoxazole 480mg (Bactrim) Tabs", category: "Antibiotics", form: "Tablet", defaultDose: "2 tablets", defaultFreq: "2x daily", defaultDays: 5, instructions: "Drink with water" },
  { id: "cefix", name: "Cefixime 400mg Tabs", category: "Antibiotics", form: "Tablet", defaultDose: "1 tablet", defaultFreq: "Once daily", defaultDays: 5, instructions: "With or without food" },
  { id: "genta", name: "Gentamicin 80mg Injection", category: "Antibiotics", form: "Injection", defaultDose: "80mg IM/IV", defaultFreq: "Once daily", defaultDays: 5, instructions: "Hospital admin" },

  // ─── PAIN & FEVER ───
  { id: "tramad", name: "Tramadol 50mg Caps", category: "Pain", form: "Capsule", defaultDose: "1 capsule", defaultFreq: "2x daily", defaultDays: 3, instructions: "For severe pain only" },
  { id: "pcm_syp", name: "Paracetamol 120mg/5ml Pediatric Syrup", category: "Pain", form: "Syrup", defaultDose: "5 ml", defaultFreq: "3x daily", defaultDays: 3, instructions: "For children fever" },
  { id: "ibup_syp", name: "Ibuprofen 100mg/5ml Pediatric Suspension", category: "Pain", form: "Syrup", defaultDose: "5 ml", defaultFreq: "3x daily", defaultDays: 3, instructions: "After feeding" },
  { id: "indom", name: "Indomethacin 25mg Caps", category: "Pain", form: "Capsule", defaultDose: "1 capsule", defaultFreq: "3x daily", defaultDays: 5, instructions: "Take with meals" },

  // ─── STOMACH & ACID ───
  { id: "panto", name: "Pantoprazole 40mg Tabs", category: "Stomach", form: "Tablet", defaultDose: "1 tablet", defaultFreq: "Once daily", defaultDays: 14, instructions: "Before breakfast" },
  { id: "antacid", name: "Antacid Gel Suspension 200ml", category: "Stomach", form: "Syrup", defaultDose: "10 ml", defaultFreq: "3x daily", defaultDays: 7, instructions: "After meals & bedtime" },
  { id: "buscopan", name: "Hyoscine Butylbromide 10mg Tabs", category: "Stomach", form: "Tablet", defaultDose: "1 tablet", defaultFreq: "3x daily", defaultDays: 3, instructions: "For abdominal cramps" },
  { id: "metoclo", name: "Metoclopramide 10mg Tabs", category: "Stomach", form: "Tablet", defaultDose: "1 tablet", defaultFreq: "3x daily", defaultDays: 3, instructions: "30 min before meals" },
  { id: "lop", name: "Loperamide 2mg Caps", category: "Stomach", form: "Capsule", defaultDose: "2 capsules", defaultFreq: "As needed", defaultDays: 2, instructions: "For acute diarrhea" },

  // ─── CARDIO & BLOOD PRESSURE ───
  { id: "enala", name: "Enalapril 5mg Tabs", category: "Cardio", form: "Tablet", defaultDose: "1 tablet", defaultFreq: "Once daily", defaultDays: 30, instructions: "Morning dose" },
  { id: "atenol", name: "Atenolol 50mg Tabs", category: "Cardio", form: "Tablet", defaultDose: "1 tablet", defaultFreq: "Once daily", defaultDays: 30, instructions: "Morning dose" },
  { id: "hctz", name: "Hydrochlorothiazide 25mg Tabs", category: "Cardio", form: "Tablet", defaultDose: "1 tablet", defaultFreq: "Once daily", defaultDays: 30, instructions: "Morning dose" },
  { id: "furosem", name: "Furosemide 40mg Tabs", category: "Cardio", form: "Tablet", defaultDose: "1 tablet", defaultFreq: "Once daily", defaultDays: 14, instructions: "Morning dose" },
  { id: "atorva", name: "Atorvastatin 20mg Tabs", category: "Cardio", form: "Tablet", defaultDose: "1 tablet", defaultFreq: "Once daily", defaultDays: 30, instructions: "At bedtime" },
  { id: "asp", name: "Aspirin (Low Dose) 81mg Tabs", category: "Cardio", form: "Tablet", defaultDose: "1 tablet", defaultFreq: "Once daily", defaultDays: 30, instructions: "After lunch" },

  // ─── MALARIA & PARASITIC ───
  { id: "alben", name: "Albendazole 400mg Chewable Tabs", category: "Infections", form: "Tablet", defaultDose: "1 tablet", defaultFreq: "Once daily", defaultDays: 1, instructions: "Chew with meal" },
  { id: "meben", name: "Mebendazole 100mg Tabs", category: "Infections", form: "Tablet", defaultDose: "1 tablet", defaultFreq: "2x daily", defaultDays: 3, instructions: "Morning and evening" },
  { id: "flucon", name: "Fluconazole 150mg Caps", category: "Infections", form: "Capsule", defaultDose: "1 capsule", defaultFreq: "Once daily", defaultDays: 1, instructions: "Single dose" },
  { id: "clotri", name: "Clotrimazole 1% Cream 20g", category: "Infections", form: "Topical", defaultDose: "Apply thin layer", defaultFreq: "2x daily", defaultDays: 14, instructions: "Clean affected area" },

  // ─── BREATHING & ALLERGY ───
  { id: "lorat", name: "Loratadine 10mg Tabs", category: "Breathing", form: "Tablet", defaultDose: "1 tablet", defaultFreq: "Once daily", defaultDays: 7, instructions: "Morning" },
  { id: "pred", name: "Prednisolone 5mg Tabs", category: "Breathing", form: "Tablet", defaultDose: "4 tablets", defaultFreq: "Once daily", defaultDays: 5, instructions: "Morning with food" },
  { id: "dexa", name: "Dexamethasone 4mg/ml Injection", category: "Breathing", form: "Injection", defaultDose: "4mg IV/IM", defaultFreq: "Once daily", defaultDays: 2, instructions: "Hospital admin" },
  { id: "cough_syp", name: "Dextromethorphan Cough Syrup 100ml", category: "Breathing", form: "Syrup", defaultDose: "10 ml", defaultFreq: "3x daily", defaultDays: 5, instructions: "For dry cough" },

  // ─── DIABETES & VITAMINS ───
  { id: "gliben", name: "Glibenclamide 5mg Tabs", category: "Diabetes", form: "Tablet", defaultDose: "1 tablet", defaultFreq: "Once daily", defaultDays: 30, instructions: "Before breakfast" },
  { id: "fe_folic", name: "Ferrous Sulfate + Folic Acid Tabs", category: "Diabetes", form: "Tablet", defaultDose: "1 tablet", defaultFreq: "Once daily", defaultDays: 30, instructions: "With water or juice" },
  { id: "multivit", name: "Multivitamin + Minerals Tabs", category: "Diabetes", form: "Tablet", defaultDose: "1 tablet", defaultFreq: "Once daily", defaultDays: 30, instructions: "After breakfast" },
  { id: "vit_b", name: "Vitamin B Complex Tabs", category: "Diabetes", form: "Tablet", defaultDose: "1 tablet", defaultFreq: "2x daily", defaultDays: 14, instructions: "With meals" },
  { id: "calc_d3", name: "Calcium + Vitamin D3 500mg Tabs", category: "Diabetes", form: "Tablet", defaultDose: "1 tablet", defaultFreq: "Once daily", defaultDays: 30, instructions: "With meals" },
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

interface PrescriptionLineItem {
  id: string;
  drug: string;
  dose: string;
  freq: string;
  days: number;
  instructions: string;
}

function PrescriptionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawVisitId = searchParams.get("visitId") ?? "";
  const [selectedVisitId, setSelectedVisitId] = useState<string>(rawVisitId);
  const activeVisitId = selectedVisitId || rawVisitId;

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

  // Database hospital tariffs for pharmacy
  const { data: pharmacyTariffs = [] } = useQuery(
    trpc.tariff.list.queryOptions({ category: "pharmacy", activeOnly: true })
  );

  // Patient history (for allergy alerts)
  const { data: patientHistory } = useQuery({
    ...trpc.patient.getMedicalHistory.queryOptions({
      patientId: visit?.patientId,
      visitId: activeVisitId,
    }),
    enabled: !!visit?.patientId || !!activeVisitId,
  });

  // State management
  const [rxLines, setRxLines] = useState<PrescriptionLineItem[]>([]);
  const [customDrugs, setCustomDrugs] = useState<DrugItem[]>([]);
  const [newCustomName, setNewCustomName] = useState("");
  const [newCustomForm, setNewCustomForm] = useState("Tablet");
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [showRxDrawer, setShowRxDrawer] = useState(false);
  const [viewMode, setViewMode] = useState<"catalog" | "history">("catalog");

  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [pharmNotes, setPharmNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Check URL query parameters for prefilled medication (e.g. from 1-click re-prescribe)
  useEffect(() => {
    const qDrug = searchParams.get("drug");
    if (qDrug) {
      const qDose = searchParams.get("dose") || "1 tablet";
      const qFreq = searchParams.get("freq") || "3x daily";
      const qDays = Number(searchParams.get("days")) || 7;
      setRxLines([{
        id: `rx-${Date.now()}`,
        drug: qDrug,
        dose: qDose,
        freq: qFreq,
        days: qDays,
        instructions: "",
      }]);
    }
  }, [searchParams]);

  // Merge presets + database tariffs + custom drugs
  const fullCatalog = useMemo(() => {
    const map = new Map<string, DrugItem>();

    // 1. Add preset catalog
    for (const item of COMPREHENSIVE_DRUG_CATALOG) {
      map.set(item.name.toLowerCase().trim(), item);
    }

    // 2. Add database tariffs not in preset
    for (const tariff of pharmacyTariffs) {
      const key = tariff.name.toLowerCase().trim();
      if (!map.has(key)) {
        map.set(key, {
          id: `tariff-${tariff.id}`,
          name: tariff.name,
          category: "Antibiotics",
          form: "Medicine",
          defaultDose: "1 unit",
          defaultFreq: "2x daily",
          defaultDays: 7,
          instructions: "",
        });
      }
    }

    // 3. Add doctor custom drugs
    for (const custom of customDrugs) {
      map.set(custom.name.toLowerCase().trim(), custom);
    }

    const items = Array.from(map.values());
    // Sort items: Custom first, then Most Ordered / Common on top!
    return items.sort((a, b) => {
      if (a.category === "Custom" && b.category !== "Custom") return -1;
      if (b.category === "Custom" && a.category !== "Custom") return 1;
      if (a.isCommon && !b.isCommon) return -1;
      if (!a.isCommon && b.isCommon) return 1;
      return 0;
    });
  }, [pharmacyTariffs, customDrugs]);

  // Categories list with counts
  const categories = useMemo(() => {
    const counts: Record<string, number> = {
      All: fullCatalog.length,
      Antibiotics: 0,
      Pain: 0,
      Stomach: 0,
      Cardio: 0,
      Infections: 0,
      Breathing: 0,
      Diabetes: 0,
      Custom: customDrugs.length,
    };
    for (const item of fullCatalog) {
      if (counts[item.category] !== undefined) {
        counts[item.category]++;
      }
    }
    return [
      { key: "All", label: "All", count: counts.All },
      { key: "Antibiotics", label: "Antibiotics", count: counts.Antibiotics },
      { key: "Pain", label: "Pain & Fever", count: counts.Pain },
      { key: "Stomach", label: "Stomach", count: counts.Stomach },
      { key: "Cardio", label: "Heart & BP", count: counts.Cardio },
      { key: "Infections", label: "Malaria & Parasites", count: counts.Infections },
      { key: "Breathing", label: "Breathing & Allergy", count: counts.Breathing },
      { key: "Diabetes", label: "Diabetes & Vitamins", count: counts.Diabetes },
      ...(customDrugs.length > 0 ? [{ key: "Custom", label: "Custom", count: counts.Custom }] : []),
    ];
  }, [fullCatalog, customDrugs]);

  // Filtered drugs
  const filteredDrugs = useMemo(() => {
    return fullCatalog.filter((item) => {
      const matchesCategory =
        activeCategory === "All" ||
        item.category.toLowerCase() === activeCategory.toLowerCase();

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.form.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [fullCatalog, activeCategory, searchQuery]);

  // Add drug from catalog to prescription
  const handleAddDrug = (drug: DrugItem) => {
    const exists = rxLines.some((l) => l.drug.toLowerCase() === drug.name.toLowerCase());
    if (exists) {
      // Remove if already selected
      setRxLines((prev) => prev.filter((l) => l.drug.toLowerCase() !== drug.name.toLowerCase()));
      toast.info(`Removed ${drug.name}`);
      return;
    }

    const newLine: PrescriptionLineItem = {
      id: `rx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      drug: drug.name,
      dose: drug.defaultDose,
      freq: drug.defaultFreq,
      days: drug.defaultDays,
      instructions: drug.instructions || "",
    };
    setRxLines((prev) => [...prev, newLine]);
    toast.success(`Added ${drug.name}`);
  };

  // Re-prescribe from history viewer
  const handleRePrescribe = (med: { drug: string; dose: string; freq: string; days: number }) => {
    const newLine: PrescriptionLineItem = {
      id: `rx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      drug: med.drug,
      dose: med.dose,
      freq: med.freq,
      days: med.days || 7,
      instructions: "",
    };
    setRxLines((prev) => [...prev, newLine]);
    toast.success(`Copied ${med.drug} to prescription`);
  };

  // Add custom medicine
  const handleAddCustomDrug = () => {
    const trimmed = newCustomName.trim();
    if (!trimmed) {
      toast.error("Please enter a medicine name");
      return;
    }
    const customItem: DrugItem = {
      id: `custom-${Date.now()}`,
      name: trimmed,
      category: "Custom",
      form: newCustomForm || "Medicine",
      defaultDose: "1 unit",
      defaultFreq: "2x daily",
      defaultDays: 7,
      instructions: "",
    };
    setCustomDrugs((prev) => [customItem, ...prev]);
    handleAddDrug(customItem);
    setNewCustomName("");
    setShowAddCustom(false);
  };

  // Update line field
  const updateLine = (id: string, field: keyof PrescriptionLineItem, val: any) => {
    setRxLines((prev) =>
      prev.map((line) => (line.id === id ? { ...line, [field]: val } : line))
    );
  };

  // Remove line
  const removeLine = (id: string) => {
    setRxLines((prev) => prev.filter((line) => line.id !== id));
  };

  // Prescription creation TRPC mutation
  const writePrescription = useMutation(
    trpc.prescription.create.mutationOptions({
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: trpc.prescription.queue.queryKey() });
        qc.invalidateQueries({ queryKey: trpc.visit.queue.queryKey() });
        if (activeVisitId) {
          qc.invalidateQueries({ queryKey: trpc.visit.get.queryKey({ visitId: activeVisitId }) });
        }
      },
    })
  );

  // Submit prescription to pharmacy
  const handleSubmit = async () => {
    if (!activeVisitId) {
      toast.error("Please select a patient first");
      return;
    }
    const validLines = rxLines.filter((l) => l.drug.trim());
    if (validLines.length === 0) {
      toast.error("Please select at least one medication");
      return;
    }

    setSubmitting(true);
    try {
      await writePrescription.mutateAsync({
        visitId: activeVisitId,
        lines: validLines.map((l) => ({
          itemId: "",
          itemName: l.drug,
          dose: l.dose,
          frequency: l.freq,
          durationDays: Number(l.days) || 7,
        })),
      });

      setSubmitted(true);
      toast.success(`${validLines.length} medicines sent to pharmacy`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to send prescription");
    } finally {
      setSubmitting(false);
    }
  };

  // Confirmation view after submission
  if (submitted) {
    return (
      <PageShell title="Prescription Sent">
        <div className="max-w-xl mx-auto py-8">
          <Card className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md rounded-2xl">
            <div className="w-16 h-16 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-full flex items-center justify-center mx-auto mb-4 ring-8 ring-teal-50/50 dark:ring-teal-900/10">
              <CheckCircle size={36} />
            </div>

            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">
              Prescription Sent to Pharmacy
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              Prescribed for{" "}
              <strong className="text-slate-800 dark:text-slate-200">
                {visit?.patient?.nameEn || "Patient"}
              </strong>{" "}
              ({visit?.patient?.healthId || "MRN"})
            </p>

            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700 text-left mb-5">
              <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-200 dark:border-slate-700">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Prescribed Medicines ({rxLines.length})
                </span>
                <span className="text-xs text-teal-700 dark:text-teal-300 font-semibold bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
                  Ready for Dispense
                </span>
              </div>
              <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-200">
                {rxLines.map((l) => (
                  <li key={l.id} className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-1.5 last:border-none">
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-white block">{l.drug}</span>
                      <span className="text-[11px] text-slate-400">
                        {l.dose} · {l.freq} · {l.days} days
                        {l.instructions ? ` · ${l.instructions}` : ""}
                      </span>
                    </div>
                    <span className="text-teal-500 font-bold shrink-0">✓</span>
                  </li>
                ))}
              </ul>

              {pharmNotes && (
                <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
                  <span className="font-semibold text-slate-500">Notes to Pharmacy:</span> {pharmNotes}
                </div>
              )}
            </div>

            <div className="p-3 rounded-lg bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 text-xs text-teal-800 dark:text-teal-300 text-left mb-6 flex items-start gap-2">
              <Info size={16} className="shrink-0 mt-0.5 text-teal-600 dark:text-teal-400" />
              <p className="leading-relaxed">
                Prescription has been queued at the <strong>💊 Pharmacy Dispensary</strong>. The patient can proceed directly to the cashier/pharmacy counter for medication collection.
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
              <button
                onClick={() => {
                  setSubmitted(false);
                  setRxLines([]);
                }}
                className={btnSecondary}
              >
                + New Prescription
              </button>
            </div>
          </Card>
        </div>
      </PageShell>
    );
  }

  const latestVitals = visit?.vitals?.[0];
  const existingPrescriptions = visit?.prescriptions || [];
  const allergies = patientHistory?.allergies || [];

  // Next 2 waiting patients in line (compact switcher)
  const nextPatients = queue
    .filter((q) => q.visitId !== activeVisitId && q.status !== "done")
    .slice(0, 2);

  return (
    <PageShell
      title="Prescription"
      subtitle="Select or add medicines to send to the pharmacy"
      action={
        <div className="flex items-center gap-2">
          {activeVisitId && (
            <Link
              href={`/nova/doctor/consultation?visitId=${activeVisitId}`}
              className="text-xs text-slate-600 dark:text-slate-300 hover:text-nova-primary flex items-center gap-1 font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg shadow-xs transition-colors"
            >
              <ArrowLeft size={14} /> Consultation
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

                  {/* Allergy Alert Tag if any */}
                  {allergies.length > 0 && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 px-2 py-0.2 rounded border border-red-200 dark:border-red-800">
                      <ShieldAlert size={12} className="text-red-500" />
                      Allergies: {allergies.map((a: any) => a.substance).join(", ")}
                    </span>
                  )}
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
                      router.replace(`/nova/doctor/prescription?visitId=${q.visitId}`);
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
                  Pick a waiting patient to write prescription:
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
                        router.replace(`/nova/doctor/prescription?visitId=${q.visitId}`);
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

        {/* Existing prescriptions banner if any */}
        {existingPrescriptions.length > 0 && (
          <div className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700/80 rounded-xl p-2.5 px-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <Pill size={14} className="text-teal-600" />
              <span className="font-semibold">Already prescribed today ({existingPrescriptions.length}):</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {existingPrescriptions.map((rx: any) => (
                  <span
                    key={rx.id}
                    className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                  >
                    Rx #{rx.id.slice(-4)}{" "}
                    <span className="text-slate-400 font-normal">({rx.status})</span>
                  </span>
                ))}
              </div>
            </div>
            <span className="text-[11px] text-slate-400">Avoid duplicate orders</span>
          </div>
        )}

        {/* ── TOOLBAR: SEARCH, VIEW TABS & CUSTOM MEDICINE BUTTON ── */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs space-y-2.5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* View Mode Toggle: Catalog vs Past History */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("catalog")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  viewMode === "catalog"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Pill size={13} />
                <span>Medicines</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("history")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  viewMode === "history"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <History size={13} />
                <span>Past Rx & History</span>
              </button>
            </div>

            {/* Search Input (visible in catalog mode) */}
            {viewMode === "catalog" && (
              <div className="relative flex-1">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="text"
                  placeholder="Search medicines (e.g. Amoxicillin, Paracetamol, Omeprazole)..."
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
            )}

            {/* Custom Medicine Button */}
            <button
              onClick={() => setShowAddCustom(!showAddCustom)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shrink-0 border ${
                showAddCustom
                  ? "bg-teal-600 text-white border-teal-600 shadow-xs"
                  : "bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800 hover:bg-teal-100"
              }`}
            >
              <Plus size={14} />
              <span>{showAddCustom ? "Cancel" : "+ Custom Medicine"}</span>
            </button>
          </div>

          {/* Collapsible Custom Medicine Creator Row */}
          {showAddCustom && (
            <div className="p-3 rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800/60 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end animate-in fade-in duration-150">
              <div className="sm:col-span-6">
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Medicine Name & Strength *
                </label>
                <input
                  type="text"
                  className={`${inputCls} text-xs py-2 bg-white dark:bg-slate-800`}
                  placeholder="e.g. Cefuroxime 500mg, Salbutamol Respules…"
                  value={newCustomName}
                  onChange={(e) => setNewCustomName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddCustomDrug();
                  }}
                  autoFocus
                />
              </div>
              <div className="sm:col-span-4">
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Form (Dosage Form)
                </label>
                <select
                  value={newCustomForm}
                  onChange={(e) => setNewCustomForm(e.target.value)}
                  className={`${inputCls} text-xs py-2 bg-white dark:bg-slate-800`}
                >
                  {["Tablet", "Capsule", "Syrup", "Suspension", "Injection", "Inhaler", "Cream / Ointment", "Drops"].map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2 flex items-center gap-1.5">
                <button
                  onClick={handleAddCustomDrug}
                  className={`${btnPrimary} w-full text-xs py-2 font-semibold`}
                >
                  Add Medicine
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

          {/* Category Filter Pills (when in catalog view) */}
          {viewMode === "catalog" && (
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
          )}
        </div>

        {/* ── 3. MAIN WORKSPACE: FORMULARY CATALOG OR PAST HISTORY ── */}
        {viewMode === "catalog" ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Medicines ({filteredDrugs.length})
                </span>
                {rxLines.length > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-200 flex items-center gap-1">
                    <Check size={12} /> {rxLines.length} in prescription
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs">
                {rxLines.length > 0 && (
                  <button
                    onClick={() => setRxLines([])}
                    className="text-slate-400 hover:text-slate-600 font-medium"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>

            {filteredDrugs.length === 0 ? (
              <div className="py-14 text-center text-slate-400 space-y-2">
                <Pill size={36} className="mx-auto opacity-40 mb-2" />
                <p className="text-sm font-medium">No medicines found matching "{searchQuery}"</p>
                <p className="text-xs text-slate-500">
                  Click <strong>+ Custom Medicine</strong> above to add it directly.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 max-h-[660px] overflow-y-auto pr-1 scrollbar-thin">
                {filteredDrugs.map((drug) => {
                  const isChecked = rxLines.some((l) => l.drug.toLowerCase() === drug.name.toLowerCase());
                  return (
                    <div
                      key={drug.id}
                      onClick={() => handleAddDrug(drug)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 select-none ${
                        isChecked
                          ? "bg-teal-50/70 dark:bg-teal-950/30 border-teal-500 ring-1 ring-teal-500/30 shadow-xs"
                          : "bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // handled by parent onClick
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
                            {drug.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                          {drug.isCommon && (
                            <span className="text-[10px] text-teal-700 dark:text-teal-300 font-semibold bg-teal-50 dark:bg-teal-950/50 px-1 rounded border border-teal-200/50">
                              ⭐ Top
                            </span>
                          )}
                          <span className="px-1.5 py-0.2 rounded bg-slate-200/60 dark:bg-slate-700/60 font-medium">
                            {drug.form}
                          </span>
                          <span>•</span>
                          <span className="text-slate-500 dark:text-slate-400">
                            {drug.defaultDose} · {drug.defaultFreq} · {drug.defaultDays}d
                          </span>
                        </div>

                        {drug.instructions && (
                          <p className="text-[10px] text-slate-400 mt-1 truncate">
                            {drug.instructions}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Past Prescriptions & Longitudinal History View */
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <History size={14} className="text-teal-600" /> Past Prescriptions & Medical Record
              </span>
              <span className="text-xs text-teal-600 bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 rounded font-medium border border-teal-200 dark:border-teal-800">
                Click "+ Re-prescribe" on any past record to add
              </span>
            </div>

            <PatientHistoryViewer
              visitId={activeVisitId}
              onSelectPrescription={handleRePrescribe}
              defaultTab="prescriptions"
              showAllergyAdder={true}
            />
          </div>
        )}

        {/* ── 4. MODERN FLOATING PRESCRIPTION ACTION DOCK ── */}
        {rxLines.length > 0 && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[95%] max-w-5xl z-40 transition-all duration-200">
            {/* Expandable Prescription Review Drawer */}
            {showRxDrawer && (
              <div className="mb-2 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl space-y-4 animate-in slide-in-from-bottom-2 duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Pill size={16} className="text-teal-600" />
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      Prescription Review ({rxLines.length} Medicines)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setRxLines([])}
                      className="text-xs text-red-500 hover:underline font-medium"
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => setShowRxDrawer(false)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* Prescription Lines Detailed Table / Cards */}
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
                  {rxLines.map((line) => (
                    <div
                      key={line.id}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-12 gap-2 items-center"
                    >
                      {/* Drug Name */}
                      <div className="md:col-span-4 min-w-0">
                        <span className="font-bold text-xs text-slate-900 dark:text-white block truncate">
                          {line.drug}
                        </span>
                      </div>

                      {/* Dose */}
                      <div className="md:col-span-2">
                        <input
                          type="text"
                          value={line.dose}
                          onChange={(e) => updateLine(line.id, "dose", e.target.value)}
                          className={`${inputCls} text-xs py-1.5`}
                          placeholder="Dose"
                          title="Dosage"
                        />
                      </div>

                      {/* Frequency */}
                      <div className="md:col-span-3">
                        <select
                          value={line.freq}
                          onChange={(e) => updateLine(line.id, "freq", e.target.value)}
                          className={`${inputCls} text-xs py-1.5`}
                          title="Frequency"
                        >
                          {["Once daily", "2x daily", "3x daily", "4x daily", "Every 8hrs", "As needed (PRN)"].map((f) => (
                            <option key={f} value={f}>{f}</option>
                          ))}
                        </select>
                      </div>

                      {/* Days / Duration */}
                      <div className="md:col-span-2 flex items-center gap-1">
                        <input
                          type="number"
                          min={1}
                          value={line.days}
                          onChange={(e) => updateLine(line.id, "days", Number(e.target.value))}
                          className={`${inputCls} text-xs py-1.5 w-16 text-center`}
                          title="Days"
                        />
                        <span className="text-xs text-slate-400">days</span>
                      </div>

                      {/* Remove Button */}
                      <div className="md:col-span-1 flex justify-end">
                        <button
                          onClick={() => removeLine(line.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 rounded transition-colors"
                          title="Remove medicine"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Notes to Pharmacist */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Notes to Pharmacy:
                  </span>
                  <input
                    type="text"
                    className={`${inputCls} text-xs py-1.5`}
                    value={pharmNotes}
                    onChange={(e) => setPharmNotes(e.target.value)}
                    placeholder="Special instructions or notes for the dispensing pharmacist…"
                  />
                </div>
              </div>
            )}

            {/* Main Dock Bar */}
            <div className="bg-slate-900 text-white dark:bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-3 px-4 sm:px-5 flex items-center justify-between gap-3 flex-wrap backdrop-blur-md">
              {/* Left: Selected count & review toggle */}
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setShowRxDrawer(!showRxDrawer)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 font-bold text-xs border border-teal-500/30 transition-colors"
                >
                  <Pill size={15} className="text-teal-400" />
                  <span>{rxLines.length} {rxLines.length === 1 ? "Medicine" : "Medicines"}</span>
                  {showRxDrawer ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </button>

                {/* Quick preview of selected medicines */}
                <div className="hidden md:flex items-center gap-1.5 max-w-[280px] overflow-hidden text-xs text-slate-300">
                  <span className="truncate">{rxLines.slice(0, 2).map((l) => l.drug).join(", ")}</span>
                  {rxLines.length > 2 && (
                    <span className="text-slate-400 text-[11px] font-semibold">+{rxLines.length - 2} more</span>
                  )}
                </div>
              </div>

              {/* Middle: Quick instructions input */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <input
                  type="text"
                  placeholder="Notes to pharmacy..."
                  value={pharmNotes}
                  onChange={(e) => setPharmNotes(e.target.value)}
                  className="hidden lg:block bg-slate-800 border border-slate-700 text-xs px-3 py-1.5 rounded-lg text-white placeholder:text-slate-400 w-56 focus:outline-none focus:border-teal-400"
                />
              </div>

              {/* Right: Submit Button */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSubmit}
                  disabled={rxLines.length === 0 || !activeVisitId || submitting}
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <Pill size={14} /> Send to Pharmacy ({rxLines.length}) →
                    </>
                  )}
                </button>

                <button
                  onClick={() => setRxLines([])}
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

export default function PrescriptionPage() {
  return (
    <Suspense
      fallback={
        <PageShell title="Prescription">
          <div className="p-8 text-center text-slate-400">Loading…</div>
        </PageShell>
      }
    >
      <PrescriptionContent />
    </Suspense>
  );
}
