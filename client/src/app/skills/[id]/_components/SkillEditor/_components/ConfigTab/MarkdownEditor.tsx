import React from "react";
import { highlightMarkdownLine } from "./highlight";
import { s } from "./styles";

/**
 * Textarea with a basic markdown syntax-highlight overlay — a transparent
 * textarea sits on top of a <pre> rendering the same text tokenized by
 * `highlightMarkdownLine`. The two scroll in lockstep so the highlight never
 * drifts from the caret. This is a lightweight approximation (headings,
 * list markers, inline code/bold), not a full editor — see highlight.tsx.
 */
export function MarkdownEditor({
  value,
  onChange,
  rows,
}: {
  value: string;
  onChange: (next: string) => void;
  rows: number;
}) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const overlayRef = React.useRef<HTMLDivElement>(null);

  const syncScroll = () => {
    if (!textareaRef.current || !overlayRef.current) return;
    overlayRef.current.scrollTop = textareaRef.current.scrollTop;
    overlayRef.current.scrollLeft = textareaRef.current.scrollLeft;
  };

  return (
    <div style={s.editorLayer}>
      <div ref={overlayRef} aria-hidden style={s.highlightOverlay}>
        {value.split("\n").map((line, i) => highlightMarkdownLine(line, i))}
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={syncScroll}
        rows={rows}
        spellCheck={false}
        style={s.bodyTextarea}
      />
    </div>
  );
}
