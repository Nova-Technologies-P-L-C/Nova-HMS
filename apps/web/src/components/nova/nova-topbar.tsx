"use client";
import Link from "next/link";
import { Bell, WifiOff, Globe, LogOut } from "lucide-react";
import { useNovaRole } from "./nova-role-context";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { trpc } from "@/utils/trpc";
import { authClient } from "@/lib/auth-client";

export default function NovaTopbar({ offline = false }: { offline?: boolean }) {
  const { lang, setLang, userName, userInitials, hospitalName } = useNovaRole();
  const [showOffline, setShowOffline] = useState(offline);
  const router = useRouter();

  const { data: unreadData } = useQuery({
    ...trpc.notification.unreadCount.queryOptions(),
    retry: false,
  });
  const unread = unreadData?.count ?? 0;

  const handleLogout = async () => {
    await authClient.signOut();
    localStorage.removeItem("nova_tenant_id");
    localStorage.removeItem("nova_tenant_slug");
    localStorage.removeItem("nova_user_role");
    localStorage.removeItem("nova_user_name");
    router.push("/nova/login");
  };

  return (
    <div className="flex flex-col">
      {showOffline && (
        <div className="flex items-center justify-between gap-2 bg-amber-500 text-white px-4 py-1.5 text-sm">
          <span className="flex items-center gap-2">
            <WifiOff size={14} />
            You're offline — some features are limited. Changes will sync when reconnected.
          </span>
          <button onClick={() => setShowOffline(false)} className="text-white/80 hover:text-white text-xs underline">
            Dismiss
          </button>
        </div>
      )}
      <header className="flex items-center justify-between px-5 py-2.5 bg-white border-b border-slate-200 shadow-sm">
        <div className="text-sm text-slate-500">
          <span className="text-slate-400">Nova HMS</span>
          <span className="mx-1 text-slate-300">/</span>
          <span className="text-slate-700 font-medium">{hospitalName}</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Language toggle */}
          <button
            onClick={() => setLang(lang === "en" ? "am" : "en")}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded border border-slate-200 text-slate-600 hover:border-teal-400 hover:text-teal-600 transition-colors"
          >
            <Globe size={13} />
            {lang === "en" ? "English" : "አማርኛ"}
          </button>

          {/* Offline toggle (demo) */}
          <button
            onClick={() => setShowOffline((v) => !v)}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-slate-200 text-slate-500 hover:text-amber-600 hover:border-amber-300 transition-colors"
            title="Toggle offline banner (demo)"
          >
            <WifiOff size={13} />
          </button>

          {/* Notifications */}
          <Link
            href="/nova/shared/notifications"
            className="relative p-1.5 rounded hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <Bell size={18} />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                {unread}
              </span>
            )}
          </Link>

          {/* Avatar + name — real logged-in user */}
          <Link href="/nova/shared/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center">
              {userInitials || "?"}
            </div>
            <span className="text-sm text-slate-700 font-medium">{userName || "—"}</span>
          </Link>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-300 transition-colors"
            title="Sign out"
          >
            <LogOut size={13} />
          </button>
        </div>
      </header>
    </div>
  );
}
