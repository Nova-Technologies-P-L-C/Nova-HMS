"use client";
import { usePatientLang } from "../layout";
import { APPOINTMENTS } from "@/lib/nova-mock-data";
import { Calendar, Clock, User, Building2 } from "lucide-react";
import { useState } from "react";

const PAST_APPOINTMENTS = [
  { id: "APT000", patient: "Abebe Kebede", patientId: "P001", doctor: "Dr. Tigist Alemu", dept: "Internal Medicine", date: "2026-08-28", time: "09:30", status: "completed" },
  { id: "APT00X", patient: "Abebe Kebede", patientId: "P001", doctor: "Dr. Yonas Tesfaye", dept: "OPD", date: "2026-07-15", time: "10:00", status: "completed" },
];

export default function AppointmentsPage() {
  const { lang } = usePatientLang();
  const t = (en: string, am: string) => lang === "en" ? en : am;
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  const upcoming = APPOINTMENTS.filter((a) => a.patientId === "P001");
  const list = tab === "upcoming" ? upcoming : PAST_APPOINTMENTS;

  return (
    <div className="p-4">
      <h1 className="text-lg font-bold text-slate-800 mb-1">{t("Appointments", "ቀጠሮዎች")}</h1>
      <p className="text-sm text-slate-500 mb-4">{t("Your scheduled visits", "የተያዙ ቀጠሮዎችዎ")}</p>

      <div className="flex gap-2 mb-5">
        {(["upcoming", "past"] as const).map((s) => (
          <button key={s} onClick={() => setTab(s)} className={`flex-1 py-2 text-sm rounded-xl font-medium transition-colors ${tab === s ? "bg-teal-600 text-white" : "bg-white border border-slate-200 text-slate-600"}`}>
            {s === "upcoming" ? t("Upcoming", "መጪ") : t("Past", "ያለፉ")}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Calendar size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">{t("No appointments", "ምንም ቀጠሮ የለም")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((appt) => (
            <div key={appt.id} className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tab === "upcoming" ? "bg-teal-50" : "bg-slate-100"}`}>
                    <Calendar size={18} className={tab === "upcoming" ? "text-teal-600" : "text-slate-400"} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{appt.date}</p>
                    <p className="text-xs text-slate-500">{appt.time}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${appt.status === "scheduled" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>
                  {appt.status === "scheduled" ? t("Scheduled", "ተይዟል") : t("Completed", "ተጠናቋል")}
                </span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <User size={13} className="text-slate-400" />
                  {appt.doctor}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Building2 size={13} className="text-slate-400" />
                  {appt.dept}
                </div>
              </div>
              {tab === "upcoming" && (
                <div className="mt-3 flex gap-2">
                  <button className="flex-1 py-2 text-xs bg-slate-50 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-100 transition-colors">
                    {t("Add to calendar", "ወደ ቀን መቁጠሪያ ጨምር")}
                  </button>
                  <button className="flex-1 py-2 text-xs bg-red-50 border border-red-200 text-red-600 rounded-xl hover:bg-red-100 transition-colors">
                    {t("Cancel", "ሰርዝ")}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
