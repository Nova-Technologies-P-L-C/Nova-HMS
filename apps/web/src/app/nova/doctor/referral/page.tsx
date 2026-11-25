"use client";
// Doctor — Internal Transfer & External Referral
import { useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { PageShell, Card, FormField, inputCls, btnPrimary, btnSecondary } from "@/components/nova/nova-ui";
import { useNovaRole } from "@/components/nova/nova-role-context";
import { ALL_DEPARTMENTS, getDepartmentConfig, doesTicketBelongToDepartment } from "@/lib/department-configs";
import { CheckCircle, ArrowLeft, ArrowLeftRight, Building2, Printer } from "lucide-react";
import { toast } from "sonner";

const EXTERNAL_FACILITIES = [
  "Tikur Anbessa Specialized Hospital, Addis Ababa",
  "Gondar University Hospital, Gondar",
  "St. Paul's Hospital Millennium, Addis Ababa",
  "Black Lion Hospital, Addis Ababa",
  "Jimma University Medical Center, Jimma",
  "Mekelle University Hospital, Mekelle",
];

function ReferralContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const { doctorDepartment } = useNovaRole();

  const rawVisitId = searchParams.get("visitId") ?? "";
  const urlDept = searchParams.get("dept");
  const [selectedVisitId, setSelectedVisitId] = useState<string>(rawVisitId);
  const activeVisitId = selectedVisitId || rawVisitId;
  const deptConfig = useMemo(() => getDepartmentConfig(urlDept || doctorDepartment), [urlDept, doctorDepartment]);

  const [mode, setMode] = useState<"internal" | "external">("internal");
  const [targetDept, setTargetDept] = useState<string>(() => {
    const other = ALL_DEPARTMENTS.find((d) => d.id !== deptConfig.id);
    return other?.name || "General OPD & Internal Medicine";
  });
  const [toFacility, setToFacility] = useState(EXTERNAL_FACILITIES[0]!);
  const [receivingSpecialty, setReceivingSpecialty] = useState("Cardiology / Specialist Care");
  const [urgency, setUrgency] = useState<"routine" | "urgent" | "emergency">("routine");
  const [reason, setReason] = useState("");
  const [clinicalSummary, setClinicalSummary] = useState("");
  const [submittedInfo, setSubmittedInfo] = useState<{ kind: "internal" | "external"; target: string; id?: string } | null>(null);

  const { data: queue = [] } = useQuery(trpc.visit.queue.queryOptions());
  const { data: visit } = useQuery({
    ...trpc.visit.get.queryOptions({ visitId: activeVisitId }),
    enabled: !!activeVisitId,
  });

  const transferDeptMutation = useMutation({
    ...trpc.visit.transferDepartment.mutationOptions(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: trpc.visit.queue.queryKey() });
    },
  });

  const createReferralMutation = useMutation({
    ...trpc.referral.create.mutationOptions(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: trpc.referral.list.queryKey() });
    },
  });

  const activeQueue = useMemo(() => {
    const deptFirst = queue.filter((q) => q.status !== "done" && doesTicketBelongToDepartment(q.department, deptConfig.id));
    const others = queue.filter((q) => q.status !== "done" && !doesTicketBelongToDepartment(q.department, deptConfig.id));
    return [...deptFirst, ...others];
  }, [queue, deptConfig.id]);

  const handleSubmit = async () => {
    if (!activeVisitId || !visit?.patient) {
      toast.error("Please choose a patient first");
      return;
    }

    if (mode === "internal") {
      try {
        await transferDeptMutation.mutateAsync({
          visitId: activeVisitId,
          department: targetDept,
          reason: reason.trim() || `Referred from ${deptConfig.shortLabel}`,
        });
        toast.success(`Patient transferred to ${targetDept}`);
        setSubmittedInfo({ kind: "internal", target: targetDept });
      } catch (err: any) {
        toast.error(err?.message || "Could not transfer patient");
      }
      return;
    }

    // External Hospital Referral
    const summaryText =
      clinicalSummary.trim() ||
      `Patient ${visit.patient.nameEn} (${visit.patient.healthId}) seen at ${deptConfig.name} (Ethiora Medical System). Reason: ${reason.trim() || "Specialist evaluation required"}.`;

    if (summaryText.length < 50) {
      toast.error("Please write at least 50 characters in Clinical Summary for hospital referral");
      return;
    }

    try {
      const ref = await createReferralMutation.mutateAsync({
        visitId: activeVisitId,
        patientId: visit.patient.id,
        fromFacility: "Ethiora Medical System",
        toFacility: `${toFacility} (${receivingSpecialty})`,
        reason: reason.trim() || `${receivingSpecialty} evaluation`,
        clinicalSummary: summaryText,
        urgency,
        type: "out",
      });
      toast.success("External hospital referral sent");
      setSubmittedInfo({ kind: "external", target: toFacility, id: ref.id });
    } catch (err: any) {
      toast.error(err?.message || "Could not create referral");
    }
  };

  if (submittedInfo) {
    return (
      <PageShell title="Transfer / Referral Complete">
        <Card className="p-8 text-center max-w-lg mx-auto">
          <CheckCircle size={48} className="text-teal-500 mx-auto mb-3" />
          <h2 className="font-bold text-slate-900 dark:text-white text-lg mb-1">
            {submittedInfo.kind === "internal" ? "Patient Moved to New Clinic" : "Hospital Referral Created"}
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            {submittedInfo.kind === "internal"
              ? `${visit?.patient?.nameEn} is now in the ${submittedInfo.target} queue.`
              : `Referral ${submittedInfo.id ? `(${submittedInfo.id.slice(-6)})` : ""} sent to ${submittedInfo.target}.`}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {submittedInfo.kind === "external" && (
              <button onClick={() => window.print()} className={`${btnSecondary} flex items-center gap-1.5`}>
                <Printer size={14} /> Print Letter
              </button>
            )}
            <button onClick={() => router.push("/nova/doctor")} className={btnPrimary}>
              Back to Queue
            </button>
            <button
              onClick={() => {
                setSubmittedInfo(null);
                setReason("");
                setClinicalSummary("");
              }}
              className={btnSecondary}
            >
              Another Referral
            </button>
          </div>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={`${deptConfig.shortLabel} — Transfer & Referral`}
      subtitle={
        visit?.patient
          ? `${visit.patient.nameEn} · ${visit.patient.healthId}`
          : "Send patient to another clinic doctor here or to an outside hospital"
      }
      action={
        <div className="flex items-center gap-2">
          {activeVisitId && (
            <Link
              href={`/nova/doctor/consultation?visitId=${activeVisitId}&dept=${deptConfig.id}`}
              className="text-xs text-slate-600 dark:text-slate-300 hover:text-teal-700 flex items-center gap-1 font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg"
            >
              <ArrowLeft size={14} /> {deptConfig.sidebarLabels.consult}
            </Link>
          )}
        </div>
      }
    >
      <div className="max-w-2xl space-y-4">
        {/* Patient Selector */}
        <Card className="p-4">
          <FormField label="Select Patient from Active Queue">
            <select
              className={inputCls}
              value={activeVisitId}
              onChange={(e) => setSelectedVisitId(e.target.value)}
            >
              <option value="">-- Choose waiting or active patient --</option>
              {activeQueue.map((q) => (
                <option key={q.id} value={q.visitId}>
                  #{q.ticketNumber} — {q.visit?.patient?.nameEn} ({q.department || "General OPD"})
                </option>
              ))}
            </select>
          </FormField>
        </Card>

        {/* Mode Switcher */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode("internal")}
            className={`p-3 rounded-xl border text-left transition cursor-pointer ${
              mode === "internal"
                ? "bg-teal-50 dark:bg-teal-950/40 border-teal-500 text-teal-900 dark:text-teal-100 shadow-xs"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-xs mb-0.5">
              <ArrowLeftRight size={14} className="text-teal-600" />
              <span>Inside Ethiora Clinic</span>
            </div>
            <p className="text-[11px] opacity-80">
              Send patient to Dental, Eye, Surgery, OB/GYN, or Pediatrics here
            </p>
          </button>

          <button
            type="button"
            onClick={() => setMode("external")}
            className={`p-3 rounded-xl border text-left transition cursor-pointer ${
              mode === "external"
                ? "bg-teal-50 dark:bg-teal-950/40 border-teal-500 text-teal-900 dark:text-teal-100 shadow-xs"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-xs mb-0.5">
              <Building2 size={14} className="text-blue-600" />
              <span>Outside Hospital</span>
            </div>
            <p className="text-[11px] opacity-80">
              Send patient to a referral hospital with a clinical letter
            </p>
          </button>
        </div>

        {/* Form Card */}
        <Card className="p-5 space-y-4">
          {mode === "internal" ? (
            <>
              <FormField label="Send Patient To Which Doctor / Clinic?">
                <select
                  className={inputCls}
                  value={targetDept}
                  onChange={(e) => setTargetDept(e.target.value)}
                >
                  {ALL_DEPARTMENTS.filter((d) => d.id !== deptConfig.id).map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Reason / Short Note for Receiving Doctor">
                <textarea
                  className={`${inputCls} resize-none h-20`}
                  placeholder="e.g. Tooth pain noticed during OPD check, needs dental exam..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </FormField>
            </>
          ) : (
            <>
              <FormField label="Receiving Hospital">
                <select
                  className={inputCls}
                  value={toFacility}
                  onChange={(e) => setToFacility(e.target.value)}
                >
                  {EXTERNAL_FACILITIES.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </FormField>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="Department / Specialist Needed">
                  <input
                    className={inputCls}
                    value={receivingSpecialty}
                    onChange={(e) => setReceivingSpecialty(e.target.value)}
                    placeholder="e.g. Cardiology, Ophthalmology"
                  />
                </FormField>
                <FormField label="How Urgent">
                  <select
                    className={inputCls}
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value as "routine" | "urgent" | "emergency")}
                  >
                    <option value="routine">Routine</option>
                    <option value="urgent">Urgent</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </FormField>
              </div>
              <FormField label="Reason for Referral">
                <textarea
                  className={`${inputCls} resize-none h-16`}
                  placeholder="Why does this patient need specialist hospital care?"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </FormField>
              <FormField label="Clinical Summary (min 50 characters)">
                <textarea
                  className={`${inputCls} resize-none h-24`}
                  placeholder="Brief history, key exam findings, vitals, lab results, and treatments already given..."
                  value={clinicalSummary}
                  onChange={(e) => setClinicalSummary(e.target.value)}
                />
              </FormField>
            </>
          )}

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!activeVisitId || transferDeptMutation.isPending || createReferralMutation.isPending}
              className={btnPrimary}
            >
              {transferDeptMutation.isPending || createReferralMutation.isPending
                ? "Sending..."
                : mode === "internal"
                ? `Send to ${targetDept.split("&")[0]?.trim()}`
                : "Submit Hospital Referral"}
            </button>
            <Link href="/nova/doctor" className={btnSecondary}>
              Cancel
            </Link>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}

export default function CreateReferralPage() {
  return (
    <Suspense fallback={<PageShell title="Transfer & Referral"><p className="text-xs text-slate-400">Loading...</p></PageShell>}>
      <ReferralContent />
    </Suspense>
  );
}
