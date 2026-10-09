"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import NovaSidebar from "./nova-sidebar";
import NovaTopbar from "./nova-topbar";

// These paths render without sidebar/topbar
const PUBLIC_PATHS = [
  "/nova",
  "/nova/login",
  "/nova/signup",
  "/nova/about",
  "/nova/pricing",
  "/nova/onboarding",
];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.includes(pathname);
}

export default function NovaAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const isPublic = isPublicPath(pathname);
    const isPatientPortal = pathname.startsWith("/nova/patient");

    if (isPublic || isPatientPortal) {
      setAuthed(false);
      setReady(true);
      return;
    }

    const tenantId = sessionStorage.getItem("nova_tenant_id");
    if (!tenantId) {
      router.replace("/nova/login");
      return;
    }

    setAuthed(true);
    setReady(true);
  }, [pathname, router]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-950">
        <div className="flex items-center gap-3 text-slate-400">
          <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      </div>
    );
  }

  // Patient portal & public marketing pages — render standalone without hospital staff shell
  const isPatientPortal = pathname.startsWith("/nova/patient");
  if (!authed || isPatientPortal) {
    return <>{children}</>;
  }

  // Authenticated app pages — full shell
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
      <NovaSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <NovaTopbar />
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
