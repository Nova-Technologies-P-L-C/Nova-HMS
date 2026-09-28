"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, createContext, useContext } from "react";
import { Home, Calendar, FlaskConical, Pill, CreditCard, ArrowLeftRight, QrCode, Globe } from "lucide-react";

const LangCtx = createContext<{ lang: "en" | "am"; setLang: (l: "en" | "am") => void }>({ lang: "en", setLang: () => {} });
export const usePatientLang = () => useContext(LangCtx);

const NAV = [
  { href: "/nova/patient", label: "Home", labelAm: "መነሻ", icon: <Home size={20} /> },
  { href: "/nova/patient/appointments", label: "Appointments", labelAm: "ቀጠሮ", icon: <Calendar size={20} /> },
  { href: "/nova/patient/results", label: "Results", labelAm: "ውጤቶች", icon: <FlaskConical size={20} /> },
  { href: "/nova/patient/prescriptions", label: "Medications", labelAm: "መድሃኒቶች", icon: <Pill size={20} /> },
  { href: "/nova/patient/id-card", label: "My ID", labelAm: "መታወቂያ", icon: <QrCode size={20} /> },
];

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<"en" | "am">("en");
  const pathname = usePathname();

  return (
    <LangCtx.Provider value={{ lang, setLang }}>
      <div className="flex flex-col min-h-screen bg-slate-50 max-w-md mx-auto relative">
        {/* Top bar */}
        <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-teal-500 flex items-center justify-center font-bold text-white text-sm">N</div>
            <span className="font-semibold text-slate-800 text-sm">Nova HMS</span>
            <span className="text-xs text-slate-400 ml-1">{lang === "en" ? "Patient Portal" : "የሕሙም መግቢያ"}</span>
          </div>
          <button
            onClick={() => setLang(lang === "en" ? "am" : "en")}
            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded border border-slate-200 text-slate-600 hover:border-teal-400 hover:text-teal-600 transition-colors"
          >
            <Globe size={12} />
            {lang === "en" ? "አማርኛ" : "English"}
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 pb-20">
          {children}
        </main>

        {/* Bottom nav */}
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-200 flex z-10">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href as any}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs transition-colors ${active ? "text-teal-600" : "text-slate-400 hover:text-slate-600"}`}
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
