"use client";
import React, { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";
import { Download, Printer, Copy, Check, QrCode as QrIcon, ShieldCheck } from "lucide-react";

export interface PatientQRData {
  healthId: string;
  name: string;
  nameAm?: string;
  dob?: string;
  phone?: string;
  kebele?: string;
  cbhi?: boolean;
  facility?: string;
  bloodGroup?: string;
}

export function createPatientQRPayload(patient: PatientQRData): string {
  return JSON.stringify({
    system: "NOVA_HMS",
    v: "1.0",
    id: patient.healthId,
    name: patient.name,
    dob: patient.dob,
    cbhi: patient.cbhi,
    facility: patient.facility || "Debre Markos Referral Hospital",
    issued: new Date().toISOString().split("T")[0],
  });
}

export function parsePatientQRPayload(raw: string): {
  healthId: string;
  name?: string;
  dob?: string;
  cbhi?: boolean;
  raw: string;
} {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return {
        healthId: parsed.id || parsed.healthId || raw,
        name: parsed.name,
        dob: parsed.dob,
        cbhi: parsed.cbhi,
        raw,
      };
    }
  } catch {
    // If not JSON, check if it contains Health ID format like DMH-XXXXX or URL
    const match = raw.match(/DMH-[A-Z0-9-]+/i);
    if (match) {
      return { healthId: match[0].toUpperCase(), raw };
    }
  }
  return { healthId: raw.trim(), raw };
}

interface PatientQRCodeProps {
  patient: PatientQRData;
  size?: number;
  showControls?: boolean;
  className?: string;
}

