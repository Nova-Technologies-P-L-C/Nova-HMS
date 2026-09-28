"use client";
// Reception — Kiosk Check-in Screen (page 19) — large touch targets, self-service
import { useState } from "react";
import { QrCode, CheckCircle, Hash } from "lucide-react";

export default function KioskPage() {
  const [step, setStep] = useState<"home" | "scan" | "found" | "ticket">("home");
  const [method, setMethod] = useState<"qr" | "id" | null>(null);
  const [idInput, setIdInput] = useState("");

  const MOCK_PATIENT = { name: "Abebe Kebede", nameAm: "አበበ ከበደ", healthId: "DMH-00123", ticket: "A-007", dept: "OPD" };

  return (
    <div className="h-full bg-[#0f2435] flex items-center justify-center overflow-y-auto p-6">
      <div className="w-full max-w-md text-center">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-lg bg-teal-500 flex items-center justify-center font-bold text-white text-xl">N</div>
          <span className="font-bold text-white text-xl tracking-wide">Nova HMS</span>
        </div>

        {step === "home" && (
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Welcome / እንኳን ደህና መጡ</h1>
            <p className="text-slate-300 mb-8">Self check-in / ራስ-አገልግሎት</p>
            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => { setMethod("qr"); setStep("scan"); }}
                className="flex items-center justify-center gap-4 p-6 bg-teal-600 hover:bg-teal-500 text-white rounded-xl transition-colors text-lg font-medium"
              >
                <QrCode size={32} />
                Scan QR / Patient card
              </button>
              <button
                onClick={() => { setMethod("id"); setStep("scan"); }}
                className="flex items-center justify-center gap-4 p-6 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors text-lg font-medium"
              >
                <Hash size={32} />
                Enter Health ID number
              </button>
            </div>
          </div>
        )}

        {step === "scan" && method === "qr" && (
          <div>
            <h2 className="text-xl font-bold text-white mb-6">Scan your patient card</h2>
            <div className="bg-slate-800 rounded-2xl p-8 mb-6 flex items-center justify-center border-2 border-dashed border-teal-500">
              <div className="text-center text-slate-300">
                <QrCode size={80} className="mx-auto mb-4 text-teal-400" />
                <p className="text-sm">Camera viewfinder (demo)</p>
                <p className="text-xs text-slate-500 mt-1">In production, camera activates here</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep("found")} className="flex-1 py-3 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-500 transition-colors">
                Simulate scan ✓
              </button>
              <button onClick={() => setStep("home")} className="px-5 py-3 bg-slate-700 text-white rounded-xl hover:bg-slate-600 transition-colors">
                Back
              </button>
            </div>
          </div>
        )}

        {step === "scan" && method === "id" && (
          <div>
            <h2 className="text-xl font-bold text-white mb-6">Enter your Health ID</h2>
            <input
              value={idInput}
              onChange={(e) => setIdInput(e.target.value)}
              placeholder="DMH-XXXXX"
              className="w-full text-center text-2xl py-4 px-4 rounded-xl bg-slate-800 text-white border-2 border-slate-600 focus:border-teal-400 focus:outline-none mb-6 font-mono tracking-widest"
            />
            <div className="grid grid-cols-3 gap-2 mb-4">
              {["1","2","3","4","5","6","7","8","9","DMH-","0","⌫"].map((k) => (
                <button key={k} onClick={() => k === "⌫" ? setIdInput((v) => v.slice(0, -1)) : setIdInput((v) => v + k)}
                  className="py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors text-lg">
                  {k}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep("found")} className="flex-1 py-3 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-500 transition-colors">
                Look up
              </button>
              <button onClick={() => setStep("home")} className="px-5 py-3 bg-slate-700 text-white rounded-xl hover:bg-slate-600 transition-colors">
                Back
              </button>
            </div>
          </div>
        )}

        {step === "found" && (
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Confirm your details</h2>
            <div className="bg-slate-800 rounded-2xl p-6 mb-6 text-left space-y-3">
              <div className="flex justify-between items-center border-b border-slate-700 pb-3">
                <span className="text-slate-400 text-sm">Name</span>
                <div className="text-right">
                  <p className="text-white font-semibold">{MOCK_PATIENT.name}</p>
                  <p className="text-teal-300 text-sm">{MOCK_PATIENT.nameAm}</p>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 text-sm">Health ID</span>
                <span className="text-white font-mono">{MOCK_PATIENT.healthId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 text-sm">Department</span>
                <span className="text-white">{MOCK_PATIENT.dept}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep("ticket")} className="flex-1 py-3 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-500 transition-colors">
                Confirm check-in
              </button>
              <button onClick={() => setStep("home")} className="px-5 py-3 bg-slate-700 text-white rounded-xl hover:bg-slate-600 transition-colors">
                Not me
              </button>
            </div>
          </div>
        )}

        {step === "ticket" && (
          <div>
            <CheckCircle size={56} className="text-teal-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">You're checked in</h2>
            <p className="text-slate-300 mb-6">ተመዝግበዋል</p>
            <div className="bg-teal-600 rounded-2xl p-8 mb-6">
              <p className="text-teal-100 text-sm mb-1">Your ticket number / የወረፋ ቁጥርዎ</p>
              <p className="text-6xl font-black text-white">{MOCK_PATIENT.ticket}</p>
              <p className="text-teal-100 text-sm mt-2">{MOCK_PATIENT.dept}</p>
            </div>
            <p className="text-slate-400 text-sm mb-6">Please take a seat. A staff member will call your number.<br/>እባክዎ ቁጥርዎ ሲጠራ ይጠብቁ።</p>
            <button onClick={() => setStep("home")} className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors">
              Done / ጨርሻለሁ
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
