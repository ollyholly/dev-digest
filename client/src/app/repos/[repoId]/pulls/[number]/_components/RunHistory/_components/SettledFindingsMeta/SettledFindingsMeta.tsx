"use client";

import { useTranslations } from "next-intl";
import type { FindingRecord, RunSummary } from "@devdigest/shared";
import {
  FindingsHoverCard,
  SeverityBadges,
  countFindingsBySeverity,
  hasAnyFindings,
} from "@/components/findings-hover-card";

export function SettledFindingsMeta({
  run,
  findings,
}: {
  run: RunSummary;
  /** undefined = no join available → plain-text findings_count fallback. */
  findings: FindingRecord[] | undefined;
}) {
  const t = useTranslations("prReview");
  const tf = useTranslations("prReview.findings");

  if (findings === undefined) {
    return (
      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
        {t("runStatus.findings", { count: run.findings_count ?? 0 })}
        {(run.blockers ?? 0) > 0 ? t("runStatus.blockers", { count: run.blockers ?? 0 }) : ""}
      </div>
    );
  }

  const counts = countFindingsBySeverity(findings);
  const total = counts.CRITICAL + counts.WARNING + counts.SUGGESTION;

  return (
    <div
      style={{
        fontSize: 12,
        color: "var(--text-muted)",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      {hasAnyFindings(counts) ? (
        <FindingsHoverCard findings={findings} aria-label={tf("summary", { count: total })}>
          <SeverityBadges counts={counts} />
        </FindingsHoverCard>
      ) : (
        <SeverityBadges counts={counts} />
      )}
      {(run.blockers ?? 0) > 0 ? tf("blockers", { count: run.blockers ?? 0 }) : null}
    </div>
  );
}
