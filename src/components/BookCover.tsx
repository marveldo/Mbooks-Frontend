/* eslint-disable @next/next/no-img-element */

// [background, text, accent]: all from the design system palette
const palettes = [
  ["#A5563C", "#FAF6EE", "#E9C9B8"],
  ["#3F6A62", "#FAF6EE", "#BFD3CC"],
  ["#1F2230", "#FAF6EE", "#A5563C"],
  ["#EFE4D3", "#3A2A1E", "#A5563C"],
  ["#F2EBDF", "#1F2230", "#3F6A62"],
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

interface Props {
  title: string;
  author: string;
  url?: string | null;
  className?: string;
}

/** A cover with a spine shadow. Books without an image get one of three typeset covers. */
export function BookCover({ title, author, url, className = "" }: Props) {
  const shell = `cover relative aspect-[2/3] overflow-hidden rounded-[3px] shadow-spine ${className}`;

  if (url) {
    return (
      <div className={`${shell} bg-surface-alt`}>
        <img src={url} alt={`Cover of ${title}`} className="h-full w-full object-cover" />
        <span className="cover-sheen" />
      </div>
    );
  }

  const t = title || "Untitled";
  const a = author || "Unknown author";
  const h = hash(t + a);
  const [bg, fg, accent] = palettes[h % palettes.length];
  const layout = (h >> 3) % 3;
  const titleSize = t.length > 34 ? "9cqw" : t.length > 18 ? "11.5cqw" : "14cqw";
  const authorCls = "font-semibold tracking-[0.14em] uppercase";

  return (
    <div className={shell} style={{ background: bg, color: fg }} role="img" aria-label={`Cover of ${t} by ${a}`}>
      {layout === 0 && (
        // Framed, centred: a classic paperback
        <div className="absolute inset-[6%] flex flex-col items-center justify-between border py-[10%] text-center" style={{ borderColor: accent }}>
          <span className={authorCls} style={{ fontSize: "5cqw" }}>{a}</span>
          <span className="px-[8%] font-display leading-[1.08] font-medium break-words" style={{ fontSize: titleSize }}>{t}</span>
          <span style={{ color: accent, fontSize: "9cqw" }} className="font-display leading-none">✦</span>
        </div>
      )}
      {layout === 1 && (
        // Oversized initial behind the title
        <>
          <span className="absolute -top-[8%] -right-[6%] font-display leading-none font-bold select-none" style={{ fontSize: "95cqw", color: accent, opacity: 0.55 }} aria-hidden>
            {t[0].toUpperCase()}
          </span>
          <div className="absolute inset-0 flex flex-col justify-end p-[10%]">
            <span className="font-display leading-[1.05] font-medium break-words" style={{ fontSize: titleSize }}>{t}</span>
            <span className="mt-[6%] h-px w-[30%]" style={{ background: fg, opacity: 0.6 }} />
            <span className={`mt-[6%] ${authorCls}`} style={{ fontSize: "5cqw" }}>{a}</span>
          </div>
        </>
      )}
      {layout === 2 && (
        // Colour band with stacked rules
        <>
          <div className="absolute inset-x-0 top-0 flex h-[58%] items-end p-[10%]" style={{ background: accent, color: accent === "#A5563C" || accent === "#3F6A62" ? "#FAF6EE" : "#1F2230" }}>
            <span className="font-display leading-[1.05] font-medium break-words" style={{ fontSize: titleSize }}>{t}</span>
          </div>
          <div className="absolute inset-x-[10%] top-[64%] space-y-[4%]" aria-hidden>
            {[100, 100, 62].map((w, i) => <span key={i} className="block h-[1.5px]" style={{ width: `${w}%`, background: fg, opacity: 0.35 }} />)}
          </div>
          <span className={`absolute inset-x-[10%] bottom-[8%] ${authorCls}`} style={{ fontSize: "5cqw" }}>{a}</span>
        </>
      )}
      <span className="cover-sheen" />
    </div>
  );
}
