"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

type Kind = "success" | "error" | "info";

interface ToastItem {
  id: number;
  kind: Kind;
  title: string;
  body?: string;
  duration: number;
  leaving?: boolean;
  tilt: number;
}

interface ToastApi {
  success: (title: string, body?: string) => void;
  error: (title: string, body?: string) => void;
  info: (title: string, body?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);
const MAX = 4;

const look: Record<Kind, { ribbon: string; ring: string; label: string }> = {
  success: { ribbon: "bg-success", ring: "bg-success text-on-success", label: "Done" },
  error: { ribbon: "bg-error", ring: "bg-error text-on-error", label: "Problem" },
  info: { ribbon: "bg-secondary", ring: "bg-secondary text-on-secondary", label: "Note" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 260);
  }, []);

  const push = useCallback((kind: Kind, title: string, body?: string) => {
    const id = nextId.current++;
    const item: ToastItem = { id, kind, title, body, duration: kind === "error" ? 7000 : 4500, tilt: id % 2 ? -1.2 : 1 };
    setItems((list) => [...list.slice(-(MAX - 1)), item]);
  }, []);

  const api = useMemo<ToastApi>(() => ({
    success: (t, b) => push("success", t, b),
    error: (t, b) => push("error", t, b),
    info: (t, b) => push("info", t, b),
  }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        role="region"
        aria-label="Notifications"
        className="pointer-events-none fixed inset-x-4 top-[84px] z-[100] flex flex-col items-center gap-3 sm:inset-x-auto sm:right-6 sm:items-end"
      >
        {items.map((t) => <Slip key={t.id} item={t} onDismiss={() => dismiss(t.id)} />)}
      </div>
    </ToastContext.Provider>
  );
}

function Slip({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const l = look[item.kind];
  return (
    <div
      role={item.kind === "error" ? "alert" : "status"}
      className={`toast group pointer-events-auto relative w-full max-w-[380px] ${item.leaving ? "toast-out" : "toast-in"}`}
      style={{ "--tilt": `${item.tilt}deg` } as React.CSSProperties}
    >
      {/* bookmark ribbon */}
      <span className={`toast-ribbon absolute -top-1.5 right-7 h-9 w-5 ${l.ribbon}`} aria-hidden />

      <div className="relative overflow-hidden rounded-[10px] border border-outline bg-surface shadow-[0_2px_4px_rgba(31,34,48,0.08),0_14px_32px_rgba(31,34,48,0.16)]">
        <div className="flex items-start gap-3.5 py-4 pr-12 pl-4">
          <span className={`toast-icon mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${l.ring}`} aria-hidden>
            <Icon kind={item.kind} />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold tracking-[0.1em] text-on-surface-muted uppercase">{l.label}</p>
            <p className="font-display text-[19px] leading-snug font-medium text-on-surface">{item.title}</p>
            {item.body && <p className="mt-0.5 text-sm leading-normal text-on-surface-muted">{item.body}</p>}
          </div>
        </div>

        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="absolute bottom-2 right-2 grid h-7 w-7 place-items-center rounded-full text-on-surface-muted hover:bg-surface-alt hover:text-on-surface"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
        </button>

        {/* countdown: pauses while hovered, dismisses when it runs out */}
        <span
          className={`toast-timer absolute bottom-0 left-0 h-[3px] w-full origin-left ${l.ribbon}`}
          style={{ animationDuration: `${item.duration}ms` }}
          onAnimationEnd={onDismiss}
          aria-hidden
        />
      </div>
    </div>
  );
}

function Icon({ kind }: { kind: Kind }) {
  const common = { width: 16, height: 16, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (kind === "success") return <svg {...common}><path className="toast-check" d="M3.5 8.5l3 3 6-7" /></svg>;
  if (kind === "error") return <svg {...common}><path d="M8 3.5v5.5" /><path d="M8 12.2v.3" /></svg>;
  // info: a tiny open book
  return <svg {...common} strokeWidth={1.8}><path d="M8 4.5C6.5 3 4 3 2 3.5v8c2-.5 4.5-.5 6 1 1.5-1.5 4-1.5 6-1v-8c-2-.5-4.5-.5-6 1zM8 4.5v8" /></svg>;
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
