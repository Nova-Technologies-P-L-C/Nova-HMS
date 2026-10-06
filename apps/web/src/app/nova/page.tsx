// Nova HMS — Hospital Information & Operations Management Platform
import Link from "next/link";
import {
  ArrowRight,
  Activity,
  Users,
  FlaskConical,
  Pill,
  ArrowLeftRight,
  BarChart3,
  Smartphone,
  CheckCircle2,
  WifiOff,
  CreditCard,
  ShieldCheck,
  Stethoscope,
  ChevronRight,
  Building2,
  HardDrive,
} from "lucide-react";

const MODULES = [
  { icon: <Activity size={22} />, name: "OPD Queue Management", desc: "Eliminate paper queues. Patients get numbered tickets, staff see live wait times, no chaos at reception." },
  { icon: <Users size={22} />, name: "Electronic Medical Records", desc: "Full patient history, vitals, diagnoses, prescriptions and lab results in one place — accessible by all authorised clinicians." },
  { icon: <FlaskConical size={22} />, name: "Lab & Results", desc: "Doctors order tests digitally. Lab techs enter results once. No paper forms, no lost results." },
  { icon: <Pill size={22} />, name: "Pharmacy & Inventory", desc: "Prescription queue, dispensing workflow, stock levels, and automated reorder point alerts." },
  { icon: <ArrowLeftRight size={22} />, name: "Referral Management", desc: "Track in- and out-referrals end to end. Confirm arrivals, log reasons, reduce patients lost in transit." },
  { icon: <BarChart3 size={22} />, name: "Analytics & Reporting", desc: "Bed occupancy, disease trends, revenue, and patient flow — all in dashboards built for facility managers." },
];

const PROBLEMS = [
  "Hours lost to paper OPD queues every morning",
  "Patient records scattered across departments",
  "Referral patients arriving with no advance notice",
  "Medication stockouts discovered too late",
  "Manual CBHI claim paperwork delaying reimbursement",
  "No visibility into bed availability across wards",
];

// End-to-end clinical workflow connecting hospital departments
const WORKFLOW_STEPS = [
  {
    step: "01",
    title: "Reception & Kiosk Intake",
    dept: "Patient Administration",
    desc: "Patients register or scan their QR code. System automatically validates Kebele CBHI membership and issues a prioritized digital queue ticket.",
    badge: "Paperless Intake",
  },
  {
    step: "02",
    title: "Triage & Vital Signs",
    dept: "Nursing Station",
    desc: "Nurse logs blood pressure, pulse, temperature, and calculates national triage category score (Red, Orange, Yellow, Green) for doctor routing.",
    badge: "Urgency Scoring",
  },
  {
    step: "03",
    title: "Doctor Consultation",
    dept: "Clinical Care",
    desc: "Doctor reviews longitudinal EMR, enters diagnosis, sends electronic lab orders, and writes digital prescriptions without paper slips.",
    badge: "Unified EMR",
  },
  {
    step: "04",
    title: "Laboratory Diagnostics (LIS)",
    dept: "Diagnostic Suite",
    desc: "Technicians receive digital test orders, process specimens, and verify results directly onto the patient's EMR for immediate doctor review.",
    badge: "Instant Results",
  },
  {
    step: "05",
    title: "FEFO Pharmacy Dispensing",
    dept: "Therapeutic Logistics",
    desc: "Pharmacists dispense prescriptions against electronic records with automated batch expiry tracking and reorder point (ROP) stock updates.",
    badge: "Zero Stockouts",
  },
  {
    step: "06",
    title: "Billing & CBHI Settlement",
    dept: "Revenue Cycle",
    desc: "System reconciles services rendered, calculates copayments or fee waivers, and generates approved CBHI claims ready for reimbursement.",
    badge: "Auto Reconciliation",
  },
];

// Core enterprise capabilities critical for hospital deployments
const ENTERPRISE_PILLARS = [
  {
    icon: <WifiOff size={20} className="text-teal-400" />,
    title: "Offline-First Edge Sync Resilience",
    desc: "Workstations continue recording vitals, prescriptions, and lab orders during network outages. Local data synchronizes automatically when connection resumes.",
  },
  {
    icon: <CreditCard size={20} className="text-emerald-400" />,
    title: "Native Ethiopian CBHI Engine",
    desc: "Eliminates months of paper claim paperwork with instant Kebele membership verification and standardized electronic reimbursement reporting.",
  },
  {
    icon: <ShieldCheck size={20} className="text-blue-400" />,
    title: "Role-Based Security & Audit Ledger",
    desc: "Strict clinical boundary enforcement. Doctor-only consultation privacy, nurse-only vitals logging, and forensic audit trails across all actions.",
  },
  {
    icon: <Smartphone size={20} className="text-violet-400" />,
    title: "Bilingual English & Amharic Support",
    desc: "Seamless language switching for healthcare staff and patient portal slips, ensuring complete accessibility in Ethiopian healthcare facilities.",
  },
];

