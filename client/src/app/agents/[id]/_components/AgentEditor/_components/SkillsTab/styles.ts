import type { CSSProperties } from "react";

/** Co-located styles for SkillsTab. Row visuals mirror SkillCard/AgentCard's
 *  enabled/disabled opacity treatment. */
export const s = {
  wrap: { maxWidth: 760 } satisfies CSSProperties,
  header: { display: "flex", alignItems: "center", gap: 10, marginBottom: 16 } satisfies CSSProperties,
  h2: { fontSize: 18, fontWeight: 700 } satisfies CSSProperties,
  filterRow: { marginBottom: 8 } satisfies CSSProperties,
  hint: {
    fontSize: 12.5,
    color: "var(--text-muted)",
    marginBottom: 16,
    lineHeight: 1.4,
  } satisfies CSSProperties,
  list: { display: "flex", flexDirection: "column", gap: 8 } satisfies CSSProperties,
  row: (linked: boolean): CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid var(--border)",
    background: "var(--bg-elevated)",
    opacity: linked ? 1 : 0.6,
  }),
  iconBox: (color: string): CSSProperties => ({
    width: 26,
    height: 26,
    borderRadius: 7,
    background: color + "1a",
    color,
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
  }),
  name: {
    fontSize: 14,
    fontWeight: 600,
    fontFamily: "var(--font-mono, monospace)",
    flex: 1,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  } satisfies CSSProperties,
  reorderGroup: { display: "flex", alignItems: "center", gap: 2 } satisfies CSSProperties,
  reorderBtn: (disabled: boolean): CSSProperties => ({
    display: "inline-flex",
    padding: 4,
    borderRadius: 5,
    border: "none",
    background: "none",
    color: disabled ? "var(--text-muted)" : "var(--text-secondary)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.4 : 1,
  }),
  skeletonRow: { display: "flex", flexDirection: "column", gap: 8 } satisfies CSSProperties,
} as const;
