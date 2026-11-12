"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiError, COMMENT_MAX, type Comment } from "@/lib/api";
import { canEdit, useAuth } from "@/lib/auth";
import { useToast } from "@/components/Toast";

const PER_PAGE = 20;

function when(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/** Reader comments on a book. Anyone can read them; you need an account to write one. */
export function Comments({ bookId, ownerId }: { bookId: string; ownerId: string | null }) {
  const { user, ready } = useAuth();
  const toast = useToast();

  const [items, setItems] = useState<Comment[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);

  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let off = false;
    setItems(null);
    setFailed(false);
    api.listComments(bookId, 1, PER_PAGE)
      .then((res) => { if (!off) { setItems(res.comments); setTotal(res.total); setPage(1); } })
      .catch(() => { if (!off) { setItems([]); setFailed(true); } });
    return () => { off = true; };
  }, [bookId]);

  async function more() {
    setLoadingMore(true);
    try {
      const res = await api.listComments(bookId, page + 1, PER_PAGE);
      // New comments shift the pages along, so skip any we already have.
      setItems((cur) => { const seen = new Set((cur ?? []).map((c) => c.id)); return [...(cur ?? []), ...res.comments.filter((c) => !seen.has(c.id))]; });
      setTotal(res.total);
      setPage((p) => p + 1);
    } catch (e) {
      toast.error("Couldn't load more comments", e instanceof ApiError ? e.message : undefined);
    } finally {
      setLoadingMore(false);
    }
  }

  async function post(e: React.FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content) return;
    setPosting(true);
    try {
      const c = await api.addComment(bookId, content);
      setItems((cur) => [c, ...(cur ?? [])]);
      setTotal((t) => t + 1);
      setDraft("");
    } catch (err) {
      toast.error("Couldn't post your comment", err instanceof ApiError ? err.message : undefined);
    } finally {
      setPosting(false);
    }
  }

  async function saveEdit() {
    if (!editing) return;
    const content = editing.text.trim();
    if (!content) return;
    setBusyId(editing.id);
    try {
      const c = await api.editComment(bookId, editing.id, content);
      setItems((cur) => cur?.map((x) => (x.id === c.id ? c : x)) ?? cur);
      setEditing(null);
    } catch (err) {
      toast.error("Couldn't save your edit", err instanceof ApiError ? err.message : undefined);
    } finally {
      setBusyId(null);
    }
  }

  async function remove(c: Comment) {
    if (!window.confirm("Delete this comment? This can't be undone.")) return;
    setBusyId(c.id);
    try {
      await api.deleteComment(bookId, c.id);
      setItems((cur) => cur?.filter((x) => x.id !== c.id) ?? cur);
      setTotal((t) => Math.max(0, t - 1));
      toast.info("Comment deleted");
    } catch (err) {
      toast.error("Couldn't delete the comment", err instanceof ApiError ? err.message : undefined);
    } finally {
      setBusyId(null);
    }
  }

  const shown = items?.length ?? 0;

  return (
    <section id="comments" className="scroll-mt-24">
      <p className="eyebrow">Readers</p>
      <h2 className="headline-md mt-2">
        Comments{total > 0 && <span className="ml-2 font-sans text-base font-semibold text-on-surface-muted">{total}</span>}
      </h2>

      {/* Write one */}
      {ready && (user ? (
        <form onSubmit={post} className="card mt-6">
          <label htmlFor="new-comment" className="label">Add a comment as {user.username}</label>
          <textarea
            id="new-comment"
            className="input"
            rows={3}
            maxLength={COMMENT_MAX}
            placeholder="What did you think of it?"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="mt-3 flex items-center justify-between gap-4">
            <span className={`text-xs tabular-nums ${draft.length > COMMENT_MAX - 100 ? "font-bold text-error" : "text-on-surface-muted"}`}>{draft.length} / {COMMENT_MAX}</span>
            <button className="btn btn-primary btn-sm" disabled={posting || !draft.trim()}>{posting ? "Posting…" : "Post comment"}</button>
          </div>
        </form>
      ) : (
        <div className="note mt-6 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm">Log in to join the conversation.</p>
          <Link href={`/login?next=${encodeURIComponent(`/books/${bookId}#comments`)}`} className="btn btn-primary btn-sm">Log in to comment</Link>
        </div>
      ))}

      {/* Read them */}
      {items === null && <p className="mt-8 text-on-surface-muted">Loading comments…</p>}
      {failed && <p className="mt-8 text-on-surface-muted">Couldn&apos;t load the comments. Refresh to try again.</p>}
      {items && !failed && items.length === 0 && <p className="mt-8 text-on-surface-muted">No comments yet. Be the first to say something.</p>}

      {items && items.length > 0 && (
        <ol className="mt-8 divide-y divide-outline border-t border-outline">
          {items.map((c) => {
            const mine = user?.id === c.user.id;
            const removable = mine || canEdit(user, ownerId); // author, the book's owner, or an admin
            const isEditing = editing?.id === c.id;
            const busy = busyId === c.id;
            return (
              <li key={c.id} className="flex gap-4 py-6">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-soft font-display text-lg font-bold text-on-soft" aria-hidden>
                  {c.user.username.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                    <span className="font-bold">{c.user.username}</span>
                    {c.user.id === ownerId && <span className="chip chip-accent">Author</span>}
                    <span className="text-on-surface-muted">{when(c.created_at)}{c.edited && " · edited"}</span>
                  </p>

                  {isEditing ? (
                    <div className="mt-3">
                      <textarea
                        className="input"
                        rows={3}
                        maxLength={COMMENT_MAX}
                        value={editing.text}
                        onChange={(e) => setEditing({ id: c.id, text: e.target.value })}
                        aria-label="Edit your comment"
                        autoFocus
                      />
                      <div className="mt-3 flex gap-3">
                        <button className="btn btn-primary btn-sm" disabled={busy || !editing.text.trim()} onClick={saveEdit}>{busy ? "Saving…" : "Save"}</button>
                        <button className="btn btn-soft btn-sm" disabled={busy} onClick={() => setEditing(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="mt-2 leading-relaxed break-words whitespace-pre-line">{c.content}</p>
                      {(mine || removable) && (
                        <div className="mt-2 flex gap-4 text-sm font-semibold">
                          {mine && <button className="text-secondary hover:underline" disabled={busy} onClick={() => setEditing({ id: c.id, text: c.content })}>Edit</button>}
                          {removable && <button className="text-error hover:underline" disabled={busy} onClick={() => remove(c)}>{busy ? "Deleting…" : "Delete"}</button>}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {items && shown < total && (
        <button className="btn btn-soft mt-2" disabled={loadingMore} onClick={more}>{loadingMore ? "Loading…" : `Show more (${total - shown} left)`}</button>
      )}
    </section>
  );
}
