"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { toast } from "sonner";
import {
  Bell,
  CheckCheck,
  Check,
  ExternalLink,
  FlaskConical,
  Pill,
  CreditCard,
  Activity,
  Sparkles,
  Clock,
  X,
  Send,
  ShieldAlert,
} from "lucide-react";
import { useNovaRole } from "./nova-role-context";

/**
 * Synthesizes a soft, pleasant 2-tone audio chime using the Web Audio API
 * (100% offline, zero external sound files required)
 */
function playNotificationChime() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // High harmonic tone 1 (523Hz - C5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(523.25, now);
    gain1.gain.setValueAtTime(0.14, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.18);

    // Harmonic tone 2 (659Hz - E5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(659.25, now + 0.08);
    gain2.gain.setValueAtTime(0.14, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.3);
  } catch {
    // Autoplay restrictions before user interaction - fail gracefully
  }
}

const TYPE_CONFIG: Record<
  string,
  { label: string; badgeCls: string; icon: string; path?: string }
> = {
  emergency: {
    label: "EMERGENCY",
    badgeCls: "bg-red-500 text-white",
    icon: "🚨",
    path: "/nova/doctor",
  },
  clinical: {
    label: "CLINICAL QUEUE",
    badgeCls: "bg-blue-500 text-white",
    icon: "🩺",
    path: "/nova/doctor",
  },
  lab: {
    label: "LABORATORY",
    badgeCls: "bg-purple-600 text-white",
    icon: "🔬",
    path: "/nova/lab/result",
  },
  pharmacy: {
    label: "PHARMACY",
    badgeCls: "bg-amber-600 text-white",
    icon: "💊",
    path: "/nova/pharmacy",
  },
  billing: {
    label: "BILLING & CASHIER",
    badgeCls: "bg-emerald-600 text-white",
    icon: "💳",
    path: "/nova/billing",
  },
  "in-app": {
    label: "STATION NOTICE",
    badgeCls: "bg-teal-600 text-white",
    icon: "🔔",
    path: "/nova/shared/notifications",
  },
};

