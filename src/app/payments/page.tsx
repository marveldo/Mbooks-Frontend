"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/api";
import { loadPurchases, ref, type Purchases } from "@/lib/purchases";
import { useAuth } from "@/lib/auth";
import { RequireAuth } from "@/components/RequireAuth";
import { BookMark } from "@/components/Logo";

function Payments() {
  const { user } = useAuth();
  const [data, setData] = useState<Purchases | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadPurchases().then(setData).catch((e) => setError(e.message)); }, []);

  const total = data?.payments.reduce((n, p) => n + p.amount, 0) ?? 0;
  const orderOf = (orderId: string) => data?.orders.find((o) => o.id === orderId);

  return (
    <div className="mx-auto max-w-[900px] px-4 pt-12 sm:px-6 md:pt-16">
      <div className="rule-double pt-6">
        <h1 className="headline-lg">Payments</h1>
        <p className="mt-2 text-on-surface-muted">Every payment you&apos;ve made, on one long receipt.</p>
      </div>

      {error && <div className="alert-error mt-8">{error}</div>}
      {!error && !data && <p className="mt-10 text-on-surface-muted">Fetching your receipts…</p>}

      {data && data.payments.length === 0 && (
        <div className="note mx-auto mt-14 max-w-md -rotate-1 text-center">
          <p className="headline-sm">No payments yet</p>
          <p className="mt-2 text-sm">When you pay for an order, the receipt lands here.</p>
          <Link href="/orders" className="btn btn-primary mt-5">Go to your orders</Link>
        </div>
      )}

      {data && data.payments.length > 0 && (
        <div className="receipt mx-auto mt-14 max-w-[460px]">
          <div className="flex flex-col items-center border-b border-dashed border-neutral/60 pb-5 text-center">
            <BookMark size={52} />
            <p className="mt-2 font-display text-2xl font-bold">Mbooks</p>
            <p className="text-xs tracking-[0.14em] text-on-surface-muted uppercase">Receipt for {user?.username}</p>
          </div>

          <ul className="divide-y divide-dashed divide-neutral/50">
            {data.payments.map((p) => {
              const order = orderOf(p.order_id);
              const book = order ? data.books[order.book_id] : undefined;
              return (
                <li key={p.id} className="flex items-start justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <p className="truncate font-display text-lg leading-snug font-medium">
                      {book ? <Link href={`/books/${book.id}`} className="hover:text-primary">{book.title}</Link> : "A book that's no longer listed"}
                    </p>
                    <p className="text-xs text-on-surface-muted">
                      {order ? `${order.quantity} × · ` : ""}Order {ref(p.order_id)} · Payment {ref(p.id)}
                    </p>
                  </div>
                  <span className="shrink-0 font-bold tabular-nums">{formatPrice(p.amount)}</span>
                </li>
              );
            })}
          </ul>

          <div className="flex items-baseline justify-between border-t-2 border-on-surface pt-4">
            <span className="text-[13px] font-bold tracking-[0.08em] uppercase">Total paid</span>
            <span className="font-display text-[32px] leading-none font-medium text-primary tabular-nums">{formatPrice(total)}</span>
          </div>
          <p className="mt-6 text-center font-display text-lg italic text-on-surface-muted">Thank you. Happy reading.</p>
        </div>
      )}
    </div>
  );
}

export default function PaymentsPage() {
  return <RequireAuth><Payments /></RequireAuth>;
}
