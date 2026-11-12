"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { AuthCard } from "@/components/AuthCard";
import { flashToast } from "@/components/Toast";

function passwordProblem(pw: string): string | null {
  if (pw.length < 8) return "At least 8 characters.";
  if (!/[A-Z]/.test(pw)) return "Add an uppercase letter.";
  if (!/[a-z]/.test(pw)) return "Add a lowercase letter.";
  if (!/[^A-Za-z0-9]/.test(pw)) return "Add a special character, like ! or #.";
  return null;
}

export default function SignupPage() {
  const { login, user } = useAuth();

  // Logged in (just signed up, or already in another tab): off to the studio with a full page load.
  // A client-side navigation can follow a stale "you're logged out" redirect and never arrive.
  useEffect(() => { if (user) window.location.replace("/studio"); }, [user]);
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const pwErr = passwordProblem(form.password);
    if (pwErr) { setErrors({ password: pwErr }); return; }
    setBusy(true);
    setErrors({});
    setError(null);
    try {
      await api.signup(form.username.trim(), form.email.trim(), form.password);
      const u = await login(form.email.trim(), form.password);
      // The effect above now reloads into the studio; leave the welcome for that page to show.
      flashToast("success", `Glad you're here, ${u.username}.`, "Your account is ready. Time to fill a shelf.");
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors());
        setError(err.status === 409 ? "That username or email is already taken." : err.message);
      } else setError("Something went wrong.");
      setBusy(false);
    }
  }

  if (user) return <div className="mx-auto max-w-[1200px] px-6 py-24 text-on-surface-muted">Taking you in…</div>;

  return (
    <AuthCard
      eyebrow="Welcome"
      title="Glad you're here."
      intro="Make an account to keep track of your orders, keep every book you buy in your library, and publish your own."
      aside={<p className="text-center text-sm text-on-surface-muted">Already have an account? <Link href="/login" className="btn-link">Log in</Link></p>}
    >
      <form onSubmit={submit} className="space-y-5" noValidate>
        {error && <div className="alert-error" role="alert">{error}</div>}
        <div>
          <label className="label" htmlFor="username">Username</label>
          <input id="username" className="input" autoComplete="username" required minLength={3} maxLength={50} value={form.username} onChange={set("username")} aria-invalid={!!errors.username} />
          {errors.username && <p className="field-error">{errors.username}</p>}
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" className="input" autoComplete="email" required value={form.email} onChange={set("email")} aria-invalid={!!errors.email} />
          {errors.email && <p className="field-error">{errors.email}</p>}
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" type="password" className="input" autoComplete="new-password" required value={form.password} onChange={set("password")} aria-invalid={!!errors.password} />
          {errors.password ? <p className="field-error">{errors.password}</p> : <p className="hint">8+ characters with an uppercase letter, a lowercase letter and a special character.</p>}
        </div>
        <button className="btn btn-primary w-full" disabled={busy}>{busy ? "Creating your account…" : "Create account"}</button>
      </form>
    </AuthCard>
  );
}
