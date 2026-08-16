import type { CSSProperties } from "react";

export const s = {
  root: { display: "flex", flexDirection: "column", gap: 12 } satisfies CSSProperties,
  input: {
    padding: "8px 10px",
    borderRadius: 6,
    border: "1px solid var(--border)",
    background: "var(--bg-elevated)",
    color: "var(--text-primary)",
    fontSize: 14,
  } satisfies CSSProperties,
  row: { fontSize: 13, color: "var(--text-secondary)" } satisfies CSSProperties,
};
