"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, EMPTY_DOC, type Book, type Page } from "@/lib/api";
import { canEdit, useAuth } from "@/lib/auth";
import { RequireAuth } from "@/components/RequireAuth";
import { BookMark } from "@/components/Logo";
import { BookDetailsForm } from "@/components/BookDetailsForm";
import { PageEditor } from "@/components/builder/PageEditor";
import { TocPanel } from "@/components/builder/TocPanel";
import { PdfPanel } from "@/components/builder/PdfPanel";
import { snippet, wordCount } from "@/components/builder/doc";
import { useToast } from "@/components/Toast";

type Tab = "write" | "contents" | "details" | "import";
type SaveState = "saved" | "unsaved" | "saving" | "error";

const TABS: { id: Tab; label: string }[] = [
  { id: "write", label: "Write" },
  { id: "contents", label: "Contents" },
  { id: "details", label: "Details" },
  { id: "import", label: "Import PDF" },
];

function Builder() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();

  const [book, setBook] = useState<Book | null>(null);
  const [pages, setPages] = useState<Page[] | null>(null);
  const [current, setCurrent] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>("write");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pageBusy, setPageBusy] = useState(false);

  const drafts = useRef(new Map<number, string>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadPages = useCallback(async () => {
    const ps = await api.allPages(id);
    setPages(ps);
    setCurrent((c) => (c !== null && ps.some((p) => p.page_number === c) ? c : ps[0]?.page_number ?? null));
  }, [id]);

  useEffect(() => {
    api.getBook(id)
      .then((b) => { setBook(b); return loadPages(); })
      .catch((e) => setLoadError(e instanceof ApiError && e.status === 404 ? "We couldn't find that book." : e.message));
  }, [id, loadPages]);

  // ---- Saving -------------------------------------------------------------
  const flush = useCallback(async () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    if (drafts.current.size === 0) return;
    const batch = [...drafts.current.entries()];
    drafts.current.clear();
    setSaveState("saving");
    try {
      for (const [n, content] of batch) {
        const saved = await api.updatePage(id, n, content);
        setPages((ps) => ps?.map((p) => (p.page_number === n ? { ...p, ...saved, content } : p)) ?? ps);
      }
      setSaveState(drafts.current.size ? "unsaved" : "saved");
    } catch {
      // Put the failed drafts back so nothing is lost; the next edit or Ctrl+S retries.
      for (const [n, c] of batch) if (!drafts.current.has(n)) drafts.current.set(n, c);
      setSaveState("error");
      toast.error("Couldn't save your page", "Your words are safe here. We'll retry on your next edit, or press Ctrl+S.");
    }
  }, [id, toast]);

  const onChange = useCallback((json: string) => {
    if (current === null) return;
    drafts.current.set(current, json);
    setSaveState("unsaved");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 1200);
  }, [current, flush]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); flush(); }
    };
    const onLeave = (e: BeforeUnloadEvent) => { if (drafts.current.size) { e.preventDefault(); } };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onLeave);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("beforeunload", onLeave); };
  }, [flush]);

  // ---- Page actions -------------------------------------------------------
  function selectPage(n: number) {
    flush();
    setCurrent(n);
    setTab("write");
  }

  async function addPage() {
    await flush();
    setPageBusy(true);
    try {
      const n = Math.max(0, ...(pages ?? []).map((p) => p.page_number)) + 1;
      const page = await api.createPage(id, n, EMPTY_DOC);
      setPages((ps) => [...(ps ?? []), page].sort((a, b) => a.page_number - b.page_number));
      setCurrent(page.page_number);
      setTab("write");
      toast.info(`Page ${page.page_number} added`, "A fresh sheet. Off you go.");
    } catch (e) {
      toast.error("Couldn't add a page", e instanceof Error ? e.message : undefined);
    } finally {
      setPageBusy(false);
    }
  }

  async function deletePage(n: number) {
    if (!window.confirm(`Delete page ${n}? This can't be undone.`)) return;
    drafts.current.delete(n);
    setPageBusy(true);
    try {
      await api.deletePage(id, n);
      const rest = (pages ?? []).filter((p) => p.page_number !== n);
      setPages(rest);
      const next = rest.find((p) => p.page_number > n) ?? rest[rest.length - 1];
      setCurrent(next?.page_number ?? null);
      toast.info(`Page ${n} deleted`);
    } catch (e) {
      toast.error("Couldn't delete the page", e instanceof Error ? e.message : undefined);
    } finally {
      setPageBusy(false);
    }
  }

  // ---- Render -------------------------------------------------------------
  if (loadError) {
    return <Centered><p className="headline-md">{loadError}</p><Link href="/studio" className="btn btn-soft mt-6">Back to my studio</Link></Centered>;
  }
  if (!book || !pages) return <Centered><p className="text-on-surface-muted">Opening the builder…</p></Centered>;
  if (!canEdit(user, book.owner_id)) {
    return (
      <Centered>
        <p className="headline-md">This book isn&apos;t yours to edit.</p>
        <p className="mt-2 text-on-surface-muted">Only the person who created it (or an admin) can open the builder.</p>
        <Link href={`/books/${book.id}`} className="btn btn-soft mt-6">View the book</Link>
      </Centered>
    );
  }

  const page = pages.find((p) => p.page_number === current) ?? null;
  const pageContent = page ? drafts.current.get(page.page_number) ?? page.content : "";
  const totalWords = pages.reduce((n, p) => n + wordCount(drafts.current.get(p.page_number) ?? p.content), 0);

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Top bar */}
      <header className="flex h-16 shrink-0 items-center gap-4 border-b border-outline bg-background px-4">
        <Link href="/studio" className="flex items-center gap-2 text-sm font-bold text-on-surface-muted hover:text-primary" title="Back to my studio">
          <BookMark size={28} /><span className="hidden sm:inline">Studio</span>
        </Link>
        <span className="h-6 w-px bg-outline" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg leading-tight font-medium">{book.title}</p>
          <p className="truncate text-xs text-on-surface-muted">{book.author} · {pages.length} page{pages.length === 1 ? "" : "s"} · {totalWords.toLocaleString()} words</p>
        </div>
        <SaveBadge state={saveState} onRetry={flush} />
        {pages.length > 0 && <Link href={`/books/${book.id}/read`} className="btn btn-soft btn-sm hidden sm:inline-flex" onClick={() => flush()}>Read</Link>}
        <Link href={`/books/${book.id}`} className="btn btn-soft btn-sm hidden sm:inline-flex" onClick={() => flush()}>View book</Link>
      </header>

      {/* Tabs */}
      <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-outline bg-background px-4" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => { flush(); setTab(t.id); }}
            className={`border-b-2 px-4 py-3 text-sm font-bold whitespace-nowrap ${tab === t.id ? "border-primary text-primary" : "border-transparent text-on-surface-muted hover:text-on-surface"}`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="flex min-h-0 flex-1">
        {/* Page list */}
        <aside className="hidden w-[260px] shrink-0 flex-col border-r border-outline bg-surface-alt md:flex">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <span className="text-xs font-bold tracking-[0.08em] text-secondary uppercase">Pages</span>
            <span className="text-xs text-on-surface-muted">{pages.length}</span>
          </div>
          <ol className="flex-1 space-y-1 overflow-y-auto px-2 pb-2">
            {pages.map((p) => {
              const active = tab === "write" && p.page_number === current;
              const text = snippet(drafts.current.get(p.page_number) ?? p.content, 60);
              return (
                <li key={p.page_number}>
                  <button
                    onClick={() => selectPage(p.page_number)}
                    className={`w-full rounded-md px-3 py-2.5 text-left transition-colors ${active ? "bg-surface shadow-sm ring-1 ring-outline" : "hover:bg-surface/60"}`}
                  >
                    <span className={`block text-xs font-bold ${active ? "text-primary" : "text-on-surface-muted"}`}>Page {p.page_number}</span>
                    <span className={`mt-0.5 block truncate text-sm ${text ? "text-on-surface" : "text-neutral italic"}`}>{text || "Blank page"}</span>
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="border-t border-outline p-3">
            <button className="btn btn-primary btn-sm w-full" onClick={addPage} disabled={pageBusy}>+ Add page</button>
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1 overflow-y-auto">
          {tab === "write" && (
            <div className="mx-auto max-w-[820px] px-4 py-6 sm:px-8 sm:py-10">
              {/* Mobile page picker */}
              <div className="mb-4 flex gap-2 md:hidden">
                <select className="input min-h-10 flex-1 py-2" value={current ?? ""} onChange={(e) => selectPage(Number(e.target.value))} aria-label="Page">
                  {pages.map((p) => <option key={p.page_number} value={p.page_number}>Page {p.page_number}</option>)}
                </select>
                <button className="btn btn-primary btn-sm" onClick={addPage} disabled={pageBusy}>+ Page</button>
              </div>

              {page ? (
                <>
                  <div className="mb-3 flex items-center justify-between text-sm text-on-surface-muted">
                    <span className="eyebrow">Page {page.page_number}</span>
                    <div className="flex items-center gap-4">
                      <span>{wordCount(pageContent).toLocaleString()} words</span>
                      <button className="font-semibold text-error hover:underline" onClick={() => deletePage(page.page_number)} disabled={pageBusy}>Delete page</button>
                    </div>
                  </div>
                  <article className="rounded-[4px] border border-outline bg-surface px-6 pt-2 pb-16 shadow-[0_1px_2px_rgba(31,34,48,0.06)] sm:px-14">
                    <PageEditor key={`${id}-${page.page_number}`} bookId={id} content={pageContent} onChange={onChange} />
                  </article>
                  <p className="mt-4 text-center text-xs text-on-surface-muted">Saves automatically · Ctrl/⌘ + S to save now</p>
                </>
              ) : (
                <EmptyBook onAdd={addPage} onImport={() => setTab("import")} busy={pageBusy} />
              )}
            </div>
          )}

          {tab === "contents" && (
            <div className="px-4 py-10 sm:px-8">
              <TocPanel bookId={id} pages={pages.map((p) => ({ ...p, content: drafts.current.get(p.page_number) ?? p.content }))} onJump={selectPage} />
            </div>
          )}

          {tab === "details" && (
            <div className="mx-auto max-w-[760px] px-4 py-10 sm:px-8">
              <p className="eyebrow">Details</p>
              <h2 className="headline-md mt-2 mb-8">Book details</h2>
              <div className="card">
                <BookDetailsForm
                  key={book.updated_at}
                  initial={book}
                  compact
                  submitLabel="Save details"
                  busyLabel="Saving…"
                  onSubmit={async (input) => { setBook(await api.updateBook(book.id, input)); toast.success("Details saved"); }}
                />
              </div>
              <div className="mt-12 rounded-[12px] border border-outline p-6">
                <p className="font-bold">Delete this book</p>
                <p className="mt-1 text-sm text-on-surface-muted">Removes the book with all its pages, table of contents and comments.</p>
                <button
                  className="btn btn-danger btn-sm mt-4"
                  onClick={async () => {
                    if (!window.confirm(`Delete “${book.title}” for good?`)) return;
                    try { await api.deleteBook(book.id); toast.info("Book deleted", `“${book.title}” is off the shelf.`); router.push("/studio"); }
                    catch (e) { toast.error("Couldn't delete the book", e instanceof Error ? e.message : undefined); }
                  }}
                >
                  Delete book
                </button>
              </div>
            </div>
          )}

          {tab === "import" && (
            <div className="px-4 py-10 sm:px-8">
              <PdfPanel bookId={id} pageCount={pages.length} onDone={() => {
                drafts.current.clear();
                setSaveState("saved");
                loadPages();
                api.getBook(id).then(setBook).catch(() => {}); // the import may have set the cover from page 1
              }} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function SaveBadge({ state, onRetry }: { state: SaveState; onRetry: () => void }) {
  if (state === "error") return <button onClick={onRetry} className="chip bg-error text-on-error">Not saved · Retry</button>;
  const map = { saved: ["Saved", "bg-soft text-on-soft"], unsaved: ["Unsaved changes", "bg-soft text-on-soft"], saving: ["Saving…", "bg-soft text-on-soft"] } as const;
  const [label, cls] = map[state];
  return (
    <span className={`chip ${cls}`} aria-live="polite">
      <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${state === "saved" ? "bg-success" : "bg-tertiary"}`} />
      {label}
    </span>
  );
}

function EmptyBook({ onAdd, onImport, busy }: { onAdd: () => void; onImport: () => void; busy: boolean }) {
  return (
    <div className="mx-auto max-w-lg pt-12 text-center">
      <div className="note -rotate-1 text-left">
        <p className="headline-sm">A blank book</p>
        <p className="mt-2 text-sm leading-relaxed">
          Every book starts with page one. Write it here, or import a PDF and we&apos;ll lay out the pages and table of contents for you.
        </p>
      </div>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button className="btn btn-primary" onClick={onAdd} disabled={busy}>Write page 1</button>
        <button className="btn btn-soft" onClick={onImport}>Import a PDF</button>
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">{children}</div>;
}

export default function BuildPage() {
  return <RequireAuth><Builder /></RequireAuth>;
}
