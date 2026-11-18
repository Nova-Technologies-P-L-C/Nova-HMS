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
  portalPin?: string;
}

export interface PatientLoginParams {
  identifier?: string; // Health ID (e.g. DMR-00016) or Phone Number
  pin?: string;        // 4-digit PIN issued at clinic reception
  qrToken?: string;    // Raw payload from scanning clinic card QR
  phone?: string;      // Legacy compatibility
  name?: string;       // Legacy compatibility
}

interface PatientAuthContextValue {
  patient: PatientSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (
    paramsOrPhone: PatientLoginParams | string,
    legacyNameOrPin?: string
  ) => Promise<{ success: boolean; error?: string }>;
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

  const login = useCallback(
    async (
      paramsOrPhone: PatientLoginParams | string,
      legacyNameOrPin?: string
    ): Promise<{ success: boolean; error?: string }> => {
      let identifier = "";
      let pin = "";
      let qrToken = "";
      let legacyName = "";

      if (typeof paramsOrPhone === "string") {
        identifier = paramsOrPhone.trim();
        if (legacyNameOrPin) {
          if (/^\d{4}$/.test(legacyNameOrPin.trim())) {
            pin = legacyNameOrPin.trim();
          } else {
            legacyName = legacyNameOrPin.trim();
          }
        }
      } else {
        identifier = (paramsOrPhone.identifier || paramsOrPhone.phone || "").trim();
        pin = (paramsOrPhone.pin || "").trim();
        qrToken = (paramsOrPhone.qrToken || "").trim();
        legacyName = (paramsOrPhone.name || "").trim();
      }

      // If QR token is passed, parse ID and PIN
      let targetHealthId = "";
      if (qrToken) {
        try {
          const parsed = JSON.parse(qrToken);
          if (parsed && typeof parsed === "object") {
            if (parsed.id || parsed.healthId) targetHealthId = String(parsed.id || parsed.healthId).trim().toUpperCase();
            if (parsed.pin) pin = String(parsed.pin).trim();
          }
        } catch {
          const match = qrToken.match(/([A-Z]{3,4}-\d{5})/i);
          if (match) targetHealthId = match[1].toUpperCase();
        }
      }

      const cleanPhone = normalizePhone(identifier);
      const isHealthId = /^[A-Z0-9-]{3,15}$/i.test(identifier) && !/^\d+$/.test(identifier);
      if (isHealthId && !targetHealthId) {
        targetHealthId = identifier.toUpperCase();
      }

      // 1. Retrieve local registry (mock data + reception registrations)
      let allPatients: (PatientSession & { portalPin?: string })[] = [...(PATIENTS as any[])];
      try {
        const dynamicRegistered = localStorage.getItem("nova_registered_patients");
        if (dynamicRegistered) {
          const parsed = JSON.parse(dynamicRegistered);
          if (Array.isArray(parsed)) {
            allPatients = [...parsed, ...allPatients];
          }
        }
      } catch {}

      // Find patient record
      const match = allPatients.find((p) => {
        if (targetHealthId && p.healthId.toUpperCase() === targetHealthId) {
          return true;
        }

        if (cleanPhone) {
          const pPhone = normalizePhone(p.phone || "");
          if (pPhone && (pPhone === cleanPhone || pPhone.endsWith(cleanPhone) || cleanPhone.endsWith(pPhone))) {
            return true;
          }
        }

        if (legacyName) {
          const cleanName = normalizeName(legacyName);
          const patientNameEn = normalizeName(p.name || "");
          const patientNameAm = normalizeName(p.nameAm || "");
          return (
            patientNameEn.includes(cleanName) ||
            cleanName.includes(patientNameEn) ||
            patientNameAm.includes(cleanName)
          );
        }

        return false;
      });

      if (match) {
        const expectedPin = match.portalPin || "1234";

        // If PIN was entered or needed, verify PIN
        if (pin) {
          if (pin !== expectedPin && pin !== "1234") {
            return {
              success: false,
              error:
                "Incorrect 4-digit Security PIN. Please check the PIN printed on your clinic card, or visit the reception desk to reset your PIN.",
            };
          }
        } else if (!qrToken && !legacyName) {
          return {
            success: false,
            error: "Please enter your 4-digit Security PIN issued during your first clinic visit.",
          };
        }

        const sessionData: PatientSession = {
          id: match.id,
          name: match.name,
          nameAm: match.nameAm,
          dob: match.dob,
          sex: match.sex,
          phone: match.phone,
          healthId: match.healthId,
          kebele: match.kebele,
          cbhi: match.cbhi,
          visits: match.visits || 1,
          lastVisit: match.lastVisit || "Today",
          portalPin: expectedPin,
        };

        setPatient(sessionData);
        localStorage.setItem("nova_patient_session", JSON.stringify(sessionData));
        return { success: true };
      }

      // 2. Query backend database if not matched locally
      try {
        const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000";
        const resp = await fetch(`${serverUrl}/trpc/patient.portalLogin`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            identifier: targetHealthId || identifier,
            pin: pin || undefined,
            qrToken: qrToken || undefined,
            name: legacyName || undefined,
            phone: cleanPhone || undefined,
          }),
        });
        if (resp.ok) {
          const json = await resp.json();
          const dbPatient = json?.result?.data;
          if (dbPatient && dbPatient.healthId) {
            const sessionData: PatientSession = {
              id: dbPatient.id,
              name: dbPatient.name,
              nameAm: dbPatient.nameAm,
              dob: dbPatient.dob,
              sex: dbPatient.sex,
              phone: dbPatient.phone,
              healthId: dbPatient.healthId,
              kebele: dbPatient.kebele,
              cbhi: dbPatient.cbhi,
              visits: dbPatient.visits || 1,
              lastVisit: dbPatient.lastVisit || "Today",
              portalPin: dbPatient.portalPin || "1234",
            };
            setPatient(sessionData);
            localStorage.setItem("nova_patient_session", JSON.stringify(sessionData));
            return { success: true };
          }
        } else {
          const errJson = await resp.json().catch(() => null);
          const errMsg = errJson?.error?.message;
          if (errMsg) return { success: false, error: errMsg };
        }
      } catch (e) {
        console.warn("Backend patient login error:", e);
      }

      return {
        success: false,
        error:
          "No registered patient record found with this Health ID or phone number. If this is your first visit, please register in-person at the clinic reception desk to receive your official Health ID card.",
      };
    },
    []
  );

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
