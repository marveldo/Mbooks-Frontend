"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { THEME_OPTIONS, useTheme } from "@/lib/theme";
import { Logo } from "./Logo";
import { useToast } from "./Toast";
import type { Theme } from "@/lib/api";

/** Everything a logged-in person can reach. Lives in the profile menu, not the navbar. */
const MENU: { href: string; label: string; hint: string; icon: React.ReactNode }[] = [
  { href: "/books/new", label: "New book", hint: "Start writing", icon: <path d="M10 4v12M4 10h12" /> },
  { href: "/studio", label: "My studio", hint: "Books you write and own", icon: <path d="M10 5.5C8 3.8 5 3.8 2.5 4.5v10c2.5-.7 5.5-.7 7.5 1 2-1.7 5-1.7 7.5-1v-10c-2.5-.7-5.5-.7-7.5 1zM10 5.5v10" /> },
  { href: "/orders", label: "Orders", hint: "What you've ordered", icon: <path d="M4 6.5h12l-1 9.5H5zM7 6.5V5a3 3 0 016 0v1.5" /> },
  { href: "/payments", label: "Payments", hint: "Receipts", icon: <path d="M5 2.5h10v15l-2.5-1.5L10 17.5 7.5 16 5 17.5zM7.5 7h5M7.5 10.5h5" /> },
  { href: "/settings", label: "Settings", hint: "Account and preferences", icon: <path d="M3 6h7M14 6h3M3 14h3M10 14h7M12 4v4M8 12v4" /> },
];

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full bg-primary font-display font-bold text-on-primary ring-2 ring-background outline outline-1 outline-primary"
      style={{ width: size, height: size, fontSize: size * 0.48 }}
      aria-hidden
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

