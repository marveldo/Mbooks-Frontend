"use client";

import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, PAGE_IMAGE_TYPES, uploadPageImage } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { parseDoc } from "./doc";

interface Props {
  bookId: string;
  content: string;
  onChange: (json: string) => void;
}

const isImage = (f: File) => f.type.startsWith("image/");

export function PageEditor({ bookId, content, onChange }: Props) {
  const toast = useToast();
  const [uploading, setUploading] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const editorRef = useRef<Editor | null>(null);

  /** Upload pictures and put them where the cursor is. A selected picture is replaced. */
  const addImages = useCallback(async (files: File[]) => {
    const ok = files.filter((f) => PAGE_IMAGE_TYPES.includes(f.type));
    if (ok.length < files.length) toast.error("That picture can't be used", "Pictures need to be JPG, PNG or WebP.");
    if (!ok.length) return;
    setUploading(true);
    try {
      for (const file of ok) {
        const src = await uploadPageImage(bookId, file);
        const ed = editorRef.current;
        if (!ed || ed.isDestroyed) return; // moved to another page while it uploaded
        ed.chain().focus().insertContent({ type: "image", attrs: { src, alt: "" } }).run();
      }
    } catch (e) {
      toast.error("Couldn't add the picture", e instanceof ApiError ? e.message : undefined);
    } finally {
      setUploading(false);
    }
  }, [bookId, toast]);

  // The editor keeps the handlers it was created with, so they reach the latest addImages through a ref.
  const addImagesRef = useRef(addImages);
  useEffect(() => { addImagesRef.current = addImages; }, [addImages]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Image,
      Placeholder.configure({ placeholder: "Start writing this page…" }),
    ],
    content: parseDoc(content),
    editorProps: {
      attributes: { class: "prose-book min-h-[60vh]", spellcheck: "true" },
      // Pictures dropped or pasted in are uploaded, then inserted.
      handleDrop: (view, event, _slice, moved) => {
        const files = [...(event.dataTransfer?.files ?? [])].filter(isImage);
        if (moved || !files.length) return false;
        event.preventDefault();
        const at = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
        if (at !== undefined) editorRef.current?.commands.setTextSelection(at);
        addImagesRef.current(files);
        return true;
      },
      handlePaste: (_view, event) => {
        const files = [...(event.clipboardData?.files ?? [])].filter(isImage);
        // Text copied from a word processor often carries a picture of itself; keep the text.
        if (!files.length || event.clipboardData?.getData("text/html")) return false;
        event.preventDefault();
        addImagesRef.current(files);
        return true;
      },
    },
    onUpdate: ({ editor }) => onChange(JSON.stringify(editor.getJSON())),
  });
  useEffect(() => { editorRef.current = editor; }, [editor]);

  return (
    <div>
      <input
        ref={picker}
        type="file"
        accept={PAGE_IMAGE_TYPES.join(",")}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) addImages([f]); }}
      />
      <Toolbar editor={editor} uploading={uploading} onImage={() => picker.current?.click()} />
      <EditorContent editor={editor} />
    </div>
  );
}

function Btn({ on, active, label, children, disabled }: { on: () => void; active?: boolean; label: string; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={on}
      className={`grid h-9 min-w-9 place-items-center rounded-md px-2 text-sm font-semibold transition-colors disabled:opacity-35 ${
        active ? "bg-soft text-primary" : "text-on-surface hover:bg-surface-alt"
      }`}
    >
      {children}
    </button>
  );
}

const Sep = () => <span className="mx-1 h-6 w-px bg-outline" aria-hidden />;

