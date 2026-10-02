"use client";

// =============================================================================
// Nova HMS — Staff Login Page
// =============================================================================
//
// This page authenticates hospital staff into Nova HMS.
// It is the entry point for all clinical roles:
//   Hospital Admin, Doctor, Nurse, Receptionist, Lab Technician,
//   Pharmacist, Billing Officer, Referral Coordinator, Ward Manager, Nova Admin
//
// Login flow (3 steps):
//   1. Better Auth email + password → establishes an HTTP-only session cookie
//   2. tRPC tenant.getBySlug        → resolves the hospital (tenant) from the workspace slug
//                                     and returns the user's role in that hospital
//   3. localStorage persistence     → stores tenantId, slug, role, and user name
//      Hard redirect                → navigates to the role-specific dashboard
//
// Workspace concept:
//   Each hospital has a short slug (e.g. "dmrh" for Debre Markos Referral Hospital).
//   Staff enter this slug + their email + password to log in.
//   One user account can work at multiple hospitals using different slugs.
//   This mirrors how tools like Slack or Notion handle multi-workspace access.
//
// Role-based redirect after login:
//   Each role lands on its own dashboard page to keep the first screen
//   immediately relevant to that staff member's workflow:
//     Hospital Admin  → /nova/hospital-admin
//     Doctor          → /nova/doctor  (today's patient queue)
//     Receptionist    → /nova/reception/queue  (OPD queue board)
//     Pharmacist      → /nova/pharmacy  (prescription dispense queue)
//     etc.
//
// Demo accounts (password: "password123" for all):
//   Pre-populated quick-select buttons help evaluators and new staff explore
//   all roles without memorising multiple credentials.
//   PRODUCTION: Remove demo accounts and disable quick-select in production.
//
// localStorage keys written on successful login:
//   nova_tenant_id    — Tenant UUID (sent as x-tenant-id header on every tRPC call)
//   nova_tenant_slug  — Workspace slug (for display in sidebar / topbar)
//   nova_user_role    — Role string (drives sidebar navigation + UI permissions)
//   nova_user_name    — User display name (shown in topbar avatar)
//
// Error handling:
//   - Wrong credentials  → Better Auth returns an error object (shown as red banner)
//   - Wrong workspace    → tRPC returns null tenant (shown as red banner)
//   - No role in tenant  → User exists but isn't assigned to this hospital
//   - Network failure    → Connection error (server may not be running on :3000)
// =============================================================================

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

// Maps a role string to the correct dashboard URL after login.
// Keeps each role's first screen immediately useful to their workflow.
const ROLE_DASHBOARDS: Record<string, string> = {
  "Hospital Admin":       "/nova/hospital-admin",
  Doctor:                 "/nova/doctor",
  Nurse:                  "/nova/nurse",
  Receptionist:           "/nova/reception/queue",  // OPD queue board is the primary Receptionist screen
  "Lab Technician":       "/nova/lab",
  Pharmacist:             "/nova/pharmacy",
  "Billing Officer":      "/nova/billing",
  "Referral Coordinator": "/nova/referral",
  "Ward Manager":         "/nova/ward",
  "Nova Admin":           "/nova/nova-admin",
};

// Demo accounts for evaluation — [email, short role label]
// All use the same password: "password123"
// PRODUCTION BLOCKER (P11): Remove this array AND the quick-select UI before go-live.
// Also change the default useState values below so the login form starts empty.
// Pre-filled credentials in a production login form are a security and professionalism problem.
// Gate with: if (process.env.NODE_ENV !== "production") to keep it for development only.
const DEMO_ACCOUNTS: [string, string][] = [
  ["admin@dmrh.gov.et",   "Hospital Admin"],
  ["tigist@dmrh.gov.et",  "Doctor"],
  ["girma@dmrh.gov.et",   "Receptionist"],
  ["mekdes@dmrh.gov.et",  "Nurse"],
  ["bereket@dmrh.gov.et", "Lab Tech"],
  ["selam@dmrh.gov.et",   "Pharmacist"],
  ["hiwot@dmrh.gov.et",   "Billing"],
  ["solomon@dmrh.gov.et", "Referral"],
];

