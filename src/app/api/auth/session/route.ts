import { NextResponse } from "next/server";
import { BACKEND_URL, clearSession, getRefreshToken, getToken, getUser, renew, setSession } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ success: true, data: await getUser() }, { headers: { "Cache-Control": "no-store" } });
}

/** Re-read the user from the API and rewrite the session cookies. Called after a profile update. */
export async function POST() {
  const [token, current] = await Promise.all([getToken(), getUser()]);
  if (!token || !current) return NextResponse.json({ success: true, data: null });

  // Refreshing loads the user from the database and puts a changed email or role into new tokens.
  if (await getRefreshToken()) {
    const r = await renew();
    if (r.ok) {
      const res = NextResponse.json({ success: true, data: r.data.user });
      setSession(res, r.data, r.data.user);
      return res;
    }
    if (r.dead) {
      const res = NextResponse.json({ success: true, data: null });
      clearSession(res);
      return res;
    }
  }

  // No refresh token (a session from before refresh existed) or the backend was unreachable.
  try {
    const upstream = await fetch(`${BACKEND_URL}/api/v1/users/${current.id}`, {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const json = await upstream.json().catch(() => null);
    if (upstream.ok && json?.success && json.data) {
      const res = NextResponse.json({ success: true, data: json.data });
      setSession(res, { access_token: token }, json.data);
      return res;
    }
  } catch { /* fall through to the user we already have */ }
  return NextResponse.json({ success: true, data: current });
}
