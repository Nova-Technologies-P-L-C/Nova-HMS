"use client";
// ─── GLOBAL PATIENT SEARCH PAGE ───────────────────────────────────────────────
// Role: All authenticated staff (Receptionist, Doctor, Nurse, Pharmacist, etc.)
// Purpose: Cross-department patient lookup. Staff can find any patient by name,
//          Health ID, or phone without navigating to the Reception module.
//
// ⚠ PRODUCTION WARNING — this page searches the PATIENTS mock array in memory.
//   Results are never from the real database. A real patient registered today
//   will not appear here. Wire to trpc.patient.search before go-live.
//
// TODO (HIGH): Replace PATIENTS.filter(...) with:
//   const { data } = useQuery(trpc.patient.search.queryOptions({ query }))
//   This will hit the real DB, search nameEn + nameAm + healthId + phone,
//   and return up to 20 results ordered by most recently registered.
//
// TODO (MEDIUM): EMR link should include visitId or patientId param so the
//   EMR page can load the correct visit context, not just the patient record.
// ──────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import { PATIENTS } from "@/lib/nova-mock-data"; // TODO: replace with trpc.patient.search
import { PageShell, Card } from "@/components/nova/nova-ui";
import Link from "next/link";
import { Search } from "lucide-react";

export default function GlobalSearchPage() {
  const [query, setQuery] = useState("");

  // TODO (HIGH): This searches mock data only — does NOT query the real database.
  // Replace with a tRPC query: trpc.patient.search.queryOptions({ query })
  // enabled: query.length > 1 — the API requires minimum 2 characters.
  const results = query.length > 1
    ? PATIENTS.filter((p) =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.healthId.toLowerCase().includes(query.toLowerCase()) ||
        p.phone.includes(query)
      )
    : [];

  return (
    <PageShell title="Global Patient Search" subtitle="Search by name, health ID, or phone number">
      <div className="max-w-2xl">
        <div className="relative mb-6">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          {/* Primary search input — most staff will type a phone number here */}
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 text-base rounded-xl border border-slate-200 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 bg-white shadow-sm"
            placeholder="Patient name, health ID, or phone…"
          />
        </div>

        {/* Empty-state: no match — offer registration as fallback */}
        {query.length > 1 && results.length === 0 && (
          <Card className="p-10 text-center text-slate-400">
            <p className="text-2xl mb-2">🔍</p>
            <p className="font-medium">No patients found</p>
            <p className="text-sm mt-1">Try a different name or health ID</p>
            <Link href="/nova/reception/register" className="inline-block mt-4 text-sm text-teal-600 hover:underline">Register new patient →</Link>
          </Card>
        )}

        {/* Search results — each card shows identity + quick actions */}
        {results.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-slate-400 mb-2">{results.length} result{results.length > 1 ? "s" : ""}</p>
            {results.map((p) => (
              <Card key={p.id} className="p-4 hover:border-teal-300 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Avatar: first initials of each name word */}
                    <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-700 font-bold text-sm flex items-center justify-center shrink-0">
                      {p.name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">{p.name}</p>
                      {/* Amharic name — important for CBHI and MOH reporting */}
                      <p className="text-sm text-teal-600">{p.nameAm}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{p.healthId} · DOB {p.dob} · {p.sex === "M" ? "Male" : "Female"} · {p.phone}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {/* CBHI badge — visible at a glance so staff know payment method */}
                    {p.cbhi && <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full border border-teal-200">CBHI</span>}
                    <span className="text-xs text-slate-400">{p.visits} visits</span>
                    {/* TODO: pass visitId param once tRPC search returns active visit context */}
                    <Link href="/nova/doctor/emr" className="text-xs px-3 py-1 bg-teal-600 text-white rounded hover:bg-teal-700 transition-colors">Open EMR</Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Default empty state before any search */}
        {query.length === 0 && (
          <div className="text-center text-slate-400 py-10">
            <Search size={32} className="mx-auto mb-3 text-slate-300" />
            <p className="font-medium">Search for any patient</p>
            <p className="text-sm mt-1">Works across all departments and visit history</p>
          </div>
        )}
      </div>
    </PageShell>
  );
}
