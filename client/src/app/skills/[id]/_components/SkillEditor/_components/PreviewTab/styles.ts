import type { CSSProperties } from "react";

/** Co-located styles for PreviewTab. */
export const s = {
  wrap: { maxWidth: 760 } satisfies CSSProperties,
  card: {
    border: "1px solid var(--border-strong)",
    borderRadius: 8,
    padding: "18px 20px",
    background: "var(--bg-elevated)",
  } satisfies CSSProperties,
} as const;
