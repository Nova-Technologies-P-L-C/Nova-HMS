// Shared — Empty States, 404, and Offline Banner (page 49)
import Link from "next/link";
import { WifiOff, FileX, Search, Inbox, AlertTriangle } from "lucide-react";
import { PageShell, Card } from "@/components/nova/nova-ui";

function EmptyState({ icon, title, desc, action }: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  action?: { label: string; href: string };
}) {
  return (
    <Card className="p-10 text-center flex flex-col items-center">
      <div className="text-slate-300 mb-4">{icon}</div>
      <p className="font-semibold text-slate-700 text-base mb-1">{title}</p>
      <p className="text-sm text-slate-400 max-w-xs">{desc}</p>
      {action && (
        <Link href={action.href as any} className="mt-4 px-4 py-2 bg-teal-600 text-white text-sm rounded hover:bg-teal-700 transition-colors font-medium">
          {action.label}
        </Link>
      )}
    </Card>
  );
}

export default function EmptyStatesPage() {
  return (
    <PageShell title="Empty States & Error Screens" subtitle="Reusable UI patterns for edge cases">
      <div className="space-y-6">
        {/* Offline banner */}
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Offline banner</p>
          <div className="flex items-center justify-between gap-2 bg-amber-500 text-white px-4 py-3 rounded-lg text-sm">
            <span className="flex items-center gap-2">
              <WifiOff size={15} />
              You're offline — some features are limited. Changes will sync when reconnected.
            </span>
            <button className="text-white/80 hover:text-white text-xs underline shrink-0">Dismiss</button>
          </div>
        </div>

        {/* Empty states grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <EmptyState
            icon={<Inbox size={40} />}
            title="No results yet"
            desc="Nothing here — this list will populate once data is added."
          />
          <EmptyState
            icon={<Search size={40} />}
            title="No patients found"
            desc="No patients matched your search. Try a different name or health ID."
            action={{ label: "Register new patient", href: "/nova/reception/register" }}
          />
          <EmptyState
            icon={<FileX size={40} />}
            title="No records on file"
            desc="This patient has no lab results yet. Results will appear here once tests are ordered and completed."
          />
          <EmptyState
            icon={<AlertTriangle size={40} />}
            title="No alerts"
            desc="All stock levels are above reorder thresholds. You're good."
          />
        </div>

        {/* 404 */}
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">404 / Not found</p>
          <Card className="p-12 text-center">
            <p className="text-6xl font-black text-slate-200 mb-4">404</p>
            <p className="font-semibold text-slate-700 text-lg mb-1">Page not found</p>
            <p className="text-sm text-slate-400 mb-6">The page you're looking for doesn't exist or you don't have access.</p>
            <Link href="/nova/hospital-admin" className="px-5 py-2.5 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 transition-colors font-medium">
              Back to dashboard
            </Link>
          </Card>
        </div>

        {/* Offline full screen */}
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Full offline screen</p>
          <Card className="p-12 text-center">
            <WifiOff size={48} className="text-amber-400 mx-auto mb-4" />
            <p className="font-semibold text-slate-700 text-lg mb-1">No connection</p>
            <p className="text-sm text-slate-400 mb-2">You're currently offline. Nova HMS is saving your work locally.</p>
            <p className="text-sm text-slate-400 mb-6">OPD queue, vitals entry, and nursing notes work without a connection. Billing and lab results require connectivity.</p>
            <div className="flex gap-2 justify-center">
              <button className="px-5 py-2 border border-slate-200 text-slate-600 text-sm rounded hover:bg-slate-50 transition-colors">Retry connection</button>
              <button className="px-5 py-2 bg-teal-600 text-white text-sm rounded hover:bg-teal-700 transition-colors">Continue offline</button>
            </div>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
