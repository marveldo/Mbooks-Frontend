"use client";

import { useEffect, useState } from "react";
import { useInView } from "@/components/Reveal";

/**
 * A sentence that writes itself when it scrolls into view: `text`, then `em` in italics.
 * Rendered whole on the server (and for anyone who prefers reduced motion), then cleared and typed.
 */
export function Typewriter({ text, em = "", speed = 28 }: { text: string; em?: string; speed?: number }) {
  const [ref, seen] = useInView<HTMLSpanElement>({ threshold: 0.6, margin: "0px" });
  const total = text.length + em.length;
  const [shown, setShown] = useState(total);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!seen) { setShown(0); return; } // blank the page while it's still off screen
    const timer = setInterval(() => {
      setShown((n) => {
        if (n >= total) { clearInterval(timer); return n; }
        return n + 1;
      });
    }, speed);
    return () => clearInterval(timer);
  }, [seen, total, speed]);

  return (
    <span ref={ref}>
      {text.slice(0, shown)}
      {shown > text.length && <em>{em.slice(0, shown - text.length)}</em>}
    </span>
  );
}
