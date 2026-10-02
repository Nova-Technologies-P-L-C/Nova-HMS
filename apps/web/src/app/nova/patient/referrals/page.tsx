"use client";
import { usePatientLang } from "../layout";
import { REFERRALS } from "@/lib/nova-mock-data";
import { ArrowLeftRight, ArrowRight, CheckCircle, Clock, Truck } from "lucide-react";

const MY_REFERRALS = REFERRALS.filter((r) => r.patient === "Mulugeta Haile" || r.type === "in");

export default function ReferralsPage() {
  const { lang } = usePatientLang();
  const t = (en: string, am: string) => lang === "en" ? en : am;

  const statusIcon = (status: string) => {
    if (status === "arrived") return <CheckCircle size={14} className="text-emerald-600" />;
    if (status === "in-transit") return <Truck size={14} className="text-amber-600" />;
    return <Clock size={14} className="text-slate-400" />;
  };

  const statusColors: Record<string, string> = {
    arrived: "bg-emerald-100 text-emerald-700",
    "in-transit": "bg-amber-100 text-amber-700",
    pending: "bg-slate-100 text-slate-600",
  };

  const statusLabel = (s: string) => {
    if (s === "arrived") return t("Arrived", "ደርሷል");
    if (s === "in-transit") return t("In transit", "በመጓጓዝ ላይ");
    return t("Pending", "በመጠባበቅ");
  };

  return (
    <div className="p-4">
      <h1 className="text-lg font-bold text-slate-800 mb-1">{t("Referrals", "ሪፈራሎች")}</h1>
      <p className="text-sm text-slate-500 mb-5">{t("Track your referrals between facilities", "በተቋማት መካከል ያሉ ሪፈራሎችዎን ይከታተሉ")}</p>

      {REFERRALS.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <ArrowLeftRight size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">{t("No referrals", "ምንም ሪፈራል የለም")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {REFERRALS.map((ref) => (
            <div key={ref.id} className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-mono text-xs text-slate-400">{ref.id}</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{ref.patient}</p>
                </div>
                <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[ref.status]}`}>
                  {statusIcon(ref.status)} {statusLabel(ref.status)}
                </span>
              </div>

              {/* From → To */}
              <div className="flex items-center gap-2 mb-3 text-sm">
                <div className="flex-1 bg-slate-50 rounded-xl p-2.5">
                  <p className="text-xs text-slate-400 mb-0.5">{t("From", "ከ")}</p>
                  <p className="font-medium text-slate-700 text-xs leading-tight">{ref.from}</p>
                </div>
                <ArrowRight size={16} className="text-slate-400 shrink-0" />
                <div className="flex-1 bg-teal-50 rounded-xl p-2.5">
                  <p className="text-xs text-teal-500 mb-0.5">{t("To", "ወደ")}</p>
                  <p className="font-medium text-teal-700 text-xs leading-tight">{ref.to}</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{t("Reason", "ምክንያት")}: <strong className="text-slate-700">{ref.reason}</strong></span>
                <span>{ref.date}</span>
              </div>

              <div className="mt-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${ref.type === "out" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                  {ref.type === "out" ? t("Outgoing", "ወጪ") : t("Incoming", "ገቢ")}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
