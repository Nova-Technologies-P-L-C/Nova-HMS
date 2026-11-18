"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { PageShell, Card } from "@/components/nova/nova-ui";
import {
  Bell,
  Mail,
  MessageSquare,
  WifiOff,
  FlaskConical,
  Pill,
  CreditCard,
  Activity,
  AlertCircle,
  Sparkles,
  CheckCheck,
} from "lucide-react";

const TYPE_ICON: Record<string, React.ReactNode> = {
  "in-app": <Bell size={14} className="text-teal-600" />,
  "clinical": <Activity size={14} className="text-blue-600" />,
  "lab": <FlaskConical size={14} className="text-purple-600" />,
  "pharmacy": <Pill size={14} className="text-amber-600" />,
  "billing": <CreditCard size={14} className="text-emerald-600" />,
  "emergency": <AlertCircle size={14} className="text-red-600" />,
  "email": <Mail size={14} className="text-blue-600" />,
  "sms-queued": <MessageSquare size={14} className="text-amber-500" />,
};

const TYPE_LABEL: Record<string, string> = {
  "in-app": "In-app",
  "clinical": "Clinical OPD",
  "lab": "Laboratory",
  "pharmacy": "Pharmacy",
  "billing": "Billing & Cashier",
  "emergency": "Emergency Alert",
  "email": "Email sent",
  "sms-queued": "SMS queued (offline)",
};

export default function NotificationsPage() {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const qc = useQueryClient();

  const { data: notifications = [] } = useQuery({
    ...trpc.notification.list.queryOptions(),
    refetchInterval: 5000,
  });

  const markAllRead = useMutation(
    trpc.notification.markAllRead.mutationOptions({
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: trpc.notification.list.queryKey() });
        qc.invalidateQueries({ queryKey: trpc.notification.unreadCount.queryKey() });
      },
    })
  );

  const markReadMutation = useMutation(
    trpc.notification.markRead.mutationOptions({
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: trpc.notification.list.queryKey() });
        qc.invalidateQueries({ queryKey: trpc.notification.unreadCount.queryKey() });
      },
    })
  );

  const sendTestMutation = useMutation(
    trpc.notification.sendTest.mutationOptions({
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: trpc.notification.list.queryKey() });
        qc.invalidateQueries({ queryKey: trpc.notification.unreadCount.queryKey() });
      },
    })
  );

  const markAll = () => markAllRead.mutate();
  const markRead = (id: string) => markReadMutation.mutate({ id });

  const shown = filter === "unread" ? notifications.filter((n) => !n.read) : notifications;
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <PageShell
      title="Notification Center"
      subtitle={`${unread} unread station notifications`}
      action={
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              sendTestMutation.mutate({
                title: "Live Notification Test",
                body: "Verification alert: Toast banner and sound chime are operating properly.",
                type: "in-app",
              })
            }
            disabled={sendTestMutation.isPending}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-teal-500 hover:text-teal-600 transition flex items-center gap-1 shadow-2xs cursor-pointer"
          >
            <Sparkles size={12} className="text-teal-600" />
            <span>Send Test Alert</span>
          </button>

          {unread > 0 && (
            <button
              onClick={markAll}
              disabled={markAllRead.isPending}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition flex items-center gap-1 shadow-2xs cursor-pointer"
            >
              <CheckCheck size={13} />
              <span>Mark all read</span>
            </button>
          )}
        </div>
      }
    >
      {/* Legend for offline SMS */}
      <div className="flex items-center gap-2 mb-5 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-700 dark:text-amber-300 shadow-2xs">
        <WifiOff size={13} className="shrink-0" />
        <span>SMS notifications marked <strong>"queued (offline)"</strong> will be dispatched automatically once local mini-server internet reconnects.</span>
      </div>

      <div className="flex gap-1.5 mb-4">
        {(["all", "unread"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg capitalize transition cursor-pointer ${
              filter === f
                ? "bg-teal-600 text-white shadow-2xs"
                : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-teal-400"
            }`}
          >
            {f === "all" ? `All (${notifications.length})` : `Unread (${unread})`}
          </button>
        ))}
      </div>

      {shown.length === 0 && (
        <Card className="p-10 text-center text-slate-400 dark:text-slate-500">
          <Bell size={32} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
          <p className="font-semibold text-sm text-slate-700 dark:text-slate-300">No notifications</p>
          <p className="text-xs text-slate-400 mt-1">You are all caught up across all station queues.</p>
        </Card>
      )}

      <div className="space-y-2">
        {shown.map((n) => (
          <Card
            key={n.id}
            className={`p-4 transition-colors ${
              !n.read
                ? "border-teal-200 dark:border-teal-800/60 bg-teal-50/40 dark:bg-teal-950/20 shadow-xs"
                : ""
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="mt-0.5 shrink-0 text-slate-600 dark:text-slate-400">
                  {TYPE_ICON[n.type] ?? <Bell size={14} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{n.title}</p>
                    {!n.read && <span className="w-2 h-2 bg-teal-500 rounded-full shrink-0" />}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{n.body}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                      {new Date(n.createdAt).toLocaleString()}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded uppercase">
                      {TYPE_LABEL[n.type] ?? n.type}
                    </span>
                    {n.type === "sms-queued" && (
                      <span className="text-[10px] px-2 py-0.5 bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-300 rounded flex items-center gap-1 font-semibold">
                        <WifiOff size={10} /> Queued
                      </span>
                    )}

                    {/* Deep links */}
                    {(n.title.toLowerCase().includes("lab result") || n.title.toLowerCase().includes("result ready") || n.type === "lab") && (
                      <Link
                        href="/nova/lab/result"
                        className="text-xs px-2.5 py-0.5 bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-900 transition font-medium"
                      >
                        View lab queue →
                      </Link>
                    )}
                    {(n.title.toLowerCase().includes("prescription") || n.type === "pharmacy") && (
                      <Link
                        href="/nova/pharmacy"
                        className="text-xs px-2.5 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded hover:bg-amber-200 dark:hover:bg-amber-900 transition font-medium"
                      >
                        View Rx dispensary →
                      </Link>
                    )}
                    {(n.title.toLowerCase().includes("billing") || n.title.toLowerCase().includes("checkout") || n.type === "billing") && (
                      <Link
                        href="/nova/billing"
                        className="text-xs px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded hover:bg-emerald-200 dark:hover:bg-emerald-900 transition font-medium"
                      >
                        Open cashier counter →
                      </Link>
                    )}
                    {n.type === "clinical" && (
                      <Link
                        href="/nova/doctor"
                        className="text-xs px-2.5 py-0.5 bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900 transition font-medium"
                      >
                        Open consultation queue →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
              {!n.read && (
                <button
                  onClick={() => markRead(n.id)}
                  disabled={markReadMutation.isPending}
                  className="text-xs text-slate-400 dark:text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 shrink-0 whitespace-nowrap px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Mark read
                </button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
