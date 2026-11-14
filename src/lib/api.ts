// Typed client for the Mbooks API. Calls go to /api/v1/* which Next proxies to the backend.

export type Role = "USER" | "ADMIN";

export interface User {
  id: string;
  username: string;
  email: string;
  role: Role;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  description: string | null;
  published_year: number | null;
  price: number;
  cover_key: string | null;
  cover_url?: string;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookInput {
  title?: string;
  author?: string;
  price?: number;
  isbn?: string;
  description?: string;
  published_year?: number;
  cover?: string;
}

export interface Page {
  id: string;
  book_id: string;
  page_number: number;
  content: string; // TipTap JSON as a string
  created_at: string;
  updated_at: string;
}

export interface PageList {
  pages: Page[];
  total: number;
  page: number;
  per_page: number;
}

export interface TocEntry {
  id: string;
  book_id: string;
  title: string;
  level: number;
  page_number: number;
  position: number;
}

export interface TocInput {
  title: string;
  level: number;
  page_number: number;
}

export interface CoverSignature {
  upload_url: string;
  fields: Record<string, string>;
}

export interface PageImageSignature extends CoverSignature {
  public_id: string;
  /** Use as the image node's `src` once the upload succeeds. */
  url: string;
}

export interface PdfUploadAccepted {
  job_id: string;
  book_id: string;
  status: string;
  ws_url: string;
}

export interface JobStatus {
  job_id?: string;
  book_id?: string;
  /** `failed` = the PDF itself couldn't be imported. `error` = the connection was rejected (bad token, unknown job). */
  status: "queued" | "processing" | "completed" | "failed" | "error";
  pages_done?: number;
  pages_total?: number;
  error?: string | null;
  /** Filled when the job completes: what was left out or changed (pages or pictures over the limit, page 1 used as the cover…). */
  warnings?: string[];
}

export interface Comment {
  id: string;
  book_id: string;
  user: { id: string; username: string };
  content: string;
  created_at: string;
  updated_at: string;
  edited: boolean;
}

export interface CommentList {
  comments: Comment[];
  total: number;
  page: number;
  per_page: number;
}

export const COMMENT_MAX = 2000;

export interface Order {
  id: string;
  user_id: string;
  book_id: string;
  quantity: number;
  total_price: number;
}

/**
 * pending: waiting for the customer or the bank. success: paid, the book is in the library.
 * failed: Paystack declined it. abandoned: never confirmed after the server's last automatic check.
 * refund_pending / refunding / refunded: money was taken that's being returned (paid after the checkout
 * was abandoned, the wrong amount, or the order was already paid). refund_failed: will be refunded by hand.
 */
export type PaymentStatus =
  | "pending" | "success" | "failed" | "abandoned"
  | "refund_pending" | "refunding" | "refunded" | "refund_failed";

export interface Payment {
  id: string;
  user_id: string;
  order_id: string;
  amount: number;
  currency: string;
  /** Paystack reference. Null for payments made before Paystack was added. */
  reference: string | null;
  status: PaymentStatus;
  /** The Paystack checkout page, only while the payment is pending. */
  checkout_url: string | null;
  created_at: string;
  paid_at: string | null;
}

/** POST /orders/{id}/pay: send the customer to `authorization_url`. */
export interface Checkout {
  reference: string;
  authorization_url: string;
  status: "pending";
}

export type Theme = "light" | "dark" | "system";

export interface Settings {
  theme: Theme;
  language: string;
  time_zone: string;
  email_notifications: boolean;
}

export interface LoginResult {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface FieldError {
  field: string;
  message: string;
}

export class ApiError extends Error {
  status: number;
  details: FieldError[];
  constructor(status: number, message: string, details: FieldError[] = []) {
    super(message);
    this.status = status;
    this.details = details;
  }
  fieldErrors(): Record<string, string> {
    return Object.fromEntries(this.details.map((d) => [d.field, d.message]));
  }
}

type Method = "GET" | "POST" | "PUT" | "DELETE";

/**
 * Auth lives in an httpOnly cookie that only the Next.js server can read.
 * /api/v1/* is a server route that attaches the bearer token, so no token ever touches browser JS.
 */
async function request<T>(method: Method, path: string, body?: unknown, base = "/api/v1"): Promise<T> {
  const headers: Record<string, string> = {};
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  if (body !== undefined && !isForm) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method,
      headers,
      credentials: "same-origin",
      cache: "no-store",
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "Couldn't reach the server. Check your connection and try again.");
  }

