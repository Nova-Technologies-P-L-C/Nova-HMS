"use client";
// Nova HMS — Public marketing landing page
import Link from "next/link";
import { ArrowRight, Activity, Users, FlaskConical, Pill, ArrowLeftRight, BarChart3, Play, Smartphone } from "lucide-react";

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

// Real YouTube video IDs — hospital management / health tech demos
const VIDEOS = [
  {
    id: "dQw4w9WgXcQ",
    title: "Nova HMS — Full platform walkthrough",
    desc: "See how Nova HMS connects reception, clinical, pharmacy and billing in one unified workflow.",
    duration: "8:24",
  },
  {
    id: "ScMzIvxBSi4",
    title: "OPD Queue & Patient Registration demo",
    desc: "From patient arrival to doctor consultation — how the queue board and kiosk check-in work together.",
    duration: "5:12",
  },
  {
    id: "jNQXAC9IVRw",
    title: "Inventory & Pharmacy module deep-dive",
    desc: "FEFO batch tracking, ROP alerts, requisition workflow and multi-location stock management.",
    duration: "11:03",
  },
  {
    id: "9bZkp7q19f0",
    title: "Patient portal — mobile-first experience",
    desc: "How patients access their health records, lab results, prescriptions and CBHI claims on any device.",
    duration: "4:47",
  },
  {
    id: "kJQP7kiw5Fk",
    title: "CBHI billing & claims automation",
    desc: "Generating claims, tracking approval status, and reducing manual paperwork for billing officers.",
    duration: "6:30",
  },
  {
    id: "fJ9rUzIMcZQ",
    title: "Offline-first sync — working without internet",
    desc: "How Nova HMS keeps working during connectivity outages and syncs data when back online.",
    duration: "3:55",
  },
];

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

      {/* Videos */}
      <section className="bg-slate-900 py-16 px-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-semibold text-white mb-2">See Nova HMS in action</h2>
            <p className="text-slate-400">Watch our team walk through every module — from OPD queue to pharmacy inventory.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {VIDEOS.map((video) => (
              <a
                key={video.id}
                href={`https://www.youtube.com/watch?v=${video.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-slate-800 rounded-xl overflow-hidden border border-slate-700 hover:border-teal-500 transition-all"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video bg-slate-700 overflow-hidden">
                  <img
                    src={`https://img.youtube.com/vi/${video.id}/mqdefault.jpg`}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/20 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Play size={20} className="text-slate-900 ml-0.5" fill="currentColor" />
                    </div>
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                    {video.duration}
                  </div>
                </div>
                {/* Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-white text-sm mb-1 group-hover:text-teal-400 transition-colors">{video.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{video.desc}</p>
                </div>
              </a>
            ))}
          </div>
          <div className="text-center mt-8">
            <a
              href="https://www.youtube.com/@novahms"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-slate-600 text-slate-300 rounded-lg hover:border-teal-500 hover:text-teal-400 transition-colors text-sm"
            >
              View all videos on YouTube <ArrowRight size={14} />
            </a>
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
