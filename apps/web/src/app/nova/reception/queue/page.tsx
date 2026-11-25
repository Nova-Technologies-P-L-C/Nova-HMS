"use client";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import Link from "next/link";
import { trpc } from "@/utils/trpc";
import { PageShell } from "@/components/nova/nova-ui";
import {
  Monitor,
  RefreshCw,
  Search,
  UserPlus,
} from "lucide-react";

const STATUS_DOT: Record<string, string> = {
  "being-seen": "bg-teal-500",
  waiting: "bg-amber-400",
  urgent: "bg-red-500",
  done: "bg-slate-300",
};

export default function OPDQueueBoardPage() {
  const [fullscreen, setFullscreen] = useState(false);
  const [filterTab, setFilterTab] = useState<"all" | "waiting" | "being-seen" | "done">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: queue = [], refetch, isFetching } = useQuery({
    ...trpc.visit.queue.queryOptions(),
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  const now = queue.filter((q) => q.status === "being-seen");
  const waiting = queue.filter((q) => q.status === "waiting" || q.status === "urgent");
  const done = queue.filter((q) => q.status === "done");

  const filteredQueue = useMemo(() => {
    return queue.filter((q) => {
      // Filter by tab
      if (filterTab === "waiting" && q.status !== "waiting" && q.status !== "urgent") return false;
      if (filterTab === "being-seen" && q.status !== "being-seen") return false;
      if (filterTab === "done" && q.status !== "done") return false;

      // Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTicket = q.ticketNumber.toLowerCase().includes(query);
        const matchesName = q.visit.patient.nameEn.toLowerCase().includes(query);
        const matchesHealthId = q.visit.patient.healthId.toLowerCase().includes(query);
        return matchesTicket || matchesName || matchesHealthId;
      }
      return true;
    });
  }, [queue, filterTab, searchQuery]);

  if (fullscreen) {
    return (
      <div className="h-full min-h-[100dvh] bg-[#0a1929] p-4 sm:p-6 overflow-y-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-teal-500 flex items-center justify-center font-black text-white text-base">
              E
            </div>
            <div>
              <p className="text-white font-bold text-base">Ethiora HMS — OPD Live Queue</p>
              <p className="text-slate-400 text-xs font-mono">{new Date().toLocaleTimeString()}</p>
            </div>
          </div>
          <button
            onClick={() => setFullscreen(false)}
            className="text-xs text-slate-400 hover:text-white px-3 py-1.5 border border-slate-700 hover:border-slate-500 rounded-lg transition"
          >
            Exit display (Esc)
          </button>
        </div>

        {now.length > 0 && (
          <div className="mb-6">
            <p className="text-slate-400 text-xs uppercase tracking-widest font-semibold mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
              Now Serving / አሁን እየተገለገሉ
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {now.map((q) => (
                <div key={q.id} className="bg-teal-600 rounded-2xl p-5 shadow-lg">
                  <span className="text-[11px] text-teal-100 uppercase tracking-wider font-semibold block">Ticket</span>
                  <p className="text-4xl font-black text-white font-mono mt-0.5">{q.ticketNumber}</p>
                  <p className="text-teal-100 text-base font-semibold mt-2 truncate">{q.visit.patient.nameEn}</p>
                  <p className="text-teal-200 text-xs font-mono">{q.visit.patient.healthId}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="text-slate-400 text-xs uppercase tracking-widest font-semibold mb-3">
            Upcoming Waiting Line ({waiting.length})
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {waiting.map((q) => (
              <div
                key={q.id}
                className={`rounded-xl p-3.5 border transition ${
                  q.status === "urgent"
                    ? "bg-red-950/40 border-red-500/70"
                    : "bg-slate-800/80 border-slate-700/60"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-2xl font-black text-white font-mono">{q.ticketNumber}</p>
                  {q.status === "urgent" && (
                    <span className="text-[10px] bg-red-600 text-white font-bold px-1.5 py-0.5 rounded-full">
                      URGENT
                    </span>
                  )}
                </div>
                <p className="text-slate-200 text-xs font-medium truncate">{q.visit.patient.nameEn}</p>
                <p className="text-slate-400 text-[10px] font-mono mt-0.5">{q.visit.patient.healthId}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <PageShell
      title="Queue Board"
      subtitle={`${waiting.length} waiting · ${now.length} being seen · ${done.length} completed`}
      action={
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-lg hover:border-teal-400 transition flex items-center gap-1.5"
            title="Refresh queue data"
          >
            <RefreshCw size={13} className={isFetching ? "animate-spin text-teal-600" : ""} />
            <span>Refresh</span>
          </button>
          <Link
            href="/nova/reception/register"
            className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-lg hover:border-teal-400 transition flex items-center gap-1.5"
          >
            <UserPlus size={13} />
            <span>+ Intake</span>
          </Link>
          <button
            onClick={() => setFullscreen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded-lg transition shadow-xs"
          >
            <Monitor size={14} />
            <span>Display Mode</span>
          </button>
        </div>
      }
    >
      {/* Filter Tabs & Quick Search Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
        {/* Filter Pills */}
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg text-xs self-start">
          <button
            type="button"
            onClick={() => setFilterTab("all")}
            className={`px-3 py-1 rounded-md font-medium transition ${
              filterTab === "all"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            All ({queue.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("waiting")}
            className={`px-3 py-1 rounded-md font-medium transition ${
              filterTab === "waiting"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            Waiting ({waiting.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("being-seen")}
            className={`px-3 py-1 rounded-md font-medium transition ${
              filterTab === "being-seen"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            At Desk ({now.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("done")}
            className={`px-3 py-1 rounded-md font-medium transition ${
              filterTab === "done"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            Done ({done.length})
          </button>
        </div>

        {/* Quick Search Box */}
        <div className="relative w-full sm:w-64">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ticket, name, ID…"
            className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-teal-500"
          />
        </div>
      </div>

      {/* Main Queue Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px]">
              <th className="text-left px-3.5 py-2.5 font-semibold">Ticket</th>
              <th className="text-left px-3.5 py-2.5 font-semibold">Patient</th>
              <th className="text-left px-3.5 py-2.5 font-semibold">Health ID</th>
              <th className="text-left px-3.5 py-2.5 font-semibold">Card Fee</th>
            </tr>
          </thead>
          <tbody>
            {filteredQueue.map((q) => (
              <tr
                key={q.id}
                className={`border-b border-slate-100 dark:border-slate-800/60 last:border-0 ${
                  q.status === "urgent"
                    ? "bg-red-50/70 dark:bg-red-950/20"
                    : q.status === "being-seen"
                    ? "bg-teal-50/40 dark:bg-teal-950/20"
                    : "hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                } transition-colors`}
              >
                <td className="px-3.5 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[q.status] ?? "bg-slate-300"}`} />
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-100 text-xs">{q.ticketNumber}</span>
                  </div>
                </td>
                <td className="px-3.5 py-2.5 font-medium text-slate-800 dark:text-slate-100">{q.visit.patient.nameEn}</td>
                <td className="px-3.5 py-2.5 text-slate-500 dark:text-slate-400 font-mono text-[11px]">{q.visit.patient.healthId}</td>
                <td className="px-3.5 py-2.5">
                  {q.paymentStatus === "paid" && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded font-semibold border border-emerald-200 dark:border-emerald-800/60">
                      Paid ({q.feeAmount} ETB)
                    </span>
                  )}
                  {q.paymentStatus === "emergency_exempt" && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-red-800 dark:text-red-300 bg-red-50 dark:bg-red-950/50 px-1.5 py-0.5 rounded font-medium border border-red-200 dark:border-red-800/60">
                      Deferred
                    </span>
                  )}
                  {q.paymentStatus === "unpaid" && (
                    <span className="inline-flex items-center text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded font-medium border border-amber-200 dark:border-amber-800/60">
                      Unpaid ({q.feeAmount} ETB)
                    </span>
                  )}
                </td>
              </tr>
            ))}

            {filteredQueue.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400 text-xs">
                  {searchQuery ? `No tickets matching "${searchQuery}"` : "No tickets in this view"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
