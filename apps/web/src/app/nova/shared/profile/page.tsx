"use client";
// Shared — My Profile / Account Settings (page 48)
import { useState } from "react";
import { MOCK_USER } from "@/lib/nova-mock-data";
import { PageShell, Card, FormField, inputCls, btnPrimary, btnSecondary } from "@/components/nova/nova-ui";
import { useNovaRole } from "@/components/nova/nova-role-context";

export default function ProfilePage() {
  const { role, lang, setLang } = useNovaRole();
  const [saved, setSaved] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);

  return (
    <PageShell title="My Profile" subtitle="Account settings and preferences">
      <div className="max-w-xl space-y-6">
        {/* Profile */}
        <Card className="p-5">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 rounded-full bg-teal-600 text-white font-bold text-xl flex items-center justify-center">{MOCK_USER.avatar}</div>
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-100 text-lg">{MOCK_USER.name}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{role} · {MOCK_USER.hospital}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="First name"><input defaultValue="Tigist" className={inputCls} /></FormField>
            <FormField label="Family name"><input defaultValue="Alemu" className={inputCls} /></FormField>
            <FormField label="Email"><input defaultValue="tigist@dmrh.gov.et" className={inputCls} /></FormField>
            <FormField label="Phone"><input defaultValue="0911234567" className={inputCls} /></FormField>
            <FormField label="Title / speciality"><input defaultValue="Internal Medicine" className={inputCls} /></FormField>
            <FormField label="Staff ID"><input defaultValue="S05" className={inputCls} readOnly /></FormField>
          </div>
          {saved && <p className="text-xs text-teal-600 dark:text-teal-400 mt-3">✓ Profile updated</p>}
          <div className="flex gap-2 mt-4">
            <button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000); }} className={btnPrimary}>Save changes</button>
            <button className={btnSecondary}>Cancel</button>
          </div>
        </Card>

        {/* Language preference */}
        <Card className="p-5">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Language preference</h3>
          <div className="flex gap-3">
            {(["en", "am"] as const).map((l) => (
              <button key={l} onClick={() => setLang(l)}
                className={`px-5 py-2 rounded border text-sm font-medium transition-colors ${lang === l ? "bg-teal-600 text-white border-teal-600" : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-teal-400"}`}>
                {l === "en" ? "English" : "አማርኛ"}
              </button>
            ))}
          </div>
        </Card>

        {/* Password */}
        <Card className="p-5">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Change password</h3>
          <div className="space-y-3">
            <FormField label="Current password"><input type="password" className={inputCls} placeholder="••••••••" /></FormField>
            <FormField label="New password"><input type="password" className={inputCls} placeholder="••••••••" /></FormField>
            <FormField label="Confirm new password"><input type="password" className={inputCls} placeholder="••••••••" /></FormField>
          </div>
          {pwSaved && <p className="text-xs text-teal-600 dark:text-teal-400 mt-2">✓ Password updated</p>}
          <button onClick={() => { setPwSaved(true); setTimeout(() => setPwSaved(false), 2000); }} className={`${btnPrimary} mt-4`}>Update password</button>
        </Card>

        {/* Danger zone */}
        <Card className="p-5 border-red-200 dark:border-red-900/50">
          <h3 className="font-semibold text-red-700 dark:text-red-400 mb-2">Sign out</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">This will end your current session on this device.</p>
          <button className="px-4 py-2 border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 text-sm rounded hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors font-medium">Sign out</button>
        </Card>
      </div>
    </PageShell>
  );
}
