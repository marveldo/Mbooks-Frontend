"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { BookFilters, BookSort } from "@/lib/api";

const SORTS: { value: BookSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "title", label: "Title A–Z" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];

/** "" -> no limit; otherwise naira, rounded to kobo. */
const toNumber = (s: string) => (s.trim() === "" ? undefined : Math.round(Number(s) * 100) / 100);

/** True when any filter differs from the defaults. */
export const hasFilters = (f: BookFilters) =>
  !!(f.q || f.author || f.min_price !== undefined || f.max_price !== undefined || (f.sort && f.sort !== "newest"));

/**
 * Search, sort and price range. Typing is applied after a short pause, so each keystroke
 * doesn't start a new search.
 */
export function BookFiltersBar({ value, onChange, placeholder = "Search by title or author", children }: {
  value: BookFilters;
  onChange: (next: BookFilters) => void;
  placeholder?: string;
  /** extra controls on the left, e.g. shelf tabs */
  children?: ReactNode;
}) {
  const [q, setQ] = useState(value.q ?? "");
  const [min, setMin] = useState(value.min_price?.toString() ?? "");
  const [max, setMax] = useState(value.max_price?.toString() ?? "");

  const priceError =
    (min !== "" && (Number.isNaN(Number(min)) || Number(min) < 0)) || (max !== "" && (Number.isNaN(Number(max)) || Number(max) < 0))
      ? "Prices must be positive numbers."
      : min !== "" && max !== "" && Number(min) > Number(max)
        ? "The minimum is above the maximum."
        : null;

  // Apply typed text and prices 300ms after the last keystroke.
  useEffect(() => {
    if (priceError) return;
    const next = { q: q.trim() || undefined, min_price: toNumber(min), max_price: toNumber(max) };
    if (next.q === value.q && next.min_price === value.min_price && next.max_price === value.max_price) return;
    const t = setTimeout(() => onChange({ ...value, ...next }), 300);
    return () => clearTimeout(t);
  }, [q, min, max, priceError, value, onChange]);

  function clear() {
    setQ("");
    setMin("");
    setMax("");
    onChange({});
  }

  return (
    <div className="mb-10 space-y-4">
      {children}
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-[220px] flex-[2]">
          <span className="sr-only">Search</span>
          <input type="search" className="input" placeholder={placeholder} value={q} onChange={(e) => setQ(e.target.value)} maxLength={100} />
        </label>
        <label className="min-w-[180px] flex-1">
          <span className="mb-1 block text-xs font-bold tracking-wider text-on-surface-muted uppercase">Sort</span>
          <select className="input" value={value.sort ?? "newest"} onChange={(e) => onChange({ ...value, sort: e.target.value as BookSort })}>
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
        <fieldset className="flex min-w-[220px] flex-1 items-end gap-2">
          <legend className="sr-only">Price range in naira</legend>
          <label className="flex-1">
            <span className="mb-1 block text-xs font-bold tracking-wider text-on-surface-muted uppercase">Min ₦</span>
            <input className="input" inputMode="decimal" placeholder="0" value={min} onChange={(e) => setMin(e.target.value)} aria-invalid={!!priceError} />
          </label>
          <label className="flex-1">
            <span className="mb-1 block text-xs font-bold tracking-wider text-on-surface-muted uppercase">Max ₦</span>
            <input className="input" inputMode="decimal" placeholder="Any" value={max} onChange={(e) => setMax(e.target.value)} aria-invalid={!!priceError} />
          </label>
        </fieldset>
        {(hasFilters(value) || q || min || max) && (
          <button className="btn btn-soft btn-sm mb-1.5" onClick={clear}>Clear</button>
        )}
      </div>
      {priceError && <p className="field-error">{priceError}</p>}
    </div>
  );
}
