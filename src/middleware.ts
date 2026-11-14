import { NextResponse, type NextRequest } from "next/server";

/** Pages that only make sense logged out. */
const GUEST_ONLY = new Set(["/login", "/signup"]);

/** Only follow `next` to a path on this site ("/studio"), never to another one ("//evil.example"). */
function safeNext(next: string | null): string {
  return next && /^\/(?![/\\])/.test(next) ? next : "/studio";
}

export function middleware(req: NextRequest) {
  const loggedIn = !!req.cookies.get("mbooks_token")?.value;
  const url = req.nextUrl.clone();

  if (GUEST_ONLY.has(req.nextUrl.pathname)) {
    // Already logged in: there's nothing to do on the login or sign-up page.
    if (!loggedIn) return NextResponse.next();
    const dest = new URL(safeNext(req.nextUrl.searchParams.get("next")), req.nextUrl.origin);
    return NextResponse.redirect(dest);
  }

  // Send logged-out visitors to /login before protected pages even render.
  if (!loggedIn) {
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(req.nextUrl.pathname)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/signup", "/studio", "/books/new", "/books/:id/build", "/books/:id/read", "/orders", "/payments", "/payments/callback", "/settings"],
};
