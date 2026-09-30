"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import jsQR from "jsqr";
import { Camera, CameraOff, Upload, Sparkles, RefreshCw, CheckCircle2, AlertCircle, ScanLine } from "lucide-react";
import { PATIENTS } from "@/lib/nova-mock-data";
import { parsePatientQRPayload } from "./patient-qr";

interface QRScannerProps {
  onScan: (decoded: { healthId: string; name?: string; raw: string }) => void;
  className?: string;
  autoStart?: boolean;
}

export default function QRScanner({ onScan, className = "", autoStart = true }: QRScannerProps) {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(950, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } catch {
      // Audio not permitted or supported
    }
  };

  const handleSuccessfulScan = useCallback(
    (codeText: string) => {
      playBeep();
      setScannedResult(codeText);
      const parsed = parsePatientQRPayload(codeText);
      onScan(parsed);
    },
    [onScan]
  );

  // Scan video frames loop
  const scanFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationFrameRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });

    if (code && code.data) {
      handleSuccessfulScan(code.data);
      stopCamera();
      return;
    }

    animationFrameRef.current = requestAnimationFrame(scanFrame);
  }, [handleSuccessfulScan]);

  const startCamera = async () => {
    setCameraError(null);
    setScannedResult(null);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera API is not supported in this browser environment.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
      }
      setCameraActive(true);
      animationFrameRef.current = requestAnimationFrame(scanFrame);
    } catch (err: any) {
      console.warn("Unable to access camera:", err);
      setCameraError(
        err.name === "NotAllowedError"
          ? "Camera permission denied. Please allow camera access in browser settings or use image upload below."
          : "Webcam not detected or unavailable. You can upload a QR image or select a patient below."
      );
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (autoStart) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [autoStart]);

  // Image file upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setCameraError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setIsProcessingFile(false);
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        setIsProcessingFile(false);
        if (code && code.data) {
          handleSuccessfulScan(code.data);
        } else {
          setCameraError("No valid QR code found in the uploaded image. Try another photo or adjust lighting.");
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Simulate scanning a patient
  const handleSimulateScan = (patientId: string) => {
    const p = PATIENTS.find((pt) => pt.id === patientId) || PATIENTS[0];
    const payload = JSON.stringify({
      system: "NOVA_HMS",
      v: "1.0",
      id: p.healthId,
      name: p.name,
      dob: p.dob,
      cbhi: p.cbhi,
      facility: "Debre Markos Referral Hospital",
    });
    handleSuccessfulScan(payload);
  };

  return (
    <div className={`flex flex-col items-center w-full max-w-md ${className}`}>
      {/* Viewfinder Container */}
      <div className="relative w-full aspect-square max-w-[340px] rounded-2xl overflow-hidden bg-slate-900 border-2 border-slate-700 shadow-xl flex items-center justify-center">
        {/* Hidden Canvas for Frame Processing */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Live Camera Feed */}
        <video
          ref={videoRef}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            cameraActive ? "opacity-100" : "opacity-0 absolute"
          }`}
          muted
        />

        {/* Overlay scanning reticle */}
        {cameraActive && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {/* Dark Vignette Mask */}
            <div className="absolute inset-0 border-[36px] border-black/40" />

            {/* Target Box */}
            <div className="relative w-52 h-52 border-2 border-teal-400/80 rounded-xl shadow-[0_0_15px_rgba(20,184,166,0.3)]">
              {/* Corner Accents */}
              <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-teal-400 rounded-tl" />
              <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-teal-400 rounded-tr" />
              <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-teal-400 rounded-bl" />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-teal-400 rounded-br" />

              {/* Animated Laser Scanning Line */}
              <div className="absolute left-1 right-1 h-0.5 bg-gradient-to-r from-transparent via-teal-400 to-transparent shadow-[0_0_8px_#2dd4bf] animate-[bounce_2s_infinite]" />
            </div>

            <span className="absolute bottom-5 text-xs text-white/90 font-medium px-3 py-1 bg-black/60 backdrop-blur-xs rounded-full">
              Align patient QR card within frame
            </span>
          </div>
        )}

        {/* Inactive / Error State */}
        {!cameraActive && (
          <div className="p-6 text-center text-slate-300 flex flex-col items-center">
            <ScanLine size={48} className="text-teal-400 mb-3 animate-pulse" />
            <p className="text-sm font-semibold text-white mb-1">QR Card Scanner</p>
            <p className="text-xs text-slate-400 max-w-[220px] mb-4">
              Hold patient ID card in front of camera or upload a QR image
            </p>
            <button
              type="button"
              onClick={startCamera}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all active:scale-95"
            >
              <Camera size={14} />
              <span>Enable Live Camera</span>
            </button>
          </div>
        )}

        {/* Processing Indicator */}
        {isProcessingFile && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center text-white">
            <RefreshCw size={28} className="animate-spin text-teal-400 mb-2" />
            <p className="text-xs font-medium">Decoding QR image…</p>
          </div>
        )}
      </div>

      {/* Camera Feedback / Error */}
      {cameraError && (
        <div className="mt-3 p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2 max-w-sm">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          <span>{cameraError}</span>
        </div>
      )}

      {/* Alternative Controls: Upload or Quick Simulator */}
      <div className="w-full max-w-md mt-4 space-y-3">
        {/* Toggle / Stop Camera button */}
        <div className="flex gap-2">
          {cameraActive ? (
            <button
              type="button"
              onClick={stopCamera}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-2xs"
            >
              <CameraOff size={13} />
              <span>Pause Camera</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={startCamera}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-500 transition-colors shadow-2xs"
            >
              <Camera size={13} />
              <span>Start Camera</span>
            </button>
          )}

          {/* Upload Image Button */}
          <label className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-2xs">
            <Upload size={13} />
            <span>Upload QR Image</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
        </div>

        {/* Quick Simulation Row */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Sparkles size={12} className="text-teal-500" />
              1-Click Scan Simulator (Demo Patients)
            </span>
            <span className="text-[10px] text-teal-600 dark:text-teal-400 font-medium">Instant Test</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {PATIENTS.slice(0, 4).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSimulateScan(p.id)}
                className="text-left px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-teal-400 dark:hover:border-teal-500 hover:shadow-xs transition-all text-xs group"
              >
                <p className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-teal-600 dark:group-hover:text-teal-400 truncate">
                  {p.name}
                </p>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-mono">{p.healthId}</span>
                  {p.cbhi && <span className="text-emerald-500 font-semibold">CBHI</span>}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
