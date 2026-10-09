"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { type Role } from "@/lib/nova-mock-data";

interface RoleContextValue {
  role: Role;
  setRole: (r: Role) => void;
  lang: "en" | "am";
  setLang: (l: "en" | "am") => void;
  userName: string;
  userInitials: string;
  hospitalName: string;
}

const RoleContext = createContext<RoleContextValue>({
  role: "Receptionist",
  setRole: () => {},
  lang: "en",
  setLang: () => {},
  userName: "",
  userInitials: "",
  hospitalName: "Nova HMS",
});

export function NovaRoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<Role>("Receptionist");
  const [lang, setLang] = useState<"en" | "am">("en");
  const [userName, setUserName] = useState("");
  const [hospitalName, setHospitalName] = useState("Nova HMS");

  // Load from sessionStorage on mount (set during login — per-tab, isolated)
  useEffect(() => {
    const storedRole = sessionStorage.getItem("nova_user_role") as Role | null;
    const storedName = sessionStorage.getItem("nova_user_name") ?? "";
    const storedSlug = sessionStorage.getItem("nova_tenant_slug") ?? "";

    if (storedRole) setRoleState(storedRole);
    if (storedName) setUserName(storedName);
    if (storedSlug) {
      const names: Record<string, string> = {
        dmrh: "Debre Markos Referral Hospital",
      };
      setHospitalName(names[storedSlug] ?? storedSlug.toUpperCase());
    }
  }, []);

  const setRole = (r: Role) => {
    setRoleState(r);
    sessionStorage.setItem("nova_user_role", r);
  };

  const userInitials = userName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <RoleContext.Provider value={{ role, setRole, lang, setLang, userName, userInitials, hospitalName }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useNovaRole() {
  return useContext(RoleContext);
}
