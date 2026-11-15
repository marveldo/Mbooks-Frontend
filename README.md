This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Payments (Paystack)

Buying a book goes through Paystack. The browser never sees the Paystack secret key; the backend does every Paystack call.

1. **Order:** the book page calls `POST /orders`, and the order shows up on `/orders` under *Awaiting payment*.
2. **Pay:** *Pay now* calls `POST /orders/{id}/pay` with `{ "callback_url": "<this site>/payments/callback" }` and sends the browser to the returned `authorization_url` (Paystack's checkout). Pressing it again while that checkout is still open reuses it (*Continue payment*).
3. **Back from Paystack:** Paystack sends the customer to `/payments/callback?reference=…`. That page calls `POST /payments/{reference}/verify`, which asks Paystack and returns the payment. While it's `pending` the page asks again every 3 seconds for about a minute, then offers *Check again*.
4. **Safety nets (backend only):** Paystack's webhook and a scheduled check confirm payments even if the customer closes the tab, so a book can appear in the library without the callback page ever loading.

**Free books (₦0):** Paystack won't take a zero amount, so the book page shows *Get it free*. It creates an order and calls `POST /orders/{id}/pay`, which answers `status: "success"` with no `authorization_url`, and the book goes straight into the library. Prices show as "Free" (`priceLabel`), and the payment's reference starts with `free_` (shown as "Free book").

Payment statuses (`Payment.status` in `src/lib/api.ts`; labels in `STATUS` in `src/lib/purchases.ts`):

| Status | Meaning | What the UI offers |
| --- | --- | --- |
| `pending` | Waiting for the customer or their bank | *Continue payment*, *Already paid? Check* |
| `success` | Paid; the book is in the library | *Start reading*, receipt |
| `failed` | Paystack declined it; no money taken | *Try again*; the order can be removed |
| `abandoned` | Never confirmed after the backend's last automatic check | *Pay again* (a new checkout) |
| `refund_pending`, `refunding`, `refunded` | Money arrived but couldn't be used (paid after the checkout expired, wrong amount, or the order was already paid), so it's being returned | Shown on `/payments` |
| `refund_failed` | The automatic refund didn't go through; it's refunded by hand | Shown on `/payments` |

Orders can only be removed when they have no payment, or only failed ones (the API answers 409 otherwise).

The `/payments` receipt lists every attempt, but **Total paid** only counts `success`. Times from the API are UTC and are shown in the reader's local time (`formatDateTime` in `src/lib/api.ts`).

On the backend, set `PAYSTACK_SECRET_KEY`, and in the Paystack dashboard point the webhook at `<backend>/api/v1/payments/webhook`. See the backend's `/docs` for the full API.

## Catalog, library and infinite scroll

- **All books** (`/books`, public): `GET /books` with search (`q`, title or author), sort and a naira price range. Typing is applied 300 ms after the last keystroke.
  - The filters live in the address, e.g. `/books?q=ink&min_price=1000&sort=title`, so a search can be shared or bookmarked. Updates use `router.replace`, so typing doesn't fill up the Back history.
  - Reached from the landing page: the hero's *Browse the catalog*, the *Browse all books* button under "New on the shelves", and that section's search box. It's not in the navbar.
- **Landing page, "New on the shelves":** the newest books, two rows at a time (8 per page from tablet width up, 4 on phones), with numbered pages (`Pager`: ← Previous · 1 … 4 5 6 … 12 · Next →). Its search box opens `/books?q=…`.
- **My library** (`/library`): `GET /me/books` with the same filters plus a shelf: *All my books*, *Bought* or *Written by me*. Books you wrote get a *Written by you* badge and an *Open builder* link.
- **My studio** (`/studio`): the *Written* shelf, opening the builder.
- **Access checks:** the book page and the reader call `GET /me/books/{id}` (`api.inLibrary`), so they no longer download the whole library.

`/books`, the library and the studio use `useInfiniteBooks` (`src/lib/useInfiniteBooks.ts`) and `InfiniteBookGrid`:
- page 1 loads first, and the next page loads when the end of the grid comes within 800px of the screen;
- loading stops when the API says `has_more: false`;
- changing a filter starts again from page 1, and answers for older filters are thrown away;
- if loading fails, *Try again* appears, and a *Load more* button is the fallback if scrolling doesn't trigger.

The filters bar is `BookFiltersBar`.
