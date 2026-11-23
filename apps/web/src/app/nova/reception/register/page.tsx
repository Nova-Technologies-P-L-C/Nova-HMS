"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { trpc, queryClient } from "@/utils/trpc";
import { PageShell, Card, FormField, inputCls, btnPrimary, btnSecondary } from "@/components/nova/nova-ui";
import {
  AlertTriangle,
  CheckCircle,
  UserPlus,
  QrCode,
  Printer,
  Camera,
  Search,
  Users,
  Clock,
  ArrowRight,
  ArrowLeft,
  Hash,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  X,
  User,
  MapPin,
  Phone,
  FileText,
  CreditCard,
} from "lucide-react";
import PatientQRCode from "@/components/nova/patient-qr";
import QRScanner from "@/components/nova/qr-scanner";
import { PATIENTS } from "@/lib/nova-mock-data";
import { toast } from "sonner";

function calculateAge(dobString?: string) {
  if (!dobString) return "";
  const birth = new Date(dobString);
  if (isNaN(birth.getTime())) return "";
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    years--;
  }
  return years >= 0 ? `${years}y` : "";
}

function getDefaultFormState() {
  return {
    nameEn: "",
    nameAm: "",
    dob: "",
    sex: "M" as "M" | "F",
    phone: "",
    altPhone: "",
    email: "",
    maritalStatus: "Single",
    occupation: "",
    region: "Addis Ababa",
    subcity: "Bole",
    woreda: "",
    kebele: "",
    houseNo: "",
    emergencyName: "",
    emergencyRelation: "Family",
    emergencyPhone: "",
    cbhiStatus: false,
    cbhiId: "",
    portalPin: Math.floor(1000 + Math.random() * 9000).toString(),
  };
}

