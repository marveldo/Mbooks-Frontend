"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError, formatPrice, type Order } from "@/lib/api";
import { goToCheckout, loadPurchases, ref, STATUS, type Purchases } from "@/lib/purchases";
import { RequireAuth } from "@/components/RequireAuth";
import { BookCover } from "@/components/BookCover";
import { useToast } from "@/components/Toast";

function Orders() {
  const toast = useToast();
  const [data, setData] = useState<Purchases | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // order id being paid or removed
  const [leaving, setLeaving] = useState(false); // on our way to Paystack

  const load = useCallback(() => loadPurchases().then(setData).catch((e) => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  async function pay(o: Order) {
    setBusy(o.id);
    try {
      await goToCheckout(o.id);
      setLeaving(true); // the page is unloading; keep the button disabled
    } catch (e) {
      toast.error("Couldn't open the payment page", e instanceof ApiError ? (e.status === 409 ? "This order has already been paid." : e.message) : undefined);
      if (e instanceof ApiError && e.status === 409) await load();
      setBusy(null);
    }
  }

  async function remove(o: Order) {
    if (!window.confirm("Remove this order?")) return;
    setBusy(o.id);
    try {
      await api.deleteOrder(o.id);
      toast.info("Order removed");
      await load();
    } catch (e) {
      toast.error("Couldn't remove the order", e instanceof ApiError ? e.message : undefined);
      if (e instanceof ApiError && e.status === 409) await load();
    } finally {
      setBusy(null);
    }
  }

  const unpaid = data?.orders.filter((o) => !data.paidBy[o.id]) ?? [];
  const paid = data?.orders.filter((o) => data.paidBy[o.id]) ?? [];
  const due = unpaid.reduce((n, o) => n + o.total_price, 0);

  return (
    <div className="mx-auto max-w-[900px] px-4 pt-12 sm:px-6 md:pt-16">
      <div className="rule-double flex flex-wrap items-end justify-between gap-6 pt-6">
        <div>
          <h1 className="headline-lg">Orders</h1>
          <p className="mt-2 text-on-surface-muted">Pay securely with Paystack. Once it&apos;s confirmed, the book goes straight into your library.</p>
        </div>
        {data && data.orders.length > 0 && (
          <dl className="flex gap-8 text-right">
            <div><dt className="text-xs font-bold tracking-wider text-on-surface-muted uppercase">Awaiting payment</dt><dd className="font-display text-[32px] leading-none font-medium">{unpaid.length}</dd></div>
            <div><dt className="text-xs font-bold tracking-wider text-on-surface-muted uppercase">To pay</dt><dd className="font-display text-[32px] leading-none font-medium text-primary">{formatPrice(due)}</dd></div>
          </dl>
        )}
      </div>

      {error && <div className="alert-error mt-8">{error}</div>}
      {!error && !data && <p className="mt-10 text-on-surface-muted">Fetching your orders…</p>}

      {data && data.orders.length === 0 && (
        <div className="note mx-auto mt-14 max-w-md -rotate-1 text-center">
          <p className="headline-sm">Nothing ordered yet</p>
          <p className="mt-2 text-sm">Find a book you like in the catalog and it will show up here.</p>
          <Link href="/#catalog" className="btn btn-primary mt-5">Browse the catalog</Link>
        </div>
      )}

      {[{ title: "Awaiting payment", list: unpaid }, { title: "Paid", list: paid }].map(({ title, list }) => list.length > 0 && (
        <section key={title} className="mt-12">
          <h2 className="ornament mb-6">{title}</h2>
          <ul className="space-y-4">
            {list.map((o) => {
              const book = data!.books[o.book_id];
              const isPaid = !!data!.paidBy[o.id];
              const latest = data!.latestBy[o.id];
              const pending = latest?.status === "pending";
              const canRemove = data!.removable.has(o.id);
              const working = busy === o.id || leaving;
              const name = book?.title ?? "A book that's no longer listed";
              return (
                <li key={o.id} className="card flex flex-wrap items-center gap-5 p-4 sm:flex-nowrap sm:p-5">
                  <Link href={book ? `/books/${book.id}` : "#"} className="w-[72px] shrink-0">
                    <BookCover title={name} author={book?.author ?? ""} url={book?.cover_url} />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold tracking-wider text-on-surface-muted">ORDER {ref(o.id)}</p>
                    <p className="mt-1 truncate font-display text-xl font-medium">{book ? <Link href={`/books/${book.id}`} className="hover:text-primary">{name}</Link> : name}</p>
                    <p className="text-sm text-on-surface-muted">
                      {book?.author ? `${book.author} · ` : ""}{o.quantity} {o.quantity === 1 ? "copy" : "copies"}
                    </p>
                    {!isPaid && latest && (
                      <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-on-surface-muted">
                        <span className={STATUS[latest.status].chip}>{STATUS[latest.status].label}</span>
                        <span>{STATUS[latest.status].note}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex w-full items-center justify-between gap-4 sm:w-auto sm:flex-col sm:items-end sm:gap-2">
                    <span className="font-display text-2xl font-medium">{formatPrice(o.total_price)}</span>
                    {isPaid ? (
                      <span className="chip chip-success">Paid · in your library</span>
                    ) : (
                      <div className="flex flex-wrap items-center justify-end gap-3">
                        {canRemove && (
                          <button className="text-sm font-semibold text-on-surface-muted hover:text-error hover:underline" disabled={working} onClick={() => remove(o)}>Remove</button>
                        )}
                        {pending && latest.reference && (
                          <Link href={`/payments/callback?reference=${encodeURIComponent(latest.reference)}`} className="text-sm font-semibold text-secondary hover:underline">Already paid? Check</Link>
                        )}
                        <button className="btn btn-primary btn-sm" disabled={working} onClick={() => pay(o)}>
                          {busy === o.id ? "Opening Paystack…" : pending ? "Continue payment" : "Pay now"}
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {paid.length > 0 && <p className="mt-10 text-center text-sm"><Link href="/payments" className="btn-link">See your payments →</Link></p>}
    </div>
  );
}

export default function OrdersPage() {
  return <RequireAuth><Orders /></RequireAuth>;
}
