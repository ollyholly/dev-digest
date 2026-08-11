import type { CSSProperties } from "react";

export const s = {
  descriptionBox: {
    border: "1px solid var(--border)",
    borderRadius: 8,
    background: "var(--bg-elevated)",
    padding: 18,
    fontSize: 14,
    color: "var(--text-secondary)",
    whiteSpace: "pre-wrap",
    lineHeight: 1.55,
  } satisfies CSSProperties,

  intentHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 8,
  } satisfies CSSProperties,

  regenerateBtn: {
    fontSize: 12,
    padding: "4px 10px",
    borderRadius: 6,
    border: "1px solid var(--border)",
    background: "var(--bg-elevated)",
    color: "var(--text-secondary)",
    cursor: "pointer",
  } satisfies CSSProperties,

  intentBox: {
    border: "1px solid var(--border)",
    borderRadius: 8,
    background: "var(--bg-elevated)",
    padding: 18,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  } satisfies CSSProperties,

  intentMeta: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  } satisfies CSSProperties,

  intentMode: {
    fontSize: 11,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    color: "var(--text-muted)",
  } satisfies CSSProperties,

  intentSummary: {
    margin: 0,
    fontSize: 14,
    fontStyle: "italic",
    color: "var(--text-secondary)",
    lineHeight: 1.55,
  } satisfies CSSProperties,

  intentListBlock: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  } satisfies CSSProperties,

  intentListLabel: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.06em",
    textTransform: "uppercase" as const,
    color: "var(--text-muted)",
  } satisfies CSSProperties,

  intentList: {
    margin: 0,
    paddingLeft: 18,
    fontSize: 13,
    color: "var(--text-secondary)",
    lineHeight: 1.5,
  } satisfies CSSProperties,

  intentMuted: {
    fontSize: 13,
    color: "var(--text-muted)",
  } satisfies CSSProperties,

  intentError: {
    fontSize: 13,
    color: "var(--danger, #c44)",
  } satisfies CSSProperties,
} as const;
