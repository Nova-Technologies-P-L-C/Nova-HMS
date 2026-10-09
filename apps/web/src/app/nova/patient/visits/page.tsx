"use client";
import { usePatientLang } from "../layout";
import { DIAGNOSES, VITALS, APPOINTMENTS } from "@/lib/nova-mock-data";
import { Activity, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

const VISITS = [
  { date: "2026-09-05", doctor: "Dr. Tigist Alemu", dept: "Internal Medicine", type: "OPD", diagnosis: DIAGNOSES[0], vitals: VITALS[0] },
  { date: "2026-08-28", doctor: "Dr. Tigist Alemu", dept: "Internal Medicine", type: "Follow-up", diagnosis: DIAGNOSES[1], vitals: VITALS[1] },
  { date: "2026-07-15", doctor: "Dr. Yonas Tesfaye", dept: "OPD", type: "OPD", diagnosis: null, vitals: VITALS[2] },
];

export default function VisitsPage() {
  const { lang } = usePatientLang();
  const t = (en: string, am: string) => lang === "en" ? en : am;
  const [expanded, setExpanded] = useState<number | null>(0);

  return (
    <div className="p-4">
      <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">{t("Visit history", "የጉብኝት ታሪክ")}</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">{VISITS.length} {t("visits recorded", "ጉብኝቶች ተመዝግበዋል")}</p>

      <div className="space-y-3">
        {VISITS.map((visit, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <button
              className="w-full flex items-center justify-between p-4 text-left"
              onClick={() => setExpanded(expanded === i ? null : i)}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/50 flex items-center justify-center shrink-0">
                  <Activity size={16} className="text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{visit.date}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{visit.doctor} · {visit.dept}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">{visit.type}</span>
                {expanded === i ? <ChevronUp size={16} className="text-slate-400 dark:text-slate-500" /> : <ChevronDown size={16} className="text-slate-400 dark:text-slate-500" />}
              </div>
            </button>

            {expanded === i && (
              <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-800 pt-3 space-y-3">
                {/* Vitals */}
                {visit.vitals && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">{t("Vitals", "ምልክቶች")}</p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "BP", value: visit.vitals.bp },
                        { label: "HR", value: `${visit.vitals.hr} bpm` },
                        { label: "Temp", value: `${visit.vitals.temp}°C` },
                        { label: "SpO₂", value: `${visit.vitals.spo2}%` },
                        { label: t("Weight", "ክብደት"), value: `${visit.vitals.weight} kg` },
                      ].map((v) => (
                        <div key={v.label} className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2.5 text-center">
                          <p className="text-xs text-slate-400 dark:text-slate-500">{v.label}</p>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{v.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Diagnosis */}
                {visit.diagnosis && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">{t("Diagnosis", "ምርመራ")}</p>
                    <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">{visit.diagnosis.icd}</span>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{visit.diagnosis.description}</p>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">{visit.diagnosis.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
