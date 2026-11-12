"use client";

import { useRef, useState } from "react";
import { ApiError, uploadCover, type Book, type BookInput } from "@/lib/api";
import { BookCover } from "./BookCover";
import { useToast } from "./Toast";

interface Props {
  initial?: Book;
  submitLabel: string;
  busyLabel: string;
  onSubmit: (input: BookInput) => Promise<void>;
  compact?: boolean;
}

export function BookDetailsForm({ initial, submitLabel, busyLabel, onSubmit, compact = false }: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [author, setAuthor] = useState(initial?.author ?? "");
  const [price, setPrice] = useState(initial ? String(initial.price) : "");
  const [isbn, setIsbn] = useState(initial?.isbn ?? "");
  const [year, setYear] = useState(initial?.published_year ? String(initial.published_year) : "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [cover, setCover] = useState<{ publicId?: string; url?: string }>({ url: initial?.cover_url });
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  async function pickCover(file: File | undefined) {
    if (!file) return;
    if (!/^image\/(jpe?g|png|webp)$/.test(file.type)) { setErrors((e) => ({ ...e, cover: "Use a JPG, PNG or WebP image." })); return; }
    setUploading(true);
    setErrors((e) => { const next = { ...e }; delete next.cover; return next; });
    const preview = URL.createObjectURL(file);
    setCover({ url: preview });
    try {
      const res = await uploadCover(file);
      setCover({ publicId: res.publicId, url: res.url || preview });
      toast.success("Cover uploaded", "Save the details to keep it.");
    } catch (e) {
      setCover({ url: initial?.cover_url });
      setErrors((x) => ({ ...x, cover: e instanceof Error ? e.message : "Upload failed." }));
      toast.error("The cover didn't upload", e instanceof Error ? e.message : undefined);
    } finally {
      setUploading(false);
    }
  }

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = "Give the book a title.";
    if (!author.trim()) e.author = "Who wrote it?";
    const p = Number(price);
    if (price.trim() === "" || Number.isNaN(p) || p < 0) e.price = "Enter a price of 0 or more.";
    if (isbn && !/^[0-9Xx-]{10,13}$/.test(isbn.trim())) e.isbn = "ISBN should be 10 to 13 characters.";
    if (year && (!/^\d{1,4}$/.test(year) || Number(year) < 1)) e.published_year = "Enter a year like 2024.";
    return e;
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        title: title.trim(),
        author: author.trim(),
        price: Math.round(Number(price) * 100) / 100,
        isbn: isbn.trim() || undefined,
        published_year: year ? Number(year) : undefined,
        description: description.trim() || undefined,
        cover: cover.publicId,
      });
    } catch (e) {
      if (e instanceof ApiError) {
        setErrors(e.fieldErrors());
        setError(e.status === 409 ? "A book with that ISBN already exists." : e.message);
      } else setError("Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const field = (name: string) => ({ "aria-invalid": !!errors[name] });
  const err = (name: string) => errors[name] && <p className="field-error">{errors[name]}</p>;

  return (
    <form onSubmit={submit} noValidate className={`grid gap-10 ${compact ? "" : "md:grid-cols-[240px_1fr]"}`}>
      {/* Cover */}
      <div className={compact ? "flex items-start gap-5" : ""}>
        <div className={compact ? "w-28 shrink-0" : "w-full max-w-[240px]"}>
          <BookCover title={title || "Your title"} author={author || "Author"} url={cover.url} />
        </div>
        <div className={compact ? "" : "mt-4"}>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => pickCover(e.target.files?.[0])} />
          <button type="button" className="btn btn-soft btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? "Uploading…" : cover.url ? "Change cover" : "Upload cover"}
          </button>
          <p className="hint">JPG, PNG or WebP. Tall covers (2:3) look best.</p>
          {err("cover")}
        </div>
      </div>

      {/* Fields */}
      <div className="space-y-5">
        {error && <div className="alert-error" role="alert">{error}</div>}
        <div>
          <label className="label" htmlFor="title">Title</label>
          <input id="title" className="input font-display text-xl" maxLength={255} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="The Shop on Marina Road" {...field("title")} />
          {err("title")}
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="author">Author</label>
            <input id="author" className="input" maxLength={255} value={author} onChange={(e) => setAuthor(e.target.value)} {...field("author")} />
            {err("author")}
          </div>
          <div>
            <label className="label" htmlFor="price">Price (₦)</label>
            <input id="price" className="input" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="2500" {...field("price")} />
            {err("price")}
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="isbn">ISBN <span className="font-normal text-on-surface-muted">(optional)</span></label>
            <input id="isbn" className="input" maxLength={13} value={isbn} onChange={(e) => setIsbn(e.target.value)} {...field("isbn")} />
            {err("isbn")}
          </div>
          <div>
            <label className="label" htmlFor="year">Year published <span className="font-normal text-on-surface-muted">(optional)</span></label>
            <input id="year" className="input" inputMode="numeric" maxLength={4} value={year} onChange={(e) => setYear(e.target.value)} {...field("published_year")} />
            {err("published_year")}
          </div>
        </div>
        <div>
          <label className="label" htmlFor="description">Description <span className="font-normal text-on-surface-muted">(optional)</span></label>
          <textarea id="description" className="input" rows={5} maxLength={5000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's it about, and who will love it?" {...field("description")} />
          <p className="hint">{description.length}/5000</p>
          {err("description")}
        </div>
        <button className="btn btn-primary" disabled={busy || uploading}>{busy ? busyLabel : submitLabel}</button>
      </div>
    </form>
  );
}