export default function PatientQRCode({
  patient,
  size = 180,
  showControls = true,
  className = "",
}: PatientQRCodeProps) {
  const [dataUrl, setDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const payload = createPatientQRPayload(patient);

  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(payload, {
      width: size * 2, // 2x for retina sharpness
      margin: 1,
      color: {
        dark: "#0f2435",
        light: "#ffffff",
      },
      errorCorrectionLevel: "H",
    })
      .then((url) => {
        if (isMounted) setDataUrl(url);
      })
      .catch((err) => console.error("Failed to generate QR code", err));

    return () => {
      isMounted = false;
    };
  }, [payload, size]);

  const handleCopy = () => {
    navigator.clipboard.writeText(payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `QR-${patient.healthId}-${patient.name.replace(/\s+/g, "_")}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Patient ID Card — ${patient.name} (${patient.healthId})</title>
          <style>
            @page { size: 85.6mm 54mm; margin: 0; }
            body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; }
            .card {
              width: 85.6mm;
              height: 54mm;
              box-sizing: border-box;
              padding: 10px 14px;
              background: linear-gradient(135deg, #0f2435 0%, #0d9488 100%);
              color: white;
              position: relative;
              overflow: hidden;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              border-radius: 8px;
            }
            .header { display: flex; justify-content: space-between; align-items: flex-start; }
            .title { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
            .subtitle { font-size: 8px; color: #a7f3d0; }
            .cbhi-badge { background: #059669; font-size: 8px; padding: 2px 6px; border-radius: 999px; font-weight: bold; }
            .body { display: flex; align-items: center; justify-content: space-between; margin-top: 4px; }
            .info { flex: 1; }
            .name { font-size: 14px; font-weight: 800; line-height: 1.2; }
            .name-am { font-size: 11px; color: #ccfbf1; margin-bottom: 4px; }
            .meta { font-size: 9px; color: #e2e8f0; line-height: 1.4; font-family: monospace; }
            .qr-box { background: white; padding: 4px; border-radius: 6px; width: 64px; height: 64px; flex-shrink: 0; }
            .qr-box img { width: 100%; height: 100%; display: block; }
            .footer { display: flex; justify-content: space-between; font-size: 7px; color: #94a3b8; border-top: 0.5px solid rgba(255,255,255,0.2); padding-top: 3px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <div>
                <div class="title">Nova HMS · DMRH</div>
                <div class="subtitle">Debre Markos Referral Hospital</div>
              </div>
              ${patient.cbhi ? '<div class="cbhi-badge">CBHI VERIFIED</div>' : ""}
            </div>
            <div class="body">
              <div class="info">
                <div class="name">${patient.name}</div>
                ${patient.nameAm ? `<div class="name-am">${patient.nameAm}</div>` : ""}
                <div class="meta">
                  ID: <strong>${patient.healthId}</strong><br/>
                  DOB: ${patient.dob || "—"}<br/>
                  Kebele: ${patient.kebele || "—"}
                </div>
              </div>
              <div class="qr-box">
                <img src="${dataUrl}" alt="Patient QR Code" />
              </div>
            </div>
            <div class="footer">
              <span>OFFICIAL PATIENT CARD · SCAN FOR INSTANT CHECK-IN</span>
              <span>VERIFIED VIA NOVA HMS</span>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* High-res QR Display */}
      <div className="relative p-2 bg-white rounded-xl shadow-md border border-slate-200 dark:border-slate-700 flex items-center justify-center">
        {dataUrl ? (
          <img
            src={dataUrl}
            alt={`QR Code for ${patient.name}`}
            style={{ width: size, height: size }}
            className="rounded-lg object-contain"
          />
        ) : (
          <div
            style={{ width: size, height: size }}
            className="flex items-center justify-center bg-slate-50 dark:bg-slate-800 rounded-lg animate-pulse"
          >
            <QrIcon size={32} className="text-slate-300 dark:text-slate-600" />
          </div>
        )}
      </div>

      <div className="mt-2 text-center">
        <p className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 tracking-wider">
          {patient.healthId}
        </p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Scan to verify & check-in
        </p>
      </div>

      {showControls && (
        <div className="flex items-center gap-1.5 mt-3">
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1 px-2.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs"
            title="Download QR code image (PNG)"
          >
            <Download size={12} />
            <span>Download</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1 px-2.5 py-1 text-xs rounded border border-teal-200 dark:border-teal-800/60 text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors shadow-2xs font-medium"
            title="Print official ID card"
          >
            <Printer size={12} />
            <span>Print Card</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs"
            title="Copy QR payload"
          >
            {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
          </button>
        </div>
      )}
    </div>
  );
}

/** Full visual plastic card component with embedded QR code */
export function PatientIDCardVisual({
  patient,
  onPrint,
  onDownload,
}: {
  patient: PatientQRData;
  onPrint?: () => void;
  onDownload?: () => void;
}) {
  return (
    <div className="w-full max-w-sm rounded-2xl bg-gradient-to-br from-[#0b1f2e] via-[#0f2d42] to-[#0c6b61] text-white p-5 shadow-xl border border-teal-500/30 relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute -top-12 -right-12 w-36 h-36 bg-teal-400/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-teal-600/10 rounded-full blur-2xl pointer-events-none" />

      {/* Top Header */}
      <div className="flex items-start justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-teal-500 flex items-center justify-center font-black text-white text-base shadow-sm">
            N
          </div>
          <div>
            <p className="font-bold text-sm tracking-wide text-white">Nova HMS · DMRH</p>
            <p className="text-[11px] text-teal-200">Patient Health ID Card</p>
          </div>
        </div>

        {patient.cbhi && (
          <div className="flex items-center gap-1 bg-emerald-500/20 border border-emerald-400/40 px-2 py-0.5 rounded-full text-emerald-300 text-[10px] font-bold tracking-wider">
            <ShieldCheck size={11} />
            <span>CBHI ENROLLED</span>
          </div>
        )}
      </div>

      {/* Patient Name & Amharic Name */}
      <div className="mb-4 relative z-10">
        <h3 className="text-xl font-black text-white tracking-tight">{patient.name}</h3>
        {patient.nameAm && (
          <p className="text-teal-200 text-xs font-medium">{patient.nameAm}</p>
        )}
      </div>

      {/* Grid: Details on left, Live QR Code on right */}
      <div className="flex items-center justify-between gap-3 relative z-10">
        <div className="space-y-1.5 text-xs">
          <div>
            <span className="text-[10px] text-teal-300/80 block uppercase tracking-wider">Health ID</span>
            <span className="font-mono font-bold text-white text-sm tracking-wider">{patient.healthId}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-teal-300/80 block uppercase tracking-wider">DOB</span>
              <span className="text-white font-medium text-[11px]">{patient.dob || "—"}</span>
            </div>
            <div>
              <span className="text-[10px] text-teal-300/80 block uppercase tracking-wider">Kebele</span>
              <span className="text-white font-medium text-[11px]">{patient.kebele || "—"}</span>
            </div>
          </div>
          {patient.phone && (
            <div>
              <span className="text-[10px] text-teal-300/80 block uppercase tracking-wider">Phone</span>
              <span className="text-slate-200 text-[11px] font-mono">{patient.phone}</span>
            </div>
          )}
        </div>

        {/* Embedded QR Code */}
        <div className="bg-white p-2 rounded-xl shadow-lg border border-teal-400/30 shrink-0">
          <PatientQRCode patient={patient} size={90} showControls={false} />
        </div>
      </div>

      {/* Footer bar */}
      <div className="mt-4 pt-2.5 border-t border-white/10 flex items-center justify-between text-[10px] text-teal-200/70 relative z-10">
        <span>Debre Markos Referral Hospital</span>
        <span>Valid for All OPD & Specialty Care</span>
      </div>
    </div>
  );
}
