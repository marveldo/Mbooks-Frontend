"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";

const cols = [
  { title: "Browse", links: [["Catalog", "/"], ["My studio", "/studio"]] },
  { title: "Write", links: [["Publish a book", "/books/new"], ["Create an account", "/signup"], ["Log in", "/login"]] },
];

export function Footer() {
  const pathname = usePathname();
  if (pathname?.endsWith("/build") || pathname?.endsWith("/read")) return null;
  return (
    <footer className="relative mt-24 overflow-hidden bg-brand text-white">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 pt-16 pb-10 sm:px-6 md:grid-cols-[2fr_1fr_1fr]">
        <div>
          <Logo light />
          <p className="mt-5 max-w-sm font-display text-xl leading-snug italic text-white/90">
            Read something good. Then write something better.
          </p>
        </div>
        {cols.map((c) => (
          <div key={c.title} className="text-sm">
            <p className="mb-4 text-[13px] font-bold tracking-[0.08em] uppercase text-white/70">{c.title}</p>
            <ul className="space-y-2.5">
              {c.links.map(([label, href]) => (
                <li key={href}><Link href={href} className="underline-offset-4 hover:underline">{label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mx-auto flex max-w-[1200px] items-center justify-between border-t border-white/25 px-4 py-5 text-sm text-white/75 sm:px-6">
        <span>© {new Date().getFullYear()} Mbooks</span>
        <a href="#top" className="font-bold text-white hover:underline" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Back to top ↑</a>
      </div>

      {/* oversized wordmark, cropped by the bottom edge */}
      <p className="pointer-events-none -mb-[0.24em] text-center font-display text-[clamp(96px,25vw,340px)] leading-none font-bold tracking-tight text-black/10 select-none" aria-hidden>
        Mbooks
      </p>
    </footer>
  );
}
