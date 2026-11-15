"use client";

/** Page numbers to show: always the first and last, the current one and its neighbours, "…" between gaps. */
function pageList(page: number, pages: number): (number | "…")[] {
  const wanted = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
  const sorted = [...wanted].sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push("…");
    out.push(n);
  });
  return out;
}

/** ← Previous · 1 … 4 5 6 … 12 · Next → */
export function Pager({ page, pages, onPage, disabled }: { page: number; pages: number; onPage: (page: number) => void; disabled?: boolean }) {
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pages" className="mt-14 flex flex-wrap items-center justify-center gap-2">
      <button className="btn btn-soft btn-sm" disabled={disabled || page <= 1} onClick={() => onPage(page - 1)}>← Previous</button>
      {pageList(page, pages).map((n, i) =>
        n === "…" ? (
          <span key={`gap${i}`} className="px-1 text-on-surface-muted" aria-hidden>…</span>
        ) : (
          <button
            key={n}
            className={`btn btn-sm min-w-[40px] ${n === page ? "btn-primary" : "btn-soft"}`}
            aria-current={n === page ? "page" : undefined}
            aria-label={`Page ${n}`}
            disabled={disabled}
            onClick={() => n !== page && onPage(n)}
          >
            {n}
          </button>
        ),
      )}
      <button className="btn btn-soft btn-sm" disabled={disabled || page >= pages} onClick={() => onPage(page + 1)}>Next →</button>
    </nav>
  );
}
