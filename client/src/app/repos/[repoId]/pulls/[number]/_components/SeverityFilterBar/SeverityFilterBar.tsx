"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Icon, SEV, type IconName } from "@devdigest/ui";
import type { Severity, SeverityCounts } from "@devdigest/shared";

const LEVELS: Severity[] = ["CRITICAL", "WARNING", "SUGGESTION"];

/**
 * Local chip (mirrors vendored Chip visuals) with `aria-pressed` — Chip itself
 * does not forward ARIA props and is off-limits for drive-by vendor edits.
 */
function SeverityChip({
  severity,
  count,
  active,
  onToggle,
  label,
}: {
  severity: Severity;
  count: number;
  active: boolean;
  onToggle: () => void;
  label: string;
}) {
  const [h, setH] = React.useState(false);
  const meta = SEV[severity];
  const I = Icon[meta.icon as IconName];
  const dimmed = count === 0;
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onToggle}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "5px 12px",
        borderRadius: 6,
        fontSize: 13,
        fontWeight: 500,
        transition: "all .12s",
        opacity: dimmed ? 0.45 : 1,
        border: "1px solid " + (active ? "var(--accent)" : "var(--border)"),
        background: active ? "var(--accent-bg)" : h ? "var(--bg-hover)" : "transparent",
        color: active ? "var(--accent-text)" : h ? "var(--text-primary)" : "var(--text-secondary)",
        cursor: "pointer",
      }}
    >
      <I size={13} style={{ color: meta.c }} />
      {label}
      <span className="tnum" style={{ opacity: 0.7, fontSize: 12 }}>
        {count}
      </span>
    </button>
  );
}

export function SeverityFilterBar({
  counts,
  selected,
  onChange,
}: {
  counts: SeverityCounts;
  selected: Severity[];
  onChange: (next: Severity[]) => void;
}) {
  const t = useTranslations("prReview");

  const toggle = (sev: Severity) => {
    if (selected.includes(sev)) onChange(selected.filter((s) => s !== sev));
    else onChange([...selected, sev]);
  };

  return (
    <div
      role="group"
      aria-label={t("panel.severityFilter")}
      style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}
    >
      {LEVELS.map((sev) => (
        <SeverityChip
          key={sev}
          severity={sev}
          count={counts[sev]}
          active={selected.includes(sev)}
          onToggle={() => toggle(sev)}
          label={t(`panel.severity.${sev}`)}
        />
      ))}
    </div>
  );
}
