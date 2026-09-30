"use client";
import { useState } from "react";
import { usePatientLang } from "../layout";
import { PATIENTS } from "@/lib/nova-mock-data";
import PatientQRCode from "@/components/nova/patient-qr";
import { QrCode, Download, Share2, ShieldCheck, Printer, Check, Copy } from "lucide-react";

const PATIENT = PATIENTS[0];

export default function IDCardPage() {
  const { lang } = usePatientLang();
  const [copied, setCopied] = useState(false);
  const t = (en: string, am: string) => (lang === "en" ? en : am);

  const age = new Date().getFullYear() - new Date(PATIENT.dob).getFullYear();

  const handleShare = async () => {
    const shareData = {
      title: `Nova HMS Health ID — ${PATIENT.name}`,
      text: `Patient Health ID: ${PATIENT.healthId} (${PATIENT.name}) at Debre Markos Referral Hospital`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled share
      }
    } else {
      navigator.clipboard.writeText(`${PATIENT.healthId} — ${PATIENT.name} (Nova HMS)`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">
        {t("My Health ID Card", "የጤና መታወቂያ ካርዴ")}
      </h1>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
        {t(
          "Present this QR card at hospital triage, pharmacy, or the self-service kiosk for instant verification.",
          "ለፈጣን ማረጋገጫ ይህን የQR ካርድ በሆስፒታል መቀበያ፣ ፋርማሲ ወይም ኪዮስክ ያሳዩ።"
        )}
      </p>

      {/* Official Plastic Card Design */}
      <div className="bg-gradient-to-br from-[#0c1f2e] via-[#0f2d42] to-[#0c6b61] rounded-3xl p-6 text-white mb-5 shadow-2xl border border-teal-500/30 relative overflow-hidden">
        {/* Glow accents */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-teal-400/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top bar */}
        <div className="flex items-center justify-between mb-5 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500 flex items-center justify-center font-black text-white text-base shadow-sm">
              N
            </div>
            <div>
              <p className="font-bold text-sm text-white">Nova HMS</p>
              <p className="text-[11px] text-teal-200">Debre Markos Referral Hospital</p>
            </div>
          </div>
          {PATIENT.cbhi && (
            <div className="flex items-center gap-1 bg-emerald-500/20 border border-emerald-400/40 px-2.5 py-1 rounded-full">
              <ShieldCheck size={12} className="text-emerald-300" />
              <span className="text-[11px] text-emerald-300 font-bold tracking-wider">CBHI VERIFIED</span>
            </div>
          )}
        </div>

        {/* Patient Name */}
        <div className="mb-4 relative z-10">
          <p className="text-2xl font-black tracking-tight text-white">
            {lang === "en" ? PATIENT.name : PATIENT.nameAm}
          </p>
          <p className="text-teal-200 text-xs">
            {lang === "en" ? PATIENT.nameAm : PATIENT.name}
          </p>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-3 gap-2.5 py-2.5 border-y border-white/10 mb-4 text-xs relative z-10">
          <div>
            <p className="text-[10px] text-teal-300/80 uppercase tracking-wider">{t("Health ID", "መታወቂያ")}</p>
            <p className="font-mono font-bold text-sm text-white">{PATIENT.healthId}</p>
          </div>
          <div>
            <p className="text-[10px] text-teal-300/80 uppercase tracking-wider">{t("Age", "ዕድሜ")}</p>
            <p className="font-semibold text-white">{`${age} ${t("yrs", "ዓ")}`}</p>
          </div>
          <div>
            <p className="text-[10px] text-teal-300/80 uppercase tracking-wider">{t("Sex", "ጾታ")}</p>
            <p className="font-semibold text-white">{PATIENT.sex === "M" ? t("Male", "ወንድ") : t("Female", "ሴት")}</p>
          </div>
        </div>

        {/* Real Dynamic QR Code */}
        <div className="flex items-center gap-4 relative z-10">
          <div className="bg-white p-2 rounded-2xl shadow-lg border border-teal-400/30 shrink-0">
            <PatientQRCode patient={PATIENT} size={110} showControls={false} />
          </div>
          <div className="text-xs">
            <p className="text-[11px] text-teal-200 font-medium mb-1">
              {t("Scan at hospital kiosk or doctor desk", "በሆስፒታሉ ኪዮስክ ወይም በዶክተሩ ጠረጴዛ ይቃኙ")}
            </p>
            <p className="font-mono text-xs font-bold text-white tracking-wider">{PATIENT.healthId}</p>
            <p className="text-[11px] text-slate-300 mt-1">{PATIENT.kebele} · Debre Markos</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          type="button"
          onClick={handlePrint}
          className="flex items-center justify-center gap-2 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-semibold shadow-2xs"
        >
          <Printer size={15} />
          <span>{t("Print Card", "ካርድ አትም")}</span>
        </button>

        <button
          type="button"
          onClick={handleShare}
          className="flex items-center justify-center gap-2 py-3 bg-teal-600 text-white text-xs rounded-2xl hover:bg-teal-700 transition-colors font-semibold shadow-2xs"
        >
          {copied ? <Check size={15} /> : <Share2 size={15} />}
          <span>{copied ? t("Copied to Clipboard!", "ተቀድቷል!") : t("Share Card", "ካርድ አጋራ")}</span>
        </button>
      </div>

      {/* Details breakdown */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-2xs">
        <h2 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
          {t("Registered Patient Details", "የሕሙም የተመዘገቡ ዝርዝሮች")}
        </h2>
        {[
          { label: t("Date of birth", "የትውልድ ቀን"), value: PATIENT.dob },
          { label: t("Phone", "ስልክ"), value: PATIENT.phone },
          { label: t("Kebele", "ቀበሌ"), value: PATIENT.kebele },
          { label: t("Total visits", "ጠቅላላ ጉብኝቶች"), value: String(PATIENT.visits) },
          { label: t("Last visit", "የመጨረሻ ጉብኝት"), value: PATIENT.lastVisit },
          { label: t("CBHI enrolled", "ሲቢኤችአይ"), value: PATIENT.cbhi ? t("Yes (Active)", "አዎ (ንቁ)") : t("No", "አይ") },
        ].map((item) => (
          <div key={item.label} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800 last:border-0">
            <span className="text-slate-500 dark:text-slate-400">{item.label}</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
