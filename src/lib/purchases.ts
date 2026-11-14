import { api, type Book, type Order, type Payment, type PaymentStatus } from "./api";

export interface Purchases {
  orders: Order[];
  /** Newest first. Includes every attempt: pending, failed, refunded… */
  payments: Payment[];
  /** Books referenced by the orders, by id. A deleted book is simply missing. */
  books: Record<string, Book>;
  /** order id -> its successful payment, for orders that have been paid */
  paidBy: Record<string, Payment>;
  /** order id -> its most recent payment attempt, whatever its status */
  latestBy: Record<string, Payment>;
  /** order ids that can be removed: no payment yet, or only failed ones (the server refuses the rest) */
  removable: Set<string>;
}

const time = (p: Payment) => p.created_at ?? "";

/** Orders don't carry a status or the book's details, so join them with payments and books here. */
export async function loadPurchases(): Promise<Purchases> {
  const [orders, unsorted] = await Promise.all([api.orders(), api.payments()]);
  const payments = [...unsorted].sort((a, b) => time(b).localeCompare(time(a)));

  const ids = [...new Set(orders.map((o) => o.book_id))];
  const found = await Promise.allSettled(ids.map((id) => api.getBook(id)));
  const books: Record<string, Book> = {};
  found.forEach((r, i) => { if (r.status === "fulfilled") books[ids[i]] = r.value; });

  const paidBy: Record<string, Payment> = {};
  const latestBy: Record<string, Payment> = {};
  const blocked = new Set<string>();
  for (const p of payments) {
    if (p.status === "success") paidBy[p.order_id] = p;
    if (!latestBy[p.order_id]) latestBy[p.order_id] = p;
    if (p.status !== "failed") blocked.add(p.order_id);
  }
  const removable = new Set(orders.filter((o) => !blocked.has(o.id)).map((o) => o.id));
  return { orders, payments, books, paidBy, latestBy, removable };
}

/** A short, human-friendly reference from a UUID. */
export const ref = (id: string) => `#${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;

/** Where Paystack sends the customer after paying. */
export const callbackUrl = () => `${window.location.origin}/payments/callback`;

/**
 * Starts a Paystack checkout for the order (or reuses the one that's still open) and leaves the
 * site for Paystack's payment page. Paystack then sends the customer to /payments/callback.
 */
export async function goToCheckout(orderId: string): Promise<void> {
  const checkout = await api.payOrder(orderId, callbackUrl());
  window.location.assign(checkout.authorization_url);
}

export const STATUS: Record<PaymentStatus, { label: string; chip: string; note: string }> = {
  pending: { label: "Payment pending", chip: "chip chip-accent", note: "Waiting for Paystack to confirm it." },
  success: { label: "Paid", chip: "chip chip-success", note: "The book is in your library." },
  failed: { label: "Payment failed", chip: "chip chip-error", note: "Paystack declined it. No money was taken." },
  abandoned: { label: "Checkout expired", chip: "chip", note: "It was never confirmed. If money does leave your account for it, we refund it." },
  refund_pending: { label: "Refund on its way", chip: "chip chip-accent", note: "We're returning this money." },
  refunding: { label: "Refunding", chip: "chip chip-accent", note: "Paystack is returning this money. It can take a few business days to reach you." },
  refunded: { label: "Refunded", chip: "chip", note: "This money was returned to you." },
  refund_failed: { label: "Refund delayed", chip: "chip chip-error", note: "The automatic refund didn't go through. We'll refund you by hand." },
};

export const isRefund = (s: PaymentStatus) => s === "refund_pending" || s === "refunding" || s === "refunded" || s === "refund_failed";
