"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { api, type BookFilters, type Shelf } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useInfiniteBooks } from "@/lib/useInfiniteBooks";
import { RequireAuth } from "@/components/RequireAuth";
import { BookCard } from "@/components/BookCard";
import { BookFiltersBar, hasFilters } from "@/components/BookFiltersBar";
import { InfiniteBookGrid } from "@/components/InfiniteBookGrid";

const PER_PAGE = 24;

const SHELVES: { value: Shelf; label: string; empty: string; cta: { href: string; label: string } }[] = [
  { value: "all", label: "All my books", empty: "Books you buy or write end up here.", cta: { href: "/books", label: "Browse the catalog" } },
  { value: "bought", label: "Bought", empty: "Books you pay for land here, ready to read.", cta: { href: "/books", label: "Browse the catalog" } },
  { value: "written", label: "Written by me", empty: "Books you create show up here.", cta: { href: "/books/new", label: "Start a new book" } },
];

function Library() {
  const { user } = useAuth();
  const [shelf, setShelf] = useState<Shelf>("all");
  const [filters, setFilters] = useState<BookFilters>({});
  const [resets, setResets] = useState(0);
  const clearFilters = () => { setFilters({}); setResets((n) => n + 1); };

  const fetchPage = useCallback((page: number) => api.myLibrary({ ...filters, shelf }, page, PER_PAGE), [filters, shelf]);
  const library = useInfiniteBooks(fetchPage, JSON.stringify({ ...filters, shelf }));
  const current = SHELVES.find((s) => s.value === shelf)!;
  const filtered = hasFilters(filters);

  return (
    <div className="mx-auto max-w-[1200px] px-4 pt-12 sm:px-6 md:pt-16">
      <div className="rule-double mb-10 flex flex-wrap items-end justify-between gap-6 pt-6">
        <div>
          <p className="eyebrow">Your shelf</p>
          <h1 className="headline-lg mt-2">My library</h1>
          <p className="mt-2 text-on-surface-muted">Every book you&apos;ve bought or written, ready to read.</p>
        </div>
        {library.books && (
          <p className="font-display text-lg text-on-surface-muted italic">
            {library.total} {library.total === 1 ? "book" : "books"}{filtered ? " found" : ""}
          </p>
        )}
      </div>

      <BookFiltersBar key={resets} value={filters} onChange={setFilters} placeholder="Search your library">
        <div role="tablist" aria-label="Shelf" className="flex flex-wrap gap-2">
          {SHELVES.map((s) => (
            <button
              key={s.value}
              role="tab"
              aria-selected={shelf === s.value}
              className={`btn btn-sm ${shelf === s.value ? "btn-primary" : "btn-soft"}`}
              onClick={() => setShelf(s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </BookFiltersBar>

      <InfiniteBookGrid
        state={library}
        render={(b) => {
          const mine = !!user && b.owner_id === user.id;
          return (
            <div key={b.id}>
              <BookCard book={b} href={`/books/${b.id}/read`} badge={mine ? "Written by you" : undefined} />
              <div className="mt-3 flex gap-4 text-sm">
                <Link href={`/books/${b.id}/read`} className="btn-link">Read</Link>
                {mine && <Link href={`/books/${b.id}/build`} className="btn-link">Open builder</Link>}
                <Link href={`/books/${b.id}`} className="btn-link">Details</Link>
              </div>
            </div>
          );
        }}
        empty={
          filtered ? (
            <div className="note mx-auto max-w-md -rotate-1 text-center">
              <p className="headline-sm">Nothing on this shelf matches</p>
              <p className="mt-2 text-sm">Try fewer words, or widen the price range.</p>
              <button className="btn btn-soft mt-5" onClick={clearFilters}>Clear the filters</button>
            </div>
          ) : (
            <div className="note mx-auto max-w-md -rotate-1 text-center">
              <p className="headline-sm">This shelf is empty</p>
              <p className="mt-2 text-sm">{current.empty}</p>
              <Link href={current.cta.href} className="btn btn-primary mt-5">{current.cta.label}</Link>
            </div>
          )
        }
      />
    </div>
  );
}

export default function LibraryPage() {
  return <RequireAuth><Library /></RequireAuth>;
}
