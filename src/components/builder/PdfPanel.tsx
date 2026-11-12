"use client";

import { useEffect, useRef, useState } from "react";
import { api, ApiError, watchJob, type JobStatus } from "@/lib/api";
import { useToast } from "@/components/Toast";

const LABEL: Record<JobStatus["status"], string> = {
  queued: "Waiting to start…",
  processing: "Reading your PDF…",
  completed: "Done — your pages are ready",
  failed: "The import failed",
  error: "The import failed",
};

export function PdfPanel({ bookId, pageCount, onDone }: { bookId: string; pageCount: number; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const stop = useRef<(() => void) | null>(null);
  const toast = useToast();

  useEffect(() => () => stop.current?.(), []);

  async function start() {
    if (!file) return;
    if (pageCount > 0 && !window.confirm(`Importing replaces all ${pageCount} pages and the table of contents. Continue?`)) return;
    setBusy(true);
    setError(null);
    setStatus({ status: "queued" });
    try {
      const job = await api.importPdf(bookId, file);
      stop.current?.();
      stop.current = watchJob(job.job_id, (s) => {
        setStatus(s);
        if (s.status === "completed") {
          setBusy(false);
          const notes = s.warnings?.length ?? 0;
          toast.success(
            "Import finished",
            `${s.pages_total ? `${s.pages_total} pages are ready to edit.` : "Your pages are ready to edit."}${notes ? ` ${notes} thing${notes === 1 ? "" : "s"} to know — see the notes.` : ""}`,
          );
          onDone();
        }
        if (s.status === "failed" || s.status === "error") {
          setBusy(false);
          // `failed` is about the PDF itself (password protected, unreadable); `error` is the connection.
          const fallback = s.status === "failed" ? "We couldn't read that PDF. Check it isn't password protected, then try again." : "We lost track of the import. Reload the page to see whether it finished.";
          setError(s.error || fallback);
          toast.error("The import failed", s.error || undefined);
        }
      });
    } catch (e) {
      setBusy(false);
      setStatus(null);
      setError(
        e instanceof ApiError
          ? e.status === 409 ? "A PDF is already being imported for this book. Wait for it to finish."
            : e.status === 413 ? "That PDF is too large. The limit is 20 MB."
            : e.message
          : "Upload failed.",
      );
    }
  }

  const done = status?.status === "completed";
  const pct = status?.pages_total ? Math.round(((status.pages_done ?? 0) / status.pages_total) * 100) : null;
  const warnings = done ? status?.warnings ?? [] : [];

  return (
    <div className="mx-auto max-w-[640px]">
      <p className="eyebrow">Import</p>
      <h2 className="headline-md mt-2">Import from a PDF</h2>
      <p className="mt-2 text-on-surface-muted">
        Already have the manuscript? We&apos;ll pull the text, headings, pictures and outline out of the PDF and turn them into pages and a table of contents.
      </p>
      <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-on-surface-muted">
        <li>Up to 20 MB. A PDF longer than 2,000 pages imports its first 2,000.</li>
        <li>If page 1 looks like a cover and the book has none, it becomes the book&apos;s cover.</li>
        <li>Printed contents pages are dropped when the PDF has its own outline.</li>
      </ul>

      {pageCount > 0 && !done && (
        <div className="note mt-6 text-sm">
          <strong>Heads up:</strong> this book already has {pageCount} page{pageCount === 1 ? "" : "s"}. Importing replaces all of them, and the table of contents.
        </div>
      )}

      <label className="card mt-6 flex cursor-pointer flex-col items-center gap-3 border-2 border-dashed py-12 text-center hover:bg-surface-alt">
        <input type="file" accept="application/pdf" className="sr-only" disabled={busy} onChange={(e) => { setFile(e.target.files?.[0] ?? null); setStatus(null); setError(null); }} />
        <span className="headline-sm">{file ? file.name : "Choose a PDF"}</span>
        <span className="text-sm text-on-surface-muted">{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : "Click to pick a file from your computer"}</span>
      </label>

      {error && <div className="alert-error mt-5" role="alert">{error}</div>}

      {status && !error && (
        <div className="mt-6" role="status">
          <div className="flex justify-between text-sm font-semibold">
            <span>{LABEL[status.status]}</span>
            {status.pages_total ? <span>{status.pages_done ?? 0} / {status.pages_total} pages</span> : null}
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-alt">
            <div
              className={`h-full rounded-full transition-all ${done ? "bg-success" : "bg-secondary"} ${pct === null && !done ? "w-1/3 animate-pulse" : ""}`}
              style={pct !== null || done ? { width: `${done ? 100 : pct}%` } : undefined}
            />
          </div>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="note mt-6 text-sm">
          <p className="font-bold">Import notes</p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 leading-relaxed">
            {warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      <button className="btn btn-primary mt-6" disabled={!file || busy} onClick={start}>{busy ? "Importing…" : "Import PDF"}</button>
    </div>
  );
}
