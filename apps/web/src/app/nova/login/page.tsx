"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import {
  Stethoscope,
  HeartPulse,
  BedDouble,
  Users,
  CreditCard,
  FlaskConical,
  Pill,
  Share2,
  ShieldCheck,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Building2,
  Crown,
} from "lucide-react";

export interface DoctorSpecialty {
  id: string;
  name: string;
  email: string;
  deptName: string;
  label: string;
}

export const DOCTOR_SPECIALTIES: DoctorSpecialty[] = [
  {
    id: "general_opd",
    name: "Dr. Tigist",
    email: "tigist@dmrh.gov.et",
    deptName: "General OPD & Internal Medicine",
    label: "General OPD",
  },
  {
    id: "pediatrics",
    name: "Dr. Abebe",
    email: "abebe.girma@dmrh.gov.et",
    deptName: "Pediatrics & Child Health",
    label: "Pediatrics",
  },
  {
    id: "ob_gyn",
    name: "Dr. Bethlehem",
    email: "bethlehem@dmrh.gov.et",
    deptName: "OB/GYN & Maternal Health",
    label: "OB/GYN",
  },
  {
    id: "surgery",
    name: "Dr. Mulatu",
    email: "mulatu@dmrh.gov.et",
    deptName: "General Surgery & Minor OR",
    label: "Surgery",
  },
  {
    id: "dental",
    name: "Dr. Dawit",
    email: "dental@dmrh.gov.et",
    deptName: "Dental Clinic & Oral Surgery",
    label: "Dental",
  },
  {
    id: "ophthalmology",
    name: "Dr. Hana",
    email: "eye@dmrh.gov.et",
    deptName: "Ophthalmology / Eye Clinic",
    label: "Eye Clinic",
  },
];

interface QuickRole {
  id: string;
  title: string;
  email: string;
  icon: typeof Stethoscope;
  isDoctor?: boolean;
}

const ALL_ROLES: QuickRole[] = [
  { id: "doctor", title: "Doctor", email: "tigist@dmrh.gov.et", icon: Stethoscope, isDoctor: true },
  { id: "ward_nurse", title: "Ward Nurse", email: "mekdes@dmrh.gov.et", icon: BedDouble },
  { id: "triage_nurse", title: "Triage Nurse", email: "triage@dmrh.gov.et", icon: HeartPulse },
  { id: "reception", title: "Reception", email: "girma@dmrh.gov.et", icon: Users },
  { id: "cashier", title: "Cashier", email: "hiwot@dmrh.gov.et", icon: CreditCard },
  { id: "lab", title: "Laboratory", email: "bereket@dmrh.gov.et", icon: FlaskConical },
  { id: "pharmacy", title: "Pharmacy", email: "selam@dmrh.gov.et", icon: Pill },
  { id: "referral", title: "Referral", email: "solomon@dmrh.gov.et", icon: Share2 },
  { id: "branch_admin", title: "Branch Admin", email: "admin@dmrh.gov.et", icon: Building2 },
  { id: "owner", title: "Owner", email: "owner@dmrh.gov.et", icon: Crown },
];

const ROLE_DASHBOARDS: Record<string, string> = {
  "Organizational Admin": "/nova/org-admin",
  "Branch Admin": "/nova/branch-admin",
  "Hospital Admin": "/nova/branch-admin",
  "Triage Nurse": "/nova/triage",
  "Ward Nurse": "/nova/nurse",
  Doctor: "/nova/doctor",
  Nurse: "/nova/nurse",
  Receptionist: "/nova/reception/register",
  "Lab Technician": "/nova/lab",
  Pharmacist: "/nova/pharmacy",
  "Billing Officer": "/nova/billing",
  Accountant: "/nova/billing",
  "Referral Coordinator": "/nova/referral",
  "Ward Manager": "/nova/ward",
  "Nova Admin": "/nova/nova-admin",
};

