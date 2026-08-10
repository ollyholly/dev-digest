import type { CSSProperties } from "react";

export const s = {
  page: {
    padding: "24px 32px 44px",
    maxWidth: 1040,
    margin: "0 auto",
  } satisfies CSSProperties,
  header: {
    display: "flex",
    alignItems: "flex-start",
    gap: 20,
    marginBottom: 20,
  } satisfies CSSProperties,
  headerText: { flex: 1, minWidth: 0 } satisfies CSSProperties,
  h1: {
    fontSize: 24,
    fontWeight: 700,
    letterSpacing: "-0.02em",
  } satisfies CSSProperties,
  subtitle: {
    fontSize: 14,
    color: "var(--text-secondary)",
    lineHeight: 1.5,
    marginTop: 5,
    maxWidth: 680,
  } satisfies CSSProperties,
  actions: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  } satisfies CSSProperties,
  summary: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    border: "1px solid var(--border)",
    borderRadius: 8,
    background: "var(--bg-surface)",
    marginBottom: 18,
    overflow: "hidden",
  } satisfies CSSProperties,
  summaryItem: {
    padding: "12px 16px",
    borderRight: "1px solid var(--border)",
    minWidth: 0,
  } satisfies CSSProperties,
  summaryItemLast: {
    padding: "12px 16px",
    minWidth: 0,
  } satisfies CSSProperties,
  summaryValue: {
    display: "block",
    fontFamily: "var(--font-mono, monospace)",
    fontVariantNumeric: "tabular-nums",
    fontSize: 15,
    fontWeight: 650,
    color: "var(--text-primary)",
  } satisfies CSSProperties,
  summaryLabel: {
    display: "block",
    marginTop: 2,
    color: "var(--text-muted)",
    fontSize: 12,
  } satisfies CSSProperties,
  candidateMeta: {
    color: "var(--text-muted)",
    fontSize: 12.5,
    margin: "0 0 10px 2px",
  } satisfies CSSProperties,
  list: { display: "grid", gap: 12 } satisfies CSSProperties,
  extractionError: {
    color: "var(--crit)",
    background: "var(--crit-bg)",
    border: "1px solid color-mix(in srgb, var(--crit) 30%, transparent)",
    borderRadius: 7,
    fontSize: 13,
    padding: "9px 12px",
    marginBottom: 16,
  } satisfies CSSProperties,
  loading: { display: "grid", gap: 12 } satisfies CSSProperties,
} as const;
