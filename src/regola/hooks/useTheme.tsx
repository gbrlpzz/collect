// Vendored snapshot from @gbrlpzz/regola (private, proprietary upstream).
// Licensed under Apache-2.0 as part of collect.
// Source: https://github.com/gbrlpzz/regola  .  Refreshed by `regola-sync`.
// Do not edit here expecting changes to reach upstream.

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemeMode = "light" | "dark" | "system";
export type SurfaceRole = "contributor" | "admin";

interface ThemeContextValue {
  theme: ThemeMode;
  resolvedTheme: "light" | "dark";
  surface: SurfaceRole;
  setTheme: (mode: ThemeMode) => void;
  setSurface: (role: SurfaceRole) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: ThemeMode;
  defaultSurface?: SurfaceRole;
  storageKey?: string;
}

export function ThemeProvider({
  children,
  defaultTheme = "light",
  defaultSurface = "contributor",
  storageKey = "regola-theme",
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return defaultTheme;
    try {
      const stored = localStorage.getItem(storageKey);
      return (stored as ThemeMode) || defaultTheme;
    } catch {
      return defaultTheme;
    }
  });

  const [surface, setSurfaceState] = useState<SurfaceRole>(defaultSurface);

  const [systemIsDark, setSystemIsDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = (e: MediaQueryListEvent) => setSystemIsDark(e.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  const resolvedTheme: "light" | "dark" =
    surface === "admin"
      ? "dark"
      : theme === "system"
        ? systemIsDark
          ? "dark"
          : "light"
        : theme;

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.setAttribute("data-theme", resolvedTheme);
    root.setAttribute("data-surface", surface);
    root.style.colorScheme = resolvedTheme;
  }, [resolvedTheme, surface]);

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
    try {
      localStorage.setItem(storageKey, mode);
    } catch {
      // ignore
    }
  };

  const setSurface = (role: SurfaceRole) => {
    setSurfaceState(role);
  };

  const toggleTheme = () => {
    setTheme(resolvedTheme === "light" ? "dark" : "light");
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        surface,
        setTheme,
        setSurface,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
