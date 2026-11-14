"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, formatPrice, type Book, type Payment } from "@/lib/api";
import { goToCheckout, isRefund, STATUS } from "@/lib/purchases";
import { RequireAuth } from "@/components/RequireAuth";

/** While Paystack hasn't confirmed yet, ask again every few seconds for about a minute. */
const POLL_MS = 3000;
const POLL_TRIES = 20;

/**
 * Paystack sends the customer here after the checkout: /payments/callback?reference=…&trxref=…
 * The page asks the server to confirm the payment with Paystack (POST /payments/{reference}/verify).
 */
function Callback() {
  const params = useSearchParams();
  const reference = params.get("reference") ?? params.get("trxref");

  const [payment, setPayment] = useState<Payment | null>(null);
  const [book, setBook] = useState<Book | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gaveUp, setGaveUp] = useState(false);
  const [paying, setPaying] = useState(false);
  const tries = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const check = useCallback(async () => {
    if (!reference) return;
    setError(null);
    try {
      const p = await api.verifyPayment(reference);
      setPayment(p);
      if (p.status === "pending") {
        tries.current += 1;
        if (tries.current < POLL_TRIES) timer.current = setTimeout(check, POLL_MS);
        else setGaveUp(true);
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) setError("We couldn't find that payment on your account.");
      else setError(e instanceof ApiError && e.status === 502
        ? "We couldn't reach Paystack to confirm your payment. Your money is safe: try again in a moment."
        : e instanceof Error ? e.message : "Something went wrong.");
    }
  }, [reference]);

  useEffect(() => {
    check();
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [check]);

  // Show which book this was for.
  useEffect(() => {
    if (!payment) return;
    let cancelled = false;
    api.orders()
      .then((orders) => orders.find((o) => o.id === payment.order_id))
      .then((order) => (order ? api.getBook(order.book_id) : null))
      .then((b) => { if (!cancelled) setBook(b); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [payment]);

  function checkAgain() {
    tries.current = 0;
    setGaveUp(false);
    check();
  }

  async function payAgain() {
    if (!payment) return;
    setPaying(true);
    try {
      await goToCheckout(payment.order_id);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't open the payment page.");
      setPaying(false);
    }
  }

  const title = book?.title ? `“${book.title}”` : "Your book";

  let heading = "Confirming your payment…";
  let body: React.ReactNode = "Hold on while we check with Paystack. This usually takes a few seconds.";
  let actions: React.ReactNode = null;

  if (!reference) {
    heading = "No payment to check";
    body = "This page is where Paystack sends you after paying. Open it from your orders instead.";
    actions = <Link href="/orders" className="btn btn-primary">Go to your orders</Link>;
  } else if (error) {
    heading = "We couldn't confirm it yet";
    body = error;
    actions = (
      <>
        <button className="btn btn-primary" onClick={checkAgain}>Try again</button>
        <Link href="/orders" className="btn btn-soft">Your orders</Link>
      </>
    );
  } else if (payment?.status === "success") {
    heading = "Payment received";
    body = `${title} is now in your library. Happy reading.`;
    actions = (
      <>
        {book && <Link href={`/books/${book.id}/read`} className="btn btn-primary">Start reading</Link>}
        <Link href="/payments" className="btn btn-soft">See your payments</Link>
      </>
    );
  } else if (payment?.status === "pending") {
    heading = gaveUp ? "Still waiting for your bank" : "Confirming your payment…";
    body = gaveUp
      ? "Paystack hasn't confirmed it yet. Some banks and transfers take a while. You can leave this page: we'll keep checking, and the book will appear in your library as soon as it's confirmed."
      : "Hold on while we check with Paystack. This usually takes a few seconds.";
    actions = gaveUp && (
      <>
        <button className="btn btn-primary" onClick={checkAgain}>Check again</button>
        <Link href="/orders" className="btn btn-soft">Your orders</Link>
      </>
    );
  } else if (payment?.status === "failed") {
    heading = "Payment didn't go through";
    body = "Paystack declined the payment, so no money was taken. You can try again with another card or bank.";
    actions = (
      <>
        <button className="btn btn-primary" disabled={paying} onClick={payAgain}>{paying ? "Opening Paystack…" : "Try again"}</button>
        <Link href="/orders" className="btn btn-soft">Your orders</Link>
      </>
    );
  } else if (payment?.status === "abandoned") {
    heading = "This checkout has expired";
    body = "We never got a confirmation for it. If money did leave your account, it will be refunded automatically. Start a new payment to get the book.";
    actions = (
      <>
        <button className="btn btn-primary" disabled={paying} onClick={payAgain}>{paying ? "Opening Paystack…" : "Pay again"}</button>
        <Link href="/orders" className="btn btn-soft">Your orders</Link>
      </>
    );
  } else if (payment && isRefund(payment.status)) {
    heading = STATUS[payment.status].label;
    body = `We received ${formatPrice(payment.amount)} but couldn't use it for this order (the checkout had expired, the amount was different, or the order was already paid). ${STATUS[payment.status].note}`;
    actions = <Link href="/payments" className="btn btn-soft">See your payments</Link>;
  }

  const busy = !error && reference && (!payment || (payment.status === "pending" && !gaveUp));

  return (
    <div className="mx-auto max-w-[620px] px-4 pt-16 text-center sm:px-6 md:pt-24">
      {busy && <div className="mx-auto mb-6 h-10 w-10 animate-spin rounded-full border-4 border-soft border-t-primary" aria-hidden />}
      {payment && <span className={STATUS[payment.status].chip}>{STATUS[payment.status].label}</span>}
      <h1 className="headline-lg mt-4">{heading}</h1>
      <p className="mt-3 text-on-surface-muted" aria-live="polite">{body}</p>
      {payment && <p className="mt-4 text-sm text-on-surface-muted">{formatPrice(payment.amount)} · Paystack ref {payment.reference}</p>}
      {actions && <div className="mt-8 flex flex-wrap justify-center gap-3">{actions}</div>}
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <RequireAuth>
      <Suspense fallback={<div className="mx-auto max-w-[620px] px-6 py-24 text-on-surface-muted">Loading…</div>}>
        <Callback />
      </Suspense>
    </RequireAuth>
  );
}
