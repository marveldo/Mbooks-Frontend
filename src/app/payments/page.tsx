"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatDateTime, formatPrice } from "@/lib/api";
import { isRefund, loadPurchases, ref, STATUS, type Purchases } from "@/lib/purchases";
import { useAuth } from "@/lib/auth";
import { RequireAuth } from "@/components/RequireAuth";
import { BookCover } from "@/components/BookCover";
import { BookMark } from "@/components/Logo";

function Payments() {
  const { user } = useAuth();
  const [data, setData] = useState<Purchases | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadPurchases().then(setData).catch((e) => setError(e.message)); }, []);

  const total = data?.payments.filter((p) => p.status === "success").reduce((n, p) => n + p.amount, 0) ?? 0;
  const refunded = data?.payments.filter((p) => isRefund(p.status)).reduce((n, p) => n + p.amount, 0) ?? 0;
  const orderOf = (orderId: string) => data?.orders.find((o) => o.id === orderId);

  return (
    <div className="mx-auto max-w-[900px] px-4 pt-12 sm:px-6 md:pt-16">
      <div className="rule-double flex flex-wrap items-end justify-between gap-6 pt-6">
        <div>
          <h1 className="headline-lg">Payments</h1>
          <p className="mt-2 text-on-surface-muted">Every payment you&apos;ve made, newest first, including ones that didn&apos;t go through.</p>
        </div>
        {data && data.payments.length > 0 && (
          <dl className="flex gap-8 text-right">
            <div><dt className="text-xs font-bold tracking-wider text-on-surface-muted uppercase">Payments</dt><dd className="font-display text-[32px] leading-none font-medium">{data.payments.length}</dd></div>
            <div><dt className="text-xs font-bold tracking-wider text-on-surface-muted uppercase">Total paid</dt><dd className="font-display text-[32px] leading-none font-medium text-primary">{formatPrice(total)}</dd></div>
          </dl>
        )}
      </div>

      {error && <div className="alert-error mt-8">{error}</div>}
      {!error && !data && <p className="mt-10 text-on-surface-muted">Fetching your payments…</p>}

      {data && data.payments.length === 0 && (
        <div className="note mx-auto mt-14 max-w-md -rotate-1 text-center">
          <p className="headline-sm">No payments yet</p>
          <p className="mt-2 text-sm">When you pay for an order, it shows up here.</p>
          <Link href="/orders" className="btn btn-primary mt-5">Go to your orders</Link>
        </div>
      )}

      {data && data.payments.length > 0 && (
        <section className="card mt-12 overflow-hidden">
          <div className="flex items-center gap-4 border-b border-neutral/40 px-4 py-5 sm:px-6">
            <BookMark size={44} />
            <div className="min-w-0">
              <p className="font-display text-2xl leading-none font-bold">Mbooks</p>
              <p className="mt-1 text-xs tracking-[0.14em] text-on-surface-muted uppercase">Payments by {user?.username}</p>
            </div>
          </div>

          <ul className="divide-y divide-neutral/40">
            {data.payments.map((p) => {
              const order = orderOf(p.order_id);
              const book = order ? data.books[order.book_id] : undefined;
              const name = book?.title ?? "A book that's no longer listed";
              const counted = p.status === "success";
              const when = formatDateTime(p.paid_at ?? p.created_at);
              const status = STATUS[p.status];
              return (
                <li key={p.id} className="flex flex-wrap items-start gap-5 px-4 py-5 sm:flex-nowrap sm:px-6">
                  <Link href={book ? `/books/${book.id}` : "#"} className="w-[56px] shrink-0">
                    <BookCover title={name} author={book?.author ?? ""} url={book?.cover_url} />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-xl font-medium">
                      {book ? <Link href={`/books/${book.id}`} className="hover:text-primary">{name}</Link> : name}
                    </p>
                    <p className="text-sm text-on-surface-muted">
                      {order ? `${order.quantity} ${order.quantity === 1 ? "copy" : "copies"} · ` : ""}Order {ref(p.order_id)}{when ? ` · ${when}` : ""}
                    </p>
                    {p.reference && <p className="text-xs break-all text-on-surface-muted">Paystack ref {p.reference}</p>}
                    <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-on-surface-muted">
                      <span className={status.chip}>{status.label}</span>
                      {p.status === "pending" && p.reference ? (
                        <Link href={`/payments/callback?reference=${encodeURIComponent(p.reference)}`} className="font-semibold text-secondary hover:underline">Check status</Link>
                      ) : (
                        <span>{status.note}</span>
                      )}
                    </p>
                  </div>
                  <span className={`ml-auto shrink-0 font-display text-2xl font-medium tabular-nums ${counted ? "" : "text-on-surface-muted line-through decoration-1"}`}>
                    {formatPrice(p.amount)}
                  </span>
                </li>
              );
            })}
          </ul>

          <div className="space-y-2 border-t-2 border-on-surface px-4 py-5 sm:px-6">
            {refunded > 0 && (
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-bold tracking-[0.08em] uppercase">Refunded or refunding</span>
                <span className="font-bold tabular-nums">{formatPrice(refunded)}</span>
              </div>
            )}
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] font-bold tracking-[0.08em] uppercase">Total paid</span>
              <span className="font-display text-[32px] leading-none font-medium text-primary tabular-nums">{formatPrice(total)}</span>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default function PaymentsPage() {
  return <RequireAuth><Payments /></RequireAuth>;
}
