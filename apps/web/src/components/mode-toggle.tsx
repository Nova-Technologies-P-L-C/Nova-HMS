"use client";

import { Button } from "@my-better-t-app/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@my-better-t-app/ui/components/dropdown-menu";
import { Moon, Sun, Monitor, Check } from "lucide-react";
import { useTheme } from "next-themes";
import * as React from "react";
import { useNovaTheme } from "@/components/nova/nova-theme-context";

export function ModeToggle({ className }: { className?: string }) {
  const { setTheme: setNextTheme } = useTheme();
  const { theme, setMode } = useNovaTheme();

  const activeMode = theme?.mode ?? "system";

  const handleSelect = (mode: "light" | "dark" | "system") => {
    try {
      setMode(mode);
    } catch {}
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className={
              className ??
              "h-8 w-8 p-0 rounded-md border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            }
          />
        }
      >
        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" />
        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-teal-400" />
        <span className="sr-only">Toggle theme</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg p-1 min-w-36 z-50">
        <DropdownMenuItem onClick={() => handleSelect("light")} className="cursor-pointer text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded px-2.5 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sun className="h-3.5 w-3.5 text-amber-500" />
            <span>Light</span>
          </div>
          {activeMode === "light" && <Check className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSelect("dark")} className="cursor-pointer text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded px-2.5 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Moon className="h-3.5 w-3.5 text-teal-400" />
            <span>Dark</span>
          </div>
          {activeMode === "dark" && <Check className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSelect("system")} className="cursor-pointer text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded px-2.5 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Monitor className="h-3.5 w-3.5 text-blue-500" />
            <span>System</span>
          </div>
          {activeMode === "system" && <Check className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
