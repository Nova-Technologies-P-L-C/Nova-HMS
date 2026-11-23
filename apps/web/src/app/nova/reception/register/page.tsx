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
  Hash,
  Sparkles,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import PatientQRCode from "@/components/nova/patient-qr";
import QRScanner from "@/components/nova/qr-scanner";
import { PATIENTS } from "@/lib/nova-mock-data";
import { toast } from "sonner";

export default function PatientRegistrationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetDoctor = searchParams.get("targetDoctor");
  const targetRoom = searchParams.get("targetRoom");
  const [searchQuery, setSearchQuery] = useState("");
  const [form, setForm] = useState({
    nameEn: "",
    nameAm: "",
    dob: "",
    sex: "M" as "M" | "F",
    phone: "",
    email: "",
    kebele: "",
    cbhiStatus: false,
    portalPin: Math.floor(1000 + Math.random() * 9000).toString(),
  });
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

    if (!form.cbhiStatus && !isEmergency && (paymentMethod === "telebirr" || paymentMethod === "cbe_birr") && !paymentReference.trim()) {
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

    const patient = await registerMutation.mutateAsync(form);
    const assignedPin = (patient as any).portalPin || form.portalPin || "1234";

    const { ticket, receiptNumber } = await openVisitMutation.mutateAsync({
      patientId: patient.id,
      type: isEmergency ? "emergency" : "opd",
      tier: isEmergency ? "emergency" : isVip ? "vip" : "standard",
      isEmergency,
      paymentMethod: form.cbhiStatus ? "unpaid" : (isEmergency ? "unpaid" : paymentMethod),
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
        cbhi: form.cbhiStatus,
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
      cbhiStatus: form.cbhiStatus,
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
      paymentMethod: patient.cbhiStatus ? "unpaid" : (isEmergency ? "unpaid" : paymentMethod),
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
      cbhiStatus: patient.cbhiStatus,
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
              paymentMethod: dbPatient.cbhiStatus ? "unpaid" : "cash",
            });
            await queryClient.invalidateQueries({ queryKey: trpc.visit.queue.queryKey() });
            setKioskCheckInSuccess({
              name: dbPatient.nameEn,
              nameAm: dbPatient.nameAm ?? undefined,
              healthId: dbPatient.healthId,
              ticket: ticket.ticketNumber,
              cbhi: dbPatient.cbhiStatus,
              dept: "Triage Station (Nursing Intake)",
              receiptNumber,
            });
          } else {
            setKioskCheckInSuccess({
              name: matched.name,
              nameAm: matched.nameAm,
              healthId: matched.healthId,
              ticket: fallbackTicket,
              cbhi: matched.cbhi,
              dept: "Triage Station (Nursing Intake)",
            });
          }
        } catch {
          setKioskCheckInSuccess({
            name: matched.name,
            nameAm: matched.nameAm,
            healthId: matched.healthId,
            ticket: fallbackTicket,
            cbhi: matched.cbhi,
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
                    {submitted.cbhiStatus ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                        🛡️ CBHI Member
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-medium">Standard Patient</span>
                    )}
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
                    {submitted.paymentStatus === "cbhi_covered" && (
                      <span className="px-2 py-0.5 bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 rounded font-semibold text-[11px]">
                        🛡️ 100% CBHI Covered
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
                      setForm({
                        nameEn: "",
                        nameAm: "",
                        dob: "",
                        sex: "M",
                        phone: "",
                        email: "",
                        kebele: "",
                        cbhiStatus: false,
                        portalPin: Math.floor(1000 + Math.random() * 9000).toString(),
                      });
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
      subtitle="New registrations and returning visits."
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

      {/* ── Side-by-Side Reception Workstation ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left / Main Column (7-8 cols): Patient Registration Desk */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-3">
          {/* Mode Selector */}
          <div className="flex items-center justify-between pb-1">
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setTab("new")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition ${
                  tab === "new"
                    ? "bg-teal-600 text-white shadow-xs"
                    : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-teal-400"
                }`}
              >
                <UserPlus size={13} /> New Patient
              </button>
              <button
                type="button"
                onClick={() => setTab("existing")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition ${
                  tab === "existing"
                    ? "bg-teal-600 text-white shadow-xs"
                    : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-teal-400"
                }`}
              >
                <Search size={13} /> Returning Patient
              </button>
            </div>
            <span className="text-[11px] text-slate-400 hidden sm:inline">Intake Counter 01</span>
          </div>

          {/* Returning Patient Lookup */}
          {tab === "existing" && (
            <Card className="p-4 sm:p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm mb-2">Find Returning Patient</h3>
                <input
                  className={inputCls}
                  placeholder="Enter name, Health ID (DMH-...), or phone number…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>

              {searchResults.data && searchResults.data.length > 0 && !selectedExisting && (
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {searchResults.data.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { setSelectedExisting(p.id); setSearchQuery(p.nameEn); }}
                      className="w-full text-left p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-teal-400 hover:bg-teal-50/40 dark:hover:bg-teal-950/20 text-xs transition"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {p.nameEn} {p.nameAm && <span className="text-slate-400 font-normal">({p.nameAm})</span>}
                        </span>
                        <span className="font-mono text-teal-600 dark:text-teal-400 font-medium">{p.healthId}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        DOB: {p.dob} · {p.sex === "M" ? "Male" : "Female"} · {p.cbhiStatus ? "✓ CBHI Member" : "Self-pay"}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {searchQuery.length > 1 && searchResults.data?.length === 0 && (
                <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-lg p-2.5">
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>No patient found in database. Switch to "New Patient" above.</span>
                </div>
              )}

              {/* Selected Returning Patient Summary & Settlement */}
              {selectedExisting && (() => {
                const selectedPatient = searchResults.data?.find((p) => p.id === selectedExisting);
                return (
                  <div className="space-y-3.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    {/* Compact Patient Profile Pill */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-800/80 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 dark:text-slate-100">
                            {selectedPatient?.nameEn}
                          </span>
                          {selectedPatient?.nameAm && (
                            <span className="text-slate-400">({selectedPatient.nameAm})</span>
                          )}
                          <span className="font-mono px-1.5 py-0.5 bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-300 rounded font-semibold text-[11px]">
                            {selectedPatient?.healthId}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {selectedPatient?.dob ? `DOB: ${selectedPatient.dob}` : ""} {selectedPatient?.phone ? `· ${selectedPatient.phone}` : ""}
                        </div>
                      </div>

                      {/* Compact Portal PIN */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 text-[11px]">PIN:</span>
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
                          className="text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 p-0.5 rounded cursor-pointer transition"
                          title="Reset Portal PIN"
                        >
                          <RefreshCw size={12} />
                        </button>
                      </div>
                    </div>

                    {existingResetPinSuccess && (
                      <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold px-1">
                        ✓ {existingResetPinSuccess}
                      </div>
                    )}

                    {/* Integrated Coverage & Settlement Strip */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Coverage &amp; Settlement
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 rounded border border-teal-200/60 dark:border-teal-800/60">
                          {selectedPatient?.cbhiStatus ? "0 ETB (CBHI 100%)" : isEmergency ? "Emergency Deferred" : `Tariff: ETB ${cardFeeAmount}`}
                        </span>
                      </div>

                      {/* Fast Toggle Chips */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className={`flex items-center gap-2 p-2 rounded-lg border text-xs ${
                          selectedPatient?.cbhiStatus
                            ? "bg-teal-50 dark:bg-teal-950/40 border-teal-500 text-teal-900 dark:text-teal-200 font-semibold"
                            : "border-slate-200 dark:border-slate-700 text-slate-500"
                        }`}>
                          <span>{selectedPatient?.cbhiStatus ? "🛡️ CBHI Covered (100%)" : "🛡️ Self-Pay (No CBHI)"}</span>
                        </div>

                        <label className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer select-none transition ${
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

                        <label className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer select-none transition ${
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
                      {!selectedPatient?.cbhiStatus && !isEmergency && (
                        <div className="space-y-2 pt-1">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
                            {(["cash", "telebirr", "cbe_birr", "unpaid"] as const).map((m) => (
                              <button
                                key={m}
                                type="button"
                                onClick={() => setPaymentMethod(m)}
                                className={`py-1.5 px-2 rounded-lg border font-medium text-center transition-all ${
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
                              className={`${inputCls} text-xs py-1.5`}
                              value={paymentReference}
                              onChange={(e) => setPaymentReference(e.target.value)}
                              placeholder={`${paymentMethod === "telebirr" ? "Telebirr" : "CBE Birr"} Reference ID (e.g. TLB-998241)`}
                            />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="pt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCheckInExisting}
                        disabled={isLoading}
                        className={`${btnPrimary} flex-1 justify-center py-2 text-xs font-semibold ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        {isLoading
                          ? "Processing…"
                          : `Check In & Issue Ticket ${isEmergency ? "(Emergency)" : selectedPatient?.cbhiStatus ? "(CBHI Free)" : paymentMethod === "unpaid" ? "(Pay at Cashier)" : `(ETB ${cardFeeAmount})`}`}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSelectedExisting(null); setSearchQuery(""); }}
                        className={`${btnSecondary} px-3 py-2 text-xs`}
                      >
                        Change Patient
                      </button>
                    </div>
                  </div>
                );
              })()}
            </Card>
          )}

          {/* New Patient Registration - Cohesive Single Card */}
          {tab === "new" && (
            <Card className="p-4 sm:p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
              {mutationError && (
                <div className="flex items-center gap-2 p-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg text-xs text-red-700 dark:text-red-300">
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>{mutationError}</span>
                </div>
              )}

              {/* Patient Demographic Form Fields */}
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm mb-3">
                  Patient Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField label="Full Name (English) *" error={errors.nameEn}>
                    <input
                      id="field-nameEn"
                      className={`${inputCls} ${
                        errors.nameEn
                          ? "border-red-500 ring-2 ring-red-500/30 bg-red-50/20 dark:bg-red-950/20 focus:border-red-500 focus:ring-red-500"
                          : ""
                      }`}
                      value={form.nameEn}
                      onChange={(e) => {
                        setForm((p) => ({ ...p, nameEn: e.target.value }));
                        if (errors.nameEn) setErrors((prev) => ({ ...prev, nameEn: "" }));
                      }}
                      placeholder="e.g. Abebe Kebede"
                    />
                  </FormField>
                  <FormField label="Full Name (Amharic)">
                    <input
                      className={inputCls}
                      value={form.nameAm}
                      onChange={(e) => setForm((p) => ({ ...p, nameAm: e.target.value }))}
                      placeholder="e.g. አበበ ከበደ"
                    />
                  </FormField>
                  <FormField label="Date of Birth *" error={errors.dob}>
                    <input
                      id="field-dob"
                      type="date"
                      className={`${inputCls} ${
                        errors.dob
                          ? "border-red-500 ring-2 ring-red-500/30 bg-red-50/20 dark:bg-red-950/20 focus:border-red-500 focus:ring-red-500"
                          : ""
                      }`}
                      value={form.dob}
                      onChange={(e) => {
                        setForm((p) => ({ ...p, dob: e.target.value }));
                        if (errors.dob) setErrors((prev) => ({ ...prev, dob: "" }));
                      }}
                    />
                  </FormField>
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
                  <FormField label="Phone Number">
                    <input
                      className={inputCls}
                      value={form.phone}
                      onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                      placeholder="09XX XXX XXX"
                    />
                  </FormField>
                  <FormField label="Kebele / Woreda">
                    <input
                      className={inputCls}
                      value={form.kebele}
                      onChange={(e) => setForm((p) => ({ ...p, kebele: e.target.value }))}
                      placeholder="e.g. Kebele 03"
                    />
                  </FormField>
                  <div className="sm:col-span-2">
                    <FormField label="Email Address (Optional)">
                      <input
                        type="email"
                        className={inputCls}
                        value={form.email}
                        onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                        placeholder="patient@example.com"
                      />
                    </FormField>
                  </div>
                </div>
              </div>

              {/* Compact Inline Portal Security PIN Tool */}
              <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg border text-xs transition ${
                errors.portalPin
                  ? "bg-red-50/30 dark:bg-red-950/20 border-red-500 ring-1 ring-red-500/30"
                  : "bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/80"
              }`}>
                <div className="flex items-center gap-2">
                  <ShieldCheck size={15} className={errors.portalPin ? "text-red-500 shrink-0" : "text-teal-600 shrink-0"} />
                  <span className={`font-medium ${errors.portalPin ? "text-red-700 dark:text-red-300" : "text-slate-700 dark:text-slate-300"}`}>
                    Portal Security PIN:
                  </span>
                  <input
                    id="field-portalPin"
                    className={`w-16 px-1.5 py-0.5 font-mono text-center font-bold bg-white dark:bg-slate-900 rounded text-xs focus:outline-hidden ${
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
                    title="Regenerate random PIN"
                  >
                    <RefreshCw size={12} />
                  </button>
                </div>
                {errors.portalPin ? (
                  <span className="text-[11px] font-semibold text-red-600 dark:text-red-400">{errors.portalPin}</span>
                ) : (
                  <span className="text-[11px] text-slate-400 hidden sm:inline">Printed on card for online access</span>
                )}
              </div>

              {/* Integrated Coverage & Settlement Section */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Coverage &amp; Settlement
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 rounded border border-teal-200/60 dark:border-teal-800/60">
                    {form.cbhiStatus ? "0 ETB (CBHI 100%)" : isEmergency ? "Emergency Deferred" : `Tariff: ETB ${cardFeeAmount}`}
                  </span>
                </div>

                {/* Fast Toggle Chips */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer select-none transition ${
                    form.cbhiStatus
                      ? "bg-teal-50 dark:bg-teal-950/40 border-teal-500 text-teal-900 dark:text-teal-200 font-semibold"
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300"
                  }`}>
                    <input
                      type="checkbox"
                      className="accent-teal-600 rounded"
                      checked={form.cbhiStatus}
                      onChange={(e) => setForm((p) => ({ ...p, cbhiStatus: e.target.checked }))}
                    />
                    <span>🛡️ CBHI Member</span>
                  </label>

                  <label className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer select-none transition ${
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

                  <label className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer select-none transition ${
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
                {!form.cbhiStatus && !isEmergency && (
                  <div className="space-y-2 pt-1">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
                      {(["cash", "telebirr", "cbe_birr", "unpaid"] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setPaymentMethod(m)}
                          className={`py-1.5 px-2 rounded-lg border font-medium text-center transition-all ${
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
                          className={`${inputCls} text-xs py-1.5 ${
                            errors.paymentReference
                              ? "border-red-500 ring-2 ring-red-500/30 bg-red-50/20 dark:bg-red-950/20 focus:border-red-500 focus:ring-red-500"
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
              </div>

              {/* Primary Action Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRegisterNew}
                  disabled={isLoading}
                  className={`${btnPrimary} flex-1 justify-center py-2 text-xs font-semibold ${isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  {isLoading
                    ? "Registering…"
                    : `Register & Issue Ticket ${isEmergency ? "(Emergency)" : form.cbhiStatus ? "(CBHI Free)" : paymentMethod === "unpaid" ? "(Pay at Cashier)" : `(Collect ETB ${cardFeeAmount})`}`}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setForm({
                      nameEn: "",
                      nameAm: "",
                      dob: "",
                      sex: "M",
                      phone: "",
                      email: "",
                      kebele: "",
                      cbhiStatus: false,
                      portalPin: Math.floor(1000 + Math.random() * 9000).toString(),
                    });
                    setErrors({});
                  }}
                  className={`${btnSecondary} px-3 py-2 text-xs`}
                >
                  Clear
                </button>
              </div>
            </Card>
          )}
        </div>

        {/* ── Right Column (4-5 cols): Kiosk Check-In Station ── */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-3">
          <Card className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs sticky top-4">
            {/* Kiosk Card Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
                  <QrCode size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-slate-800 dark:text-slate-100">Fast Check-In</h3>
                  <p className="text-[10px] text-slate-400">Scan QR card or enter Health ID</p>
                </div>
              </div>

              <span className="text-[10px] font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
                Express Desk
              </span>
            </div>

            {/* Check-In Success Result State */}
            {kioskCheckInSuccess ? (
              <div className="p-3.5 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-xl space-y-2.5 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-800 dark:text-teal-300 flex items-center gap-1.5">
                    <CheckCircle size={14} /> Checked In!
                  </span>
                  <span className="font-mono text-xs px-2 py-0.5 bg-teal-600 text-white font-black rounded-full shadow-xs">
                    Ticket: {kioskCheckInSuccess.ticket}
                  </span>
                </div>

                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-teal-100 dark:border-teal-900/60 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Patient:</span>
                    <span className="font-bold text-slate-900 dark:text-white truncate max-w-[160px]">
                      {kioskCheckInSuccess.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Health ID:</span>
                    <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{kioskCheckInSuccess.healthId}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Routing:</span>
                    <span className="font-medium text-teal-700 dark:text-teal-300 text-[11px]">{kioskCheckInSuccess.dept}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex-1 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1 transition"
                  >
                    <Printer size={12} /> Print
                  </button>
                  <button
                    type="button"
                    onClick={() => setKioskCheckInSuccess(null)}
                    className="flex-1 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold transition"
                  >
                    Next Check-In
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Method Switcher Tabs */}
                <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => setKioskMethod("id")}
                    className={`py-1 rounded font-medium transition flex items-center justify-center gap-1 text-[11px] ${
                      kioskMethod === "id"
                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    <Hash size={12} /> Health ID
                  </button>
                  <button
                    type="button"
                    onClick={() => setKioskMethod("qr")}
                    className={`py-1 rounded font-medium transition flex items-center justify-center gap-1 text-[11px] ${
                      kioskMethod === "qr"
                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    <Camera size={12} /> Camera QR
                  </button>
                </div>

                {kioskError && (
                  <div className="p-2 rounded bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-center gap-1.5">
                    <AlertTriangle size={12} /> {kioskError}
                  </div>
                )}

                {/* Mode 1: Health ID / Fast Keypad */}
                {kioskMethod === "id" && (
                  <div className="space-y-2.5">
                    <input
                      value={kioskIdInput}
                      onChange={(e) => setKioskIdInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleKioskCheckIn(kioskIdInput);
                      }}
                      placeholder="Enter Health ID (e.g. DMH-00123)"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 font-mono focus:border-teal-500 focus:outline-hidden"
                    />

                    <button
                      type="button"
                      onClick={() => handleKioskCheckIn(kioskIdInput)}
                      disabled={!kioskIdInput.trim() || kioskLoading}
                      className={`w-full py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 shadow-xs ${
                        !kioskIdInput.trim() || kioskLoading ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      <span>{kioskLoading ? "Checking In…" : "Check In & Dispense Ticket"}</span>
                      <ArrowRight size={12} />
                    </button>

                    {/* Quick Demo Test Presets - Compact Chips */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                        Quick Demo Presets:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {PATIENTS.slice(0, 4).map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleKioskCheckIn(p.healthId)}
                            className="px-2 py-1 text-[11px] rounded border border-slate-200 dark:border-slate-700 hover:border-teal-400 hover:bg-teal-50/50 dark:hover:bg-teal-950/20 text-slate-700 dark:text-slate-300 transition flex items-center gap-1"
                          >
                            <span className="font-medium">{p.name.split(" ")[0]}</span>
                            <span className="font-mono text-[10px] text-slate-400">({p.healthId})</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Mode 2: Live Camera QR Scanner */}
                {kioskMethod === "qr" && (
                  <div className="space-y-2">
                    <p className="text-[11px] text-slate-500 text-center">
                      Hold patient QR card in front of camera:
                    </p>
                    <div className="flex justify-center rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 p-1.5 bg-slate-900">
                      <QRScanner onScan={handleKioskQRScanned} autoStart={false} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Live OPD Queue Snapshot */}
            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <Clock size={12} className="text-teal-600" />
                <span className="text-[11px]">
                  Active: <strong className="text-slate-800 dark:text-slate-200">{queueData.length || 6} Waiting</strong>
                </span>
              </div>
              <Link
                href={"/nova/reception/queue" as any}
                className="text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-1 text-[11px]"
              >
                Queue Board →
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
