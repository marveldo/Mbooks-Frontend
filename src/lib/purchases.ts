import { api, type Book, type Order, type Payment } from "./api";

export interface Purchases {
  orders: Order[];
  payments: Payment[];
  /** Books referenced by the orders, by id. A deleted book is simply missing. */
  books: Record<string, Book>;
  /** order id -> its payment, for orders that have been paid */
  paidBy: Record<string, Payment>;
}

/** Orders don't carry a status or the book's details, so join them with payments and books here. */
export async function loadPurchases(): Promise<Purchases> {
  const [orders, payments] = await Promise.all([api.orders(), api.payments()]);
  const ids = [...new Set(orders.map((o) => o.book_id))];
  const found = await Promise.allSettled(ids.map((id) => api.getBook(id)));
  const books: Record<string, Book> = {};
  found.forEach((r, i) => { if (r.status === "fulfilled") books[ids[i]] = r.value; });
  const paidBy: Record<string, Payment> = {};
  for (const p of payments) paidBy[p.order_id] = p;
  return { orders, payments, books, paidBy };
}

/** A short, human-friendly reference from a UUID. */
export const ref = (id: string) => `#${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
