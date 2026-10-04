"use client";
import Link from "next/link";
import {
  Bell,
  WifiOff,
  Globe,
  LogOut,
  ChevronDown,
  Check,
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
} from "lucide-react";
import { useNovaRole } from "./nova-role-context";
import { ROLES, type Role } from "@/lib/nova-mock-data";
import { ModeToggle } from "@/components/mode-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@my-better-t-app/ui/components/dropdown-menu";
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

const ROLE_DEFAULT_ROUTE: Partial<Record<Role, string>> = {
  "Branch Admin": "/nova/branch-admin",
  "Hospital Admin": "/nova/hospital-admin",
  "Receptionist": "/nova/reception/register",
  "Doctor": "/nova/doctor",
  "Nurse": "/nova/nurse",
  "Lab Technician": "/nova/lab",
  "Pharmacist": "/nova/pharmacy",
  "Billing Officer": "/nova/billing",
  "Referral Coordinator": "/nova/doctor/referral",
  "Ward Manager": "/nova/hospital-admin",
  "Nova Admin": "/nova/hospital-admin",
};

export default function NovaTopbar({ offline = false }: { offline?: boolean }) {
  const { role, setRole, lang, setLang, userName, userInitials, hospitalName } = useNovaRole();
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

  const handleRoleChange = (newRole: Role) => {
    setRole(newRole);
    const target = ROLE_DEFAULT_ROUTE[newRole];
    if (target) {
      router.push(target as any);
    }
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
          <span className="text-slate-700 dark:text-slate-200 font-medium">{hospitalName}</span>
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

          {/* Role selector & Light/Dark Mode toggle adjacent to each other */}
          <div className="flex items-center gap-1.5 pl-0.5">
            {/* Role dropdown switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md border transition-all ${
                      ROLE_CONFIG[role]?.badge ?? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                    }`}
                    title="Active Role — click to switch role"
                  >
                    <CurrentRoleIcon size={13} className="shrink-0" />
                    <span>Role: {role}</span>
                    <ChevronDown size={12} className="opacity-60 shrink-0 ml-0.5" />
                  </button>
                }
              />
              <DropdownMenuContent align="end" className="w-56 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg z-50">
                <div className="px-2 py-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Switch Active Role
                </div>
                {ROLES.map((r) => {
                  const isCurrent = role === r;
                  const itemConfig = ROLE_CONFIG[r];
                  const ItemIcon = itemConfig?.icon ?? ShieldCheck;
                  return (
                    <DropdownMenuItem
                      key={r}
                      onClick={() => handleRoleChange(r)}
                      className={`flex items-center justify-between px-2.5 py-1.5 text-xs rounded-md cursor-pointer transition-colors ${
                        isCurrent
                          ? "bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-semibold"
                          : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <ItemIcon size={14} className={isCurrent ? "text-teal-600 dark:text-teal-400" : "text-slate-400 dark:text-slate-500"} />
                        <span>{r}</span>
                      </span>
                      {isCurrent && <Check size={13} className="text-teal-600 dark:text-teal-400" />}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

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
            <div className="w-7 h-7 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center">
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
