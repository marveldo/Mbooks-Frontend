import Link from "next/link";
import { formatPrice, type Book } from "@/lib/api";
import { BookCover } from "./BookCover";

export function BookCard({ book, href, badge, index }: { book: Book; href?: string; badge?: string; index?: number }) {
  return (
    <Link href={href ?? `/books/${book.id}`} className="group block">
      <div className="relative">
        {/* a parchment "shelf shadow" card that the cover lifts off on hover */}
        <span className="absolute inset-0 rounded-[3px] bg-soft transition-transform duration-300 group-hover:translate-x-2 group-hover:translate-y-2 group-hover:rotate-2" aria-hidden />
        <BookCover
          title={book.title}
          author={book.author}
          url={book.cover_url}
          className="transition-transform duration-300 ease-out group-hover:-translate-y-1.5 group-hover:-rotate-1"
        />
        {badge && <span className="chip chip-accent absolute top-3 left-3">{badge}</span>}
      </div>
      <div className="mt-5 flex items-baseline gap-3">
        {index !== undefined && <span className="font-display text-sm text-primary">{String(index + 1).padStart(2, "0")}</span>}
        <h3 className="font-display text-xl leading-snug font-medium text-on-surface decoration-primary decoration-2 underline-offset-4 group-hover:underline">{book.title}</h3>
      </div>
      <p className="mt-1 text-sm font-semibold text-on-surface-muted">{book.author}</p>
      <p className="mt-2 font-bold">{formatPrice(book.price)}</p>
    </Link>
  );
}

export function BookGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-[2/3] rounded-[3px] bg-surface-alt" />
          <div className="mt-5 h-5 w-3/4 rounded bg-surface-alt" />
          <div className="mt-2 h-4 w-1/2 rounded bg-surface-alt" />
        </div>
      ))}
    </div>
  );
}