  let json: { success?: boolean; data?: T; error?: { message: string; details?: FieldError[] } } | null = null;
  try { json = await res.json(); } catch { /* non-JSON body */ }

  if (!res.ok || !json || json.success === false) {
    if (res.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new Event("mbooks:unauthorized"));
    }
    const msg = json?.error?.message ?? (res.status === 413 ? "That file is too large." : `Request failed (${res.status})`);
    throw new ApiError(res.status, msg, json?.error?.details ?? []);
  }
  return json.data as T;
}

/** Strip empty optional fields so the API's strict validation doesn't reject "". */
function clean(input: BookInput): BookInput {
  const out: BookInput = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined || v === null || v === "" || (typeof v === "number" && Number.isNaN(v))) continue;
    (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

export const api = {
  login: (email: string, password: string) => request<User>("POST", "/login", { email, password }, "/api/auth"),
  logout: () => request<null>("POST", "/logout", undefined, "/api/auth"),
  session: () => request<User | null>("GET", "/session", undefined, "/api/auth"),
  signup: (username: string, email: string, password: string) =>
    request<User>("POST", "/users", { username, email, password }),

  listBooks: (page = 1, perPage = 24) => request<Book[]>("GET", `/books?page=${page}&per_page=${perPage}`),
  getBook: (id: string) => request<Book>("GET", `/books/${id}`),
  createBook: (input: BookInput) => request<Book>("POST", "/books", clean(input)),
  updateBook: (id: string, input: BookInput) => request<Book>("PUT", `/books/${id}`, clean(input)),
  deleteBook: (id: string) => request<null>("DELETE", `/books/${id}`),
  myLibrary: () => request<Book[]>("GET", "/me/books"),

  // Account
  updateUser: (id: string, input: { username?: string; email?: string }) => request<User>("PUT", `/users/${id}`, input),
  deleteUser: (id: string) => request<null>("DELETE", `/users/${id}`),
  /** Re-reads the user from the API and rewrites the session cookie (after a profile change). */
  refreshSession: () => request<User | null>("POST", "/session", undefined, "/api/auth"),

  getSettings: () => request<Settings>("GET", "/me/settings"),
  updateSettings: (input: Partial<Settings>) => request<Settings>("PUT", "/me/settings", input),

  // Orders & payments
  orders: () => request<Order[]>("GET", "/orders"),
  createOrder: (book_id: string, quantity = 1) => request<Order>("POST", "/orders", { book_id, quantity }),
  deleteOrder: (id: string) => request<null>("DELETE", `/orders/${id}`),
  /** Starts (or reuses) a Paystack checkout. Paystack sends the customer back to `callback_url` with ?reference=… */
  payOrder: (id: string, callback_url: string) => request<Checkout>("POST", `/orders/${id}/pay`, { callback_url }),
  /** Asks the server to confirm the payment with Paystack. Safe to call repeatedly. */
  verifyPayment: (reference: string) => request<Payment>("POST", `/payments/${encodeURIComponent(reference)}/verify`),
  payments: () => request<Payment[]>("GET", "/payments"),

  coverSignature: () => request<CoverSignature>("POST", "/books/cover-signature"),

  listPages: (bookId: string, page = 1, perPage = 100) =>
    request<PageList>("GET", `/books/${bookId}/pages?page=${page}&per_page=${perPage}`),
  async allPages(bookId: string): Promise<Page[]> {
    const out: Page[] = [];
    for (let p = 1; p < 1000; p++) {
      const res = await api.listPages(bookId, p, 100);
      out.push(...res.pages);
      if (res.pages.length === 0 || out.length >= res.total) break;
    }
    return out.sort((a, b) => a.page_number - b.page_number);
  },
  getPage: (bookId: string, n: number) => request<Page>("GET", `/books/${bookId}/pages/${n}`),
  createPage: (bookId: string, page_number: number, content: string) =>
    request<Page>("POST", `/books/${bookId}/pages`, { page_number, content }),
  updatePage: (bookId: string, n: number, content: string) =>
    request<Page>("PUT", `/books/${bookId}/pages/${n}`, { content }),
  deletePage: (bookId: string, n: number) => request<null>("DELETE", `/books/${bookId}/pages/${n}`),

  pageImageSignature: (bookId: string) => request<PageImageSignature>("POST", `/books/${bookId}/images/signature`),

  getToc: (bookId: string) => request<TocEntry[]>("GET", `/books/${bookId}/toc`),
  replaceToc: (bookId: string, entries: TocInput[]) => request<TocEntry[]>("PUT", `/books/${bookId}/toc`, { entries }),

  // Comments: anyone can read them, newest first.
  listComments: (bookId: string, page = 1, perPage = 20) =>
    request<CommentList>("GET", `/books/${bookId}/comments?page=${page}&per_page=${perPage}`),
  addComment: (bookId: string, content: string) => request<Comment>("POST", `/books/${bookId}/comments`, { content }),
  editComment: (bookId: string, commentId: string, content: string) =>
    request<Comment>("PUT", `/books/${bookId}/comments/${commentId}`, { content }),
  deleteComment: (bookId: string, commentId: string) => request<null>("DELETE", `/books/${bookId}/comments/${commentId}`),

  importPdf: (bookId: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return request<PdfUploadAccepted>("POST", `/books/${bookId}/pdf`, fd);
  },
};

/** Upload a cover straight to Cloudinary using a signature from the API. Returns the public_id to send as `cover`. */
export async function uploadCover(file: File): Promise<{ publicId: string; url: string }> {
  const sig = await api.coverSignature();
  const fd = new FormData();
  fd.append("file", file);
  for (const [k, v] of Object.entries(sig.fields)) fd.append(k, v);
  const res = await fetch(sig.upload_url, { method: "POST", body: fd });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.public_id) {
    throw new ApiError(res.status, json?.error?.message ?? "The cover upload failed.");
  }
  return { publicId: json.public_id as string, url: json.secure_url as string };
}

