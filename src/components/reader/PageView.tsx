import type { JSONContent } from "@tiptap/react";
import { Fragment, type CSSProperties, type ReactNode } from "react";
import { parseDoc } from "@/components/builder/doc";

/**
 * Renders a page's TipTap document as plain React elements: no editor instance, no innerHTML.
 * Node or mark types it doesn't know (the PDF importer may add some) fall back to their children,
 * so a page never fails to render.
 */
export function PageView({ content, fontSize }: { content: string; fontSize?: number }) {
  const doc = parseDoc(content);
  return (
    <div className="prose-book" style={fontSize ? { fontSize } : undefined}>
      {kids(doc)}
    </div>
  );
}

const ALIGN = new Set(["left", "center", "right", "justify"]);

function align(node: JSONContent): CSSProperties | undefined {
  const a = node.attrs?.textAlign;
  return typeof a === "string" && ALIGN.has(a) && a !== "left" ? { textAlign: a as CSSProperties["textAlign"] } : undefined;
}

/** Only let through addresses that can't run script. */
function safeUrl(url: unknown, allowData = false): string | null {
  if (typeof url !== "string") return null;
  const u = url.trim();
  if (/^(https?:|mailto:)/i.test(u) || u.startsWith("/") || u.startsWith("#")) return u;
  if (allowData && /^data:image\/(png|jpe?g|gif|webp|avif);base64,/i.test(u)) return u;
  return null;
}

function kids(node: JSONContent): ReactNode {
  return (node.content ?? []).map((child, i) => <Fragment key={i}>{render(child)}</Fragment>);
}

function render(node: JSONContent): ReactNode {
  switch (node.type) {
    case "text":
      return marked(node);
    case "paragraph":
      return <p style={align(node)}>{node.content?.length ? kids(node) : <br />}</p>;
    case "heading": {
      const level = Math.min(3, Math.max(1, Number(node.attrs?.level) || 1));
      const Tag = `h${level}` as "h1" | "h2" | "h3";
      return <Tag style={align(node)}>{kids(node)}</Tag>;
    }
    case "bulletList":
      return <ul>{kids(node)}</ul>;
    case "orderedList":
      return <ol start={Number(node.attrs?.start) || 1}>{kids(node)}</ol>;
    case "listItem":
      return <li>{kids(node)}</li>;
    case "blockquote":
      return <blockquote>{kids(node)}</blockquote>;
    case "codeBlock":
      return <pre><code>{kids(node)}</code></pre>;
    case "horizontalRule":
      return <hr />;
    case "hardBreak":
      return <br />;
    case "image": {
      const src = safeUrl(node.attrs?.src, true);
      if (!src) return null;
      // eslint-disable-next-line @next/next/no-img-element -- book pictures come from arbitrary hosts and sizes
      return <img src={src} alt={typeof node.attrs?.alt === "string" ? node.attrs.alt : ""} title={typeof node.attrs?.title === "string" ? node.attrs.title : undefined} loading="lazy" className="block" />;
    }
    default:
      // Unknown node: keep whatever text or children it carries.
      if (node.text) return marked(node);
      return node.content?.length ? <div>{kids(node)}</div> : null;
  }
}

function marked(node: JSONContent): ReactNode {
  let out: ReactNode = node.text ?? "";
  for (const mark of node.marks ?? []) {
    switch (mark.type) {
      case "bold": out = <strong>{out}</strong>; break;
      case "italic": out = <em>{out}</em>; break;
      case "underline": out = <u>{out}</u>; break;
      case "strike": out = <s>{out}</s>; break;
      case "code": out = <code>{out}</code>; break;
      case "link": {
        const href = safeUrl(mark.attrs?.href);
        if (href) out = <a href={href} target="_blank" rel="noopener noreferrer nofollow">{out}</a>;
        break;
      }
      default: break; // unknown mark: plain text
    }
  }
  return out;
}