// Direct demo station exploration
const DEMO_STATIONS = [
  { name: "Doctor Station", path: "/nova/doctor", desc: "EMR, Rx & Lab Orders", role: "Clinician" },
  { name: "Triage Intake", path: "/nova/triage", desc: "Vitals & Urgency Scoring", role: "Triage Nurse" },
  { name: "OPD Queue Board", path: "/nova/reception/queue", desc: "Live Wait Times", role: "Receptionist" },
  { name: "Central Pharmacy", path: "/nova/pharmacy", desc: "Inventory & ROP Alerts", role: "Pharmacist" },
  { name: "Diagnostic Lab", path: "/nova/lab", desc: "LIS & Result Entry", role: "Lab Technician" },
  { name: "Branch Operations", path: "/nova/branch-admin", desc: "Staffing & Tariff Control", role: "Hospital Admin" },
] as const;

export default function NovaLandingPage() {
  return (
    <div className="overflow-y-auto h-full bg-white text-slate-800">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-teal-500 flex items-center justify-center font-bold text-white text-sm">N</div>
          <span className="font-semibold text-slate-900 tracking-wide">Nova HMS</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-slate-600">
          <Link href="/nova/pricing" className="hover:text-teal-600 transition-colors">Pricing</Link>
          <Link href="/nova/about" className="hover:text-teal-600 transition-colors">About</Link>
          <Link href="/nova/patient" className="hover:text-teal-600 transition-colors">Patient portal</Link>
          <Link href="/nova/login" className="hover:text-teal-600 transition-colors">Log in</Link>
          <Link href="/nova/signup" className="px-4 py-1.5 bg-teal-600 text-white rounded hover:bg-teal-700 transition-colors font-medium">Request Demo</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-8 py-20 text-center">
        <div className="inline-block px-3 py-1 bg-teal-50 text-teal-700 text-xs font-medium rounded-full mb-4 border border-teal-200">
          Built for Ethiopian hospitals — public and private
        </div>
        <h1 className="text-4xl font-bold text-slate-900 leading-tight mb-4">
          One system for every role.<br />From reception to referral.
        </h1>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto mb-8">
          Nova HMS replaces fragmented paper workflows with a unified, role-based hospital management platform — designed for Ethiopian clinical contexts, offline-capable, and available in Amharic.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/nova/signup" className="flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium">
            Request a demo <ArrowRight size={16} />
          </Link>
          <Link href="/nova/hospital-admin" className="px-6 py-3 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium">
            Explore the app →
          </Link>
        </div>
      </section>

      {/* Patient portal banner */}
      <section className="max-w-5xl mx-auto px-8 pb-10">
        <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-2xl p-6 flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Smartphone size={24} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-white text-lg">Patient portal — now available</p>
              <p className="text-teal-100 text-sm">Patients can view their records, lab results, prescriptions, CBHI claims and referrals — in English or Amharic.</p>
            </div>
          </div>
          <Link href="/nova/patient" className="shrink-0 px-5 py-2.5 bg-white text-teal-700 font-medium rounded-lg hover:bg-teal-50 transition-colors text-sm whitespace-nowrap">
            Open portal →
          </Link>
        </div>
      </section>

      {/* Problem */}
      <section className="bg-slate-50 py-16 px-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-semibold text-slate-800 mb-2">Sound familiar?</h2>
          <p className="text-slate-500 mb-8">These are the daily realities in most Ethiopian hospitals today.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {PROBLEMS.map((p) => (
              <div key={p} className="flex items-start gap-3 bg-white rounded-lg border border-slate-200 p-4">
                <span className="text-red-400 mt-0.5 shrink-0">✗</span>
                <p className="text-sm text-slate-600">{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modules */}
      <section className="max-w-5xl mx-auto px-8 py-16">
        <h2 className="text-2xl font-semibold text-slate-800 mb-2">Everything in one platform</h2>
        <p className="text-slate-500 mb-8">Modular by design — start with OPD, add clinical modules as you grow.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {MODULES.map((m) => (
            <div key={m.name} className="bg-white rounded-lg border border-slate-200 p-5 hover:border-teal-300 transition-colors">
              <div className="text-teal-600 mb-3">{m.icon}</div>
              <h3 className="font-medium text-slate-800 mb-1">{m.name}</h3>
              <p className="text-sm text-slate-500">{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Replacement for Video Section: End-to-End Hospital Workflow & Enterprise Architecture ── */}
      <section className="bg-slate-900 py-16 px-8 text-slate-100">
        <div className="max-w-5xl mx-auto space-y-14">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto">
            <span className="inline-block text-xs font-semibold uppercase tracking-wider text-teal-400 bg-teal-950/80 border border-teal-800/60 px-3 py-1 rounded-full mb-3">
              Connected Clinical Architecture
            </span>
            <h2 className="text-3xl font-bold text-white mb-3">End-to-End Hospital Workflow</h2>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              From arrival to pharmacy dispensing and CBHI claim reimbursement — see how Nova HMS coordinates every department in real time without paper forms or lost results.
            </p>
          </div>

          {/* 6-Step Workflow Progression Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {WORKFLOW_STEPS.map((step) => (
              <div
                key={step.step}
                className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-5 flex flex-col justify-between hover:border-teal-500/60 hover:bg-slate-800 transition-all duration-200 group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-extrabold text-teal-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                      STEP {step.step}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400 group-hover:text-teal-300 transition-colors">
                      {step.badge}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-white mb-1">{step.title}</h3>
                  <div className="text-xs font-medium text-teal-400/80 mb-2">{step.dept}</div>
                  <p className="text-xs text-slate-400 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Enterprise Capabilities Strip */}
          <div className="pt-6 border-t border-slate-800">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-white">Built for Clinical Reliability</h3>
              <p className="text-xs text-slate-400">Technical infrastructure designed to withstand real-world operational challenges in Ethiopian healthcare facilities.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {ENTERPRISE_PILLARS.map((p) => (
                <div key={p.title} className="bg-slate-800/50 border border-slate-800 p-4 rounded-xl space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center border border-slate-700">
                    {p.icon}
                  </div>
                  <h4 className="text-sm font-semibold text-white">{p.title}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Departmental Workstation Direct Exploration Bar */}
          <div className="bg-gradient-to-r from-slate-800 via-slate-850 to-slate-800 rounded-2xl border border-slate-700 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-semibold text-white text-sm">Explore Workstation Interfaces</h4>
                <p className="text-xs text-slate-400">Jump directly into any active clinical station to test real departmental workflows.</p>
              </div>
              <Link
                href="/nova/login"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-300 hover:text-teal-200 transition-colors whitespace-nowrap"
              >
                <span>Full Staff Sign In</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {DEMO_STATIONS.map((station) => (
                <Link
                  key={station.name}
                  href={station.path as any}
                  className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-700/80 hover:border-teal-400/60 hover:bg-slate-900 text-left transition-all group"
                >
                  <div className="font-medium text-slate-200 text-xs group-hover:text-teal-300 transition-colors truncate">
                    {station.name}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">{station.desc}</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA strip */}
      <section className="bg-teal-600 py-14 px-8 text-center text-white">
        <h2 className="text-2xl font-bold mb-3">Ready to modernise your hospital?</h2>
        <p className="text-teal-100 mb-6 max-w-xl mx-auto">Nova HMS is a SaaS product — no servers to manage, no upfront licence cost. Pay per facility, per month.</p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/nova/pricing" className="px-5 py-2.5 bg-white text-teal-700 font-medium rounded-lg hover:bg-teal-50 transition-colors">See pricing</Link>
          <Link href="/nova/signup" className="px-5 py-2.5 border border-teal-400 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors">Request demo</Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-8 text-xs text-slate-400 border-t border-slate-100">
        © 2026 Nova HMS · Built for Ethiopian hospitals ·{" "}
        <Link href="/nova/patient" className="hover:text-teal-600">Patient portal</Link> ·{" "}
        <Link href="/nova/about" className="hover:text-teal-600">About</Link> ·{" "}
        <Link href="/nova/about" className="hover:text-teal-600">Contact</Link>
      </footer>
    </div>
  );
}
