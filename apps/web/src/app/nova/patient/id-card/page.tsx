"use client";
import { usePatientLang } from "../layout";
import { PATIENTS } from "@/lib/nova-mock-data";
import { QrCode, Download, Share2, ShieldCheck } from "lucide-react";

const PATIENT = PATIENTS[0];

export default function IDCardPage() {
  const { lang } = usePatientLang();
  const t = (en: string, am: string) => lang === "en" ? en : am;

  const age = new Date().getFullYear() - new Date(PATIENT.dob).getFullYear();

  return (
    <div className="p-4">
      <h1 className="text-lg font-bold text-slate-800 mb-1">{t("My Health ID", "የጤና መታወቂያዬ")}</h1>
      <p className="text-sm text-slate-500 mb-6">{t("Show this at reception for fast check-in", "ለፈጣን ምዝገባ ይህን ለቀበላ ሰራተኛ ያሳዩ")}</p>

      {/* Card */}
      <div className="bg-gradient-to-br from-[#0f2435] to-[#1a3a52] rounded-3xl p-6 text-white mb-5 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center font-bold text-white text-sm">N</div>
            <div>
              <p className="font-bold text-sm">Nova HMS</p>
              <p className="text-xs text-slate-400">Patient Health Card</p>
            </div>
          </div>
          {PATIENT.cbhi && (
            <div className="flex items-center gap-1 bg-emerald-500/20 border border-emerald-500/30 px-2 py-1 rounded-full">
              <ShieldCheck size={12} className="text-emerald-400" />
              <span className="text-xs text-emerald-300 font-medium">CBHI</span>
            </div>
          )}
        </div>

        {/* Patient info */}
        <div className="mb-6">
          <p className="text-2xl font-bold mb-0.5">{lang === "en" ? PATIENT.name : PATIENT.nameAm}</p>
          <p className="text-slate-400 text-sm">{lang === "en" ? PATIENT.nameAm : PATIENT.name}</p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: t("Health ID", "መታወቂያ"), value: PATIENT.healthId },
            { label: t("Age", "ዕድሜ"), value: `${age} ${t("yrs", "ዓ")}` },
            { label: t("Sex", "ጾታ"), value: PATIENT.sex === "M" ? t("Male", "ወንድ") : t("Female", "ሴት") },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-xs text-slate-400 mb-0.5">{item.label}</p>
              <p className="font-semibold text-sm">{item.value}</p>
            </div>
          ))}
        </div>

        {/* QR placeholder */}
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-white rounded-xl flex items-center justify-center shrink-0">
            <QrCode size={52} className="text-slate-800" />
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">{t("Scan to verify", "ለማረጋገጥ ይቃኙ")}</p>
            <p className="font-mono text-sm font-bold">{PATIENT.healthId}</p>
            <p className="text-xs text-slate-400 mt-1">{PATIENT.kebele} · Debre Markos</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button className="flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 text-slate-700 text-sm rounded-2xl hover:bg-slate-50 transition-colors font-medium">
          <Download size={16} /> {t("Save card", "ካርድ አስቀምጥ")}
        </button>
        <button className="flex items-center justify-center gap-2 py-3 bg-teal-600 text-white text-sm rounded-2xl hover:bg-teal-700 transition-colors font-medium">
          <Share2 size={16} /> {t("Share", "አጋራ")}
        </button>
      </div>

      {/* Details */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <h2 className="font-semibold text-slate-800 text-sm">{t("Patient details", "የሕሙም ዝርዝር")}</h2>
        {[
          { label: t("Date of birth", "የትውልድ ቀን"), value: PATIENT.dob },
          { label: t("Phone", "ስልክ"), value: PATIENT.phone },
          { label: t("Kebele", "ቀበሌ"), value: PATIENT.kebele },
          { label: t("Total visits", "ጠቅላላ ጉብኝቶች"), value: String(PATIENT.visits) },
          { label: t("Last visit", "የመጨረሻ ጉብኝት"), value: PATIENT.lastVisit },
          { label: t("CBHI enrolled", "ሲቢኤችአይ"), value: PATIENT.cbhi ? t("Yes", "አዎ") : t("No", "አይ") },
        ].map((item) => (
          <div key={item.label} className="flex items-center justify-between text-sm">
            <p className="text-slate-500">{item.label}</p>
            <p className="font-medium text-slate-800">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
