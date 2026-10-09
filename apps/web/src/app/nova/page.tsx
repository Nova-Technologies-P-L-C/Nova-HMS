"use client";

// Nova HMS — Modern Hospital Management System & ERP Solution
// UI/UX Concept inspired by 2026 Medical ERP Design System
import { useState } from "react";
import Link from "next/link";
import { useNovaTheme } from "@/components/nova/nova-theme-context";
import {
  ArrowRight,
  Activity,
  Users,
  FlaskConical,
  Pill,
  BarChart3,
  Smartphone,
  CheckCircle2,
  WifiOff,
  CreditCard,
  ShieldCheck,
  Stethoscope,
  ChevronRight,
  Search,
  Bell,
  Settings,
  Bed,
  Layers,
  Sparkles,
  HeartPulse,
  Plus,
  ExternalLink,
  ChevronDown,
  Building2,
  TrendingUp,
  Receipt,
  Microscope,
  Calendar,
  AlertCircle,
  FileCheck,
  Sun,
  Moon,
} from "lucide-react";

// Interactive tabs for the Hero Monitor Mockup
type DemoTab = "dashboard" | "patients" | "lab" | "appointments";

const MODULES = [
  {
    icon: <Activity size={24} className="text-[#6AB8FF]" />,
    name: "Real-Time Dashboard Analytics",
    badge: "Executive Cockpit",
    desc: "Live KPI tracking of patient admissions, active treatments, emergency queues, uncollected arrears, and department revenue.",
  },
  {
    icon: <FlaskConical size={24} className="text-[#6AB8FF]" />,
    name: "Laboratory Workflow Management",
    badge: "5-Step LIS Pipeline",
    desc: "End-to-end specimen collection, analyzer processing, automated result entry, and immediate clinician delivery with zero paper slips.",
  },
  {
    icon: <Pill size={24} className="text-[#CFA3F6]" />,
    name: "Prescription & FEFO Pharmacy",
    badge: "Zero Stockouts",
    desc: "Direct digital prescription fulfillment, first-expiry first-out inventory, automated Reorder Point (ROP) alerts, and batch audits.",
  },
  {
    icon: <Receipt size={24} className="text-[#6AB8FF]" />,
    name: "Financial & Revenue Operations",
    badge: "Cash & CBHI Split",
    desc: "Instant cashier reconciliation, fee waivers, uncollected arrears tracking, and automated Ethiopian Kebele CBHI claim reporting.",
  },
  {
    icon: <Bed size={24} className="text-[#CFA3F6]" />,
    name: "Bed Availability & Inpatient Tracking",
    badge: "Ward Floorplan",
    desc: "Real-time visibility across general beds, ICU units, and private cabins with automated admission, transfer, and discharge status.",
  },
  {
    icon: <ShieldCheck size={24} className="text-[#6AB8FF]" />,
    name: "Role & Permission Security Ledger",
    badge: "RBAC & Audit Trail",
    desc: "Strict clinical boundary isolation for Doctors, Triage Nurses, Pharmacists, Cashiers, Lab Techs, and Facility Administrators.",
  },
];

const WORKFLOW_STEPS = [
  {
    step: "01",
    title: "Reception & Kiosk Intake",
    dept: "Patient Administration",
    desc: "Patients register or scan their QR token. System instantly verifies Kebele CBHI membership and issues prioritized queue tickets.",
    badge: "Paperless Intake",
  },
  {
    step: "02",
    title: "Triage & Vital Signs",
    dept: "Nursing Station",
    desc: "Nurses log BP, pulse, temp, SpO2, and calculate national triage urgency flags (Red, Orange, Yellow, Green) for doctor routing.",
    badge: "Urgency Scoring",
  },
  {
    step: "03",
    title: "Doctor Consultation",
    dept: "Clinical Care",
    desc: "Doctors review longitudinal EMR, formulate diagnoses, transmit digital lab requisitions, and generate verified prescriptions.",
    badge: "Unified EMR",
  },
  {
    step: "04",
    title: "Laboratory Diagnostics (LIS)",
    dept: "Diagnostic Suite",
    desc: "Technicians receive digital orders, track specimen barcodes, and verify results directly onto the patient chart in real time.",
    badge: "Instant Results",
  },
  {
    step: "05",
    title: "FEFO Pharmacy Dispensing",
    dept: "Therapeutic Logistics",
    desc: "Pharmacists dispense prescriptions against electronic records with automated batch expiry tracking and inventory level updates.",
    badge: "Safe Dispensing",
  },
  {
    step: "06",
    title: "Billing & CBHI Settlement",
    dept: "Revenue Cycle",
    desc: "System reconciles services rendered, calculates copayments or social waivers, and generates approved CBHI claims ready for reimbursement.",
    badge: "Auto Reconciliation",
  },
];

const ENTERPRISE_PILLARS = [
  {
    icon: <WifiOff size={22} className="text-[#6AB8FF]" />,
    title: "Offline-First LAN Resilience",
    desc: "Workstations operate uninterrupted during network or internet outages. Local SQLite/IndexedDB syncs instantly once LAN or WAN is available.",
  },
  {
    icon: <CreditCard size={22} className="text-emerald-400" />,
    title: "Native Ethiopian CBHI Engine",
    desc: "Eliminates months of paper claim paperwork with instant Kebele membership verification and standardized electronic reimbursement reporting.",
  },
  {
    icon: <ShieldCheck size={22} className="text-[#CFA3F6]" />,
    title: "Role Security & Forensic Audit",
    desc: "Doctor-only consultation privacy, nurse-only vitals logging, and immutable audit logs capturing every clinical and financial touchpoint.",
  },
  {
    icon: <Smartphone size={22} className="text-[#6AB8FF]" />,
    title: "Bilingual English & Amharic",
    desc: "Seamless one-tap language switching for clinical personnel and patient portal receipts, ensuring 100% Ethiopian facility adoption.",
  },
];

