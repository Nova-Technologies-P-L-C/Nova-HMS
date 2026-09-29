"use client";
// Hospital Admin — Hospital Settings (page 16)
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { trpc, queryClient } from "@/utils/trpc";
import { PageShell, Card, FormField, inputCls, btnPrimary, btnSecondary } from "@/components/nova/nova-ui";
import { useNovaRole } from "@/components/nova/nova-role-context";

export default function HospitalSettingsPage() {
  const { lang, setLang } = useNovaRole();
  const [cbhiRate, setCbhiRate] = useState("85");
  const [cardFee, setCardFee] = useState("50");
  const [specialistFee, setSpecialistFee] = useState("150");
  const [saved, setSaved] = useState(false);

  const { data: tenant } = useQuery(trpc.tenant.get.queryOptions());

  useEffect(() => {
    if (tenant) {
      if (tenant.cardFeeAmount !== undefined) setCardFee(String(tenant.cardFeeAmount));
      if (tenant.specialistFeeAmount !== undefined) setSpecialistFee(String(tenant.specialistFeeAmount));
    }
  }, [tenant]);

  const updateTariffs = useMutation({
    ...trpc.tenant.updateTariffs.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.tenant.get.queryKey() });
    },
  });

  const save = async () => {
    try {
      await updateTariffs.mutateAsync({
        cardFeeAmount: parseFloat(cardFee) || 50,
        specialistFeeAmount: parseFloat(specialistFee) || 150,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <PageShell title="Hospital Settings" subtitle="Branding, language, fee tariffs, and clinical configuration">
      <div className="max-w-2xl space-y-6">
        {/* Registration & Card Fee Tariffs */}
        <Card className="p-5 border-teal-200 bg-gradient-to-r from-teal-50/50 to-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-slate-800">OPD Card & Registration Fee Tariffs</h3>
            <span className="text-xs px-2 py-0.5 bg-teal-100 text-teal-800 rounded font-medium">Admin Controlled</span>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Configure the mandatory card and consultation fee charged to patients at reception upon arrival. CBHI patients are automatically 100% exempt from this cash fee.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Standard General OPD Card Fee (ETB)">
              <input
                type="number"
                value={cardFee}
                onChange={(e) => setCardFee(e.target.value)}
                className={`${inputCls} font-bold text-teal-800`}
                placeholder="50"
              />
            </FormField>
            <FormField label="Specialist Consultation Fee (ETB)">
              <input
                type="number"
                value={specialistFee}
                onChange={(e) => setSpecialistFee(e.target.value)}
                className={inputCls}
                placeholder="150"
              />
            </FormField>
          </div>
          <div className="mt-3 p-2.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600">
            ℹ️ When a patient arrives at reception, the receptionist collects this fee directly or marks CBHI/Emergency waiver before the ticket enters the doctor queue.
          </div>
        </Card>

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
          <button onClick={save} disabled={updateTariffs.isPending} className={btnPrimary}>
            {saved ? "Saved ✓" : updateTariffs.isPending ? "Saving..." : "Save settings"}
          </button>
          <button className={btnSecondary}>Cancel</button>
        </div>
      </div>
    </PageShell>
  );
}
