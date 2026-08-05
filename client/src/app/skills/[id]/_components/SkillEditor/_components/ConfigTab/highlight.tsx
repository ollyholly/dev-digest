import React from "react";

/**
 * Minimal regex-based markdown tokenizer for the skill body editor's
 * highlight overlay. Not a real markdown parser — just enough to color the
 * constructs skill bodies actually use (headings, list markers, inline
 * code, bold) so the editor doesn't read as a flat, undifferentiated wall
 * of text. No new dependency (no CodeMirror/Monaco) per this repo's
 * "no third-party component library without asking" convention.
 */
export function highlightMarkdownLine(line: string, key: number): React.ReactNode {
  const headingMatch = /^(#{1,6})(\s+.*)$/.exec(line);
  if (headingMatch) {
    return (
      <div key={key}>
        <span style={{ color: "var(--accent-text)" }}>{headingMatch[1]}</span>
        <span style={{ color: "var(--text-primary)", fontWeight: 650 }}>{headingMatch[2]}</span>
      </div>
    );
  }

  const listMatch = /^(\s*[-*]\s+)(.*)$/.exec(line);
  if (listMatch) {
    return (
      <div key={key}>
        <span style={{ color: "var(--accent-text)" }}>{listMatch[1]}</span>
        {highlightInline(listMatch[2]!, `${key}-li`)}
      </div>
    );
  }

  return <div key={key}>{highlightInline(line, `${key}-p`) || " "}</div>;
}

/** Inline `code` spans and **bold** within a single line. */
function highlightInline(text: string, keyPrefix: string): React.ReactNode {
  if (!text) return null;
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <span key={`${keyPrefix}-${i}`} style={{ color: "var(--accent-text)" }}>
          {part}
        </span>
      );
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <span key={`${keyPrefix}-${i}`} style={{ color: "var(--text-primary)", fontWeight: 650 }}>
          {part}
        </span>
      );
    }
    return <React.Fragment key={`${keyPrefix}-${i}`}>{part}</React.Fragment>;
  });
}
