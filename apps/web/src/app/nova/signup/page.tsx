"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  return (
    <div className="min-h-[100dvh] bg-slate-50 flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-white p-1 border border-slate-200 flex items-center justify-center mx-auto mb-3 shadow-xs overflow-hidden">
            <img src="/images/ethiora-logo.jpg" alt="Ethiora Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Request a Demo</h1>
          <p className="text-sm text-slate-500 mt-1">We'll set up a workspace and walk you through Ethiora HMS</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">First name</label>
              <input className="w-full px-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:border-teal-400" placeholder="Abebe" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">Last name</label>
              <input className="w-full px-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:border-teal-400" placeholder="Kebede" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">Work email</label>
            <input className="w-full px-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:border-teal-400" placeholder="you@hospital.gov.et" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">Hospital name</label>
            <input className="w-full px-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:border-teal-400" placeholder="e.g. Ethiora Medical System" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">Region</label>
            <select className="w-full px-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:border-teal-400 bg-white">
              <option>Amhara</option>
              <option>Oromia</option>
              <option>Tigray</option>
              <option>SNNPR</option>
              <option>Sidama</option>
              <option>Addis Ababa</option>
              <option>Dire Dawa</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">Interested tier</label>
            <select className="w-full px-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:border-teal-400 bg-white">
              <option>Basic OPD</option>
              <option>Full Clinical</option>
              <option>Enterprise Multi-Facility</option>
            </select>
          </div>
          <button
            onClick={() => router.push("/nova/onboarding")}
            className="w-full py-2.5 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 transition-colors font-medium"
          >
            Submit request
          </button>
          <p className="text-center text-xs text-slate-400">
            Already have a workspace? <Link href="/nova/login" className="text-teal-600 hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
