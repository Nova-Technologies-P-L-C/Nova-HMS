"use client";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

const ROLE_DASHBOARDS: Record<string, string> = {
  "Hospital Admin": "/nova/hospital-admin",
  Doctor: "/nova/doctor",
  Nurse: "/nova/nurse",
  Receptionist: "/nova/reception/queue",
  "Lab Technician": "/nova/lab",
  Pharmacist: "/nova/pharmacy",
  "Billing Officer": "/nova/billing",
  "Referral Coordinator": "/nova/referral",
  "Ward Manager": "/nova/ward",
  "Nova Admin": "/nova/nova-admin",
};

const DEMO_ACCOUNTS: [string, string][] = [
  ["admin@dmrh.gov.et", "Hospital Admin"],
  ["tigist@dmrh.gov.et", "Doctor"],
  ["girma@dmrh.gov.et", "Receptionist"],
  ["mekdes@dmrh.gov.et", "Nurse"],
  ["bereket@dmrh.gov.et", "Lab Tech"],
  ["selam@dmrh.gov.et", "Pharmacist"],
  ["hiwot@dmrh.gov.et", "Billing"],
  ["solomon@dmrh.gov.et", "Referral"],
];

export default function NovaLoginPage() {
  const [workspace, setWorkspace] = useState("dmrh");
  const [email, setEmail] = useState("admin@dmrh.gov.et");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {    setError("");
    setLoading(true);
    try {
      // 1. Authenticate
      const res = await authClient.signIn.email({ email, password });
      if (res.error) {
        setError(res.error.message ?? "Login failed");
        setLoading(false);
        return;
      }

      // 2. Resolve tenant + role using correct tRPC batch format
      const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3000";
      const input = encodeURIComponent(JSON.stringify({ "0": { slug: workspace } }));
      const tenantRes = await fetch(`${serverUrl}/trpc/tenant.getBySlug?batch=1&input=${input}`, {
        credentials: "include",
      });
      const tenantJson = await tenantRes.json();
      const tenant = tenantJson?.[0]?.result?.data;

      if (!tenant) {
        setError("Workspace not found. Check the slug (e.g. 'dmrh').");
        setLoading(false);
        return;
      }
      if (!tenant.role) {
        setError("You don't have a role in this workspace.");
        setLoading(false);
        return;
      }

      // 3. Persist for tRPC x-tenant-id header + UI
      localStorage.setItem("nova_tenant_id", tenant.id);
      localStorage.setItem("nova_tenant_slug", workspace);
      localStorage.setItem("nova_user_role", tenant.role);
      localStorage.setItem("nova_user_name", res.data?.user?.name ?? "");

      // Hard redirect so context re-initializes with new user data
      const dashboard = ROLE_DASHBOARDS[tenant.role] ?? "/nova/hospital-admin";
      window.location.href = dashboard;
    } catch {
      setError("Connection error. Is the server running on :3000?");
      setLoading(false);
    }
  };

  const cls = "w-full px-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:border-teal-400";

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-10 h-10 rounded-lg bg-teal-500 flex items-center justify-center font-bold text-white text-lg mx-auto mb-3">
            N
          </div>
          <h1 className="text-xl font-bold text-slate-900">Sign in to Nova HMS</h1>
          <p className="text-sm text-slate-500 mt-1">Enter your hospital workspace credentials</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">
              Hospital workspace
            </label>
            <input className={cls} placeholder="dmrh" value={workspace} onChange={(e) => setWorkspace(e.target.value)} />
            <p className="text-xs text-slate-400 mt-1">e.g. dmrh → debremarkos.novahms.et</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">Email</label>
            <input className={cls} value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">Password</label>
            <input
              type="password"
              className={cls}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-2.5 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 transition-colors font-medium disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <div className="border-t border-slate-100 pt-3">
            <p className="text-xs text-slate-400 font-medium mb-2">Demo accounts (password: password123)</p>
            <div className="grid grid-cols-2 gap-1">
              {DEMO_ACCOUNTS.map(([e, label]) => (
                <button
                  key={e}
                  onClick={() => setEmail(e)}
                  className={`text-left text-xs px-2 py-1 rounded border transition-colors ${
                    email === e
                      ? "border-teal-400 bg-teal-50 text-teal-700"
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
