"use client";
import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import { trpc, queryClient } from "@/utils/trpc";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Ticket,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  QrCode,
  ArrowRight,
  Stethoscope,
  Activity,
  FlaskConical,
  Pill,
  CreditCard,
  Building2,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  Zap,
  PhoneCall,
  UserCheck,
  Sliders,
  X,
} from "lucide-react";

interface PatientJourneyTrackerProps {
  patient: {
    id: string;
    name: string;
    nameAm?: string;
    healthId: string;
    phone?: string;
    cbhi?: boolean;
  };
  lang?: "en" | "am";
}

export default function PatientJourneyTracker({ patient, lang = "en" }: PatientJourneyTrackerProps) {
  const t = (en: string, am: string) => (lang === "en" ? en : am);

  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [selectedTier, setSelectedTier] = useState<"standard" | "vip">("vip");
  const [selectedDept, setSelectedDept] = useState("General OPD");
  const [selectedPayment, setSelectedPayment] = useState<"telebirr" | "cbe_birr" | "cash">("telebirr");
  const [showDevControls, setShowDevControls] = useState(false);

  // Poll active journey data every 4 seconds for live radar updates
  const {
    data: journeyData,
    isLoading,
    refetch,
  } = useQuery({
    ...trpc.patient.activeJourney.queryOptions({
      patientId: patient.id,
      healthId: patient.healthId,
      phone: patient.phone,
    }),
    refetchInterval: 4000,
  });

  const takeCardMutation = useMutation({
    ...trpc.patient.takeCardOnline.mutationOptions(),
    onSuccess: () => {
      setBookingModalOpen(false);
      refetch();
      queryClient.invalidateQueries({ queryKey: trpc.visit.queue.queryKey() });
    },
  });

  const hasActiveVisit = Boolean(journeyData && journeyData.hasActiveVisit && "ticket" in journeyData && (journeyData as any).ticket);
  const activeData = hasActiveVisit ? (journeyData as any) : null;
  const ticket = activeData?.ticket;
  const queue = activeData?.queue;
  const journey = activeData?.journey;
  const vitals = activeData?.vitals;
  const notes = activeData?.notes;
  const diagnoses = activeData?.diagnoses;
  const labOrders = activeData?.labOrders || [];
  const prescriptions = activeData?.prescriptions || [];

  // Generate QR code for active ticket
  useEffect(() => {
    if (ticket) {
      const payload = JSON.stringify({
        sys: "ETHIORA_HMS",
        tkt: ticket.ticketNumber,
        tier: ticket.tier,
        hid: patient.healthId,
        name: patient.name,
        time: ticket.issuedAt,
      });
      QRCode.toDataURL(payload, { width: 240, margin: 1 }, (err, url) => {
        if (!err && url) setQrDataUrl(url);
      });
    }
  }, [ticket, patient]);

  // Local fallback simulation actions for quick end-to-end testing without tab hopping
  const simulateAdvance = async (targetStage: "triage" | "consult" | "lab" | "pharmacy" | "done") => {
    if (!activeData?.visit?.id) return;
    const visitId = activeData.visit.id;
    const ticketId = ticket?.id;

    try {
      const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000";

      if (targetStage === "triage") {
        // Record vitals
        await fetch(`${serverUrl}/trpc/visit.recordVitals`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            visitId,
            bpSystolic: 122,
            bpDiastolic: 80,
            heartRate: 74,
            temperature: 36.8,
            spo2: 98,
            weight: 71,
          }),
        });
      } else if (targetStage === "consult" && ticketId) {
        // Call patient in doctor queue
        await fetch(`${serverUrl}/trpc/visit.updateTicketStatus`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticketId, status: "being-seen" }),
        });
      } else if (targetStage === "done") {
        // Close visit
        await fetch(`${serverUrl}/trpc/visit.closeVisit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visitId }),
        });
      }
    } catch (e) {
      console.warn("Simulation advance error:", e);
    } finally {
      refetch();
    }
  };

  const handleTakeCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    takeCardMutation.mutate({
      patientId: patient.id,
      healthId: patient.healthId,
      name: patient.name,
      nameAm: patient.nameAm,
      phone: patient.phone,
      tier: selectedTier,
      department: selectedDept,
      paymentMethod: selectedPayment,
      paymentReference: `${selectedPayment.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
    });
  };

  return (
    <div className="space-y-4">
      {/* ─── CASE A: ACTIVE VISIT JOURNEY TRACKER ─── */}
      {hasActiveVisit ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm overflow-hidden relative">
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black font-mono text-base shadow-sm ${
                  ticket.tier === "vip"
                    ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-amber-500/20"
                    : "bg-teal-600 text-white"
                }`}
              >
                {ticket.ticketNumber}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-800 dark:text-white">
                    {t("Active Clinical Visit", "የዛሬ የህክምና ጉዞ")}
                  </h2>
                  {ticket.tier === "vip" ? (
                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                      <Sparkles size={12} className="text-amber-500" />
                      VIP FAST-TRACK
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      STANDARD OPD
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {ticket.department} · {ticket.paymentStatus === "paid" ? `Paid via ${ticket.paymentMethod} (${ticket.feeAmount} ETB)` : "Unpaid"}
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQrModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
              >
                <QrCode size={14} />
                <span>{t("Digital Pass", "ዲጂታል ካርድ")}</span>
              </button>
              <button
                type="button"
                onClick={() => refetch()}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-teal-600 transition-colors"
                title="Refresh radar"
              >
                <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          {/* ─── LIVE QUEUE RADAR ─── */}
          <div className="grid grid-cols-3 gap-2.5 my-4 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div className="text-center">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">{t("Queue Status", "የወረፋ ሁኔታ")}</p>
              <p className="text-sm font-black text-slate-800 dark:text-white mt-0.5">
                {queue?.aheadCount === 0 ? (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
                    <Zap size={13} /> {t("You are Next!", "ተራው የእርስዎ ነው!")}
                  </span>
                ) : (
                  <span>
                    {queue?.aheadCount} {t("ahead", "ከፊትዎ")}
                  </span>
                )}
              </p>
            </div>

            <div className="text-center border-x border-slate-200 dark:border-slate-700 px-2">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">{t("Now Serving", "አሁን እየታየ")}</p>
              <p className="text-sm font-mono font-bold text-teal-600 dark:text-teal-400 mt-0.5">
                {queue?.nowServingTicket !== "None" ? queue?.nowServingTicket : "—"}
              </p>
            </div>

            <div className="text-center">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">{t("Est. Wait", "የሚጠበቅ ጊዜ")}</p>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                ~{queue?.estimatedWaitMinutes} {t("mins", "ደቂቃ")}
              </p>
            </div>
          </div>

          {/* ─── INTERACTIVE STEPPER PROGRESS ─── */}
          <div className="pt-2 pb-5">
            <div className="relative">
              {/* Connecting line */}
              <div className="absolute top-4 left-6 right-6 h-0.5 bg-slate-200 dark:bg-slate-800 -z-0" />

              <div className="grid grid-cols-6 gap-1 relative z-10">
                {journey?.stages.map((st: any) => (
                  <div key={st.id} className="flex flex-col items-center text-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                        st.active
                          ? "bg-teal-600 text-white ring-4 ring-teal-100 dark:ring-teal-950 scale-110"
                          : st.done
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      {st.done ? <CheckCircle2 size={16} /> : st.id}
                    </div>
                    <span
                      className={`text-[10px] font-medium mt-1.5 leading-tight ${
                        st.active
                          ? "text-teal-700 dark:text-teal-300 font-bold"
                          : st.done
                          ? "text-slate-700 dark:text-slate-200"
                          : "text-slate-400 dark:text-slate-500"
                      }`}
                    >
                      {lang === "en" ? st.label : st.labelAm}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ─── CURRENT STAGE DETAILS CARD ─── */}
          <div className="bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-800/80 rounded-2xl p-4">
            {journey?.stageKey === "ticket" && (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0">
                  <Ticket size={20} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-teal-900 dark:text-teal-200 uppercase tracking-wide">
                    {t("Stage 1: Ticket Confirmed & Check-In", "ደረጃ 1: ካርድ ተረጋግጧል")}
                  </h3>
                  <p className="text-xs text-teal-800 dark:text-teal-300 mt-1">
                    {t(
                      "Your card is active in the hospital system. When you arrive at the entrance, scan your QR code at the self-check-in kiosk or show it at reception desk.",
                      "ካርድዎ በስርዓቱ ውስጥ ንቁ ሆኗል። ሆስፒታል ሲደርሱ የQR ኮድዎን በኪዮስኩ ወይም በመቀበያው ያሳዩ።"
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={() => setQrModalOpen(true)}
                    className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold"
                  >
                    <QrCode size={13} />
                    {t("Open Entry QR Pass", "የመግቢያ QR ካርድ ክፈት")}
                  </button>
                </div>
              </div>
            )}

            {journey?.stageKey === "triage" && (
              <div>
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0">
                    <Activity size={20} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-teal-900 dark:text-teal-200 uppercase tracking-wide">
                      {t("Stage 2: Triage & Vital Signs Logged", "ደረጃ 2: ምልክቶች ምርመራ ተጠናቋል")}
                    </h3>
                    <p className="text-xs text-teal-800 dark:text-teal-300 mt-0.5">
                      {t("Your vitals have been recorded by the triage nurse. Next: Doctor Consultation Room 204.", "ምልክቶችዎ በነርስ ተመዝግበዋል። ቀጣይ: የዶክተር ክፍል 204.")}
                    </p>
                  </div>
                </div>

                {vitals && (
                  <div className="grid grid-cols-4 gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-teal-100 dark:border-teal-900 text-center">
                    <div>
                      <p className="text-[10px] text-slate-400">BP</p>
                      <p className="text-xs font-bold text-slate-800 dark:text-white">
                        {vitals.bpSystolic}/{vitals.bpDiastolic}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400">Heart Rate</p>
                      <p className="text-xs font-bold text-slate-800 dark:text-white">{vitals.heartRate} bpm</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400">Temp</p>
                      <p className="text-xs font-bold text-slate-800 dark:text-white">{vitals.temperature}°C</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400">SpO2</p>
                      <p className="text-xs font-bold text-slate-800 dark:text-white">{vitals.spo2}%</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {journey?.stageKey === "consultation" && (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0">
                  <Stethoscope size={20} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-teal-900 dark:text-teal-200 uppercase tracking-wide">
                    {t("Stage 3: Doctor Consultation In Progress", "ደረጃ 3: የዶክተር ምርመራ ሂደት ላይ")}
                  </h3>
                  <p className="text-xs text-teal-800 dark:text-teal-300 mt-1">
                    {t("Doctor is currently reviewing your medical file. Please remain near Consultation Room 204.", "ዶክተሩ የህክምና ፋይልዎን እየተመለከቱ ነው። እባክዎ በክፍል 204 አቅራቢያ ይጠብቁ።")}
                  </p>
                  {diagnoses && diagnoses.length > 0 && (
                    <div className="mt-2 text-xs bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg text-slate-800 dark:text-slate-200 font-medium">
                      Assessment: {diagnoses[0].description} ({diagnoses[0].icdCode})
                    </div>
                  )}
                </div>
              </div>
            )}

            {journey?.stageKey === "lab" && (
              <div>
                <div className="flex items-start gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0">
                    <FlaskConical size={20} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-purple-900 dark:text-purple-200 uppercase tracking-wide">
                      {t("Stage 4: Laboratory Tests Ordered", "ደረጃ 4: የላቦራቶሪ ምርመራ")}
                    </h3>
                    <p className="text-xs text-purple-800 dark:text-purple-300 mt-0.5">
                      {t("Please proceed to Laboratory Window 1 for sample collection.", "እባክዎ ናሙና ለመስጠት ወደ ላቦራቶሪ መስኮት 1 ይሂዱ።")}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 mt-2">
                  {labOrders.map((lo: any) => (
                    <div
                      key={lo.id}
                      className="flex items-center justify-between text-xs bg-white dark:bg-slate-900 p-2 rounded-lg border border-purple-100 dark:border-purple-900"
                    >
                      <span className="font-medium text-slate-800 dark:text-slate-200">{lo.testName}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          lo.status === "completed"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        }`}
                      >
                        {lo.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {journey?.stageKey === "pharmacy" && (
              <div>
                <div className="flex items-start gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                    <Pill size={20} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-blue-900 dark:text-blue-200 uppercase tracking-wide">
                      {t("Stage 5: Pharmacy Dispensing Ready", "ደረጃ 5: ፋርማሲ መድኃኒት ዝግጅት")}
                    </h3>
                    <p className="text-xs text-blue-800 dark:text-blue-300 mt-0.5">
                      {t("Your prescriptions have been transmitted. Proceed to Pharmacy Counter 2.", "የታዘዙት መድኃኒቶች ተልከዋል። ወደ ፋርማሲ መስኮት 2 ይሂዱ።")}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 mt-2">
                  {prescriptions.flatMap((p: any) =>
                    p.lines.map((ln: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs bg-white dark:bg-slate-900 p-2 rounded-lg border border-blue-100 dark:border-blue-900"
                      >
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{ln.drugName}</p>
                          <p className="text-[10px] text-slate-500">
                            {ln.dosage} · {ln.frequency} · {ln.durationDays} days
                          </p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                          Ready for Dispensing
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {journey?.stageKey === "completed" && (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wide">
                    {t("Visit Successfully Completed", "ጉብኝቱ በስኬት ተጠናቋል")}
                  </h3>
                  <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-1">
                    {t(
                      "Thank you for visiting Debre Markos Hospital. Your records and prescriptions have been stored in your digital history.",
                      "ስለጎበኙን እናመሰግናለን። የህክምና ታሪክዎ እና የታዘዙልዎት መድኃኒቶች በዲጂታል መዝገብዎ ተቀምጠዋል።"
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={() => setBookingModalOpen(true)}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                  >
                    <Ticket size={13} />
                    {t("Take New Card", "አዲስ ካርድ ይቁረጡ")}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ─── TESTING ACCORDION TOOLBAR (FOR SEAMLESS END-TO-END VERIFICATION) ─── */}
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowDevControls(!showDevControls)}
              className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <Sliders size={12} />
              <span>{showDevControls ? "Hide Testing Tools" : "Quick Workflow Simulation Controls"}</span>
            </button>

            {showDevControls && (
              <div className="mt-2.5 p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                  Test Journey Progression (Simulate Staff Actions)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => simulateAdvance("triage")}
                    className="text-[11px] px-2.5 py-1 rounded bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:border-teal-400 font-medium"
                  >
                    1. Simulate Nurse Intake (Vitals)
                  </button>
                  <button
                    type="button"
                    onClick={() => simulateAdvance("consult")}
                    className="text-[11px] px-2.5 py-1 rounded bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:border-teal-400 font-medium"
                  >
                    2. Simulate Doctor Call
                  </button>
                  <button
                    type="button"
                    onClick={() => simulateAdvance("done")}
                    className="text-[11px] px-2.5 py-1 rounded bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:border-emerald-400 font-medium text-emerald-700 dark:text-emerald-300"
                  >
                    3. Simulate Visit Complete
                  </button>
                  <button
                    type="button"
                    onClick={() => setBookingModalOpen(true)}
                    className="text-[11px] px-2.5 py-1 rounded bg-teal-600 text-white font-medium ml-auto"
                  >
                    + Book New Card
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ─── CASE B: NO ACTIVE VISIT — CALL TO ACTION TO TAKE A CARD ─── */
        <div className="bg-gradient-to-br from-slate-900 via-[#0f2d42] to-teal-950 rounded-3xl p-5 text-white shadow-xl border border-teal-500/20 relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-300 text-xs font-bold mb-2">
                <Ticket size={13} />
                <span>ONLINE CARD CHECKING &amp; TICKETING</span>
              </div>
              <h2 className="text-xl font-black text-white tracking-tight">
                {t("Take Your Hospital Card Online", "የሆስፒታል ካርድዎን በኦንላይን ይቁረጡ")}
              </h2>
              <p className="text-xs text-teal-200/80 max-w-md mt-1 leading-relaxed">
                {t(
                  "Skip early morning clinic queues. Select Standard or VIP Fast-Track pass, pay securely via Telebirr or CBE Birr, and track your doctor visit live.",
                  "የጠዋት ሰልፍን ያስወግዱ። መደበኛ ወይም ፈጣን የቪአይፒ ካርድ ይምረጡ፣ በቴሌብር ይክፈሉ እና ወረፋዎን በስልክዎ ይከታተሉ።"
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setBookingModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all transform hover:scale-[1.02] shrink-0"
            >
              <Sparkles size={16} />
              <span>{t("Take Card (Standard / VIP)", "ካርድ ይቁረጡ (መደበኛ / VIP)")}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ─── MODAL: TAKE / BOOK CARD ONLINE ─── */}
      {bookingModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95">
            <button
              type="button"
              onClick={() => setBookingModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center">
                <Ticket size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {t("Online Card Checking & Issuance", "የኦንላይን ካርድ መቁረጫ")}
                </h3>
                <p className="text-xs text-slate-500">
                  {patient.name} · {patient.healthId}
                </p>
              </div>
            </div>

            <form onSubmit={handleTakeCardSubmit} className="space-y-4">
              {/* Tier Selection */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-2">
                  {t("Select Service Tier", "የአገልግሎት ደረጃ ይምረጡ")}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Standard Option */}
                  <div
                    onClick={() => setSelectedTier("standard")}
                    className={`cursor-pointer rounded-2xl p-3.5 border transition-all ${
                      selectedTier === "standard"
                        ? "border-teal-500 bg-teal-50/50 dark:bg-teal-950/30 ring-2 ring-teal-500/20"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Standard Card</span>
                      <span className="text-xs font-black text-teal-600 dark:text-teal-400">50 ETB</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      • Regular queue order<br />
                      • Live Queue Radar<br />
                      • Digital pass with QR
                    </p>
                  </div>

                  {/* VIP Fast-Track Option */}
                  <div
                    onClick={() => setSelectedTier("vip")}
                    className={`cursor-pointer rounded-2xl p-3.5 border transition-all relative overflow-hidden ${
                      selectedTier === "vip"
                        ? "border-amber-400 bg-amber-50/60 dark:bg-amber-950/30 ring-2 ring-amber-400/30 shadow-sm"
                        : "border-slate-200 dark:border-slate-800 hover:border-amber-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1">
                        <Sparkles size={12} className="text-amber-500" />
                        VIP Fast-Track
                      </span>
                      <span className="text-xs font-black text-amber-600 dark:text-amber-400">300 ETB</span>
                    </div>
                    <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 leading-tight">
                      • 🚀 Priority Queue Jumper<br />
                      • 🛋️ VIP Lounge Access<br />
                      • 📲 Fast Radar Notifications
                    </p>
                  </div>
                </div>
              </div>

              {/* Department */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1.5">
                  {t("Clinical Department", "የህክምና ክፍል")}
                </label>
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-slate-800 dark:text-slate-100"
                >
                  <option value="General OPD">General Outpatient Department (OPD)</option>
                  <option value="Internal Medicine">Internal Medicine (የውስጥ ደዌ)</option>
                  <option value="Pediatrics">Pediatrics (ህጻናት ክፍል)</option>
                  <option value="Gynecology & Obstetrics">Gynecology &amp; Obstetrics</option>
                  <option value="Dental Clinic">Dental Clinic</option>
                </select>
              </div>

              {/* Payment Method */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1.5">
                  {t("Payment Method", "የክፍያ ዘዴ")}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "telebirr", label: "Telebirr", badge: "Instant" },
                    { id: "cbe_birr", label: "CBE Birr", badge: "Instant" },
                    { id: "cash", label: "Pay at Hospital", badge: "Cash Desk" },
                  ].map((pm) => (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => setSelectedPayment(pm.id as any)}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        selectedPayment === pm.id
                          ? "border-teal-500 bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-200 font-bold"
                          : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      <p className="text-xs font-bold">{pm.label}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{pm.badge}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary and Pay */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-slate-400">Total Card Fee</p>
                  <p className="text-lg font-black text-slate-900 dark:text-white">
                    {selectedTier === "vip" ? "300.00 ETB" : "50.00 ETB"}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={takeCardMutation.isPending}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-teal-600/20"
                >
                  {takeCardMutation.isPending ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard size={14} />
                      <span>{selectedPayment === "cash" ? "Confirm & Reserve Card" : "Pay & Issue Card"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: DIGITAL PASS QR CODE ─── */}
      {qrModalOpen && ticket && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl relative">
            <button
              type="button"
              onClick={() => setQrModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800"
            >
              <X size={15} />
            </button>

            <div
              className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center font-black font-mono text-lg mb-3 shadow-md ${
                ticket.tier === "vip" ? "bg-amber-500 text-white shadow-amber-500/30" : "bg-teal-600 text-white"
              }`}
            >
              {ticket.ticketNumber}
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {patient.name}
            </h3>
            <p className="text-xs font-mono text-slate-500 mb-4">{patient.healthId}</p>

            {/* QR Code Graphic */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-inner inline-block mb-4">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Ticket QR" className="w-48 h-48 mx-auto" />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-slate-400">
                  <RefreshCw size={24} className="animate-spin" />
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
              {t(
                "Present this digital QR pass at the entrance kiosk or to the triage nurse for instant touchless verification.",
                "ለፈጣን ማረጋገጫ ይህን ዲጂታል የQR ካርድ በኪዮስኩ ወይም ለነርሷ ያሳዩ።"
              )}
            </p>

            <button
              type="button"
              onClick={() => setQrModalOpen(false)}
              className="mt-4 w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200"
            >
              Close Pass
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