/** What the page builder accepts for pictures. Cloudinary resizes them to fit 1600×1600. */
export const PAGE_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Upload a picture for a book's page straight to Cloudinary, using a one-image signature from the API.
 * Returns the address to use as the image node's `src`.
 */
export async function uploadPageImage(bookId: string, file: File): Promise<string> {
  if (!PAGE_IMAGE_TYPES.includes(file.type)) throw new ApiError(400, "Use a JPG, PNG or WebP picture.");
  const sig = await api.pageImageSignature(bookId);
  const fd = new FormData();
  fd.append("file", file);
  for (const [k, v] of Object.entries(sig.fields)) fd.append(k, v);
  let res: Response;
  try {
    res = await fetch(sig.upload_url, { method: "POST", body: fd });
  } catch {
    throw new ApiError(0, "Couldn't reach the image store. Check your connection and try again.");
  }
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.public_id) throw new ApiError(res.status, json?.error?.message ?? "The picture upload failed.");
  return sig.url;
}

/**
 * Follow PDF-import progress. The server opens the backend WebSocket (which needs the token in its URL)
 * and relays it here as Server-Sent Events. Returns a cleanup function.
 */
export function watchJob(jobId: string, onStatus: (s: JobStatus) => void): () => void {
  const es = new EventSource(`/api/jobs/${jobId}/events`);
  let finished = false;
  es.onmessage = (e) => {
    try {
      const s = JSON.parse(e.data) as JobStatus;
      if (["completed", "failed", "error"].includes(s.status)) { finished = true; es.close(); }
      onStatus(s);
    } catch { /* ignore */ }
  };
  es.onerror = () => {
    es.close();
    if (!finished) onStatus({ status: "error", error: "Lost the connection to the import job." });
  };
  return () => es.close();
}

export const EMPTY_DOC = JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] });

/** The API sends times as "2026-11-14 09:21:20.123456" in UTC. */
export function formatDateTime(value: string | null | undefined) {
  if (!value) return "";
  const iso = value.trim().replace(" ", "T").replace(/(\.\d{3})\d+/, "$1");
  const d = new Date(/([zZ]|[+-]\d\d:?\d\d)$/.test(iso) ? iso : `${iso}Z`);
  return Number.isNaN(d.getTime()) ? value : new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

export function formatPrice(n: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 2 }).format(n);
}
