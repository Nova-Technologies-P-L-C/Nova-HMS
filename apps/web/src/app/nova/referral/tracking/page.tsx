"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { PageShell, Card, StatusBadge } from "@/components/nova/nova-ui";
import { CheckCircle, ArrowLeftRight } from "lucide-react";
import { useState } from "react";

const TIMELINE_STEPS = ["Created", "In transit", "Arrived"];

export default function ReferralTrackingPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);

  const { data: referrals = [], isLoading } = useQuery({
    ...trpc.referral.list.queryOptions({ type: "all" }),
    refetchOnMount: true,
  });

  const confirm = useMutation(trpc.referral.confirmArrival.mutationOptions({
    onSuccess: () => qc.invalidateQueries({ queryKey: trpc.referral.list.queryKey({ type: "all" }) }),
  }));

  const updateStatus = useMutation(trpc.referral.updateStatus.mutationOptions({
    onSuccess: () => qc.invalidateQueries({ queryKey: trpc.referral.list.queryKey({ type: "all" }) }),
  }));

  const ref = referrals.find((r) => r.id === selected) ?? referrals[0];

  const stepIndex = ref
    ? { pending: 0, "in-transit": 1, arrived: 2 }[ref.status as string] ?? 0
    : 0;

  return (
    <PageShell title="Referral Tracking" subtitle="Track referral status and confirm patient arrivals">
      {isLoading && <p className="text-sm text-slate-400">Loading…</p>}
      {!isLoading && referrals.length === 0 && (
        <Card className="p-12 text-center">
          <ArrowLeftRight size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">No referrals found.</p>
        </Card>
      )}

      {referrals.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* List */}
          <div className="space-y-2">
            {referrals.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelected(r.id)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${(selected ?? referrals[0].id) === r.id ? "border-teal-400 bg-teal-50" : "border-slate-200 bg-white hover:border-teal-200"}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${r.type === "in" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                    {r.type === "in" ? "Incoming" : "Outgoing"}
                  </span>
                  <StatusBadge status={r.status} />
                </div>
                <p className="font-medium text-slate-800 text-sm">{r.visit.patient.nameEn}</p>
                <p className="text-xs text-slate-500 mt-0.5 truncate">{r.reason}</p>
              </button>
            ))}
          </div>

          {/* Detail */}
          {ref && (
            <div className="md:col-span-2 space-y-4">
              <Card className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-bold text-slate-800 text-lg">{ref.visit.patient.nameEn}</p>
                    <p className="text-sm text-slate-500">{ref.reason}</p>
                    {ref.clinicalSummary && (
                      <p className="text-xs text-slate-400 mt-1">{ref.clinicalSummary}</p>
                    )}
                  </div>
                  <StatusBadge status={ref.status} />
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm mb-5">
                  <div><p className="text-xs text-slate-400">From</p><p className="font-medium">{ref.fromFacility}</p></div>
                  <div><p className="text-xs text-slate-400">To</p><p className="font-medium">{ref.toFacility}</p></div>
                  <div><p className="text-xs text-slate-400">Urgency</p>
                    <span className={`text-xs font-medium ${ref.urgency === "emergency" ? "text-red-600" : ref.urgency === "urgent" ? "text-amber-600" : "text-slate-600"}`}>{ref.urgency}</span>
                  </div>
                  <div><p className="text-xs text-slate-400">Direction</p>
                    <span className={`text-xs font-medium ${ref.type === "in" ? "text-blue-600" : "text-purple-600"}`}>{ref.type === "in" ? "Incoming" : "Outgoing"}</span>
                  </div>
                  <div><p className="text-xs text-slate-400">Created</p><p>{new Date(ref.createdAt).toLocaleDateString()}</p></div>
                  <div><p className="text-xs text-slate-400">Health ID</p><p className="font-mono text-xs">{ref.visit.patient.healthId}</p></div>
                </div>

                {/* Timeline */}
                <div className="flex items-start gap-0 mt-2">
                  {TIMELINE_STEPS.map((step, i) => (
                    <div key={step} className="flex items-center flex-1">
                      <div className="flex flex-col items-center">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i <= stepIndex ? "bg-teal-600 text-white" : "bg-slate-200 text-slate-400"}`}>
                          {i < stepIndex ? "✓" : i + 1}
                        </div>
                        <p className={`text-xs mt-1 text-center w-16 ${i <= stepIndex ? "text-teal-700 font-medium" : "text-slate-400"}`}>{step}</p>
                      </div>
                      {i < TIMELINE_STEPS.length - 1 && (
                        <div className={`flex-1 h-0.5 mx-1 mb-4 ${i < stepIndex ? "bg-teal-500" : "bg-slate-200"}`} />
                      )}
                    </div>
                  ))}
                </div>
              </Card>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                {ref.status === "pending" && (
                  <button
                    onClick={() => updateStatus.mutate({ id: ref.id, status: "in-transit" })}
                    disabled={updateStatus.isPending}
                    className="px-4 py-2 bg-amber-500 text-white text-sm rounded hover:bg-amber-600 disabled:opacity-50"
                  >
                    Mark in-transit
                  </button>
                )}
                {ref.status === "in-transit" && ref.type === "in" && (
                  <button
                    onClick={() => confirm.mutate({ id: ref.id })}
                    disabled={confirm.isPending}
                    className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm rounded hover:bg-teal-700 disabled:opacity-50 font-medium"
                  >
                    <CheckCircle size={15} /> Confirm patient arrived
                  </button>
                )}
                {ref.status === "arrived" && (
                  <div className="flex items-center gap-2 text-emerald-600 text-sm">
                    <CheckCircle size={15} /> Patient has arrived and been received.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}