function formatTimeAgo(dateStr: string | Date): string {
  const d = new Date(dateStr);
  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function NotificationPopover() {
  const { role } = useNovaRole();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const qc = useQueryClient();

  // Polling query: fetches latest notifications every 5 seconds for real-time delivery
  const { data: notifications = [] } = useQuery({
    ...trpc.notification.list.queryOptions(),
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  const { data: unreadData } = useQuery({
    ...trpc.notification.unreadCount.queryOptions(),
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  const unreadCount = unreadData?.count ?? notifications.filter((n) => !n.read).length;

  // Track seen notifications so we only trigger toasts for truly NEW incoming notifications
  const initializedRef = useRef(false);
  const seenIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!notifications.length) {
      initializedRef.current = true;
      return;
    }

    if (!initializedRef.current) {
      // First load: seed the seen IDs without spamming historical toasts
      notifications.forEach((n) => seenIdsRef.current.add(n.id));
      initializedRef.current = true;
      return;
    }

    // Inspect if new unread notifications arrived
    const newUnread = notifications.filter((n) => !n.read && !seenIdsRef.current.has(n.id));

    if (newUnread.length > 0) {
      newUnread.forEach((n) => {
        seenIdsRef.current.add(n.id);
        const config = TYPE_CONFIG[n.type] ?? TYPE_CONFIG["in-app"]!;
        playNotificationChime();

        toast.custom(
          (t) => (
            <div
              className={`w-full max-w-sm rounded-xl p-3.5 shadow-2xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex flex-col gap-2 animate-in slide-in-from-top-3 ${
                n.type === "emergency" ? "ring-2 ring-red-500" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-base shrink-0">{config.icon}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide uppercase ${config.badgeCls}`}>
                    {config.label}
                  </span>
                </div>
                <button
                  onClick={() => toast.dismiss(t)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
                >
                  <X size={13} />
                </button>
              </div>

              <div>
                <h4 className="font-bold text-xs text-slate-900 dark:text-white leading-tight">
                  {n.title}
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2">
                  {n.body}
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => toast.dismiss(t)}
                  className="text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium px-2 py-0.5 rounded cursor-pointer"
                >
                  Dismiss
                </button>
                {config.path && (
                  <button
                    onClick={() => {
                      toast.dismiss(t);
                      const targetPath = (n.type === "lab" && role === "Doctor") ? "/nova/doctor" : config.path;
                      router.push(targetPath as any);
                    }}
                    className="text-[11px] font-semibold bg-teal-600 hover:bg-teal-700 text-white px-2.5 py-0.5 rounded-md transition shadow-2xs flex items-center gap-1 cursor-pointer"
                  >
                    <span>{n.type === "lab" && role === "Doctor" ? "Review in Queue" : "Open Station"}</span>
                    <ExternalLink size={10} />
                  </button>
                )}
              </div>
            </div>
          ),
          { duration: n.type === "emergency" ? 10000 : 6000 }
        );
      });
    }
  }, [notifications, router]);

  // Outside click listener to close popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Mutations
  const markReadMutation = useMutation(
    trpc.notification.markRead.mutationOptions({
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: trpc.notification.list.queryKey() });
        qc.invalidateQueries({ queryKey: trpc.notification.unreadCount.queryKey() });
      },
    })
  );

  const markAllReadMutation = useMutation(
    trpc.notification.markAllRead.mutationOptions({
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

  const handleSendTestAlert = (type: "clinical" | "lab" | "pharmacy" | "billing" | "emergency") => {
    const samples = {
      clinical: { title: "New Patient in OPD Queue", body: "Ticket A-005 queued for consultation in Room 102." },
      lab: { title: "Urgent Lab Result Verified", body: "Complete Blood Count for Aster Bedada is ready. Normal range." },
      pharmacy: { title: "Prescription Ready for Dispense", body: "Amoxicillin 500mg (3x/day, 7d) awaiting patient pickup." },
      billing: { title: "Cashier Settlement Confirmed", body: "Receipt RCP-2026-00042 settled via Telebirr. All orders cleared." },
      emergency: { title: "🚨 Trauma Alert — Inbound Patient", body: "Emergency patient arrived with severe vitals. Direct to Station." },
    };
    const s = samples[type];
    sendTestMutation.mutate({
      title: s.title,
      body: s.body,
      type,
    });
  };

  const recentList = notifications.slice(0, 7);

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer flex items-center justify-center"
        title="Notification Center & Live Station Alerts"
        aria-label="Open notifications"
      >
        <Bell size={18} className={unreadCount > 0 ? "text-slate-800 dark:text-slate-100" : ""} />

        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-red-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold shadow-xs animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 origin-top-right">
          {/* Popover Header */}
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-slate-800 dark:text-slate-100">
                Hospital Alerts &amp; Queue
              </span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300">
                  {unreadCount} unread
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllReadMutation.mutate()}
                  disabled={markAllReadMutation.isPending}
                  className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline font-medium flex items-center gap-1 cursor-pointer"
                  title="Mark all as read"
                >
                  <CheckCheck size={12} />
                  <span>Mark all read</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Quick Demo Test Trigger Bar */}
          <div className="px-3 py-1.5 bg-slate-100/70 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
            <span className="font-medium flex items-center gap-1">
              <Sparkles size={11} className="text-teal-600" />
              Test live alerts:
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleSendTestAlert("clinical")}
                className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-teal-500 text-[10px] font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                title="Send OPD alert"
              >
                OPD
              </button>
              <button
                onClick={() => handleSendTestAlert("lab")}
                className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-purple-500 text-[10px] font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                title="Send Lab alert"
              >
                Lab
              </button>
              <button
                onClick={() => handleSendTestAlert("pharmacy")}
                className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-amber-500 text-[10px] font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                title="Send Pharmacy alert"
              >
                Rx
              </button>
              <button
                onClick={() => handleSendTestAlert("billing")}
                className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 text-[10px] font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                title="Send Billing alert"
              >
                Cashier
              </button>
              <button
                onClick={() => handleSendTestAlert("emergency")}
                className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800 text-[10px] font-bold cursor-pointer"
                title="Send Emergency alert"
              >
                🚨
              </button>
            </div>
          </div>

          {/* Notifications Scroll List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {recentList.length === 0 ? (
              <div className="py-10 px-4 text-center">
                <Bell size={28} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  All caught up!
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  No notifications or station alerts at this moment.
                </p>
              </div>
            ) : (
              recentList.map((n) => {
                const config = TYPE_CONFIG[n.type] ?? TYPE_CONFIG["in-app"]!;
                return (
                  <div
                    key={n.id}
                    className={`p-3.5 flex items-start justify-between gap-3 transition-colors ${
                      !n.read
                        ? "bg-teal-50/40 dark:bg-teal-950/20"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      <span className="text-lg shrink-0 mt-0.5">{config.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wide uppercase ${config.badgeCls}`}
                          >
                            {config.label}
                          </span>
                          {!n.read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
                          )}
                          <span className="text-[10px] text-slate-400 ml-auto flex items-center gap-0.5">
                            <Clock size={10} />
                            {formatTimeAgo(n.createdAt)}
                          </span>
                        </div>

                        <h5 className="font-semibold text-xs text-slate-800 dark:text-slate-100 leading-snug">
                          {n.title}
                        </h5>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2">
                          {n.body}
                        </p>

                        {/* Station Quick Links */}
                        {config.path && (
                          <div className="mt-2">
                            <button
                              onClick={() => {
                                setIsOpen(false);
                                if (!n.read) markReadMutation.mutate({ id: n.id });
                                const targetPath = (n.type === "lab" && role === "Doctor") ? "/nova/doctor" : config.path;
                                router.push(targetPath as any);
                              }}
                              className="text-[10px] font-semibold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <span>{n.type === "lab" && role === "Doctor" ? "Review in Doctor Queue" : `Navigate to ${config.label}`}</span>
                              <ExternalLink size={10} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {!n.read && (
                      <button
                        onClick={() => markReadMutation.mutate({ id: n.id })}
                        disabled={markReadMutation.isPending}
                        className="text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 cursor-pointer"
                        title="Mark as read"
                      >
                        <Check size={14} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Popover Footer */}
          <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <Link
              href="/nova/shared/notifications"
              onClick={() => setIsOpen(false)}
              className="text-teal-600 dark:text-teal-400 hover:underline font-semibold flex items-center gap-1"
            >
              <span>View Full History ({notifications.length})</span>
              <ExternalLink size={11} />
            </Link>

            <span className="text-[10px] text-slate-400 font-medium">
              Live sync active
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
