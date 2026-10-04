"use client";
import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { PageShell, Card, FormField, inputCls, btnPrimary, btnSecondary, StatusBadge } from "@/components/nova/nova-ui";
import { CheckCircle, Bed, UserCheck, CreditCard, ShieldCheck, Clock, ArrowRight } from "lucide-react";

export default function AdmissionsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"admit" | "active" | "discharge">("active");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedBedId, setSelectedBedId] = useState("");
  const [selectedNurseId, setSelectedNurseId] = useState("");
  const [selectedTariffCode, setSelectedTariffCode] = useState("BED_GEN_WARD");
  const [selectedAdmissionId, setSelectedAdmissionId] = useState("");
  const [dischargeCondition, setDischargeCondition] = useState("Improved");
  const [admitSuccess, setAdmitSuccess] = useState(false);

  const { data: beds = [] } = useQuery({ ...trpc.ward.beds.queryOptions(), refetchOnMount: true });
  const { data: admissions = [] } = useQuery({ ...trpc.ward.admissions.queryOptions(), refetchOnMount: true });
  const { data: nurses = [] } = useQuery({ ...trpc.ward.nurses.queryOptions(), refetchOnMount: true });
  const { data: queue = [] } = useQuery(trpc.visit.queue.queryOptions());
  const { data: tariffs = [] } = useQuery(trpc.tariff.list.queryOptions({ category: "inpatient", activeOnly: true }));

  const availableBeds = beds.filter((b) => b.status === "available");
  const queuePatients = queue.filter((q) => q.status !== "done");

  const selectedBed = beds.find((b) => b.id === selectedBedId);
  const selectedNurse = nurses.find((n) => n.id === selectedNurseId);
  const selectedTariff = tariffs.find((t) => t.code === selectedTariffCode);
  const nursingTariff = tariffs.find((t) => t.code === "CARE_NURSING_DAILY") ?? { price: 70 };

  const currentBedPrice = selectedTariff?.price ?? selectedBed?.dailyRate ?? 120;
  const currentNursingPrice = nursingTariff?.price ?? 70;

  const admit = useMutation(
    trpc.ward.admit.mutationOptions({
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: trpc.ward.beds.queryKey() });
        qc.invalidateQueries({ queryKey: trpc.ward.admissions.queryKey() });
        setAdmitSuccess(true);
        setSelectedPatientId("");
        setSelectedBedId("");
        setSelectedNurseId("");
      },
    })
  );

  const discharge = useMutation(
    trpc.ward.discharge.mutationOptions({
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: trpc.ward.beds.queryKey() });
        qc.invalidateQueries({ queryKey: trpc.ward.admissions.queryKey() });
        setSelectedAdmissionId("");
        setTab("active");
      },
    })
  );

  const assignNurseMutation = useMutation(
    trpc.ward.assignNurse.mutationOptions({
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: trpc.ward.admissions.queryKey() });
      },
    })
  );

  const selectedAdmissionToDischarge = admissions.find((a) => a.id === selectedAdmissionId);

  return (
    <PageShell
      title="Inpatient Ward & Admissions"
      subtitle="Bed allocation, duty nurse assignment & live inpatient care billing"
    >
      <div className="flex gap-2 mb-5">
        {(["active", "admit", "discharge"] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setAdmitSuccess(false);
            }}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              tab === t
                ? "bg-teal-600 text-white shadow-sm"
                : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-teal-500"
            }`}
          >
            {t === "active"
              ? `Active Admissions (${admissions.length})`
              : t === "admit"
              ? "+ Admit Patient"
              : "Discharge & Clearance"}
          </button>
        ))}
      </div>

      {/* Active Admissions Tab */}
      {tab === "active" && (
        <div className="space-y-4">
          {admissions.length === 0 && (
            <Card className="p-12 text-center">
              <Bed size={36} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium text-sm">No active inpatient admissions currently.</p>
              <button onClick={() => setTab("admit")} className={`mt-3 ${btnPrimary}`}>
                + Admit First Patient
              </button>
            </Card>
          )}

          {admissions.map((a) => (
            <Card key={a.id} className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-l-4 border-l-teal-500">
              <div className="flex items-start sm:items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 flex flex-col items-center justify-center shrink-0">
                  <p className="text-[10px] uppercase font-bold text-teal-600 dark:text-teal-400 leading-none">{a.bed.ward}</p>
                  <p className="font-extrabold text-base text-slate-800 dark:text-slate-100 font-mono mt-0.5">#{a.bed.room}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-base text-slate-800 dark:text-slate-100">{a.patient.nameEn}</p>
                    {a.patient.cbhiStatus && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
                        <ShieldCheck size={11} /> CBHI
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    MRN: <span className="font-mono font-medium">{a.patient.healthId}</span> · Admitted {new Date(a.admittedAt).toLocaleDateString()} ({a.daysElapsed} {a.daysElapsed === 1 ? "day" : "days"} stayed)
                  </p>
                  
                  {/* Nurse Assignment Badge */}
                  <div className="flex items-center gap-1.5 mt-2 text-xs">
                    <UserCheck size={14} className="text-teal-600 dark:text-teal-400" />
                    <span className="text-slate-500">Duty Nurse:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {a.assignedNurseName || "Not Assigned"}
                    </span>
                    <select
                      className="ml-2 text-[11px] py-0.5 px-1.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                      value={a.assignedNurseId || ""}
                      onChange={(e) => {
                        const nurse = nurses.find((n) => n.id === e.target.value);
                        if (nurse) {
                          assignNurseMutation.mutate({
                            admissionId: a.id,
                            assignedNurseId: nurse.id,
                            assignedNurseName: nurse.name,
                          });
                        }
                      }}
                    >
                      <option value="">Reassign nurse…</option>
                      {nurses.map((n) => (
                        <option key={n.id} value={n.id}>{n.name} ({n.title || n.role})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Accrued Charges & Actions */}
              <div className="flex flex-wrap md:flex-col items-end gap-2 shrink-0 w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                <div className="text-right">
                  <div className="text-xs text-slate-400 flex items-center justify-end gap-1">
                    <CreditCard size={12} />
                    <span>Accrued Ward & Care Bill:</span>
                  </div>
                  <p className="font-mono font-black text-lg text-slate-800 dark:text-slate-100">
                    ETB {a.totalAccrued.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Bed: {a.daysElapsed}d × {a.dailyRate} | Nursing: {a.daysElapsed}d × {a.nursingDailyFee}
                  </p>
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <Link
                    href={`/nova/billing/invoices`}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-teal-500/50 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/50 flex items-center gap-1 font-medium"
                  >
                    <span>Cashier Clearance</span>
                    <ArrowRight size={11} />
                  </Link>

                  <button
                    onClick={() => {
                      setSelectedAdmissionId(a.id);
                      setTab("discharge");
                    }}
                    className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Discharge →
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Admit Patient Tab */}
      {tab === "admit" && (
        <Card className="p-6 max-w-2xl mx-auto shadow-sm">
          {admitSuccess ? (
            <div className="text-center py-8 space-y-3">
              <CheckCircle size={48} className="text-teal-500 mx-auto animate-bounce" />
              <h3 className="font-extrabold text-xl text-slate-800 dark:text-slate-100">
                Patient Successfully Admitted!
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Bed assigned, duty nurse notified, and daily inpatient room & nursing care tariffs linked to billing.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => {
                    setAdmitSuccess(false);
                    setTab("active");
                  }}
                  className={btnPrimary}
                >
                  View Active Inpatient Admissions
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">
                  New Inpatient Admission
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Assign a bed, primary duty nurse, and inpatient billing tariff.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                {/* 1. Patient Selector */}
                <FormField label="1. Patient to Admit (from OPD Queue / Registration)">
                  <select
                    className={inputCls}
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                  >
                    <option value="">Select patient…</option>
                    {queuePatients.map((q) => (
                      <option key={q.visitId} value={q.visit.patientId}>
                        {q.visit.patient.nameEn} — {q.visit.patient.healthId} (Ticket: {q.ticketNumber})
                        {q.visit.patient.cbhiStatus ? " [CBHI Member]" : ""}
                      </option>
                    ))}
                  </select>
                </FormField>

                {/* 2. Bed Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField label="2. Available Ward Bed">
                    <select
                      className={inputCls}
                      value={selectedBedId}
                      onChange={(e) => setSelectedBedId(e.target.value)}
                    >
                      <option value="">Select available bed…</option>
                      {availableBeds.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.ward} — Bed #{b.room} (Base: ETB {b.dailyRate}/day)
                        </option>
                      ))}
                    </select>
                  </FormField>

                  {/* 3. Primary Care Nurse Selection */}
                  <FormField label="3. Assigned Primary Care Nurse">
                    <select
                      className={inputCls}
                      value={selectedNurseId}
                      onChange={(e) => setSelectedNurseId(e.target.value)}
                    >
                      <option value="">Select duty nurse…</option>
                      {nurses.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.name} ({n.title || "Staff Nurse"})
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>

                {/* 4. Tariff Category */}
                <FormField label="4. Inpatient Ward Tariff Category">
                  <select
                    className={inputCls}
                    value={selectedTariffCode}
                    onChange={(e) => setSelectedTariffCode(e.target.value)}
                  >
                    {tariffs.map((t) => (
                      <option key={t.id} value={t.code}>
                        {t.name} — ETB {t.price}/day
                      </option>
                    ))}
                  </select>
                </FormField>

                {/* Billing Summary Preview Box */}
                <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300 block uppercase tracking-wider text-[10px]">
                    Automatic Inpatient Billing Rate:
                  </span>
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>Bed Tariff ({selectedTariff?.name || "General Ward"}):</span>
                    <span className="font-mono font-bold">ETB {currentBedPrice} / day</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>Inpatient Nursing & Staff Care:</span>
                    <span className="font-mono font-bold">ETB {currentNursingPrice} / day</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-bold text-slate-800 dark:text-slate-100">
                    <span>Total Accrued per Day:</span>
                    <span className="font-mono text-teal-600 text-sm">ETB {currentBedPrice + currentNursingPrice} / day</span>
                  </div>
                </div>
              </div>

              {admit.error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 text-xs text-red-600 dark:text-red-300 rounded-lg">
                  {admit.error.message}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  className={btnPrimary}
                  disabled={!selectedPatientId || !selectedBedId || admit.isPending}
                  onClick={() =>
                    admit.mutate({
                      patientId: selectedPatientId,
                      bedId: selectedBedId,
                      assignedNurseId: selectedNurse?.id,
                      assignedNurseName: selectedNurse?.name,
                      tariffCode: selectedTariffCode,
                      dailyRate: currentBedPrice,
                      nursingDailyFee: currentNursingPrice,
                    })
                  }
                >
                  {admit.isPending ? "Admitting & Linking Bill…" : "Confirm Admission & Assign Nurse"}
                </button>
                <button className={btnSecondary} onClick={() => setTab("active")}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Discharge & Clearance Tab */}
      {tab === "discharge" && (
        <Card className="p-6 max-w-xl mx-auto shadow-sm">
          <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 mb-1">
            Patient Discharge & Bed Clearance
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Verify inpatient stay duration, bill clearance, and record discharge condition.
          </p>

          <div className="space-y-4">
            <FormField label="Select Admitted Patient">
              <select
                className={inputCls}
                value={selectedAdmissionId}
                onChange={(e) => setSelectedAdmissionId(e.target.value)}
              >
                <option value="">Select admission…</option>
                {admissions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.patient.nameEn} ({a.patient.healthId}) — {a.bed.ward} Bed #{a.bed.room}
                  </option>
                ))}
              </select>
            </FormField>

            {selectedAdmissionToDischarge && (
              <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Stay Duration:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedAdmissionToDischarge.daysElapsed} Days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Bed Rate:</span>
                  <span className="font-mono">ETB {selectedAdmissionToDischarge.dailyRate}/day</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Nursing Care:</span>
                  <span className="font-mono">ETB {selectedAdmissionToDischarge.nursingDailyFee}/day</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700 font-bold">
                  <span>Total Inpatient Stay Bill:</span>
                  <span className="font-mono text-teal-600">ETB {selectedAdmissionToDischarge.totalAccrued.toLocaleString()}</span>
                </div>
                <div className="pt-2 flex justify-between items-center text-xs">
                  <span className="text-slate-500">Payment Status:</span>
                  {selectedAdmissionToDischarge.patient.cbhiStatus ? (
                    <span className="text-teal-600 font-bold">🛡️ 100% CBHI Covered</span>
                  ) : selectedAdmissionToDischarge.paymentStatus === "paid" ? (
                    <span className="text-emerald-600 font-bold">✓ Cleared by Cashier</span>
                  ) : (
                    <span className="text-amber-600 font-bold">⚠️ Outstanding — Pending Clearance</span>
                  )}
                </div>
              </div>
            )}

            <FormField label="Discharge Condition & Clinical Outcome">
              <select
                className={inputCls}
                value={dischargeCondition}
                onChange={(e) => setDischargeCondition(e.target.value)}
              >
                {["Improved", "Recovered", "Against medical advice", "Transferred to Tertiary Center", "Deceased"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </FormField>

            <div className="flex gap-2 pt-2">
              <button
                className={btnPrimary}
                disabled={!selectedAdmissionId || discharge.isPending}
                onClick={() =>
                  discharge.mutate({
                    admissionId: selectedAdmissionId,
                    dischargeCondition,
                  })
                }
              >
                {discharge.isPending ? "Processing Discharge…" : "Discharge Patient & Free Bed"}
              </button>
              <button className={btnSecondary} onClick={() => setTab("active")}>
                Cancel
              </button>
            </div>
          </div>
        </Card>
      )}
    </PageShell>
  );
}

