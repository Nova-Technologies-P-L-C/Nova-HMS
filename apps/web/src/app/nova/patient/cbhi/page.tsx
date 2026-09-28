"use client";
import { usePatientLang } from "../layout";
import { CBHI_CLAIMS, PATIENTS } from "@/lib/nova-mock-data";
import { ShieldCheck, CheckCircle, Clock, XCircle } from "lucide-react";

const PATIENT = PATIENTS[0];
const MY_CLAIMS = CBHI_CLAIMS.filter((c) => c.patient === PATIENT.name);

export default function CBHIPage() {
  const { lang } = usePatientLang();
  const t = (en: string, am: string) => lang === "en" ? en : am;

  const statusIcon = (status: string) => {
    if (status === "approved") return <CheckCircle size={14} className="text-emerald-600" />;
    if (status === "rejected") return <XCircle size={14} className="text-red-600" />;
    return <Clock size={14} className="text-amber-600" />;
  };

  const statusLabel = (status: string) => {
    if (status === "approved") return t("Approved", "ጸድቋል");
    if (status === "rejected") return t("Rejected", "ተቀባይነት አላገኘም");
    return t("Submitted", "ቀርቧል");
  };

  const statusColors: Record<string, string> = {
    approved: "bg-emerald-100 text-emerald-700",
    rejected: "bg-red-100 text-red-700",
    submitted: "bg-amber-100 text-amber-700",
  };

  return (
    <div className="p-4">
      <h1 className="text-lg font-bold text-slate-800 mb-1">{t("CBHI & Insurance", "ሲቢኤችአይ እና ኢንሹራንስ")}</h1>
      <p className="text-sm text-slate-500 mb-5">{t("Community-Based Health Insurance status and claims", "የማህበረሰብ ጤና ኢንሹራንስ ሁኔታ እና ጥያቄዎች")}</p>

      {/* Membership card */}
      <div className={`rounded-2xl p-5 mb-5 ${PATIENT.cbhi ? "bg-gradient-to-br from-emerald-600 to-emerald-700" : "bg-slate-200"} text-white`}>
        <div className="flex items-center gap-3 mb-4">
          <ShieldCheck size={28} className={PATIENT.cbhi ? "text-white" : "text-slate-400"} />
          <div>
            <p className="font-bold text-lg">{lang === "en" ? PATIENT.name : PATIENT.nameAm}</p>
            <p className={`text-sm ${PATIENT.cbhi ? "text-emerald-100" : "text-slate-500"}`}>{PATIENT.healthId}</p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-xs ${PATIENT.cbhi ? "text-emerald-200" : "text-slate-400"}`}>{t("Membership status", "የአባልነት ሁኔታ")}</p>
            <p className="font-bold text-lg">{PATIENT.cbhi ? t("Active member", "ንቁ አባል") : t("Not enrolled", "አልተመዘገበም")}</p>
          </div>
          <div className="text-right">
            <p className={`text-xs ${PATIENT.cbhi ? "text-emerald-200" : "text-slate-400"}`}>{t("Kebele", "ቀበሌ")}</p>
            <p className="font-semibold">{PATIENT.kebele}</p>
          </div>
        </div>
        {!PATIENT.cbhi && (
          <button className="mt-4 w-full py-2.5 bg-teal-600 text-white text-sm rounded-xl font-medium hover:bg-teal-700 transition-colors">
            {t("Enroll in CBHI", "ሲቢኤችአይ ይቀላቀሉ")}
          </button>
        )}
      </div>

      {/* Claims */}
      <h2 className="font-semibold text-slate-800 mb-3">{t("Claim history", "የጥያቄ ታሪክ")}</h2>
      {MY_CLAIMS.length === 0 ? (
        <div className="text-center py-10 text-slate-400">
          <ShieldCheck size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">{t("No claims submitted yet", "እስካሁን ምንም ጥያቄ አልቀረበም")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {MY_CLAIMS.map((claim) => (
            <div key={claim.id} className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-mono text-xs text-slate-400">{claim.id}</p>
                  <p className="font-semibold text-slate-800 text-sm mt-0.5">{t("Invoice", "ደረሰኝ")} {claim.invoiceId}</p>
                </div>
                <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[claim.status]}`}>
                  {statusIcon(claim.status)} {statusLabel(claim.status)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div>
                  <p className="text-xs text-slate-400">{t("Submitted", "ቀርቧል")}</p>
                  <p className="font-medium text-slate-700">{claim.submitted}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">{t("Amount", "መጠን")}</p>
                  <p className="font-bold text-slate-800">ETB {claim.amount.toLocaleString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
