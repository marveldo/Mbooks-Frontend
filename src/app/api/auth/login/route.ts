import { NextResponse } from "next/server";
import { BACKEND_URL, setSession } from "@/lib/server/session";

export async function POST(req: Request) {
  const body = await req.text();
  let upstream: Response;
  try {
    upstream = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ success: false, error: { message: "Couldn't reach the server." } }, { status: 502 });
  }

  const json = await upstream.json().catch(() => null);
  if (!upstream.ok || !json?.success) {
    return NextResponse.json(json ?? { success: false, error: { message: "Login failed." } }, { status: upstream.status || 500 });
  }

  // The tokens stay in httpOnly cookies; the browser only gets the user.
  const { access_token, refresh_token, user } = json.data;
  const res = NextResponse.json({ success: true, data: user });
  setSession(res, { access_token, refresh_token }, user);
  return res;
}
