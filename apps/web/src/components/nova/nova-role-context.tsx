"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { type Role } from "@/lib/nova-mock-data";

interface RoleContextValue {
  role: Role;
  setRole: (r: Role) => void;
  doctorDepartment: string;
  setDoctorDepartment: (dept: string) => void;
  lang: "en" | "am";
  setLang: (l: "en" | "am") => void;
  userName: string;
  userInitials: string;
  hospitalName: string;
}

const RoleContext = createContext<RoleContextValue>({
  role: "Receptionist",
  setRole: () => {},
  doctorDepartment: "General OPD",
  setDoctorDepartment: () => {},
  lang: "en",
  setLang: () => {},
  userName: "",
  userInitials: "",
  hospitalName: "Ethiora HMS",
});

export function NovaRoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<Role>("Receptionist");
  const [doctorDepartment, setDoctorDepartmentState] = useState<string>("General OPD");
  const [lang, setLang] = useState<"en" | "am">("en");
  const [userName, setUserName] = useState("");
  const [hospitalName, setHospitalName] = useState("Ethiora HMS");

  // Load from sessionStorage on mount (per-tab isolated, with localStorage fallback for new tabs)
  useEffect(() => {
    let storedRole = sessionStorage.getItem("nova_user_role") as Role | null;
    let storedName = sessionStorage.getItem("nova_user_name") ?? "";
    let storedSlug = sessionStorage.getItem("nova_tenant_slug") ?? "";
    let storedDept = sessionStorage.getItem("nova_doctor_department") ?? "";

    if (!storedRole && typeof window !== "undefined") {
      storedRole = localStorage.getItem("nova_user_role") as Role | null;
      storedName = localStorage.getItem("nova_user_name") ?? "";
      storedSlug = localStorage.getItem("nova_tenant_slug") ?? "";
      storedDept = localStorage.getItem("nova_doctor_department") ?? "";
      if (storedRole) sessionStorage.setItem("nova_user_role", storedRole);
      if (storedName) sessionStorage.setItem("nova_user_name", storedName);
      if (storedSlug) sessionStorage.setItem("nova_tenant_slug", storedSlug);
      if (storedDept) sessionStorage.setItem("nova_doctor_department", storedDept);
    }

    if (storedRole) setRoleState(storedRole);
    if (storedName) setUserName(storedName);
    if (storedDept) setDoctorDepartmentState(storedDept);
    if (storedSlug) {
      const names: Record<string, string> = {
        dmrh: "Debre Markos Referral Hospital",
      };
      setHospitalName(names[storedSlug] ?? storedSlug.toUpperCase());
    }
  }, []);

  const setRole = (r: Role) => {
    setRoleState(r);
    // Isolate role per-tab in sessionStorage so tabs can be different stations simultaneously
    sessionStorage.setItem("nova_user_role", r);
    if (typeof window !== "undefined" && !localStorage.getItem("nova_user_role")) {
      localStorage.setItem("nova_user_role", r);
    }
  };

  const setDoctorDepartment = (dept: string) => {
    setDoctorDepartmentState(dept);
    sessionStorage.setItem("nova_doctor_department", dept);
    if (typeof window !== "undefined") {
      localStorage.setItem("nova_doctor_department", dept);
    }
  };

  const userInitials = userName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <RoleContext.Provider
      value={{
        role,
        setRole,
        doctorDepartment,
        setDoctorDepartment,
        lang,
        setLang,
        userName,
        userInitials,
        hospitalName,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useNovaRole() {
  return useContext(RoleContext);
}
