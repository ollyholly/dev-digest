import type { CSSProperties } from "react";

export const s = {
  tabsBar: { display: "flex", gap: 4, marginBottom: 20 } satisfies CSSProperties,
  tabBtn: (active: boolean): CSSProperties => ({
    padding: "6px 14px",
    borderRadius: 6,
    border: "1px solid " + (active ? "var(--accent)" : "var(--border)"),
    background: active ? "var(--accent-bg)" : "transparent",
    color: active ? "var(--accent-text)" : "var(--text-secondary)",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  }),
  errorNote: {
    fontSize: 13,
    color: "var(--crit)",
    background: "var(--crit-bg)",
    borderRadius: 6,
    padding: "8px 12px",
    marginBottom: 14,
  } satisfies CSSProperties,
  successNote: {
    fontSize: 13,
    color: "var(--ok)",
    background: "var(--ok-bg)",
    borderRadius: 6,
    padding: "8px 12px",
    marginBottom: 14,
  } satisfies CSSProperties,
  footer: { display: "flex", justifyContent: "flex-end", gap: 10 } satisfies CSSProperties,
  communityList: { display: "flex", flexDirection: "column", gap: 8, marginTop: 14 } satisfies CSSProperties,
  communityRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 7,
    border: "1px solid var(--border)",
  } satisfies CSSProperties,
  communityMeta: { flex: 1, minWidth: 0 } satisfies CSSProperties,
  communityName: { fontSize: 13, fontWeight: 600 } satisfies CSSProperties,
  communityDesc: { fontSize: 12, color: "var(--text-muted)", marginTop: 2 } satisfies CSSProperties,
} as const;
