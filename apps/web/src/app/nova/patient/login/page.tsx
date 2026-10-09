"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePatientAuth } from "../patient-auth-context";
import { PATIENTS } from "@/lib/nova-mock-data";
import {
  ShieldCheck,
  Phone,
  User,
  AlertCircle,
  ArrowRight,
  Globe,
  Sparkles,
  Lock,
  Hospital,
} from "lucide-react";

export default function PatientLoginPage() {
  const router = useRouter();
  const { login } = usePatientAuth();

  const [lang, setLang] = useState<"en" | "am">("en");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const t = (en: string, am: string) => (lang === "en" ? en : am);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await login(phone, name);
      if (res.success) {
        router.replace("/nova/patient" as any);
      } else {
        setError(res.error || "Authentication failed. Patient record not found.");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const fillQuickDemo = (demoName: string, demoPhone: string) => {
    setName(demoName);
    setPhone(demoPhone);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-[#0a1b29] to-[#0c2436] flex flex-col justify-between p-4 md:p-6 text-slate-100">
      {/* Top Header */}
      <div className="w-full max-w-md mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-teal-500 flex items-center justify-center font-black text-white text-base shadow-sm">
            N
          </div>
          <div>
            <span className="font-extrabold text-sm text-white block leading-none">Nova HMS</span>
            <span className="text-[10px] text-teal-300 font-medium">Debre Markos Referral Hospital</span>
          </div>
        </div>

        {/* Language switch */}
        <button
          type="button"
          onClick={() => setLang(lang === "en" ? "am" : "en")}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800/80 text-slate-300 hover:text-white hover:border-teal-500 transition-colors"
        >
          <Globe size={12} />
          <span>{lang === "en" ? "አማርኛ" : "English"}</span>
        </button>
      </div>

      {/* Main Form Container */}
      <div className="w-full max-w-md mx-auto my-auto py-6">
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl">
          {/* Badge & Title */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-950/80 border border-teal-800/60 text-teal-300 text-xs font-semibold mb-3">
              <ShieldCheck size={13} className="text-teal-400" />
              <span>{t("Verified Patient Access", "የተረጋገጠ የሕሙማን መግቢያ")}</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              {t("Patient Portal Login", "የሕሙማን ፖርታል መግቢያ")}
            </h1>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              {t(
                "Sign in with the phone number and name recorded during your hospital reception registration.",
                "በሆስፒታሉ መቀበያ ክፍል በተመዘገቡት ስልክ ቁጥር እና ስም ይግቡ።"
              )}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name Field */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                {t("Full Name", "ሙሉ ስም")}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User size={16} />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("e.g. Abebe Kebede or አበበ ከበደ", "ለምሳሌ፡ አበበ ከበደ")}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-hidden focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-all font-medium"
                />
              </div>
            </div>

            {/* Phone Number Field */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                {t("Phone Number", "ስልክ ቁጥር")}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Phone size={16} />
                </div>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="09XX XXX XXX"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-hidden focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-all font-mono"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-xs text-red-300 flex items-start gap-2.5 animate-in fade-in duration-200">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
                <span className="leading-snug">{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !name.trim() || !phone.trim()}
              className={`w-full py-3.5 px-4 bg-teal-600 hover:bg-teal-500 active:scale-98 text-white rounded-xl font-bold text-sm shadow-lg shadow-teal-900/30 transition-all flex items-center justify-center gap-2 ${
                isLoading || !name.trim() || !phone.trim() ? "opacity-60 cursor-not-allowed" : ""
              }`}
            >
              <span>{isLoading ? t("Verifying Registration…", "ምዝገባ በማረጋገጥ ላይ…") : t("Sign In to Portal", "ወደ ፖርታል ይግቡ")}</span>
              <ArrowRight size={15} />
            </button>
          </form>

          {/* 1-Click Quick Demo Test Chips */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles size={12} className="text-teal-400" />
                {t("1-Click Quick Fill Accounts", "ሕሙማን (በ1 ጠቅታ ይሞክሩ)")}
              </span>
              <span className="text-[10px] text-teal-400 font-medium">Quick Fill</span>
            </div>

            {/* Recently registered: Lamerot */}
            <button
              type="button"
              onClick={() => fillQuickDemo("lamerot", "0909090909")}
              className="w-full mb-2.5 text-left p-2.5 rounded-xl bg-teal-950/70 border border-teal-500/60 hover:bg-teal-900/60 transition-all text-xs group flex items-center justify-between shadow-xs"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                  <p className="font-bold text-teal-200 group-hover:text-white">
                    lamerot <span className="font-mono text-[10px] text-teal-400">(DMR-00016)</span>
                  </p>
                </div>
                <span className="text-[11px] text-slate-400 ml-4 font-mono">0909090909</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 font-semibold border border-teal-500/40">
                Recently Registered ✨
              </span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              {PATIENTS.slice(0, 4).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => fillQuickDemo(p.name, p.phone)}
                  className="text-left p-2 rounded-lg bg-slate-800/80 border border-slate-700/80 hover:border-teal-500/80 hover:bg-slate-700/60 transition-all text-xs group"
                >
                  <p className="font-semibold text-slate-200 group-hover:text-teal-300 truncate">
                    {p.name}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
                    <span className="font-mono">{p.phone}</span>
                    {p.cbhi && <span className="text-emerald-400 font-bold">CBHI</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Staff redirect footer note */}
        <div className="mt-5 text-center text-xs text-slate-400">
          <span>{t("Are you a hospital staff member?", "የሆስፒታሉ ሰራተኛ ነዎት?")} </span>
          <Link href="/nova/login" className="text-teal-400 hover:text-teal-300 underline font-medium">
            {t("Staff Login here", "የሰራተኞች መግቢያ")} →
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="w-full max-w-md mx-auto text-center text-[11px] text-slate-500 py-2">
        <span>Nova HMS · Patient Portal & Health ID System · Debre Markos</span>
      </div>
    </div>
  );
}
