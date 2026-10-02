import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="overflow-y-auto h-full bg-white">
      <nav className="flex items-center justify-between px-8 py-4 border-b border-slate-100">
        <Link href="/nova" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-teal-500 flex items-center justify-center font-bold text-white text-sm">N</div>
          <span className="font-semibold text-slate-900">Nova HMS</span>
        </Link>
        <Link href="/nova/signup" className="px-4 py-1.5 bg-teal-600 text-white text-sm rounded hover:bg-teal-700 transition-colors">Request Demo</Link>
      </nav>

      <div className="max-w-3xl mx-auto px-8 py-16">
        <h1 className="text-3xl font-bold text-slate-900 mb-4">About Nova HMS</h1>
        <p className="text-slate-600 text-base leading-relaxed mb-6">
          Nova HMS was built in response to a real challenge: Ethiopian hospitals — public referral centres, university hospitals, and private clinics alike — are managing complex workflows with paper, disconnected spreadsheets, and fragmented point solutions. The result is delayed care, lost records, and staff spending time on paperwork instead of patients.
        </p>
        <p className="text-slate-600 text-base leading-relaxed mb-6">
          We built Nova as a multi-tenant SaaS platform, meaning a single subscription connects every department in a hospital into one system. Receptionists issue queue tickets. Doctors see those patients in their queue, view the full EMR, and order labs digitally. Lab techs receive orders, post results, and the doctor sees them instantly. Pharmacists dispense against e-prescriptions. Finance officers bill against completed visits and submit CBHI claims. All in one place.
        </p>
        <p className="text-slate-600 text-base leading-relaxed mb-10">
          Nova is designed for the Ethiopian clinical context: Amharic as a first-class language, CBHI claim workflows, offline capability for areas with intermittent connectivity, and support for public-sector processes like fee waivers and government referral tiers.
        </p>

        <h2 className="text-xl font-semibold text-slate-800 mb-4">Contact us</h2>
        <div className="bg-slate-50 rounded-lg border border-slate-200 p-6 space-y-4">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Email</p>
            <p className="text-slate-700">hello@novahms.et</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Phone</p>
            <p className="text-slate-700">+251 116 123 456</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Address</p>
            <p className="text-slate-700">Bole, Addis Ababa, Ethiopia</p>
          </div>
          <form className="pt-2 space-y-3">
            <p className="text-sm font-medium text-slate-700">Send us a message</p>
            <input className="w-full px-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:border-teal-400" placeholder="Your name" />
            <input className="w-full px-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:border-teal-400" placeholder="Email address" />
            <textarea className="w-full px-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:border-teal-400 resize-none h-24" placeholder="Message" />
            <button className="px-5 py-2 bg-teal-600 text-white text-sm rounded hover:bg-teal-700 transition-colors font-medium">Send</button>
          </form>
        </div>
      </div>
    </div>
  );
}
