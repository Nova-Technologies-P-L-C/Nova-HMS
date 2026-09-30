"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, createContext, useContext, useEffect } from "react";
import {
  Home,
  Calendar,
  FlaskConical,
  Pill,
  QrCode,
  Globe,
  LogOut,
  Loader2,
} from "lucide-react";
import {
  PatientAuthProvider,
  usePatientAuth,
} from "./patient-auth-context";

const LangCtx = createContext<{
  lang: "en" | "am";
  setLang: (l: "en" | "am") => void;
}>({ lang: "en", setLang: () => {} });
export const usePatientLang = () => useContext(LangCtx);

const NAV = [
  { href: "/nova/patient", label: "Home", labelAm: "መነሻ", icon: <Home size={19} /> },
  { href: "/nova/patient/appointments", label: "Appointments", labelAm: "ቀጠሮ", icon: <Calendar size={19} /> },
  { href: "/nova/patient/results", label: "Results", labelAm: "ውጤቶች", icon: <FlaskConical size={19} /> },
  { href: "/nova/patient/prescriptions", label: "Medications", labelAm: "መድሃኒቶች", icon: <Pill size={19} /> },
  { href: "/nova/patient/id-card", label: "My ID", labelAm: "መታወቂያ", icon: <QrCode size={19} /> },
];

function PatientLayoutInner({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<"en" | "am">("en");
  const pathname = usePathname();
  const router = useRouter();
  const { patient, isAuthenticated, isLoading, logout } = usePatientAuth();

  const isLoginPage = pathname === "/nova/patient/login";

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isLoginPage) {
      router.replace("/nova/patient/login" as any);
    }
  }, [isLoading, isAuthenticated, isLoginPage, router]);

  // If on login page, render login without portal navigation chrome
  if (isLoginPage) {
    return <LangCtx.Provider value={{ lang, setLang }}>{children}</LangCtx.Provider>;
  }

  // Loading state while checking patient session
  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white">
        <Loader2 size={32} className="animate-spin text-teal-400 mb-3" />
        <p className="text-xs text-slate-400 font-medium">Verifying Patient Portal Access…</p>
      </div>
    );
  }

  return (
    <LangCtx.Provider value={{ lang, setLang }}>
      <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 max-w-md mx-auto relative shadow-2xl">
        {/* Top bar */}
        <header className="flex items-center justify-between px-4 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-teal-500 flex items-center justify-center font-black text-white text-xs shrink-0 shadow-xs">
              N
            </div>
            <div className="min-w-0">
              <span className="font-bold text-slate-800 dark:text-slate-100 text-xs block leading-tight">
                Nova HMS
              </span>
              <span className="text-[10px] text-teal-600 dark:text-teal-400 font-medium truncate block">
                {patient?.name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Language toggle */}
            <button
              type="button"
              onClick={() => setLang(lang === "en" ? "am" : "en")}
              className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-teal-400 dark:hover:border-teal-500 transition-colors"
            >
              <Globe size={11} />
              <span>{lang === "en" ? "አማርኛ" : "En"}</span>
            </button>

            {/* Logout button */}
            <button
              type="button"
              onClick={logout}
              title="Sign Out of Patient Portal"
              className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors font-medium"
            >
              <LogOut size={11} />
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 pb-20">{children}</main>

        {/* Bottom nav */}
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex z-20 shadow-lg">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href as any}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] transition-colors ${
                  active
                    ? "text-teal-600 dark:text-teal-400 font-semibold"
                    : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                }`}
              >
                {item.icon}
                <span>{lang === "en" ? item.label : item.labelAm}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </LangCtx.Provider>
  );
}

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  return (
    <PatientAuthProvider>
      <PatientLayoutInner>{children}</PatientLayoutInner>
    </PatientAuthProvider>
  );
}
