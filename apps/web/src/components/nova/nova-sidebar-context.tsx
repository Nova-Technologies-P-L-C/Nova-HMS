"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface SidebarContextValue {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  toggleCollapsed: () => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  toggleMobile: () => void;
}

const NovaSidebarContext = createContext<SidebarContextValue>({
  isCollapsed: false,
  setIsCollapsed: () => {},
  toggleCollapsed: () => {},
  isMobileOpen: false,
  setIsMobileOpen: () => {},
  toggleMobile: () => {},
});

export function NovaSidebarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsedState] = useState<boolean>(false);
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("nova_sidebar_collapsed");
      if (stored !== null) {
        setIsCollapsedState(stored === "true");
      }
    } catch {
      // Ignore SSR or local storage error
    }
  }, []);

  const setIsCollapsed = (collapsed: boolean) => {
    setIsCollapsedState(collapsed);
    try {
      localStorage.setItem("nova_sidebar_collapsed", String(collapsed));
    } catch {
      // Ignore
    }
  };

  const toggleCollapsed = () => {
    setIsCollapsed(!isCollapsed);
  };

  const toggleMobile = () => {
    setIsMobileOpen((prev) => !prev);
  };

  return (
    <NovaSidebarContext.Provider
      value={{
        isCollapsed,
        setIsCollapsed,
        toggleCollapsed,
        isMobileOpen,
        setIsMobileOpen,
        toggleMobile,
      }}
    >
      {children}
    </NovaSidebarContext.Provider>
  );
}

export function useNovaSidebar() {
  return useContext(NovaSidebarContext);
}
