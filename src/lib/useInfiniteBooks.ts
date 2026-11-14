"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Book, BookList } from "./api";

export interface InfiniteBooks {
  /** null until the first page arrives */
  books: Book[] | null;
  /** how many books match in total */
  total: number;
  loading: boolean;
  error: string | null;
  /** every matching book has been loaded */
  done: boolean;
  loadMore: () => void;
  /** Put this on an element below the grid: the next page loads as it scrolls into view. */
  sentinel: (el: Element | null) => void;
}

/**
 * Scroll pagination. `fetchPage(n)` loads page n; changing `key` (e.g. the filters as a string)
 * starts again from page 1. Answers to an older key are ignored, so fast typing never mixes results.
 */
export function useInfiniteBooks(fetchPage: (page: number) => Promise<BookList>, key: string): InfiniteBooks {
  const [books, setBooks] = useState<Book[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const fetchRef = useRef(fetchPage);
  const page = useRef(0);
  const generation = useRef(0);
  const busy = useRef(false);
  const finished = useRef(false);
  const inView = useRef(false);
  const observer = useRef<IntersectionObserver | null>(null);

  useEffect(() => { fetchRef.current = fetchPage; }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (busy.current || finished.current) return;
    const gen = generation.current;
    busy.current = true;
    setLoading(true);
    setError(null);
    try {
      const next = page.current + 1;
      const result = await fetchRef.current(next);
      if (gen !== generation.current) return;
      page.current = next;
      finished.current = !result.has_more;
      setBooks((prev) => {
        const seen = new Set((prev ?? []).map((b) => b.id)); // a book added meanwhile can shift pages
        return [...(prev ?? []), ...result.books.filter((b) => !seen.has(b.id))];
      });
      setTotal(result.total);
      setDone(finished.current);
    } catch (e) {
      if (gen === generation.current) setError(e instanceof Error ? e.message : "Couldn't load the books.");
    } finally {
      if (gen === generation.current) {
        busy.current = false;
        setLoading(false);
      }
    }
  }, []);

  // New filters: start over from page 1.
  useEffect(() => {
    generation.current += 1;
    page.current = 0;
    busy.current = false;
    finished.current = false;
    setBooks(null);
    setTotal(0);
    setDone(false);
    setError(null);
    loadMore();
  }, [key, loadMore]);

  // A short page can leave the sentinel on screen, which the observer won't report again: keep going.
  useEffect(() => {
    if (books && inView.current && !loading && !done && !error) loadMore();
  }, [books, loading, done, error, loadMore]);

  const sentinel = useCallback((el: Element | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!el) return;
    observer.current = new IntersectionObserver((entries) => {
      inView.current = entries.some((e) => e.isIntersecting);
      if (inView.current) loadMore();
    }, {
      // Load when the end of the list is within 800px below the screen, or anywhere above it: a fast
      // fling can jump straight past the marker, and on long pages the footer keeps it above the screen.
      rootMargin: "100000px 0px 800px 0px",
    });
    observer.current.observe(el);
  }, [loadMore]);

  useEffect(() => () => observer.current?.disconnect(), []);

  return { books, total, loading, error, done, loadMore, sentinel };
}
