import { BookMark } from "./Logo";
import { BookCover } from "./BookCover";

interface Props {
  eyebrow: string;
  title: string;
  intro: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
  quote?: string;
}

export function AuthCard({ eyebrow, title, intro, children, aside, quote = "Every reader is one good book away from becoming a writer." }: Props) {
  return (
    <div className="mx-auto grid max-w-[1100px] gap-6 px-4 pt-10 sm:px-6 md:grid-cols-[1fr_1.1fr] md:pt-16">
      {/* Terracotta panel */}
      <div className="relative hidden min-h-[560px] overflow-hidden rounded-[12px] bg-brand p-10 text-white md:flex md:flex-col md:justify-between">
        <div className="flex items-center gap-3">
          <BookMark size={48} cover="#1F2230" />
          <span className="font-display text-3xl font-bold">Mbooks</span>
        </div>
        <p className="relative z-10 max-w-[15ch] font-display text-[40px] leading-[1.1] font-medium">
          <span className="mb-2 block text-[72px] leading-[0.6] text-white/40" aria-hidden>“</span>
          {quote}
        </p>
        {/* covers peeking up from the bottom corner */}
        <div className="absolute -right-10 -bottom-24 flex w-[70%] gap-4" aria-hidden>
          <div className="w-1/2 translate-y-10 -rotate-[8deg]"><BookCover title="Chapter One" author="You" /></div>
          <div className="w-1/2 rotate-[6deg]"><BookCover title="Your Story Here" author="A new author" /></div>
        </div>
        <span />
      </div>

      {/* Form */}
      <div className="rise">
        <div className="card p-8 sm:p-10">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="headline-lg mt-3">{title}</h1>
          <p className="mt-3 leading-relaxed text-on-surface-muted">{intro}</p>
          <div className="mt-8">{children}</div>
        </div>
        {aside && <div className="mt-6">{aside}</div>}
      </div>
    </div>
  );
}
