"use client";
// ─── PATIENT REGISTRATION PAGE ────────────────────────────────────────────────
// Role: Receptionist
// Purpose: First screen in the OPD patient journey.
//   Tab 1 "New patient"      — Register a brand-new patient and open their first visit.
//   Tab 2 "Returning patient" — Find an existing patient and open a new visit for today.
//
// Workflow position:
//   [this page] → OPD Queue → Nurse Triage → Doctor → Billing
//
// New patient flow:
//   Fill form → select payment → Register & issue ticket
//   → patient.register() → visit.openVisit() → QR card + receipt shown
//
// Returning patient flow:
//   Search by name / Health ID / phone → select → select payment → Check in
//   → visit.openVisit() → receipt shown (no new patient record created)
//
// Duplicate prevention (P9):
//   When the nurse types a phone number in the New patient form, the system
//   runs a live trpc.patient.search() on that phone number. If a match is found,
//   a warning banner appears prompting the nurse to switch to "Returning patient"
//   instead of creating a duplicate record.
//
// Visit-already-open guard (P16):
//   Before checking in a returning patient, the system checks whether that patient
//   already has an open visit today. If yes, a warning is shown so the receptionist
//   does not create a second visit for the same episode.
// ──────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { trpc, queryClient } from "@/utils/trpc";
import { PageShell, Card, FormField, inputCls, btnPrimary, btnSecondary } from "@/components/nova/nova-ui";
import { AlertTriangle, CheckCircle, UserPlus } from "lucide-react";
import { PatientIDCardVisual } from "@/components/nova/patient-qr";

