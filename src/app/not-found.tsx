import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-[1200px] flex-col items-center px-4 pt-16 text-center sm:px-6 md:pt-24">
      <p className="eyebrow">Page not found</p>

      {/* the missing book: a gap on the shelf between two spines */}
      <div className="mt-8 flex items-end gap-2 sm:gap-3" aria-hidden>
        <Spine className="h-[150px] bg-secondary sm:h-[210px]">4</Spine>
        <span className="grid h-[150px] w-[92px] place-items-center rounded-[3px] border-2 border-dashed border-outline font-display text-5xl text-neutral sm:h-[210px] sm:w-[132px] sm:text-7xl">0</span>
        <Spine className="h-[150px] -rotate-6 bg-primary sm:h-[210px]">4</Spine>
      </div>
      <div className="mt-0 h-[10px] w-[min(420px,90%)] rounded-b-[4px] bg-soft shadow-[0_6px_14px_rgba(31,34,48,0.1)]" aria-hidden />

      <h1 className="headline-lg mt-12">This one isn&apos;t on our shelves.</h1>
      <p className="mt-4 max-w-md text-lg text-on-surface-muted">
        The page you&apos;re after has been moved, taken down, or never existed. Check the address, or head back to the catalog.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn btn-primary">Browse the catalog</Link>
        <Link href="/studio" className="btn btn-soft">My studio</Link>
      </div>
    </div>
  );
}

function Spine({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`relative grid w-[92px] origin-bottom place-items-center overflow-hidden rounded-[3px] font-display text-5xl font-medium text-white shadow-[var(--shadow-spine)] sm:w-[132px] sm:text-7xl ${className}`}>
      {children}
      <span className="cover-sheen" />
    </span>
  );
}
