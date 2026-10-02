"use client";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { PageShell, DataTable } from "@/components/nova/nova-ui";

export default function AuditLogPage() {
  const { data: logs = [], isLoading } = useQuery({
    ...trpc.tenant.auditLog.queryOptions(),
    refetchOnMount: true,
  });

  return (
    <PageShell title="Audit Log" subtitle="All system actions are recorded and immutable.">
      {isLoading && <p className="text-sm text-slate-400">Loading…</p>}
      <DataTable
        columns={["User", "Action", "Entity", "Entity ID", "Time", "IP"]}
        rows={logs.map((a) => [
          <span className="font-medium text-slate-700">{a.userId}</span>,
          a.action,
          <span className="text-xs px-2 py-0.5 bg-slate-100 rounded">{a.entity}</span>,
          <span className="font-mono text-xs text-slate-400 truncate max-w-32">{a.entityId || "—"}</span>,
          <span className="text-xs text-slate-500">{new Date(a.createdAt).toLocaleString()}</span>,
          <span className="font-mono text-xs text-slate-400">{a.ipAddress || "—"}</span>,
        ])}
      />
    </PageShell>
  );
}
