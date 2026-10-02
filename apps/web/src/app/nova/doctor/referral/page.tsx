"use client";
// ─── CREATE REFERRAL PAGE ──────────────────────────────────────────────────────
// Role: Doctor
// Purpose: Creates an inter-facility referral for a patient who requires care
//          beyond what this hospital can provide.
//
// Business Rules (enforced by the API router):
//   BR-18: clinicalSummary must be ≥ 50 characters.
//          Rationale: the receiving facility must have enough clinical context
//          to act immediately. A summary like "refer for review" is insufficient.
//   BR-19: Patient must have an active visit opened TODAY.
//          Rationale: a referral without an active encounter is clinically invalid.
//   BR-20: Referrals unconfirmed within 72 hours are auto-flagged "lost"
//          by the server's flagLost() mutation (should be called by a cron job).
//
// ⚠ PRODUCTION WARNING — this page currently uses PATIENTS mock data to populate
//   the patient panel. It must be replaced with the real visit/patient from tRPC
//   using a visitId URL param. The submit button also only sets local state; it
//   does NOT call the real referral.create API endpoint. Fix before go-live.
//
// TODO (HIGH): Wire visitId from URL params → trpc.visit.get → real patient data.
// TODO (HIGH): Replace setSubmitted(true) with trpc.referral.create.mutate().
// TODO (CRITICAL — P1): Remove defaultValue strings from clinical text areas.
//   "Cardiac evaluation — patient presents with atypical chest pain…" and
//   "57-year-old male, known T2DM…" are fake data that will save to real records.
// ──────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import { PATIENTS } from "@/lib/nova-mock-data"; // TODO: replace with tRPC visit.get
import { PageShell, Card, FormField, inputCls, btnPrimary, btnSecondary } from "@/components/nova/nova-ui";
import { CheckCircle } from "lucide-react";

// Ethiopian referral network — receiving facilities a patient may be sent to
const FACILITIES = [
  "Tikur Anbessa Specialized Hospital, Addis Ababa",
  "Gondar University Hospital, Gondar",
  "St. Paul's Hospital Millennium, Addis Ababa",
  "Black Lion Hospital, Addis Ababa",
  "Jimma University Medical Center, Jimma",
  "Mekelle University Hospital, Mekelle",
];

export default function CreateReferralPage() {
  // TODO: Replace with real patient from URL param visitId + tRPC visit.get
  const patient = PATIENTS[2]; // Mulugeta Haile — hardcoded for prototype only
  const [submitted, setSubmitted] = useState(false);

  // TODO (HIGH): Replace with trpc.referral.create.mutate() which enforces
  // BR-18 (min 50 chars) and BR-19 (active visit today) at the server level.
  // Currently clicking Submit just sets local state — nothing is saved to the DB.
  if (submitted) {
    return (
      <PageShell title="Create Referral">
        <Card className="p-10 text-center max-w-md mx-auto">
          <CheckCircle size={48} className="text-teal-500 mx-auto mb-4" />
          <h2 className="font-bold text-slate-800 text-lg mb-2">Referral created</h2>
          <p className="text-sm text-slate-500 mb-6">
            {/* TODO: show real referral ID from API response */}
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

            {/* Receiving facility — selected from the national referral network */}
            <FormField label="Referring to (facility)">
              <select className={inputCls}>
                {FACILITIES.map((f) => <option key={f}>{f}</option>)}
              </select>
            </FormField>

            <FormField label="Receiving department / specialty">
              {/* TODO (CRITICAL — P1): Remove defaultValue "Cardiology" — must be blank */}
              <input className={inputCls} defaultValue="Cardiology" placeholder="e.g. Cardiology" />
            </FormField>

            <FormField label="Urgency">
              <select className={inputCls}><option>Routine</option><option>Urgent</option><option>Emergency</option></select>
            </FormField>

            {/* BR-18: reason field — minimum 5 characters enforced by API */}
            <FormField label="Reason for referral">
              {/* TODO (CRITICAL — P1): Remove defaultValue — fake clinical text on a real patient */}
              <textarea className={`${inputCls} resize-none h-20`} defaultValue="Cardiac evaluation — patient presents with atypical chest pain, requires specialist review and possible cardiac workup." />
            </FormField>

            {/* BR-18: clinical summary — minimum 50 characters enforced by referral.create API */}
            <FormField label="Clinical summary (min 50 characters — BR-18)">
              {/* TODO (CRITICAL — P1): Remove defaultValue — fake clinical summary */}
              <textarea className={`${inputCls} resize-none h-24`} defaultValue="57-year-old male, known T2DM and hypertension. Presenting with 2-week history of exertional chest pain. ECG shows non-specific ST changes. BP 148/92 on current medications." />
            </FormField>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="print" className="accent-teal-600 w-4 h-4" defaultChecked />
              <label htmlFor="print" className="text-sm text-slate-700">Generate printable referral letter for patient</label>
            </div>
          </div>
        </Card>

        <div className="flex gap-2">
          {/* TODO (HIGH): Replace with actual trpc.referral.create mutation call */}
          <button onClick={() => setSubmitted(true)} className={btnPrimary}>Submit referral</button>
          <button className={btnSecondary}>Save draft</button>
        </div>
      </div>
    </PageShell>
  );
}
