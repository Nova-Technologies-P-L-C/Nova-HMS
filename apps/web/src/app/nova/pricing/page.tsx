import Link from "next/link";
import { CheckCircle, XCircle } from "lucide-react";

const TIERS = [
  {
    name: "Basic OPD",
    price: "ETB 2,500",
    period: "/month per facility",
    desc: "Perfect for small health centres and primary hospitals focused on outpatient care.",
    accent: false,
    features: [
      { label: "OPD queue management", included: true },
      { label: "Patient registration", included: true },
      { label: "Appointment scheduling", included: true },
      { label: "Basic billing & invoicing", included: true },
      { label: "CBHI claims", included: true },
      { label: "Electronic Medical Records", included: false },
      { label: "Lab & results module", included: false },
      { label: "Pharmacy & inventory", included: false },
      { label: "Referral management", included: false },
      { label: "Analytics & reporting", included: false },
      { label: "Ward / bed management", included: false },
      { label: "Multi-facility / multi-tenant", included: false },
    ],
  },
  {
    name: "Full Clinical",
    price: "ETB 7,500",
    period: "/month per facility",
    desc: "For general and referral hospitals that need end-to-end clinical workflows.",
    accent: true,
    features: [
      { label: "OPD queue management", included: true },
      { label: "Patient registration", included: true },
      { label: "Appointment scheduling", included: true },
      { label: "Basic billing & invoicing", included: true },
      { label: "CBHI claims", included: true },
      { label: "Electronic Medical Records", included: true },
      { label: "Lab & results module", included: true },
      { label: "Pharmacy & inventory", included: true },
      { label: "Referral management", included: true },
      { label: "Analytics & reporting", included: true },
      { label: "Ward / bed management", included: false },
      { label: "Multi-facility / multi-tenant", included: false },
    ],
  },
  {
    name: "Enterprise Multi-Facility",
    price: "Custom",
    period: "contact us",
    desc: "For hospital networks, university hospitals, and MoH programmes managing multiple facilities.",
    accent: false,
    features: [
      { label: "OPD queue management", included: true },
      { label: "Patient registration", included: true },
      { label: "Appointment scheduling", included: true },
      { label: "Basic billing & invoicing", included: true },
      { label: "CBHI claims", included: true },
      { label: "Electronic Medical Records", included: true },
      { label: "Lab & results module", included: true },
      { label: "Pharmacy & inventory", included: true },
      { label: "Referral management", included: true },
      { label: "Analytics & reporting", included: true },
      { label: "Ward / bed management", included: true },
      { label: "Multi-facility / multi-tenant", included: true },
    ],
  },
];

export default function PricingPage() {
  return (
    <div className="overflow-y-auto h-full bg-slate-50">
      <nav className="flex items-center justify-between px-8 py-4 border-b border-slate-100 bg-white">
        <Link href="/nova" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-teal-500 flex items-center justify-center font-bold text-white text-sm">N</div>
          <span className="font-semibold text-slate-900">Nova HMS</span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/nova/login" className="text-slate-600 hover:text-teal-600">Log in</Link>
          <Link href="/nova/signup" className="px-4 py-1.5 bg-teal-600 text-white rounded hover:bg-teal-700 transition-colors">Request Demo</Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-8 py-16">
        <h1 className="text-3xl font-bold text-slate-900 mb-2 text-center">Simple, transparent pricing</h1>
        <p className="text-slate-500 text-center mb-12">All plans include onboarding support, Amharic interface, and offline capability.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-xl border p-6 flex flex-col ${
                tier.accent
                  ? "bg-teal-600 border-teal-600 text-white shadow-lg"
                  : "bg-white border-slate-200 text-slate-800"
              }`}
            >
              {tier.accent && (
                <span className="self-start text-xs bg-white text-teal-600 font-semibold px-2 py-0.5 rounded-full mb-3">Most popular</span>
              )}
              <h2 className={`text-xl font-bold mb-1 ${tier.accent ? "text-white" : "text-slate-800"}`}>{tier.name}</h2>
              <p className={`text-sm mb-4 ${tier.accent ? "text-teal-100" : "text-slate-500"}`}>{tier.desc}</p>
              <div className="mb-6">
                <span className={`text-3xl font-bold ${tier.accent ? "text-white" : "text-slate-900"}`}>{tier.price}</span>
                <span className={`text-sm ml-1 ${tier.accent ? "text-teal-100" : "text-slate-400"}`}>{tier.period}</span>
              </div>
              <ul className="flex flex-col gap-2 flex-1">
                {tier.features.map((f) => (
                  <li key={f.label} className="flex items-center gap-2 text-sm">
                    {f.included
                      ? <CheckCircle size={14} className={tier.accent ? "text-teal-200" : "text-teal-500"} />
                      : <XCircle size={14} className={tier.accent ? "text-teal-400" : "text-slate-300"} />
                    }
                    <span className={f.included ? "" : tier.accent ? "text-teal-300" : "text-slate-400"}>{f.label}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/nova/signup"
                className={`mt-6 block text-center py-2.5 rounded-lg font-medium text-sm transition-colors ${
                  tier.accent
                    ? "bg-white text-teal-600 hover:bg-teal-50"
                    : "bg-teal-600 text-white hover:bg-teal-700"
                }`}
              >
                {tier.name === "Enterprise Multi-Facility" ? "Contact us" : "Get started"}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
