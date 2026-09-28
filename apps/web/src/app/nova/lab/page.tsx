"use client";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { PageShell, DataTable, StatusBadge, KpiCard } from "@/components/nova/nova-ui";

export default function LabQueuePage() {
  const qc = useQueryClient();
  const { data: orders = [] } = useQuery(trpc.lab.queue.queryOptions());

  const updateStatus = useMutation(
    trpc.lab.updateStatus.mutationOptions({
      onSuccess: () => qc.invalidateQueries({ queryKey: trpc.lab.queue.queryKey() }),
    })
  );

  const pending = orders.filter((o) => o.status !== "completed").length;
  const urgent = orders.filter((o) => o.priority === "urgent").length;

  return (
    <PageShell title="Lab Orders Queue" subtitle="Lab Technician view">
      <div className="grid grid-cols-3 gap-4 mb-6">
        <KpiCard label="Pending / in-progress" value={pending} accent />
        <KpiCard label="Urgent" value={urgent} />
        <KpiCard label="Completed today" value={orders.filter((o) => o.status === "completed").length} />
      </div>

      <DataTable
        columns={["Order ID", "Patient", "Test", "Priority", "Status", ""]}
        rows={orders.map((o) => [
          <span className="font-mono text-xs">{o.id.slice(-6)}</span>,
          <span className="font-medium">{o.visit.patient.nameEn}</span>,
          o.testName,
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${o.priority === "urgent" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"}`}>{o.priority}</span>,
          <StatusBadge status={o.status} />,
          <div className="flex gap-2">
            {o.status === "pending" && (
              <button onClick={() => updateStatus.mutate({ orderId: o.id, status: "in-progress" })} className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded border border-amber-200">Start</button>
            )}
            {o.status !== "completed" && (
              <Link href={`/nova/lab/result?orderId=${o.id}`} className="text-xs px-2 py-1 bg-teal-600 text-white rounded hover:bg-teal-700">Enter result</Link>
            )}
          </div>,
        ])}
      />
    </PageShell>
  );
}
