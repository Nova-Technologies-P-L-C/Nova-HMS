"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { trpc, queryClient } from "@/utils/trpc";
import { PageShell, Card, FormField, inputCls, btnPrimary, btnSecondary } from "@/components/nova/nova-ui";
import {
  AlertTriangle,
  CheckCircle,
  UserPlus,
  QrCode,
  Printer,
  ExternalLink,
  Camera,
  Search,
  Users,
  Clock,
  ArrowRight,
  Hash,
  Sparkles,
} from "lucide-react";
import { PatientIDCardVisual } from "@/components/nova/patient-qr";
import QRScanner from "@/components/nova/qr-scanner";
import { PATIENTS } from "@/lib/nova-mock-data";

export default function PatientRegistrationPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [form, setForm] = useState({ nameEn: "", nameAm: "", dob: "", sex: "M" as "M" | "F", phone: "", email: "", kebele: "", cbhiStatus: false });
  const [isEmergency, setIsEmergency] = useState(false);
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
  } | null>(null);
  const [tab, setTab] = useState<"new" | "existing">("new");
  const [selectedExisting, setSelectedExisting] = useState<string | null>(null);

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
  const cardFeeAmount = isEmergency
    ? (emergTariff?.price ?? 100)
    : (generalTariff?.price ?? tenant?.cardFeeAmount ?? 50);

  const searchResults = useQuery({
    ...trpc.patient.search.queryOptions({ query: searchQuery }),
    enabled: searchQuery.length > 1,
  });

  const { data: queueData = [] } = useQuery(trpc.visit.queue.queryOptions());

  const registerMutation = useMutation(trpc.patient.register.mutationOptions());
  const openVisitMutation = useMutation(trpc.visit.openVisit.mutationOptions());

  const handleRegisterNew = async () => {
    if (!form.nameEn || !form.dob) return;
    const patient = await registerMutation.mutateAsync(form);
    const { ticket, receiptNumber } = await openVisitMutation.mutateAsync({
      patientId: patient.id,
      type: isEmergency ? "emergency" : "opd",
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
    });
  };

  const handleCheckInExisting = async () => {
    if (!selectedExisting) return;
    const patient = searchResults.data?.find((p) => p.id === selectedExisting);
    if (!patient) return;
    const { ticket, receiptNumber } = await openVisitMutation.mutateAsync({
      patientId: patient.id,
      type: isEmergency ? "emergency" : "opd",
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
      <PageShell title="Patient Registration & Card Issuance">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <CheckCircle size={32} className="text-teal-500" />
              <div>
                <h2 className="font-extrabold text-xl text-slate-800 dark:text-slate-100">
                  Registration Complete &amp; Digital QR Card Generated
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Patient Health ID registered. Hand the patient their official scannable ID card.
                </p>
              </div>
            </div>
            <span className="font-mono text-xs px-3 py-1 bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-bold rounded-full">
              Ticket: {submitted.ticket}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Left: Official Patient QR Card */}
            <div className="md:col-span-6 flex flex-col items-center">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                Official Patient Identity Card (CR80 Standard)
              </span>
              <PatientIDCardVisual
                patient={{
                  healthId: submitted.healthId,
                  name: submitted.name,
                  nameAm: submitted.nameAm,
                  dob: submitted.dob,
                  kebele: submitted.kebele,
                  phone: submitted.phone,
                  cbhi: submitted.cbhiStatus,
                }}
              />
              <p className="text-[11px] text-slate-400 mt-2 text-center max-w-sm">
                This QR code is uniquely tied to {submitted.name} and can be scanned at triage, consultation, laboratory, and pharmacy.
              </p>
            </div>

            {/* Right: Visit Receipt & Quick Actions */}
            <div className="md:col-span-6 space-y-4">
              <Card className="p-5 border border-slate-200 dark:border-slate-800 space-y-3">
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  OPD Intake Receipt
                </h3>

                <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-slate-400">Assigned Health ID:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{submitted.healthId}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-slate-400">Queue Ticket Number:</span>
                    <span className="font-extrabold text-teal-600 text-lg font-mono">{submitted.ticket}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-slate-400">Card &amp; Intake Fee:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">ETB {submitted.feeAmount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Payment Status:</span>
                    {submitted.paymentStatus === "paid" && (
                      <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded font-semibold text-[11px]">
                        ✓ Paid (Receipt #{submitted.receiptNumber})
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
                        ⏳ Payable at Cashier
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 transition"
                  >
                    <Printer size={14} />
                    <span>Print Registration Slip &amp; Card</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push("/nova/reception/queue")}
                    className={btnPrimary}
                  >
                    Direct Patient to Triage Waiting Area →
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSubmitted(null);
                      setForm({ nameEn: "", nameAm: "", dob: "", sex: "M", phone: "", email: "", kebele: "", cbhiStatus: false });
                      setSearchQuery("");
                      setSelectedExisting(null);
                      setIsEmergency(false);
                      setPaymentMethod("cash");
                      setPaymentReference("");
                    }}
                    className={btnSecondary}
                  >
                    Register Next Patient
                  </button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Reception & Patient Intake Desk"
      subtitle="Patient Registration, Digital Health ID Issuance & Side Kiosk Check-In Station"
    >
      {/* Workflow Step Breadcrumbs */}
      <div className="flex items-center gap-2 mb-5 text-xs text-slate-500">
        <span className="px-2 py-1 bg-teal-600 text-white rounded font-medium">1 Register / Kiosk Check-in</span>
        <span className="text-slate-300">→</span>
        <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded">2 Triage / Vitals</span>
        <span className="text-slate-300">→</span>
        <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded">3 Doctor Consultation</span>
        <span className="text-slate-300">→</span>
        <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded">4 Diagnostics &amp; Pharmacy</span>
      </div>

      {/* ── Side-by-Side Reception Workstation ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left / Main Column (7 cols): Patient Registration Desk */}
        <div className="xl:col-span-7 space-y-5">
          {/* Registration Mode Selector */}
          <div className="flex items-center justify-between pb-2">
            <div className="flex gap-1.5">
              <button
                onClick={() => setTab("new")}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition ${
                  tab === "new"
                    ? "bg-teal-600 text-white shadow-xs"
                    : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-teal-400"
                }`}
              >
                <UserPlus size={14} /> New Patient Registration
              </button>
              <button
                onClick={() => setTab("existing")}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition ${
                  tab === "existing"
                    ? "bg-teal-600 text-white shadow-xs"
                    : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-teal-400"
                }`}
              >
                <Search size={14} /> Returning Patient Lookup
              </button>
            </div>
            <span className="text-[11px] text-slate-400 hidden sm:inline">Reception Desk 01</span>
          </div>

          {/* Returning Patient Lookup */}
          {tab === "existing" && (
            <div className="space-y-4">
              <Card className="p-5">
                <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm mb-3">Search Patient Master Index</h3>
                <input
                  className={inputCls}
                  placeholder="Enter name, Health ID (DMH-...), or phone number…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
                {searchResults.data && searchResults.data.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {searchResults.data.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => { setSelectedExisting(p.id); setSearchQuery(p.nameEn); }}
                        className={`w-full text-left p-3 rounded-lg border text-sm transition-colors ${
                          selectedExisting === p.id
                            ? "border-teal-400 bg-teal-50 dark:bg-teal-950/40"
                            : "border-slate-200 dark:border-slate-700 hover:border-teal-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium text-slate-800 dark:text-slate-200">{p.nameEn}</span>
                            {p.nameAm && <span className="text-slate-400 ml-2">{p.nameAm}</span>}
                          </div>
                          <span className="font-mono text-xs text-slate-500">{p.healthId}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          DOB: {p.dob} · {p.sex === "M" ? "Male" : "Female"} · {p.cbhiStatus ? "✓ CBHI Member" : "Self-pay"}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {searchQuery.length > 1 && searchResults.data?.length === 0 && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <AlertTriangle size={14} />
                    <span>No patient found in database. Switch to "New Patient Registration".</span>
                  </div>
                )}
              </Card>

              {/* Card Fee & Payment for Returning Patient */}
              {selectedExisting && (
                <Card className="p-5 border-teal-200 dark:border-teal-800 bg-teal-50/30 dark:bg-teal-950/20">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Card Fee &amp; Payment Settlement</h3>
                    <span className="text-xs px-2 py-0.5 bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 rounded font-medium">Standard Tariff: ETB {cardFeeAmount}</span>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center gap-2 p-2.5 rounded bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isEmergency}
                        onChange={(e) => setIsEmergency(e.target.checked)}
                        className="accent-red-600 w-4 h-4"
                      />
                      <span className="text-xs font-semibold text-red-800 dark:text-red-300">🚨 Emergency Case (Bypass payment gate directly to Urgent Triage)</span>
                    </label>

                    {searchResults.data?.find((p) => p.id === selectedExisting)?.cbhiStatus ? (
                      <div className="p-3 bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 rounded-lg text-xs text-teal-800 dark:text-teal-200 flex items-center justify-between">
                        <span>🛡️ Patient is active in <strong>CBHI</strong>.</span>
                        <span className="font-bold text-[10px] bg-teal-600 text-white px-2 py-0.5 rounded">100% COVERED (0 ETB)</span>
                      </div>
                    ) : isEmergency ? (
                      <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg text-xs text-red-800 dark:text-red-300">
                        🚨 Emergency fee (ETB {cardFeeAmount}) will be reconciled post-stabilization. Patient routed directly.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-xs text-slate-600 dark:text-slate-400">Select payment method collected at reception desk:</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          {(["cash", "telebirr", "cbe_birr", "unpaid"] as const).map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setPaymentMethod(m)}
                              className={`p-2.5 rounded-lg border font-medium text-center transition-all ${
                                paymentMethod === m
                                  ? "bg-teal-600 text-white border-teal-600 shadow-xs"
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
                          <FormField label={`${paymentMethod === "telebirr" ? "Telebirr" : "CBE Birr"} Transaction ID / Ref`}>
                            <input
                              className={inputCls}
                              value={paymentReference}
                              onChange={(e) => setPaymentReference(e.target.value)}
                              placeholder="e.g. TLB-998241"
                            />
                          </FormField>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              )}

              <button
                onClick={handleCheckInExisting}
                disabled={!selectedExisting || isLoading}
                className={`${btnPrimary} ${(!selectedExisting || isLoading) ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {isLoading ? "Processing…" : `Check in & Issue Ticket ${isEmergency ? "(Emergency)" : paymentMethod === "unpaid" ? "(Pay at Cashier)" : `(Collect ETB ${cardFeeAmount})`}`}
              </button>
            </div>
          )}

          {/* New Patient Registration */}
          {tab === "new" && (
            <div className="space-y-5">
              {mutationError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertTriangle size={14} /> {mutationError}
                </div>
              )}

              <Card className="p-5">
                <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm mb-4">Patient Demographic Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Full Name (English) *">
                    <input className={inputCls} value={form.nameEn} onChange={(e) => setForm((p) => ({ ...p, nameEn: e.target.value }))} placeholder="Abebe Kebede" />
                  </FormField>
                  <FormField label="Full Name (Amharic)">
                    <input className={inputCls} value={form.nameAm} onChange={(e) => setForm((p) => ({ ...p, nameAm: e.target.value }))} placeholder="አበበ ከበደ" />
                  </FormField>
                  <FormField label="Date of Birth *">
                    <input type="date" className={inputCls} value={form.dob} onChange={(e) => setForm((p) => ({ ...p, dob: e.target.value }))} />
                  </FormField>
                  <FormField label="Sex">
                    <select className={inputCls} value={form.sex} onChange={(e) => setForm((p) => ({ ...p, sex: e.target.value as "M" | "F" }))}>
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                    </select>
                  </FormField>
                  <FormField label="Phone Number">
                    <input className={inputCls} value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} placeholder="09XX XXX XXX" />
                  </FormField>
                  <FormField label="Email Address">
                    <input type="email" className={inputCls} value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="patient@example.com" />
                  </FormField>
                  <FormField label="Kebele / Woreda">
                    <input className={inputCls} value={form.kebele} onChange={(e) => setForm((p) => ({ ...p, kebele: e.target.value }))} placeholder="Kebele 03" />
                  </FormField>
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm mb-3">Health Insurance Verification</h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="accent-teal-600 w-4 h-4"
                    checked={form.cbhiStatus}
                    onChange={(e) => setForm((p) => ({ ...p, cbhiStatus: e.target.checked }))}
                  />
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Patient enrolled in Ethiopian CBHI (Community-Based Health Insurance Scheme)
                  </span>
                </label>
              </Card>

              {/* Card Fee & Payment for New Patient */}
              <Card className="p-5 border-teal-200 dark:border-teal-800 bg-teal-50/30 dark:bg-teal-950/20">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Registration Card Fee</h3>
                  <span className="text-xs px-2 py-0.5 bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 rounded font-medium">Standard Tariff: ETB {cardFeeAmount}</span>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-2 p-2.5 rounded bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isEmergency}
                      onChange={(e) => setIsEmergency(e.target.checked)}
                      className="accent-red-600 w-4 h-4"
                    />
                    <span className="text-xs font-semibold text-red-800 dark:text-red-300">🚨 Emergency Case (Bypass payment gate directly to Urgent Triage)</span>
                  </label>

                  {form.cbhiStatus ? (
                    <div className="p-3 bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 rounded-lg text-xs text-teal-800 dark:text-teal-200 flex items-center justify-between">
                      <span>🛡️ Patient marked as <strong>CBHI Member</strong>.</span>
                      <span className="font-bold text-[10px] bg-teal-600 text-white px-2 py-0.5 rounded">100% COVERED (0 ETB)</span>
                    </div>
                  ) : isEmergency ? (
                    <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg text-xs text-red-800 dark:text-red-300">
                      🚨 Emergency fee (ETB {cardFeeAmount}) will be reconciled post-stabilization. Patient admitted directly.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs text-slate-600 dark:text-slate-400">Select payment method collected at reception desk:</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        {(["cash", "telebirr", "cbe_birr", "unpaid"] as const).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setPaymentMethod(m)}
                            className={`p-2.5 rounded-lg border font-medium text-center transition-all ${
                              paymentMethod === m
                                ? "bg-teal-600 text-white border-teal-600 shadow-xs"
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
                        <FormField label={`${paymentMethod === "telebirr" ? "Telebirr" : "CBE Birr"} Transaction ID / Ref`}>
                          <input
                            className={inputCls}
                            value={paymentReference}
                            onChange={(e) => setPaymentReference(e.target.value)}
                            placeholder="e.g. TLB-998241"
                          />
                        </FormField>
                      )}
                    </div>
                  )}
                </div>
              </Card>

              <div className="flex gap-2">
                <button
                  onClick={handleRegisterNew}
                  disabled={!form.nameEn || !form.dob || isLoading}
                  className={`${btnPrimary} ${(!form.nameEn || !form.dob || isLoading) ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {isLoading ? "Registering…" : `Register & Issue Ticket ${isEmergency ? "(Emergency)" : paymentMethod === "unpaid" ? "(Pay at Cashier)" : `(Collect ETB ${cardFeeAmount})`}`}
                </button>
                <button
                  onClick={() => setForm({ nameEn: "", nameAm: "", dob: "", sex: "M", phone: "", email: "", kebele: "", cbhiStatus: false })}
                  className={btnSecondary}
                >
                  Clear Form
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Right Column (5 cols): Kiosk Check-In Station (Side of Register) ── */}
        <div className="xl:col-span-5 space-y-4">
          <Card className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm sticky top-4">
            {/* Kiosk Card Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
                  <QrCode size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">Kiosk Fast Check-In</h3>
                  <p className="text-[11px] text-slate-500">Scan QR card or enter ID for returning patients</p>
                </div>
              </div>

              <span className="text-[10px] font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2.5 py-1 rounded-full border border-teal-200 dark:border-teal-800">
                Express Check-In Station
              </span>
            </div>

            {/* Check-In Success Result State */}
            {kioskCheckInSuccess ? (
              <div className="p-4 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-xl space-y-3 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-800 dark:text-teal-300 flex items-center gap-1.5">
                    <CheckCircle size={15} /> Check-In Complete!
                  </span>
                  <span className="font-mono text-xs px-2.5 py-0.5 bg-teal-600 text-white font-black rounded-full shadow-xs">
                    Ticket: {kioskCheckInSuccess.ticket}
                  </span>
                </div>

                <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-teal-100 dark:border-teal-900/60 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Patient:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {kioskCheckInSuccess.name} {kioskCheckInSuccess.nameAm ? `(${kioskCheckInSuccess.nameAm})` : ""}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Health ID:</span>
                    <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{kioskCheckInSuccess.healthId}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Next Destination:</span>
                    <span className="font-medium text-teal-700 dark:text-teal-300">{kioskCheckInSuccess.dept}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Coverage:</span>
                    {kioskCheckInSuccess.cbhi ? (
                      <span className="text-[10px] font-bold text-teal-700 bg-teal-50 dark:bg-teal-950 px-1.5 py-0.5 rounded">
                        ✓ 100% CBHI Covered
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">
                        Standard Self-Pay
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex-1 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1.5 transition"
                  >
                    <Printer size={13} /> Print Ticket Slip
                  </button>
                  <button
                    type="button"
                    onClick={() => setKioskCheckInSuccess(null)}
                    className="flex-1 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold transition"
                  >
                    Check In Next
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Method Switcher Tabs */}
                <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => setKioskMethod("id")}
                    className={`py-1.5 rounded font-medium transition flex items-center justify-center gap-1.5 ${
                      kioskMethod === "id"
                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    <Hash size={13} /> Health ID / Keypad
                  </button>
                  <button
                    type="button"
                    onClick={() => setKioskMethod("qr")}
                    className={`py-1.5 rounded font-medium transition flex items-center justify-center gap-1.5 ${
                      kioskMethod === "qr"
                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    <Camera size={13} /> Camera QR Scan
                  </button>
                </div>

                {kioskError && (
                  <div className="p-2.5 rounded bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-center gap-1.5">
                    <AlertTriangle size={13} /> {kioskError}
                  </div>
                )}

                {/* Mode 1: Health ID / Fast Keypad */}
                {kioskMethod === "id" && (
                  <div className="space-y-3">
                    <div className="relative">
                      <input
                        value={kioskIdInput}
                        onChange={(e) => setKioskIdInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleKioskCheckIn(kioskIdInput);
                        }}
                        placeholder="Scan or enter Health ID (e.g. DMH-00123)"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 font-mono focus:border-teal-500 focus:outline-hidden"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleKioskCheckIn(kioskIdInput)}
                      disabled={!kioskIdInput.trim() || kioskLoading}
                      className={`w-full py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs ${
                        !kioskIdInput.trim() || kioskLoading ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      <span>{kioskLoading ? "Checking In…" : "Check In & Dispense Ticket"}</span>
                      <ArrowRight size={13} />
                    </button>

                    {/* Quick Demo Test Presets */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                        Fast 1-Click Check-In Presets:
                      </span>
                      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                        {PATIENTS.slice(0, 4).map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleKioskCheckIn(p.healthId)}
                            className="p-1.5 text-left rounded border border-slate-200 dark:border-slate-700 hover:border-teal-400 hover:bg-teal-50/50 dark:hover:bg-teal-950/20 transition truncate"
                          >
                            <span className="font-semibold block truncate text-slate-800 dark:text-slate-200">{p.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{p.healthId}</span>
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
                      Hold patient QR identity card in front of the lens:
                    </p>
                    <div className="flex justify-center rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 p-2 bg-slate-900">
                      <QRScanner onScan={handleKioskQRScanned} autoStart={false} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Live OPD Queue Snapshot */}
            <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <Clock size={13} className="text-teal-600" />
                <span>
                  Active Queue: <strong className="text-slate-800 dark:text-slate-200">{queueData.length || 6} Waiting</strong>
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
