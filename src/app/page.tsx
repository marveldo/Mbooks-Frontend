import { HomePage } from "@/components/HomePage";
import type { BookList } from "@/lib/api";
import { BACKEND_URL } from "@/lib/server/session";

/**
 * The newest books are fetched here, on the server, so they are already in the HTML that reaches
 * the browser (and search engines). The page is built ahead of time and rebuilt in the background
 * at most once a minute, so visitors never wait on the API for it.
 */
export const revalidate = 60;

/** Enough for the hero (3) and two rows of the catalog (8 on wide screens; phones show the first 4). */
const FIRST_PAGE = 8;

async function newestBooks(): Promise<BookList | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/books?page=1&per_page=${FIRST_PAGE}`, {
      next: { revalidate },
      // The API can take a while to wake up. Don't hold the page for it: the browser fetches instead.
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.success && Array.isArray(json.data?.books) ? (json.data as BookList) : null;
  } catch {
    return null;
  }
}

export default async function Home() {
  return <HomePage initial={await newestBooks()} />;
}
