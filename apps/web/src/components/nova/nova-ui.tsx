// Shared micro-components used across Nova HMS screens
import { type ReactNode } from "react";

// Status badge with semantic colors
const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  trial: "bg-blue-100 text-blue-700",
  suspended: "bg-red-100 text-red-700",
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  waiting: "bg-slate-100 text-slate-600",
  "being-seen": "bg-teal-100 text-teal-700",
  done: "bg-slate-200 text-slate-500",
  urgent: "bg-red-100 text-red-700",
  ok: "bg-emerald-100 text-emerald-700",
  low: "bg-amber-100 text-amber-700",
  critical: "bg-red-100 text-red-700",
  paid: "bg-emerald-100 text-emerald-700",
  submitted: "bg-blue-100 text-blue-700",
  "in-transit": "bg-amber-100 text-amber-700",
  arrived: "bg-emerald-100 text-emerald-700",
  occupied: "bg-orange-100 text-orange-700",
  available: "bg-emerald-100 text-emerald-700",
  maintenance: "bg-slate-100 text-slate-500",
  dispensed: "bg-emerald-100 text-emerald-700",
  "in-progress": "bg-teal-100 text-teal-700",
  completed: "bg-emerald-100 text-emerald-700",
  scheduled: "bg-blue-100 text-blue-700",
  "on-leave": "bg-slate-100 text-slate-500",
  "waiver-requested": "bg-purple-100 text-purple-700",
};

export function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status] ?? "bg-slate-100 text-slate-600";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${cls}`}>
      {status.replace(/-/g, " ")}
    </span>
  );
}

// KPI card
export function KpiCard({ label, value, sub, accent = false }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-lg border p-4 ${accent ? "bg-teal-600 text-white border-teal-600" : "bg-white border-slate-200"}`}>
      <p className={`text-xs uppercase tracking-wider mb-1 ${accent ? "text-teal-100" : "text-slate-500"}`}>{label}</p>
      <p className={`text-2xl font-bold ${accent ? "text-white" : "text-slate-800"}`}>{value}</p>
      {sub && <p className={`text-xs mt-0.5 ${accent ? "text-teal-100" : "text-slate-400"}`}>{sub}</p>}
    </div>
  );
}

// Page wrapper
export function PageShell({ title, subtitle, children, action }: { title: string; subtitle?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
        <div>
          <h1 className="text-lg font-semibold text-slate-800">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
        {children}
      </div>
    </div>
  );
}

// Simple data table
export function DataTable({ columns, rows }: { columns: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            {columns.map((col) => (
              <th key={col} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 text-slate-700 whitespace-nowrap">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Section card
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-lg border border-slate-200 ${className}`}>
      {children}
    </div>
  );
}

// Form input
export function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

export const inputCls = "w-full px-3 py-2 rounded border border-slate-200 text-sm text-slate-800 bg-white focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 placeholder:text-slate-400";
export const btnPrimary = "px-4 py-2 bg-teal-600 text-white text-sm rounded hover:bg-teal-700 transition-colors font-medium";
export const btnSecondary = "px-4 py-2 bg-white text-slate-700 text-sm rounded border border-slate-200 hover:bg-slate-50 transition-colors font-medium";
export const btnDanger = "px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors font-medium";
