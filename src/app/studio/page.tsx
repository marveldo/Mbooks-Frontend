"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type Book } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { RequireAuth } from "@/components/RequireAuth";
import { BookCard, BookGridSkeleton } from "@/components/BookCard";

/** The API has no "books I created" endpoint, so we page through the catalog and filter by owner. */
async function booksOwnedBy(userId: string): Promise<Book[]> {
  const out: Book[] = [];
  for (let p = 1; p <= 50; p++) {
    const batch = await api.listBooks(p, 100);
    out.push(...batch.filter((b) => b.owner_id === userId));
    if (batch.length < 100) break;
  }
  return out;
}

function Studio() {
  const { user } = useAuth();
  const [mine, setMine] = useState<Book[] | null>(null);
  const [library, setLibrary] = useState<Book[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    booksOwnedBy(user.id).then(setMine).catch((e) => setError(e.message));
    api.myLibrary().then(setLibrary).catch(() => setLibrary([]));
  }, [user]);

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
        {error && <div className="alert-error">{error}</div>}
        {!error && mine === null && <BookGridSkeleton count={4} />}
        {mine?.length === 0 && (
          <div className="note mx-auto max-w-lg -rotate-1 text-center">
            <p className="headline-sm">Your shelf is empty</p>
            <p className="mt-2 text-sm">Every book starts with a title. Make one and the builder opens straight away.</p>
            <Link href="/books/new" className="btn btn-primary mt-5">Start a new book</Link>
          </div>
        )}
        {mine && mine.length > 0 && (
          <div className="grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 lg:grid-cols-4">
            {mine.map((b) => (
              <div key={b.id}>
                <BookCard book={b} href={`/books/${b.id}/build`} />
                <div className="mt-3 flex gap-4 text-sm">
                  <Link href={`/books/${b.id}/build`} className="btn-link">Open builder</Link>
                  <Link href={`/books/${b.id}/read`} className="btn-link">Read</Link>
                  <Link href={`/books/${b.id}`} className="btn-link">View</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {library && library.length > 0 && (
        <section className="mt-24">
          <p className="eyebrow">Library</p>
          <h2 className="headline-md mt-2 mb-8">Books you&apos;ve bought</h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 lg:grid-cols-4">
            {library.map((b) => (
              <div key={b.id}>
                <BookCard book={b} href={`/books/${b.id}/read`} />
                <div className="mt-3 flex gap-4 text-sm">
                  <Link href={`/books/${b.id}/read`} className="btn-link">Read</Link>
                  <Link href={`/books/${b.id}`} className="btn-link">Details</Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default function StudioPage() {
  return <RequireAuth><Studio /></RequireAuth>;
}
