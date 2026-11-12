import "server-only";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import type { LoginResult, User } from "@/lib/api";

export const BACKEND_URL = (process.env.BACKEND_URL ?? "https://book-store-api-8u7l.onrender.com").replace(/\/$/, "");

export const TOKEN_COOKIE = "mbooks_token";
export const REFRESH_COOKIE = "mbooks_refresh";
export const USER_COOKIE = "mbooks_user";

const base = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

/** When a JWT expires, in seconds since the epoch. Null if it isn't a decodable JWT. */
function expiresAt(token: string): number | null {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

const now = () => Math.floor(Date.now() / 1000);

/** True once the token is past (or within `skew` seconds of) its expiry. Unknown formats count as still good. */
export function isExpired(token: string, skew = 30): boolean {
  const exp = expiresAt(token);
  return exp !== null && exp - now() <= skew;
}

/**
 * The access token is short-lived (minutes) and the refresh token long-lived (days). All three cookies
 * live as long as the refresh token, so the session outlasts any one access token; the access token
 * inside is renewed with `renew()` when it runs out.
 */
export function setSession(res: NextResponse, tokens: { access_token: string; refresh_token?: string | null }, user: User) {
  const long = tokens.refresh_token ? expiresAt(tokens.refresh_token) : null;
  const short = expiresAt(tokens.access_token);
  const maxAge = Math.max(0, (long ?? short ?? now() + 60 * 60 * 24) - now());
  res.cookies.set(TOKEN_COOKIE, tokens.access_token, { ...base, maxAge });
  res.cookies.set(USER_COOKIE, JSON.stringify(user), { ...base, maxAge });
  if (tokens.refresh_token) res.cookies.set(REFRESH_COOKIE, tokens.refresh_token, { ...base, maxAge });
}

export function clearSession(res: NextResponse) {
  for (const name of [TOKEN_COOKIE, REFRESH_COOKIE, USER_COOKIE]) res.cookies.set(name, "", { ...base, maxAge: 0 });
}

export async function getToken(): Promise<string | null> {
  return (await cookies()).get(TOKEN_COOKIE)?.value || null;
}

export async function getRefreshToken(): Promise<string | null> {
  return (await cookies()).get(REFRESH_COOKIE)?.value || null;
}

export async function getUser(): Promise<User | null> {
  const store = await cookies();
  if (!store.get(TOKEN_COOKIE)?.value) return null;
  try { return JSON.parse(store.get(USER_COOKIE)?.value ?? "null"); } catch { return null; }
}

export type Renewal =
  | { ok: true; data: LoginResult }
  /** `dead`: the backend refused the refresh token, so the user has to log in again. Otherwise it was just unreachable. */
  | { ok: false; dead: boolean };

// Each refresh hands back a *new* refresh token, so requests that arrive together must share one
// call instead of each spending the old token. Results are kept briefly for the stragglers.
const inflight = new Map<string, Promise<Renewal>>();

/** Swap the refresh token for new tokens (POST /auth/refresh). The caller must store them with setSession(). */
export async function renew(): Promise<Renewal> {
  const refresh = await getRefreshToken();
  if (!refresh) return { ok: false, dead: true };

  let job = inflight.get(refresh);
  if (!job) {
    job = (async (): Promise<Renewal> => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/v1/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refresh }),
          cache: "no-store",
        });
        const json = await res.json().catch(() => null);
        if (res.ok && json?.success && json.data?.access_token) return { ok: true, data: json.data as LoginResult };
        return { ok: false, dead: res.status === 400 || res.status === 401 };
      } catch {
        return { ok: false, dead: false };
      }
    })();
    inflight.set(refresh, job);
    job.finally(() => setTimeout(() => inflight.delete(refresh), 15_000));
  }
  return job;
}

/**
 * The access token to use for a backend call, renewed first if it has run out.
 * `renewed` is set when new tokens were issued (store them with setSession on the response);
 * `ended` when the refresh token was refused (clear the session on the response).
 */
export async function freshToken(): Promise<{ token: string | null; renewed?: LoginResult; ended?: boolean }> {
  const token = await getToken();
  if (token && !isExpired(token)) return { token };
  if (!token && !(await getRefreshToken())) return { token: null };
  const r = await renew();
  if (r.ok) return { token: r.data.access_token, renewed: r.data };
  // Refused: carry on logged out. Unreachable: try the token we have and let the backend decide.
  return r.dead ? { token: null, ended: !!token } : { token };
}
