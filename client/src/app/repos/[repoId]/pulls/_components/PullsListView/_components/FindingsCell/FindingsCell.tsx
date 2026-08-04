"use client";

import React from "react";
import { useTranslations } from "next-intl";
import type { FindingRecord, SeverityCounts } from "@devdigest/shared";
import {
  FindingsHoverCard,
  SeverityBadges,
  hasAnyFindings,
} from "@/components/findings-hover-card";
import { usePrReviews } from "@/lib/hooks/reviews";

export function FindingsCell({
  prId,
  counts,
}: {
  prId: string | null | undefined;
  counts: SeverityCounts | null | undefined;
}) {
  const t = useTranslations("prReview.findings");

  // null / absent → never reviewed
  if (counts == null) {
    return <span style={{ color: "var(--text-muted)" }}>—</span>;
  }

  // Reviewed but clean
  if (!hasAnyFindings(counts)) {
    return <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{t("none")}</span>;
  }

  return <FindingsCellInteractive prId={prId!} counts={counts} />;
}

function FindingsCellInteractive({
  prId,
  counts,
}: {
  prId: string;
  counts: SeverityCounts;
}) {
  const t = useTranslations("prReview.findings");
  const [wantFetch, setWantFetch] = React.useState(false);
  const { data, isFetching, isLoading } = usePrReviews(wantFetch ? prId : null);

  const findings: FindingRecord[] | undefined = React.useMemo(
    () => (data ? data.flatMap((r) => r.findings) : undefined),
    [data],
  );

  const total = counts.CRITICAL + counts.WARNING + counts.SUGGESTION;

  return (
    <FindingsHoverCard
      findings={findings}
      loading={wantFetch && (isLoading || isFetching) && !findings}
      onOpenChange={(open) => {
        if (open) setWantFetch(true);
      }}
      aria-label={t("summary", { count: total })}
    >
      <SeverityBadges counts={counts} />
    </FindingsHoverCard>
  );
}
