"use client";
import Link from "next/link";
import {
  Bell,
  WifiOff,
  Globe,
  LogOut,
  ShieldCheck,
  Stethoscope,
  Activity,
  User,
  FlaskConical,
  Pill,
  CreditCard,
  ArrowLeftRight,
  Bed,
  Shield,
  Crown,
} from "lucide-react";
import { useNovaRole } from "./nova-role-context";
import { useNovaTheme } from "./nova-theme-context";
import { type Role } from "@/lib/nova-mock-data";
import { ModeToggle } from "@/components/mode-toggle";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { trpc } from "@/utils/trpc";
import { authClient } from "@/lib/auth-client";

const ROLE_CONFIG: Record<
  Role,
  {
    icon: React.ComponentType<{ className?: string; size?: number }>;
    badge: string;
  }
> = {
  "Organizational Admin": {
    icon: Crown,
    badge: "bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700 hover:bg-amber-200 font-semibold shadow-xs",
  },
  "Branch Admin": {
    icon: ShieldCheck,
    badge: "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50",
  },
  "Hospital Admin": {
    icon: ShieldCheck,
    badge: "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50",
  },
  "Receptionist": {
    icon: User,
    badge: "bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800 hover:bg-cyan-100 dark:hover:bg-cyan-900/50",
  },
  "Doctor": {
    icon: Stethoscope,
    badge: "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50",
  },
  "Triage Nurse": {
    icon: Activity,
    badge: "bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900/50",
  },
  "Ward Nurse": {
    icon: Bed,
    badge: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50",
  },
  "Nurse": {
    icon: Activity,
    badge: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50",
  },
  "Lab Technician": {
    icon: FlaskConical,
    badge: "bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/50",
  },
  "Pharmacist": {
    icon: Pill,
    badge: "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/50",
  },
  "Billing Officer": {
    icon: CreditCard,
    badge: "bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900/50",
  },
  "Accountant": {
    icon: CreditCard,
    badge: "bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900/50",
  },
  "Referral Coordinator": {
    icon: ArrowLeftRight,
    badge: "bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800 hover:bg-sky-100 dark:hover:bg-sky-900/50",
  },
  "Ward Manager": {
    icon: Bed,
    badge: "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/50",
  },
  "Nova Admin": {
    icon: Shield,
    badge: "bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/50",
  },
};

export default function NovaTopbar({ offline = false }: { offline?: boolean }) {
  const { role, lang, setLang, userName, userInitials, hospitalName } = useNovaRole();
  const { theme } = useNovaTheme();
  const [showOffline, setShowOffline] = useState(offline);
  const router = useRouter();

  const { data: unreadData } = useQuery({
    ...trpc.notification.unreadCount.queryOptions(),
    retry: false,
  });
  const unread = unreadData?.count ?? 0;

  const handleLogout = async () => {
    await authClient.signOut();
    sessionStorage.removeItem("nova_tenant_id");
    sessionStorage.removeItem("nova_tenant_slug");
    sessionStorage.removeItem("nova_user_role");
    sessionStorage.removeItem("nova_user_name");
    router.push("/nova/login");
  };

  const CurrentRoleIcon = ROLE_CONFIG[role]?.icon ?? ShieldCheck;

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
      <header className="flex items-center justify-between px-5 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
        <div className="text-sm text-slate-500 dark:text-slate-400">
          <span className="text-slate-400 dark:text-slate-500">Nova HMS</span>
          <span className="mx-1 text-slate-300 dark:text-slate-600">/</span>
          <span className="text-slate-700 dark:text-slate-200 font-medium">{theme.hospitalName || hospitalName}</span>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Language toggle */}
          <button
            onClick={() => setLang(lang === "en" ? "am" : "en")}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-teal-400 dark:hover:border-teal-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
          >
            <Globe size={13} />
            {lang === "en" ? "English" : "አማርኛ"}
          </button>

          {/* Assigned Role Badge & Light/Dark Mode toggle */}
          <div className="flex items-center gap-1.5 pl-0.5">
            {/* Read-only official assigned role badge */}
            <div
              className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md border select-none ${
                ROLE_CONFIG[role]?.badge ?? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"
              }`}
              title={`Assigned Station Role: ${role}`}
            >
              <CurrentRoleIcon size={13} className="shrink-0" />
              <span>Role: {role}</span>
            </div>

            {/* Light / Dark Mode Toggle right next to the role */}
            <ModeToggle />
          </div>

          {/* Offline toggle (demo) */}
          <button
            onClick={() => setShowOffline((v) => !v)}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-300 transition-colors"
            title="Toggle offline banner (demo)"
          >
            <WifiOff size={13} />
          </button>

          {/* Notifications */}
          <Link
            href="/nova/shared/notifications"
            className="relative p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
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
            <div
              className="w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center shadow-xs"
              style={{ backgroundColor: theme.primaryColor }}
            >
              {userInitials || "?"}
            </div>
            <span className="text-sm text-slate-700 dark:text-slate-200 font-medium">{userName || "—"}</span>
          </Link>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-red-600 hover:border-red-300 transition-colors"
            title="Sign out"
          >
            <LogOut size={13} />
          </button>
        </div>
      </header>
    </div>
  );
}
