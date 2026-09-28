"use client";
import { usePatientLang } from "../layout";
import { LAB_ORDERS } from "@/lib/nova-mock-data";
import { FlaskConical, CheckCircle, Clock, AlertCircle } from "lucide-react";

const LAB_RESULTS = [
  {
    id: "LO003", test: "Fasting Blood Sugar", date: "2026-09-05 07:55", status: "completed",
    results: [{ name: "Glucose (fasting)", value: "8.4", unit: "mmol/L", ref: "3.9–5.5", flag: "high" }],
    interpretation: "Elevated fasting glucose consistent with Type 2 Diabetes. Continue Metformin and dietary management.",
    orderedBy: "Dr. Tigist Alemu",
  },
  {
    id: "LO001", test: "CBC (Complete Blood Count)", date: "2026-09-05 08:30", status: "pending",
    results: [],
    interpretation: null,
    orderedBy: "Dr. Tigist Alemu",
  },
];

export default function ResultsPage() {
  const { lang } = usePatientLang();
  const t = (en: string, am: string) => lang === "en" ? en : am;

  return (
    <div className="p-4">
      <h1 className="text-lg font-bold text-slate-800 mb-1">{t("Lab results", "የላቦ ውጤቶች")}</h1>
      <p className="text-sm text-slate-500 mb-5">{t("Your test results from Nova HMS", "ከኖቫ ኤችኤምኤስ የሙከራ ውጤቶችዎ")}</p>

      <div className="space-y-4">
        {LAB_RESULTS.map((result) => (
          <div key={result.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center gap-3 p-4 border-b border-slate-100">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${result.status === "completed" ? "bg-purple-50" : "bg-slate-100"}`}>
                <FlaskConical size={18} className={result.status === "completed" ? "text-purple-600" : "text-slate-400"} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-800">{result.test}</p>
                <p className="text-xs text-slate-500">{result.orderedBy} · {result.date}</p>
              </div>
              {result.status === "completed"
                ? <span className="flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium"><CheckCircle size={10} /> {t("Ready", "ዝግጁ")}</span>
                : <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium"><Clock size={10} /> {t("Pending", "በመጠባበቅ")}</span>}
            </div>

            {result.status === "completed" && result.results.length > 0 && (
              <div className="p-4 space-y-3">
                {result.results.map((r) => (
                  <div key={r.name} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{r.name}</p>
                      <p className="text-xs text-slate-400">{t("Reference", "ማጣቀሻ")}: {r.ref} {r.unit}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${r.flag === "high" ? "text-red-600" : r.flag === "low" ? "text-blue-600" : "text-slate-800"}`}>
                        {r.value} <span className="text-sm font-normal text-slate-500">{r.unit}</span>
                      </p>
                      {r.flag && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.flag === "high" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                          {r.flag === "high" ? t("High ↑", "ከፍ ↑") : t("Low ↓", "ዝቅ ↓")}
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {result.interpretation && (
                  <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl p-3 mt-2">
                    <AlertCircle size={14} className="text-blue-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-blue-700">{result.interpretation}</p>
                  </div>
                )}
              </div>
            )}

            {result.status === "pending" && (
              <div className="p-4 text-center text-sm text-slate-400">
                {t("Results not yet available. You will be notified when ready.", "ውጤቶቹ እስካሁን አልተገኙም። ሲዘጋጁ ይነገርዎታል።")}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
