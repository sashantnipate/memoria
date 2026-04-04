"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useTheme as useNextTheme } from "next-themes";
import { THEMES, ThemeConfig } from "@/lib/registry/theme";

const ThemeContext = createContext<{
  currentTheme: ThemeConfig;
  setThemeConfig: (id: string) => void;
} | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useNextTheme();
  
  // Default to the first theme in your registry
  const [currentTheme, setCurrentTheme] = useState<ThemeConfig>(THEMES[0]);

  const applyVars = (theme: ThemeConfig, mode: string | undefined) => {
    if (typeof window === "undefined") return;
    
    const root = document.documentElement;
    const vars = mode === "dark" ? theme.dark : theme.light;
    
    Object.entries(vars).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value);
    });
  };

  const setThemeConfig = (id: string) => {
    const theme = THEMES.find((t) => t.id === id);
    if (!theme) return;
    
    setCurrentTheme(theme);
    applyVars(theme, resolvedTheme);
    localStorage.setItem("user-custom-theme", id);
  };

  // Run once on mount to grab the user's saved preference
  useEffect(() => {
    const saved = localStorage.getItem("user-custom-theme");
    if (saved) {
      const theme = THEMES.find((t) => t.id === saved);
      if (theme) {
        setCurrentTheme(theme);
        applyVars(theme, resolvedTheme);
      }
    } else {
      // Apply default if nothing is saved
      applyVars(THEMES[0], resolvedTheme);
    }
  }, [resolvedTheme]);

  // CRITICAL FIX: We always return the Provider, even during SSR. 
  // No more `if (!mounted) return children`
  return (
    <ThemeContext.Provider value={{ currentTheme, setThemeConfig }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useThemeConfig = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeConfig must be used within a ThemeProvider");
  }
  return context;
};