import type { CSSProperties } from "react";

export const s = {
  root: { display: "flex", flexDirection: "column", gap: 18 } satisfies CSSProperties,
  empty: { padding: "24px", fontSize: 14, color: "var(--text-muted)", textAlign: "center" } satisfies CSSProperties,
  banner: {
    padding: "12px 16px",
    borderRadius: 8,
    border: "1px solid var(--border-strong)",
    background: "var(--bg-elevated)",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  } satisfies CSSProperties,
  bannerTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: "var(--text-primary)",
  } satisfies CSSProperties,
  bannerBody: {
    fontSize: 13,
    color: "var(--text-secondary)",
  } satisfies CSSProperties,
  splitList: {
    margin: "6px 0 0",
    paddingLeft: 18,
    fontSize: 13,
    color: "var(--text-secondary)",
  } satisfies CSSProperties,
  group: { display: "flex", flexDirection: "column", gap: 10 } satisfies CSSProperties,
  groupHeader: {
    display: "flex",
    alignItems: "baseline",
    gap: 10,
    padding: "0 2px",
  } satisfies CSSProperties,
  groupLabel: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.04em",
  } satisfies CSSProperties,
  groupSubtitle: {
    fontSize: 12,
    color: "var(--text-muted)",
    flex: 1,
    minWidth: 0,
  } satisfies CSSProperties,
  groupCount: {
    fontSize: 12,
    color: "var(--text-muted)",
    fontVariantNumeric: "tabular-nums",
  } satisfies CSSProperties,
} as const;
