"use client";
// Doctor — Create Referral (page 27)
import { useState } from "react";
import { PATIENTS } from "@/lib/nova-mock-data";
import { PageShell, Card, FormField, inputCls, btnPrimary, btnSecondary } from "@/components/nova/nova-ui";
import { CheckCircle } from "lucide-react";

const FACILITIES = [
  "Tikur Anbessa Specialized Hospital, Addis Ababa",
  "Gondar University Hospital, Gondar",
  "St. Paul's Hospital Millennium, Addis Ababa",
  "Black Lion Hospital, Addis Ababa",
  "Jimma University Medical Center, Jimma",
  "Mekelle University Hospital, Mekelle",
];

export default function CreateReferralPage() {
  const patient = PATIENTS[2]; // Mulugeta Haile
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <PageShell title="Create Referral">
        <Card className="p-10 text-center max-w-md mx-auto">
          <CheckCircle size={48} className="text-teal-500 mx-auto mb-4" />
          <h2 className="font-bold text-slate-800 text-lg mb-2">Referral created</h2>
          <p className="text-sm text-slate-500 mb-6">
            REF-{Date.now().toString().slice(-5)} issued. Referral coordinator notified. Patient letter generated.
          </p>
          <button onClick={() => setSubmitted(false)} className={btnPrimary}>New referral</button>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell title="Create Referral" subtitle={`${patient.name} · ${patient.healthId}`}>
      <div className="max-w-xl space-y-5">
        <Card className="p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Referral details</h3>
          <div className="space-y-4">
            <FormField label="Referring to (facility)">
              <select className={inputCls}>
                {FACILITIES.map((f) => <option key={f}>{f}</option>)}
              </select>
            </FormField>
            <FormField label="Receiving department / specialty">
              <input className={inputCls} defaultValue="Cardiology" placeholder="e.g. Cardiology" />
            </FormField>
            <FormField label="Urgency">
              <select className={inputCls}><option>Routine</option><option>Urgent</option><option>Emergency</option></select>
            </FormField>
            <FormField label="Reason for referral">
              <textarea className={`${inputCls} resize-none h-20`} defaultValue="Cardiac evaluation — patient presents with atypical chest pain, requires specialist review and possible cardiac workup." />
            </FormField>
            <FormField label="Clinical summary">
              <textarea className={`${inputCls} resize-none h-24`} defaultValue="57-year-old male, known T2DM and hypertension. Presenting with 2-week history of exertional chest pain. ECG shows non-specific ST changes. BP 148/92 on current medications." />
            </FormField>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="print" className="accent-teal-600 w-4 h-4" defaultChecked />
              <label htmlFor="print" className="text-sm text-slate-700">Generate printable referral letter for patient</label>
            </div>
          </div>
        </Card>

        <div className="flex gap-2">
          <button onClick={() => setSubmitted(true)} className={btnPrimary}>Submit referral</button>
          <button className={btnSecondary}>Save draft</button>
        </div>
      </div>
    </PageShell>
  );
}