export default function NovaLoginPage() {
  const [activeRoleId, setActiveRoleId] = useState<string>("doctor");
  const [activeSpecialty, setActiveSpecialty] = useState<DoctorSpecialty>(DOCTOR_SPECIALTIES[0]!);
  const [workspace, setWorkspace] = useState("dmrh");
  const [email, setEmail] = useState("tigist@dmrh.gov.et");
  const [password, setPassword] = useState("password123");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSelectRole = (role: QuickRole) => {
    setActiveRoleId(role.id);
    setError("");
    if (role.isDoctor) {
      setEmail(activeSpecialty.email);
    } else {
      setEmail(role.email);
    }
    setPassword("password123");
  };

  const handleSelectSpecialty = (spec: DoctorSpecialty) => {
    setActiveRoleId("doctor");
    setActiveSpecialty(spec);
    setEmail(spec.email);
    setPassword("password123");
    setError("");
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 1. Authenticate with Better-Auth
      const res = await authClient.signIn.email({ email, password });
      if (res.error) {
        setError(res.error.message ?? "Invalid email or password");
        setLoading(false);
        return;
      }

      // 2. Resolve tenant + user role via tRPC
      const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3000";
      const input = encodeURIComponent(JSON.stringify({ "0": { slug: workspace } }));
      const tenantRes = await fetch(`${serverUrl}/trpc/tenant.getBySlug?batch=1&input=${input}`, {
        credentials: "include",
      });
      const tenantJson = await tenantRes.json();
      const tenant = tenantJson?.[0]?.result?.data;

      if (!tenant) {
        setError("Hospital workspace not found. Please check hospital code.");
        setLoading(false);
        return;
      }
      if (!tenant.role) {
        setError("Account has no assigned role in this hospital.");
        setLoading(false);
        return;
      }

      const targetDept =
        activeRoleId === "doctor"
          ? activeSpecialty.deptName
          : (tenant as { department?: string }).department || "General OPD & Internal Medicine";

      // 3. Persist session keys
      sessionStorage.setItem("nova_tenant_id", tenant.id);
      sessionStorage.setItem("nova_tenant_slug", workspace);
      sessionStorage.setItem("nova_user_role", tenant.role);
      sessionStorage.setItem("nova_user_name", res.data?.user?.name ?? "");
      sessionStorage.setItem("nova_doctor_department", targetDept);

      localStorage.setItem("nova_tenant_id", tenant.id);
      localStorage.setItem("nova_tenant_slug", workspace);
      localStorage.setItem("nova_user_role", tenant.role);
      localStorage.setItem("nova_user_name", res.data?.user?.name ?? "");
      localStorage.setItem("nova_doctor_department", targetDept);

      // 4. Redirect to role dashboard
      const dashboard = ROLE_DASHBOARDS[tenant.role] ?? "/nova/branch-admin";
      window.location.href = dashboard;
    } catch {
      setError("Unable to connect. Please check network and try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full grid grid-cols-1 lg:grid-cols-12 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans">
      
      {/* ─── LEFT PANEL: FULL-HEIGHT HEALTHCARE HERO ─────────────────── */}
      <div className="hidden lg:flex lg:col-span-5 xl:col-span-5 bg-gradient-to-br from-teal-800 via-teal-900 to-slate-900 text-white p-8 xl:p-14 flex-col justify-between relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Brand */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-11 h-11 rounded-2xl bg-white p-1 flex items-center justify-center border border-white/30 shadow-md overflow-hidden shrink-0">
            <img src="/images/ethiora-logo.jpg" alt="Ethiora Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <span className="font-extrabold tracking-tight text-xl block leading-tight">Ethiora HMS</span>
            <span className="text-xs text-teal-200 font-medium tracking-wide">Ethiora Medical System</span>
          </div>
        </div>

        {/* Center Illustration & Message */}
        <div className="my-auto py-10 text-center relative z-10">
          <div className="max-w-[360px] xl:max-w-[420px] mx-auto mb-8 drop-shadow-2xl">
            <img
              src="/images/auth/login.svg"
              alt="Hospital Portal"
              className="w-full h-auto object-contain"
            />
          </div>
          <h2 className="text-2xl xl:text-3xl font-extrabold tracking-tight">
            Integrated Hospital Portal
          </h2>
          <p className="text-sm text-teal-100/80 mt-2 max-w-sm mx-auto leading-relaxed">
            Fast clinical consultations, inpatient wards, pharmacy, laboratory, and automated cashier billing.
          </p>
        </div>

        {/* Bottom Details */}
        <div className="relative z-10 pt-6 border-t border-white/20 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white font-bold text-xs shadow-sm">
            <Building2 size={14} className="text-teal-200" />
            <span>Ethiora Medical System</span>
          </div>
          <span className="font-mono text-xs text-teal-200 font-medium">v2.4</span>
        </div>
      </div>

      {/* ─── RIGHT PANEL: EXPANSIVE & INTUITIVE LOGIN WORKSPACE ────────── */}
      <div className="lg:col-span-7 xl:col-span-7 flex flex-col justify-center items-center p-4 sm:p-10 lg:p-14 xl:p-20 overflow-y-auto">
        <div className="w-full max-w-xl space-y-6">
          
          {/* Mobile Top Header (only on small screens) */}
          <div className="lg:hidden flex items-center gap-2.5 pb-2 border-b border-slate-200 dark:border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-white p-0.5 flex items-center justify-center shrink-0 shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <img src="/images/ethiora-logo.jpg" alt="Ethiora Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="font-bold text-base text-slate-900 dark:text-white block leading-tight">Ethiora Medical System</span>
              <span className="text-xs text-teal-600 dark:text-teal-400 font-semibold">Ethiora HMS Portal</span>
            </div>
          </div>

          {/* Heading with Prominent High-Contrast Hospital Badge */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-100 text-xs font-extrabold shadow-xs">
              <Building2 size={15} className="text-teal-600 dark:text-teal-400" />
              <span>Ethiora Medical System</span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Sign In
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Select your role or enter credentials to access your portal
            </p>
          </div>

          {/* ─── ROLE SELECTOR: EXPANSIVE & CLEAN ───────────────────── */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider block">
              Select Role
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ALL_ROLES.map((role) => {
                const Icon = role.icon;
                const isActive = activeRoleId === role.id;
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => handleSelectRole(role)}
                    className={`flex items-center gap-2.5 py-2.5 px-3 rounded-xl text-xs transition-all border text-left cursor-pointer ${
                      isActive
                        ? "bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-600/20 font-bold scale-[1.01]"
                        : "bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-teal-400"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400"
                      }`}
                    >
                      <Icon size={16} />
                    </div>
                    <span className="truncate font-medium">{role.title}</span>
                  </button>
                );
              })}
            </div>

            {/* Doctor Specialties Bar (visible when Doctor role is active) */}
            {activeRoleId === "doctor" && (
              <div className="pt-2 animate-in fade-in duration-200">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1.5 uppercase tracking-wide">
                  Clinical Department:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5">
                  {DOCTOR_SPECIALTIES.map((spec) => {
                    const isSpecActive = activeSpecialty.id === spec.id;
                    return (
                      <button
                        key={spec.id}
                        type="button"
                        onClick={() => handleSelectSpecialty(spec)}
                        className={`py-1.5 px-2 rounded-lg text-xs truncate text-center transition-all border cursor-pointer ${
                          isSpecActive
                            ? "bg-teal-700 text-white border-teal-700 font-bold shadow-xs"
                            : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-teal-400"
                        }`}
                      >
                        {spec.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-600 dark:text-red-300 font-medium">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4 pt-1">
            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">
                Email Address
              </label>
              <div className="relative">
                <Mail size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@dmrh.gov.et"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <Lock size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Hospital Code & Remember */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                />
                <span className="font-medium">Remember me</span>
              </label>

              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Building2 size={13} className="text-slate-400" />
                <span>Hospital Code:</span>
                <input
                  type="text"
                  value={workspace}
                  onChange={(e) => setWorkspace(e.target.value)}
                  className="w-16 px-1.5 py-0.5 text-xs font-mono font-semibold border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-center focus:outline-hidden focus:border-teal-500"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm tracking-wide shadow-lg shadow-teal-600/25 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing in…</span>
                </>
              ) : (
                <span>Sign In to Ethiora HMS</span>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="pt-2 text-center">
            <p className="text-xs text-slate-400">
              Demo password: <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">password123</span>
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
