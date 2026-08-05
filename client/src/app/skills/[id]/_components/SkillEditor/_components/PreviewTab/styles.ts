import type { CSSProperties } from "react";

/** Co-located styles for PreviewTab. */
export const s = {
  wrap: { maxWidth: 760 } satisfies CSSProperties,
  h2: { fontSize: 18, fontWeight: 700, marginBottom: 4 } satisfies CSSProperties,
  subtitle: { fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 } satisfies CSSProperties,
  card: {
    border: "1px solid var(--border-strong)",
    borderRadius: 8,
    padding: "18px 20px",
    background: "var(--bg-elevated)",
  } satisfies CSSProperties,
} as const;
