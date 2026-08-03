"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { SeverityBadge } from "@devdigest/ui";
import type { Severity, SeverityCounts } from "@devdigest/shared";
import { SEVERITY_LEVELS } from "./constants";
import { hasAnyFindings } from "./helpers";

export function SeverityBadges({
  counts,
  noneLabel,
}: {
  counts: SeverityCounts;
  /** Pre-translated "None" — optional so callers outside next-intl can pass it. */
  noneLabel?: string;
}) {
  const t = useTranslations("prReview.findings");
  if (!hasAnyFindings(counts)) {
    return (
      <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
        {noneLabel ?? t("none")}
      </span>
    );
  }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      {SEVERITY_LEVELS.filter((sev) => counts[sev] > 0).map((sev: Severity) => (
        <SeverityBadge key={sev} severity={sev} compact count={counts[sev]} />
      ))}
    </span>
  );
}
