"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError, priceLabel, type Book } from "@/lib/api";
import { goToCheckout } from "@/lib/purchases";
import { canEdit, useAuth } from "@/lib/auth";
import { BookCover } from "@/components/BookCover";
import { Comments } from "@/components/Comments";
import { useToast } from "@/components/Toast";

export default function BookPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [book, setBook] = useState<Book | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [owned, setOwned] = useState(false);
  const [qty, setQty] = useState(1);
  const [buying, setBuying] = useState(false);
  const router = useRouter();
  const toast = useToast();

  // Is this book already in the reader's library?
  useEffect(() => {
    if (!user) { setOwned(false); return; }
    api.inLibrary(id).then(setOwned);
  }, [user, id]);

  async function buy() {
    if (!book) return;
    if (!user) { router.push(`/login?next=${encodeURIComponent(`/books/${book.id}`)}`); return; }
    setBuying(true);
    if (book.price === 0) {
      // Free: no order page, no Paystack. Claim it and it's in the library.
      try {
        const order = await api.createOrder(book.id, 1);
        await goToCheckout(order.id);
        setOwned(true);
        toast.success("Added to your library", `“${book.title}” is yours to read.`);
      } catch (e) {
        toast.error("Couldn't add the book", e instanceof ApiError ? e.message : undefined);
      } finally {
        setBuying(false);
      }
      return;
    }
    try {
      await api.createOrder(book.id, qty);
      toast.success("Order placed", "Pay for it to add the book to your library.");
      router.push("/orders");
    } catch (e) {
      toast.error("Couldn't place the order", e instanceof ApiError ? e.message : undefined);
      setBuying(false);
    }
  }

  useEffect(() => {
    api.getBook(id).then(setBook).catch((e) => setError(e instanceof ApiError && e.status === 404 ? "We couldn't find that book." : e.message));
  }, [id]);

  if (error) return <div className="mx-auto max-w-[1200px] px-6 py-24"><p className="headline-md">{error}</p><Link href="/" className="btn btn-soft mt-6">Back to the catalog</Link></div>;
  if (!book) return <div className="mx-auto max-w-[1200px] px-6 py-24 text-on-surface-muted">Loading…</div>;

  const mine = canEdit(user, book.owner_id);

  return (
    <div className="mx-auto max-w-[1200px] px-4 pt-10 sm:px-6 md:pt-16">
      <Link href="/" className="text-sm font-bold text-secondary hover:underline">← Catalog</Link>
      <div className="mt-8 grid gap-12 md:grid-cols-[minmax(0,380px)_1fr] lg:gap-20">
        <div className="mx-auto w-full max-w-[380px]">
          <BookCover title={book.title} author={book.author} url={book.cover_url} />
        </div>

        <div>
          {book.published_year && <p className="eyebrow">Published {book.published_year}</p>}
          <h1 className="display mt-3">{book.title}</h1>
          <p className="mt-4 text-lg font-semibold text-on-surface-muted">by {book.author}</p>

          <div className="card mt-8 md:max-w-md">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <span className="font-display text-[32px] leading-none font-medium">{priceLabel(book.price * (mine || owned ? 1 : qty))}</span>
              {mine ? (
                <div className="flex flex-wrap gap-3">
                  <Link href={`/books/${book.id}/read`} className="btn btn-soft">Read</Link>
                  <Link href={`/books/${book.id}/build`} className="btn btn-primary">Open builder</Link>
                </div>
              ) : owned ? (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="chip chip-success">In your library</span>
                  <Link href={`/books/${book.id}/read`} className="btn btn-primary">Read now</Link>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  {book.price > 0 && <div className="flex h-12 items-center rounded-[8px] border border-outline" role="group" aria-label="Copies">
                    <button className="h-full w-10 text-xl font-bold disabled:opacity-30" disabled={qty <= 1} onClick={() => setQty((q) => q - 1)} aria-label="One fewer">−</button>
                    <span className="w-8 text-center font-bold tabular-nums" aria-live="polite">{qty}</span>
                    <button className="h-full w-10 text-xl font-bold disabled:opacity-30" disabled={qty >= 100} onClick={() => setQty((q) => q + 1)} aria-label="One more">+</button>
                  </div>}
                  {book.price === 0 ? (
                    <button className="btn btn-primary" disabled={buying} onClick={buy}>{buying ? "Adding…" : user ? "Get it free" : "Log in to get it free"}</button>
                  ) : (
                    <button className="btn btn-primary" disabled={buying} onClick={buy}>{buying ? "Placing order…" : user ? "Buy now" : "Log in to buy"}</button>
                  )}
                </div>
              )}
            </div>
            {!mine && !owned && (
              <p className="hint">
                {book.price === 0 ? "It's free: it goes straight into your library." : "You'll pay on the next screen. Once paid, the book stays in your library."}
              </p>
            )}
          </div>

          {book.description && (
            <div className="mt-10 max-w-2xl">
              <h2 className="headline-sm">About this book</h2>
              <p className="mt-3 text-lg leading-[1.7] whitespace-pre-line text-on-surface">{book.description}</p>
            </div>
          )}

          <dl className="mt-10 grid max-w-md grid-cols-2 gap-y-3 border-t border-outline pt-6 text-sm">
            <dt className="text-on-surface-muted">Author</dt><dd className="font-semibold">{book.author}</dd>
            {book.isbn && <><dt className="text-on-surface-muted">ISBN</dt><dd className="font-semibold">{book.isbn}</dd></>}
            {book.published_year && <><dt className="text-on-surface-muted">Year</dt><dd className="font-semibold">{book.published_year}</dd></>}
          </dl>
        </div>
      </div>

      <div className="mt-20 max-w-3xl border-t border-outline pt-12">
        <Comments bookId={book.id} ownerId={book.owner_id} />
      </div>
    </div>
  );
}
