"use client";
// Hospital Admin — Hospital Settings (page 16)
import { useState } from "react";
import { PageShell, Card, FormField, inputCls, btnPrimary, btnSecondary } from "@/components/nova/nova-ui";
import { useNovaRole } from "@/components/nova/nova-role-context";

export default function HospitalSettingsPage() {
  const { lang, setLang } = useNovaRole();
  const [cbhiRate, setCbhiRate] = useState("85");
  const [saved, setSaved] = useState(false);

  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <PageShell title="Hospital Settings" subtitle="Branding, language, and clinical configuration">
      <div className="max-w-2xl space-y-6">
        {/* Branding */}
        <Card className="p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Branding</h3>
          <div className="space-y-3">
            <FormField label="Hospital name">
              <input defaultValue="Debre Markos Referral Hospital" className={inputCls} />
            </FormField>
            <FormField label="Short name / slug">
              <input defaultValue="debremarkos" className={inputCls} />
            </FormField>
            <FormField label="Region">
              <select className={inputCls}><option>Amhara</option><option>Oromia</option></select>
            </FormField>
            <FormField label="Facility type">
              <select className={inputCls}><option>Referral Hospital</option><option>General Hospital</option><option>Primary Hospital</option></select>
            </FormField>
          </div>
        </Card>

        {/* Language */}
        <Card className="p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Language</h3>
          <p className="text-sm text-slate-500 mb-3">Set the default interface language for this hospital's workspace. Staff can override per-session.</p>
          <div className="flex gap-3">
            {(["en", "am"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-5 py-2 rounded border text-sm font-medium transition-colors ${lang === l ? "bg-teal-600 text-white border-teal-600" : "bg-white text-slate-700 border-slate-200 hover:border-teal-400"}`}
              >
                {l === "en" ? "English" : "አማርኛ (Amharic)"}
              </button>
            ))}
          </div>
          {lang === "am" && (
            <p className="mt-3 text-sm text-teal-700 bg-teal-50 rounded p-2">
              ቋንቋ ወደ አማርኛ ተቀይሯል — Language switched to Amharic
            </p>
          )}
        </Card>

        {/* CBHI */}
        <Card className="p-5">
          <h3 className="font-semibold text-slate-800 mb-4">CBHI Claim Rules</h3>
          <div className="space-y-3">
            <FormField label="CBHI reimbursement rate (%)">
              <input type="number" value={cbhiRate} onChange={(e) => setCbhiRate(e.target.value)} className={inputCls} />
            </FormField>
            <FormField label="Claim submission deadline (days)">
              <input type="number" defaultValue="30" className={inputCls} />
            </FormField>
            <FormField label="CBHI scheme office">
              <input defaultValue="Amhara Regional CBHI Office" className={inputCls} />
            </FormField>
            <div className="flex items-center gap-2">
              <input type="checkbox" defaultChecked id="auto-submit" className="accent-teal-600 w-4 h-4" />
              <label htmlFor="auto-submit" className="text-sm text-slate-700">Auto-submit CBHI claims on invoice completion</label>
            </div>
          </div>
        </Card>

        <div className="flex gap-2">
          <button onClick={save} className={btnPrimary}>{saved ? "Saved ✓" : "Save settings"}</button>
          <button className={btnSecondary}>Cancel</button>
        </div>
      </div>
    </PageShell>
  );
}
