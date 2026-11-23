"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import {
  Stethoscope,
  Activity,
  HeartPulse,
  Users,
  CreditCard,
  ShieldCheck,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Building2,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

interface RoleOption {
  id: string;
  code: string;
  title: string;
  description: string;
  demoEmail: string;
  gradient: string;
  icon: any;
  hasSpecialties?: boolean;
}

export interface DoctorSpecialty {
  id: string;
  name: string;
  email: string;
  deptName: string;
  code: string;
  room: string;
  badgeColor: string;
  gradient: string;
  description: string;
}

export const DOCTOR_SPECIALTIES: DoctorSpecialty[] = [
  {
    id: "general_opd",
    name: "Dr. Tigist Alemu",
    email: "tigist@dmrh.gov.et",
    deptName: "General OPD & Internal Medicine",
    code: "OPD",
    room: "Room 102/104 — General OPD",
    badgeColor: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800",
    gradient: "from-teal-500 to-cyan-500",
    description: "General consultations, chronic disease & adult medicine",
  },
  {
    id: "pediatrics",
    name: "Dr. Abebe Girma",
    email: "abebe.girma@dmrh.gov.et",
    deptName: "Pediatrics & Child Health",
    code: "PED",
    room: "Room 205 — Pediatrics Suite",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
    gradient: "from-emerald-500 to-teal-500",
    description: "Child health, MUAC nutrition, immunization & growth",
  },
  {
    id: "ob_gyn",
    name: "Dr. Bethlehem Tadesse",
    email: "bethlehem@dmrh.gov.et",
    deptName: "OB/GYN & Maternal Health",
    code: "OB/GYN",
    room: "Room 208 — Women's Health Clinic",
    badgeColor: "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/50 dark:text-pink-300 dark:border-pink-800",
    gradient: "from-pink-500 to-rose-500",
    description: "Antenatal care (ANC), fetal heart rate & maternity",
  },
  {
    id: "surgery",
    name: "Dr. Mulatu Bekele",
    email: "mulatu@dmrh.gov.et",
    deptName: "General Surgery & Minor OR",
    code: "SURG",
    room: "Room 110 — Surgical Consult",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800",
    gradient: "from-purple-500 to-indigo-600",
    description: "Pre-op evaluation, ASA scores, NPO fasting & minor OR",
  },
  {
    id: "dental",
    name: "Dr. Dawit Haile",
    email: "dental@dmrh.gov.et",
    deptName: "Dental Clinic & Oral Surgery",
    code: "DENT",
    room: "Room 105 — Dental Suite",
    badgeColor: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/50 dark:text-cyan-300 dark:border-cyan-800",
    gradient: "from-cyan-500 to-blue-500",
    description: "FDI tooth chart, dental caries & oral procedures",
  },
  {
    id: "ophthalmology",
    name: "Dr. Hana Alemu",
    email: "eye@dmrh.gov.et",
    deptName: "Ophthalmology / Eye Clinic",
    code: "EYE",
    room: "Room 106 — Eye Clinic",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800",
    gradient: "from-blue-500 to-indigo-500",
    description: "Visual acuity OD/OS, IOP tonometry & slit lamp",
  },
];

