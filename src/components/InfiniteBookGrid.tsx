"use client";

import type { ReactNode } from "react";
import type { Book } from "@/lib/api";
import type { InfiniteBooks } from "@/lib/useInfiniteBooks";
import { BookGridSkeleton } from "./BookCard";

const GRID = "grid grid-cols-2 gap-x-6 gap-y-14 md:grid-cols-3 md:gap-x-10 lg:grid-cols-4";

/** A book grid that loads the next page as you scroll to the bottom. */
export function InfiniteBookGrid({ state, render, empty }: {
  state: InfiniteBooks;
  render: (book: Book, index: number) => ReactNode;
  /** shown when nothing matches */
  empty: ReactNode;
}) {
  const { books, total, loading, error, done, loadMore, sentinel } = state;

  if (books === null) {
    if (error) {
      return (
        <div className="alert-error flex flex-wrap items-center justify-between gap-3">
          <span>{error}</span>
          <button className="btn btn-soft btn-sm" onClick={loadMore}>Try again</button>
        </div>
      );
    }
    return <BookGridSkeleton />;
  }

  if (books.length === 0) return <>{empty}</>;

  return (
    <>
      <div className={GRID}>{books.map((b, i) => render(b, i))}</div>

      {!done && <div ref={sentinel} aria-hidden className="h-px" />}

      <div className="mt-12 text-center text-sm text-on-surface-muted" aria-live="polite">
        {error ? (
          <span className="inline-flex flex-wrap items-center justify-center gap-3">
            Couldn&apos;t load more books.
            <button className="btn btn-soft btn-sm" onClick={loadMore}>Try again</button>
          </span>
        ) : loading ? (
          <span className="inline-flex items-center gap-3">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-soft border-t-primary" aria-hidden />
            Loading more books…
          </span>
        ) : done ? (
          <span className="font-display text-lg italic">
            {total === 1 ? "That's the only one." : `That's all ${total} of them.`}
          </span>
        ) : (
          <button className="btn btn-soft btn-sm" onClick={loadMore}>Load more</button>
        )}
      </div>
    </>
  );
}
