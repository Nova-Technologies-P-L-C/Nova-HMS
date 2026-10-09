"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useTheme as useNextTheme } from "next-themes";
import { trpc } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";

export type SidebarThemeId = "navy" | "midnight" | "white" | "tinted" | "custom";
export type UiDensity = "compact" | "standard" | "comfortable";

export interface ThemePreset {
  id: string;
  name: string;
  primary: string;
  primaryHover: string;
  accent: string;
  description: string;
  badge: string;
  icon: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "emerald",
    name: "Nova Emerald & Teal",
    primary: "#0d9488",
    primaryHover: "#0f766e",
    accent: "#14b8a6",
    description: "Default balanced clinical standard",
    badge: "Clinical Default",
    icon: "🌲",
  },
  {
    id: "royal",
    name: "Ministry Royal Blue",
    primary: "#1d4ed8",
    primaryHover: "#1e40af",
    accent: "#3b82f6",
    description: "Ethiopian MoH national standard",
    badge: "Official MoH",
    icon: "🏛️",
  },
  {
    id: "sapphire",
    name: "St. Paul Sapphire",
    primary: "#0284c7",
    primaryHover: "#0369a1",
    accent: "#38bdf8",
    description: "Clean clinical sky aesthetic",
    badge: "Referral Center",
    icon: "🌊",
  },
  {
    id: "amethyst",
    name: "Amethyst Diagnostic",
    primary: "#7c3aed",
    primaryHover: "#6d28d9",
    accent: "#a78bfa",
    description: "Specialized diagnostic & imaging",
    badge: "Specialist",
    icon: "🔮",
  },
  {
    id: "crimson",
    name: "Emergency Crimson",
    primary: "#e11d48",
    primaryHover: "#be123c",
    accent: "#fb7185",
    description: "High-acuity urgent care and trauma",
    badge: "Trauma Care",
    icon: "🚨",
  },
  {
    id: "slate",
    name: "Midnight Slate",
    primary: "#334155",
    primaryHover: "#1e293b",
    accent: "#64748b",
    description: "Sleek modern monochrome",
    badge: "Corporate",
    icon: "🌑",
  },
];

export interface SidebarOption {
  id: SidebarThemeId;
  name: string;
  bg: string;
  border: string;
  textCls: string;
  description: string;
}

export const SIDEBAR_OPTIONS: SidebarOption[] = [
  {
    id: "navy",
    name: "Dark Classic Navy",
    bg: "#0f2435",
    border: "#1e3a52",
    textCls: "text-slate-100",
    description: "Enterprise clinical high contrast",
  },
  {
    id: "midnight",
    name: "OLED Pitch Midnight",
    bg: "#0b0f19",
    border: "#1a2234",
    textCls: "text-slate-100",
    description: "Deep night contrast, low power draw",
  },
  {
    id: "white",
    name: "Clean Clinical White",
    bg: "#ffffff",
    border: "#e2e8f0",
    textCls: "text-slate-800",
    description: "Light Nordic clinical layout",
  },
  {
    id: "tinted",
    name: "Brand Tinted Dark",
    bg: "#082f2c",
    border: "#0f4743",
    textCls: "text-slate-100",
    description: "Harmonized with primary color tone",
  },
];

export const RADIUS_OPTIONS = [
  { value: 2, label: "Sharp Geometric", sublabel: "2px", desc: "Technical & crisp clinical square edges" },
  { value: 8, label: "Modern Balanced", sublabel: "8px", desc: "Clean, balanced contemporary standard" },
  { value: 16, label: "Soft Pill & Round", sublabel: "16px", desc: "Friendly, soft patient-centric curves" },
];

export interface NovaThemeConfig {
  preset: string;
  primaryColor: string;
  primaryHover: string;
  accentColor: string;
  sidebarTheme: SidebarThemeId;
  sidebarBg: string;
  mode: "light" | "dark" | "system";
  density: UiDensity;
  radius: number;
  hospitalName: string;
  logoBadge: string;
}

