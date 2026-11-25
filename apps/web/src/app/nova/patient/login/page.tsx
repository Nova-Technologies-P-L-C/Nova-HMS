"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePatientAuth } from "../patient-auth-context";
import { PATIENTS } from "@/lib/nova-mock-data";
import QRScanner from "@/components/nova/qr-scanner";
import { parsePatientQRPayload } from "@/components/nova/patient-qr";
import {
  ShieldCheck,
  KeyRound,
  IdCard,
  QrCode,
  AlertCircle,
  ArrowRight,
  Globe,
  Sparkles,
  Lock,
  Hospital,
  Camera,
  Eye,
  EyeOff,
  Info,
} from "lucide-react";

export default function PatientLoginPage() {
  const router = useRouter();
  const { login } = usePatientAuth();

  const [lang, setLang] = useState<"en" | "am">("en");
  const [authMethod, setAuthMethod] = useState<"id_pin" | "scan_qr">("id_pin");
  const [identifier, setIdentifier] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const t = (en: string, am: string) => (lang === "en" ? en : am);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await login({ identifier, pin });
      if (res.success) {
        router.replace("/nova/patient" as any);
      } else {
        setError(res.error || "Authentication failed. Please verify your Health ID and PIN.");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQRScanned = async (decoded: { healthId: string; name?: string; raw: string }) => {
    setError(null);
    setIsLoading(true);
    try {
      const parsed = parsePatientQRPayload(decoded.raw || decoded.healthId);
      const res = await login({
        identifier: parsed.healthId || decoded.healthId,
        pin: parsed.portalPin,
        qrToken: decoded.raw,
      });

      if (res.success) {
        router.replace("/nova/patient" as any);
      } else {
        setError(res.error || "Scanned clinic card could not be authenticated.");
      }
    } catch {
      setError("Failed to decode QR code from card. Please check the camera angle.");
    } finally {
      setIsLoading(false);
    }
  };

  const fillQuickDemo = (demoId: string, demoPin: string = "1234") => {
    setIdentifier(demoId);
    setPin(demoPin);
    setError(null);
    setAuthMethod("id_pin");
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-slate-900 via-[#0a1b29] to-[#0c2436] flex flex-col justify-between p-3 sm:p-4 md:p-6 text-slate-100">
      {/* Top Header */}
      <div className="w-full max-w-md mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-white p-0.5 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
            <img src="/images/ethiora-logo.jpg" alt="Ethiora Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <span className="font-extrabold text-sm text-white block leading-none">Ethiora HMS</span>
            <span className="text-[10px] text-teal-300 font-medium">Ethiora Medical System</span>
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
              <span>{t("Secure Health ID Authentication", "ደህንነቱ የተጠበቀ የጤና መታወቂያ መግቢያ")}</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              {t("Patient Portal Login", "የሕሙማን ፖርታል መግቢያ")}
            </h1>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              {t(
                "Sign in using your assigned Health ID and 4-digit Security PIN issued at clinic reception.",
                "በሆስፒታሉ መቀበያ ክፍል የተሰጠዎትን የጤና መታወቂያ (Health ID) እና ባለ 4-ዲጂት ፒን ያስገቡ።"
              )}
            </p>
          </div>

          {/* Auth Method Switcher Tabs */}
          <div className="flex bg-slate-800/80 p-1 rounded-xl mb-5 border border-slate-700/70">
            <button
              type="button"
              onClick={() => {
                setAuthMethod("id_pin");
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                authMethod === "id_pin"
                  ? "bg-teal-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <KeyRound size={13} />
              <span>{t("Health ID + PIN", "መታወቂያ እና ፒን")}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMethod("scan_qr");
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                authMethod === "scan_qr"
                  ? "bg-teal-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Camera size={13} />
              <span>{t("Scan Clinic Card", "ካርድ ስካን አድርግ")}</span>
            </button>
          </div>

          {/* Method 1: Health ID + 4-Digit PIN */}
          {authMethod === "id_pin" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Health ID or Phone Field */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  {t("Health ID or Phone Number", "የጤና መታወቂያ ወይም ስልክ ቁጥር")}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <IdCard size={16} />
                  </div>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={t("e.g. DMH-00123 or 0911234567", "ለምሳሌ፡ DMH-00123 ወይም 0911234567")}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-hidden focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-all font-mono"
                  />
                </div>
              </div>

              {/* 4-Digit Security PIN Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                    {t("4-Digit Portal PIN", "ባለ 4-ዲጂት መግቢያ ፒን")}
                  </label>
                  <span className="text-[10px] text-teal-400 font-medium">
                    {t("Printed on Clinic Card", "በካርዱ ላይ የተጻፈ")}
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showPin ? "text" : "password"}
                    required
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="••••"
                    className="w-full pl-10 pr-11 py-3 rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-500 text-base tracking-widest focus:outline-hidden focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white"
                  >
                    {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
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
                disabled={isLoading || !identifier.trim() || !pin.trim()}
                className={`w-full py-3.5 px-4 bg-teal-600 hover:bg-teal-500 active:scale-98 text-white rounded-xl font-bold text-sm shadow-lg shadow-teal-900/30 transition-all flex items-center justify-center gap-2 ${
                  isLoading || !identifier.trim() || !pin.trim() ? "opacity-60 cursor-not-allowed" : ""
                }`}
              >
                <span>
                  {isLoading
                    ? t("Verifying Health ID & PIN…", "መታወቂያ እና ፒን በማረጋገጥ ላይ…")
                    : t("Sign In to Patient Portal", "ወደ ሕሙማን ፖርታል ይግቡ")}
                </span>
                <ArrowRight size={15} />
              </button>
            </form>
          ) : (
            /* Method 2: Scan Clinic Card QR */
            <div className="space-y-4">
              <div className="p-3 bg-teal-950/40 border border-teal-800/40 rounded-xl text-xs text-teal-200 flex items-start gap-2">
                <QrCode size={16} className="shrink-0 text-teal-400 mt-0.5" />
                <p>
                  {t(
                    "Hold up your official printed clinic card or thermal receipt in front of the camera.",
                    "የታተመውን የሆስፒታል ካርድ ወይም ደረሰኝ በካሜራው ፊት ያቅርቡ።"
                  )}
                </p>
              </div>

              <div className="border border-slate-700 rounded-2xl overflow-hidden bg-black/40">
                <QRScanner onScan={handleQRScanned} autoStart={true} />
              </div>

              {error && (
                <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-xs text-red-300 flex items-start gap-2.5">
                  <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
                  <span className="leading-snug">{error}</span>
                </div>
              )}
            </div>
          )}

          {/* First-Visit In-Clinic Notice */}
          <div className="mt-5 p-3.5 bg-slate-800/50 border border-slate-700/70 rounded-2xl text-[11px] text-slate-300 space-y-1.5">
            <div className="flex items-center gap-1.5 text-teal-300 font-bold">
              <Info size={13} className="text-teal-400" />
              <span>{t("First visit to our hospital?", "የመጀመሪያ ጉብኝትዎ ነው?")}</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              {t(
                "To ensure strict medical privacy, Health IDs and Portal PINs are issued in-person at the Reception Desk (Room 01) on your first clinic visit.",
                "የሕክምና መረጃ ደህንነትን ለመጠበቅ፡ የጤና መታወቂያ እና ሚስጥራዊ ፒን የሚሰጠው በመጀመሪያው ጉብኝት በሆስፒታሉ መቀበያ ክፍል (ክፍል 01) በአካል ብቻ ነው።"
              )}
            </p>
          </div>

          {/* 1-Click Quick Demo Test Chips */}
          <div className="mt-5 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles size={11} className="text-teal-400" />
                {t("1-Click Verified Demo Patients", "የተረጋገጡ ሕሙማን (በ1 ጠቅታ ይሞክሩ)")}
              </span>
              <span className="text-[10px] text-teal-400 font-medium">Auto-Fill</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PATIENTS.slice(0, 4).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => fillQuickDemo(p.healthId, (p as any).portalPin || "1234")}
                  className="text-left p-2 rounded-xl bg-slate-800/70 border border-slate-700/80 hover:border-teal-500/80 hover:bg-slate-700/60 transition-all text-xs group"
                >
                  <p className="font-semibold text-slate-200 group-hover:text-teal-300 truncate">
                    {p.name}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 font-mono">
                    <span className="text-teal-400">{p.healthId}</span>
                    <span className="text-amber-300/90 font-bold">PIN: 1234</span>
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
        <span>Ethiora HMS · Secure Patient Health ID &amp; Portal Authentication · Ethiora Medical System</span>
      </div>
    </div>
  );
}
