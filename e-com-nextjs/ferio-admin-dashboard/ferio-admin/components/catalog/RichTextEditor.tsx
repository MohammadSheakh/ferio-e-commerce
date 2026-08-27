"use client";

import { useRef } from "react";

interface RichTextEditorProps {
  value?: string;
  onChange?: (val: string) => void;
  name?: string;
  placeholder?: string;
  rows?: number;
  className?: string;
}

export default function RichTextEditor({
  value = "",
  onChange,
  name,
  placeholder = "Write detailed product description...",
  rows = 6,
  className = "",
}: RichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertTag = (
    before: string,
    after: string = "",
    defaultText: string = "",
  ) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const textToWrap = selectedText || defaultText;

    const newValue =
      textarea.value.substring(0, start) +
      before +
      textToWrap +
      after +
      textarea.value.substring(end);

    onChange?.(newValue);

    // Reposition cursor after state update
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + textToWrap.length;
      textarea.setSelectionRange(start + before.length, newCursorPos);
    }, 0);
  };

  const insertBlock = (tag: string, defaultText: string = "Text") => {
    insertTag(`<${tag}>`, `</${tag}>`, defaultText);
  };

  const insertList = (type: "ul" | "ol") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);

    let listItems = "";
    if (selectedText.trim()) {
      const lines = selectedText.split("\n").filter((l) => l.trim());
      listItems = lines.map((l) => `  <li>${l.trim()}</li>`).join("\n");
    } else {
      listItems = "  <li>Item 1</li>\n  <li>Item 2</li>";
    }

    const listHtml = `<${type}>\n${listItems}\n</${type}>`;
    const newValue =
      textarea.value.substring(0, start) +
      listHtml +
      textarea.value.substring(end);

    onChange?.(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start, start + listHtml.length);
    }, 0);
  };

  const insertLink = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end) || "Link text";

    const url = prompt("Enter destination URL:", "https://");
    if (!url) return;

    const linkHtml = `<a href="${url}" target="_blank" rel="noopener noreferrer">${selectedText}</a>`;
    const newValue =
      textarea.value.substring(0, start) +
      linkHtml +
      textarea.value.substring(end);

    onChange?.(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start, start + linkHtml.length);
    }, 0);
  };

  const insertImage = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const url = prompt("Enter Image URL (e.g. https://...):", "https://");
    if (!url) return;

    const alt =
      prompt("Enter optional image description / alt text:", "") ||
      "Product detail image";

    const imgHtml = `\n<img src="${url}" alt="${alt}" class="my-4 max-w-full rounded-card h-auto border border-line" />\n`;
    const newValue =
      textarea.value.substring(0, start) +
      imgHtml +
      textarea.value.substring(end);

    onChange?.(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start, start + imgHtml.length);
    }, 0);
  };

  return (
    <div
      className={`overflow-hidden rounded-card border border-line bg-white ${className}`}
    >
      {/* Rich Text Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-line bg-neutral-50/80 p-2 text-ink">
        {/* Basic formatting */}
        <button
          type="button"
          onClick={() => insertTag("<b>", "</b>", "bold text")}
          title="Bold"
          className="rounded p-1.5 hover:bg-neutral-200 text-xs font-bold w-8 h-8 flex items-center justify-center border border-line/40 bg-white"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => insertTag("<i>", "</i>", "italic text")}
          title="Italic"
          className="rounded p-1.5 hover:bg-neutral-200 text-xs italic w-8 h-8 flex items-center justify-center border border-line/40 bg-white"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => insertTag("<u>", "</u>", "underlined text")}
          title="Underline"
          className="rounded p-1.5 hover:bg-neutral-200 text-xs underline w-8 h-8 flex items-center justify-center border border-line/40 bg-white"
        >
          U
        </button>

        <div className="h-5 w-[1px] bg-line mx-1" />

        {/* Headings */}
        <button
          type="button"
          onClick={() => insertBlock("p", "Paragraph text")}
          title="Paragraph <p>"
          className="rounded px-2 py-1 hover:bg-neutral-200 text-xs font-medium border border-line/40 bg-white"
        >
          Paragraph
        </button>
        <button
          type="button"
          onClick={() => insertBlock("h2", "Heading 2")}
          title="Heading 2 <h2>"
          className="rounded px-2 py-1 hover:bg-neutral-200 text-xs font-bold border border-line/40 bg-white"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => insertBlock("h3", "Heading 3")}
          title="Heading 3 <h3>"
          className="rounded px-2 py-1 hover:bg-neutral-200 text-xs font-semibold border border-line/40 bg-white"
        >
          H3
        </button>

        <div className="h-5 w-[1px] bg-line mx-1" />

        {/* Lists */}
        <button
          type="button"
          onClick={() => insertList("ul")}
          title="Bullet List <ul>"
          className="rounded px-2 py-1 hover:bg-neutral-200 text-xs font-medium border border-line/40 bg-white"
        >
          • Bullet List
        </button>
        <button
          type="button"
          onClick={() => insertList("ol")}
          title="Numbered List <ol>"
          className="rounded px-2 py-1 hover:bg-neutral-200 text-xs font-medium border border-line/40 bg-white"
        >
          1. Numbered List
        </button>

        <div className="h-5 w-[1px] bg-line mx-1" />

        {/* Quote, Link & Image */}
        <button
          type="button"
          onClick={() => insertBlock("blockquote", "Quote text")}
          title="Blockquote <blockquote>"
          className="rounded px-2 py-1 hover:bg-neutral-200 text-xs font-medium border border-line/40 bg-white"
        >
          &ldquo; Quote
        </button>
        <button
          type="button"
          onClick={insertLink}
          title="Insert Link <a>"
          className="rounded px-2 py-1 hover:bg-neutral-200 text-xs font-medium border border-line/40 bg-white"
        >
          🔗 Link
        </button>
        <button
          type="button"
          onClick={insertImage}
          title="Insert Inline Image <img>"
          className="rounded px-2 py-1 hover:bg-neutral-200 text-xs font-medium border border-line/40 bg-white"
        >
          🖼️ Image
        </button>
      </div>

      {/* Main Textarea Field */}
      <textarea
        ref={textareaRef}
        name={name}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        required
        className="w-full resize-y border-none bg-white p-3 text-[14px] leading-relaxed text-ink"
      />
    </div>
  );
}
