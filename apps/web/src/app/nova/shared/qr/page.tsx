"use client";
// Shared — QR Scanner / Generator Screen (page 46)
import { useState } from "react";
import { PATIENTS } from "@/lib/nova-mock-data";
import { PageShell, Card } from "@/components/nova/nova-ui";
import { QrCode, Scan } from "lucide-react";

export default function QRPage() {
  const [tab, setTab] = useState<"generate" | "scan">("generate");
  const [selectedPatient, setSelectedPatient] = useState(PATIENTS[0].id);
  const patient = PATIENTS.find((p) => p.id === selectedPatient)!;

  return (
    <PageShell title="QR Scanner / Generator" subtitle="Patient ID cards and kiosk check-in codes">
      <div className="flex gap-1 mb-6">
        {(["generate", "scan"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm rounded transition-colors capitalize ${tab === t ? "bg-teal-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-teal-400"}`}>
            {t === "generate" ? "Generate ID card" : "Scan QR"}
          </button>
        ))}
      </div>

      {tab === "generate" && (
        <div className="max-w-sm space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">Select patient</label>
            <select value={selectedPatient} onChange={(e) => setSelectedPatient(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:border-teal-400 bg-white">
              {PATIENTS.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.healthId}</option>)}
            </select>
          </div>

          {/* Mock patient ID card */}
          <Card className="p-5 border-2 border-teal-500 bg-gradient-to-br from-teal-600 to-teal-800 text-white">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs text-teal-200 uppercase tracking-wider">Nova HMS · Patient ID</p>
                <p className="font-bold text-xl mt-1">{patient.name}</p>
                <p className="text-teal-200 text-sm">{patient.nameAm}</p>
              </div>
              <div className="w-8 h-8 rounded bg-white flex items-center justify-center">
                <span className="text-teal-700 font-black text-sm">N</span>
              </div>
            </div>
            {/* QR code placeholder */}
            <div className="bg-white rounded-lg p-3 w-28 h-28 flex items-center justify-center mb-4">
              <div className="grid grid-cols-5 gap-0.5">
                {Array.from({ length: 25 }).map((_, i) => (
                  <div key={i} className={`w-3.5 h-3.5 ${Math.random() > 0.4 ? "bg-slate-800" : "bg-white"} rounded-sm`} />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><p className="text-teal-300">Health ID</p><p className="font-mono font-bold">{patient.healthId}</p></div>
              <div><p className="text-teal-300">DOB</p><p>{patient.dob}</p></div>
              <div><p className="text-teal-300">CBHI</p><p>{patient.cbhi ? "Enrolled ✓" : "Not enrolled"}</p></div>
              <div><p className="text-teal-300">Hospital</p><p>DMRH</p></div>
            </div>
          </Card>
          <button className="w-full py-2 border border-teal-600 text-teal-600 text-sm rounded hover:bg-teal-50 transition-colors font-medium">
            Print / Download ID card
          </button>
        </div>
      )}

      {tab === "scan" && (
        <div className="max-w-sm space-y-4">
          <Card className="p-8 border-2 border-dashed border-slate-300 text-center">
            <Scan size={48} className="text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-600 font-medium">Camera viewfinder</p>
            <p className="text-xs text-slate-400 mt-1">Point camera at patient QR code</p>
            <p className="text-xs text-slate-300 mt-1">(Camera activates in production)</p>
          </Card>
          <button className="w-full py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors">
            Simulate scan — Abebe Kebede
          </button>
          <p className="text-xs text-slate-400 text-center">Or enter Health ID manually in <a href="/nova/shared/search" className="text-teal-600 hover:underline">Patient Search</a></p>
        </div>
      )}
    </PageShell>
  );
}
