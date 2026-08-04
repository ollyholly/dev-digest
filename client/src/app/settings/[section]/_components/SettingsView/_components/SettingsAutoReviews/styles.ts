import type { CSSProperties } from "react";

export const s = {
  wrap: { display: "flex", flexDirection: "column", gap: 22, maxWidth: 560 } satisfies CSSProperties,
  row: { display: "flex", alignItems: "center", gap: 12 } satisfies CSSProperties,
  hint: { fontSize: 13, color: "var(--text-muted)" } satisfies CSSProperties,
  agentList: { display: "flex", flexDirection: "column", gap: 8 } satisfies CSSProperties,
  agentRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    color: "var(--text-secondary)",
  } satisfies CSSProperties,
  actions: { display: "flex", alignItems: "center", gap: 12, marginTop: 8 } satisfies CSSProperties,
} as const;
