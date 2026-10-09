"use client";
import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { PageShell, Card } from "@/components/nova/nova-ui";
import { Bell, Mail, MessageSquare, WifiOff } from "lucide-react";

const TYPE_ICON: Record<string, React.ReactNode> = {
  "in-app": <Bell size={14} className="text-teal-600" />,
  "email": <Mail size={14} className="text-blue-600" />,
  "sms-queued": <MessageSquare size={14} className="text-amber-500" />,
};
const TYPE_LABEL: Record<string, string> = {
  "in-app": "In-app",
  "email": "Email sent",
  "sms-queued": "SMS queued (offline)",
};

export default function NotificationsPage() {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const qc = useQueryClient();
  const { data: notifications = [] } = useQuery(trpc.notification.list.queryOptions());
  const markAllRead = useMutation(trpc.notification.markAllRead.mutationOptions({
    onSuccess: () => qc.invalidateQueries({ queryKey: trpc.notification.list.queryKey() }),
  }));
  const markReadMutation = useMutation(trpc.notification.markRead.mutationOptions({
    onSuccess: () => qc.invalidateQueries({ queryKey: trpc.notification.list.queryKey() }),
  }));

  const markAll = () => markAllRead.mutate();
  const markRead = (id: string) => markReadMutation.mutate({ id });

  const shown = filter === "unread" ? notifications.filter((n) => !n.read) : notifications;
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <PageShell
      title="Notification Center"
      subtitle={`${unread} unread`}
      action={
        <button onClick={markAll} className="text-xs text-teal-600 hover:underline">Mark all as read</button>
      }
    >
      {/* Legend for offline SMS */}
      <div className="flex items-center gap-2 mb-5 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-700 dark:text-amber-300">
        <WifiOff size={13} />
        <span>SMS notifications marked <strong>"queued (offline)"</strong> will be sent automatically once this device reconnects.</span>
      </div>

      <div className="flex gap-1 mb-4">
        {(["all", "unread"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 text-sm rounded capitalize transition-colors ${filter === f ? "bg-teal-600 text-white" : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-teal-400"}`}>
            {f === "all" ? `All (${notifications.length})` : `Unread (${unread})`}
          </button>
        ))}
      </div>

      {shown.length === 0 && (
        <Card className="p-10 text-center text-slate-400 dark:text-slate-500">
          <Bell size={32} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
          <p className="font-medium">No notifications</p>
        </Card>
      )}

      <div className="space-y-2">
        {shown.map((n) => (
          <Card key={n.id} className={`p-4 transition-colors ${!n.read ? "border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/40" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                <div className="mt-0.5 shrink-0 text-slate-600 dark:text-slate-400">{TYPE_ICON[n.type] ?? <Bell size={14} />}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{n.title}</p>
                    {!n.read && <span className="w-1.5 h-1.5 bg-teal-500 rounded-full shrink-0" />}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{n.body}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-slate-400 dark:text-slate-500">{new Date(n.createdAt).toLocaleString()}</span>
                    <span className="text-xs px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded">{TYPE_LABEL[n.type] ?? n.type}</span>
                    {n.type === "sms-queued" && (
                      <span className="text-xs px-1.5 py-0.5 bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-300 rounded flex items-center gap-1">
                        <WifiOff size={10} /> Queued
                      </span>
                    )}
                    {/* Deep link for lab results */}
                    {(n.title.toLowerCase().includes("lab result") || n.title.toLowerCase().includes("result ready")) && (
                      <Link href="/nova/lab/result" className="text-xs px-2 py-0.5 bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 rounded hover:bg-teal-200 dark:hover:bg-teal-800 transition-colors">
                        View lab queue →
                      </Link>
                    )}
                    {/* Deep link for prescriptions */}
                    {n.title.toLowerCase().includes("prescription") && (
                      <Link href="/nova/pharmacy" className="text-xs px-2 py-0.5 bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 rounded hover:bg-teal-200 dark:hover:bg-teal-800 transition-colors">
                        View Rx queue →
                      </Link>
                    )}
                    {/* Deep link for referrals */}
                    {n.title.toLowerCase().includes("referral") && (
                      <Link href="/nova/referral" className="text-xs px-2 py-0.5 bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 rounded hover:bg-teal-200 dark:hover:bg-teal-800 transition-colors">
                        View referrals →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
              {!n.read && (
                <button onClick={() => markRead(n.id)} className="text-xs text-slate-400 dark:text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 shrink-0 whitespace-nowrap">Mark read</button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
