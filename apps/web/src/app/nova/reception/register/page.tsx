"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { trpc, queryClient } from "@/utils/trpc";
import { PageShell, Card, FormField, inputCls, btnPrimary, btnSecondary } from "@/components/nova/nova-ui";
import { AlertTriangle, CheckCircle, UserPlus } from "lucide-react";

export default function PatientRegistrationPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [form, setForm] = useState({ nameEn: "", nameAm: "", dob: "", sex: "M" as "M" | "F", phone: "", kebele: "", cbhiStatus: false });
  const [isEmergency, setIsEmergency] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "telebirr" | "cbe_birr" | "unpaid">("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [submitted, setSubmitted] = useState<{ healthId: string; ticket: string; name: string; receiptNumber?: string; paymentStatus: string; feeAmount: number } | null>(null);
  const [tab, setTab] = useState<"new" | "existing">("new");
  const [selectedExisting, setSelectedExisting] = useState<string | null>(null);

  const { data: tenant } = useQuery(trpc.tenant.get.queryOptions());
  const cardFeeAmount = isEmergency ? 100 : (tenant?.cardFeeAmount ?? 50);

  const searchResults = useQuery({
    ...trpc.patient.search.queryOptions({ query: searchQuery }),
    enabled: searchQuery.length > 1,
  });

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
    setSubmitted({
      healthId: patient.healthId,
      ticket: ticket.ticketNumber,
      name: patient.nameEn,
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
      receiptNumber,
      paymentStatus: ticket.paymentStatus,
      feeAmount: ticket.feeAmount,
    });
  };

  const isLoading = registerMutation.isPending || openVisitMutation.isPending;
  const mutationError = registerMutation.error?.message ?? openVisitMutation.error?.message;

  if (submitted) {
    return (
      <PageShell title="Patient Registration & Intake">
        <Card className="p-8 text-center max-w-lg mx-auto">
          <CheckCircle size={48} className="text-teal-500 mx-auto mb-4" />
          <h2 className="font-bold text-slate-800 text-lg mb-1">Patient Check-in Complete</h2>
          <p className="text-slate-600 font-medium mb-4">{submitted.name}</p>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6 space-y-3 text-sm text-left">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="text-slate-500">Health ID</span>
              <span className="font-mono font-bold text-slate-800">{submitted.healthId}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="text-slate-500">OPD Ticket</span>
              <span className="font-extrabold text-teal-700 text-xl font-mono">{submitted.ticket}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="text-slate-500">Registration / Card Fee</span>
              <span className="font-bold text-slate-800">ETB {submitted.feeAmount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Payment Status</span>
              {submitted.paymentStatus === "paid" && (
                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-semibold text-xs border border-emerald-300">
                  ✓ Paid (Receipt #{submitted.receiptNumber})
                </span>
              )}
              {submitted.paymentStatus === "cbhi_covered" && (
                <span className="px-2.5 py-0.5 bg-teal-100 text-teal-800 rounded-full font-semibold text-xs border border-teal-300">
                  🛡️ CBHI 100% Covered (0 ETB Co-pay)
                </span>
              )}
              {submitted.paymentStatus === "emergency_exempt" && (
                <span className="px-2.5 py-0.5 bg-red-100 text-red-800 rounded-full font-semibold text-xs border border-red-300">
                  🚨 Emergency Exempt (Care First)
                </span>
              )}
              {submitted.paymentStatus === "unpaid" && (
                <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-full font-semibold text-xs border border-amber-300">
                  ⚠️ Unpaid — Collect at Cashier
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-2 justify-center">
            <button onClick={() => router.push("/nova/reception/queue")} className={btnPrimary}>
              View queue board →
            </button>
            <button
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
              Register another
            </button>
          </div>
        </Card>
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
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            {searchResults.data && searchResults.data.length > 0 && (
              <div className="mt-3 space-y-2">
                {searchResults.data.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedExisting(p.id); setSearchQuery(p.nameEn); }}
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

          <button onClick={handleCheckInExisting} disabled={!selectedExisting || isLoading} className={`${btnPrimary} ${(!selectedExisting || isLoading) ? "opacity-50 cursor-not-allowed" : ""}`}>
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
                <input className={inputCls} value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} placeholder="09XX XXX XXX" />
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
            <button onClick={handleRegisterNew} disabled={!form.nameEn || !form.dob || isLoading} className={`${btnPrimary} ${(!form.nameEn || !form.dob || isLoading) ? "opacity-50 cursor-not-allowed" : ""}`}>
              {isLoading ? "Registering…" : `Register & issue ticket ${isEmergency ? "(Emergency)" : paymentMethod === "unpaid" ? "(Pay at Cashier)" : `(Collect ETB ${cardFeeAmount})`}`}
            </button>
            <button onClick={() => setForm({ nameEn: "", nameAm: "", dob: "", sex: "M", phone: "", kebele: "", cbhiStatus: false })} className={btnSecondary}>Clear</button>
          </div>
        </div>
      )}
    </PageShell>
  );
}
