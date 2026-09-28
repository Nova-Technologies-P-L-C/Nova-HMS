"use client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import Link from "next/link";
import { trpc, queryClient } from "@/utils/trpc";
import { PageShell, StatusBadge } from "@/components/nova/nova-ui";
import { Monitor } from "lucide-react";

const STATUS_DOT: Record<string, string> = {
  "being-seen": "bg-teal-500",
  waiting: "bg-amber-400",
  urgent: "bg-red-500",
  done: "bg-slate-300",
};

export default function OPDQueueBoardPage() {
  const [fullscreen, setFullscreen] = useState(false);

  const { data: queue = [], refetch } = useQuery({
    ...trpc.visit.queue.queryOptions(),
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  const updateStatus = useMutation({
    ...trpc.visit.updateTicketStatus.mutationOptions(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: trpc.visit.queue.queryKey() }),
  });

  const now = queue.filter((q) => q.status === "being-seen");
  const waiting = queue.filter((q) => q.status === "waiting" || q.status === "urgent");
  const done = queue.filter((q) => q.status === "done");

  if (fullscreen) {
    return (
      <div className="h-full bg-[#0a1929] p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-teal-500 flex items-center justify-center font-bold text-white">N</div>
            <div>
              <p className="text-white font-semibold">Nova HMS — OPD Queue</p>
              <p className="text-slate-400 text-xs">{new Date().toLocaleTimeString()}</p>
            </div>
          </div>
          <button onClick={() => setFullscreen(false)} className="text-xs text-slate-400 hover:text-white px-3 py-1.5 border border-slate-700 rounded">Exit display</button>
        </div>
        {now.length > 0 && (
          <div className="mb-6">
            <p className="text-slate-400 text-xs uppercase tracking-widest mb-3">Now serving / አሁን እየተገለገሉ</p>
            <div className="grid grid-cols-2 gap-4">
              {now.map((q) => (
                <div key={q.id} className="bg-teal-600 rounded-2xl p-6">
                  <p className="text-4xl font-black text-white">{q.ticketNumber}</p>
                  <p className="text-teal-100 text-lg mt-1">{q.visit.patient.nameEn}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        <p className="text-slate-400 text-xs uppercase tracking-widest mb-3">Queue / ወረፋ</p>
        <div className="grid grid-cols-3 gap-3">
          {waiting.map((q) => (
            <div key={q.id} className={`rounded-xl p-4 ${q.status === "urgent" ? "bg-red-900/40 border border-red-600" : "bg-slate-800"}`}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-2xl font-bold text-white">{q.ticketNumber}</p>
                {q.status === "urgent" && <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">URGENT</span>}
              </div>
              <p className="text-slate-300 text-sm">{q.visit.patient.nameEn}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <PageShell
      title="OPD Queue Board"
      subtitle={`${waiting.length} waiting · ${now.length} being seen · ${done.length} done`}
      action={
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="px-3 py-2 bg-white border border-slate-200 text-slate-700 text-sm rounded hover:border-teal-400">↻ Refresh</button>
          <Link href="/nova/reception/register" className="px-3 py-2 bg-white border border-slate-200 text-slate-700 text-sm rounded hover:border-teal-400">+ Register patient</Link>
          <button onClick={() => setFullscreen(true)} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm rounded hover:bg-teal-700 font-medium">
            <Monitor size={15} /> Kiosk display
          </button>
        </div>
      }
    >
      <div className="flex items-center gap-2 mb-5 text-xs text-slate-500">
        <span className="px-2 py-1 bg-slate-200 text-slate-600 rounded">1 Register</span>
        <span className="text-slate-300">→</span>
        <span className="px-2 py-1 bg-teal-600 text-white rounded font-medium">2 Queue</span>
        <span className="text-slate-300">→</span>
        <span className="px-2 py-1 bg-slate-100 rounded">3 Triage</span>
        <span className="text-slate-300">→</span>
        <span className="px-2 py-1 bg-slate-100 rounded">4 Doctor</span>
        <span className="text-slate-300">→</span>
        <span className="px-2 py-1 bg-slate-100 rounded">5 Billing</span>
      </div>

      {now.map((q) => (
        <div key={q.id} className="flex items-center gap-4 p-4 bg-teal-600 text-white rounded-xl mb-5">
          <div>
            <p className="text-xs text-teal-100 uppercase tracking-wide">Now serving</p>
            <p className="text-3xl font-black">{q.ticketNumber}</p>
          </div>
          <div className="border-l border-teal-500 pl-4">
            <p className="text-lg font-semibold">{q.visit.patient.nameEn}</p>
            <p className="text-teal-100 text-sm">{q.visit.patient.healthId}</p>
          </div>
        </div>
      ))}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {["Ticket", "Patient", "Health ID", "CBHI", "Status", "Actions"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {queue.map((q) => (
              <tr key={q.id} className={`border-b border-slate-100 last:border-0 ${q.status === "urgent" ? "bg-red-50" : "hover:bg-slate-50"}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[q.status] ?? "bg-slate-300"}`} />
                    <span className="font-mono font-bold text-slate-800">{q.ticketNumber}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-medium text-slate-800">{q.visit.patient.nameEn}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{q.visit.patient.healthId}</td>
                <td className="px-4 py-3 text-xs">
                  {q.visit.patient.cbhiStatus
                    ? <span className="text-teal-600">✓ CBHI</span>
                    : <span className="text-slate-400">Self-pay</span>}
                </td>
                <td className="px-4 py-3"><StatusBadge status={q.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 flex-wrap">
                    {q.status === "waiting" && (
                      <>
                        <button
                          onClick={() => updateStatus.mutate({ ticketId: q.id, status: "being-seen" })}
                          className="text-xs px-2 py-1 bg-teal-50 text-teal-700 rounded hover:bg-teal-100 border border-teal-200"
                        >
                          Call in
                        </button>
                        <Link
                          href={`/nova/nurse/vitals?visitId=${q.visitId}`}
                          className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 border border-blue-200"
                        >
                          Triage →
                        </Link>
                      </>
                    )}
                    {q.status === "urgent" && (
                      <button
                        onClick={() => updateStatus.mutate({ ticketId: q.id, status: "being-seen" })}
                        className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        Urgent — call in
                      </button>
                    )}
                    {q.status === "being-seen" && (
                      <button
                        onClick={() => updateStatus.mutate({ ticketId: q.id, status: "done" })}
                        className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200"
                      >
                        Mark done
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {queue.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400 text-sm">No patients in queue today</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex gap-3">
        <Link href="/nova/nurse/vitals" className="text-sm px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Go to Nurse Triage →
        </Link>
        <Link href="/nova/doctor" className="text-sm px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded hover:border-teal-400">
          Doctor queue →
        </Link>
      </div>
    </PageShell>
  );
}
