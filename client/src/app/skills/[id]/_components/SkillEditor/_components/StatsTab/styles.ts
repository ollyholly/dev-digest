import type { CSSProperties } from "react";

/** Co-located styles for StatsTab. */
export const s = {
  wrap: { maxWidth: 900, display: "flex", flexDirection: "column", gap: 28 } satisfies CSSProperties,
  section: { display: "flex", flexDirection: "column", gap: 12 } satisfies CSSProperties,
  sectionTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: "var(--text-secondary)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  } satisfies CSSProperties,
  tileGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 12,
  } satisfies CSSProperties,
  tile: {
    border: "1px solid var(--border-strong)",
    borderRadius: 8,
    padding: "14px 16px",
    background: "var(--bg-elevated)",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  } satisfies CSSProperties,
  tileLabel: {
    fontSize: 11,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    fontWeight: 600,
  } satisfies CSSProperties,
  tileValue: { fontSize: 20, fontWeight: 700, color: "var(--text-primary)" } satisfies CSSProperties,
  tileNoData: { fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.4 } satisfies CSSProperties,
  agentRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 14px",
    border: "1px solid var(--border)",
    borderRadius: 7,
    background: "var(--bg-elevated)",
  } satisfies CSSProperties,
  agentIcon: {
    width: 26,
    height: 26,
    borderRadius: "50%",
    background: "var(--accent-bg, var(--bg-hover))",
    color: "var(--accent)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  } satisfies CSSProperties,
  agentName: { flex: 1, fontSize: 13.5, fontWeight: 500 } satisfies CSSProperties,
} as const;
