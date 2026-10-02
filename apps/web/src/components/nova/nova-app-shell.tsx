"use client";

// =============================================================================
// Nova HMS — Application Shell (Auth Guard + Layout Router)
// =============================================================================
//
// This is the top-level layout wrapper for every route under /nova/*.
// It serves three distinct purposes:
//
//   1. AUTH GUARD
//      Checks whether the current user has a valid login session
//      (nova_tenant_id in localStorage). If not, redirects to /nova/login.
//      This is a client-side guard — it runs in the browser after hydration.
//
//   2. LAYOUT ROUTER
//      Decides which layout to render based on the current path:
//        - Public pages     → children only (no sidebar/topbar)
//        - Patient portal   → children only (patient-facing standalone UI)
//        - Staff app pages  → full shell (NovaSidebar + NovaTopbar + main content)
//
//   3. LOADING STATE
//      Renders a full-screen spinner while the auth check is in progress.
//      This prevents a flash of unauthenticated content (FOUC) before the
//      redirect executes.
//
// Layout variants:
//
//   ┌─────────────────────────────────────────┐
//   │  NovaSidebar  │  NovaTopbar             │  ← Staff app shell (authenticated)
//   │  (role nav)   │─────────────────────────│
//   │               │  <main> page content    │
//   └─────────────────────────────────────────┘
//
//   ┌─────────────────────────────────────────┐
//   │  <children>  (no chrome)                │  ← Public pages & patient portal
//   └─────────────────────────────────────────┘
//
// Auth mechanism (client-side only):
//   The shell reads `nova_tenant_id` from localStorage.
//   This key is written by the login page after a successful server-side
//   session is established. Its absence means the user is not logged in.
//
// IMPORTANT: This is a UX guard, NOT a security boundary.
//   Real security is enforced by the tRPC tenantProcedure middleware on the
//   server — every API call validates the session cookie independently.
//   Even if a user bypasses this redirect, they cannot fetch any clinical
//   data without a valid server-side session.
//
// Public paths (render without auth check or shell chrome):
//   /nova            — Marketing landing page
//   /nova/login      — Login page
//   /nova/signup     — New hospital signup / onboarding
//   /nova/about      — About Nova HMS
//   /nova/pricing    — SaaS pricing page
//   /nova/onboarding — Hospital setup wizard
// =============================================================================

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import NovaSidebar from "./nova-sidebar";
import NovaTopbar from "./nova-topbar";

// Paths that render without the hospital staff shell and without an auth check.
// These are public-facing pages accessible before login.
const PUBLIC_PATHS = [
  "/nova",
  "/nova/login",
  "/nova/signup",
  "/nova/about",
  "/nova/pricing",
  "/nova/onboarding",
];

// Check if the current path is a public (unauthenticated) page.
// Exact match only — e.g. "/nova/login" matches but "/nova/login/callback" does not.
function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.includes(pathname);
}

export default function NovaAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // `ready` prevents rendering children until the auth check resolves.
  // Without this gate, authenticated staff pages would flash briefly before redirect.
  const [ready, setReady] = useState(false);

  // `authed` determines which layout variant to render:
  //   true  → full staff shell (sidebar + topbar)
  //   false → children only (public page or patient portal)
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const isPublic = isPublicPath(pathname);
    const isPatientPortal = pathname.startsWith("/nova/patient");

    // Public pages and the patient portal render without any auth requirement.
    // The patient portal has its own auth flow (QR code / health ID login)
    // handled by patient-auth-context.tsx inside /nova/patient/layout.tsx.
    if (isPublic || isPatientPortal) {
      setAuthed(false);
      setReady(true);
      return;
    }

    // For all other /nova/* routes (staff app), check for an active session.
    // nova_tenant_id is written to localStorage by the login page after a
    // successful authentication + tenant resolution flow.
    const tenantId = localStorage.getItem("nova_tenant_id");
    if (!tenantId) {
      // No active session — redirect to login.
      // router.replace() is used instead of push() so the protected page
      // does not appear in browser history (no back-button loop).
      router.replace("/nova/login");
      return; // Do not set ready — keep spinner visible during redirect
    }

    // Valid session found — render the full staff shell
    setAuthed(true);
    setReady(true);
  }, [pathname, router]); // Re-run whenever the route changes (tab switches, programmatic navigation)

  // ── Loading spinner ────────────────────────────────────────────────────────
  // Shown while the useEffect auth check hasn't resolved yet (first render only).
  // Keeps the screen clean — prevents a flash of either the login page or
  // the protected content while localStorage is being read.
  if (!ready) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="flex items-center gap-3 text-slate-400">
          {/* Animated spinner — teal matches Nova HMS brand colour */}
          <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      </div>
    );
  }

  // ── Public pages & patient portal — no shell chrome ────────────────────────
  // Renders children directly with no sidebar, topbar, or background layout.
  // Patient portal has its own standalone shell defined in /nova/patient/layout.tsx.
  const isPatientPortal = pathname.startsWith("/nova/patient");
  if (!authed || isPatientPortal) {
    return <>{children}</>;
  }

  // ── Authenticated staff app — full shell ──────────────────────────────────
  // Three-column layout:
  //   Left:   NovaSidebar — role-based navigation (fixed width, full height)
  //   Right:  Vertical stack of NovaTopbar + main content area
  //
  // overflow-hidden on the outer div prevents double scrollbars.
  // overflow-hidden on the inner div clips the topbar during content scroll.
  // The <main> area handles its own scrolling per page.
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Role-based navigation sidebar — collapses navigation to the user's role */}
      <NovaSidebar />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Topbar — hospital name, user menu, language toggle, notifications */}
        <NovaTopbar />

        {/* Main content area — each page component renders its own scroll behaviour */}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
