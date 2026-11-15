"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, type BookFilters, type BookSort } from "@/lib/api";
import { useInfiniteBooks } from "@/lib/useInfiniteBooks";
import { BookCard, BookGridSkeleton } from "@/components/BookCard";
import { BookFiltersBar, hasFilters } from "@/components/BookFiltersBar";
import { InfiniteBookGrid } from "@/components/InfiniteBookGrid";

const PER_PAGE = 24;
const SORTS: BookSort[] = ["newest", "oldest", "title", "price_asc", "price_desc"];

/** The filters live in the address (/books?q=ink&sort=price_asc), so searches can be shared and the navbar can link here. */
function filtersFrom(params: URLSearchParams): BookFilters {
  const f: BookFilters = {};
  const q = params.get("q")?.trim();
  if (q) f.q = q.slice(0, 100);
  const author = params.get("author")?.trim();
  if (author) f.author = author.slice(0, 100);
  const min = Number(params.get("min_price") ?? "");
  if (params.get("min_price") && Number.isFinite(min) && min >= 0) f.min_price = min;
  const max = Number(params.get("max_price") ?? "");
  if (params.get("max_price") && Number.isFinite(max) && max >= 0) f.max_price = max;
  const sort = params.get("sort") as BookSort | null;
  if (sort && SORTS.includes(sort) && sort !== "newest") f.sort = sort;
  return f;
}

function addressOf(f: BookFilters): string {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.author) p.set("author", f.author);
  if (f.min_price !== undefined) p.set("min_price", String(f.min_price));
  if (f.max_price !== undefined) p.set("max_price", String(f.max_price));
  if (f.sort && f.sort !== "newest") p.set("sort", f.sort);
  const s = p.toString();
  return s ? `/books?${s}` : "/books";
}

function Browse() {
  const params = useSearchParams();
  const router = useRouter();
  const filters = useMemo(() => filtersFrom(new URLSearchParams(params.toString())), [params]);
  const key = JSON.stringify(filters);

  // The filter bar keeps what's being typed; remount it only when the address changes from
  // elsewhere (the navbar search, back/forward), not after its own updates.
  const fromBar = useRef<string | null>(null);
  const [barKey, setBarKey] = useState(0);
  useEffect(() => {
    if (key !== fromBar.current) setBarKey((n) => n + 1);
    fromBar.current = key;
  }, [key]);

  const setFilters = useCallback((next: BookFilters) => {
    const address = addressOf(next);
    fromBar.current = JSON.stringify(filtersFrom(new URLSearchParams(address.split("?")[1] ?? "")));
    router.replace(address, { scroll: false });
  }, [router]);

  const clear = () => {
    fromBar.current = null;
    router.replace("/books", { scroll: false });
  };

  const fetchPage = useCallback((page: number) => api.listBooks(filters, page, PER_PAGE), [filters]);
  const books = useInfiniteBooks(fetchPage, key);
  const filtered = hasFilters(filters);

  return (
    <div className="mx-auto max-w-[1200px] px-4 pt-12 sm:px-6 md:pt-16">
      <div className="rule-double mb-10 flex flex-wrap items-end justify-between gap-6 pt-6">
        <div>
          <p className="eyebrow">The catalog</p>
          <h1 className="headline-lg mt-2">All books</h1>
          <p className="mt-2 text-on-surface-muted">Every book on Mbooks. Search by title or author, sort, or set a price range.</p>
        </div>
        {books.books && (
          <p className="font-display text-lg text-on-surface-muted italic">
            {books.total} {books.total === 1 ? "title" : "titles"}{filtered ? " found" : ""}
          </p>
        )}
      </div>

      <BookFiltersBar key={barKey} value={filters} onChange={setFilters} />

      <InfiniteBookGrid
        state={books}
        render={(b, i) => <BookCard key={b.id} book={b} index={i} />}
        empty={
          filtered ? (
            <div className="note mx-auto max-w-md -rotate-1 text-center">
              <p className="headline-sm">No books match that</p>
              <p className="mt-2 text-sm">Try fewer words, check the spelling, or widen the price range.</p>
              <button className="btn btn-soft mt-5" onClick={clear}>Clear the filters</button>
            </div>
          ) : (
            <div className="note mx-auto max-w-md -rotate-1 text-center">
              <p className="headline-sm">No books yet</p>
              <p className="mt-2 text-sm">Nobody has published here yet. The first book could be yours.</p>
            </div>
          )
        }
      />
    </div>
  );
}

export default function BooksPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-[1200px] px-4 pt-16 sm:px-6"><BookGridSkeleton /></div>}>
      <Browse />
    </Suspense>
  );
}