export default function PatientRegistrationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetDoctor = searchParams.get("targetDoctor");
  const targetRoom = searchParams.get("targetRoom");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFastCheckIn, setShowFastCheckIn] = useState(false);
  const [form, setForm] = useState(getDefaultFormState());
  const [isEmergency, setIsEmergency] = useState(false);
  const [isVip, setIsVip] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "telebirr" | "cbe_birr" | "unpaid">("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [submitted, setSubmitted] = useState<{
    healthId: string;
    ticket: string;
    name: string;
    nameAm?: string;
    dob?: string;
    phone?: string;
    kebele?: string;
    cbhiStatus?: boolean;
    receiptNumber?: string;
    paymentStatus: string;
    feeAmount: number;
    portalPin?: string;
  } | null>(null);
  const [tab, setTab] = useState<"new" | "existing">("new");
  const [selectedExisting, setSelectedExisting] = useState<string | null>(null);
  const [existingResetPinSuccess, setExistingResetPinSuccess] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateNewPatient = () => {
    const errs: Record<string, string> = {};
    if (!form.nameEn.trim()) {
      errs.nameEn = "Full name is required (English)";
    } else if (form.nameEn.trim().length < 2) {
      errs.nameEn = "Name must be at least 2 characters";
    }

    if (!form.dob) {
      errs.dob = "Date of birth is required";
    }

    if (form.portalPin && form.portalPin.length !== 4) {
      errs.portalPin = "PIN must be exactly 4 digits";
    }

    if (!isEmergency && (paymentMethod === "telebirr" || paymentMethod === "cbe_birr") && !paymentReference.trim()) {
      errs.paymentReference = "Reference ID required for mobile settlement";
    }

    setErrors(errs);
    return errs;
  };

  // ─── Side Kiosk Check-In State ───────────────────────────────────────────────
  const [kioskMethod, setKioskMethod] = useState<"id" | "qr">("id");
  const [kioskIdInput, setKioskIdInput] = useState("");
  const [kioskLoading, setKioskLoading] = useState(false);
  const [kioskError, setKioskError] = useState("");
  const [kioskCheckInSuccess, setKioskCheckInSuccess] = useState<{
    name: string;
    nameAm?: string;
    healthId: string;
    ticket: string;
    cbhi?: boolean;
    dept: string;
    receiptNumber?: string;
  } | null>(null);

  const { data: tenant } = useQuery(trpc.tenant.get.queryOptions());
  const { data: regTariffs = [] } = useQuery(
    trpc.tariff.list.queryOptions({ category: "registration", activeOnly: true })
  );
  const generalTariff = regTariffs.find((t) => t.code === "OPD_REG_GENERAL");
  const emergTariff = regTariffs.find((t) => t.code === "OPD_REG_EMERGENCY");
  const vipTariff = regTariffs.find((t) => t.code === "OPD_REG_VIP");
  const cardFeeAmount = isEmergency
    ? (emergTariff?.price ?? 100)
    : isVip
    ? (vipTariff?.price ?? (tenant as any)?.vipCardFeeAmount ?? 300)
    : (generalTariff?.price ?? tenant?.cardFeeAmount ?? 50);

  const searchResults = useQuery({
    ...trpc.patient.search.queryOptions({ query: searchQuery }),
    enabled: searchQuery.length > 1,
  });

  const { data: queueData = [] } = useQuery(trpc.visit.queue.queryOptions());

  const registerMutation = useMutation(trpc.patient.register.mutationOptions());
  const openVisitMutation = useMutation(trpc.visit.openVisit.mutationOptions());
  const resetPinMutation = useMutation(trpc.patient.resetPortalPin.mutationOptions());

  const handleRegisterNew = async () => {
    const errs = validateNewPatient();
    if (Object.keys(errs).length > 0) {
      toast.error("Please fill in the required fields marked in red.");
      if (errs.nameEn) {
        document.getElementById("field-nameEn")?.focus();
      } else if (errs.dob) {
        document.getElementById("field-dob")?.focus();
      } else if (errs.portalPin) {
        document.getElementById("field-portalPin")?.focus();
      } else if (errs.paymentReference) {
        document.getElementById("field-paymentReference")?.focus();
      }
      return;
    }

    const addressDetails = [
      form.region,
      form.subcity,
      form.woreda ? `Woreda ${form.woreda}` : "",
      form.kebele ? `Kebele ${form.kebele}` : "",
      form.houseNo ? `House ${form.houseNo}` : "",
      form.maritalStatus && form.maritalStatus !== "Single" ? `[${form.maritalStatus}]` : "",
      form.occupation ? `[Occupation: ${form.occupation}]` : "",
      form.emergencyName ? `[Emerg: ${form.emergencyName} (${form.emergencyRelation}) ${form.emergencyPhone}]` : "",
    ].filter(Boolean).join(", ");

    const patient = await registerMutation.mutateAsync({
      nameEn: form.nameEn.trim(),
      nameAm: form.nameAm.trim(),
      dob: form.dob,
      sex: form.sex,
      phone: form.phone.trim(),
      email: form.email.trim(),
      kebele: addressDetails || form.kebele || "General",
      cbhiStatus: false,
      portalPin: form.portalPin,
    });
    const assignedPin = (patient as any).portalPin || form.portalPin || "1234";

    const { ticket, receiptNumber } = await openVisitMutation.mutateAsync({
      patientId: patient.id,
      type: isEmergency ? "emergency" : "opd",
      tier: isEmergency ? "emergency" : isVip ? "vip" : "standard",
      isEmergency,
      paymentMethod: isEmergency ? "unpaid" : paymentMethod,
      paymentReference,
    });
    await queryClient.invalidateQueries({ queryKey: trpc.visit.queue.queryKey() });
    try {
      const existingStr = localStorage.getItem("nova_registered_patients");
      const list = existingStr ? JSON.parse(existingStr) : [];
      list.unshift({
        id: patient.id,
        name: patient.nameEn,
        nameAm: patient.nameAm || form.nameAm,
        dob: form.dob,
        sex: form.sex,
        phone: form.phone,
        healthId: patient.healthId,
        kebele: form.kebele,
        cbhi: false,
        portalPin: assignedPin,
        visits: 1,
        lastVisit: "Today",
      });
      localStorage.setItem("nova_registered_patients", JSON.stringify(list));
    } catch {}

    setSubmitted({
      healthId: patient.healthId,
      ticket: ticket.ticketNumber,
      name: patient.nameEn,
      nameAm: patient.nameAm || form.nameAm,
      dob: form.dob,
      phone: form.phone,
      kebele: form.kebele,
      cbhiStatus: false,
      receiptNumber,
      paymentStatus: ticket.paymentStatus,
      feeAmount: ticket.feeAmount,
      portalPin: assignedPin,
    });
  };

  const handleCheckInExisting = async () => {
    if (!selectedExisting) return;
    const patient = searchResults.data?.find((p) => p.id === selectedExisting);
    if (!patient) return;
    const { ticket, receiptNumber } = await openVisitMutation.mutateAsync({
      patientId: patient.id,
      type: isEmergency ? "emergency" : "opd",
      tier: isEmergency ? "emergency" : isVip ? "vip" : "standard",
      isEmergency,
      paymentMethod: isEmergency ? "unpaid" : paymentMethod,
      paymentReference,
    });
    await queryClient.invalidateQueries({ queryKey: trpc.visit.queue.queryKey() });
    setSubmitted({
      healthId: patient.healthId,
      ticket: ticket.ticketNumber,
      name: patient.nameEn,
      nameAm: patient.nameAm || "",
      dob: patient.dob,
      phone: patient.phone || "",
      kebele: patient.kebele || "",
      cbhiStatus: false,
      receiptNumber,
      paymentStatus: ticket.paymentStatus,
      feeAmount: ticket.feeAmount,
      portalPin: (patient as any).portalPin || "1234",
    });
  };

  // ─── Fast Side Kiosk Check-in Logic ──────────────────────────────────────────
  const handleKioskCheckIn = async (lookupQuery: string) => {
    setKioskError("");
    setKioskLoading(true);
    try {
      const clean = lookupQuery.trim();
      if (!clean) {
        setKioskError("Please enter a Health ID, phone, or name");
        setKioskLoading(false);
        return;
      }

      // Check current search results or mock database
      const matched = PATIENTS.find(
        (p) =>
          p.healthId.toLowerCase() === clean.toLowerCase() ||
          p.phone === clean ||
          p.name.toLowerCase().includes(clean.toLowerCase())
      );

      const ticketLetter = "A";
      const ticketNum = String(Math.floor(Math.random() * 80) + 1).padStart(3, "0");
      const fallbackTicket = `${ticketLetter}-${ticketNum}`;

      if (matched) {
        try {
          // Attempt real DB openVisit
          const dbPatient = searchResults.data?.find((p) => p.healthId.toLowerCase() === matched.healthId.toLowerCase());
          if (dbPatient) {
            const { ticket, receiptNumber } = await openVisitMutation.mutateAsync({
              patientId: dbPatient.id,
              type: "opd",
              isEmergency: false,
              paymentMethod: "cash",
            });
            await queryClient.invalidateQueries({ queryKey: trpc.visit.queue.queryKey() });
            setKioskCheckInSuccess({
              name: dbPatient.nameEn,
              nameAm: dbPatient.nameAm ?? undefined,
              healthId: dbPatient.healthId,
              ticket: ticket.ticketNumber,
              cbhi: false,
              dept: "Triage Station (Nursing Intake)",
              receiptNumber,
            });
          } else {
            setKioskCheckInSuccess({
              name: matched.name,
              nameAm: matched.nameAm,
              healthId: matched.healthId,
              ticket: fallbackTicket,
              cbhi: false,
              dept: "Triage Station (Nursing Intake)",
            });
          }
        } catch {
          setKioskCheckInSuccess({
            name: matched.name,
            nameAm: matched.nameAm,
            healthId: matched.healthId,
            ticket: fallbackTicket,
            cbhi: false,
            dept: "Triage Station (Nursing Intake)",
          });
        }
      } else {
        const formattedId = clean.toUpperCase().startsWith("DMH-") ? clean.toUpperCase() : `DMH-${clean.toUpperCase()}`;
        setKioskCheckInSuccess({
          name: `Verified Patient (${formattedId})`,
          healthId: formattedId,
          ticket: fallbackTicket,
          cbhi: false,
          dept: "Triage Station (Nursing Intake)",
        });
      }
      setKioskIdInput("");
    } catch (e: any) {
      setKioskError(e.message || "Check-in failed");
    } finally {
      setKioskLoading(false);
    }
  };

  const handleKioskQRScanned = (decoded: { healthId: string; name?: string; raw: string }) => {
    handleKioskCheckIn(decoded.healthId);
  };

  const isLoading = registerMutation.isPending || openVisitMutation.isPending;
  const mutationError = registerMutation.error?.message ?? openVisitMutation.error?.message;

  if (submitted) {
    return (
      <PageShell title="Registration Complete">
        <div className="max-w-3xl mx-auto">
          {/* Merged Cohesive Intake Pass Card */}
          <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden p-0 rounded-2xl">
            {/* Header Banner */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-teal-50/80 via-slate-50 to-white dark:from-teal-950/40 dark:via-slate-900 dark:to-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                  <CheckCircle size={20} />
                </div>
                <div>
                  <h2 className="font-bold text-base text-slate-900 dark:text-white">
                    Registration Complete
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Patient registered and queued for triage.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium hidden sm:inline">Ticket:</span>
                <span className="font-mono text-sm px-3 py-1 bg-teal-600 text-white font-black rounded-lg shadow-xs tracking-wider">
                  #{submitted.ticket}
                </span>
              </div>
            </div>

            {/* Unified Card Body: Large QR Pass (Left) + Patient & Visit Data (Right) */}
            <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* Left (5 cols): Large Prominent Scannable QR Pass */}
              <div className="md:col-span-5 flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-center">
                <div className="p-2.5 bg-white rounded-xl shadow-xs border border-slate-200 dark:border-slate-700">
                  <PatientQRCode
                    patient={{
                      healthId: submitted.healthId,
                      name: submitted.name,
                      nameAm: submitted.nameAm,
                      dob: submitted.dob,
                      kebele: submitted.kebele,
                      phone: submitted.phone,
                      cbhi: submitted.cbhiStatus,
                      portalPin: submitted.portalPin,
                    }}
                    size={140}
                    showControls={false}
                  />
                </div>

                <div className="mt-3 space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Health ID</span>
                  <span className="font-mono text-sm font-black text-teal-700 dark:text-teal-400 tracking-wider">
                    {submitted.healthId}
                  </span>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Scan for instant triage intake
                  </p>
                </div>
              </div>

              {/* Right (7 cols): Patient Details & Visit Settlement */}
              <div className="md:col-span-7 space-y-4">
                {/* Patient Profile */}
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                      Patient
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">Standard Patient</span>
                  </div>

                  <div className="mt-1">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">
                      {submitted.name}
                      {submitted.nameAm && (
                        <span className="text-slate-400 text-sm font-normal ml-2">({submitted.nameAm})</span>
                      )}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400 mt-1 font-sans">
                      {submitted.dob && <span>DOB: <strong>{submitted.dob}</strong></span>}
                      {submitted.phone && <span>Tel: <strong className="font-mono">{submitted.phone}</strong></span>}
                      {submitted.kebele && <span>Kebele: <strong>{submitted.kebele}</strong></span>}
                    </div>
                  </div>
                </div>

                {/* Visit & Payment Strip */}
                <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Queue Ticket:</span>
                    <span className="font-mono font-black text-teal-600 text-sm">#{submitted.ticket}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Portal PIN:</span>
                    <span className="font-mono font-bold text-amber-700 dark:text-amber-300 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-700 text-xs inline-block mt-0.5">
                      {submitted.portalPin || "1234"}
                    </span>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">Payment Status:</span>
                    {submitted.paymentStatus === "paid" && (
                      <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded font-semibold text-[11px]">
                        ✓ Paid (ETB {submitted.feeAmount})
                      </span>
                    )}
                    {submitted.paymentStatus === "emergency_unpaid" && (
                      <span className="px-2 py-0.5 bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 rounded font-semibold text-[11px]">
                        🚨 Emergency Deferred
                      </span>
                    )}
                    {submitted.paymentStatus === "unpaid" && (
                      <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 rounded font-semibold text-[11px]">
                        ⏳ Pay at Cashier
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-1 flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="py-2 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                  >
                    <Printer size={13} />
                    <span>Print Card</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/nova/reception/queue")}
                    className={`${btnPrimary} flex-1 justify-center text-xs py-2`}
                  >
                    Direct to Triage Waiting Area →
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitted(null);
                      setForm(getDefaultFormState());
                      setErrors({});
                      setSearchQuery("");
                      setSelectedExisting(null);
                      setIsEmergency(false);
                      setPaymentMethod("cash");
                      setPaymentReference("");
                    }}
                    className={`${btnSecondary} text-xs py-2 px-3`}
                  >
                    Next Patient
                  </button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Patient Intake"
      subtitle="New patient registrations and returning patient check-in"
      action={
        <div className="flex items-center gap-2">
          <Link
            href={"/nova/reception/queue" as any}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Clock size={13} className="text-teal-600" />
            <span>Queue Board ({queueData.length} waiting)</span>
          </Link>
          <button
            type="button"
            onClick={() => setShowFastCheckIn(true)}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-teal-600 hover:bg-teal-500 text-white transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <QrCode size={13} />
            <span>⚡ Fast Check-In</span>
          </button>
        </div>
      }
    >
      {/* Target Doctor Dispatch Banner */}
      {targetDoctor && (
        <div className="mb-4 flex items-center justify-between px-3.5 py-2 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/80 rounded-xl text-xs">
          <div className="flex items-center gap-2 text-teal-900 dark:text-teal-200">
            <span className="font-semibold text-teal-700 dark:text-teal-400">Target Physician:</span>
            <span>Assigning arrival directly to <strong>{targetDoctor}</strong> {targetRoom ? `· Room ${targetRoom}` : ""}</span>
          </div>
          <button
            type="button"
            onClick={() => router.replace("/nova/reception/register")}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs px-1.5 py-0.5 rounded cursor-pointer"
            title="Clear physician assignment"
          >
            ✕ Clear
          </button>
        </div>
      )}

      {/* ── Main Full-Width Workstation Container ── */}
      <div className="w-full max-w-6xl mx-auto space-y-4">
        {/* Intake Mode Bar: New Patient | Find Returning Patient | Fast Check-In Trigger */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
          <div className="flex items-center gap-2 flex-1 max-w-xl">
            <button
              type="button"
              onClick={() => {
                setTab("new");
                setSelectedExisting(null);
              }}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition shrink-0 cursor-pointer ${
                tab === "new" && !selectedExisting
                  ? "bg-teal-600 text-white shadow-xs"
                  : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-teal-400"
              }`}
            >
              <UserPlus size={13} />
              <span>New Patient</span>
            </button>

            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                placeholder="Find Returning Patient (name, ID, or phone)…"
                value={searchQuery}
                onFocus={() => {
                  if (tab !== "existing") setTab("existing");
                }}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (tab !== "existing") setTab("existing");
                  if (selectedExisting) setSelectedExisting(null);
                }}
                className={`${inputCls} pl-9 pr-8 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-teal-500`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedExisting(null);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  title="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFastCheckIn(true)}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900/60 transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
            >
              <QrCode size={13} />
              <span>⚡ Fast Check-In</span>
            </button>
            <span className="text-[11px] text-slate-400 hidden lg:inline">Intake Counter 01</span>
          </div>
        </div>

        {/* ── Returning Patient Lookup & Summary (Full Width) ── */}
        {tab === "existing" && (
          <Card className="p-5 sm:p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
            {!selectedExisting && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                    {searchQuery.length > 1
                      ? `Search Results (${searchResults.data?.length ?? 0})`
                      : "Find Returning Patient"}
                  </h3>
                  {searchResults.isFetching && (
                    <span className="text-xs text-teal-600 font-medium animate-pulse">Searching…</span>
                  )}
                </div>

                {searchQuery.length <= 1 && (
                  <div className="p-10 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                    <Search size={28} className="mx-auto text-slate-300 dark:text-slate-600" />
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      Type a patient's name, Health ID, or phone number in the search box above.
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Or click{" "}
                      <button
                        type="button"
                        onClick={() => setTab("new")}
                        className="text-teal-600 dark:text-teal-400 underline font-semibold cursor-pointer"
                      >
                        New Patient
                      </button>{" "}
                      to register a first-time patient.
                    </p>
                  </div>
                )}

                {searchResults.data && searchResults.data.length > 0 && (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {searchResults.data.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => { setSelectedExisting(p.id); setSearchQuery(p.nameEn); }}
                        className="w-full text-left p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-teal-400 hover:bg-teal-50/40 dark:hover:bg-teal-950/20 text-xs transition cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                            {p.nameEn} {p.nameAm && <span className="text-slate-400 font-normal">({p.nameAm})</span>}
                          </span>
                          <span className="font-mono text-teal-600 dark:text-teal-400 font-bold bg-teal-50 dark:bg-teal-950/50 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800">
                            {p.healthId}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1.5 flex-wrap">
                          <span>DOB: {p.dob}</span>
                          <span>•</span>
                          <span>{p.sex === "M" ? "Male" : "Female"}</span>
                          {p.phone && (
                            <>
                              <span>•</span>
                              <span>{p.phone}</span>
                            </>
                          )}

                          {p.kebele && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-xs text-slate-400">{p.kebele}</span>
                            </>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {searchQuery.length > 1 && searchResults.data?.length === 0 && !searchResults.isFetching && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={16} className="shrink-0 text-amber-600" />
                      <span>No patient found for "{searchQuery}".</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setTab("new");
                        setForm((prev) => ({ ...prev, nameEn: searchQuery }));
                      }}
                      className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-semibold shrink-0 transition cursor-pointer"
                    >
                      + Register as New Patient
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Selected Returning Patient Summary & Settlement */}
            {selectedExisting && (() => {
              const selectedPatient = searchResults.data?.find((p) => p.id === selectedExisting);
              return (
                <div className="space-y-4 pt-2">
                  {/* Patient Profile Banner */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-800/80 gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 dark:text-white text-base">
                          {selectedPatient?.nameEn}
                        </span>
                        {selectedPatient?.nameAm && (
                          <span className="text-slate-500 font-medium">({selectedPatient.nameAm})</span>
                        )}
                        <span className="font-mono px-2 py-0.5 bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-300 rounded font-bold text-xs">
                          {selectedPatient?.healthId}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                        {selectedPatient?.dob ? <span>DOB: {selectedPatient.dob}</span> : null}
                        {selectedPatient?.sex ? <span>• {selectedPatient.sex === "M" ? "Male" : "Female"}</span> : null}
                        {selectedPatient?.phone ? <span>• Tel: {selectedPatient.phone}</span> : null}
                        {selectedPatient?.kebele ? <span>• {selectedPatient.kebele}</span> : null}
                      </div>
                    </div>

                    {/* Portal PIN */}
                    <div className="flex items-center gap-1.5 self-start sm:self-auto">
                      <span className="text-slate-500 text-xs">PIN:</span>
                      <span className="font-mono font-bold text-teal-700 dark:text-teal-300 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-xs">
                        {(selectedPatient as any)?.portalPin || "1234"}
                      </span>
                      <button
                        type="button"
                        onClick={async () => {
                          const res = await resetPinMutation.mutateAsync({ patientId: selectedExisting });
                          setExistingResetPinSuccess(`Reset to: ${res.portalPin}`);
                          await searchResults.refetch();
                          setTimeout(() => setExistingResetPinSuccess(null), 4000);
                        }}
                        className="text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 p-1 rounded cursor-pointer transition"
                        title="Reset Portal PIN"
                      >
                        <RefreshCw size={13} />
                      </button>
                    </div>
                  </div>

                  {existingResetPinSuccess && (
                    <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold px-1">
                      ✓ {existingResetPinSuccess}
                    </div>
                  )}

                  {/* Tariff & Settlement Strip */}
                  <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Tariff &amp; Settlement
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 rounded border border-teal-200/60 dark:border-teal-800/60">
                        {isEmergency ? "Emergency Deferred" : `Tariff: ETB ${cardFeeAmount}`}
                      </span>
                    </div>

                    {/* Fast Toggle Chips */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <label className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs cursor-pointer select-none transition ${
                        isEmergency
                          ? "bg-red-50 dark:bg-red-950/40 border-red-500 text-red-900 dark:text-red-200 font-semibold"
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300"
                      }`}>
                        <input
                          type="checkbox"
                          className="accent-red-600 rounded"
                          checked={isEmergency}
                          onChange={(e) => {
                            setIsEmergency(e.target.checked);
                            if (e.target.checked) setIsVip(false);
                          }}
                        />
                        <span>🚨 Emergency Case</span>
                      </label>

                      <label className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs cursor-pointer select-none transition ${
                        isVip && !isEmergency
                          ? "bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-900 dark:text-amber-200 font-semibold"
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300"
                      }`}>
                        <input
                          type="checkbox"
                          className="accent-amber-600 rounded"
                          checked={isVip && !isEmergency}
                          disabled={isEmergency}
                          onChange={(e) => setIsVip(e.target.checked)}
                        />
                        <span>⭐ VIP Fast-Track</span>
                      </label>
                    </div>

                    {/* Payment Method Selector */}
                    {!isEmergency && (
                      <div className="space-y-2 pt-1">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          {(["cash", "telebirr", "cbe_birr", "unpaid"] as const).map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setPaymentMethod(m)}
                              className={`py-2 px-3 rounded-xl border font-medium text-center transition-all ${
                                paymentMethod === m
                                  ? "bg-teal-600 text-white border-teal-600 shadow-xs font-semibold"
                                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-teal-400"
                              }`}
                            >
                              {m === "cash" && "💵 Cash"}
                              {m === "telebirr" && "📱 Telebirr"}
                              {m === "cbe_birr" && "🏦 CBE Birr"}
                              {m === "unpaid" && "⏳ Cashier Gate"}
                            </button>
                          ))}
                        </div>

                        {(paymentMethod === "telebirr" || paymentMethod === "cbe_birr") && (
                          <input
                            className={`${inputCls} text-xs py-2`}
                            value={paymentReference}
                            onChange={(e) => setPaymentReference(e.target.value)}
                            placeholder={`${paymentMethod === "telebirr" ? "Telebirr" : "CBE Birr"} Reference ID (e.g. TLB-998241)`}
                          />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-2 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleCheckInExisting}
                      disabled={isLoading}
                      className={`${btnPrimary} flex-1 justify-center py-2.5 text-xs font-semibold cursor-pointer ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      {isLoading
                        ? "Processing…"
                        : `Check In & Issue Ticket ${isEmergency ? "(Emergency)" : paymentMethod === "unpaid" ? "(Pay at Cashier)" : `(ETB ${cardFeeAmount})`}`}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setSelectedExisting(null); setSearchQuery(""); }}
                      className={`${btnSecondary} px-4 py-2.5 text-xs cursor-pointer`}
                    >
                      Change Patient
                    </button>
                  </div>
                </div>
              );
            })()}
          </Card>
        )}

        {/* ── New Patient Registration (Full Page Comprehensive Layout) ── */}
        {tab === "new" && (
          <Card className="p-6 sm:p-8 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-6">
            {mutationError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-700 dark:text-red-300">
                <AlertTriangle size={15} className="shrink-0" />
                <span>{mutationError}</span>
              </div>
            )}

            {/* 1. Demographics & Identification */}
            <div>
              <div className="flex items-center gap-2 pb-2 mb-4 border-b border-slate-100 dark:border-slate-800">
                <User size={16} className="text-teal-600" />
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                  1. Patient Identification & Demographics
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField label="Full Name (English) *" error={errors.nameEn}>
                  <input
                    id="field-nameEn"
                    className={`${inputCls} ${
                      errors.nameEn
                        ? "border-red-500 ring-2 ring-red-500/30 bg-red-50/20 dark:bg-red-950/20 focus:border-red-500"
                        : ""
                    }`}
                    value={form.nameEn}
                    onChange={(e) => {
                      setForm((p) => ({ ...p, nameEn: e.target.value }));
                      if (errors.nameEn) setErrors((prev) => ({ ...prev, nameEn: "" }));
                    }}
                    placeholder="First, Father, Grandfather (e.g. Abebe Kebede Tadesse)"
                  />
                </FormField>

                <FormField label="Full Name (Amharic / አማርኛ)">
                  <input
                    className={inputCls}
                    value={form.nameAm}
                    onChange={(e) => setForm((p) => ({ ...p, nameAm: e.target.value }))}
                    placeholder="አበበ ከበደ ታደሰ"
                  />
                </FormField>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Date of Birth * {form.dob && <span className="text-teal-600 font-mono text-[11px]">({calculateAge(form.dob)})</span>}
                    </label>
                  </div>
                  <input
                    id="field-dob"
                    type="date"
                    className={`${inputCls} ${
                      errors.dob
                        ? "border-red-500 ring-2 ring-red-500/30 bg-red-50/20 dark:bg-red-950/20 focus:border-red-500"
                        : ""
                    }`}
                    value={form.dob}
                    onChange={(e) => {
                      setForm((p) => ({ ...p, dob: e.target.value }));
                      if (errors.dob) setErrors((prev) => ({ ...prev, dob: "" }));
                    }}
                  />
                </div>

                <FormField label="Sex">
                  <select
                    className={inputCls}
                    value={form.sex}
                    onChange={(e) => setForm((p) => ({ ...p, sex: e.target.value as "M" | "F" }))}
                  >
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                  </select>
                </FormField>

                <FormField label="Marital Status">
                  <select
                    className={inputCls}
                    value={form.maritalStatus}
                    onChange={(e) => setForm((p) => ({ ...p, maritalStatus: e.target.value }))}
                  >
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                </FormField>

                <FormField label="Occupation">
                  <input
                    className={inputCls}
                    value={form.occupation}
                    onChange={(e) => setForm((p) => ({ ...p, occupation: e.target.value }))}
                    placeholder="e.g. Civil Servant, Merchant, Farmer, Student"
                  />
                </FormField>
              </div>
            </div>

            {/* 2. Contact & Address */}
            <div>
              <div className="flex items-center gap-2 pb-2 mb-4 border-b border-slate-100 dark:border-slate-800">
                <MapPin size={16} className="text-teal-600" />
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                  2. Contact & Residential Address
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField label="Primary Phone Number *">
                  <input
                    className={inputCls}
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="09XX XXX XXX"
                  />
                </FormField>

                <FormField label="Alternate / Family Phone">
                  <input
                    className={inputCls}
                    value={form.altPhone}
                    onChange={(e) => setForm((p) => ({ ...p, altPhone: e.target.value }))}
                    placeholder="09XX XXX XXX"
                  />
                </FormField>

                <FormField label="Email Address (Optional)">
                  <input
                    type="email"
                    className={inputCls}
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="patient@example.com"
                  />
                </FormField>

                <FormField label="Region / City">
                  <select
                    className={inputCls}
                    value={form.region}
                    onChange={(e) => setForm((p) => ({ ...p, region: e.target.value }))}
                  >
                    <option value="Addis Ababa">Addis Ababa</option>
                    <option value="Oromia">Oromia</option>
                    <option value="Amhara">Amhara</option>
                    <option value="Sidama">Sidama</option>
                    <option value="Dire Dawa">Dire Dawa</option>
                    <option value="Tigray">Tigray</option>
                    <option value="Somali">Somali</option>
                    <option value="Afar">Afar</option>
                    <option value="Benishangul-Gumuz">Benishangul-Gumuz</option>
                    <option value="Gambella">Gambella</option>
                    <option value="Harari">Harari</option>
                    <option value="South Ethiopia">South Ethiopia</option>
                    <option value="Central Ethiopia">Central Ethiopia</option>
                    <option value="South West Ethiopia">South West Ethiopia</option>
                  </select>
                </FormField>

                <FormField label="Subcity / Zone">
                  <input
                    className={inputCls}
                    value={form.subcity}
                    onChange={(e) => setForm((p) => ({ ...p, subcity: e.target.value }))}
                    placeholder="e.g. Bole, Kirkos, Yeka, Arada"
                  />
                </FormField>

                <FormField label="Woreda & Kebele">
                  <input
                    className={inputCls}
                    value={form.kebele}
                    onChange={(e) => setForm((p) => ({ ...p, kebele: e.target.value }))}
                    placeholder="e.g. Woreda 03, Kebele 08"
                  />
                </FormField>
              </div>
            </div>

            {/* 3. Emergency Contact (Next of Kin) */}
            <div>
              <div className="flex items-center gap-2 pb-2 mb-4 border-b border-slate-100 dark:border-slate-800">
                <Phone size={16} className="text-teal-600" />
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                  3. Emergency Contact (Next of Kin)
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField label="Emergency Contact Name">
                  <input
                    className={inputCls}
                    value={form.emergencyName}
                    onChange={(e) => setForm((p) => ({ ...p, emergencyName: e.target.value }))}
                    placeholder="e.g. Chaltu Gemechu"
                  />
                </FormField>

                <FormField label="Relationship">
                  <select
                    className={inputCls}
                    value={form.emergencyRelation}
                    onChange={(e) => setForm((p) => ({ ...p, emergencyRelation: e.target.value }))}
                  >
                    <option value="Spouse">Spouse (ባለቤት)</option>
                    <option value="Parent">Parent (እናት/አባት)</option>
                    <option value="Child">Child (ልጅ)</option>
                    <option value="Sibling">Sibling (ወንድም/እህት)</option>
                    <option value="Guardian">Guardian (አሳዳጊ)</option>
                    <option value="Family">Family / Relative (ዘመድ)</option>
                    <option value="Other">Other</option>
                  </select>
                </FormField>

                <FormField label="Emergency Contact Phone">
                  <input
                    className={inputCls}
                    value={form.emergencyPhone}
                    onChange={(e) => setForm((p) => ({ ...p, emergencyPhone: e.target.value }))}
                    placeholder="09XX XXX XXX"
                  />
                </FormField>
              </div>
            </div>

            {/* 4. Registration Tariff & Settlement */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <CreditCard size={16} className="text-teal-600" />
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                    4. Registration Tariff & Settlement
                  </h3>
                </div>
                <span className="text-xs font-semibold px-2.5 py-0.5 bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 rounded-lg border border-teal-200/60 dark:border-teal-800/60">
                  {isEmergency ? "Emergency Deferred" : `Tariff: ETB ${cardFeeAmount}`}
                </span>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className={`flex items-center gap-2 p-3 rounded-xl border text-xs cursor-pointer select-none transition ${
                  isEmergency
                    ? "bg-red-50 dark:bg-red-950/40 border-red-500 text-red-900 dark:text-red-200 font-semibold"
                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300"
                }`}>
                  <input
                    type="checkbox"
                    className="accent-red-600 rounded"
                    checked={isEmergency}
                    onChange={(e) => {
                      setIsEmergency(e.target.checked);
                      if (e.target.checked) setIsVip(false);
                    }}
                  />
                  <span>🚨 Emergency Case</span>
                </label>

                <label className={`flex items-center gap-2 p-3 rounded-xl border text-xs cursor-pointer select-none transition ${
                  isVip && !isEmergency
                    ? "bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-900 dark:text-amber-200 font-semibold"
                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300"
                }`}>
                  <input
                    type="checkbox"
                    className="accent-amber-600 rounded"
                    checked={isVip && !isEmergency}
                    disabled={isEmergency}
                    onChange={(e) => setIsVip(e.target.checked)}
                  />
                  <span>⭐ VIP Fast-Track</span>
                </label>
              </div>

              {/* Payment Method Selector */}
              {!isEmergency && (
                <div className="space-y-2 pt-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                    Payment Collection Method:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    {(["cash", "telebirr", "cbe_birr", "unpaid"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPaymentMethod(m)}
                        className={`py-2 px-3 rounded-xl border font-medium text-center transition-all cursor-pointer ${
                          paymentMethod === m
                            ? "bg-teal-600 text-white border-teal-600 shadow-xs font-semibold"
                            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-teal-400"
                        }`}
                      >
                        {m === "cash" && "💵 Cash"}
                        {m === "telebirr" && "📱 Telebirr"}
                        {m === "cbe_birr" && "🏦 CBE Birr"}
                        {m === "unpaid" && "⏳ Cashier Gate"}
                      </button>
                    ))}
                  </div>

                  {(paymentMethod === "telebirr" || paymentMethod === "cbe_birr") && (
                    <div>
                      <input
                        id="field-paymentReference"
                        className={`${inputCls} text-xs py-2 ${
                          errors.paymentReference
                            ? "border-red-500 ring-2 ring-red-500/30 bg-red-50/20 dark:bg-red-950/20 focus:border-red-500"
                            : ""
                        }`}
                        value={paymentReference}
                        onChange={(e) => {
                          setPaymentReference(e.target.value);
                          if (errors.paymentReference) setErrors((prev) => ({ ...prev, paymentReference: "" }));
                        }}
                        placeholder={`${paymentMethod === "telebirr" ? "Telebirr" : "CBE Birr"} Reference ID (e.g. TLB-998241)`}
                      />
                      {errors.paymentReference && (
                        <span className="text-[11px] font-semibold text-red-600 dark:text-red-400 block mt-1">
                          {errors.paymentReference}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Portal PIN */}
              <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl border text-xs transition ${
                errors.portalPin
                  ? "bg-red-50/30 dark:bg-red-950/20 border-red-500 ring-1 ring-red-500/30"
                  : "bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/80"
              }`}>
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className={errors.portalPin ? "text-red-500 shrink-0" : "text-teal-600 shrink-0"} />
                  <span className={`font-medium ${errors.portalPin ? "text-red-700 dark:text-red-300" : "text-slate-700 dark:text-slate-300"}`}>
                    Patient Portal Security PIN:
                  </span>
                  <input
                    id="field-portalPin"
                    className={`w-16 px-2 py-0.5 font-mono text-center font-bold bg-white dark:bg-slate-900 rounded-lg text-xs focus:outline-hidden ${
                      errors.portalPin
                        ? "border-2 border-red-500 text-red-600 dark:text-red-400"
                        : "border border-slate-200 dark:border-slate-700 text-teal-700 dark:text-teal-300"
                    }`}
                    value={form.portalPin}
                    maxLength={4}
                    onChange={(e) => {
                      setForm((p) => ({ ...p, portalPin: e.target.value.replace(/\D/g, "") }));
                      if (errors.portalPin) setErrors((prev) => ({ ...prev, portalPin: "" }));
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setForm((p) => ({ ...p, portalPin: Math.floor(1000 + Math.random() * 9000).toString() }));
                      if (errors.portalPin) setErrors((prev) => ({ ...prev, portalPin: "" }));
                    }}
                    className="text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition"
                    title="Generate new PIN"
                  >
                    <RefreshCw size={13} />
                  </button>
                </div>
                {errors.portalPin ? (
                  <span className="text-[11px] font-semibold text-red-600 dark:text-red-400">{errors.portalPin}</span>
                ) : (
                  <span className="text-[11px] text-slate-400 hidden sm:inline">Printed on patient card for mobile access</span>
                )}
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3">
              <button
                type="button"
                onClick={handleRegisterNew}
                disabled={isLoading}
                className={`${btnPrimary} flex-1 justify-center py-3 text-xs font-semibold cursor-pointer ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {isLoading
                  ? "Registering…"
                  : `Register & Issue Ticket ${isEmergency ? "(Emergency)" : paymentMethod === "unpaid" ? "(Pay at Cashier)" : `(Collect ETB ${cardFeeAmount})`}`}
              </button>
              <button
                type="button"
                onClick={() => {
                  setForm(getDefaultFormState());
                  setErrors({});
                }}
                className={`${btnSecondary} px-4 py-3 text-xs cursor-pointer`}
              >
                Clear Form
              </button>
            </div>
          </Card>
        )}
      </div>

      {/* ── FULL-PAGE OVERLAY: FAST CHECK-IN (EXPRESS STATION) ── */}
      {showFastCheckIn && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md overflow-y-auto p-4 sm:p-6 lg:p-8 animate-in fade-in duration-150">
          <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">
            {/* Top Bar with Clear Back Arrow directing back to Patient Intake */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowFastCheckIn(false);
                  setKioskError("");
                  setKioskCheckInSuccess(null);
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 flex items-center gap-2 transition cursor-pointer border border-slate-200 dark:border-slate-700 shadow-xs"
              >
                <ArrowLeft size={16} />
                <span>Back to Patient Intake</span>
              </button>

              <div className="text-right">
                <div className="flex items-center gap-2 justify-end">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse" />
                  <h2 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-1.5">
                    <QrCode size={18} className="text-teal-600" />
                    <span>Fast Check-In</span>
                  </h2>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Scan QR card or enter Health ID to dispense an instant OPD ticket
                </p>
              </div>
            </div>

            {/* Check-In Success State */}
            {kioskCheckInSuccess ? (
              <div className="p-5 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-teal-800 dark:text-teal-300 flex items-center gap-2">
                    <CheckCircle size={18} /> Checked In Successfully!
                  </span>
                  <span className="font-mono text-sm px-3 py-1 bg-teal-600 text-white font-black rounded-full shadow-xs">
                    Ticket: {kioskCheckInSuccess.ticket}
                  </span>
                </div>

                <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-teal-100 dark:border-teal-900/60 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Patient Name:</span>
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {kioskCheckInSuccess.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Health ID:</span>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{kioskCheckInSuccess.healthId}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Destination:</span>
                    <span className="font-semibold text-teal-700 dark:text-teal-300">{kioskCheckInSuccess.dept}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex-1 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Printer size={14} /> Print Ticket
                  </button>
                  <button
                    type="button"
                    onClick={() => setKioskCheckInSuccess(null)}
                    className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                  >
                    Next Patient Check-In
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Method Switcher Tabs */}
                <div className="grid grid-cols-2 gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
                  <button
                    type="button"
                    onClick={() => setKioskMethod("id")}
                    className={`py-2 rounded-lg font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      kioskMethod === "id"
                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    <Hash size={14} />
                    <span>Health ID / Phone</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setKioskMethod("qr")}
                    className={`py-2 rounded-lg font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      kioskMethod === "qr"
                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    <Camera size={14} />
                    <span>Camera QR Scanner</span>
                  </button>
                </div>

                {kioskError && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                    <AlertTriangle size={15} />
                    <span>{kioskError}</span>
                  </div>
                )}

                {/* Mode 1: Health ID / Fast Input */}
                {kioskMethod === "id" && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Enter Patient Health ID or Phone:
                      </label>
                      <input
                        value={kioskIdInput}
                        onChange={(e) => setKioskIdInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleKioskCheckIn(kioskIdInput);
                        }}
                        autoFocus
                        placeholder="e.g. DMH-00123 or 0911223344"
                        className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 font-mono focus:border-teal-500 focus:outline-hidden"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleKioskCheckIn(kioskIdInput)}
                      disabled={!kioskIdInput.trim() || kioskLoading}
                      className={`w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer ${
                        !kioskIdInput.trim() || kioskLoading ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      <span>{kioskLoading ? "Checking In…" : "Check In & Dispense Ticket"}</span>
                      <ArrowRight size={14} />
                    </button>

                    {/* Quick Demo Test Presets */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-[11px] uppercase font-bold text-slate-400 block mb-2">
                        Quick Demo Test Patients:
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {PATIENTS.slice(0, 4).map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleKioskCheckIn(p.healthId)}
                            className="p-2 text-left rounded-lg border border-slate-200 dark:border-slate-700 hover:border-teal-400 hover:bg-teal-50/50 dark:hover:bg-teal-950/20 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                          >
                            <span className="font-semibold block text-xs truncate">{p.name}</span>
                            <span className="font-mono text-[10px] text-teal-600 dark:text-teal-400">{p.healthId}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Mode 2: Live Camera QR Scanner */}
                {kioskMethod === "qr" && (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-500 text-center">
                      Hold patient QR card in front of your webcam or camera:
                    </p>
                    <div className="flex justify-center rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 p-2 bg-slate-900">
                      <QRScanner onScan={handleKioskQRScanned} autoStart={true} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Bottom Back Button */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  setShowFastCheckIn(false);
                  setKioskError("");
                  setKioskCheckInSuccess(null);
                }}
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1.5 cursor-pointer py-1"
              >
                <ArrowLeft size={14} />
                <span>Return to Patient Intake</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