const ROLES: RoleOption[] = [
  {
    id: "doctor",
    code: "Dr",
    title: "Doctor / Physician",
    description: "6 Clinical Specialties",
    demoEmail: "tigist@dmrh.gov.et",
    gradient: "from-teal-500 to-cyan-500",
    icon: Stethoscope,
    hasSpecialties: true,
  },
  {
    id: "ward_nurse",
    code: "RN",
    title: "Ward & Bed Nurse",
    description: "Inpatient beds, MAR, vitals",
    demoEmail: "mekdes@dmrh.gov.et",
    gradient: "from-emerald-500 to-teal-500",
    icon: Activity,
  },
  {
    id: "triage_nurse",
    code: "TR",
    title: "Triage Nurse",
    description: "OPD queue & vital triage",
    demoEmail: "triage@dmrh.gov.et",
    gradient: "from-cyan-500 to-blue-500",
    icon: HeartPulse,
  },
  {
    id: "receptionist",
    code: "RC",
    title: "Reception & Queue",
    description: "Registration, patient search",
    demoEmail: "girma@dmrh.gov.et",
    gradient: "from-blue-500 to-indigo-500",
    icon: Users,
  },
  {
    id: "cashier",
    code: "CS",
    title: "Cashier & Billing",
    description: "Invoices, receipts, deposits",
    demoEmail: "hiwot@dmrh.gov.et",
    gradient: "from-amber-500 to-orange-500",
    icon: CreditCard,
  },
  {
    id: "admin",
    code: "AD",
    title: "Clinic Admin / Owner",
    description: "Management & configuration",
    demoEmail: "admin@dmrh.gov.et",
    gradient: "from-indigo-500 to-purple-500",
    icon: ShieldCheck,
  },
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
  const [selectedRole, setSelectedRole] = useState<RoleOption | null>(null);
  const [isSelectingDoctorSpecialty, setIsSelectingDoctorSpecialty] = useState(false);
  const [selectedDoctorSpecialty, setSelectedDoctorSpecialty] = useState<DoctorSpecialty>(DOCTOR_SPECIALTIES[0]!);
  const [workspace, setWorkspace] = useState("dmrh");
  const [email, setEmail] = useState("admin@dmrh.gov.et");
  const [password, setPassword] = useState("password123");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSelectRole = (role: RoleOption) => {
    if (role.id === "doctor") {
      setIsSelectingDoctorSpecialty(true);
      return;
    }
    setSelectedRole(role);
    setEmail(role.demoEmail);
    setPassword("password123");
    setError("");
  };

  const handleSelectSpecialtyDoctor = (spec: DoctorSpecialty) => {
    setSelectedDoctorSpecialty(spec);
    setIsSelectingDoctorSpecialty(false);
    setSelectedRole(ROLES[0]!);
    setEmail(spec.email);
    setPassword("password123");
    setError("");
  };

  const handleLogin = async () => {
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
        setError("Hospital workspace not found. Please verify the slug (e.g. 'dmrh').");
        setLoading(false);
        return;
      }
      if (!tenant.role) {
        setError("You don't have an assigned staff role in this hospital workspace.");
        setLoading(false);
        return;
      }

      // Target department for doctor
      const targetDept =
        selectedRole?.id === "doctor"
          ? selectedDoctorSpecialty.deptName
          : (tenant as any).department || "General OPD & Internal Medicine";

      // 3. Persist session keys for tenant isolation and tRPC header resolution
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

      // 4. Hard redirect to target role dashboard
      const dashboard = ROLE_DASHBOARDS[tenant.role] ?? "/nova/branch-admin";
      window.location.href = dashboard;
    } catch {
      setError("Connection error. Please check your network connection and server status.");
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center font-sans antialiased overflow-hidden bg-slate-50 dark:bg-[#060818] text-slate-800 dark:text-slate-100">
      {/* Background ambient gradient and watermark map */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <img
          src="/images/auth/bg-gradient.png"
          alt=""
          className="h-full w-full object-cover opacity-60 dark:opacity-30"
        />
        <div className="absolute inset-0 bg-[url('/images/auth/map.png')] bg-cover bg-center bg-no-repeat opacity-40 dark:opacity-20" />
      </div>

      {/* Main Container Card */}
      <div className="relative z-10 w-full max-w-[1360px] mx-4 sm:mx-6 my-6 overflow-hidden rounded-2xl bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-2xl flex flex-col lg:flex-row min-h-[660px]">
        {/* ─── LEFT COLUMN: SLANTED BRAND HERO BANNER ─────────── */}
        <div className="relative hidden lg:flex w-full lg:max-w-[680px] xl:max-w-[740px] items-center justify-center p-8 overflow-hidden bg-[linear-gradient(225deg,#0d9488_0%,#0284c7_45%,#4361ee_100%)] xl:-ms-16 ltr:xl:skew-x-[12deg] rtl:xl:skew-x-[-12deg]">
          {/* Edge shadow overlay */}
          <div className="absolute inset-y-0 w-12 from-black/20 via-transparent to-transparent ltr:-right-6 ltr:bg-gradient-to-r rtl:-left-6 rtl:bg-gradient-to-l xl:w-20 ltr:xl:-right-12 rtl:xl:-left-12 pointer-events-none" />

          {/* Unskewed container for illustration & branding */}
          <div className="ltr:xl:-skew-x-[12deg] rtl:xl:skew-x-[12deg] text-center text-white flex flex-col items-center justify-center max-w-[460px] py-8">
            {/* The exact SVG Illustration from fs-hms */}
            <div className="w-full max-w-[390px] mb-8 drop-shadow-2xl animate-in fade-in duration-500">
              <img
                src="/images/auth/login.svg"
                alt="Nova HMS Healthcare Portal"
                className="w-full h-auto object-contain"
              />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold uppercase tracking-wider text-teal-100">
                <Sparkles size={13} className="text-teal-200" />
                <span>Nova Clinical HMS · v2.4</span>
              </div>
              <h2 className="text-2xl xl:text-3xl font-extrabold tracking-tight">
                Modern Hospital System
              </h2>
              <p className="text-xs xl:text-sm text-teal-50/90 leading-relaxed max-w-sm mx-auto">
                Secure electronic medical records, bedside nurse care, real-time bed board, and automated cashier billing.
              </p>
            </div>
          </div>
        </div>

        {/* ─── RIGHT COLUMN: INTERACTIVE AUTH FORM ─────────────── */}
        <div className="relative flex flex-1 flex-col items-center justify-center p-6 sm:p-10 lg:p-12 w-full">
          <div className="w-full max-w-[440px] space-y-6">
            {/* Header Brand */}
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-teal-600 to-cyan-500 flex items-center justify-center mx-auto shadow-md shadow-teal-500/20 mb-3">
                <span className="font-extrabold text-white text-xl">N</span>
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white uppercase">
                Sign In
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Enter your hospital credentials to access your portal
              </p>
            </div>

            {/* ─── STAGE 1: ROLE & SPECIALTY SELECTION ─────────────────── */}
            {!selectedRole ? (
              isSelectingDoctorSpecialty ? (
                /* Doctor Specialty Grid */
                <div className="space-y-3.5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                        <Stethoscope size={16} className="text-teal-600 dark:text-teal-400" />
                        <span>Select Doctor & Department</span>
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Choose your clinical specialty to load your specific workspace
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsSelectingDoctorSpecialty(false)}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <ArrowLeft size={13} />
                      <span>Back</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
                    {DOCTOR_SPECIALTIES.map((spec) => (
                      <button
                        key={spec.id}
                        type="button"
                        onClick={() => handleSelectSpecialtyDoctor(spec)}
                        className="group flex flex-col items-start p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-850/70 hover:border-teal-500 hover:shadow-md hover:scale-[1.01] transition-all text-left focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${spec.badgeColor}`}>
                            {spec.code}
                          </span>
                          <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                            {spec.room.split("—")[0]?.trim()}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                          {spec.name}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                          {spec.deptName}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                          {spec.description}
                        </span>
                        <span className="text-[9px] font-mono text-teal-600 dark:text-teal-400/85 mt-1 truncate w-full">
                          {spec.email}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Standard Roles Grid */
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="text-center pb-1">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      Select Your Role
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Choose your duty role to load your workspace
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {ROLES.map((role) => {
                      const IconComponent = role.icon;
                      return (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => handleSelectRole(role)}
                          className="group flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-850/60 hover:bg-white dark:hover:bg-slate-800 hover:border-teal-500 hover:shadow-md hover:scale-[1.02] transition-all text-center focus:outline-hidden focus:ring-2 focus:ring-teal-500 relative"
                        >
                          {role.hasSpecialties && (
                            <span className="absolute top-2 right-2 flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                            </span>
                          )}
                          <div
                            className={`mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-r ${role.gradient} text-white font-bold text-sm shadow-sm group-hover:scale-105 transition-transform`}
                          >
                            <IconComponent size={18} />
                          </div>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                            {role.title}
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5 truncate max-w-full">
                            {role.code} · {role.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Quick 1-Click Admin Button */}
                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => handleSelectRole(ROLES[5]!)}
                      className="text-xs text-teal-600 dark:text-teal-400 hover:underline font-semibold"
                    >
                      Quick Sign-in as Clinic Admin →
                    </button>
                  </div>
                </div>
              )
            ) : (
              /* ─── STAGE 2: CREDENTIALS INPUT FORM ─────────────── */
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* Active Role Indicator with Change Button */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/80">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-full bg-gradient-to-r ${selectedRole.gradient} text-white flex items-center justify-center text-xs font-bold shrink-0`}
                    >
                      {selectedRole.code}
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block leading-none">
                        Active Role
                      </span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        {selectedRole.title}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole(null);
                      setIsSelectingDoctorSpecialty(false);
                      setError("");
                    }}
                    className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
                  >
                    <ArrowLeft size={12} />
                    <span>Change</span>
                  </button>
                </div>

                {/* Specific Doctor Details & Fast Switcher (if Doctor role) */}
                {selectedRole.id === "doctor" && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850/80 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${selectedDoctorSpecialty.badgeColor}`}>
                          {selectedDoctorSpecialty.code}
                        </span>
                        <div>
                          <span className="text-xs font-bold text-slate-900 dark:text-white block leading-tight">
                            {selectedDoctorSpecialty.name}
                          </span>
                          <span className="text-[10px] text-teal-600 dark:text-teal-400 font-medium">
                            {selectedDoctorSpecialty.deptName}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 text-right">
                        {selectedDoctorSpecialty.room.split("—")[0]?.trim()}
                      </span>
                    </div>

                    {/* Quick switch chips for all 6 specialties */}
                    <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                        Select Doctor Specialty:
                      </span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {DOCTOR_SPECIALTIES.map((spec) => {
                          const isCurrent = spec.id === selectedDoctorSpecialty.id;
                          return (
                            <button
                              key={spec.id}
                              type="button"
                              onClick={() => handleSelectSpecialtyDoctor(spec)}
                              className={`px-2 py-1.5 rounded-lg text-[10px] font-semibold border transition-all truncate text-left ${
                                isCurrent
                                  ? "bg-teal-600 text-white border-teal-600 shadow-xs font-bold"
                                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-teal-400"
                              }`}
                              title={`${spec.name} (${spec.deptName})`}
                            >
                              <span className="block truncate font-bold">{spec.code} · {spec.name.replace("Dr. ", "")}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Error Banner */}
                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-600 dark:text-red-300 font-medium">
                    {error}
                  </div>
                )}

                {/* Input Fields */}
                <div className="space-y-3">
                  {/* Workspace slug */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Hospital Workspace
                    </label>
                    <div className="relative">
                      <Building2
                        size={15}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        type="text"
                        placeholder="dmrh"
                        value={workspace}
                        onChange={(e) => setWorkspace(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500 transition-all font-mono"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">e.g. dmrh (Debre Markos Referral Hospital)</p>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail
                        size={15}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        type="email"
                        placeholder="name@dmrh.gov.et"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500 transition-all"
                      />
                    </div>
                  </div>

                  {/* Password with Eye Toggle */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <Lock
                        size={15}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                        className="w-full pl-9 pr-10 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-hidden"
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-3.5 h-3.5"
                      />
                      <span>Remember Me</span>
                    </label>

                    <span className="text-[11px] text-slate-400">
                      Demo pass: <strong className="font-mono text-slate-600 dark:text-slate-300">password123</strong>
                    </span>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="button"
                  onClick={handleLogin}
                  disabled={loading || !email || !password}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 hover:from-teal-500 hover:to-blue-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-teal-500/25 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Signing In…</span>
                    </>
                  ) : (
                    <span>Sign In to Nova HMS</span>
                  )}
                </button>
              </div>
            )}

            {/* Footer */}
            <div className="pt-2 text-center">
              <p className="text-[11px] text-slate-400">
                © {new Date().getFullYear()} Nova Technologies · Debre Markos Referral System
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
