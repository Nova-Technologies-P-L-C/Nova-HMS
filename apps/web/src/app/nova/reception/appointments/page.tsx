"use client";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { PageShell, DataTable, StatusBadge } from "@/components/nova/nova-ui";
import { RefreshCw, Search } from "lucide-react";

export default function AppointmentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: appointments = [], refetch, isFetching } = useQuery(trpc.appointment.list.queryOptions({}));

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return appointments;
    const q = searchQuery.toLowerCase().trim();
    return appointments.filter((a) => {
      const matchPatient = a.patient?.nameEn?.toLowerCase().includes(q) || a.patient?.healthId?.toLowerCase().includes(q);
      const matchDoctor = a.doctor?.toLowerCase().includes(q);
      const matchDept = a.dept?.toLowerCase().includes(q);
      const matchId = a.id?.toLowerCase().includes(q);
      return matchPatient || matchDoctor || matchDept || matchId;
    });
  }, [appointments, searchQuery]);

  return (
    <PageShell
      title="Appointment Scheduling"
      subtitle={appointments.length === 0 ? "No appointments scheduled" : `${appointments.length} scheduled appointments`}
      action={
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-lg hover:border-teal-400 transition flex items-center gap-1.5"
          title="Refresh appointments"
        >
          <RefreshCw size={13} className={isFetching ? "animate-spin text-teal-600" : ""} />
          <span>Refresh</span>
        </button>
      }
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="relative w-full sm:w-64">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search patient, doctor, department…"
            className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-teal-500"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
          {searchQuery ? `No appointments matching "${searchQuery}"` : "No appointments scheduled"}
        </div>
      ) : (
        <DataTable
          columns={["ID", "Patient", "Doctor", "Department", "Date", "Time", "Status"]}
          rows={filtered.map((a) => [
            <span key="id" className="font-mono text-xs text-slate-600 dark:text-slate-300">{a.id}</span>,
            <div key="patient">
              <span className="font-medium text-slate-800 dark:text-slate-100">{a.patient.nameEn}</span>
              {a.patient.healthId && (
                <span className="text-[11px] text-slate-400 font-mono ml-1.5">({a.patient.healthId})</span>
              )}
            </div>,
            <span key="doctor" className="text-slate-700 dark:text-slate-300">{a.doctor}</span>,
            <span key="dept" className="text-slate-600 dark:text-slate-400">{a.dept}</span>,
            <span key="date" className="text-slate-700 dark:text-slate-300 font-mono text-xs">{a.date}</span>,
            <span key="time" className="text-slate-700 dark:text-slate-300 font-mono text-xs">{a.time}</span>,
            <StatusBadge key="status" status={a.status} />,
          ])}
        />
      )}
    </PageShell>
  );
}
