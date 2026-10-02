"use client";

// =============================================================================
// Nova HMS — Role & Language Context Provider
// =============================================================================
//
// This React context is the single source of truth for the currently
// authenticated hospital staff member's identity during a browser session.
//
// It exposes:
//   role         — The user's clinical role (e.g. "Doctor", "Pharmacist")
//   lang         — Active UI language: "en" (English) or "am" (Amharic)
//   userName     — Full display name of the logged-in user
//   userInitials — 1–2 character initials derived from userName (used in avatars)
//   hospitalName — Human-readable name of the current tenant/hospital
//
// Data source:
//   All values are persisted in localStorage after a successful login
//   (see /nova/login/page.tsx). On mount, this provider reads localStorage
//   and hydrates the context. It also listens for the "storage" event so
//   that logging in/out in another browser tab updates this tab instantly.
//
// Why localStorage (not server state)?
//   The role, name, and tenant details are non-sensitive display metadata.
//   The actual security enforcement happens at the API level via the
//   x-tenant-id header + UserTenantRole DB lookup in the tRPC context.
//   localStorage is sufficient for UI rendering decisions.
//
// Bilingual support:
//   Nova HMS targets Ethiopian public hospitals where staff may prefer
//   Amharic (Ge'ez script) over English. The `lang` flag switches UI labels.
//   "en" = default; "am" = Amharic. Components read this from useNovaRole().
//
// localStorage keys (set by login page on successful authentication):
//   nova_user_role    — Role slug e.g. "Doctor"
//   nova_user_name    — Full display name e.g. "Dr. Tigist Alemu"
//   nova_tenant_slug  — Workspace slug e.g. "dmrh"
//   nova_tenant_id    — Tenant UUID (used as x-tenant-id header in tRPC calls)
// =============================================================================

import { createContext, useContext, useState, useEffect } from "react";
import { type Role } from "@/lib/nova-mock-data";

// Shape of the context value available to all consumers via useNovaRole()
interface RoleContextValue {
  role: Role;
  setRole: (r: Role) => void;
  lang: "en" | "am";
  setLang: (l: "en" | "am") => void;
  userName: string;
  userInitials: string;      // Derived: "Tigist Alemu" → "TA"
  hospitalName: string;      // Derived from tenant slug e.g. "dmrh" → "Debre Markos Referral Hospital"
}

// Default context value — used before localStorage hydration completes
// and in tests/Storybook where no provider is mounted.
// "Receptionist" is the safest default: it has the least data access privilege.
const RoleContext = createContext<RoleContextValue>({
  role: "Receptionist",
  setRole: () => {},
  lang: "en",
  setLang: () => {},
  userName: "",
  userInitials: "",
  hospitalName: "Nova HMS",
});

// ─── Provider ─────────────────────────────────────────────────────────────────
// Wrap the entire /nova layout with this provider (see apps/web/src/app/nova/layout.tsx).
// All child components can then call useNovaRole() to access the current user's identity.
export function NovaRoleProvider({ children }: { children: React.ReactNode }) {
  // Role defaults to "Receptionist" until localStorage is read on mount.
  // This prevents a flash of the wrong sidebar navigation items during hydration.
  const [role, setRoleState] = useState<Role>("Receptionist");

  // Language defaults to English. Staff can toggle to Amharic via the
  // language selector in the topbar (nova-topbar.tsx).
  const [lang, setLang] = useState<"en" | "am">("en");

  const [userName, setUserName] = useState("");
  const [hospitalName, setHospitalName] = useState("Nova HMS");

  // ── Sync from localStorage on mount and cross-tab ──────────────────────────
  // Runs once on component mount to hydrate state from the login session.
  // Also wires up a "storage" event listener so that:
  //   - Logging in on Tab A immediately updates Tab B (no stale role displayed)
  //   - Logging out clears all tabs simultaneously
  useEffect(() => {
    const sync = () => {
      const storedRole = localStorage.getItem("nova_user_role") as Role | null;
      const storedName = localStorage.getItem("nova_user_name") ?? "";
      const storedSlug = localStorage.getItem("nova_tenant_slug") ?? "";

      if (storedRole) setRoleState(storedRole);
      if (storedName) setUserName(storedName);

      if (storedSlug) {
        // Map tenant slug to human-readable hospital name.
        // PRODUCTION: replace with a tRPC query to tenant.getBySlug for dynamic names.
        // Hardcoded here to avoid an extra network round-trip on every page load.
        const names: Record<string, string> = {
          dmrh: "Debre Markos Referral Hospital",
          // Add new hospital slugs here as they are onboarded to the platform
        };
        setHospitalName(names[storedSlug] ?? storedSlug.toUpperCase());
      }
    };

    sync(); // Initial hydration from current tab's localStorage

    // Listen for storage changes from other tabs (login/logout in parallel tab)
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  // ── setRole ────────────────────────────────────────────────────────────────
  // Updates both React state and localStorage so the role persists across
  // page refreshes. Called by the login page after resolving the user's role.
  const setRole = (r: Role) => {
    setRoleState(r);
    localStorage.setItem("nova_user_role", r);
  };

  // ── userInitials ───────────────────────────────────────────────────────────
  // Derives a 1–2 character avatar label from the user's display name.
  // "Dr. Tigist Alemu" → split on spaces → ["Dr.", "Tigist", "Alemu"]
  //   → first chars → ["D", "T", "A"] → slice 0-2 → "DT" → uppercase
  // Used in the topbar avatar circle and user menu component.
  const userInitials = userName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <RoleContext.Provider
      value={{ role, setRole, lang, setLang, userName, userInitials, hospitalName }}
    >
      {children}
    </RoleContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
// Convenience hook — use this in any client component inside /nova/* routes
// to read the current user's role, language preference, and display name.
//
// Example usage:
//   const { role, hospitalName, lang } = useNovaRole();
//   if (role === "Doctor") { ... }
export function useNovaRole() {
  return useContext(RoleContext);
}
