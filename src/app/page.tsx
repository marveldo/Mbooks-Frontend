"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type Book } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { BookCard, BookGridSkeleton } from "@/components/BookCard";
import { BookCover } from "@/components/BookCover";

const PER_PAGE = 24;

// Shown in the hero while the shelves are empty: an invitation, not pretend stock.
const INVITES = [
  { title: "Chapter One", author: "You" },
  { title: "Your Story Here", author: "A new author" },
  { title: "Write It. Shelve It.", author: "Mbooks" },
];

const TICKER = ["New on the shelves", "Yours to keep, forever", "Write page by page", "Import a PDF", "Independent & proud", "Read anywhere"];

const STEPS = [
  { n: "01", title: "Set the details", body: "Title, author, price and a cover. A minute, at most." },
  { n: "02", title: "Write, or import", body: "Compose each page in the builder, or drop in a PDF and we'll lay out the pages and contents." },
  { n: "03", title: "On the shelf", body: "Your book appears in the catalog the moment it's created. Keep editing whenever you like." },
];

export default function Home() {
  const { user } = useAuth();
  const [books, setBooks] = useState<Book[] | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setBooks(null);
    setError(null);
    api.listBooks(page, PER_PAGE).then(setBooks).catch((e) => setError(e.message));
  }, [page]);

  const publishHref = user ? "/books/new" : "/signup";
  const fan = books && books.length >= 3 && page === 1 ? books.slice(0, 3) : null;

  return (
    <>
      {/* ---------- Hero ---------- */}
      <section className="mx-auto grid max-w-[1200px] items-center gap-x-12 gap-y-16 overflow-x-clip px-4 pt-14 pb-20 sm:px-6 md:grid-cols-[1.15fr_1fr] md:pt-20">
        <div>
          {/* a shelf tag, like the ones tied to books on a shop table */}
          <p className="rise shelf-tag">
            <span className="shelf-tag-hole" aria-hidden />
            An independent bookshop, online
          </p>
          <h1 className="display rise mt-6 max-w-[11ch] !text-[clamp(44px,7.2vw,84px)] !leading-[0.98]" style={{ animationDelay: "80ms" }}>
            Books worth{" "}
            <span className="relative inline-block text-primary italic">
              pressing
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 160 12" fill="none" preserveAspectRatio="none" aria-hidden>
                <path className="draw" d="M2 8C28 2 52 11 80 6S132 2 158 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </span>{" "}
            into a friend&apos;s hands.
          </h1>
          <p className="rise mt-8 max-w-md text-lg leading-[1.7] text-on-surface-muted" style={{ animationDelay: "160ms" }}>
            Browse the catalog and keep every book you buy. Or pull up a chair and write your own, page by page.
          </p>
          <div className="rise mt-9 flex flex-wrap items-center gap-x-6 gap-y-3" style={{ animationDelay: "240ms" }}>
            <a href="#catalog" className="btn btn-primary">Browse the catalog</a>
            <Link href={publishHref} className="group inline-flex items-center gap-2 font-bold text-secondary">
              <span className="underline decoration-2 underline-offset-4">Publish a book</span>
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </div>
        </div>

        {/* Fanned covers + pinned note */}
        <div className="rise relative mx-auto aspect-[10/11] w-full max-w-[460px]" style={{ animationDelay: "200ms" }}>
          <span className="absolute inset-x-[6%] top-[10%] bottom-0 rounded-[12px] bg-soft" aria-hidden />
          <div className="group absolute inset-0">
            {(fan ?? INVITES).map((b, i) => {
              const pos = [
                "left-0 top-[15%] w-[40%] -rotate-[9deg] group-hover:-rotate-[13deg] group-hover:-translate-x-3",
                "right-0 top-[13%] w-[40%] rotate-[8deg] group-hover:rotate-[12deg] group-hover:translate-x-3",
                "left-[28%] top-[5%] z-10 w-[44%] group-hover:-translate-y-2",
              ][i];
              const cover = <BookCover title={b.title} author={b.author} url={fan?.[i].cover_url} />;
              return (
                <div key={b.title + i} className={`absolute transition-transform duration-500 ease-out ${pos}`} aria-hidden={!fan}>
                  {fan ? <Link href={`/books/${fan[i].id}`}>{cover}</Link> : cover}
                </div>
              );
            })}
          </div>

          {/* rotating stamp */}
          <div className="absolute -top-2 right-0 z-20 h-[104px] w-[104px] sm:-right-6" aria-hidden>
            <svg viewBox="0 0 100 100" className="spin-slow h-full w-full">
              <circle cx="50" cy="50" r="50" fill="#3F6A62" />
              <path id="stamp" d="M50 50m-36 0a36 36 0 1 1 72 0a36 36 0 1 1-72 0" fill="none" />
              <text fill="#FAF6EE" fontSize="10.5" fontWeight="700" letterSpacing="2.2" fontFamily="var(--font-inter)">
                <textPath href="#stamp">FRESH ON THE SHELF ✦ READ ✦ WRITE ✦</textPath>
              </text>
            </svg>
            <span className="absolute inset-0 grid place-items-center font-display text-3xl text-[#FAF6EE]">M</span>
          </div>

          {/* staff note */}
          <div className="note ruled absolute -bottom-6 left-0 z-20 w-[62%] -rotate-2 !px-5 !pt-5 !pb-3 text-sm shadow-spine sm:-left-8">
            <span className="tape" aria-hidden />
            <p className="font-display text-[17px] italic">
              {fan ? "“Start with the one in the middle. Trust us.”" : "“The shelves are fresh. Be the first name on them.”"}
            </p>
            <p className="text-xs font-bold tracking-wider uppercase opacity-70">— the Mbooks team</p>
          </div>
        </div>
      </section>

      {/* ---------- Ticker ---------- */}
      <div className="overflow-hidden border-y border-on-background bg-brand py-3 text-white" aria-hidden>
        <div className="ticker">
          {[...TICKER, ...TICKER, ...TICKER, ...TICKER].map((t, i) => (
            <span key={i} className="flex items-center font-display text-xl italic">
              <span className="px-6">{t}</span><span className="text-base not-italic opacity-70">✦</span>
            </span>
          ))}
        </div>
      </div>

      {/* ---------- Catalog ---------- */}
      <section id="catalog" className="mx-auto max-w-[1200px] scroll-mt-24 px-4 pt-24 sm:px-6">
        <div className="rule-double mb-12 flex flex-wrap items-end justify-between gap-4 pt-6">
          <div>
            <p className="eyebrow">№ 01 · The catalog</p>
            <h2 className="headline-lg mt-2 !text-[clamp(36px,5vw,56px)]">New on the shelves</h2>
          </div>
          {books && books.length > 0 && (
            <p className="font-display text-lg text-on-surface-muted italic">
              {books.length}{books.length === PER_PAGE ? "+" : ""} {books.length === 1 ? "title" : "titles"}{page > 1 ? `, page ${page}` : ""}
            </p>
          )}
        </div>

        {error && <div className="alert-error">{error}</div>}
        {!error && books === null && <BookGridSkeleton />}

        {books && books.length === 0 && page === 1 && (
          <div className="relative overflow-hidden rounded-[12px] border border-dashed border-neutral/60 px-6 py-16 text-center">
            {/* empty shelf */}
            <div className="mx-auto mb-8 flex h-24 max-w-sm items-end justify-center gap-1.5 border-b-[6px] border-on-surface/80" aria-hidden>
              {[["h-16", "bg-primary", ""], ["h-20", "bg-secondary", ""], ["h-14", "bg-soft", ""], ["h-[72px]", "bg-on-background", "origin-bottom-left rotate-[14deg] translate-x-2"]].map(([h, c, x], i) => (
                <span key={i} className={`w-5 rounded-t-[2px] ${h} ${c} ${x}`} />
              ))}
              <span className="ml-10 h-12 w-12 rounded-full border-2 border-dashed border-neutral/70" />
            </div>
            <p className="headline-md">Plenty of room on this shelf.</p>
            <p className="mx-auto mt-3 max-w-md text-on-surface-muted">Nobody has published here yet. The first book in the catalog could be yours.</p>
            <Link href={publishHref} className="btn btn-primary mt-7">Publish the first book</Link>
          </div>
        )}

        {books && books.length > 0 && (
          <div className="grid grid-cols-2 gap-x-6 gap-y-14 md:grid-cols-3 md:gap-x-10 lg:grid-cols-4">
            {books.map((b, i) => <BookCard key={b.id} book={b} index={(page - 1) * PER_PAGE + i} />)}
          </div>
        )}

        {books && (page > 1 || books.length === PER_PAGE) && (
          <div className="mt-14 flex items-center justify-center gap-3">
            <button className="btn btn-soft btn-sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>← Previous</button>
            <span className="px-3 font-display text-lg italic">Page {page}</span>
            <button className="btn btn-soft btn-sm" disabled={books.length < PER_PAGE} onClick={() => setPage((p) => p + 1)}>Next →</button>
          </div>
        )}
      </section>

      {/* ---------- Pull quote ---------- */}
      <section className="mt-24 bg-soft text-on-soft">
        <div className="relative mx-auto max-w-[900px] px-6 pt-28 pb-20 text-center">
          <span className="absolute top-5 left-1/2 -translate-x-1/2 font-display text-[130px] leading-none text-primary/25 select-none" aria-hidden>“</span>
          <p className="relative font-display text-[clamp(26px,3.6vw,40px)] leading-[1.25] font-medium">
            A bookshop is a room full of people <em className="text-primary">who haven&apos;t met yet</em>, and every one of them has something to tell you.
          </p>
          <p className="mt-6 text-[13px] font-bold tracking-[0.08em] uppercase opacity-70">Pinned above our till</p>
        </div>
      </section>

      {/* ---------- For writers ---------- */}
      <section className="mx-auto max-w-[1200px] px-4 pt-24 sm:px-6">
        <div className="rule-double pt-6">
          <p className="eyebrow">№ 02 · For writers</p>
          <h2 className="headline-lg mt-2 !text-[clamp(36px,5vw,56px)]">From blank page to bookshelf</h2>
        </div>

        <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-0 md:divide-x md:divide-outline">
          {STEPS.map((s) => (
            <li key={s.n} className="md:px-8 md:first:pl-0 md:last:pr-0">
              <span className="font-display text-[72px] leading-none font-medium text-primary">{s.n}</span>
              <h3 className="headline-sm mt-4">{s.title}</h3>
              <p className="mt-2 leading-relaxed text-on-surface-muted">{s.body}</p>
            </li>
          ))}
        </ol>

        <div className="mt-16 grid items-center gap-10 overflow-hidden rounded-[12px] bg-brand-green p-8 text-white md:grid-cols-[1fr_1.1fr] md:p-12 md:pr-0">
          <div>
            <h3 className="headline-lg">Write your book right here.</h3>
            <p className="mt-4 max-w-md leading-relaxed text-white/85">
              A quiet page, a proper toolbar and autosave. Chapters become your table of contents with one click.
            </p>
            <Link href={publishHref} className="btn btn-accent mt-8">Start a new book</Link>
          </div>

          {/* a little picture of the builder */}
          <div className="relative -mb-12 translate-y-2 md:-mb-24" aria-hidden>
            <div className="rounded-tl-[10px] bg-background p-3 shadow-[0_20px_50px_rgba(0,0,0,0.25)] md:rounded-tr-none">
              <div className="flex gap-3">
                <div className="hidden w-28 shrink-0 space-y-1.5 sm:block">
                  {["Page 1", "Page 2", "Page 3"].map((p, i) => (
                    <div key={p} className={`rounded-md px-2.5 py-2 text-[11px] font-bold ${i === 1 ? "bg-surface text-primary ring-1 ring-outline" : "text-on-surface-muted"}`}>
                      {p}
                      <span className="mt-1.5 block h-1 rounded bg-outline" style={{ width: `${[80, 60, 70][i]}%` }} />
                    </div>
                  ))}
                </div>
                <div className="min-h-[250px] flex-1 rounded-[4px] border border-outline bg-surface px-6 py-4 text-on-surface">
                  <div className="mb-4 flex gap-1.5 border-b border-outline pb-3 text-[11px] font-bold text-on-surface-muted">
                    {["B", "I", "U", "“ ”", "• List"].map((x, i) => <span key={x} className={`rounded px-2 py-1 ${i === 1 ? "bg-soft text-primary" : ""}`}>{x}</span>)}
                  </div>
                  <p className="font-display text-2xl font-medium">Chapter Two</p>
                  <p className="mt-2 font-display text-[15px] leading-relaxed text-on-surface-muted">
                    The rain came early that year, and with it the letters. She read the first one standing in the doorway, <em>still holding her keys</em><span className="caret ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 bg-primary" />
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
