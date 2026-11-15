"use client";

import { createElement, useEffect, useRef, useState } from "react";

/** True once the element has scrolled into view. It stays true: things animate in once, not every pass. */
export function useInView<T extends Element>({ threshold = 0.15, margin = "0px 0px -10% 0px" } = {}) {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (!("IntersectionObserver" in window)) { setSeen(true); return; }
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setSeen(true); io.disconnect(); } },
      { threshold, rootMargin: margin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen, threshold, margin]);

  return [ref, seen] as const;
}

/**
 * How a section arrives. Each is defined in globals.css under "Scroll reveals":
 * - rise:   lifts into place
 * - print:  section headings: the double rule is drawn across, then the words rise beneath it
 * - shelve: its children drop in one after another, like books being shelved
 * - open:   the FAQ book opens flat
 */
type Kind = "rise" | "print" | "shelve" | "open";

interface Props extends React.HTMLAttributes<HTMLElement> {
  as?: "div" | "section" | "li" | "ol" | "p";
  kind?: Kind;
  /** Milliseconds to wait after coming into view. */
  delay?: number;
  threshold?: number;
}

/**
 * Marks its element `is-in` when it scrolls into view. The hidden starting state lives in CSS and only
 * applies when scripting is on and motion is welcome, so without either the content is simply there.
 */
export function Reveal({ as = "div", kind = "rise", delay, threshold, className = "", style, children, ...rest }: Props) {
  const [ref, seen] = useInView<HTMLElement>({ threshold });
  return createElement(
    as,
    {
      ...rest,
      ref,
      className: `reveal reveal-${kind} ${seen ? "is-in" : ""} ${className}`,
      style: delay ? ({ ...style, "--reveal-delay": `${delay}ms` } as React.CSSProperties) : style,
    },
    children,
  );
}