/** Light / Dark / Auto, as a small segmented control. */
function ThemeSwitch({ theme, onPick }: { theme: Theme; onPick: (t: Theme) => void }) {
  return (
    <div className="inline-flex gap-0.5 rounded-full bg-surface-alt p-0.5" role="radiogroup" aria-label="Theme">
      {THEME_OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={theme === o.value}
          title={o.label}
          onClick={() => onPick(o.value)}
          className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${theme === o.value ? "bg-surface text-primary shadow-sm ring-1 ring-outline" : "text-on-surface-muted hover:text-on-surface"}`}
        >
          {o.short}
        </button>
      ))}
    </div>
  );
}

/** A navbar link. The current page's link turns terracotta with a hand-drawn underline. */
function NavLink({ href, active, idle = "text-on-background", children }: { href: string; active: boolean; idle?: string; children: React.ReactNode }) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={`relative font-bold ${active ? "text-primary" : `${idle} hover:text-primary`}`}>
      {children}
      {active && (
        <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 60 6" fill="none" preserveAspectRatio="none" aria-hidden>
          <path d="M1 4C12 1 22 5 32 3S50 1 59 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )}
    </Link>
  );
}

export function Nav() {
  const { user, ready, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const { theme, setTheme } = useTheme();
  const [sheet, setSheet] = useState(false); // phone menu
  const [menu, setMenu] = useState(false); // desktop profile menu
  const menuRef = useRef<HTMLDivElement>(null);

  // Close both menus whenever the route changes.
  useEffect(() => { setSheet(false); setMenu(false); }, [pathname]);

  // Profile menu: close on outside click or Escape.
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenu(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenu(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [menu]);

  // The builder and the reader have their own chrome.
  if (pathname?.endsWith("/build") || pathname?.endsWith("/read")) return null;

  async function signOut() {
    setMenu(false);
    await logout();
    toast.info("You're logged out", "See you at the next chapter.");
    router.push("/");
    router.refresh();
  }

  const bar = "absolute left-1/2 block h-[2.5px] -translate-x-1/2 rounded-full bg-on-soft transition-all duration-300";

  return (
    <header className="sticky top-0 z-30 border-b border-outline bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />

        {/* Desktop */}
        <div className="hidden items-center justify-end gap-4 md:flex">
          {ready && (user ? (
            <div className="relative" ref={menuRef}>
              <button
                className={`flex items-center gap-2.5 rounded-full py-1 pr-3 pl-1 transition-colors ${menu ? "bg-soft" : "hover:bg-soft"}`}
                aria-haspopup="menu"
                aria-expanded={menu}
                onClick={() => setMenu((m) => !m)}
              >
                <Avatar name={user.username} />
                <span className="max-w-[140px] truncate text-sm font-bold">{user.username}</span>
                <svg width="12" height="12" viewBox="0 0 12 12" className={`text-on-surface-muted transition-transform duration-200 ${menu ? "rotate-180" : ""}`} aria-hidden>
                  <path d="M2.5 4.5L6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {menu && (
                <div role="menu" className="menu-in absolute top-[calc(100%+10px)] right-0 w-[300px] origin-top-right overflow-hidden rounded-[12px] border border-outline bg-surface shadow-[0_2px_4px_rgba(31,34,48,0.06),0_18px_40px_rgba(31,34,48,0.16)]">
                  <div className="flex items-center gap-3 bg-soft px-4 py-4 text-on-soft">
                    <Avatar name={user.username} size={44} />
                    <div className="min-w-0">
                      <p className="truncate font-display text-xl leading-tight font-medium">{user.username}</p>
                      <p className="truncate text-sm opacity-75">{user.email}</p>
                    </div>
                  </div>
                  <div className="p-2">
                    {MENU.map((m) => {
                      const active = pathname === m.href;
                      return (
                        <Link key={m.href} href={m.href} role="menuitem" className={`group flex items-center gap-3 rounded-[8px] px-3 py-2.5 transition-colors ${active ? "bg-surface-alt" : "hover:bg-surface-alt"}`}>
                          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full transition-colors ${active ? "bg-primary text-on-primary" : "bg-soft text-on-soft group-hover:bg-primary group-hover:text-on-primary"}`}>
                            <Icon>{m.icon}</Icon>
                          </span>
                          <span className="min-w-0">
                            <span className={`block font-bold ${active ? "text-primary" : ""}`}>{m.label}</span>
                            <span className="block truncate text-xs text-on-surface-muted">{m.hint}</span>
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-outline px-5 py-3">
                    <span className="text-sm font-bold">Theme</span>
                    <ThemeSwitch theme={theme} onPick={setTheme} />
                  </div>
                  <div className="border-t border-outline p-2">
                    <button role="menuitem" onClick={signOut} className="flex w-full items-center gap-3 rounded-[8px] px-3 py-2.5 text-left font-bold text-error hover:bg-surface-alt">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-alt">
                        <Icon><path d="M8 3.5H4.5v13H8M12.5 6.5L16 10l-3.5 3.5M16 10H8" /></Icon>
                      </span>
                      Log out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <NavLink href="/login" active={pathname === "/login"} idle="text-secondary">Log in</NavLink>
              {pathname === "/signup"
                ? <NavLink href="/signup" active>Create account</NavLink>
                : <Link href="/signup" className="btn btn-primary btn-sm ml-2">Create account</Link>}
            </>
          ))}
        </div>

        {/* Phone: icon toggle only */}
        <div className="flex items-center md:hidden">
          <button
            className="relative h-11 w-11 rounded-[10px] bg-soft transition-colors hover:bg-soft-hover"
            aria-label={sheet ? "Close menu" : "Open menu"}
            aria-expanded={sheet}
            aria-controls="mobile-menu"
            onClick={() => setSheet((o) => !o)}
          >
            {/* three lines of "text" that fold into an X */}
            <span className={`${bar} ${sheet ? "top-[21px] w-5 rotate-45" : "top-[14px] w-5"}`} />
            <span className={`${bar} ${sheet ? "top-[21px] w-5 opacity-0" : "top-[21px] w-5"}`} />
            <span className={`${bar} ${sheet ? "top-[21px] w-5 -rotate-45" : "top-[28px] w-3 -translate-x-[10px]"}`} />
          </button>
        </div>
      </div>

      {sheet && (
        <div id="mobile-menu" className="menu-in max-h-[calc(100vh-72px)] overflow-y-auto border-t border-outline bg-background px-4 pt-2 pb-5 shadow-[0_18px_30px_rgba(31,34,48,0.08)] md:hidden">
          {user ? (
            <>
              <div className="flex items-center gap-3 border-b border-outline py-4">
                <Avatar name={user.username} size={44} />
                <div className="min-w-0">
                  <p className="truncate font-display text-xl font-medium">{user.username}</p>
                  <p className="truncate text-sm text-on-surface-muted">{user.email}</p>
                </div>
              </div>
              <nav className="flex flex-col">
                {MENU.map((m) => (
                  <Link key={m.href} href={m.href} className={`flex items-center gap-3 border-b border-outline py-3.5 ${pathname === m.href ? "text-primary" : ""}`}>
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-soft text-on-soft"><Icon>{m.icon}</Icon></span>
                    <span className="font-display text-xl font-medium">{m.label}</span>
                    <span className="ml-auto text-on-surface-muted">→</span>
                  </Link>
                ))}
              </nav>
              <div className="flex items-center justify-between gap-3 border-b border-outline py-4">
                <span className="font-display text-xl font-medium">Theme</span>
                <ThemeSwitch theme={theme} onPick={setTheme} />
              </div>
              <button className="btn btn-soft mt-5 w-full" onClick={signOut}>Log out</button>
            </>
          ) : (
            <div className="mt-3 grid gap-3">
              <div className="flex items-center justify-between gap-3 border-b border-outline pb-4">
                <span className="font-display text-xl font-medium">Theme</span>
                <ThemeSwitch theme={theme} onPick={setTheme} />
              </div>
              <Link href="/signup" className="btn btn-primary">Create account</Link>
              <Link href="/login" className="btn btn-soft">Log in</Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
