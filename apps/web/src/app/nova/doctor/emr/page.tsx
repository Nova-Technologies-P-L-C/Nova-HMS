"use client";

import { useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { PageShell, Card, StatusBadge } from "@/components/nova/nova-ui";
import { PatientHistoryViewer } from "@/components/nova/patient-history-viewer";
import { useNovaRole } from "@/components/nova/nova-role-context";
import { getDepartmentConfig } from "@/lib/department-configs";
import {
  Search,
  User,
  Stethoscope,
  Pill,
  FlaskConical,
  ArrowLeft,
  Calendar,
  Phone,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Activity,
  FileText,
  X,
  Users,
  ChevronRight,
  Heart,
  Thermometer,
  Wind,
  Weight,
  Sparkles,
} from "lucide-react";

function calculateAge(dobString?: string) {
  if (!dobString) return "—";
  const birth = new Date(dobString);
  if (isNaN(birth.getTime())) return dobString;
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  if (
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
  ) {
    years--;
  }
  return `${years} yrs`;
}

function EMRContent() {
  const params = useSearchParams();
  const { doctorDepartment } = useNovaRole();
  const urlVisitId = params.get("visitId") ?? "";
  const urlPatientId = params.get("patientId") ?? "";
  const urlDept = params.get("dept");
  const deptConfig = useMemo(() => getDepartmentConfig(urlDept || doctorDepartment), [urlDept, doctorDepartment]);

  // Selected patient & visit states (initialized from URL query parameters)
  const [selectedPatientId, setSelectedPatientId] = useState<string>(urlPatientId);
  const [selectedVisitId, setSelectedVisitId] = useState<string>(urlVisitId);

  // Search & tab states when picking patients
  const [queueSearch, setQueueSearch] = useState("");
  const [pickerTab, setPickerTab] = useState<"queue" | "registry">("queue");

  // Keep internal state in sync if URL params change externally
  if (urlVisitId && urlVisitId !== selectedVisitId) {
    setSelectedVisitId(urlVisitId);
  }
  if (urlPatientId && urlPatientId !== selectedPatientId) {
    setSelectedPatientId(urlPatientId);
  }

  // 1. Fetch active waiting queue patients (for top strip & queue selector)
  const { data: queue = [], isLoading: isQueueLoading } = useQuery({
    ...trpc.visit.queue.queryOptions(),
  });

  // 2. Fetch patient search results or default directory list (for non-queue searches)
  const trimmedSearch = queueSearch.trim();
  const { data: searchResults = [], isLoading: isSearchLoading } = useQuery({
    ...trpc.patient.search.queryOptions({ query: trimmedSearch }),
    enabled: trimmedSearch.length > 0 && pickerTab === "registry",
  });

  const { data: patientList, isLoading: isListLoading } = useQuery({
    ...trpc.patient.list.queryOptions({ page: 1, limit: 30 }),
    enabled: trimmedSearch.length === 0 && pickerTab === "registry",
  });

  // 3. Resolve active visit (if selectedVisitId is set)
  const { data: activeVisit, isLoading: isVisitLoading } = useQuery({
    ...trpc.visit.get.queryOptions({ visitId: selectedVisitId }),
    enabled: !!selectedVisitId,
  });

  // 4. Resolve effective patient ID
  const effectivePatientId = useMemo(() => {
    if (selectedPatientId) return selectedPatientId;
    if (activeVisit?.patient?.id) return activeVisit.patient.id;
    if (selectedVisitId) {
      const q = queue.find((item) => item.visitId === selectedVisitId);
      if (q?.visit?.patient?.id) return q.visit.patient.id;
    }
    return "";
  }, [selectedPatientId, activeVisit, selectedVisitId, queue]);

  // 5. Fetch single patient record (if we have effectivePatientId)
  const { data: patientRecord, isLoading: isPatientLoading } = useQuery({
    ...trpc.patient.get.queryOptions({ id: effectivePatientId }),
    enabled: !!effectivePatientId,
  });

  // Resolve final patient object
  const patient = activeVisit?.patient ?? patientRecord;

  // Resolve active visit for the selected patient if available
  const currentQueueTicket = useMemo(() => {
    if (!effectivePatientId) return null;
    return queue.find((q) => q.visit?.patient?.id === effectivePatientId);
  }, [queue, effectivePatientId]);

  const effectiveVisitId = selectedVisitId || currentQueueTicket?.visitId || "";

  // Handlers for switching / clearing patient selection
  const handleSelectPatient = (pId: string, vId?: string) => {
    setSelectedPatientId(pId);
    setSelectedVisitId(vId || "");
    const newUrl = vId
      ? `/nova/doctor/emr?visitId=${vId}`
      : `/nova/doctor/emr?patientId=${pId}`;
    window.history.pushState(null, "", newUrl);
  };

  const handleClearSelection = () => {
    setSelectedPatientId("");
    setSelectedVisitId("");
    window.history.pushState(null, "", "/nova/doctor/emr");
  };

  // Filtered queue patients for in-page selector
  const filteredQueue = useMemo(() => {
    if (!trimmedSearch) return queue;
    const lower = trimmedSearch.toLowerCase();
    return queue.filter((q) => {
      const p = q.visit.patient;
      return (
        (q.ticketNumber || "").toLowerCase().includes(lower) ||
        (p.nameEn || "").toLowerCase().includes(lower) ||
        (p.nameAm || "").toLowerCase().includes(lower) ||
        (p.healthId || "").toLowerCase().includes(lower) ||
        (p.phone || "").toLowerCase().includes(lower)
      );
    });
  }, [queue, trimmedSearch]);

  // Resolve latest recorded vitals (from active visit or patient record)
  const latestVitals = activeVisit?.vitals?.[0] ?? patientRecord?.visits?.[0]?.vitals?.[0];

  return (
    <PageShell
      title="Patient EMR"
      subtitle={
        patient
          ? `${patient.nameEn} · ${patient.healthId} · Electronic Medical Record`
          : "Longitudinal health records, clinical notes, diagnostic archive & allergy safety"
      }
      action={
        <div className="flex items-center gap-2">
          {patient && (
            <button
              onClick={handleClearSelection}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-md transition"
            >
              <ArrowLeft size={13} /> Change Patient
            </button>
          )}

          {effectiveVisitId && (
            <Link
              href={`/nova/doctor/consultation?visitId=${effectiveVisitId}&dept=${deptConfig.id}`}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium rounded-md shadow-xs transition"
            >
              <Stethoscope size={13} /> {deptConfig.sidebarLabels.consult} →
            </Link>
          )}

          {!patient && (
            <Link
              href="/nova/doctor"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-md transition"
            >
              <Clock size={13} className="text-slate-500" /> Doctor Queue
            </Link>
          )}
        </div>
      }
    >
      {/* ───────────────────────────────────────────────────────────── */}
      {/* SECTION 1: TOP OPD QUEUE STRIP (Always visible for fast selection) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3 mb-4 shadow-xs">
        <div className="flex items-center justify-between gap-3 mb-2.5 px-1">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-600" />
            </span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Waiting Queue ({queue.length})
            </span>
          </div>

          {patient && (
            <button
              onClick={handleClearSelection}
              className="text-[11px] font-semibold text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-1"
            >
              <X size={12} /> Deselect Patient
            </button>
          )}
        </div>

        {queue.length === 0 ? (
          <p className="text-xs text-slate-400 px-1 py-1">
            No patients currently waiting in the OPD queue.
          </p>
        ) : (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {queue.map((ticket) => {
              const isSelected = ticket.visit?.patient?.id === effectivePatientId;
              const p = ticket.visit.patient;
              return (
                <button
                  key={ticket.id}
                  onClick={() => handleSelectPatient(p.id, ticket.visitId)}
                  className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition border cursor-pointer ${
                    isSelected
                      ? "bg-teal-600 text-white border-teal-600 shadow-xs ring-2 ring-teal-300 dark:ring-teal-700 font-semibold"
                      : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-teal-400 hover:bg-teal-50/40"
                  }`}
                >
                  <span
                    className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      isSelected
                        ? "bg-teal-700 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    #{ticket.ticketNumber}
                  </span>
                  <span className="truncate max-w-[120px]">
                    {p.nameEn}
                  </span>
                  <span
                    className={`text-[9px] font-bold px-1 rounded ${
                      p.sex === "M"
                        ? "bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300"
                        : "bg-pink-100 dark:bg-pink-900/60 text-pink-700 dark:text-pink-300"
                    }`}
                  >
                    {p.sex}
                  </span>
                  <span className="text-[10px] opacity-80">
                    {calculateAge(p.dob)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SECTION 2: PATIENT DEMOGRAPHICS HEADER (Basic EMR Structure) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Card className="p-4 mb-4 border-slate-200 dark:border-slate-800 shadow-xs">
        {patient ? (
          /* POPULATED PATIENT HEADER */
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-full bg-teal-50 dark:bg-teal-950/70 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 font-bold text-base flex items-center justify-center shrink-0">
                {patient.nameEn.slice(0, 2).toUpperCase()}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {patient.nameEn}
                  </h2>
                  {patient.nameAm && (
                    <span className="text-xs text-slate-400">
                      ({patient.nameAm})
                    </span>
                  )}
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      patient.sex === "M"
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "bg-pink-50 text-pink-700 border border-pink-200"
                    }`}
                  >
                    {patient.sex === "M" ? "M" : "F"}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    {calculateAge(patient.dob)}
                  </span>
                  {currentQueueTicket && (
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                      Ticket #{currentQueueTicket.ticketNumber}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                  <span>
                    Health ID:{" "}
                    <strong className="text-slate-800 dark:text-slate-200 font-mono">
                      {patient.healthId}
                    </strong>
                  </span>
                  <span>·</span>
                  <span>Phone: {patient.phone || "—"}</span>
                  <span>·</span>
                  <span>Kebele: {(patient as any).kebele || "—"}</span>
                  <span>·</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] ${
                      patient.cbhiStatus
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {patient.cbhiStatus ? "✓ CBHI Member" : "Private Pay"}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Consultation & Prescribe Actions */}
            <div className="flex items-center gap-2">
              {effectiveVisitId ? (
                <>
                  <Link
                    href={`/nova/doctor/consultation?visitId=${effectiveVisitId}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-md text-xs font-semibold transition shadow-xs"
                  >
                    <Stethoscope size={13} /> Consult
                  </Link>
                  <Link
                    href={`/nova/doctor/prescription?visitId=${effectiveVisitId}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-700 rounded-md text-xs font-semibold transition"
                  >
                    <Pill size={13} /> Prescribe
                  </Link>
                  <Link
                    href={`/nova/doctor/lab-order?visitId=${effectiveVisitId}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-md text-xs font-semibold transition"
                  >
                    <FlaskConical size={13} /> Order Lab
                  </Link>
                </>
              ) : (
                <div className="text-xs text-slate-400 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700">
                  Historical EMR Archive (No active visit today)
                </div>
              )}
            </div>
          </div>
        ) : (
          /* UNSELECTED PATIENT HEADER PLACEHOLDER */
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-full border-2 border-dashed border-teal-400 dark:border-teal-600 bg-teal-50/50 dark:bg-teal-950/30 text-teal-600 flex items-center justify-center shrink-0">
                <User size={22} className="opacity-70 animate-pulse" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    No Patient Selected
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                    Awaiting Selection
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                  <span>Health ID: ———</span>
                  <span>·</span>
                  <span>Sex: —</span>
                  <span>·</span>
                  <span>Age: —</span>
                  <span>·</span>
                  <span>Coverage: —</span>
                </div>
              </div>
            </div>

            <div className="text-xs font-semibold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
              <Sparkles size={13} className="text-teal-600" />
              <span>Select from queue</span>
            </div>
          </div>
        )}
      </Card>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SECTION 3: VITALS BIOMETRICS STRIP (Always visible structure) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
        {/* 1. Blood Pressure */}
        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Blood Pressure</span>
            <Activity size={14} className="text-teal-600" />
          </div>
          <p className="text-base font-bold text-slate-900 dark:text-slate-100">
            {latestVitals?.bpSystolic && latestVitals?.bpDiastolic
              ? `${latestVitals.bpSystolic}/${latestVitals.bpDiastolic} mmHg`
              : "-- / -- mmHg"}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {patient ? (latestVitals ? "Recorded at Triage" : "No triage vitals") : "Awaiting patient"}
          </p>
        </div>

        {/* 2. Heart Rate */}
        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Heart Rate</span>
            <Heart size={14} className="text-red-500" />
          </div>
          <p className="text-base font-bold text-slate-900 dark:text-slate-100">
            {latestVitals?.heartRate ? `${latestVitals.heartRate} bpm` : "-- bpm"}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {patient ? (latestVitals?.heartRate ? "Normal rhythm" : "Not measured") : "Awaiting patient"}
          </p>
        </div>

        {/* 3. Temperature */}
        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Temperature</span>
            <Thermometer size={14} className="text-amber-500" />
          </div>
          <p className="text-base font-bold text-slate-900 dark:text-slate-100">
            {latestVitals?.temperature ? `${latestVitals.temperature} °C` : "--.- °C"}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {patient ? (latestVitals?.temperature ? "Body temp" : "Not measured") : "Awaiting patient"}
          </p>
        </div>

        {/* 4. Oxygen (SpO2) */}
        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Oxygen SpO2</span>
            <Wind size={14} className="text-blue-500" />
          </div>
          <p className="text-base font-bold text-slate-900 dark:text-slate-100">
            {latestVitals?.spo2 ? `${latestVitals.spo2} %` : "-- %"}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {patient ? (latestVitals?.spo2 ? "Pulse oximetry" : "Not measured") : "Awaiting patient"}
          </p>
        </div>

        {/* 5. Weight */}
        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Weight / BMI</span>
            <Weight size={14} className="text-purple-500" />
          </div>
          <p className="text-base font-bold text-slate-900 dark:text-slate-100">
            {latestVitals?.weight ? `${latestVitals.weight} kg` : "-- kg"}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {patient ? (latestVitals?.weight ? "Anthropometry" : "Not measured") : "Awaiting patient"}
          </p>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SECTION 4: CLINICAL EMR WORKSPACE & LONGITUDINAL RECORDS */}
      {/* ───────────────────────────────────────────────────────────── */}
      {patient ? (
        /* POPULATED EMR: Full Longitudinal History Viewer */
        <PatientHistoryViewer
          patientId={patient.id}
          visitId={effectiveVisitId}
          defaultTab="prescriptions"
          showAllergyAdder={true}
        />
      ) : (
        /* UNSELECTED EMR: Interactive Queue Selector Workspace */
        <Card className="p-4 border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Activity size={15} className="text-teal-600" />
              Select Patient from Queue
            </h3>

              {/* Mode switch */}
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg shrink-0">
                <button
                  onClick={() => setPickerTab("queue")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${
                    pickerTab === "queue"
                      ? "bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-800"
                  }`}
                >
                  <Clock size={13} />
                  Queue ({queue.length})
                </button>
                <button
                  onClick={() => setPickerTab("registry")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${
                    pickerTab === "registry"
                      ? "bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-800"
                  }`}
                >
                  <Users size={13} />
                  All Registry
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative max-w-md mb-4">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder={
                  pickerTab === "queue"
                    ? "Filter queue by name, ticket #, or Health ID..."
                    : "Search all registry by name, phone, or Health ID..."
                }
                value={queueSearch}
                onChange={(e) => setQueueSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              {queueSearch && (
                <button
                  onClick={() => setQueueSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Queue Table */}
            {pickerTab === "queue" ? (
              filteredQueue.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs bg-slate-50/50 dark:bg-slate-800/20 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
                  {trimmedSearch
                    ? `No waiting patient found matching "${trimmedSearch}".`
                    : "No patients are currently in the OPD waiting queue. Switch to 'All Registry' to search previous patients."}
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredQueue.map((ticket) => {
                    const p = ticket.visit.patient;
                    return (
                      <div
                        key={ticket.id}
                        className="p-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Ticket Number */}
                          <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-mono font-bold text-xs shrink-0">
                            #{ticket.ticketNumber}
                          </span>

                          {/* Avatar */}
                          <div className="w-8 h-8 rounded-full bg-teal-50 dark:bg-teal-950/70 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 font-bold text-xs flex items-center justify-center shrink-0">
                            {p.nameEn.slice(0, 2).toUpperCase()}
                          </div>

                          {/* Identity */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                                {p.nameEn}
                              </span>
                              {p.nameAm && (
                                <span className="text-[11px] text-slate-400 truncate">
                                  ({p.nameAm})
                                </span>
                              )}
                              <span
                                className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                  p.sex === "M"
                                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                                    : "bg-pink-50 text-pink-700 border border-pink-200"
                                }`}
                              >
                                {p.sex}
                              </span>
                              <span className="text-xs text-slate-500">
                                {calculateAge(p.dob)}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                              <span className="font-mono text-slate-700 dark:text-slate-300">
                                {p.healthId}
                              </span>
                              <span>·</span>
                              <span>{p.phone || "No phone"}</span>
                              <span>·</span>
                              <StatusBadge status={ticket.status} />
                            </div>
                          </div>
                        </div>

                        {/* Select Patient Action Button */}
                        <button
                          onClick={() => handleSelectPatient(p.id, ticket.visitId)}
                          className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shrink-0 transition shadow-xs cursor-pointer"
                        >
                          <span>Select Patient</span>
                          <ChevronRight size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              /* All Registry Records */
              <div>
                {isSearchLoading || isListLoading ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    <Activity className="w-5 h-5 animate-spin mx-auto mb-2 text-teal-600" />
                    Searching patient registry…
                  </div>
                ) : (trimmedSearch ? searchResults : patientList?.patients ?? []).length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No registry records found.
                  </div>
                ) : (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                    {(trimmedSearch ? searchResults : patientList?.patients ?? []).map((p) => (
                      <div
                        key={p.id}
                        className="p-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0">
                            {p.nameEn.slice(0, 2).toUpperCase()}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                                {p.nameEn}
                              </span>
                              {p.nameAm && (
                                <span className="text-[11px] text-slate-400 truncate">
                                  ({p.nameAm})
                                </span>
                              )}
                              <span
                                className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                  p.sex === "M"
                                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                                    : "bg-pink-50 text-pink-700 border border-pink-200"
                                }`}
                              >
                                {p.sex}
                              </span>
                              <span className="text-xs text-slate-500">
                                {calculateAge(p.dob)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                              <span className="font-mono text-slate-700 dark:text-slate-300">
                                {p.healthId}
                              </span>
                              <span>·</span>
                              <span>{p.phone || "No phone"}</span>
                              <span>·</span>
                              <span>Kebele: {(p as any).kebele || "—"}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleSelectPatient(p.id)}
                          className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shrink-0 transition"
                        >
                          <span>Select Patient</span>
                          <ChevronRight size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
      )}
    </PageShell>
  );
}

export default function EMRPage() {
  return (
    <Suspense
      fallback={
        <PageShell title="Patient EMR">
          <div className="p-8 text-center text-slate-400 text-xs">
            <Activity className="w-5 h-5 animate-spin mx-auto mb-2 text-teal-600" />
            Loading patient records…
          </div>
        </PageShell>
      }
    >
      <EMRContent />
    </Suspense>
  );
}