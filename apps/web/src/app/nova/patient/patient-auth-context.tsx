"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { PATIENTS } from "@/lib/nova-mock-data";

export interface PatientSession {
  id: string;
  name: string;
  nameAm?: string;
  dob: string;
  sex: string;
  phone: string;
  healthId: string;
  kebele: string;
  cbhi: boolean;
  visits: number;
  lastVisit: string;
}

interface PatientAuthContextValue {
  patient: PatientSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (phone: string, name: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const PatientAuthContext = createContext<PatientAuthContextValue>({
  patient: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => ({ success: false }),
  logout: () => {},
});

export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("251")) {
    return "0" + digits.slice(3);
  }
  if (digits.startsWith("9") && digits.length === 9) {
    return "0" + digits;
  }
  return digits;
}

export function normalizeName(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

export function PatientAuthProvider({ children }: { children: React.ReactNode }) {
  const [patient, setPatient] = useState<PatientSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Load patient session from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("nova_patient_session");
      if (stored) {
        const parsed = JSON.parse(stored) as PatientSession;
        if (parsed && parsed.healthId) {
          setPatient(parsed);
        }
      }
    } catch (e) {
      console.error("Failed to parse patient session", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (phone: string, name: string): Promise<{ success: boolean; error?: string }> => {
    const cleanPhone = normalizePhone(phone);
    const cleanName = normalizeName(name);

    if (!cleanPhone || cleanPhone.length < 9) {
      return { success: false, error: "Please enter a valid Ethiopian phone number (e.g. 0911234567)." };
    }

    if (!cleanName || cleanName.length < 2) {
      return { success: false, error: "Please enter your full registered name." };
    }

    // Retrieve registry: mock patients + any locally created reception registrations
    let allPatients: PatientSession[] = [...PATIENTS];
    try {
      const dynamicRegistered = localStorage.getItem("nova_registered_patients");
      if (dynamicRegistered) {
        const parsed = JSON.parse(dynamicRegistered);
        if (Array.isArray(parsed)) {
          allPatients = [...parsed, ...allPatients];
        }
      }
    } catch {}

    // Find match by phone AND name (English or Amharic)
    const match = allPatients.find((p) => {
      const patientPhone = normalizePhone(p.phone || "");
      const patientNameEn = normalizeName(p.name || "");
      const patientNameAm = normalizeName(p.nameAm || "");

      const phoneMatches = patientPhone === cleanPhone || (patientPhone && cleanPhone.endsWith(patientPhone.slice(-8)));
      
      const nameMatches =
        patientNameEn === cleanName ||
        patientNameEn.includes(cleanName) ||
        cleanName.includes(patientNameEn) ||
        patientNameAm === cleanName ||
        patientNameAm.includes(cleanName);

      return phoneMatches && nameMatches;
    });

    if (!match) {
      return {
        success: false,
        error:
          "No registered patient record found matching this name and phone number. Please check the spelling or visit the hospital reception desk to register first.",
      };
    }

    // Successfully verified against reception records!
    setPatient(match);
    localStorage.setItem("nova_patient_session", JSON.stringify(match));
    return { success: true };
  }, []);

  const logout = useCallback(() => {
    setPatient(null);
    localStorage.removeItem("nova_patient_session");
    router.replace("/nova/patient/login" as any);
  }, [router]);

  return (
    <PatientAuthContext.Provider
      value={{
        patient,
        isAuthenticated: !!patient,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </PatientAuthContext.Provider>
  );
}

export function usePatientAuth() {
  return useContext(PatientAuthContext);
}
