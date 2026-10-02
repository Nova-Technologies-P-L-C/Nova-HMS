"use client";
import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { PageShell, DataTable, StatusBadge, KpiCard } from "@/components/nova/nova-ui";

export default function ReferralInboxPage() {
  const [tab, setTab] = useState<"in" | "out" | "all">("all");
  const qc = useQueryClient();

  const { data: referrals = [] } = useQuery(trpc.referral.list.queryOptions({ type: tab }));

  const confirm = useMutation(
    trpc.referral.confirmArrival.mutationOptions({
      onSuccess: () => qc.invalidateQueries({ queryKey: trpc.referral.list.queryKey({ type: tab }) }),
    })
  );

  const inRefs = referrals.filter((r) => r.type === "in").length;
  const outRefs = referrals.filter((r) => r.type === "out").length;
  const inTransit = referrals.filter((r) => r.status === "in-transit").length;

  return (
    <PageShell
      title="Referral Inbox / Outbox"
      action={<Link href="/nova/doctor/referral" className="px-4 py-2 bg-teal-600 text-white text-sm rounded hover:bg-teal-700 font-medium">+ Create referral</Link>}
    >
      <div className="grid grid-cols-3 gap-4 mb-6">
        <KpiCard label="Incoming" value={inRefs} accent />
        <KpiCard label="Outgoing" value={outRefs} />
        <KpiCard label="In transit" value={inTransit} />
      </div>

      <div className="flex gap-1 mb-4">
        {(["all", "in", "out"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm rounded capitalize ${tab === t ? "bg-teal-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-teal-400"}`}>
            {t === "all" ? "All referrals" : t === "in" ? "Incoming" : "Outgoing"}
          </button>
        ))}
      </div>

      <DataTable
        columns={["Patient", "From", "To", "Reason", "Urgency", "Type", "Status", ""]}
        rows={referrals.map((r) => [
          <span className="font-medium">{r.visit.patient.nameEn}</span>,
          <span className="text-xs max-w-xs truncate">{r.fromFacility}</span>,
          <span className="text-xs max-w-xs truncate">{r.toFacility}</span>,
          <span className="text-sm">{r.reason}</span>,
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.urgency === "emergency" ? "bg-red-100 text-red-700" : r.urgency === "urgent" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{r.urgency}</span>,
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.type === "in" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>{r.type === "in" ? "Incoming" : "Outgoing"}</span>,
          <StatusBadge status={r.status} />,
          r.type === "in" && r.status !== "arrived" && (
            <button onClick={() => confirm.mutate({ id: r.id })} className="text-xs px-2 py-1 bg-teal-600 text-white rounded hover:bg-teal-700">Confirm arrival</button>
          ),
        ])}
      />
    </PageShell>
  );
}

