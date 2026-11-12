import { NextResponse, type NextRequest } from "next/server";
import type { LoginResult } from "@/lib/api";
import { BACKEND_URL, clearSession, freshToken, renew, setSession } from "@/lib/server/session";

export const dynamic = "force-dynamic";

/**
 * Proxies /api/v1/* to the backend, adding the bearer token from the httpOnly cookie.
 * (The backend also answers CORS preflights with 403, so the browser can't call it directly anyway.)
 *
 * Access tokens only last minutes. When ours has run out we swap the refresh token for a new pair
 * (POST /auth/refresh) before calling, or after a 401, and store the new pair on the way out, so
 * the browser never notices.
 */
async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const joined = path.join("/");

  // Tokens must land in cookies, never in JS: login and refresh only happen server-side.
  if (joined === "auth/login" || joined === "auth/refresh") {
    return NextResponse.json({ success: false, error: { message: "Use /api/auth/login" } }, { status: 404 });
  }

  const baseHeaders = new Headers();
  for (const h of ["content-type", "accept"]) {
    const v = req.headers.get(h);
    if (v) baseHeaders.set(h, v);
  }

  const session = await freshToken();
  let token = session.token;
  let renewed: LoginResult | undefined = session.renewed;

  // Uploads are streamed straight through; everything else is small enough to hold, so it can be sent twice.
  const hasBody = !["GET", "HEAD"].includes(req.method);
  const streamed = hasBody && (req.headers.get("content-type") ?? "").startsWith("multipart/");
  const body = !hasBody ? undefined : streamed ? req.body : await req.arrayBuffer();

  const call = () => {
    const headers = new Headers(baseHeaders);
    if (token) headers.set("authorization", `Bearer ${token}`);
    return fetch(`${BACKEND_URL}/api/v1/${joined}${req.nextUrl.search}`, {
      method: req.method,
      headers,
      body,
      // @ts-expect-error -- required by Node fetch when streaming a request body
      duplex: streamed ? "half" : undefined,
      cache: "no-store",
    });
  };

  let upstream: Response;
  try {
    upstream = await call();
    // Expired sooner than its own clock said (or wasn't a readable JWT): renew once and resend.
    if (upstream.status === 401 && token && !renewed && !streamed) {
      const r = await renew();
      if (r.ok) {
        renewed = r.data;
        token = r.data.access_token;
        upstream = await call();
      }
    }
  } catch {
    return NextResponse.json({ success: false, error: { message: "Couldn't reach the server." } }, { status: 502 });
  }

  const res = new NextResponse(upstream.body, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json", "cache-control": "no-store" },
  });
  if (upstream.status === 401 && token) clearSession(res);
  else if (renewed) setSession(res, renewed, renewed.user);
  else if (session.ended) clearSession(res);
  return res;
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as DELETE };
