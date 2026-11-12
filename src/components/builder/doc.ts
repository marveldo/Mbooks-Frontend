import type { JSONContent } from "@tiptap/react";

/** Parse a page's stored content. Falls back to plain-text paragraphs if it isn't TipTap JSON. */
export function parseDoc(content: string): JSONContent {
  try {
    const doc = JSON.parse(content);
    if (doc && doc.type === "doc") return doc;
  } catch { /* not JSON */ }
  return {
    type: "doc",
    content: (content || "").split(/\n{2,}/).map((p) => ({
      type: "paragraph",
      content: p.trim() ? [{ type: "text", text: p.trim() }] : undefined,
    })),
  };
}

export function docText(node: JSONContent | undefined): string {
  if (!node) return "";
  if (node.text) return node.text;
  return (node.content ?? []).map(docText).join(node.type === "doc" ? " " : "");
}

export function snippet(content: string, max = 70): string {
  const t = docText(parseDoc(content)).replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max) + "…" : t;
}

export function wordCount(content: string): number {
  const t = docText(parseDoc(content)).trim();
  return t ? t.split(/\s+/).length : 0;
}

/** Headings in a page, for building a table of contents automatically. */
export function headings(content: string): { title: string; level: number }[] {
  const out: { title: string; level: number }[] = [];
  for (const n of parseDoc(content).content ?? []) {
    if (n.type === "heading") {
      const title = docText(n).trim();
      if (title) out.push({ title, level: Math.max(0, ((n.attrs?.level as number) ?? 1) - 1) });
    }
  }
  return out;
}
