"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, type Book, type Page, type TocEntry } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { RequireAuth } from "@/components/RequireAuth";
import { BookMark } from "@/components/Logo";
import { PageView } from "@/components/reader/PageView";

const SIZES = [17, 19, 21, 24];
const SIZE_KEY = "mbooks.read.size";
const placeKey = (bookId: string) => `mbooks.read.${bookId}`;

function stored(key: string): number {
  try { return Number(localStorage.getItem(key)) || 0; } catch { return 0; }
}
function store(key: string, value: number) {
  try { localStorage.setItem(key, String(value)); } catch { /* private mode: reading still works */ }
}

function Reader() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const uid = user?.id;
  const role = user?.role;

  const [book, setBook] = useState<Book | null>(null);
  const [access, setAccess] = useState<"checking" | "yes" | "no">("checking");
  const [toc, setToc] = useState<TocEntry[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [index, setIndex] = useState(1); // 1-based position in the book, which survives gaps in page numbers
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fatal, setFatal] = useState<string | null>(null);
  const [tocOpen, setTocOpen] = useState(false);
  const [size, setSize] = useState(1);
  const [goTo, setGoTo] = useState("1");

  const cache = useRef(new Map<number, Page>());
  const totalRef = useRef(0);
  const seq = useRef(0);

  /** The page at a position. Pages come back in page-number order, so asking for one per request gives us "the nth page". */
  const fetchIndex = useCallback(async (i: number): Promise<Page | null> => {
    const hit = cache.current.get(i);
    if (hit) return hit;
    const res = await api.listPages(id, i, 1);
    totalRef.current = res.total;
    setTotal(res.total);
    const p = res.pages[0] ?? null;
    if (p) cache.current.set(i, p);
    return p;
  }, [id]);

  const show = useCallback(async (i: number) => {
    const mine = ++seq.current;
    setLoading(true);
    setError(null);
    try {
      let n = Math.max(1, Math.floor(i) || 1);
      let p = await fetchIndex(n);
      if (!p && totalRef.current > 0) { n = Math.min(n, totalRef.current); p = await fetchIndex(n); } // past the end: last page
      if (mine !== seq.current) return;
      setIndex(n);
      setGoTo(String(n));
      setPage(p);
      window.scrollTo({ top: 0 });
      if (p) {
        store(placeKey(id), n);
        window.history.replaceState(null, "", `?page=${n}`);
        if (n < totalRef.current) fetchIndex(n + 1).catch(() => {}); // warm the next page
      }
    } catch (e) {
      if (mine === seq.current) setError(e instanceof ApiError ? e.message : "Couldn't load that page.");
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [fetchIndex, id]);

  /** Contents entries point at page numbers; find where that page sits in the book. */
  const jumpToPageNumber = useCallback(async (pageNumber: number) => {
    setTocOpen(false);
    const count = totalRef.current;
    if (!count) return;
    try {
      let hi = Math.min(pageNumber, count); // a page's position is never past its number
      const guess = await fetchIndex(hi);
      if (guess && guess.page_number > pageNumber) {
        let lo = 1;
        while (lo < hi) {
          const mid = Math.floor((lo + hi) / 2);
          const p = await fetchIndex(mid);
          if (p && p.page_number >= pageNumber) hi = mid; else lo = mid + 1;
        }
      }
      show(hi);
    } catch {
      show(Math.min(pageNumber, count));
    }
  }, [fetchIndex, show]);

  // Open the book: check it's ours to read, then load the contents and the page we were on.
  useEffect(() => {
    let off = false;
    cache.current.clear();
    totalRef.current = 0;
    setAccess("checking");
    setFatal(null);
    (async () => {
      try {
        const b = await api.getBook(id);
        if (off) return;
        setBook(b);
        let ok = role === "ADMIN" || (!!uid && uid === b.owner_id);
        if (!ok) ok = (await api.myLibrary()).some((x) => x.id === id);
        if (off) return;
        setAccess(ok ? "yes" : "no");
        if (!ok) return;
        api.getToc(id).then((t) => { if (!off) setToc([...t].sort((a, c) => a.position - c.position)); }).catch(() => {});
        const asked = Number(new URLSearchParams(window.location.search).get("page"));
        show(asked || stored(placeKey(id)) || 1);
      } catch (e) {
        if (!off) setFatal(e instanceof ApiError && e.status === 404 ? "We couldn't find that book." : "Couldn't open the book. Try again in a moment.");
      }
    })();
    return () => { off = true; };
  }, [id, uid, role, show]);

  useEffect(() => {
    const s = stored(SIZE_KEY);
    if (s >= 1 && s <= SIZES.length) setSize(s - 1);
  }, []);
  function resize(d: -1 | 1) {
    setSize((s) => { const n = Math.min(SIZES.length - 1, Math.max(0, s + d)); store(SIZE_KEY, n + 1); return n; });
  }

  const hasPrev = index > 1;
  const hasNext = total !== null && index < total;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if (e.key === "ArrowRight" && hasNext) show(index + 1);
      if (e.key === "ArrowLeft" && hasPrev) show(index - 1);
      if (e.key === "Escape") setTocOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasNext, hasPrev, index, show]);

  // ---- States before there's a page to show --------------------------------
  if (fatal) return <Centered><p className="headline-md">{fatal}</p><Link href="/" className="btn btn-soft mt-6">Back to the catalog</Link></Centered>;
  if (!book || access === "checking") return <Centered><p className="text-on-surface-muted">Opening the book…</p></Centered>;
  if (access === "no") {
    return (
      <Centered>
        <p className="eyebrow">Not in your library</p>
        <p className="headline-md mt-2">Buy “{book.title}” to read it</p>
        <p className="mt-2 max-w-md text-on-surface-muted">Once you&apos;ve paid for it, the book stays in your library and opens here.</p>
        <Link href={`/books/${book.id}`} className="btn btn-primary mt-6">See the book</Link>
      </Centered>
    );
  }

  // The chapter we're in: the last contents entry at or before this page.
  let here = -1;
  if (page) toc.forEach((e, i) => { if (e.page_number <= page.page_number) here = i; });
  const pct = total ? Math.round((index / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-outline bg-background/95 backdrop-blur">
        <div className="flex h-16 items-center gap-3 px-3 sm:px-4">
          <Link href={`/books/${book.id}`} className="flex shrink-0 items-center gap-2 text-sm font-bold text-on-surface-muted hover:text-primary" title="Back to the book">
            <BookMark size={28} /><span className="hidden sm:inline">Close</span>
          </Link>
          <span className="h-6 w-px shrink-0 bg-outline" />
          {toc.length > 0 && (
            <button className="btn btn-soft btn-sm shrink-0 lg:hidden" onClick={() => setTocOpen((o) => !o)} aria-expanded={tocOpen} aria-controls="reader-contents">Contents</button>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg leading-tight font-medium">{book.title}</p>
            <p className="truncate text-xs text-on-surface-muted">{here >= 0 ? toc[here].title : book.author}</p>
          </div>

          {total ? (
            <form className="hidden items-center gap-1.5 text-sm text-on-surface-muted sm:flex" onSubmit={(e) => { e.preventDefault(); show(Number(goTo)); }}>
              <label htmlFor="reader-goto">Page</label>
              <input
                id="reader-goto"
                type="number"
                min={1}
                max={total}
                value={goTo}
                onChange={(e) => setGoTo(e.target.value)}
                onBlur={() => setGoTo(String(index))}
                className="h-9 w-16 rounded-md border border-outline bg-surface px-2 text-center font-semibold text-on-surface tabular-nums"
              />
              <span>of {total}</span>
            </form>
          ) : null}

          <div className="flex shrink-0 items-center rounded-[8px] border border-outline" role="group" aria-label="Text size">
            <button className="h-9 w-9 text-sm font-bold disabled:opacity-30" disabled={size === 0} onClick={() => resize(-1)} aria-label="Smaller text">A</button>
            <span className="h-5 w-px bg-outline" />
            <button className="h-9 w-9 text-lg font-bold disabled:opacity-30" disabled={size === SIZES.length - 1} onClick={() => resize(1)} aria-label="Larger text">A</button>
          </div>
        </div>
        <div className="h-[3px] bg-surface-alt" role="progressbar" aria-label="Progress through the book" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
          <div className="h-full bg-primary transition-[width] duration-300" style={{ width: `${pct}%` }} />
        </div>
      </header>

      <div className="mx-auto flex max-w-[1240px]">
        {/* Contents */}
        {toc.length > 0 && (
          <>
            {tocOpen && <button className="fixed inset-0 z-30 bg-black/40 lg:hidden" aria-label="Close contents" onClick={() => setTocOpen(false)} />}
            <aside
              id="reader-contents"
              className={`fixed inset-y-0 left-0 z-40 w-[300px] max-w-[85vw] overflow-y-auto border-r border-outline bg-background p-4 transition-transform duration-200 lg:sticky lg:top-[67px] lg:bottom-auto lg:z-0 lg:h-[calc(100vh-67px)] lg:w-[280px] lg:shrink-0 lg:translate-x-0 lg:bg-transparent ${tocOpen ? "translate-x-0" : "-translate-x-full"}`}
            >
              <p className="px-2 pt-2 text-xs font-bold tracking-[0.08em] text-secondary uppercase">Contents</p>
              <ol className="mt-3 space-y-0.5">
                {toc.map((e, i) => (
                  <li key={e.id}>
                    <button
                      onClick={() => jumpToPageNumber(e.page_number)}
                      aria-current={i === here ? "true" : undefined}
                      className={`flex w-full items-baseline gap-3 rounded-md py-2 pr-2 text-left transition-colors ${i === here ? "bg-soft text-on-soft" : "hover:bg-surface-alt"}`}
                      style={{ paddingLeft: 8 + Math.min(e.level, 4) * 14 }}
                    >
                      <span className={`min-w-0 flex-1 ${e.level === 0 ? "font-display text-[17px] leading-snug font-medium" : "text-sm text-on-surface-muted"} ${i === here ? "text-on-soft" : ""}`}>{e.title}</span>
                      <span className="shrink-0 text-xs text-on-surface-muted tabular-nums">{e.page_number}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </aside>
          </>
        )}

        {/* Page */}
        <main className="min-w-0 flex-1 px-4 py-8 sm:px-8 sm:py-12">
          <div className="mx-auto max-w-[760px]">
            {error ? (
              <div className="py-16 text-center">
                <p className="headline-sm">{error}</p>
                <button className="btn btn-soft mt-5" onClick={() => show(index)}>Try again</button>
              </div>
            ) : total === 0 ? (
              <div className="note mx-auto mt-10 max-w-lg -rotate-1 text-center">
                <p className="headline-sm">Nothing to read yet</p>
                <p className="mt-2 text-sm">This book doesn&apos;t have any pages so far. Check back once the author has written some.</p>
              </div>
            ) : !page ? (
              <PageSkeleton />
            ) : (
              <>
                <article
                  className={`rounded-[4px] border border-outline bg-surface px-6 py-10 shadow-[0_1px_2px_rgba(31,34,48,0.06)] transition-opacity sm:px-14 sm:py-14 ${loading ? "opacity-50" : ""}`}
                  aria-busy={loading}
                >
                  <PageView content={page.content} fontSize={SIZES[size]} />
                  <p className="mt-12 text-center font-display text-sm text-on-surface-muted tabular-nums">— {page.page_number} —</p>
                </article>

                <nav className="mt-6 flex items-center justify-between gap-3" aria-label="Pages">
                  <button className="btn btn-soft" disabled={!hasPrev || loading} onClick={() => show(index - 1)}>← Previous</button>
                  <span className="text-sm text-on-surface-muted tabular-nums sm:hidden">{index} of {total}</span>
                  <span className="hidden text-xs text-on-surface-muted sm:inline">Use ← → to turn pages</span>
                  <button className="btn btn-primary" disabled={!hasNext || loading} onClick={() => show(index + 1)}>Next →</button>
                </nav>

                {!hasNext && (
                  <div className="mt-14 text-center">
                    <div className="ornament">⁂</div>
                    <p className="headline-sm mt-6">The end</p>
                    <p className="mt-2 text-on-surface-muted">Finished “{book.title}”? Tell other readers what you thought.</p>
                    <Link href={`/books/${book.id}#comments`} className="btn btn-accent mt-5">Leave a comment</Link>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="animate-pulse rounded-[4px] border border-outline bg-surface px-6 py-10 sm:px-14 sm:py-14" aria-label="Loading the page">
      <div className="h-8 w-2/3 rounded bg-surface-alt" />
      {[100, 96, 92, 98, 70, 100, 94, 88, 60].map((w, i) => (
        <div key={i} className="mt-4 h-4 rounded bg-surface-alt" style={{ width: `${w}%` }} />
      ))}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">{children}</div>;
}

export default function ReadPage() {
  return <RequireAuth><Reader /></RequireAuth>;
}
