"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { AuthCard } from "@/components/AuthCard";
import { useToast } from "@/components/Toast";

function LoginForm() {
  const { login, user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const asked = useSearchParams().get("next");
  // Only follow `next` to a path on this site, never to another one ("//evil.example").
  const next = asked && /^\/(?![/\\])/.test(asked) ? asked : "/studio";

  // Already logged in (here or in another tab): this page has nothing to offer.
  useEffect(() => { if (user) router.replace(next); }, [user, router, next]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const u = await login(email.trim(), password);
      toast.success(`Welcome back, ${u.username}.`, "Your shelves are just as you left them.");
      router.refresh(); // drop any cached logged-out redirects; the effect above then sends us to `next`
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  if (user) return <div className="mx-auto max-w-[1200px] px-6 py-24 text-on-surface-muted">Taking you in…</div>;

  return (
    <AuthCard
      eyebrow="Welcome back"
      title="Log in to Mbooks."
      intro="Pick up where you left off: your library, your orders, and the books you're writing."
      aside={<p className="text-center text-sm text-on-surface-muted">New here? <Link href="/signup" className="btn-link">Create an account</Link></p>}
    >
      <form onSubmit={submit} className="space-y-5">
        {error && <div className="alert-error" role="alert">{error}</div>}
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" className="input" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" type="password" className="input" autoComplete="current-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button className="btn btn-primary w-full" disabled={busy}>{busy ? "Logging in…" : "Log in"}</button>
      </form>
    </AuthCard>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
