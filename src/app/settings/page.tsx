"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { api, ApiError, type Settings, type Theme } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { RequireAuth } from "@/components/RequireAuth";
import { useToast } from "@/components/Toast";
import { useTheme } from "@/lib/theme";
import { loadPrefs, pick, savePrefs } from "@/lib/prefs";

const LANGUAGES: [string, string][] = [["en", "English"], ["fr", "Français"], ["yo", "Yorùbá"], ["ig", "Igbo"], ["ha", "Hausa"], ["pl", "Polski"], ["cs", "Čeština"]];
const THEMES: [Theme, string][] = [["light", "Light"], ["dark", "Dark"], ["system", "Match my device"]];

function Section({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-6 border-t border-outline py-10 md:grid-cols-[260px_1fr] md:gap-12">
      <div>
        <h2 className="headline-sm">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-on-surface-muted">{intro}</p>
      </div>
      <div>{children}</div>
    </section>
  );
}

function SettingsPage() {
  const { user, refresh, logout } = useAuth();
  const toast = useToast();
  const { setTheme } = useTheme();
  const router = useRouter();

  // ---- Account
  const [username, setUsername] = useState(user?.username ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [accErrors, setAccErrors] = useState<Record<string, string>>({});
  const [accBusy, setAccBusy] = useState(false);
  const accDirty = !!user && (username.trim() !== user.username || email.trim() !== user.email);

  async function saveAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const errs: Record<string, string> = {};
    if (username.trim().length < 3) errs.username = "At least 3 characters.";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) errs.email = "Enter a valid email address.";
    setAccErrors(errs);
    if (Object.keys(errs).length) return;

    // Only send what changed; the API rejects nothing here but there's no reason to resend.
    const patch: { username?: string; email?: string } = {};
    if (username.trim() !== user.username) patch.username = username.trim();
    if (email.trim() !== user.email) patch.email = email.trim();

    setAccBusy(true);
    try {
      await api.updateUser(user.id, patch);
      await refresh();
      toast.success("Account updated", patch.username ? `You're now ${patch.username}.` : "Your email has been changed.");
    } catch (err) {
      if (err instanceof ApiError) {
        setAccErrors(err.fieldErrors());
        toast.error("Account not updated", err.status === 409 ? "That username or email is already taken." : err.message);
      } else toast.error("Account not updated");
    } finally {
      setAccBusy(false);
    }
  }

  // ---- Preferences
  // Shown from the local copy first, then refreshed from the account. Every change saves to both as it's made.
  const [prefs, setPrefs] = useState<Settings | null>(null);
  const zones = useMemo(() => {
    try { return (Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf("timeZone"); } catch { return ["Africa/Lagos", "UTC"]; }
  }, []);

  useEffect(() => {
    setPrefs(loadPrefs());
    api.getSettings().then((s) => setPrefs(savePrefs(pick(s)))).catch(() => {});
  }, []);

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => {
    setPrefs((p) => (p ? { ...p, [k]: v } : p));
    if (k === "theme") { setTheme(v as Theme); return; } // applies it, and saves it locally and to the account
    savePrefs({ [k]: v });
    api.updateSettings({ [k]: v }).catch((err) => {
      toast.error("Couldn't save that to your account", err instanceof ApiError ? err.message : "It's still saved on this device.");
    });
  };

  // ---- Delete
  const [confirmText, setConfirmText] = useState("");
  const [delBusy, setDelBusy] = useState(false);

  async function deleteAccount() {
    if (!user || confirmText !== user.username) return;
    setDelBusy(true);
    try {
      await api.deleteUser(user.id);
      await logout();
      toast.info("Account deleted", "Sorry to see you go.");
      router.push("/");
      router.refresh();
    } catch (err) {
      toast.error("Couldn't delete your account", err instanceof ApiError ? err.message : undefined);
      setDelBusy(false);
    }
  }

  if (!user) return null;
  const languages = prefs && !LANGUAGES.some(([c]) => c === prefs.language) ? [...LANGUAGES, [prefs.language, prefs.language] as [string, string]] : LANGUAGES;
  const zoneList = prefs && !zones.includes(prefs.time_zone) ? [prefs.time_zone, ...zones] : zones;

  return (
    <div className="mx-auto max-w-[1000px] px-4 pt-12 sm:px-6 md:pt-16">
      <div className="rule-double pt-6 pb-10">
        <h1 className="headline-lg">Settings</h1>
        <p className="mt-2 text-on-surface-muted">Your account and how Mbooks behaves for you.</p>
      </div>

      <Section title="Account" intro="The name other readers see on your comments, and the email you log in with.">
        <form onSubmit={saveAccount} noValidate className="card space-y-5">
          <div>
            <label className="label" htmlFor="username">Username</label>
            <input id="username" className="input" maxLength={50} value={username} onChange={(e) => setUsername(e.target.value)} aria-invalid={!!accErrors.username} />
            {accErrors.username && <p className="field-error">{accErrors.username}</p>}
          </div>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" className="input" maxLength={255} value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!accErrors.email} />
            {accErrors.email && <p className="field-error">{accErrors.email}</p>}
          </div>
          <div className="flex items-center gap-4">
            <button className="btn btn-primary" disabled={!accDirty || accBusy}>{accBusy ? "Saving…" : "Save account"}</button>
            {accDirty && !accBusy && (
              <button type="button" className="btn-link text-sm" onClick={() => { setUsername(user.username); setEmail(user.email); setAccErrors({}); }}>Undo changes</button>
            )}
          </div>
        </form>
      </Section>

      <Section title="Preferences" intro="Saved to your account, with a copy in this browser so they apply instantly.">
        {!prefs ? <p className="text-on-surface-muted">Loading your preferences…</p> : (
          <div className="card space-y-7">
            <fieldset>
              <legend className="label">Theme</legend>
              <div className="inline-flex flex-wrap gap-1 rounded-[10px] bg-surface-alt p-1" role="radiogroup">
                {THEMES.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={prefs.theme === value}
                    onClick={() => set("theme", value)}
                    className={`rounded-[8px] px-4 py-2 text-sm font-bold transition-colors ${prefs.theme === value ? "bg-surface text-primary shadow-sm ring-1 ring-outline" : "text-on-surface-muted hover:text-on-surface"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="hint">Changes straight away.</p>
            </fieldset>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="language">Language</label>
                <select id="language" className="input" value={prefs.language} onChange={(e) => set("language", e.target.value)}>
                  {languages.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="tz">Time zone</label>
                <select id="tz" className="input" value={prefs.time_zone} onChange={(e) => set("time_zone", e.target.value)}>
                  {zoneList.map((z) => <option key={z} value={z}>{z.replace(/_/g, " ")}</option>)}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between gap-6">
              <div>
                <p className="font-semibold" id="notif-label">Email notifications</p>
                <p className="text-sm text-on-surface-muted">News about your orders and account.</p>
              </div>
              <button type="button" role="switch" aria-checked={prefs.email_notifications} aria-labelledby="notif-label" className="switch" onClick={() => set("email_notifications", !prefs.email_notifications)} />
            </div>

            <p className="flex items-center gap-2 border-t border-outline pt-5 text-sm text-on-surface-muted">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
              Saved automatically.
            </p>
          </div>
        )}
      </Section>

      <Section title="Delete account" intro="This removes your account for good. It can't be undone.">
        <div className="rounded-[12px] border border-error/40 bg-surface p-6">
          <label className="label" htmlFor="confirm">Type <span className="font-bold text-error">{user.username}</span> to confirm</label>
          <input id="confirm" className="input" autoComplete="off" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
          <button className="btn btn-danger mt-4" disabled={confirmText !== user.username || delBusy} onClick={deleteAccount}>
            {delBusy ? "Deleting…" : "Delete my account"}
          </button>
        </div>
      </Section>
    </div>
  );
}

export default function Page() {
  return <RequireAuth><SettingsPage /></RequireAuth>;
}
