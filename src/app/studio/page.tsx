"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { api, type BookFilters } from "@/lib/api";
import { useInfiniteBooks } from "@/lib/useInfiniteBooks";
import { RequireAuth } from "@/components/RequireAuth";
import { BookCard } from "@/components/BookCard";
import { BookFiltersBar, hasFilters } from "@/components/BookFiltersBar";
import { InfiniteBookGrid } from "@/components/InfiniteBookGrid";

function Studio() {
  const [filters, setFilters] = useState<BookFilters>({});
  const [resets, setResets] = useState(0);
  const clearFilters = () => { setFilters({}); setResets((n) => n + 1); };

  const fetchPage = useCallback((page: number) => api.myLibrary({ ...filters, shelf: "written" }, page, 24), [filters]);
  const mine = useInfiniteBooks(fetchPage, JSON.stringify(filters));
  const filtered = hasFilters(filters);
  const nothingYet = !filtered && mine.books?.length === 0;

  return (
    <div className="mx-auto max-w-[1200px] px-4 pt-12 sm:px-6 md:pt-16">
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-outline pb-8">
        <div>
          <p className="eyebrow">My studio</p>
          <h1 className="headline-lg mt-2">Books you&apos;re writing</h1>
          <p className="mt-3 text-on-surface-muted">Open a book to keep writing its pages, edit its details or import a PDF.</p>
        </div>
        <Link href="/books/new" className="btn btn-primary">Start a new book</Link>
      </div>

      <section className="mt-10">
        {!nothingYet && <BookFiltersBar key={resets} value={filters} onChange={setFilters} placeholder="Search your books" />}
        <InfiniteBookGrid
          state={mine}
          render={(b) => (
            <div key={b.id}>
              <BookCard book={b} href={`/books/${b.id}/build`} />
              <div className="mt-3 flex gap-4 text-sm">
                <Link href={`/books/${b.id}/build`} className="btn-link">Open builder</Link>
                <Link href={`/books/${b.id}/read`} className="btn-link">Read</Link>
                <Link href={`/books/${b.id}`} className="btn-link">View</Link>
              </div>
            </div>
          )}
          empty={
            filtered ? (
              <div className="note mx-auto max-w-lg -rotate-1 text-center">
                <p className="headline-sm">None of your books match</p>
                <button className="btn btn-soft mt-5" onClick={clearFilters}>Clear the filters</button>
              </div>
            ) : (
              <div className="note mx-auto max-w-lg -rotate-1 text-center">
                <p className="headline-sm">Your shelf is empty</p>
                <p className="mt-2 text-sm">Every book starts with a title. Make one and the builder opens straight away.</p>
                <Link href="/books/new" className="btn btn-primary mt-5">Start a new book</Link>
              </div>
            )
          }
        />
      </section>

      <p className="mt-20 text-center text-sm">
        Looking for books you&apos;ve bought? <Link href="/library" className="btn-link">Open your library →</Link>
      </p>
    </div>
  );
}

export default function StudioPage() {
  return <RequireAuth><Studio /></RequireAuth>;
}
