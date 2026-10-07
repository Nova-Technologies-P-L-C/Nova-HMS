"use client";
import Link from "next/link";
import { usePatientLang } from "./layout";
import { usePatientAuth } from "./patient-auth-context";
import { PATIENTS, APPOINTMENTS, PRESCRIPTIONS, NOTIFICATIONS, DIAGNOSES, VITALS, CBHI_CLAIMS } from "@/lib/nova-mock-data";
import { Calendar, Pill, Bell, ArrowRight, Activity, ShieldCheck, FlaskConical, ArrowLeftRight, QrCode } from "lucide-react";

export default function PatientDashboard() {
  const { lang } = usePatientLang();
  const { patient: authPatient } = usePatientAuth();
  const PATIENT = authPatient || PATIENTS[0];
  const t = (en: string, am: string) => lang === "en" ? en : am;

  const upcomingAppt = APPOINTMENTS[0];
  const activePrescriptions = PRESCRIPTIONS.filter((p) => p.status === "pending");
  const unreadNotifs = NOTIFICATIONS.filter((n) => !n.read).length;
  const latestVitals = VITALS[0];
  const latestDiagnosis = DIAGNOSES[0];
  const cbhiActive = PATIENT.cbhi;

  return (
    <div className="p-4 space-y-4">
      {/* Welcome card */}
      <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-2xl p-5 text-white">
        <p className="text-teal-100 text-sm mb-1">{t("Good morning", "እንደምን አደሩ")}</p>
        <h1 className="text-xl font-bold mb-0.5">{lang === "en" ? PATIENT.name : PATIENT.nameAm}</h1>
        <p className="text-teal-200 text-xs mb-4">{t("Health ID", "የጤና መታወቂያ")}: {PATIENT.healthId}</p>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-teal-500/40 rounded-lg px-3 py-2">
            <p className="text-teal-100 text-xs">{t("CBHI Status", "ሲቢኤችአይ")}</p>
            <p className="font-semibold text-sm">{cbhiActive ? t("Active ✓", "ንቁ ✓") : t("Not enrolled", "አልተመዘገበም")}</p>
          </div>
          <div className="flex-1 bg-teal-500/40 rounded-lg px-3 py-2">
            <p className="text-teal-100 text-xs">{t("Total visits", "ጠቅላላ ጉብኝቶች")}</p>
            <p className="font-semibold text-sm">{PATIENT.visits}</p>
          </div>
          <Link href="/nova/patient/id-card" className="bg-white/20 hover:bg-white/30 transition-colors rounded-lg p-2.5">
            <QrCode size={20} />
          </Link>
        </div>
      </div>

      {/* Notifications */}
      {unreadNotifs > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-amber-600 dark:text-amber-400" />
            <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">{unreadNotifs} {t("new notifications", "አዲስ ማሳወቂያዎች")}</p>
          </div>
          <ArrowRight size={14} className="text-amber-500 dark:text-amber-400" />
        </div>
      )}

      {/* Upcoming appointment */}
      {upcomingAppt && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{t("Next appointment", "ቀጣይ ቀጠሮ")}</p>
            <Link href="/nova/patient/appointments" className="text-xs text-teal-600 dark:text-teal-400 hover:underline">{t("View all", "ሁሉንም ይመልከቱ")}</Link>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/50 flex items-center justify-center shrink-0">
              <Calendar size={18} className="text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <p className="font-medium text-slate-800 dark:text-slate-100">{upcomingAppt.doctor}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{upcomingAppt.dept}</p>
              <p className="text-xs text-teal-600 dark:text-teal-400 font-medium mt-1">{upcomingAppt.date} · {upcomingAppt.time}</p>
            </div>
          </div>
        </div>
      )}

      {/* Latest vitals */}
      {latestVitals && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm mb-3">{t("Latest vitals", "የቅርብ ጊዜ ምልክቶች")} <span className="text-xs text-slate-400 dark:text-slate-500 font-normal ml-1">{latestVitals.date}</span></p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: t("Blood pressure", "ደም ግፊት"), value: latestVitals.bp, unit: "mmHg" },
              { label: t("Heart rate", "የልብ ምት"), value: latestVitals.hr, unit: "bpm" },
              { label: t("Temp", "ሙቀት"), value: latestVitals.temp, unit: "°C" },
              { label: t("SpO₂", "ኦክሲጅን"), value: `${latestVitals.spo2}%`, unit: "" },
              { label: t("Weight", "ክብደት"), value: latestVitals.weight, unit: "kg" },
            ].map((v) => (
              <div key={v.label} className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 text-center">
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">{v.label}</p>
                <p className="font-bold text-slate-800 dark:text-slate-100">{v.value}</p>
                {v.unit && <p className="text-xs text-slate-400 dark:text-slate-500">{v.unit}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active prescriptions */}
      {activePrescriptions.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{t("Active medications", "ንቁ መድሃኒቶች")}</p>
            <Link href="/nova/patient/prescriptions" className="text-xs text-teal-600 dark:text-teal-400 hover:underline">{t("View all", "ሁሉንም")}</Link>
          </div>
          <div className="space-y-2">
            {activePrescriptions.slice(0, 2).map((rx) => (
              <div key={rx.id} className="flex items-center gap-3 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center shrink-0">
                  <Pill size={14} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{rx.drug}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{rx.dose} · {rx.freq} · {rx.days} {t("days", "ቀናት")}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Latest diagnosis */}
      {latestDiagnosis && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm mb-3">{t("Last diagnosis", "የቅርብ ጊዜ ምርመራ")}</p>
          <div className="flex items-start gap-3">
            <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-600 dark:text-slate-300">{latestDiagnosis.icd}</span>
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{latestDiagnosis.description}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{latestDiagnosis.notes}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{latestDiagnosis.doctor} · {latestDiagnosis.date}</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { href: "/nova/patient/results", icon: <FlaskConical size={18} className="text-purple-600 dark:text-purple-400" />, label: t("Lab results", "የላቦ ውጤቶች"), bg: "bg-purple-50 dark:bg-purple-950/50" },
          { href: "/nova/patient/cbhi", icon: <ShieldCheck size={18} className="text-emerald-600 dark:text-emerald-400" />, label: t("CBHI claims", "ሲቢኤችአይ"), bg: "bg-emerald-50 dark:bg-emerald-950/50" },
          { href: "/nova/patient/referrals", icon: <ArrowLeftRight size={18} className="text-orange-600 dark:text-orange-400" />, label: t("Referrals", "ሪፈራሎች"), bg: "bg-orange-50 dark:bg-orange-950/50" },
          { href: "/nova/patient/visits", icon: <Activity size={18} className="text-teal-600 dark:text-teal-400" />, label: t("Visit history", "የጉብኝት ታሪክ"), bg: "bg-teal-50 dark:bg-teal-950/50" },
        ].map((item) => (
          <Link key={item.href} href={item.href as any} className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 hover:border-teal-300 dark:hover:border-teal-600 transition-colors shadow-xs">
            <div className={`w-9 h-9 rounded-xl ${item.bg} flex items-center justify-center shrink-0`}>{item.icon}</div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{item.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
