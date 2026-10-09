"use client";
import { usePatientLang } from "../layout";
import { usePatientAuth } from "../patient-auth-context";
import { PRESCRIPTIONS } from "@/lib/nova-mock-data";
import { Pill, Clock, CheckCircle } from "lucide-react";
import { useState } from "react";

export default function PrescriptionsPage() {
  const { lang } = usePatientLang();
  const { patient } = usePatientAuth();
  const t = (en: string, am: string) => lang === "en" ? en : am;
  const [tab, setTab] = useState<"active" | "past">("active");

  const currentPatientId = patient?.id || "P001";
  const patientRx = PRESCRIPTIONS.filter((p) => p.patientId === currentPatientId || p.patient === patient?.name);
  const active = patientRx.filter((p) => p.status === "pending");
  const past = patientRx.filter((p) => p.status === "dispensed");
  const list = tab === "active" ? active : past;

  const freqLabel = (freq: string) => {
    if (freq.includes("3x")) return t("3 times daily", "በቀን 3 ጊዜ");
    if (freq.includes("2x")) return t("2 times daily", "በቀን 2 ጊዜ");
    return t("Once daily", "በቀን አንድ ጊዜ");
  };

  const INSTRUCTIONS: Record<string, string> = {
    "Amoxicillin 500mg": t("Take with food. Complete the full course even if you feel better.", "ከምግብ ጋር ይውሰዱ። ቢሻሉም ሙሉ ኮርሱን ያጠናቅቁ።"),
    "Metformin 500mg": t("Take with meals. Monitor blood sugar regularly.", "ከምግብ ጋር ይውሰዱ። የደም ስኳርን በየጊዜው ይፈትሹ።"),
    "Artemether": t("Take with food containing fat. Complete all 6 doses.", "ስብ ካለው ምግብ ጋር ይውሰዱ። ሁሉንም 6 ዶዝ ያጠናቅቁ።"),
  };

  return (
    <div className="p-4">
      <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">{t("Medications", "መድሃኒቶች")}</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{t("Your prescriptions from Nova HMS", "ከኖቫ ኤችኤምኤስ የተሰጡ ማዘዣዎች")}</p>

      <div className="flex gap-2 mb-5">
        {(["active", "past"] as const).map((s) => (
          <button key={s} onClick={() => setTab(s)} className={`flex-1 py-2 text-sm rounded-xl font-medium transition-colors ${tab === s ? "bg-teal-600 text-white" : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"}`}>
            {s === "active" ? t("Active", "ንቁ") : t("Past", "ያለፉ")} ({s === "active" ? active.length : past.length})
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="text-center py-12 text-slate-400 dark:text-slate-500">
          <Pill size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">{t("No prescriptions", "ምንም ማዘዣ የለም")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((rx) => {
            const instrKey = Object.keys(INSTRUCTIONS).find((k) => rx.drug.includes(k));
            return (
              <div key={rx.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${rx.status === "pending" ? "bg-blue-50 dark:bg-blue-950/50" : "bg-slate-100 dark:bg-slate-800"}`}>
                    {rx.status === "pending" ? <Pill size={18} className="text-blue-600 dark:text-blue-400" /> : <CheckCircle size={18} className="text-slate-400 dark:text-slate-500" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{rx.drug}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t("Prescribed by", "ያዘዘ")} {rx.prescribedBy} · {rx.date}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${rx.status === "pending" ? "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300" : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"}`}>
                    {rx.status === "pending" ? t("Active", "ንቁ") : t("Dispensed", "ተሰጥቷል")}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2.5 text-center">
                    <p className="text-xs text-slate-400 dark:text-slate-500">{t("Dose", "መጠን")}</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{rx.dose}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2.5 text-center">
                    <p className="text-xs text-slate-400 dark:text-slate-500">{t("Frequency", "ድግግሞሽ")}</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{freqLabel(rx.freq)}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2.5 text-center">
                    <p className="text-xs text-slate-400 dark:text-slate-500">{t("Duration", "ጊዜ")}</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{rx.days} {t("days", "ቀናት")}</p>
                  </div>
                </div>

                {instrKey && (
                  <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/60 rounded-xl p-3">
                    <Clock size={14} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-700 dark:text-amber-300">{INSTRUCTIONS[instrKey]}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
