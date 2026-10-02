"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle } from "lucide-react";

const MODULES_LIST = ["OPD Queue", "EMR / Clinical Notes", "Lab & Results", "Pharmacy & Inventory", "Referral Management", "CBHI Billing", "Ward / Bed Management", "Analytics & Reporting"];

const STEPS = ["Hospital Details", "Choose Plan", "Enable Modules", "Invite Staff", "Done"];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [modules, setModules] = useState<string[]>(["OPD Queue", "CBHI Billing"]);
  const router = useRouter();

  const toggle = (m: string) =>
    setModules((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <div className="text-center mb-8">
          <div className="w-10 h-10 rounded-lg bg-teal-500 flex items-center justify-center font-bold text-white text-lg mx-auto mb-3">N</div>
          <h1 className="text-xl font-bold text-slate-900">Set up your workspace</h1>
        </div>

        {/* Steps */}
        <div className="flex items-center justify-between mb-8 px-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i < step ? "bg-teal-600 text-white" : i === step ? "bg-teal-600 text-white ring-2 ring-teal-200" : "bg-slate-200 text-slate-500"}`}>
                {i < step ? "✓" : i + 1}
              </div>
              <span className={`text-xs hidden sm:block ${i === step ? "text-teal-700 font-medium" : "text-slate-400"}`}>{s}</span>
              {i < STEPS.length - 1 && <div className="w-8 h-px bg-slate-200 mx-1" />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-slate-800 mb-4">Hospital details</h2>
              <div><label className="block text-xs text-slate-500 mb-1">Hospital name</label><input defaultValue="Debre Markos Referral Hospital" className="w-full px-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:border-teal-400" /></div>
              <div><label className="block text-xs text-slate-500 mb-1">Workspace slug</label><input defaultValue="debremarkos" className="w-full px-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:border-teal-400" /></div>
              <div><label className="block text-xs text-slate-500 mb-1">Region</label>
                <select className="w-full px-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:border-teal-400 bg-white"><option>Amhara</option><option>Oromia</option></select>
              </div>
              <div><label className="block text-xs text-slate-500 mb-1">Facility type</label>
                <select className="w-full px-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:border-teal-400 bg-white"><option>Referral Hospital</option><option>General Hospital</option><option>Primary Hospital</option><option>Health Centre</option><option>Private Clinic</option></select>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-slate-800 mb-4">Choose your plan</h2>
              {["Basic OPD — ETB 2,500/mo", "Full Clinical — ETB 7,500/mo", "Enterprise — Custom"].map((p) => (
                <label key={p} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-teal-400 cursor-pointer has-[:checked]:border-teal-500 has-[:checked]:bg-teal-50 transition-colors">
                  <input type="radio" name="plan" className="accent-teal-600" defaultChecked={p.startsWith("Basic")} />
                  <span className="text-sm text-slate-700 font-medium">{p}</span>
                </label>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <h2 className="font-semibold text-slate-800 mb-4">Enable modules</h2>
              {MODULES_LIST.map((m) => (
                <label key={m} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-teal-400 cursor-pointer transition-colors">
                  <input type="checkbox" checked={modules.includes(m)} onChange={() => toggle(m)} className="accent-teal-600 w-4 h-4" />
                  <span className="text-sm text-slate-700">{m}</span>
                </label>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-slate-800 mb-4">Invite staff</h2>
              {[0, 1, 2].map((i) => (
                <div key={i} className="grid grid-cols-2 gap-2">
                  <input className="px-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:border-teal-400" placeholder="Email address" />
                  <select className="px-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:border-teal-400 bg-white">
                    <option>Select role</option>
                    <option>Doctor</option><option>Nurse</option><option>Receptionist</option>
                    <option>Pharmacist</option><option>Lab Technician</option><option>Billing Officer</option>
                  </select>
                </div>
              ))}
              <button className="text-xs text-teal-600 hover:underline">+ Add another</button>
            </div>
          )}

          {step === 4 && (
            <div className="text-center py-6">
              <CheckCircle size={48} className="text-teal-500 mx-auto mb-4" />
              <h2 className="font-bold text-slate-800 text-lg mb-2">Workspace ready!</h2>
              <p className="text-sm text-slate-500 mb-6">Debre Markos Referral Hospital has been set up on Nova HMS. Invite emails have been sent to your staff.</p>
              <button onClick={() => router.push("/nova/hospital-admin")} className="px-6 py-2.5 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 transition-colors font-medium">
                Open dashboard →
              </button>
            </div>
          )}

          {step < 4 && (
            <div className="flex justify-between mt-6">
              <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="px-4 py-2 text-sm border border-slate-200 rounded text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors">Back</button>
              <button onClick={() => setStep((s) => s + 1)} className="px-5 py-2 bg-teal-600 text-white text-sm rounded hover:bg-teal-700 transition-colors font-medium">
                {step === 3 ? "Finish setup" : "Continue"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
