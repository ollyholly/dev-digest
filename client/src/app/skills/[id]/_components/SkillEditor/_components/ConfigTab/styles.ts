import type { CSSProperties } from "react";

/** Co-located styles for ConfigTab (mirrors AgentEditor's ConfigTab, plus a
 *  mini code-editor look for the skill body field). */
export const s = {
  wrap: { maxWidth: 760 } satisfies CSSProperties,
  header: { display: "flex", alignItems: "center", marginBottom: 20 } satisfies CSSProperties,
  h2: { fontSize: 18, fontWeight: 700 } satisfies CSSProperties,
  enabledLabel: {
    marginLeft: "auto",
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 13,
    color: "var(--text-secondary)",
  } satisfies CSSProperties,
  actions: { display: "flex", gap: 10, marginTop: 10 } satisfies CSSProperties,
  savedNote: { alignSelf: "center", fontSize: 13, color: "var(--ok)" } satisfies CSSProperties,
  bodyEditor: {
    border: "1px solid var(--border-strong)",
    borderRadius: 7,
    overflow: "hidden",
    background: "var(--bg-elevated)",
  } satisfies CSSProperties,
  bodyEditorHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 12px",
    borderBottom: "1px solid var(--border)",
    background: "var(--bg-surface)",
    fontSize: 12.5,
  } satisfies CSSProperties,
  bodyEditorFilename: { fontFamily: "var(--mono, monospace)", color: "var(--text-secondary)" } satisfies CSSProperties,
  bodyEditorTokens: { marginLeft: "auto", color: "var(--text-muted)" } satisfies CSSProperties,
  bodyTextarea: {
    width: "100%",
    resize: "vertical",
    padding: "12px 14px",
    border: "none",
    outline: "none",
    background: "transparent",
    color: "var(--text-primary)",
    fontSize: 13.5,
    lineHeight: 1.6,
    fontFamily: "var(--mono, monospace)",
  } satisfies CSSProperties,
} as const;
