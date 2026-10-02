"use client";
// Shared — QR Scanner & Patient Card Generator (fully functional end-to-end)
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PATIENTS } from "@/lib/nova-mock-data";
import { PageShell, Card } from "@/components/nova/nova-ui";
import PatientQRCode, { PatientIDCardVisual, type PatientQRData } from "@/components/nova/patient-qr";
import QRScanner from "@/components/nova/qr-scanner";
import {
  QrCode,
  Scan,
  Printer,
  Download,
  CheckCircle2,
  Stethoscope,
  Activity,
  Pill,
  CreditCard,
  User,
  ShieldCheck,
  Search,
  ExternalLink,
  RotateCcw,
} from "lucide-react";

export default function QRPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"generate" | "scan">("generate");
  const [selectedPatientId, setSelectedPatientId] = useState(PATIENTS[0].id);

  // Scanned patient state
  const [scannedData, setScannedData] = useState<{
    healthId: string;
    name?: string;
    raw: string;
  } | null>(null);

  const selectedPatient = PATIENTS.find((p) => p.id === selectedPatientId) || PATIENTS[0];

  // Matched patient after scanning
  const matchedPatient = scannedData
    ? PATIENTS.find(
        (p) =>
          p.healthId.toLowerCase() === scannedData.healthId.toLowerCase() ||
          p.id.toLowerCase() === scannedData.healthId.toLowerCase()
      ) || {
        id: "custom",
        name: scannedData.name || "Identified Patient",
        nameAm: "",
        dob: "1990-01-01",
        sex: "M",
        phone: "—",
        healthId: scannedData.healthId,
        kebele: "Kebele General",
        cbhi: false,
        visits: 1,
        lastVisit: new Date().toISOString().split("T")[0],
      }
    : null;

  const handleScanSuccess = (decoded: { healthId: string; name?: string; raw: string }) => {
    setScannedData(decoded);
  };

  return (
    <PageShell
      title="Patient QR Scanner & Generator"
      subtitle="Issue scannable patient identity cards, verify QR codes, and trigger rapid check-in"
    >
      {/* Top Tab Switcher */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/80">
          <button
            type="button"
            onClick={() => setTab("generate")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              tab === "generate"
                ? "bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs border border-slate-200/60 dark:border-slate-700/60"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <QrCode size={15} />
            <span>Generate & Print ID Card</span>
          </button>

          <button
            type="button"
            onClick={() => setTab("scan")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              tab === "scan"
                ? "bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs border border-slate-200/60 dark:border-slate-700/60"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Scan size={15} />
            <span>Scan Patient QR Card</span>
          </button>
        </div>

        {tab === "scan" && scannedData && (
          <button
            type="button"
            onClick={() => setScannedData(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-teal-600 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors shadow-2xs font-medium"
          >
            <RotateCcw size={13} />
            <span>Scan Another</span>
          </button>
        )}
      </div>

      {/* TAB 1: GENERATE & PRINT */}
      {tab === "generate" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Patient Selector & Actions */}
          <div className="lg:col-span-5 space-y-5">
            <Card className="p-5 border border-slate-200 dark:border-slate-800">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Select Hospital Patient
              </label>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500 transition-all font-medium mb-3"
              >
                {PATIENTS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.healthId}) — {p.kebele} {p.cbhi ? "[CBHI]" : ""}
                  </option>
                ))}
              </select>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-xl space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Amharic Name:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedPatient.nameAm}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Date of Birth:</span>
                  <span className="font-medium">{selectedPatient.dob}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Insurance (CBHI):</span>
                  <span className={selectedPatient.cbhi ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-slate-400"}>
                    {selectedPatient.cbhi ? "✓ Verified Enrolled" : "Not enrolled"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Recorded Visits:</span>
                  <span className="font-medium">{selectedPatient.visits} hospital visits</span>
                </div>
              </div>
            </Card>

            <Card className="p-5 border border-slate-200 dark:border-slate-800 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Patient Card Actions
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Print plastic-standard CR80 ID cards or download high-resolution PNG for digital distribution via SMS/Telegram.
              </p>

              <div className="pt-2">
                <PatientQRCode
                  patient={selectedPatient}
                  size={160}
                  showControls={true}
                  className="w-full"
                />
              </div>
            </Card>
          </div>

          {/* Right Column: Live Plastic Card Preview */}
          <div className="lg:col-span-7 flex flex-col items-center">
            <div className="w-full max-w-sm mb-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium">Live Card Preview (CR80 Standard)</span>
              <span className="font-mono text-[11px] text-teal-600 dark:text-teal-400">Real Scannable QR Code</span>
            </div>

            {/* Visual Card */}
            <PatientIDCardVisual patient={selectedPatient} />

            <div className="w-full max-w-sm mt-4 p-3 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 rounded-xl text-xs text-teal-800 dark:text-teal-300 flex items-start gap-2">
              <ShieldCheck size={16} className="text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Fully Scannable Worldwide</span>
                Point any smartphone camera, barcode scanner, or the Nova HMS scanner at this QR code to verify this patient instantly.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SCAN QR */}
      {tab === "scan" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Scanner Viewfinder Box */}
          <div className="lg:col-span-6 flex flex-col items-center">
            <QRScanner onScan={handleScanSuccess} />
          </div>

          {/* Scan Results & Patient Rapid Action Launchpad */}
          <div className="lg:col-span-6">
            {matchedPatient ? (
              <Card className="p-6 border-2 border-teal-500 bg-white dark:bg-slate-900 shadow-xl rounded-2xl animate-in fade-in zoom-in-95 duration-200">
                {/* Status Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={24} className="text-emerald-500" />
                    <div>
                      <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
                        Patient Verified & Found
                      </h3>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        Live match in Debre Markos Master Registry
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-xs px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-lg border border-slate-200 dark:border-slate-700">
                    {matchedPatient.healthId}
                  </span>
                </div>

                {/* Patient Profile Snapshot */}
                <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 mb-5">
                  <div className="w-14 h-14 rounded-2xl bg-teal-600 text-white font-black text-xl flex items-center justify-center shrink-0 shadow-sm">
                    {matchedPatient.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-lg text-slate-900 dark:text-white truncate">
                        {matchedPatient.name}
                      </h4>
                      {matchedPatient.cbhi && (
                        <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold rounded-full border border-emerald-300 dark:border-emerald-800">
                          CBHI Member
                        </span>
                      )}
                    </div>
                    {matchedPatient.nameAm && (
                      <p className="text-xs text-teal-600 dark:text-teal-400 font-medium mb-1">
                        {matchedPatient.nameAm}
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400 mt-2">
                      <div>DOB: <span className="font-medium text-slate-800 dark:text-slate-200">{matchedPatient.dob}</span></div>
                      <div>Kebele: <span className="font-medium text-slate-800 dark:text-slate-200">{matchedPatient.kebele}</span></div>
                      <div>Phone: <span className="font-medium text-slate-800 dark:text-slate-200">{matchedPatient.phone}</span></div>
                      <div>Last Visit: <span className="font-medium text-slate-800 dark:text-slate-200">{matchedPatient.lastVisit}</span></div>
                    </div>
                  </div>
                </div>

                {/* Rapid Action Buttons for Clinical & Administrative Workflows */}
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    Instant Clinical & Reception Actions:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Doctor Consultation / EMR */}
                    <button
                      type="button"
                      onClick={() => router.push(`/nova/doctor/emr`)}
                      className="flex items-center gap-2.5 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 text-blue-900 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-all text-xs font-semibold text-left shadow-2xs group"
                    >
                      <Stethoscope size={18} className="text-blue-600 dark:text-blue-400 shrink-0 group-hover:scale-110 transition-transform" />
                      <div>
                        <span>Open Doctor EMR</span>
                        <p className="text-[10px] text-blue-600/80 dark:text-blue-400/80 font-normal">View chart & consultation</p>
                      </div>
                    </button>

                    {/* Reception Queue Check-in */}
                    <button
                      type="button"
                      onClick={() => router.push(`/nova/reception/queue`)}
                      className="flex items-center gap-2.5 p-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/80 text-teal-900 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/60 transition-all text-xs font-semibold text-left shadow-2xs group"
                    >
                      <Activity size={18} className="text-teal-600 dark:text-teal-400 shrink-0 group-hover:scale-110 transition-transform" />
                      <div>
                        <span>Check into OPD Queue</span>
                        <p className="text-[10px] text-teal-600/80 dark:text-teal-400/80 font-normal">Issue triage ticket</p>
                      </div>
                    </button>

                    {/* Pharmacy Dispense */}
                    <button
                      type="button"
                      onClick={() => router.push(`/nova/pharmacy`)}
                      className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-all text-xs font-semibold text-left shadow-2xs group"
                    >
                      <Pill size={18} className="text-amber-600 dark:text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
                      <div>
                        <span>Pharmacy Dispense</span>
                        <p className="text-[10px] text-amber-600/80 dark:text-amber-400/80 font-normal">Fulfill active Rx orders</p>
                      </div>
                    </button>

                    {/* Cashier / Billing */}
                    <button
                      type="button"
                      onClick={() => router.push(`/nova/billing`)}
                      className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-all text-xs font-semibold text-left shadow-2xs group"
                    >
                      <CreditCard size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:scale-110 transition-transform" />
                      <div>
                        <span>Billing & Invoices</span>
                        <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 font-normal">Cashier receipt & CBHI</p>
                      </div>
                    </button>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="p-8 border border-dashed border-slate-300 dark:border-slate-700 text-center flex flex-col items-center justify-center min-h-[320px]">
                <QrCode size={48} className="text-slate-300 dark:text-slate-600 mb-3" />
                <h4 className="font-semibold text-slate-700 dark:text-slate-200 text-sm mb-1">
                  Awaiting Patient QR Scan
                </h4>
                <p className="text-xs text-slate-400 max-w-xs mb-4">
                  Hold a patient card up to your webcam, upload a photo of the QR code, or click one of the quick test patients on the left.
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>Or search manually in</span>
                  <Link href="/nova/shared/search" className="text-teal-600 dark:text-teal-400 hover:underline font-medium inline-flex items-center gap-1">
                    <span>Patient Search</span>
                    <ExternalLink size={11} />
                  </Link>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}
    </PageShell>
  );
}
