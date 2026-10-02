"use client";
// ─── KIOSK SELF-SERVICE CHECK-IN ─────────────────────────────────────────────
// Role: Patient (self-service) / Reception staff
// Purpose: Touchscreen kiosk in the hospital waiting area. Patients scan their
//          physical QR card (printed at registration) or type their Health ID
//          to check in and receive a queue ticket without queuing at the reception desk.
//
// Flow:
//   Home → [Scan QR | Enter Health ID] → Patient found → Confirm identity
//   → Ticket issued → Patient proceeds to waiting hall
//
// QR scanning: uses the jsQR library via the QRScanner component.
//   The QR payload encodes the patient's healthId and name.
//
// ⚠ PRODUCTION WARNING — patient lookup uses the PATIENTS mock array.
//   Scanned or typed Health IDs are matched against 6 hardcoded demo patients only.
//   A patient registered today will not be found.
//
// TODO (HIGH): Replace PATIENTS.find() with trpc.patient.search({ query: healthId })
//   After finding the patient, also call trpc.visit.openVisit() to create a real
//   visit and issue a real OPD ticket (not just a random local ticket number).
//   Without this, the kiosk is purely cosmetic — no visit is created in the DB.
//
// TODO (HIGH): Remove the hardcoded patient initialState in useState<KioskPatient>:
//   { name: "Abebe Kebede", healthId: "DMH-00123", ... }
//   This will confuse staff if the kiosk is opened on a real deployment.
// ──────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import { PATIENTS } from "@/lib/nova-mock-data"; // TODO: replace with trpc.patient.search
import QRScanner from "@/components/nova/qr-scanner";
import { QrCode, CheckCircle, Hash, ArrowLeft, Printer, ShieldCheck } from "lucide-react";

interface KioskPatient {
  name: string;
  nameAm?: string;
  healthId: string;
  dept: string;
  ticket: string;
  cbhi?: boolean;
}

