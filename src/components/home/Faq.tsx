"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { Reveal } from "@/components/Reveal";

interface Entry { q: string; a: React.ReactNode }

/** Highlighter pen over the fact worth remembering. The stroke draws when the answer opens. */
const Hl = ({ children }: { children: React.ReactNode }) => <mark className="faq-hl">{children}</mark>;

// Left-hand page. Every figure here comes from how the import actually behaves.
const IMPORTING: Entry[] = [
  {
    q: "I already have the manuscript as a PDF. What do you do with it?",
    a: <>We read it the way a typesetter would: the text, the headings, the pictures and the outline. They come out as pages in the builder, and the outline becomes your table of contents. You watch the page count climb while it works, and when it stops, the pages are yours to edit.</>,
  },
  {
    q: "How long a book can I bring in?",
    a: <>A PDF of up to <Hl>20 MB</Hl>. If it runs past <Hl>2,000 pages</Hl> we take the first 2,000 and say so in the import notes, along with anything else we had to leave out.</>,
  },
  {
    q: "I've written a few pages already. Will the import keep them?",
    a: <>No, and this is the one to know before you press the button. An import <Hl>replaces every page</Hl> and the table of contents, pictures you added by hand included. Your title, price and other details are untouched. So import first, then write on top.</>,
  },
  {
    q: "What happens to my cover and my printed contents page?",
    a: <>If page one looks like a cover and the book doesn&apos;t have one yet, it <Hl>becomes the cover</Hl> and leaves the pages. If the PDF carries its own outline, the printed contents pages are dropped, because the outline does that job now. The import notes tell you whenever either happens.</>,
  },
  {
    q: "It says the import failed. What went wrong?",
    a: <>Nearly always the file itself: a PDF <Hl>locked with a password</Hl>, or one we can&apos;t read. Take the password off and try again. A book also takes one import at a time, so if one is still running, the next has to wait for it.</>,
  },
];

// Right-hand page.
const BUILDING: Entry[] = [
  {
    q: "Do I have to keep pressing save?",
    a: <>No. The page saves itself a moment after you stop typing, and the badge in the corner says where things stand. <Hl>Ctrl or ⌘ + S</Hl> saves on the spot. If a save doesn&apos;t go through, your words stay on the screen and we try again on your next edit.</>,
  },
  {
    q: "How do I get a table of contents without typing one out?",
    a: <>Give each chapter opening the <Hl>Chapter title</Hl> style, with Section and Subsection beneath it. Then open Contents and press <Hl>Build from headings</Hl>. Every heading arrives with its page number, ready to reorder, rename or trim before you save.</>,
  },
  {
    q: "Can I put pictures on a page?",
    a: <>Press Picture, or drop or paste one straight onto the page. JPG, PNG and WebP all work, and big ones are scaled down to fit <Hl>1600 × 1600</Hl>. To swap a figure the PDF import got wrong, click it and press Replace.</>,
  },
  {
    q: "Is the book locked once it's on the shelf?",
    a: <>It never locks. The book is in the catalog from the moment you create it, and the builder stays open to you for as long as it&apos;s yours. Press <Hl>Read</Hl> in the builder to see any page the way a reader will.</>,
  },
];

function Page({ side, head, folio, entries, startAt }: { side: "left" | "right"; head: string; folio: number; entries: Entry[]; startAt: number }) {
  const [open, setOpen] = useState<number | null>(0);
  const base = useId();

  return (
    <div className={`faq-page faq-page-${side}`}>
      <p className="faq-head">{head}</p>
      <ol>
        {entries.map((e, i) => {
          const isOpen = open === i;
          return (
            <li key={e.q} className="faq-item" data-open={isOpen}>
              <h3>
                <button className="faq-q" aria-expanded={isOpen} aria-controls={`${base}-${i}`} onClick={() => setOpen(isOpen ? null : i)}>
                  <span className="faq-n">{String(startAt + i).padStart(2, "0")}</span>
                  <span className="flex-1">{e.q}</span>
                  <span className="faq-ribbon" aria-hidden />
                </button>
              </h3>
              <div id={`${base}-${i}`} className="faq-a" role="region" aria-hidden={!isOpen}>
                <div><p>{e.a}</p></div>
              </div>
            </li>
          );
        })}
      </ol>
      <span className="faq-folio" aria-hidden>{folio}</span>
    </div>
  );
}

/** The questions writers ask first, typeset as an open book: importing on the left page, the builder on the right. */
export function Faq({ startHref }: { startHref: string }) {
  return (
    <section id="questions" className="mx-auto max-w-[1200px] scroll-mt-24 px-4 pt-24 sm:px-6">
      <Reveal kind="print" className="rule-double pt-6">
        <p className="eyebrow">№ 03 · Asked at the counter</p>
        <h2 className="headline-lg mt-2 !text-[clamp(36px,5vw,56px)]">Before you bring your book in</h2>
      </Reveal>

      <Reveal kind="open" className="faq-book mt-12" threshold={0.12}>
        <Page side="left" head="Importing a PDF" folio={12} entries={IMPORTING} startAt={1} />
        <Page side="right" head="The page builder" folio={13} entries={BUILDING} startAt={IMPORTING.length + 1} />
      </Reveal>

      <Reveal as="p" className="mt-10 text-center text-on-surface-muted">
        The quickest answer is to try it.{" "}
        <Link href={startHref} className="btn-link">Start a book</Link>
        , and Import PDF is the fourth tab along.
      </Reveal>
    </section>
  );
}
