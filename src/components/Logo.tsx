import Link from "next/link";

const INK = "#1F2230";
const lines = [0, 1, 2, 3].map((i) => 42 + i * 11);

/** The Mbooks open-book mark: ink outline, cream pages, coloured cover behind. */
export function BookMark({ size = 44, cover = "#A5563C" }: { size?: number; cover?: string }) {
  return (
    <svg width={size} height={(size * 112) / 150} viewBox="0 0 150 112" aria-hidden="true" className="shrink-0">
      {/* cover */}
      <path d="M4 24H146V95H93L75 106L57 95H4Z" fill={cover} />
      {/* page block */}
      <path
        d="M12 15C30 6 60 4 75 31C90 4 120 6 138 15V89C112 84 90 88 75 101C60 88 38 84 12 89Z"
        fill="#FBF7EF" stroke={INK} strokeWidth="3.2" strokeLinejoin="round"
      />
      {/* page edges */}
      <path d="M12 83C38 78 60 82 75 95C90 82 112 78 138 83" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M12 86C38 81 60 85 75 98C90 85 112 81 138 86" fill="none" stroke={INK} strokeWidth="1" opacity="0.55" />
      {/* spine */}
      <path d="M75 31V95" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
      {/* text lines */}
      <g fill="none" stroke="#D8C4A0" strokeWidth="2.2" strokeLinecap="round">
        {lines.map((y) => (
          <g key={y}>
            <path d={`M68 ${y}C58 ${y - 13} 38 ${y - 16} 21 ${y - 11}`} />
            <path d={`M82 ${y}C92 ${y - 13} 112 ${y - 16} 129 ${y - 11}`} />
          </g>
        ))}
      </g>
    </svg>
  );
}

export function Logo({ light = false, size = 44 }: { light?: boolean; size?: number }) {
  return (
    <Link href="/" className="group inline-flex items-center gap-3" aria-label="Mbooks home">
      <span className="transition-transform duration-300 group-hover:-rotate-6">
        <BookMark size={size} cover={light ? INK : undefined} />
      </span>
      <span className={`font-display font-bold tracking-tight ${light ? "text-white" : "text-on-background"}`} style={{ fontSize: size * 0.7 }}>
        Mbooks
      </span>
    </Link>
  );
}
