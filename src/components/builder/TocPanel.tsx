"use client";

import { useEffect, useState } from "react";
import { api, ApiError, type Page, type TocInput } from "@/lib/api";
import { headings } from "./doc";
import { useToast } from "@/components/Toast";

interface Row extends TocInput { key: number }
let nextKey = 1;
const row = (r: TocInput): Row => ({ ...r, key: nextKey++ });

export function TocPanel({ bookId, pages, onJump }: { bookId: string; pages: Page[]; onJump: (n: number) => void }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const maxPage = Math.max(1, ...pages.map((p) => p.page_number));

  useEffect(() => {
    api.getToc(bookId)
      .then((entries) => setRows(entries.sort((a, b) => a.position - b.position).map((e) => row({ title: e.title, level: e.level, page_number: e.page_number }))))
      .catch(() => setRows([]));
  }, [bookId]);

  const update = (key: number, patch: Partial<TocInput>) => setRows((rs) => rs!.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const move = (i: number, d: -1 | 1) => setRows((rs) => {
    const a = [...rs!];
    const j = i + d;
    if (j < 0 || j >= a.length) return a;
    [a[i], a[j]] = [a[j], a[i]];
    return a;
  });

  function fromHeadings() {
    const found: Row[] = [];
    for (const p of pages) for (const h of headings(p.content)) found.push(row({ ...h, page_number: p.page_number }));
    if (!found.length) { setMsg({ kind: "err", text: "No headings found. Use “Chapter title” or “Section” in the page editor, then try again." }); return; }
    if (rows?.length && !window.confirm(`Replace the current ${rows.length} entries with ${found.length} entries from your headings?`)) return;
    setRows(found);
    setMsg({ kind: "ok", text: `Found ${found.length} headings. Review them, then save.` });
  }

  async function save() {
    const bad = rows!.find((r) => !r.title.trim());
    if (bad) { setMsg({ kind: "err", text: "Every entry needs a title." }); return; }
    setBusy(true);
    setMsg(null);
    try {
      await api.replaceToc(bookId, rows!.map(({ title, level, page_number }) => ({ title: title.trim(), level, page_number })));
      toast.success("Contents saved", `${rows!.length} ${rows!.length === 1 ? "entry" : "entries"} in the table of contents.`);
    } catch (e) {
      toast.error("Contents not saved", e instanceof ApiError ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  }

  if (rows === null) return <p className="text-on-surface-muted">Loading contents…</p>;

  return (
    <div className="mx-auto max-w-[760px]">
      <p className="eyebrow">Table of contents</p>
      <h2 className="headline-md mt-2">Contents</h2>
      <p className="mt-2 text-on-surface-muted">Readers use this to jump around the book. Build it from your headings, or add entries by hand.</p>

      <div className="mt-6 flex flex-wrap gap-3">
        <button className="btn btn-soft btn-sm" onClick={fromHeadings}>Build from headings</button>
        <button className="btn btn-soft btn-sm" onClick={() => setRows((rs) => [...rs!, row({ title: "", level: 0, page_number: maxPage })])}>Add entry</button>
      </div>

      {msg && <p className={`mt-5 text-sm font-semibold ${msg.kind === "ok" ? "text-success" : "text-error"}`} role="status">{msg.text}</p>}

      <div className="card mt-6 p-0">
        {rows.length === 0 && <p className="p-8 text-center text-on-surface-muted">No entries yet.</p>}
        <ol className="divide-y divide-outline">
          {rows.map((r, i) => (
            <li key={r.key} className="flex flex-wrap items-center gap-2 p-3 sm:flex-nowrap">
              <div className="flex min-w-0 flex-1 items-center" style={{ paddingLeft: r.level * 20 }}>
                <input
                  className="input min-h-10 py-2"
                  value={r.title}
                  maxLength={500}
                  placeholder={r.level === 0 ? "Chapter title" : "Section title"}
                  onChange={(e) => update(r.key, { title: e.target.value })}
                  aria-label={`Entry ${i + 1} title`}
                />
              </div>
              <select className="h-10 rounded-md border border-outline bg-surface px-2 text-sm" value={r.level} onChange={(e) => update(r.key, { level: Number(e.target.value) })} aria-label="Level">
                <option value={0}>Chapter</option>
                <option value={1}>Section</option>
                <option value={2}>Subsection</option>
              </select>
              <label className="flex items-center gap-1 text-sm text-on-surface-muted">
                p.
                <input
                  type="number"
                  min={1}
                  className="h-10 w-20 rounded-md border border-outline bg-surface px-2 text-on-surface"
                  value={r.page_number}
                  onChange={(e) => update(r.key, { page_number: Math.max(1, Number(e.target.value) || 1) })}
                  aria-label="Page number"
                />
              </label>
              <div className="flex">
                <button className="grid h-10 w-8 place-items-center rounded hover:bg-surface-alt" title="Go to page" onClick={() => onJump(r.page_number)}>→</button>
                <button className="grid h-10 w-8 place-items-center rounded hover:bg-surface-alt disabled:opacity-30" title="Move up" disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
                <button className="grid h-10 w-8 place-items-center rounded hover:bg-surface-alt disabled:opacity-30" title="Move down" disabled={i === rows.length - 1} onClick={() => move(i, 1)}>↓</button>
                <button className="grid h-10 w-8 place-items-center rounded text-error hover:bg-surface-alt" title="Remove" onClick={() => setRows((rs) => rs!.filter((x) => x.key !== r.key))}>×</button>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-6">
        <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save contents"}</button>
      </div>
    </div>
  );
}