function Toolbar({ editor, uploading, onImage }: { editor: Editor | null; uploading: boolean; onImage: () => void }) {
  if (!editor) return <div className="h-[53px]" />;
  const c = () => editor.chain().focus();

  const blockValue = editor.isActive("heading", { level: 1 }) ? "h1"
    : editor.isActive("heading", { level: 2 }) ? "h2"
    : editor.isActive("heading", { level: 3 }) ? "h3" : "p";

  function setLink() {
    const prev = editor!.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link address", prev ?? "https://");
    if (url === null) return;
    if (url === "" ) c().extendMarkRange("link").unsetLink().run();
    else c().extendMarkRange("link").setLink({ href: url }).run();
  }

  return (
    <div className="sticky top-0 z-10 -mx-2 mb-8 flex flex-wrap items-center gap-0.5 border-b border-outline bg-surface/95 px-2 py-2 backdrop-blur">
      <select
        aria-label="Text style"
        value={blockValue}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "p") c().setParagraph().run();
          else c().toggleHeading({ level: Number(v[1]) as 1 | 2 | 3 }).run();
        }}
        className="h-9 rounded-md border border-outline bg-surface px-2 text-sm font-semibold"
      >
        <option value="p">Paragraph</option>
        <option value="h1">Chapter title</option>
        <option value="h2">Section</option>
        <option value="h3">Subsection</option>
      </select>
      <Sep />
      <Btn label="Bold" on={() => c().toggleBold().run()} active={editor.isActive("bold")}><b>B</b></Btn>
      <Btn label="Italic" on={() => c().toggleItalic().run()} active={editor.isActive("italic")}><i className="font-display">I</i></Btn>
      <Btn label="Underline" on={() => c().toggleUnderline().run()} active={editor.isActive("underline")}><u>U</u></Btn>
      <Btn label="Strikethrough" on={() => c().toggleStrike().run()} active={editor.isActive("strike")}><s>S</s></Btn>
      <Btn label="Link" on={setLink} active={editor.isActive("link")}>Link</Btn>
      <Sep />
      <Btn label="Bulleted list" on={() => c().toggleBulletList().run()} active={editor.isActive("bulletList")}>• List</Btn>
      <Btn label="Numbered list" on={() => c().toggleOrderedList().run()} active={editor.isActive("orderedList")}>1. List</Btn>
      <Btn label="Quote" on={() => c().toggleBlockquote().run()} active={editor.isActive("blockquote")}>“ ”</Btn>
      <Btn label="Scene break" on={() => c().setHorizontalRule().run()}>⁂</Btn>
      <Btn
        label={editor.isActive("image") ? "Replace this picture (JPG, PNG or WebP)" : "Add a picture (JPG, PNG or WebP). You can also drop or paste one onto the page."}
        on={onImage}
        disabled={uploading}
        active={editor.isActive("image")}
      >
        {uploading ? "Uploading…" : editor.isActive("image") ? "Replace" : "Picture"}
      </Btn>
      <Sep />
      <Btn label="Align left" on={() => c().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })}>
        <AlignIcon rows={[14, 10, 14, 8]} />
      </Btn>
      <Btn label="Align center" on={() => c().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })}>
        <AlignIcon rows={[14, 10, 14, 8]} center />
      </Btn>
      <Btn label="Justify" on={() => c().setTextAlign("justify").run()} active={editor.isActive({ textAlign: "justify" })}>
        <AlignIcon rows={[14, 14, 14, 14]} />
      </Btn>
      <Sep />
      <Btn label="Undo" on={() => c().undo().run()} disabled={!editor.can().undo()}>↶</Btn>
      <Btn label="Redo" on={() => c().redo().run()} disabled={!editor.can().redo()}>↷</Btn>
    </div>
  );
}

function AlignIcon({ rows, center }: { rows: number[]; center?: boolean }) {
  return (
    <svg width="16" height="14" viewBox="0 0 16 14" aria-hidden>
      {rows.map((w, i) => (
        <rect key={i} x={center ? (16 - w) / 2 : 1} y={1 + i * 3.4} width={w} height="1.8" rx="0.9" fill="currentColor" />
      ))}
    </svg>
  );
}
