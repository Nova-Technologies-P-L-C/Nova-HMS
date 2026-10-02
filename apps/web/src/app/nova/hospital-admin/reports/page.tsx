"use client";
// ─── REPORTS & ANALYTICS PAGE ─────────────────────────────────────────────────
// Role: Hospital Admin
// Purpose: Executive summary of hospital performance metrics — patient volume,
//          financial revenue, disease burden, and bed occupancy. Used for
//          management reporting and MOH/Regional Health Bureau submissions.
//
// ⚠ PRODUCTION WARNING — ALL numbers on this page are hardcoded mock data.
//   KPIs ("312 patients", "ETB 73,000"), bar chart values, and disease trends
//   are static demo figures. No real database queries are made.
//
// TODO (HIGH): Each KPI must be replaced with a real tRPC query:
//   - Patients seen:   trpc.visit.queue (count by date range)
//   - Avg wait time:   average of OPDTicket.waitMinutes
//   - Bed occupancy:   trpc.ward.beds (count occupied / total)
//   - Revenue:         trpc.billing.receipts (sum amounts by date range)
//   - Disease trends:  aggregate Diagnosis.icdCode counts grouped by description
//   - Monthly revenue: trpc.billing.receipts grouped by month
//
// TODO (MEDIUM): Add date range filter that actually queries the backend with
//   the selected range. Currently the range selector changes state but has
//   no effect on the displayed data.
//
// TODO (LOW): Export to PDF/Excel for MOH HMIS reporting requirements.
// ──────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import { BEDS, OPD_QUEUE, BILLING_INVOICES } from "@/lib/nova-mock-data"; // TODO: replace with tRPC
import { PageShell, KpiCard, Card } from "@/components/nova/nova-ui";

// Simple bar chart using CSS
function BarChart({ data, label }: { data: { name: string; value: number; max: number }[]; label: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">{label}</p>
      <div className="space-y-2">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-3">
            <span className="text-xs text-slate-600 w-32 shrink-0 truncate">{d.name}</span>
            <div className="flex-1 bg-slate-100 rounded-full h-2">
              <div
                className="bg-teal-500 h-2 rounded-full transition-all"
                style={{ width: `${Math.round((d.value / d.max) * 100)}%` }}
              />
            </div>
            <span className="text-xs font-medium text-slate-700 w-8 text-right">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const DISEASE_TRENDS = [
  { name: "Upper Resp. Infection", value: 42, max: 60 },
  { name: "Malaria", value: 28, max: 60 },
  { name: "Type 2 Diabetes", value: 19, max: 60 },
  { name: "Hypertension", value: 35, max: 60 },
  { name: "Diarrhoeal Disease", value: 14, max: 60 },
  { name: "Pneumonia", value: 11, max: 60 },
];

const MONTHLY_REVENUE = [
  { name: "Apr", value: 38000, max: 80000 },
  { name: "May", value: 52000, max: 80000 },
  { name: "Jun", value: 47000, max: 80000 },
  { name: "Jul", value: 61000, max: 80000 },
  { name: "Aug", value: 73000, max: 80000 },
  { name: "Sep (to date)", value: 22000, max: 80000 },
];

export default function ReportsPage() {
  const [range, setRange] = useState("This month");
  // TODO (HIGH): Replace with trpc.ward.beds query — currently using mock BEDS array
  const occupied = BEDS.filter((b) => b.status === "occupied").length;
  const totalBeds = BEDS.length;

  return (
    <PageShell
      title="Reports & Analytics"
      subtitle="Debre Markos Referral Hospital"
      action={
        <select value={range} onChange={(e) => setRange(e.target.value)} className="px-3 py-1.5 text-sm border border-slate-200 rounded bg-white focus:outline-none focus:border-teal-400">
          {["Today", "This week", "This month", "Last 3 months"].map((r) => <option key={r}>{r}</option>)}
        </select>
      }
    >
      {/* KPI summary row — all values are currently hardcoded demo numbers */}
      {/* TODO (HIGH): each value must come from a real tRPC query — see file header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Patients seen" value="312" sub="Sep 2026" />
        <KpiCard label="Avg wait time" value="24 min" sub="OPD" />
        {/* Bed occupancy — partial real data from BEDS mock, rest hardcoded */}
        <KpiCard label="Bed occupancy" value={`${Math.round((occupied / totalBeds) * 100)}%`} accent />
        <KpiCard label="Revenue" value="ETB 73,000" sub="Aug 2026" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-5">
          <BarChart data={MONTHLY_REVENUE} label="Monthly Revenue (ETB)" />
        </Card>
        <Card className="p-5">
          <BarChart data={DISEASE_TRENDS} label="Disease Trends — Sep 2026" />
        </Card>

        {/* Patient flow */}
        <Card className="p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Patient flow — today</p>
          <div className="flex items-end gap-2 h-24">
            {[12, 28, 45, 38, 52, 41, 29, 18].map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-teal-100 rounded-t" style={{ height: `${(v / 52) * 80}px` }}>
                  <div className="w-full h-full bg-teal-500 rounded-t opacity-70" />
                </div>
                <span className="text-[10px] text-slate-400">{7 + i}h</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Bed occupancy breakdown */}
        <Card className="p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Bed occupancy by ward</p>
          <BarChart
            data={[
              { name: "Ward A", value: 2, max: 4 },
              { name: "Ward B", value: 1, max: 4 },
              { name: "Maternity", value: 1, max: 3 },
              { name: "Paediatrics", value: 3, max: 6 },
              { name: "Surgery", value: 2, max: 4 },
            ]}
            label="Occupied / available"
          />
        </Card>
      </div>
    </PageShell>
  );
}