const DEMO_STATIONS = [
  { name: "Doctor Station", path: "/nova/doctor", desc: "EMR, Rx & Lab Orders", role: "Clinician" },
  { name: "Triage Intake", path: "/nova/triage", desc: "Vitals & Urgency Scoring", role: "Triage Nurse" },
  { name: "OPD Queue Board", path: "/nova/reception/queue", desc: "Live Wait Times", role: "Receptionist" },
  { name: "Central Pharmacy", path: "/nova/pharmacy", desc: "Inventory & ROP Alerts", role: "Pharmacist" },
  { name: "Diagnostic Lab", path: "/nova/lab", desc: "LIS & Result Entry", role: "Lab Technician" },
  { name: "Hospital Admin", path: "/nova/hospital-admin", desc: "Staffing & Tariffs", role: "Facility Manager" },
] as const;

export default function NovaLandingPage() {
  const [activeTab, setActiveTab] = useState<DemoTab>("dashboard");
  const { theme, setMode } = useNovaTheme();

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F17] text-[#2C3137] dark:text-slate-100 font-[family-name:var(--font-urbanist),sans-serif] selection:bg-[#6AB8FF]/20 selection:text-[#6AB8FF]">
      
      {/* ── TOP FLOATING PILL NAVIGATION BAR ── */}
      <header className="sticky top-0 z-50 px-4 sm:px-8 py-3 backdrop-blur-md bg-white/80 dark:bg-[#0B0F17]/80 border-b border-[#DAE3EE]/80 dark:border-slate-800/80 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Logo & Platform Badge */}
          <Link href="/nova" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#6AB8FF] to-[#CFA3F6] flex items-center justify-center text-white shadow-sm shadow-[#6AB8FF]/30 group-hover:scale-105 transition-transform">
              <HeartPulse size={20} className="stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg tracking-tight text-[#2C3137] dark:text-white">NOVA HMS</span>
                <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-[#6AB8FF]/15 text-[#6AB8FF] border border-[#6AB8FF]/30">ERP</span>
              </div>
              <p className="text-[10px] text-[#7C7C7C] dark:text-slate-400 font-medium tracking-wide">Hospital & Lab Platform</p>
            </div>
          </Link>

          {/* Center Floating Capsule Menu */}
          <nav className="hidden lg:flex items-center gap-1 bg-[#FCFDFF] dark:bg-slate-900 border border-[#DAE3EE] dark:border-slate-800 px-3 py-1.5 rounded-full shadow-xs">
            <a href="#overview" className="px-3.5 py-1 text-xs font-semibold text-[#2C3137] dark:text-slate-200 hover:text-[#6AB8FF] rounded-full transition-colors">
              Overview
            </a>
            <a href="#cockpit" className="px-3.5 py-1 text-xs font-semibold text-[#2C3137] dark:text-slate-200 hover:text-[#6AB8FF] rounded-full transition-colors">
              ERP Cockpit
            </a>
            <a href="#modules" className="px-3.5 py-1 text-xs font-semibold text-[#2C3137] dark:text-slate-200 hover:text-[#6AB8FF] rounded-full transition-colors">
              Modules
            </a>
            <a href="#workflow" className="px-3.5 py-1 text-xs font-semibold text-[#2C3137] dark:text-slate-200 hover:text-[#6AB8FF] rounded-full transition-colors">
              Clinical Flow
            </a>
            <Link href="/nova/pricing" className="px-3.5 py-1 text-xs font-semibold text-[#2C3137] dark:text-slate-200 hover:text-[#6AB8FF] rounded-full transition-colors">
              Pricing
            </Link>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Theme Mode Toggle (Sun/Moon) */}
            <button
              onClick={() => setMode(theme?.mode === "dark" ? "light" : "dark")}
              title={theme?.mode === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label="Toggle light and dark theme"
              className="w-8 h-8 rounded-full border border-[#DAE3EE] dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center text-[#2C3137] dark:text-slate-200 hover:border-[#6AB8FF] hover:text-[#6AB8FF] transition-all shadow-2xs group cursor-pointer"
            >
              {theme?.mode === "dark" ? (
                <Sun size={15} className="text-amber-400 group-hover:rotate-45 transition-transform" />
              ) : (
                <Moon size={15} className="text-[#6AB8FF] group-hover:-rotate-12 transition-transform" />
              )}
            </button>

            <Link
              href="/nova/patient"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-full border border-[#DAE3EE] dark:border-slate-800 bg-white dark:bg-slate-900 text-[#2C3137] dark:text-slate-200 hover:border-[#6AB8FF] hover:text-[#6AB8FF] transition-all shadow-2xs"
            >
              <Smartphone size={13} className="text-[#6AB8FF]" />
              <span>Patient Portal</span>
            </Link>

            <Link
              href="/nova/login"
              className="px-3.5 py-1.5 text-xs font-semibold rounded-full text-[#7C7C7C] dark:text-slate-300 hover:text-[#2C3137] dark:hover:text-white transition-colors"
            >
              Staff Sign In
            </Link>

            <Link
              href="/nova/signup"
              className="px-4 py-1.5 text-xs font-bold rounded-full text-white bg-gradient-to-r from-[#6AB8FF] via-[#89B0FE] to-[#CFA3F6] hover:opacity-95 shadow-xs shadow-[#6AB8FF]/40 transition-all hover:scale-[1.02]"
            >
              Request Demo
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO BANNER & TITLE SECTION ── */}
      <section id="overview" className="relative pt-12 pb-8 sm:pt-20 sm:pb-12 px-4 sm:px-8 text-center overflow-hidden">
        {/* Glowing 3D DNA Helix Background Artwork in Hero */}
        <div className="absolute -top-10 -right-10 w-full sm:w-3/4 max-w-4xl h-[460px] pointer-events-none opacity-50 dark:opacity-35 -z-10 overflow-hidden">
          <div 
            className="w-full h-full bg-no-repeat bg-right-top bg-contain filter contrast-125 dark:mix-blend-screen mix-blend-multiply"
            style={{ backgroundImage: `url('/landing/dna_helix_pure.png')` }}
          />
          {/* Subtle gradient veil for legibility */}
          <div className="absolute inset-0 bg-gradient-to-l from-transparent via-[#F8FAFC]/50 to-[#F8FAFC] dark:via-[#0B0F17]/60 dark:to-[#0B0F17]" />
        </div>

        {/* Soft Ambient Glow Orbs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-r from-[#6AB8FF]/20 via-[#CFA3F6]/15 to-transparent blur-3xl pointer-events-none -z-10" />

        <div className="max-w-4xl mx-auto space-y-5">
          {/* Release Tag Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-[#DAE3EE] dark:border-slate-800 shadow-xs text-xs font-semibold text-[#2C3137] dark:text-slate-300">
            <span className="w-2 h-2 rounded-full bg-[#6AB8FF] animate-pulse" />
            <span className="font-bold tracking-wide uppercase text-[11px] text-[#6AB8FF]">Hospital ERP &amp; Laboratory Platform</span>
            <span className="text-[#7C7C7C] dark:text-slate-500">|</span>
            <span className="text-[11px] text-[#7C7C7C] dark:text-slate-400">Next-Gen UI/UX Edition</span>
          </div>

          {/* Hero Main Headline */}
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-[#2C3137] dark:text-white leading-[1.12]">
            One platform for entire hospital operations.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6AB8FF] via-[#7DAAFF] to-[#CFA3F6]">
              From reception to laboratory &amp; referral.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-[#7C7C7C] dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Eliminate paper queues and fragmented records. Nova HMS unites outpatient queuing, longitudinal EMR, 5-step diagnostic laboratory workflows, and CBHI settlement into a clean, modern interface.
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-3">
            <Link
              href="/nova/signup"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold text-white bg-gradient-to-r from-[#6AB8FF] to-[#9A74F5] hover:opacity-95 shadow-md shadow-[#6AB8FF]/30 transition-all hover:scale-[1.02]"
            >
              <span>Request Hospital Demo</span>
              <ArrowRight size={16} />
            </Link>

            <Link
              href="/nova/hospital-admin"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold rounded-full border border-[#DAE3EE] dark:border-slate-700 bg-[#FCFDFF] dark:bg-slate-900 text-[#2C3137] dark:text-white hover:border-[#6AB8FF] transition-all hover:scale-[1.02] shadow-xs"
            >
              <span>Explore Admin Cockpit</span>
              <ExternalLink size={14} className="text-[#7C7C7C]" />
            </Link>

            <div className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-[#7C7C7C] dark:text-slate-400 pt-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>100% Offline-Capable LAN Mode</span>
              <span className="mx-1.5">·</span>
              <span>Bilingual English &amp; Amharic</span>
              <span className="mx-1.5">·</span>
              <span>Zero USD Recurring Fees</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── THE CENTERPIECE: INTERACTIVE HERO COCKPIT (DRIBBLE 1:1 REPLICATION) ── */}
      <section id="cockpit" className="max-w-6xl mx-auto px-4 sm:px-8 pb-16 pt-4">
        
        {/* Tab Controls for the Cockpit */}
        <div className="flex items-center justify-center gap-2 mb-4 overflow-x-auto py-2">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "dashboard"
                ? "bg-gradient-to-r from-[#6AB8FF] to-[#CFA3F6] text-white shadow-xs"
                : "bg-white dark:bg-slate-900 border border-[#DAE3EE] dark:border-slate-800 text-[#7C7C7C] hover:text-[#2C3137]"
            }`}
          >
            <Activity size={14} />
            <span>Executive ERP Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab("patients")}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "patients"
                ? "bg-gradient-to-r from-[#6AB8FF] to-[#CFA3F6] text-white shadow-xs"
                : "bg-white dark:bg-slate-900 border border-[#DAE3EE] dark:border-slate-800 text-[#7C7C7C] hover:text-[#2C3137]"
            }`}
          >
            <Users size={14} />
            <span>Patient Registry Table</span>
          </button>

          <button
            onClick={() => setActiveTab("lab")}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "lab"
                ? "bg-gradient-to-r from-[#6AB8FF] to-[#CFA3F6] text-white shadow-xs"
                : "bg-white dark:bg-slate-900 border border-[#DAE3EE] dark:border-slate-800 text-[#7C7C7C] hover:text-[#2C3137]"
            }`}
          >
            <Microscope size={14} />
            <span>Diagnostic Lab Orders</span>
          </button>

          <button
            onClick={() => setActiveTab("appointments")}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "appointments"
                ? "bg-gradient-to-r from-[#6AB8FF] to-[#CFA3F6] text-white shadow-xs"
                : "bg-white dark:bg-slate-900 border border-[#DAE3EE] dark:border-slate-800 text-[#7C7C7C] hover:text-[#2C3137]"
            }`}
          >
            <Calendar size={14} />
            <span>Appointment &amp; Token Queue</span>
          </button>
        </div>

        {/* ── MONITOR FRAME CONTAINER ── */}
        <div className="relative rounded-3xl p-3 sm:p-5 bg-gradient-to-b from-[#1C222C] to-[#0E121A] border-4 border-slate-700/60 shadow-2xl shadow-slate-900/40">
          
          {/* Monitor Screen Bezel Top Bar */}
          <div className="flex items-center justify-between px-3 py-1.5 mb-2 text-slate-400 text-[11px] border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
              <span className="ml-2 font-mono text-[10px] text-slate-400">Nova HMS · Clinical Workstation v3.8</span>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                LAN Node Live
              </span>
              <span className="text-slate-500">|</span>
              <span>Addis Central Hospital</span>
            </div>
          </div>

          {/* ── MONITOR DISPLAY CONTENT ── */}
          <div className="relative rounded-2xl bg-[#F0F4F8] dark:bg-[#10151E] overflow-hidden border border-[#DAE3EE] dark:border-slate-800 min-h-[560px]">
            
            {/* 3D Glowing DNA Helix Background Decoration */}
            <div 
              className="absolute top-12 right-0 w-3/4 h-[280px] pointer-events-none opacity-90 dark:opacity-50 bg-no-repeat bg-right-top bg-contain"
              style={{ backgroundImage: `url('/landing/dna_helix_pure.png')` }}
            />

            {/* Subtle Gradient Veil */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#F0F4F8]/85 via-[#F0F4F8]/60 to-[#F0F4F8]/95 dark:from-[#10151E]/90 dark:via-[#10151E]/75 dark:to-[#10151E]/95 pointer-events-none" />

            {/* Inner Dashboard Header (Matching Dribbble Layout) */}
            <div className="relative z-10 px-5 sm:px-8 pt-5 pb-4 border-b border-[#DAE3EE]/70 dark:border-slate-800/80">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                
                {/* User Pill Badge */}
                <div className="flex items-center gap-3">
                  <div className="inline-flex items-center gap-2.5 bg-white dark:bg-slate-900 border border-[#DAE3EE] dark:border-slate-800 rounded-full px-3 py-1.5 shadow-2xs">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#6AB8FF] to-[#CFA3F6] flex items-center justify-center text-white text-xs font-bold">
                      OJ
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-bold text-[#2C3137] dark:text-white leading-tight">Oliver Jack</div>
                      <div className="text-[10px] text-[#7C7C7C] dark:text-slate-400">Medical Administrator</div>
                    </div>
                    <ChevronDown size={14} className="text-[#7C7C7C] ml-1" />
                  </div>
                </div>

                {/* Center Branding */}
                <div className="text-center md:absolute md:left-1/2 md:-translate-x-1/2">
                  <h3 className="font-extrabold text-base tracking-widest uppercase text-[#2C3137] dark:text-white">
                    HOSPITAL ERP
                  </h3>
                  <p className="text-[10px] text-[#7C7C7C] dark:text-slate-400 tracking-wide">
                    Hospital &amp; Laboratory Management System
                  </p>
                </div>

                {/* Right Quick Actions */}
                <div className="flex items-center gap-2 self-end md:self-auto">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7C7C7C]" />
                    <input
                      type="text"
                      placeholder="Search patient, MRN..."
                      disabled
                      className="bg-white dark:bg-slate-900 border border-[#DAE3EE] dark:border-slate-800 rounded-full pl-8 pr-3 py-1.5 text-xs text-[#2C3137] dark:text-slate-300 w-44 placeholder:text-slate-400 focus:outline-hidden"
                    />
                  </div>
                  <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-900 border border-[#DAE3EE] dark:border-slate-800 flex items-center justify-center text-[#7C7C7C] dark:text-slate-300 shadow-2xs">
                    <Bell size={14} />
                  </div>
                  <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-900 border border-[#DAE3EE] dark:border-slate-800 flex items-center justify-center text-[#7C7C7C] dark:text-slate-300 shadow-2xs">
                    <Settings size={14} />
                  </div>
                </div>
              </div>

              {/* Module Capsule Bar Ribbon */}
              <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === "dashboard"
                      ? "bg-gradient-to-r from-[#6AB8FF] to-[#CFA3F6] text-white shadow-xs"
                      : "bg-white dark:bg-slate-900 border border-[#DAE3EE] dark:border-slate-800 text-[#2C3137] dark:text-slate-300"
                  }`}
                >
                  <Activity size={13} />
                  <span>Dashboard</span>
                  <ChevronDown size={12} className="opacity-70" />
                </button>

                <button
                  onClick={() => setActiveTab("patients")}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === "patients"
                      ? "bg-gradient-to-r from-[#6AB8FF] to-[#CFA3F6] text-white shadow-xs"
                      : "bg-white dark:bg-slate-900 border border-[#DAE3EE] dark:border-slate-800 text-[#2C3137] dark:text-slate-300"
                  }`}
                >
                  <Users size={13} />
                  <span>Outdoor (OPD)</span>
                  <ChevronDown size={12} className="opacity-70" />
                </button>

                <button
                  onClick={() => setActiveTab("lab")}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === "lab"
                      ? "bg-gradient-to-r from-[#6AB8FF] to-[#CFA3F6] text-white shadow-xs"
                      : "bg-white dark:bg-slate-900 border border-[#DAE3EE] dark:border-slate-800 text-[#2C3137] dark:text-slate-300"
                  }`}
                >
                  <Microscope size={13} />
                  <span>Lab Module</span>
                  <ChevronDown size={12} className="opacity-70" />
                </button>

                <button
                  onClick={() => setActiveTab("appointments")}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === "appointments"
                      ? "bg-gradient-to-r from-[#6AB8FF] to-[#CFA3F6] text-white shadow-xs"
                      : "bg-white dark:bg-slate-900 border border-[#DAE3EE] dark:border-slate-800 text-[#2C3137] dark:text-slate-300"
                  }`}
                >
                  <Calendar size={13} />
                  <span>Prescription &amp; Queue</span>
                  <ChevronDown size={12} className="opacity-70" />
                </button>

                <Link
                  href={"/nova/branch-admin/staff" as any}
                  className="px-4 py-1.5 rounded-full text-xs font-bold bg-white dark:bg-slate-900 border border-[#DAE3EE] dark:border-slate-800 text-[#2C3137] dark:text-slate-300 flex items-center gap-1.5 hover:border-[#6AB8FF] transition-colors"
                >
                  <ShieldCheck size={13} />
                  <span>App Users</span>
                  <ChevronDown size={12} className="opacity-70" />
                </Link>

                <Link
                  href={"/nova/hospital-admin/departments" as any}
                  className="px-4 py-1.5 rounded-full text-xs font-bold bg-white dark:bg-slate-900 border border-[#DAE3EE] dark:border-slate-800 text-[#2C3137] dark:text-slate-300 flex items-center gap-1.5 hover:border-[#6AB8FF] transition-colors"
                >
                  <Layers size={13} />
                  <span>Master Data</span>
                  <ChevronDown size={12} className="opacity-70" />
                </Link>
              </div>
            </div>

            {/* ── TAB VIEW 1: EXECUTIVE ERP DASHBOARD (6 FLOATING FROSTED CARDS) ── */}
            {activeTab === "dashboard" && (
              <div className="relative z-10 p-5 sm:p-8 space-y-6">
                {/* Greeting */}
                <div>
                  <p className="text-xs font-semibold text-[#7C7C7C] dark:text-slate-400">Hi, Oliver Jack!</p>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-[#2C3137] dark:text-white tracking-tight">
                    Welcome Back
                  </h2>
                </div>

                {/* 6 Key Performance Metric Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  
                  {/* CARD 1: Patients Today */}
                  <div className="bg-[#FCFDFF]/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-[#DAE3EE] dark:border-slate-800 p-5 shadow-xs hover:border-[#6AB8FF] transition-all">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#7C7C7C] dark:text-slate-400 mb-4">
                      Patients Today
                    </h4>
                    <div className="flex items-baseline justify-between">
                      <div>
                        <div className="text-4xl font-extrabold text-[#2C3137] dark:text-white">05</div>
                        <div className="text-xs text-[#7C7C7C] dark:text-slate-400 mt-1">Patient Admission</div>
                      </div>
                      <div className="space-y-1 text-right text-xs">
                        <div className="text-[#2C3137] dark:text-slate-200">
                          <span className="text-[#7C7C7C] dark:text-slate-400">Under Treatment: </span>
                          <span className="font-bold">08</span>
                        </div>
                        <div className="text-[#2C3137] dark:text-slate-200">
                          <span className="text-[#7C7C7C] dark:text-slate-400">Patient Discharge: </span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">02</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CARD 2: Expense Today */}
                  <div className="bg-[#FCFDFF]/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-[#DAE3EE] dark:border-slate-800 p-5 shadow-xs hover:border-[#6AB8FF] transition-all">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#7C7C7C] dark:text-slate-400 mb-4">
                      Expense Today
                    </h4>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-extrabold text-[#2C3137] dark:text-white">4,270.00</div>
                        <div className="text-xs text-[#7C7C7C] dark:text-slate-400 mt-0.5">Daily Expense (ETB)</div>
                      </div>

                      {/* Sparkline Graphic */}
                      <div className="w-16 h-8 flex items-end gap-1 px-1">
                        <div className="w-2.5 h-3 bg-red-400/60 rounded-t" />
                        <div className="w-2.5 h-5 bg-red-400/70 rounded-t" />
                        <div className="w-2.5 h-4 bg-red-400/60 rounded-t" />
                        <div className="w-2.5 h-7 bg-red-500 rounded-t" />
                        <div className="w-2.5 h-6 bg-red-400/80 rounded-t" />
                      </div>

                      <div className="text-right">
                        <div className="text-xl font-bold text-[#7C7C7C] dark:text-slate-300">80,430.00</div>
                        <div className="text-[11px] text-[#7C7C7C] dark:text-slate-400">This Month</div>
                      </div>
                    </div>
                  </div>

                  {/* CARD 3: Collection Today */}
                  <div className="bg-[#FCFDFF]/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-[#DAE3EE] dark:border-slate-800 p-5 shadow-xs hover:border-[#6AB8FF] transition-all">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#7C7C7C] dark:text-slate-400 mb-4">
                      Collection Today
                    </h4>
                    <div className="flex items-baseline justify-between">
                      <div className="space-y-1 text-xs">
                        <div className="text-[#2C3137] dark:text-slate-200">
                          <span className="text-[#7C7C7C]">Clinic Cashier: </span>
                          <span className="font-bold">6,200.00</span>
                        </div>
                        <div className="text-[#2C3137] dark:text-slate-200">
                          <span className="text-[#7C7C7C]">Lab Revenue: </span>
                          <span className="font-bold">4,500.00</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-extrabold text-[#6AB8FF]">10,700.00</div>
                        <div className="text-xs text-[#7C7C7C] dark:text-slate-400">Total Collected (ETB)</div>
                      </div>
                    </div>
                  </div>

                  {/* CARD 4: Due (Not Collected) */}
                  <div className="bg-[#FCFDFF]/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-[#DAE3EE] dark:border-slate-800 p-5 shadow-xs hover:border-[#6AB8FF] transition-all">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#7C7C7C] dark:text-slate-400 mb-4">
                      Due (Not Collected)
                    </h4>
                    <div className="flex items-baseline justify-between">
                      <div className="space-y-1 text-xs">
                        <div className="text-[#2C3137] dark:text-slate-200">
                          <span className="text-[#7C7C7C]">Clinic Arrears: </span>
                          <span className="font-bold">60,200.00</span>
                        </div>
                        <div className="text-[#2C3137] dark:text-slate-200">
                          <span className="text-[#7C7C7C]">Lab Pending: </span>
                          <span className="font-bold">72,910.00</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">133,110.00</div>
                        <div className="text-xs text-[#7C7C7C] dark:text-slate-400">Outstanding Total</div>
                      </div>
                    </div>
                  </div>

                  {/* CARD 5: Lab Reports Today */}
                  <div className="bg-[#FCFDFF]/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-[#DAE3EE] dark:border-slate-800 p-5 shadow-xs hover:border-[#6AB8FF] transition-all">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#7C7C7C] dark:text-slate-400 mb-3">
                      Lab Reports Today
                    </h4>
                    <div className="flex items-center justify-between">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px]">
                        <div><span className="text-[#7C7C7C]">Pending: </span><span className="font-semibold">05</span></div>
                        <div><span className="text-[#7C7C7C]">Sample: </span><span className="font-semibold">06</span></div>
                        <div><span className="text-[#7C7C7C]">Processing: </span><span className="font-semibold">08</span></div>
                        <div><span className="text-[#7C7C7C]">Completed: </span><span className="font-semibold text-emerald-600">06</span></div>
                        <div className="col-span-2 text-teal-600 dark:text-teal-400 font-medium">Delivered: 15</div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-extrabold text-[#CFA3F6]">40</div>
                        <div className="text-xs text-[#7C7C7C] dark:text-slate-400">Total Orders</div>
                      </div>
                    </div>
                  </div>

                  {/* CARD 6: Available Bed */}
                  <div className="bg-[#FCFDFF]/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-[#DAE3EE] dark:border-slate-800 p-5 shadow-xs hover:border-[#6AB8FF] transition-all">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#7C7C7C] dark:text-slate-400 mb-4">
                      Available Bed
                    </h4>
                    <div className="flex items-baseline justify-between">
                      <div className="space-y-1 text-xs">
                        <div className="text-[#2C3137] dark:text-slate-200">
                          <span className="text-[#7C7C7C]">Private Cabin: </span>
                          <span className="font-bold">02</span>
                        </div>
                        <div className="text-[#2C3137] dark:text-slate-200">
                          <span className="text-[#7C7C7C]">General Ward: </span>
                          <span className="font-bold">03</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-4xl font-extrabold text-emerald-600 dark:text-emerald-400">05</div>
                        <div className="text-xs text-[#7C7C7C] dark:text-slate-400">Free Beds</div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* ── TAB VIEW 2: PATIENT MANAGEMENT TABLE ── */}
            {activeTab === "patients" && (
              <div className="relative z-10 p-5 sm:p-8 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-bold text-[#2C3137] dark:text-white">Patient Management</h3>
                    <p className="text-xs text-[#7C7C7C] dark:text-slate-400">Manage all patient records, demographics, and Kebele CBHI registration.</p>
                  </div>
                  <Link
                    href="/nova/reception/register"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-[#CFA3F6] text-slate-900 hover:opacity-90 transition-opacity self-start"
                  >
                    <Plus size={14} />
                    <span>Add New Patient</span>
                  </Link>
                </div>

                {/* Table Mockup */}
                <div className="bg-[#FCFDFF] dark:bg-slate-900 rounded-2xl border border-[#DAE3EE] dark:border-slate-800 overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F0F4F8] dark:bg-slate-800/60 text-[#7C7C7C] uppercase font-bold text-[10px] tracking-wider border-b border-[#DAE3EE] dark:border-slate-800">
                        <tr>
                          <th className="px-4 py-3">CID / MRN</th>
                          <th className="px-4 py-3">Name</th>
                          <th className="px-4 py-3">Age</th>
                          <th className="px-4 py-3">Mobile</th>
                          <th className="px-4 py-3">Gender</th>
                          <th className="px-4 py-3">Blood Group</th>
                          <th className="px-4 py-3">CBHI Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#DAE3EE]/60 dark:divide-slate-800">
                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-3 font-mono font-bold text-[#6AB8FF]">2615</td>
                          <td className="px-4 py-3 font-semibold text-[#2C3137] dark:text-white">Aminul Haque</td>
                          <td className="px-4 py-3 text-[#7C7C7C]">32 Y</td>
                          <td className="px-4 py-3 font-mono text-[#7C7C7C]">+251 911 234567</td>
                          <td className="px-4 py-3 text-[#7C7C7C]">Male</td>
                          <td className="px-4 py-3"><span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 font-bold text-[10px]">O+</span></td>
                          <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px]">Active CBHI</span></td>
                        </tr>
                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-3 font-mono font-bold text-[#6AB8FF]">2616</td>
                          <td className="px-4 py-3 font-semibold text-[#2C3137] dark:text-white">Samul Islam</td>
                          <td className="px-4 py-3 text-[#7C7C7C]">33 Y</td>
                          <td className="px-4 py-3 font-mono text-[#7C7C7C]">+251 922 456789</td>
                          <td className="px-4 py-3 text-[#7C7C7C]">Male</td>
                          <td className="px-4 py-3"><span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 font-bold text-[10px]">B+</span></td>
                          <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px]">Active CBHI</span></td>
                        </tr>
                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-3 font-mono font-bold text-[#6AB8FF]">2617</td>
                          <td className="px-4 py-3 font-semibold text-[#2C3137] dark:text-white">Sagar Sarkar</td>
                          <td className="px-4 py-3 text-[#7C7C7C]">34 Y</td>
                          <td className="px-4 py-3 font-mono text-[#7C7C7C]">+251 933 678901</td>
                          <td className="px-4 py-3 text-[#7C7C7C]">Male</td>
                          <td className="px-4 py-3"><span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 font-bold text-[10px]">AB+</span></td>
                          <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-[10px]">Private Cash</span></td>
                        </tr>
                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-3 font-mono font-bold text-[#6AB8FF]">2618</td>
                          <td className="px-4 py-3 font-semibold text-[#2C3137] dark:text-white">Nila Akter</td>
                          <td className="px-4 py-3 text-[#7C7C7C]">28 Y</td>
                          <td className="px-4 py-3 font-mono text-[#7C7C7C]">+251 944 890123</td>
                          <td className="px-4 py-3 text-[#7C7C7C]">Female</td>
                          <td className="px-4 py-3"><span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 font-bold text-[10px]">A-</span></td>
                          <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px]">Active CBHI</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB VIEW 3: DIAGNOSTIC LAB ORDERS ── */}
            {activeTab === "lab" && (
              <div className="relative z-10 p-5 sm:p-8 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-bold text-[#2C3137] dark:text-white">Diagnostic Laboratory Orders (LIS)</h3>
                    <p className="text-xs text-[#7C7C7C] dark:text-slate-400">Real-time specimen tracking, requisition queue, and verified test results.</p>
                  </div>
                  <Link
                    href="/nova/lab"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-[#6AB8FF] text-white hover:opacity-90 transition-opacity self-start"
                  >
                    <Microscope size={14} />
                    <span>Open Laboratory Station</span>
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#FCFDFF] dark:bg-slate-900 p-4 rounded-2xl border border-[#DAE3EE] dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#2C3137] dark:text-white">Invoice No. 20260516054925</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-600 text-[10px] font-bold">Unpaid Due: ETB 350.00</span>
                    </div>
                    <div className="text-xs text-[#7C7C7C]">
                      Patient: <strong className="text-[#2C3137] dark:text-white">Aminul Islam</strong> (MRN #01737916642)
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-xs text-slate-500">Panels: Complete Blood Count (CBC), Lipid</span>
                      <span className="px-3 py-1 rounded-full bg-[#6AB8FF] text-white text-[11px] font-bold">Update Status</span>
                    </div>
                  </div>

                  <div className="bg-[#FCFDFF] dark:bg-slate-900 p-4 rounded-2xl border border-[#DAE3EE] dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#2C3137] dark:text-white">Invoice No. 20260516054926</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 text-[10px] font-bold">Paid: ETB 1,450.00</span>
                    </div>
                    <div className="text-xs text-[#7C7C7C]">
                      Patient: <strong className="text-[#2C3137] dark:text-white">Abid Islam</strong> (MRN #01737916643)
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-xs text-slate-500">Panels: Ultrasound Abdomen, Liver Function</span>
                      <span className="px-3 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-bold">Results Ready</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB VIEW 4: APPOINTMENTS & QUEUE ── */}
            {activeTab === "appointments" && (
              <div className="relative z-10 p-5 sm:p-8 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-bold text-[#2C3137] dark:text-white">My Appointment Lists &amp; Token Queue</h3>
                    <p className="text-xs text-[#7C7C7C] dark:text-slate-400">Track digital OPD queues with automated urgency scoring flags.</p>
                  </div>
                  <Link
                    href="/nova/reception/queue"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-[#6AB8FF] text-white hover:opacity-90 transition-opacity self-start"
                  >
                    <Activity size={14} />
                    <span>View Live TV Queue</span>
                  </Link>
                </div>

                <div className="space-y-2.5">
                  <div className="bg-[#FCFDFF] dark:bg-slate-900 p-3.5 rounded-xl border border-[#DAE3EE] dark:border-slate-800 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 rounded-lg bg-[#6AB8FF]/15 text-[#6AB8FF] font-mono font-bold text-xs">Token #01</span>
                      <div>
                        <div className="text-xs font-bold text-[#2C3137] dark:text-white">Elderly patient with chest discomfort &amp; high BP history</div>
                        <div className="text-[10px] text-[#7C7C7C]">+251 911 234567 · Dr. Sardar Rashed (Room 201)</div>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold">Critical</span>
                  </div>

                  <div className="bg-[#FCFDFF] dark:bg-slate-900 p-3.5 rounded-xl border border-[#DAE3EE] dark:border-slate-800 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 rounded-lg bg-[#6AB8FF]/15 text-[#6AB8FF] font-mono font-bold text-xs">Token #02</span>
                      <div>
                        <div className="text-xs font-bold text-[#2C3137] dark:text-white">Child with high fever and dehydration symptoms</div>
                        <div className="text-[10px] text-[#7C7C7C]">+251 922 456789 · Dr. Sohel Rana (Room 202)</div>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">Urgent</span>
                  </div>

                  <div className="bg-[#FCFDFF] dark:bg-slate-900 p-3.5 rounded-xl border border-[#DAE3EE] dark:border-slate-800 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 rounded-lg bg-[#6AB8FF]/15 text-[#6AB8FF] font-mono font-bold text-xs">Token #03</span>
                      <div>
                        <div className="text-xs font-bold text-[#2C3137] dark:text-white">Diabetic patient reporting dizziness &amp; routine checkup</div>
                        <div className="text-[10px] text-[#7C7C7C]">+251 933 678901 · Dr. Amanullah (Room 204)</div>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">Monitoring</span>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Monitor Base Stand Mockup */}
          <div className="w-32 h-3.5 bg-slate-800 mx-auto rounded-b-lg border-x border-b border-slate-700 mt-1 shadow-md" />
          <div className="w-56 h-2 bg-slate-900 mx-auto rounded-full border border-slate-800 shadow-md" />
        </div>
      </section>

      {/* ── KEY FEATURES SECTION (DRIBBLE SPECIFICATIONS) ── */}
      <section id="modules" className="max-w-6xl mx-auto px-4 sm:px-8 py-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-block text-xs font-extrabold uppercase tracking-wider text-[#6AB8FF] bg-[#6AB8FF]/10 px-3 py-1 rounded-full mb-3">
            Core ERP Capabilities
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#2C3137] dark:text-white tracking-tight">
            Engineered for Modern Clinical Velocity
          </h2>
          <p className="text-sm text-[#7C7C7C] dark:text-slate-400 mt-2">
            Every clinical, diagnostic, and financial workflow in one unified system.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {MODULES.map((m) => (
            <div
              key={m.name}
              className="bg-[#FCFDFF] dark:bg-slate-900 rounded-3xl border border-[#DAE3EE] dark:border-slate-800 p-6 hover:border-[#6AB8FF] dark:hover:border-[#6AB8FF] transition-all shadow-xs group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-[#F0F4F8] dark:bg-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                  {m.icon}
                </div>
                <span className="text-[11px] font-bold text-[#7C7C7C] dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-full">
                  {m.badge}
                </span>
              </div>
              <h3 className="text-base font-bold text-[#2C3137] dark:text-white mb-2">{m.name}</h3>
              <p className="text-xs text-[#7C7C7C] dark:text-slate-400 leading-relaxed">{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CONNECTED CLINICAL WORKFLOW ARCHITECTURE ── */}
      <section id="workflow" className="relative bg-[#F0F4F8] dark:bg-[#0E131C] py-20 px-4 sm:px-8 border-y border-[#DAE3EE] dark:border-slate-800 overflow-hidden">
        {/* Subtle Ambient DNA Helix in Workflow Background */}
        <div className="absolute -bottom-16 -left-10 w-full sm:w-2/3 max-w-3xl h-[340px] pointer-events-none opacity-25 dark:opacity-20 -z-0 rotate-180 overflow-hidden">
          <div 
            className="w-full h-full bg-no-repeat bg-left-bottom bg-contain filter contrast-125 dark:mix-blend-screen mix-blend-multiply"
            style={{ backgroundImage: `url('/landing/dna_helix_pure.png')` }}
          />
        </div>
        <div className="relative z-10 max-w-6xl mx-auto space-y-12">
          
          <div className="text-center max-w-3xl mx-auto">
            <span className="inline-block text-xs font-bold uppercase tracking-wider text-[#6AB8FF] bg-[#6AB8FF]/10 px-3 py-1 rounded-full mb-3">
              Connected Healthcare Journey
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#2C3137] dark:text-white tracking-tight">
              End-to-End Hospital Workflow
            </h2>
            <p className="text-sm text-[#7C7C7C] dark:text-slate-400 mt-2">
              From arrival to pharmacy dispensing and CBHI claim reimbursement — coordinates every department in real time.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {WORKFLOW_STEPS.map((s) => (
              <div
                key={s.step}
                className="bg-[#FCFDFF] dark:bg-slate-900 rounded-2xl border border-[#DAE3EE] dark:border-slate-800 p-5 shadow-xs hover:border-[#CFA3F6] transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-extrabold text-[#6AB8FF] bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-full">
                      STEP {s.step}
                    </span>
                    <span className="text-[11px] font-semibold text-[#7C7C7C] dark:text-slate-400">
                      {s.badge}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-[#2C3137] dark:text-white mb-1">{s.title}</h3>
                  <div className="text-xs font-semibold text-[#CFA3F6] mb-2">{s.dept}</div>
                  <p className="text-xs text-[#7C7C7C] dark:text-slate-400 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Enterprise Pillars Grid */}
          <div className="pt-8 border-t border-[#DAE3EE] dark:border-slate-800">
            <div className="mb-6 text-center">
              <h3 className="text-2xl font-bold text-[#2C3137] dark:text-white">Built for Operational Resilience</h3>
              <p className="text-xs text-[#7C7C7C] dark:text-slate-400">Technical infrastructure designed to withstand power fluctuations and internet downtime.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {ENTERPRISE_PILLARS.map((p) => (
                <div key={p.title} className="bg-[#FCFDFF] dark:bg-slate-900 border border-[#DAE3EE] dark:border-slate-800 p-5 rounded-2xl space-y-2.5 shadow-2xs">
                  <div className="w-10 h-10 rounded-xl bg-[#F0F4F8] dark:bg-slate-800 flex items-center justify-center">
                    {p.icon}
                  </div>
                  <h4 className="text-sm font-bold text-[#2C3137] dark:text-white">{p.title}</h4>
                  <p className="text-xs text-[#7C7C7C] dark:text-slate-400 leading-relaxed">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ── WORKSTATION INTERACTIVE JUMP BAR ── */}
      <section id="stations" className="max-w-6xl mx-auto px-4 sm:px-8 py-16">
        <div className="bg-gradient-to-r from-[#1C222C] to-[#0E121A] rounded-3xl p-6 sm:p-10 text-white shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-block text-[11px] font-bold uppercase tracking-wider text-[#6AB8FF] bg-[#6AB8FF]/15 px-3 py-1 rounded-full mb-2">
                Live Interactive Workstations
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Test Real Hospital Interfaces</h3>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">Jump directly into any active clinical station to experience the real operational flow.</p>
            </div>
            <Link
              href="/nova/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold bg-white text-slate-900 hover:bg-slate-100 transition-colors whitespace-nowrap self-start sm:self-auto"
            >
              <span>Full Staff Sign In</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {DEMO_STATIONS.map((station) => (
              <Link
                key={station.name}
                href={station.path as any}
                className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 hover:border-[#6AB8FF] hover:bg-slate-800 text-left transition-all group"
              >
                <div className="font-bold text-white text-xs group-hover:text-[#6AB8FF] transition-colors truncate">
                  {station.name}
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">{station.desc}</div>
                <div className="mt-2 text-[10px] font-bold text-[#CFA3F6] flex items-center gap-1">
                  <span>{station.role}</span>
                  <ChevronRight size={10} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── CALL TO ACTION BANNER ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-8 pb-20">
        <div className="rounded-3xl bg-gradient-to-r from-[#6AB8FF] via-[#89B0FE] to-[#CFA3F6] p-8 sm:p-12 text-center text-white shadow-xl shadow-[#6AB8FF]/20 relative overflow-hidden">
          <div className="max-w-xl mx-auto space-y-4 relative z-10">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Ready to modernise your hospital?
            </h2>
            <p className="text-sm text-white/90 leading-relaxed">
              Nova HMS is built specifically for public and private facilities in Ethiopia. Predictable monthly pricing with zero USD fees, local hardware compatibility, and comprehensive staff onboarding.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href="/nova/signup"
                className="px-6 py-3 rounded-full bg-[#2C3137] text-white text-xs font-bold hover:bg-slate-900 transition-colors shadow-md"
              >
                Schedule On-Site Demo
              </Link>
              <Link
                href="/nova/pricing"
                className="px-6 py-3 rounded-full bg-white text-[#2C3137] text-xs font-bold hover:bg-slate-50 transition-colors shadow-md"
              >
                View Transparent Pricing
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-[#DAE3EE] dark:border-slate-800 py-8 px-4 sm:px-8 text-center text-xs text-[#7C7C7C] dark:text-slate-400">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-[#6AB8FF] to-[#CFA3F6] flex items-center justify-center text-white text-[10px] font-bold">
              N
            </div>
            <span>© 2026 Nova Technologies · Hospital Management System</span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/nova/patient" className="hover:text-[#6AB8FF] transition-colors">Patient Portal</Link>
            <Link href="/nova/about" className="hover:text-[#6AB8FF] transition-colors">About Us</Link>
            <Link href="/nova/pricing" className="hover:text-[#6AB8FF] transition-colors">Pricing</Link>
            <Link href="/nova/login" className="hover:text-[#6AB8FF] transition-colors">Staff Login</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
