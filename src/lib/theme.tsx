"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api, type Theme } from "./api";
import { useAuth } from "./auth";
import { loadPrefs, pick, PREFS_KEY, savePrefs } from "./prefs";

/**
 * Runs in <head> before the first paint, so a dark-theme reader never sees a flash of light paper.
 * Reads the theme from the preferences in localStorage. Until someone chooses, the site stays light.
 */
export const themeScript = `(function(){try{var p="light";var r=localStorage.getItem("${PREFS_KEY}");if(r){var t=JSON.parse(r).theme;if(t==="dark"||t==="system")p=t}var d=p==="dark"||(p==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light"}catch(e){document.documentElement.dataset.theme="light"}})()`;

function resolve(choice: Theme): "light" | "dark" {
  if (choice === "system") return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  return choice;
}

function apply(choice: Theme) {
  document.documentElement.dataset.theme = resolve(choice);
}

interface ThemeState {
  /** What the reader picked: light, dark, or follow the device. */
  theme: Theme;
  /** Apply a theme straight away, remember it in localStorage, and save it to the account when logged in. */
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeState | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [theme, setState] = useState<Theme>("light");
  const loggedIn = useRef(false);
  const adoptedFor = useRef<string | null>(null);

  const setTheme = useCallback((t: Theme) => {
    savePrefs({ theme: t });
    apply(t);
    setState(t);
    if (loggedIn.current) api.updateSettings({ theme: t }).catch(() => {});
  }, []);

  // On login, the account's saved settings replace the local copy, so they follow the reader between devices.
  useEffect(() => {
    loggedIn.current = !!user;
    if (!user) { adoptedFor.current = null; return; }
    if (adoptedFor.current === user.id) return;
    adoptedFor.current = user.id;
    api.getSettings()
      .then((s) => { const p = savePrefs(pick(s)); apply(p.theme); setState(p.theme); })
      .catch(() => {}); // no settings on the account yet: keep the local ones
  }, [user]);

  useEffect(() => {
    setState(loadPrefs().theme);
    // An earlier version kept the theme in a cookie; clear it.
    document.cookie = "mbooks_theme=; path=/; max-age=0";
    // Keep other open tabs in step when the theme changes in one of them.
    const onStorage = (e: StorageEvent) => {
      if (e.key !== PREFS_KEY) return;
      const t = loadPrefs().theme;
      apply(t);
      setState(t);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // "Match my device" keeps following the device while the page is open.
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}

export const THEME_OPTIONS: { value: Theme; label: string; short: string }[] = [
  { value: "light", label: "Light", short: "Light" },
  { value: "dark", label: "Dark", short: "Dark" },
  { value: "system", label: "Match my device", short: "Auto" },
];