export default function KioskPage() {
  const [step, setStep] = useState<"home" | "scan" | "found" | "ticket">("home");
  const [method, setMethod] = useState<"qr" | "id" | null>(null);
  const [idInput, setIdInput] = useState("");
  // TODO (HIGH): Remove hardcoded default — this prefills "Abebe Kebede" on every load
  const [patient, setPatient] = useState<KioskPatient>({
    name: "Abebe Kebede",          // ← REMOVE: hardcoded demo patient
    nameAm: "አበበ ከበደ",
    healthId: "DMH-00123",         // ← REMOVE: hardcoded Health ID
    ticket: "A-007",
    dept: "OPD General Medicine",
    cbhi: true,
  });

  const generateTicketNumber = () => {
    const letters = ["A", "B", "C"];
    const letter = letters[Math.floor(Math.random() * letters.length)];
    const num = String(Math.floor(Math.random() * 80) + 1).padStart(3, "0");
    return `${letter}-${num}`;
  };

  // TODO (HIGH): Replace PATIENTS.find() with trpc.patient.search({ query: healthId })
  //   Then call trpc.visit.openVisit() to create a real visit + OPD ticket.
  const handleQRScanned = (decoded: { healthId: string; name?: string; raw: string }) => {
    const matched = PATIENTS.find(
      (p) =>
        p.healthId.toLowerCase() === decoded.healthId.toLowerCase() ||
        p.id.toLowerCase() === decoded.healthId.toLowerCase()
    );

    const ticket = generateTicketNumber();

    if (matched) {
      setPatient({
        name: matched.name,
        nameAm: matched.nameAm,
        healthId: matched.healthId,
        ticket,
        dept: "OPD General Medicine",
        cbhi: matched.cbhi,
      });
    } else {
      setPatient({
        name: decoded.name || "Patient",
        nameAm: "",
        healthId: decoded.healthId,
        ticket,
        dept: "OPD General Medicine",
        cbhi: false,
      });
    }

    setStep("found");
  };

  // TODO (HIGH): Replace PATIENTS.find() with trpc.patient.search({ query: cleanId })
  //   and trpc.visit.openVisit() to persist the visit + ticket to the database.
  const handleIdLookup = () => {
    if (!idInput) return;
    const cleanId = idInput.trim().toUpperCase();
    const matched = PATIENTS.find(
      (p) => p.healthId.toUpperCase() === cleanId || p.healthId.toUpperCase().includes(cleanId)
    );

    const ticket = generateTicketNumber();

    if (matched) {
      setPatient({
        name: matched.name,
        nameAm: matched.nameAm,
        healthId: matched.healthId,
        ticket,
        dept: "OPD General Medicine",
        cbhi: matched.cbhi,
      });
    } else {
      setPatient({
        name: "Identified Patient",
        nameAm: "",
        healthId: cleanId.startsWith("DMH-") ? cleanId : `DMH-${cleanId}`,
        ticket,
        dept: "OPD General Medicine",
        cbhi: false,
      });
    }

    setStep("found");
  };

  const handlePrintTicket = () => {
    window.print();
  };

  return (
    <div className="h-full bg-[#0a1824] flex items-center justify-center overflow-y-auto p-4 md:p-6 text-white select-none">
      <div className="w-full max-w-lg text-center">
        {/* Brand Header */}
        <div className="flex items-center justify-center gap-2.5 mb-6">
          <div className="w-11 h-11 rounded-xl bg-teal-500 flex items-center justify-center font-black text-white text-2xl shadow-lg">
            N
          </div>
          <div className="text-left">
            <span className="font-extrabold text-white text-xl tracking-wide block leading-none">
              Nova HMS
            </span>
            <span className="text-xs text-teal-300 font-medium">
              Debre Markos Referral Hospital · Self Kiosk
            </span>
          </div>
        </div>

        {/* STEP 1: HOME */}
        {step === "home" && (
          <div className="animate-in fade-in zoom-in-95 duration-200">
            <div className="mb-6">
              <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-1.5">
                Welcome / እንኳን ደህና መጡ
              </h1>
              <p className="text-teal-200 text-sm">
                Fast Patient Check-in / ፈጣን ራስ-አገልግሎት ምዝገባ
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 max-w-md mx-auto">
              <button
                type="button"
                onClick={() => {
                  setMethod("qr");
                  setStep("scan");
                }}
                className="flex items-center justify-between p-6 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white rounded-2xl shadow-xl transition-all transform active:scale-98 text-left group border border-teal-400/40"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                    <QrCode size={34} className="text-white group-hover:scale-110 transition-transform" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg leading-tight">Scan Patient QR Card</h3>
                    <p className="text-teal-100 text-xs mt-0.5">የQR ካርድዎን ይቃኙ</p>
                  </div>
                </div>
                <span className="text-xs font-bold px-3 py-1 bg-white/20 rounded-full">
                  Fastest ⚡
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMethod("id");
                  setStep("scan");
                }}
                className="flex items-center justify-between p-6 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl shadow-xl transition-all transform active:scale-98 text-left group border border-slate-700"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-slate-700 flex items-center justify-center shrink-0">
                    <Hash size={34} className="text-teal-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg leading-tight">Enter Health ID Number</h3>
                    <p className="text-slate-400 text-xs mt-0.5">የመታወቂያ ቁጥርዎን ያስገቡ</p>
                  </div>
                </div>
                <span className="text-xs text-slate-400">Keypad →</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: SCAN VIA QR */}
        {step === "scan" && method === "qr" && (
          <div className="animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => setStep("home")}
                className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white px-3 py-1.5 bg-slate-800 rounded-lg transition-colors"
              >
                <ArrowLeft size={14} />
                <span>Back / ተመለስ</span>
              </button>
              <h2 className="text-lg font-bold text-white">Scan Patient QR Card</h2>
              <div className="w-16" />
            </div>

            <p className="text-xs text-slate-300 mb-4">
              Hold your ID card towards the camera lens / ካርድዎን በካሜራው ፊት ያሳዩ
            </p>

            <div className="flex justify-center mb-4">
              <QRScanner onScan={handleQRScanned} />
            </div>
          </div>
        )}

        {/* STEP 2: SCAN VIA KEYPAD */}
        {step === "scan" && method === "id" && (
          <div className="animate-in fade-in zoom-in-95 duration-200 max-w-sm mx-auto">
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => setStep("home")}
                className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white px-3 py-1.5 bg-slate-800 rounded-lg transition-colors"
              >
                <ArrowLeft size={14} />
                <span>Back / ተመለስ</span>
              </button>
              <h2 className="text-base font-bold text-white">Enter Health ID</h2>
              <div className="w-16" />
            </div>

            <input
              value={idInput}
              onChange={(e) => setIdInput(e.target.value)}
              placeholder="DMH-XXXXX"
              className="w-full text-center text-2xl py-3 px-4 rounded-xl bg-slate-800 text-teal-300 border-2 border-slate-600 focus:border-teal-400 focus:outline-hidden mb-4 font-mono tracking-widest uppercase font-bold"
            />

            <div className="grid grid-cols-3 gap-2 mb-4">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "DMH-", "0", "⌫"].map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() =>
                    k === "⌫" ? setIdInput((v) => v.slice(0, -1)) : setIdInput((v) => v + k)
                  }
                  className="py-3.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-white rounded-xl font-bold transition-all text-lg shadow-sm border border-slate-700/80 active:scale-95"
                >
                  {k}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleIdLookup}
              disabled={!idInput}
              className={`w-full py-3.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold transition-colors shadow-lg ${
                !idInput ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              Verify Patient & Continue →
            </button>
          </div>
        )}

        {/* STEP 3: FOUND CONFIRMATION */}
        {step === "found" && (
          <div className="animate-in fade-in zoom-in-95 duration-200 max-w-md mx-auto">
            <h2 className="text-xl font-extrabold text-white mb-1">
              Confirm Your Identity / እባክዎ ያረጋግጡ
            </h2>
            <p className="text-xs text-slate-300 mb-5">
              Please verify your patient details before ticket generation
            </p>

            <div className="bg-slate-800/90 rounded-2xl p-5 mb-6 text-left border border-slate-700 space-y-3.5 shadow-xl">
              <div className="flex justify-between items-center pb-3 border-b border-slate-700">
                <span className="text-xs text-slate-400 uppercase tracking-wider">Patient Name</span>
                <div className="text-right">
                  <p className="text-white font-bold text-base">{patient.name}</p>
                  {patient.nameAm && (
                    <p className="text-teal-300 text-xs">{patient.nameAm}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center pb-3 border-b border-slate-700">
                <span className="text-xs text-slate-400 uppercase tracking-wider">Health ID</span>
                <span className="text-teal-300 font-mono font-bold text-sm tracking-wider">
                  {patient.healthId}
                </span>
              </div>

              <div className="flex justify-between items-center pb-3 border-b border-slate-700">
                <span className="text-xs text-slate-400 uppercase tracking-wider">Department</span>
                <span className="text-white font-medium text-xs bg-slate-700 px-2 py-0.5 rounded">
                  {patient.dept}
                </span>
              </div>

              {patient.cbhi && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 p-2 rounded-lg">
                  <ShieldCheck size={14} className="shrink-0" />
                  <span>CBHI Insurance Valid — 100% Co-pay covered</span>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep("ticket")}
                className="flex-1 py-4 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-extrabold text-sm shadow-xl transition-all active:scale-98"
              >
                Yes, Check Me In / ትክክል ነው ✓
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep("home");
                  setIdInput("");
                }}
                className="px-5 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
              >
                Not Me / ሌላ ሰው
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: TICKET ISSUED */}
        {step === "ticket" && (
          <div className="animate-in fade-in zoom-in-95 duration-200 max-w-md mx-auto">
            <CheckCircle size={52} className="text-teal-400 mx-auto mb-3" />
            <h2 className="text-2xl font-black text-white mb-0.5">
              You're Checked In!
            </h2>
            <p className="text-teal-300 text-sm mb-5">በተሳካ ሁኔታ ተመዝግበዋል</p>

            <div className="bg-gradient-to-br from-teal-600 to-teal-800 rounded-3xl p-6 mb-5 shadow-2xl border border-teal-400/40 text-center">
              <p className="text-teal-100 text-xs font-semibold uppercase tracking-wider mb-1">
                Your Queue Ticket Number / የወረፋ ቁጥርዎ
              </p>
              <p className="text-6xl font-black text-white tracking-tight my-2 font-mono">
                {patient.ticket}
              </p>
              <div className="inline-block bg-teal-900/50 px-3 py-1 rounded-full text-teal-200 text-xs font-medium">
                {patient.dept}
              </div>

              <div className="mt-4 pt-3 border-t border-teal-500/40 text-xs text-teal-100 flex justify-between">
                <span>Estimated Wait: ~10 mins</span>
                <span>{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </div>

            <p className="text-slate-300 text-xs mb-6 leading-relaxed">
              Please proceed to the OPD waiting hall. The display board and audio announcer will call ticket <strong>{patient.ticket}</strong> when the doctor is ready.
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handlePrintTicket}
                className="flex-1 flex items-center justify-center gap-1.5 py-3.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs transition-colors border border-slate-700"
              >
                <Printer size={15} />
                <span>Print Physical Slip / ወረቀት አትም</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep("home");
                  setIdInput("");
                }}
                className="flex-1 py-3.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-xs transition-colors"
              >
                Done / ጨርሻለሁ
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
