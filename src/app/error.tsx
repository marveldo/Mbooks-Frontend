"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Shown when a page throws while rendering. `reset` re-renders the page that failed. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col items-center px-4 pt-16 text-center sm:px-6 md:pt-24">
      <p className="eyebrow">Something went wrong</p>

      <div className="note relative mt-10 max-w-md -rotate-1 text-left">
        <span className="tape" aria-hidden />
        <p className="headline-sm">A page came loose from the binding.</p>
        <p className="mt-2 text-sm leading-relaxed">
          This part of Mbooks hit a problem it couldn&apos;t recover from. Nothing you saved is lost. Try again, and if it keeps happening, come back in a little while.
        </p>
        {error.digest && <p className="mt-3 text-xs opacity-70">Reference: {error.digest}</p>}
      </div>

      <h1 className="headline-lg mt-12">We couldn&apos;t show this page.</h1>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button className="btn btn-primary" onClick={reset}>Try again</button>
        <Link href="/" className="btn btn-soft">Back to the catalog</Link>
      </div>
    </div>
  );
}
