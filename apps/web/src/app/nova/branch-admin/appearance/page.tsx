"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Palette,
  Sun,
  Moon,
  Monitor,
  Check,
  RotateCcw,
  Sparkles,
  Building2,
  Sliders,
  Maximize2,
  Minimize2,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Activity,
  HeartPulse,
  Save,
  Globe,
  Clock,
  Eye,
} from "lucide-react";
import {
  useNovaTheme,
  THEME_PRESETS,
  SIDEBAR_OPTIONS,
  RADIUS_OPTIONS,
  type NovaThemeConfig,
  type SidebarThemeId,
  type UiDensity,
  DEFAULT_THEME,
} from "@/components/nova/nova-theme-context";
import { trpc, queryClient } from "@/utils/trpc";
import { useMutation } from "@tanstack/react-query";

export default function AppearanceCustomizerPage() {
  const { theme, updateThemeLocally, setMode, resetTheme } = useNovaTheme();

  // Local draft state for real-time live preview before final global commit
  const [draft, setDraft] = useState<NovaThemeConfig>(theme);
  const [customHex, setCustomHex] = useState(theme.primaryColor);
  const [isDirty, setIsDirty] = useState(false);

  // Sync draft whenever parent theme initializes or updates
  useEffect(() => {
    setDraft(theme);
    setCustomHex(theme.primaryColor);
  }, [theme]);

  // TRPC Mutation to persist branding globally per tenant
  const updateBrandingMutation = useMutation({
    ...trpc.tenant.updateBranding.mutationOptions(),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: trpc.tenant.getBranding.queryKey() });
      queryClient.invalidateQueries({ queryKey: trpc.tenant.get.queryKey() });
      toast.success("Facility UI appearance saved successfully! Applied across all clinic stations.", {
        description: `Theme: ${draft.preset} | Mode: ${draft.mode} | Density: ${draft.density}`,
      });
      setIsDirty(false);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update branding settings");
    },
  });

  const resetBrandingMutation = useMutation({
    ...trpc.tenant.resetBranding.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.tenant.getBranding.queryKey() });
      queryClient.invalidateQueries({ queryKey: trpc.tenant.get.queryKey() });
      resetTheme();
      setDraft(DEFAULT_THEME);
      setCustomHex(DEFAULT_THEME.primaryColor);
      setIsDirty(false);
      toast.success("Branding reset to system defaults.");
    },
  });

  // Real-time staging handlers
  const handleSelectPreset = (presetId: string) => {
    const found = THEME_PRESETS.find((p) => p.id === presetId);
    if (!found) return;

    let derivedSidebarBg = "#0f2435";
    if (presetId === "emerald") derivedSidebarBg = "#0f2435";
    else if (presetId === "royal") derivedSidebarBg = "#0e1a38";
    else if (presetId === "sapphire") derivedSidebarBg = "#08233b";
    else if (presetId === "amethyst") derivedSidebarBg = "#1f1035";
    else if (presetId === "crimson") derivedSidebarBg = "#2e0f1a";
    else if (presetId === "slate") derivedSidebarBg = "#0f172a";

    const next: NovaThemeConfig = {
      ...draft,
      preset: presetId,
      primaryColor: found.primary,
      primaryHover: found.primaryHover,
      accentColor: found.accent,
      sidebarBg: draft.sidebarTheme === "white" ? "#ffffff" : derivedSidebarBg,
    };
    setDraft(next);
    setCustomHex(found.primary);
    updateThemeLocally(next);
    setIsDirty(true);
  };

  const handleCustomColorChange = (hex: string) => {
    setCustomHex(hex);
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
      const next: NovaThemeConfig = {
        ...draft,
        preset: "custom",
        primaryColor: hex,
        primaryHover: hex,
        accentColor: hex,
      };
      setDraft(next);
      updateThemeLocally(next);
      setIsDirty(true);
    }
  };

  const handleModeChange = (mode: "light" | "dark" | "system") => {
    setMode(mode);
    const next = { ...draft, mode };
    setDraft(next);
    setIsDirty(true);
  };

  const handleSidebarChange = (sidebarId: SidebarThemeId) => {
    const opt = SIDEBAR_OPTIONS.find((s) => s.id === sidebarId);
    if (!opt) return;

    let targetBg = opt.bg;
    if (sidebarId === "tinted") {
      targetBg = draft.primaryColor.slice(0, 7) + "22"; // subtle tint
    }

    const next: NovaThemeConfig = {
      ...draft,
      sidebarTheme: sidebarId,
      sidebarBg: targetBg,
    };
    setDraft(next);
    updateThemeLocally(next);
    setIsDirty(true);
  };

  const handleDensityChange = (density: UiDensity) => {
    const next = { ...draft, density };
    setDraft(next);
    updateThemeLocally(next);
    setIsDirty(true);
  };

  const handleRadiusChange = (radius: number) => {
    const next = { ...draft, radius };
    setDraft(next);
    updateThemeLocally(next);
    setIsDirty(true);
  };

  const handleIdentityChange = (field: "hospitalName" | "logoBadge", val: string) => {
    const next = { ...draft, [field]: val };
    setDraft(next);
    updateThemeLocally(next);
    setIsDirty(true);
  };

  const handleSave = () => {
    updateBrandingMutation.mutate({
      preset: draft.preset,
      primaryColor: draft.primaryColor,
      primaryHover: draft.primaryHover,
      accentColor: draft.accentColor,
      sidebarTheme: draft.sidebarTheme,
      sidebarBg: draft.sidebarBg,
      mode: draft.mode,
      density: draft.density,
      radius: draft.radius,
      hospitalName: draft.hospitalName,
      logoBadge: draft.logoBadge,
    });
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset all theme colors, layout density, and branding to system defaults?")) {
      resetBrandingMutation.mutate();
    }
  };

  // Density helper classes for the sandbox table
  const densityRowPadding =
    draft.density === "compact"
      ? "py-1.5 px-3 text-xs"
      : draft.density === "comfortable"
      ? "py-3 px-4 text-sm"
      : "py-2 px-3 text-xs";

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      {/* Top Header */}
      <div className="px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-xs"
              style={{ backgroundColor: draft.primaryColor, borderRadius: `${Math.min(draft.radius, 10)}px` }}
            >
              <Palette size={18} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                Enterprise UI Appearance & Theme Studio
                {isDirty && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 animate-pulse">
                    Live Preview (Unsaved Changes)
                  </span>
                )}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Full visual control: light/dark mode, 6 medical brand presets, UI density, component curves, and facility identity.
              </p>
            </div>
          </div>
        </div>

        {/* Global Save Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleReset}
            disabled={resetBrandingMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-xs"
            title="Reset to system medical default"
          >
            <RotateCcw size={13} className={resetBrandingMutation.isPending ? "animate-spin" : ""} />
            Reset Defaults
          </button>

          <button
            onClick={handleSave}
            disabled={updateBrandingMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-lg transition-all shadow-md active:scale-95 disabled:opacity-50"
            style={{
              backgroundColor: draft.primaryColor,
              borderRadius: `${Math.min(draft.radius, 10)}px`,
            }}
          >
            <Save size={14} className={updateBrandingMutation.isPending ? "animate-spin" : ""} />
            {updateBrandingMutation.isPending ? "Saving to Cloud..." : "Save & Apply Globally Across Clinic"}
          </button>
        </div>
      </div>

      {/* Main Split-Screen Workspace */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* ================= LEFT CONTROLS PANEL (7 COLS) ================= */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* 1. THEME MODE */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sun size={17} className="text-amber-500" />
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">1. Theme Mode</h3>
                </div>
                <span className="text-xs text-slate-400">Current: {draft.mode.toUpperCase()}</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Choose the visual contrast mode for the hospital system. Dark mode helps reduce eye fatigue during 24/7 night emergency shifts.
              </p>

              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    id: "light",
                    label: "Light Mode",
                    sub: "Daylight clinical workspace",
                    icon: <Sun size={16} className="text-amber-500" />,
                  },
                  {
                    id: "dark",
                    label: "Dark Mode",
                    sub: "OLED night shift relief",
                    icon: <Moon size={16} className="text-teal-400" />,
                  },
                  {
                    id: "system",
                    label: "System Auto",
                    sub: "Tracks operating system schedule",
                    icon: <Monitor size={16} className="text-blue-500" />,
                  },
                ].map((m) => {
                  const active = draft.mode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleModeChange(m.id as any)}
                      className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition-all ${
                        active
                          ? "border-teal-500 bg-teal-50/40 dark:bg-teal-950/40 ring-2 ring-teal-500/30"
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1.5">
                        {m.icon}
                        {active && <Check size={14} className="text-teal-600 dark:text-teal-400 font-bold" />}
                      </div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{m.label}</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{m.sub}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. PRIMARY BRAND COLOR & PRESETS */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Palette size={17} style={{ color: draft.primaryColor }} />
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    2. Primary Medical Brand Colors
                  </h3>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {draft.preset.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Select one of 6 national Ethiopian healthcare presets or supply your hospital's custom corporate brand hex code.
              </p>

              {/* 6 Medical Presets */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                {THEME_PRESETS.map((p) => {
                  const active = draft.preset === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectPreset(p.id)}
                      style={
                        active
                          ? {
                              borderColor: p.primary,
                              backgroundColor: `${p.primary}15`,
                              boxShadow: `0 0 0 2px ${p.primary}33`,
                            }
                          : undefined
                      }
                      className={`flex flex-col p-3 rounded-xl border text-left transition-all ${
                        active
                          ? ""
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-base">{p.icon}</span>
                          <span className="w-3.5 h-3.5 rounded-full shadow-xs" style={{ backgroundColor: p.primary }} />
                        </div>
                        {active && <Check size={14} style={{ color: p.primary }} />}
                      </div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate w-full">
                        {p.name}
                      </span>
                      <span className="text-[10px] text-slate-400 truncate mt-0.5">{p.description}</span>
                    </button>
                  );
                })}
              </div>

              {/* Custom Hex Picker */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Custom Brand Color:</span>
                  <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-700 rounded-lg p-1 bg-white dark:bg-slate-800 shadow-xs">
                    <input
                      type="color"
                      value={customHex.startsWith("#") ? customHex : "#0d9488"}
                      onChange={(e) => handleCustomColorChange(e.target.value)}
                      className="w-7 h-7 rounded border-0 cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={customHex}
                      onChange={(e) => handleCustomColorChange(e.target.value)}
                      placeholder="#0d9488"
                      className="w-20 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 uppercase bg-transparent outline-none"
                    />
                  </div>
                </div>
                <span className="text-[11px] text-slate-400">Updates live across all buttons & badges</span>
              </div>
            </div>

            {/* 3. SIDEBAR SHELL APPEARANCE */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Layers size={17} className="text-indigo-500" />
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">3. Navigation Sidebar Shell</h3>
                </div>
                <span className="text-xs text-slate-400">Selected: {draft.sidebarTheme}</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Customize the sidebar look. You can choose classic enterprise navy, OLED pitch black, or clean white.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {SIDEBAR_OPTIONS.map((s) => {
                  const active = draft.sidebarTheme === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleSidebarChange(s.id)}
                      style={
                        active
                          ? {
                              borderColor: draft.primaryColor,
                              backgroundColor: `${draft.primaryColor}15`,
                              boxShadow: `0 0 0 2px ${draft.primaryColor}33`,
                            }
                          : undefined
                      }
                      className={`flex flex-col p-3 rounded-xl border text-left transition-all ${
                        active
                          ? ""
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <div
                        className="w-full h-8 rounded-md mb-2 flex items-center justify-center border shadow-xs"
                        style={{ backgroundColor: s.bg, borderColor: s.border }}
                      >
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: draft.primaryColor }}
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate w-full">
                        {s.name}
                      </span>
                      <span className="text-[10px] text-slate-400 truncate mt-0.5">{s.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. UI DENSITY & PADDING */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sliders size={17} style={{ color: draft.primaryColor }} />
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">4. Interface Information Density</h3>
                </div>
                <span className="text-xs text-slate-400">Selected: {draft.density}</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Controls vertical padding and row spacing. Compact fits more patients on busy triage monitors and doctor charts.
              </p>

              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    id: "compact",
                    label: "Compact",
                    tag: "High-Acuity",
                    desc: "Tight padding, maximum visible rows for OPD & EMR",
                    icon: <Minimize2 size={16} style={{ color: draft.primaryColor }} />,
                  },
                  {
                    id: "standard",
                    label: "Standard",
                    tag: "Balanced",
                    desc: "Standard balanced hospital desktop workstation",
                    icon: <Sliders size={16} className="text-blue-600 dark:text-blue-400" />,
                  },
                  {
                    id: "comfortable",
                    label: "Comfortable",
                    tag: "Touch / Tablet",
                    desc: "Spacious tap targets for nursing carts & bedside tablets",
                    icon: <Maximize2 size={16} className="text-indigo-600 dark:text-indigo-400" />,
                  },
                ].map((d) => {
                  const active = draft.density === d.id;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => handleDensityChange(d.id as any)}
                      style={
                        active
                          ? {
                              borderColor: draft.primaryColor,
                              backgroundColor: `${draft.primaryColor}15`,
                              boxShadow: `0 0 0 2px ${draft.primaryColor}33`,
                            }
                          : undefined
                      }
                      className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition-all ${
                        active
                          ? ""
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1.5">
                        {d.icon}
                        {active && <Check size={14} style={{ color: draft.primaryColor }} />}
                      </div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{d.label}</span>
                      <span className="text-[10px] font-semibold" style={{ color: draft.primaryColor }}>{d.tag}</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{d.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. COMPONENT GEOMETRY & CORNER RADIUS */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={17} className="text-amber-500" />
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">5. Component Border Radius</h3>
                </div>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{draft.radius}px</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Controls the curvature of buttons, cards, badges, and modals across all stations.
              </p>

              <div className="grid grid-cols-3 gap-3">
                {RADIUS_OPTIONS.map((r) => {
                  const active = draft.radius === r.value;
                  return (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => handleRadiusChange(r.value)}
                      style={{
                        borderRadius: `${r.value}px`,
                        ...(active
                          ? {
                              borderColor: draft.primaryColor,
                              backgroundColor: `${draft.primaryColor}15`,
                              boxShadow: `0 0 0 2px ${draft.primaryColor}33`,
                            }
                          : {}),
                      }}
                      className={`flex flex-col items-start p-3.5 border text-left transition-all ${
                        active
                          ? ""
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{r.label}</span>
                        <span className="text-[10px] font-mono font-semibold text-slate-400">{r.sublabel}</span>
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{r.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 6. FACILITY BRAND IDENTITY */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Building2 size={17} className="text-sky-500" />
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">6. Facility Brand Identity</h3>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Customize your facility's official name and the acronym badge displayed at the top left of the sidebar and topbar.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Hospital / Clinic Full Name</label>
                  <input
                    type="text"
                    value={draft.hospitalName}
                    onChange={(e) => handleIdentityChange("hospitalName", e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    placeholder="e.g. Debre Markos Comprehensive Referral Hospital"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Logo Acronym / Badge</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={draft.logoBadge}
                    onChange={(e) => handleIdentityChange("logoBadge", e.target.value)}
                    className="w-full px-3 py-2 text-sm font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 uppercase focus:outline-none focus:ring-1 focus:ring-teal-500"
                    placeholder="DM"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* ================= RIGHT PANEL: INTERACTIVE LIVE SANDBOX STUDIO (5 COLS) ================= */}
          <div className="lg:col-span-5 lg:sticky lg:top-4 space-y-4">
            
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
              
              {/* Studio Sandbox Header */}
              <div className="px-4 py-3 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye size={15} style={{ color: draft.primaryColor }} />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Interactive Live Sandbox Studio
                  </span>
                </div>
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: `${draft.primaryColor}18`,
                    color: draft.primaryColor,
                  }}
                >
                  Instant Feedback
                </span>
              </div>

              {/* LIVE SIMULATED INTERFACE */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 space-y-4">

                {/* Mock Topbar */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2 text-xs truncate">
                    <span className="text-slate-400 font-medium">Nova</span>
                    <span className="text-slate-300">/</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100 truncate">
                      {draft.hospitalName || "Nova HMS"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-semibold">
                      Role: Branch Admin
                    </span>
                    <div
                      className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shadow-xs"
                      style={{ backgroundColor: draft.primaryColor }}
                    >
                      {draft.logoBadge.slice(0, 1) || "A"}
                    </div>
                  </div>
                </div>

                {/* Mock Sidebar Slice & KPI Card Split */}
                <div className="grid grid-cols-12 gap-3 items-stretch">
                  
                  {/* Mock Sidebar slice */}
                  <div
                    className="col-span-5 rounded-xl p-3 border shadow-xs flex flex-col justify-between"
                    style={{
                      backgroundColor: draft.sidebarBg,
                      borderColor: draft.sidebarTheme === "white" ? "#e2e8f0" : "#1e293b",
                      borderRadius: `${Math.min(draft.radius, 12)}px`,
                    }}
                  >
                    <div>
                      {/* Logo row */}
                      <div className="flex items-center gap-2 mb-3">
                        <div
                          className="w-6 h-6 rounded flex items-center justify-center font-bold text-white text-[10px] shadow-xs"
                          style={{
                            backgroundColor: draft.primaryColor,
                            borderRadius: `${Math.min(draft.radius, 8)}px`,
                          }}
                        >
                          {draft.logoBadge || "DM"}
                        </div>
                        <span
                          className={`text-xs font-bold truncate ${
                            draft.sidebarTheme === "white" ? "text-slate-900" : "text-white"
                          }`}
                        >
                          {draft.hospitalName.split(" ")[0] || "Nova"}
                        </span>
                      </div>

                      {/* Mock Navigation links */}
                      <div className="space-y-1">
                        <div
                          className="px-2 py-1.5 text-[11px] font-semibold text-white flex items-center gap-1.5 shadow-xs"
                          style={{
                            backgroundColor: draft.primaryColor,
                            borderRadius: `${Math.min(draft.radius, 6)}px`,
                          }}
                        >
                          <Activity size={12} />
                          <span>OPD Queue</span>
                        </div>
                        <div
                          className={`px-2 py-1.5 text-[11px] font-medium flex items-center gap-1.5 ${
                            draft.sidebarTheme === "white" ? "text-slate-600" : "text-slate-400"
                          }`}
                        >
                          <HeartPulse size={12} />
                          <span>Doctor EMR</span>
                        </div>
                        <div
                          className={`px-2 py-1.5 text-[11px] font-medium flex items-center gap-1.5 ${
                            draft.sidebarTheme === "white" ? "text-slate-600" : "text-slate-400"
                          }`}
                        >
                          <ShieldCheck size={12} />
                          <span>Pharmacy Rx</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 mt-2 border-t border-white/10 text-[9px] text-slate-400 flex items-center gap-1">
                      <Clock size={10} /> 24/7 Shift Active
                    </div>
                  </div>

                  {/* Mock Metric Cards */}
                  <div className="col-span-7 space-y-2.5">
                    {/* Primary Highlight KPI Card */}
                    <div
                      className="p-3 text-white shadow-sm flex flex-col justify-between"
                      style={{
                        backgroundColor: draft.primaryColor,
                        borderRadius: `${Math.min(draft.radius, 12)}px`,
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-white/80">Active Inpatient Beds</span>
                        <Building2 size={13} className="text-white/80" />
                      </div>
                      <div className="mt-1">
                        <span className="text-xl font-extrabold text-white">88.4%</span>
                        <p className="text-[10px] text-white/80 mt-0.5">244 of 276 Beds Occupied</p>
                      </div>
                    </div>

                    {/* Secondary Accent Card */}
                    <div
                      className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs"
                      style={{ borderRadius: `${Math.min(draft.radius, 12)}px` }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-slate-500">Today's OPD Revenue</span>
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: draft.accentColor }}
                        />
                      </div>
                      <div className="mt-1">
                        <span className="text-lg font-bold text-slate-800 dark:text-slate-100">ETB 142,500</span>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                          +14% vs. Yesterday
                        </p>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Mock Queue Table with selected density */}
                <div
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs"
                  style={{ borderRadius: `${Math.min(draft.radius, 12)}px` }}
                >
                  <div className="px-3 py-2 bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      Live Triage Queue ({draft.density} density)
                    </span>
                    <span className="text-[10px] text-slate-400">3 waiting</span>
                  </div>
                  <table className="min-w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-semibold uppercase text-slate-400">
                        <th className="px-3 py-1.5">Patient / MRN</th>
                        <th className="px-3 py-1.5">Acuity</th>
                        <th className="px-3 py-1.5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {[
                        { name: "Almaz Kebede", mrn: "MRN-1042", acuity: "Urgent", status: "In Exam", color: "bg-red-100 text-red-700" },
                        { name: "Dawit Haile", mrn: "MRN-1043", acuity: "Priority", status: "Triage Done", color: "bg-amber-100 text-amber-700" },
                        { name: "Selamawit Tadesse", mrn: "MRN-1044", acuity: "Routine", status: "Waiting", color: "bg-teal-100 text-teal-700" },
                      ].map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className={densityRowPadding}>
                            <div className="font-semibold text-slate-800 dark:text-slate-100">{row.name}</div>
                            <div className="text-[10px] text-slate-400">{row.mrn}</div>
                          </td>
                          <td className={densityRowPadding}>
                            <span className="font-medium text-slate-600 dark:text-slate-300">{row.acuity}</span>
                          </td>
                          <td className={`${densityRowPadding} text-right`}>
                            <span
                              className={`text-[10px] px-2 py-0.5 font-bold uppercase rounded-full ${row.color}`}
                              style={{ borderRadius: `${Math.min(draft.radius, 12)}px` }}
                            >
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mock Buttons Sandbox */}
                <div
                  className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-2 shadow-xs"
                  style={{ borderRadius: `${Math.min(draft.radius, 12)}px` }}
                >
                  <button
                    type="button"
                    className="px-3 py-1.5 text-xs font-bold text-white shadow-xs"
                    style={{
                      backgroundColor: draft.primaryColor,
                      borderRadius: `${Math.min(draft.radius, 8)}px`,
                    }}
                  >
                    Primary Action
                  </button>

                  <button
                    type="button"
                    className="px-3 py-1.5 text-xs font-semibold border text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    style={{
                      borderColor: draft.primaryColor,
                      borderRadius: `${Math.min(draft.radius, 8)}px`,
                    }}
                  >
                    Outline Action
                  </button>

                  <span
                    className="text-[10px] px-2.5 py-1 font-bold text-white shadow-xs ml-auto"
                    style={{
                      backgroundColor: draft.accentColor,
                      borderRadius: `${Math.min(draft.radius, 16)}px`,
                    }}
                  >
                    Accent Pill Badge
                  </span>
                </div>

              </div>
            </div>

            {/* Persistence & Cross-Station Guarantee Note */}
            <div
              className="p-4 rounded-xl text-xs flex items-start gap-2.5 border"
              style={{
                backgroundColor: `${draft.primaryColor}10`,
                borderColor: `${draft.primaryColor}30`,
              }}
            >
              <CheckCircle2 size={16} style={{ color: draft.primaryColor }} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-100">Global Multi-Station Synchronization</p>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                  Saving will write the theme configuration to the secure tenant branding ledger. Any doctor, nurse, lab tech, or billing officer logging into this hospital will instantly inherit this customized appearance.
                </p>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