export const DEFAULT_THEME: NovaThemeConfig = {
  preset: "emerald",
  primaryColor: "#0d9488",
  primaryHover: "#0f766e",
  accentColor: "#14b8a6",
  sidebarTheme: "navy",
  sidebarBg: "#0f2435",
  mode: "system",
  density: "standard",
  radius: 8,
  hospitalName: "Debre Markos Comprehensive Referral Hospital",
  logoBadge: "DM",
};

interface NovaThemeContextValue {
  theme: NovaThemeConfig;
  updateThemeLocally: (partial: Partial<NovaThemeConfig>) => void;
  applyPreset: (presetId: string) => void;
  setMode: (mode: "light" | "dark" | "system") => void;
  setSidebarTheme: (sidebarId: SidebarThemeId, customBg?: string) => void;
  setDensity: (density: UiDensity) => void;
  setRadius: (radius: number) => void;
  setIdentity: (hospitalName: string, logoBadge: string) => void;
  resetTheme: () => void;
  syncFromRemote: (remote: Partial<NovaThemeConfig>) => void;
}

const NovaThemeContext = createContext<NovaThemeContextValue>({
  theme: DEFAULT_THEME,
  updateThemeLocally: () => {},
  applyPreset: () => {},
  setMode: () => {},
  setSidebarTheme: () => {},
  setDensity: () => {},
  setRadius: () => {},
  setIdentity: () => {},
  resetTheme: () => {},
  syncFromRemote: () => {},
});

const STORAGE_KEY = "nova_theme_config";