export default function NovaLoginPage() {
  // TODO (P11 — PRODUCTION): Change all pre-filled defaults to empty strings ("").
  // Pre-filled credentials in a live hospital login screen expose admin credentials.
  const [workspace, setWorkspace] = useState("dmrh");             // ← change to ""
  const [email, setEmail]         = useState("admin@dmrh.gov.et"); // ← change to ""
  const [password, setPassword]   = useState("password123");       // ← change to ""
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(false);

  const handleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      // ── Step 1: Authenticate with Better Auth ─────────────────────────────
      // Sends a POST to /api/auth/sign-in/email on the Express server.
      // On success, the server sets an HTTP-only session cookie in the browser.
      // This cookie is automatically sent with all subsequent API requests.
      const res = await authClient.signIn.email({ email, password });
      if (res.error) {
        // Authentication failed — wrong credentials or account not found
        setError(res.error.message ?? "Login failed");
        setLoading(false);
        return;
      }

      // ── Step 2: Resolve tenant + role ─────────────────────────────────────
      // Calls the tRPC tenant.getBySlug endpoint to:
      //   a) Verify the workspace slug exists (valid hospital)
      //   b) Retrieve the user's role in that hospital
      //
      // Uses tRPC batch format: batch=1&input={"0":{...}}
      // encodeURIComponent is required for the JSON input query parameter.
      const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3000";
      const input = encodeURIComponent(JSON.stringify({ "0": { slug: workspace } }));
      const tenantRes = await fetch(
        `${serverUrl}/trpc/tenant.getBySlug?batch=1&input=${input}`,
        { credentials: "include" }, // Must include credentials so the session cookie is sent
      );
      const tenantJson = await tenantRes.json();
      // tRPC batch responses are arrays: index 0 = first batched call
      const tenant = tenantJson?.[0]?.result?.data;

      if (!tenant) {
        // Workspace slug not found — user typed the wrong hospital code
        setError("Workspace not found. Check the slug (e.g. 'dmrh').");
        setLoading(false);
        return;
      }
      if (!tenant.role) {
        // User's account exists but has not been assigned a role in this hospital.
        // Hospital Admin must add the user via Staff & Roles management first.
        setError("You don't have a role in this workspace.");
        setLoading(false);
        return;
      }

      // ── Step 3: Persist session metadata + redirect ────────────────────────
      // These localStorage values are consumed by:
      //   - NovaRoleProvider   → populates context (role, hospitalName, userName)
      //   - NovaAppShell       → auth guard reads nova_tenant_id to allow access
      //   - tRPC client        → injects nova_tenant_id as x-tenant-id header
      localStorage.setItem("nova_tenant_id",   tenant.id);
      localStorage.setItem("nova_tenant_slug", workspace);
      localStorage.setItem("nova_user_role",   tenant.role);
      localStorage.setItem("nova_user_name",   res.data?.user?.name ?? "");

      // Use window.location.href (hard redirect) instead of router.push() so that:
      //   a) The NovaRoleProvider useEffect re-reads localStorage cleanly
      //   b) All tRPC client instances reinitialise with the new tenant header
      //   c) Any stale React state from a previous session is fully cleared
      const dashboard = ROLE_DASHBOARDS[tenant.role] ?? "/nova/hospital-admin";
      window.location.href = dashboard;

    } catch {
      // Network-level failure — server not reachable or crashed
      setError("Connection error. Is the server running on :3000?");
      setLoading(false);
    }
  };

  // Reusable Tailwind class for all text inputs
  const cls = "w-full px-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:border-teal-400";

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* ── Brand Header ────────────────────────────────────────────────── */}
        <div className="text-center mb-8">
          {/* Logo mark — teal square with "N" initial */}
          <div className="w-10 h-10 rounded-lg bg-teal-500 flex items-center justify-center font-bold text-white text-lg mx-auto mb-3">
            N
          </div>
          <h1 className="text-xl font-bold text-slate-900">Sign in to Nova HMS</h1>
          <p className="text-sm text-slate-500 mt-1">Enter your hospital workspace credentials</p>
        </div>

        {/* ── Login Form Card ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">

          {/* Workspace slug — identifies which hospital the user is logging into */}
          <div>
            <label className="block text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">
              Hospital workspace
            </label>
            <input
              className={cls}
              placeholder="dmrh"
              value={workspace}
              onChange={(e) => setWorkspace(e.target.value)}
            />
            {/* Hint showing how the slug maps to the full hospital URL */}
            <p className="text-xs text-slate-400 mt-1">e.g. dmrh → debremarkos.novahms.et</p>
          </div>

          {/* Staff email address */}
          <div>
            <label className="block text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">
              Email
            </label>
            <input
              className={cls}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Password — Enter key triggers login for keyboard-first workflows */}
          <div>
            <label className="block text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">
              Password
            </label>
            <input
              type="password"
              className={cls}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()} // Submit on Enter key
            />
          </div>

          {/* ── Error Banner ─────────────────────────────────────────────────
              Only rendered when an error string is set.
              Covers auth failures, workspace not found, no role assigned,
              and network/server connection errors. */}
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}

          {/* ── Submit Button ─────────────────────────────────────────────── */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-2.5 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 transition-colors font-medium disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>

          {/* ── Demo Account Quick-Select ─────────────────────────────────────
              Allows evaluators to switch between roles with one click.
              Clicking a button fills the email field; password remains "password123".
              The active demo account is highlighted with a teal border.
              PRODUCTION: Remove this entire section before go-live. */}
          <div className="border-t border-slate-100 pt-3">
            <p className="text-xs text-slate-400 font-medium mb-2">
              Demo accounts (password: password123)
            </p>
            <div className="grid grid-cols-2 gap-1">
              {DEMO_ACCOUNTS.map(([e, label]) => (
                <button
                  key={e}
                  onClick={() => setEmail(e)} // Only updates email — password stays "password123"
                  className={`text-left text-xs px-2 py-1 rounded border transition-colors ${
                    email === e
                      ? "border-teal-400 bg-teal-50 text-teal-700"      // Active demo account
                      : "border-slate-200 text-slate-500 hover:border-teal-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