export default function PatientRegistrationPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery]     = useState("");
  const [form, setForm] = useState({
    nameEn: "", nameAm: "", dob: "", sex: "M" as "M" | "F",
    phone: "", kebele: "", cbhiStatus: false,
  });
  const [isEmergency, setIsEmergency]         = useState(false);
  const [paymentMethod, setPaymentMethod]     = useState<"cash" | "telebirr" | "cbe_birr" | "unpaid">("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [submitted, setSubmitted] = useState<{
    healthId: string; ticket: string; name: string; nameAm?: string;
    dob?: string; phone?: string; kebele?: string; cbhiStatus?: boolean;
    receiptNumber?: string; paymentStatus: string; feeAmount: number;
  } | null>(null);
  const [tab, setTab]                       = useState<"new" | "existing">("new");
  const [selectedExisting, setSelectedExisting] = useState<string | null>(null);
  // P16: when true, warn the receptionist before opening a second visit
  const [visitOpenWarningDismissed, setVisitOpenWarningDismissed] = useState(false);

  // Fetch tenant config to resolve card fee amount from tariff
  const { data: tenant }      = useQuery(trpc.tenant.get.queryOptions());
  const { data: regTariffs = [] } = useQuery(
    trpc.tariff.list.queryOptions({ category: "registration", activeOnly: true })
  );
  const generalTariff  = regTariffs.find((t) => t.code === "OPD_REG_GENERAL");
  const emergTariff    = regTariffs.find((t) => t.code === "OPD_REG_EMERGENCY");
  const cardFeeAmount  = isEmergency
    ? (emergTariff?.price ?? 100)
    : (generalTariff?.price ?? tenant?.cardFeeAmount ?? 50);

  // Returning patient search — runs when searchQuery has ≥ 2 characters
  const searchResults = useQuery({
    ...trpc.patient.search.queryOptions({ query: searchQuery }),
    enabled: searchQuery.length > 1,
  });

  // P9: Duplicate phone check — runs when phone field has ≥ 6 digits
  // Searches existing patients by phone to catch potential duplicates before
  // the nurse completes the new patient form.
  const phoneDuplicateCheck = useQuery({
    ...trpc.patient.search.queryOptions({ query: form.phone }),
    enabled: form.phone.replace(/\D/g, "").length >= 6,
  });
  // Only surface matches that share the same phone (not just name/ID partial hits)
  const phoneDuplicates = (phoneDuplicateCheck.data ?? []).filter(
    (p) => p.phone && p.phone.replace(/\D/g, "") === form.phone.replace(/\D/g, "")
  );

  // P16: Today's open visits for the selected returning patient
  // Used to warn the receptionist if a visit is already open today.
  const todayQueue = useQuery({
    ...trpc.visit.queue.queryOptions(),
    enabled: !!selectedExisting,
  });
  const selectedPatient  = searchResults.data?.find((p) => p.id === selectedExisting);
  const alreadyOpenToday = selectedExisting
    ? (todayQueue.data ?? []).some(
        (q) => q.visit.patient.id === selectedExisting && q.status !== "done"
      )
    : false;

  const registerMutation  = useMutation(trpc.patient.register.mutationOptions());
  const openVisitMutation = useMutation(trpc.visit.openVisit.mutationOptions());

  const handleRegisterNew = async () => {
    if (!form.nameEn || !form.dob) return;
    const patient = await registerMutation.mutateAsync(form);
    const { ticket, receiptNumber } = await openVisitMutation.mutateAsync({
      patientId:        patient.id,
      type:             isEmergency ? "emergency" : "opd",
      isEmergency,
      paymentMethod:    form.cbhiStatus ? "unpaid" : (isEmergency ? "unpaid" : paymentMethod),
      paymentReference,
    });
    await queryClient.invalidateQueries({ queryKey: trpc.visit.queue.queryKey() });
    setSubmitted({
      healthId:      patient.healthId,
      ticket:        ticket.ticketNumber,
      name:          patient.nameEn,
      nameAm:        patient.nameAm || form.nameAm,
      dob:           form.dob,
      phone:         form.phone,
      kebele:        form.kebele,
      cbhiStatus:    form.cbhiStatus,
      receiptNumber,
      paymentStatus: ticket.paymentStatus,
      feeAmount:     ticket.feeAmount,
    });
  };

  const handleCheckInExisting = async () => {
    if (!selectedExisting) return;
    const patient = searchResults.data?.find((p) => p.id === selectedExisting);
    if (!patient) return;
    const { ticket, receiptNumber } = await openVisitMutation.mutateAsync({
      patientId:     patient.id,
      type:          isEmergency ? "emergency" : "opd",
      isEmergency,
      paymentMethod: patient.cbhiStatus ? "unpaid" : (isEmergency ? "unpaid" : paymentMethod),
      paymentReference,
    });
    await queryClient.invalidateQueries({ queryKey: trpc.visit.queue.queryKey() });
    setSubmitted({
      healthId:      patient.healthId,
      ticket:        ticket.ticketNumber,
      name:          patient.nameEn,
      nameAm:        patient.nameAm || "",
      dob:           patient.dob,
      phone:         patient.phone || "",
      kebele:        patient.kebele || "",
      cbhiStatus:    patient.cbhiStatus,
      receiptNumber,
      paymentStatus: ticket.paymentStatus,
      feeAmount:     ticket.feeAmount,
    });
  };

  const isLoading     = registerMutation.isPending || openVisitMutation.isPending;
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
                  Registration Complete & Digital QR Card Generated
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
                    <span className="text-slate-400">Card & Intake Fee:</span>
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
                    {submitted.paymentStatus === "emergency_exempt" && (
                      <span className="px-2 py-0.5 bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 rounded font-semibold text-[11px]">
                        🚨 Emergency Exempt
                      </span>
                    )}
                    {submitted.paymentStatus === "unpaid" && (
                      <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 rounded font-semibold text-[11px]">
                        ⚠️ Unpaid — Central Cashier
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => router.push("/nova/reception/queue")}
                    className={btnPrimary}
                  >
                    Send to OPD Waiting Hall & View Queue Board →
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSubmitted(null);
                      setForm({ nameEn: "", nameAm: "", dob: "", sex: "M", phone: "", kebele: "", cbhiStatus: false });
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
    <PageShell title="Patient Registration" subtitle="Step 1 — Patient arrival">
      <div className="flex items-center gap-2 mb-5 text-xs text-slate-500">
        <span className="px-2 py-1 bg-teal-600 text-white rounded font-medium">1 Register</span>
        <span className="text-slate-300">→</span>
        <span className="px-2 py-1 bg-slate-100 rounded">2 Triage / Vitals</span>
        <span className="text-slate-300">→</span>
        <span className="px-2 py-1 bg-slate-100 rounded">3 Doctor</span>
        <span className="text-slate-300">→</span>
        <span className="px-2 py-1 bg-slate-100 rounded">4 Treatment</span>
        <span className="text-slate-300">→</span>
        <span className="px-2 py-1 bg-slate-100 rounded">5 Billing</span>
      </div>

      <div className="flex gap-1 mb-5">
        <button onClick={() => setTab("new")} className={`px-4 py-1.5 text-sm rounded flex items-center gap-1.5 ${tab === "new" ? "bg-teal-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-teal-400"}`}>
          <UserPlus size={14} /> New patient
        </button>
        <button onClick={() => setTab("existing")} className={`px-4 py-1.5 text-sm rounded ${tab === "existing" ? "bg-teal-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-teal-400"}`}>
          Returning patient
        </button>
      </div>

      {tab === "existing" && (
        <div className="max-w-2xl space-y-4">
          <Card className="p-5">
            <h3 className="font-semibold text-slate-800 mb-3">Search patient</h3>
            <input
              className={inputCls}
              placeholder="Name, Health ID, or phone number…"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSelectedExisting(null); setVisitOpenWarningDismissed(false); }}
              autoFocus
            />
            {searchResults.data && searchResults.data.length > 0 && (
              <div className="mt-3 space-y-2">
                {searchResults.data.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedExisting(p.id); setSearchQuery(p.nameEn); setVisitOpenWarningDismissed(false); }}
                    className={`w-full text-left p-3 rounded-lg border text-sm transition-colors ${selectedExisting === p.id ? "border-teal-400 bg-teal-50" : "border-slate-200 hover:border-teal-300"}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-slate-800">{p.nameEn}</span>
                        {p.nameAm && <span className="text-slate-400 ml-2">{p.nameAm}</span>}
                      </div>
                      <span className="font-mono text-xs text-slate-500">{p.healthId}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      DOB: {p.dob} · {p.sex === "M" ? "Male" : "Female"} · {p.cbhiStatus ? "✓ CBHI" : "Self-pay"}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {searchQuery.length > 1 && searchResults.data?.length === 0 && (
              <div className="mt-3 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-3">
                <AlertTriangle size={14} />
                No patients found — switch to "New patient" to register
              </div>
            )}
          </Card>

          {/* P16: Visit-already-open guard */}
          {selectedExisting && alreadyOpenToday && !visitOpenWarningDismissed && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-900">
                    ⚠ This patient already has an open visit today
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    <strong>{selectedPatient?.nameEn}</strong> is currently active in the OPD queue.
                    Opening a second visit may create duplicate charges and split the clinical record.
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    Only continue if this is a genuinely separate clinical episode (e.g. emergency re-attendance).
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => setVisitOpenWarningDismissed(true)}
                      className="text-xs px-3 py-1.5 bg-amber-600 text-white rounded hover:bg-amber-700 font-medium"
                    >
                      Yes, open a new visit anyway
                    </button>
                    <button
                      onClick={() => { setSelectedExisting(null); setSearchQuery(""); }}
                      className="text-xs px-3 py-1.5 bg-white border border-amber-300 text-amber-700 rounded hover:bg-amber-50"
                    >
                      Cancel — go to OPD queue instead
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Card Fee & Payment for Returning Patient */}
          {selectedExisting && (
            <Card className="p-5 border-teal-200 bg-teal-50/30">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-800">Card Fee & Payment</h3>
                <span className="text-xs px-2 py-0.5 bg-teal-100 text-teal-800 rounded font-medium">Standard Tariff: ETB {cardFeeAmount}</span>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 p-2.5 rounded bg-red-50 border border-red-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isEmergency}
                    onChange={(e) => setIsEmergency(e.target.checked)}
                    className="accent-red-600 w-4 h-4"
                  />
                  <span className="text-sm font-medium text-red-800">🚨 Emergency Case (Bypass payment gate directly to Urgent Triage)</span>
                </label>

                {searchResults.data?.find((p) => p.id === selectedExisting)?.cbhiStatus ? (
                  <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg text-sm text-teal-800 flex items-center justify-between">
                    <span>🛡️ Patient is enrolled in <strong>CBHI</strong>.</span>
                    <span className="font-bold text-xs bg-teal-600 text-white px-2 py-1 rounded">100% COVERED (0 ETB)</span>
                  </div>
                ) : isEmergency ? (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                    🚨 Emergency fee (ETB {cardFeeAmount}) will be reconciled post-stabilization. Patient admitted directly.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-600">Select payment method collected at reception desk:</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      {(["cash", "telebirr", "cbe_birr", "unpaid"] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setPaymentMethod(m)}
                          className={`p-2.5 rounded-lg border font-medium text-center transition-all ${
                            paymentMethod === m
                              ? "bg-teal-600 text-white border-teal-600 shadow-sm"
                              : "bg-white text-slate-700 border-slate-200 hover:border-teal-400"
                          }`}
                        >
                          {m === "cash" && "💵 Cash"}
                          {m === "telebirr" && "📱 Telebirr"}
                          {m === "cbe_birr" && "🏦 CBE Birr"}
                          {m === "unpaid" && "⏳ Central Cashier"}
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
            disabled={!selectedExisting || isLoading || (alreadyOpenToday && !visitOpenWarningDismissed)}
            className={`${btnPrimary} ${(!selectedExisting || isLoading || (alreadyOpenToday && !visitOpenWarningDismissed)) ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {isLoading ? "Processing…" : `Check in & issue ticket ${isEmergency ? "(Emergency)" : paymentMethod === "unpaid" ? "(Pay at Cashier)" : `(Collect ETB ${cardFeeAmount})`}`}
          </button>
        </div>
      )}

      {tab === "new" && (
        <div className="max-w-2xl space-y-5">
          {mutationError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertTriangle size={14} /> {mutationError}
            </div>
          )}
          <Card className="p-5">
            <h3 className="font-semibold text-slate-800 mb-4">Personal information</h3>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Full name (English) *">
                <input className={inputCls} value={form.nameEn} onChange={(e) => setForm((p) => ({ ...p, nameEn: e.target.value }))} placeholder="Abebe Kebede" />
              </FormField>
              <FormField label="Full name (Amharic)">
                <input className={inputCls} value={form.nameAm} onChange={(e) => setForm((p) => ({ ...p, nameAm: e.target.value }))} placeholder="አበበ ከበደ" />
              </FormField>
              <FormField label="Date of birth *">
                <input type="date" className={inputCls} value={form.dob} onChange={(e) => setForm((p) => ({ ...p, dob: e.target.value }))} />
              </FormField>
              <FormField label="Sex">
                <select className={inputCls} value={form.sex} onChange={(e) => setForm((p) => ({ ...p, sex: e.target.value as "M" | "F" }))}>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                </select>
              </FormField>
              <FormField label="Phone number">
                <input
                  className={inputCls}
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="09XX XXX XXX"
                />
                {/* P9: Duplicate phone warning — fires when ≥6 digits entered */}
                {phoneDuplicates.length > 0 && (
                  <div className="mt-2 p-3 bg-amber-50 border border-amber-300 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-amber-900">
                          Possible duplicate — patient with this phone already exists
                        </p>
                        {phoneDuplicates.map((p) => (
                          <p key={p.id} className="text-xs text-amber-700 mt-1">
                            <strong>{p.nameEn}</strong>
                            {p.nameAm ? ` / ${p.nameAm}` : ""} · {p.healthId} · DOB {p.dob}
                          </p>
                        ))}
                        <button
                          type="button"
                          onClick={() => setTab("existing")}
                          className="mt-2 text-xs px-3 py-1 bg-amber-600 text-white rounded hover:bg-amber-700 font-medium"
                        >
                          Switch to Returning patient tab →
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </FormField>
              <FormField label="Kebele">
                <input className={inputCls} value={form.kebele} onChange={(e) => setForm((p) => ({ ...p, kebele: e.target.value }))} placeholder="Kebele 03" />
              </FormField>
            </div>
          </Card>
          <Card className="p-5">
            <h3 className="font-semibold text-slate-800 mb-3">Insurance</h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="accent-teal-600 w-4 h-4" checked={form.cbhiStatus} onChange={(e) => setForm((p) => ({ ...p, cbhiStatus: e.target.checked }))} />
              <span className="text-sm text-slate-700">CBHI member (Community-Based Health Insurance)</span>
            </label>
          </Card>

          {/* Card Fee & Payment for New Patient */}
          <Card className="p-5 border-teal-200 bg-teal-50/30">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-800">Card Fee & Payment</h3>
              <span className="text-xs px-2 py-0.5 bg-teal-100 text-teal-800 rounded font-medium">Standard Tariff: ETB {cardFeeAmount}</span>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2 p-2.5 rounded bg-red-50 border border-red-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isEmergency}
                  onChange={(e) => setIsEmergency(e.target.checked)}
                  className="accent-red-600 w-4 h-4"
                />
                <span className="text-sm font-medium text-red-800">🚨 Emergency Case (Bypass payment gate directly to Urgent Triage)</span>
              </label>

              {form.cbhiStatus ? (
                <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg text-sm text-teal-800 flex items-center justify-between">
                  <span>🛡️ Patient marked as <strong>CBHI Member</strong>.</span>
                  <span className="font-bold text-xs bg-teal-600 text-white px-2 py-1 rounded">100% COVERED (0 ETB)</span>
                </div>
              ) : isEmergency ? (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                  🚨 Emergency fee (ETB {cardFeeAmount}) will be reconciled post-stabilization. Patient enters triage immediately.
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-600">Select payment method collected at reception desk:</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    {(["cash", "telebirr", "cbe_birr", "unpaid"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPaymentMethod(m)}
                        className={`p-2.5 rounded-lg border font-medium text-center transition-all ${
                          paymentMethod === m
                            ? "bg-teal-600 text-white border-teal-600 shadow-sm"
                            : "bg-white text-slate-700 border-slate-200 hover:border-teal-400"
                        }`}
                      >
                        {m === "cash" && "💵 Cash"}
                        {m === "telebirr" && "📱 Telebirr"}
                        {m === "cbe_birr" && "🏦 CBE Birr"}
                        {m === "unpaid" && "⏳ Central Cashier"}
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
              disabled={!form.nameEn || !form.dob || isLoading || phoneDuplicates.length > 0}
              className={`${btnPrimary} ${(!form.nameEn || !form.dob || isLoading || phoneDuplicates.length > 0) ? "opacity-50 cursor-not-allowed" : ""}`}
              title={phoneDuplicates.length > 0 ? "Duplicate phone found — use Returning patient tab" : undefined}
            >
              {isLoading ? "Registering…" : `Register & issue ticket ${isEmergency ? "(Emergency)" : paymentMethod === "unpaid" ? "(Pay at Cashier)" : `(Collect ETB ${cardFeeAmount})`}`}
            </button>
            <button
              onClick={() => setForm({ nameEn: "", nameAm: "", dob: "", sex: "M", phone: "", kebele: "", cbhiStatus: false })}
              className={btnSecondary}
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </PageShell>
  );
}
