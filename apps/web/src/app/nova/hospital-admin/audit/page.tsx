"use client";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { PageShell, DataTable } from "@/components/nova/nova-ui";

export default function AuditLogPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const { data: logs = [], isLoading } = useQuery({
    ...trpc.tenant.auditLog.queryOptions(),
    refetchOnMount: true,
  });

  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return logs.slice(start, start + pageSize);
  }, [logs, currentPage, pageSize]);

  return (
    <PageShell title="Audit Log" subtitle="All system actions are recorded and immutable.">
      {isLoading && <p className="text-sm text-slate-400">Loading…</p>}
      <DataTable
        columns={["User", "Action", "Entity", "Entity ID", "Time", "IP"]}
        rows={paginatedLogs.map((a) => [
          <span className="font-medium text-slate-700">{a.userId}</span>,
          a.action,
          <span className="text-xs px-2 py-0.5 bg-slate-100 rounded">{a.entity}</span>,
          <span className="font-mono text-xs text-slate-400 truncate max-w-32">{a.entityId || "—"}</span>,
          <span className="text-xs text-slate-500">{new Date(a.createdAt).toLocaleString()}</span>,
          <span className="font-mono text-xs text-slate-400">{a.ipAddress || "—"}</span>,
        ])}
        pagination={logs.length > 0 ? {
          currentPage,
          totalItems: logs.length,
          pageSize,
          onPageChange: setCurrentPage,
          onPageSizeChange: setPageSize,
          pageSizeOptions: [10, 15, 25, 50, 100],
          itemLabel: "audit logs",
        } : undefined}
      />
    </PageShell>
  );
}