function hexToRgba(hex: string, alpha: number) {
  let clean = hex.replace("#", "");
  if (clean.length === 3) clean = clean.split("").map((c) => c + c).join("");
  const num = parseInt(clean, 16);
  if (isNaN(num)) return `rgba(13, 148, 136, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function applyDomTheme(config: NovaThemeConfig) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--nova-primary", config.primaryColor);
  root.style.setProperty("--nova-primary-hover", config.primaryHover || config.primaryColor);
  root.style.setProperty("--nova-accent", config.accentColor);
  root.style.setProperty("--nova-primary-subtle", hexToRgba(config.primaryColor, 0.12));
  root.style.setProperty("--nova-primary-border", hexToRgba(config.primaryColor, 0.3));
  root.style.setProperty("--nova-sidebar-bg", config.sidebarBg);
  root.style.setProperty("--nova-radius", `${config.radius}px`);
  root.style.setProperty("--radius", `${config.radius}px`);
  root.style.setProperty("--primary", config.primaryColor);
  root.setAttribute("data-nova-density", config.density);
  root.setAttribute("data-theme-mode", config.mode);

  // Directly apply or remove dark class on documentElement
  const mediaQuery = typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  const isDark =
    config.mode === "dark" ||
    (config.mode === "system" && (mediaQuery ? mediaQuery.matches : false));

  if (isDark) {
    root.classList.add("dark");
    root.style.colorScheme = "dark";
  } else {
    root.classList.remove("dark");
    root.style.colorScheme = "light";
  }
}

export function NovaThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme: nextTheme, setTheme: setNextTheme } = useNextTheme();
  const [theme, setThemeState] = useState<NovaThemeConfig>(DEFAULT_THEME);
  const [mounted, setMounted] = useState(false);

  // 1. Initialize from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as NovaThemeConfig;
        const merged = { ...DEFAULT_THEME, ...parsed };
        setThemeState(merged);
        applyDomTheme(merged);
      } else {
        applyDomTheme(DEFAULT_THEME);
      }
    } catch {
      applyDomTheme(DEFAULT_THEME);
    }
    setMounted(true);
  }, []);

  // 2. Safely sync DOM, localStorage and next-themes post-render
  useEffect(() => {
    if (!mounted) return;
    applyDomTheme(theme);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
      if (theme.mode) {
        localStorage.setItem("theme", theme.mode);
        if (nextTheme !== theme.mode) {
          setNextTheme(theme.mode);
        }
      }
    } catch {}
  }, [theme, mounted, nextTheme, setNextTheme]);

  // 3. Listen to system color scheme changes if mode === "system"
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (theme.mode === "system") {
        applyDomTheme(theme);
      }
    };
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [theme]);

  // 4. Query tenant branding if authenticated
  const { data: remoteBranding } = useQuery({
    ...trpc.tenant.getBranding.queryOptions(),
    staleTime: 60_000,
    retry: false,
  });

  // 5. Sync with remote data when loaded (pure functional updater with zero side effects)
  useEffect(() => {
    if (remoteBranding && mounted) {
      const rb = remoteBranding as any;
      setThemeState((prev) => ({
        ...prev,
        ...rb,
        mode: (rb.mode as "light" | "dark" | "system") || prev.mode,
        density: (rb.density as UiDensity) || prev.density,
        sidebarTheme: (rb.sidebarTheme as SidebarThemeId) || prev.sidebarTheme,
      }));
    }
  }, [remoteBranding, mounted]);

  // 6. Pure state updater
  const updateThemeLocally = useCallback((partial: Partial<NovaThemeConfig>) => {
    setThemeState((prev) => ({ ...prev, ...partial }));
  }, []);

  const applyPreset = useCallback((presetId: string) => {
    const found = THEME_PRESETS.find((p) => p.id === presetId);
    if (!found) return;

    let derivedSidebarBg = "#0f2435";
    if (presetId === "emerald") derivedSidebarBg = "#0f2435";
    else if (presetId === "royal") derivedSidebarBg = "#0e1a38";
    else if (presetId === "sapphire") derivedSidebarBg = "#08233b";
    else if (presetId === "amethyst") derivedSidebarBg = "#1f1035";
    else if (presetId === "crimson") derivedSidebarBg = "#2e0f1a";
    else if (presetId === "slate") derivedSidebarBg = "#0f172a";

    updateThemeLocally({
      preset: presetId,
      primaryColor: found.primary,
      primaryHover: found.primaryHover,
      accentColor: found.accent,
      sidebarBg: derivedSidebarBg,
    });
  }, [updateThemeLocally]);

  const setMode = useCallback((mode: "light" | "dark" | "system") => {
    try {
      setNextTheme(mode);
    } catch {}
    updateThemeLocally({ mode });
  }, [setNextTheme, updateThemeLocally]);

  const setSidebarTheme = useCallback((sidebarId: SidebarThemeId, customBg?: string) => {
    if (sidebarId === "custom" && customBg) {
      updateThemeLocally({ sidebarTheme: "custom", sidebarBg: customBg });
      return;
    }
    const option = SIDEBAR_OPTIONS.find((s) => s.id === sidebarId);
    if (option) {
      updateThemeLocally({ sidebarTheme: sidebarId, sidebarBg: option.bg });
    }
  }, [updateThemeLocally]);

  const setDensity = useCallback((density: UiDensity) => {
    updateThemeLocally({ density });
  }, [updateThemeLocally]);

  const setRadius = useCallback((radius: number) => {
    updateThemeLocally({ radius });
  }, [updateThemeLocally]);

  const setIdentity = useCallback((hospitalName: string, logoBadge: string) => {
    updateThemeLocally({ hospitalName, logoBadge });
  }, [updateThemeLocally]);

  const resetTheme = useCallback(() => {
    try {
      setNextTheme("system");
    } catch {}
    setThemeState(DEFAULT_THEME);
  }, [setNextTheme]);

  const syncFromRemote = useCallback((remote: Partial<NovaThemeConfig>) => {
    updateThemeLocally(remote);
  }, [updateThemeLocally]);

  return (
    <NovaThemeContext.Provider
      value={{
        theme,
        updateThemeLocally,
        applyPreset,
        setMode,
        setSidebarTheme,
        setDensity,
        setRadius,
        setIdentity,
        resetTheme,
        syncFromRemote,
      }}
    >
      {children}
    </NovaThemeContext.Provider>
  );
}

export function useNovaTheme() {
  return useContext(NovaThemeContext);
}
