import type { Settings } from "./api";

/**
 * Preferences are stored on the account (GET/PUT /me/settings) and mirrored in this browser's
 * localStorage. The local copy is what applies the theme before the page paints, and it is all
 * a logged-out visitor has.
 */
export const PREFS_KEY = "mbooks.prefs";

function localZone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Lagos"; } catch { return "Africa/Lagos"; }
}

export function defaultPrefs(): Settings {
  return { theme: "light", language: "en", time_zone: localZone(), email_notifications: true };
}

export function loadPrefs(): Settings {
  const base = defaultPrefs();
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return base;
    const p = JSON.parse(raw) as Partial<Settings>;
    return {
      theme: p.theme === "dark" || p.theme === "system" || p.theme === "light" ? p.theme : base.theme,
      language: typeof p.language === "string" && p.language ? p.language : base.language,
      time_zone: typeof p.time_zone === "string" && p.time_zone ? p.time_zone : base.time_zone,
      email_notifications: typeof p.email_notifications === "boolean" ? p.email_notifications : base.email_notifications,
    };
  } catch {
    return base; // storage blocked or corrupted: fall back to defaults
  }
}

/** Just the four preference fields from an API settings object. */
export function pick(s: Settings): Settings {
  return { theme: s.theme, language: s.language, time_zone: s.time_zone, email_notifications: s.email_notifications };
}

export function savePrefs(patch: Partial<Settings>): Settings {
  const next = { ...loadPrefs(), ...patch };
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(next)); } catch { /* private mode: keep going without persisting */ }
  return next;
}
