/* ReviewRunAccordion — one collapsible review RUN (a single agent's pass over
   the PR). Header shows agent + verdict + severity badges + blockers + score;
   the body holds that run's VerdictBanner summary and its own FindingsPanel. */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Icon, Badge } from "@devdigest/ui";
import type { ReviewRecord, Severity, Verdict } from "@devdigest/shared";
import {
  FindingsHoverCard,
  SeverityBadges,
  hasAnyFindings,
} from "@/components/findings-hover-card";
import { FindingsPanel } from "../FindingsPanel";
import { countBySeverity } from "../FindingsPanel/helpers";
import { VerdictBanner } from "../VerdictBanner";
import { useDeleteReview } from "../../../../../../../lib/hooks/reviews";

const VERDICT_COLOR: Record<string, string> = {
  request_changes: "var(--crit)",
  comment: "var(--warn)",
  approve: "var(--ok)",
};

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

export interface ScrollTarget {
  runId: string;
  nonce: number;
}

export interface SeverityFilter {
  selected: Severity[];
  onChange?: (next: Severity[]) => void;
}

export function ReviewRunAccordion({
  review,
  prId,
  defaultOpen = false,
  scrollTarget = null,
  severityFilter,
}: {
  review: ReviewRecord;
  prId: string;
  defaultOpen?: boolean;
  /** When scrollTarget.runId matches review.run_id, the accordion opens and
   *  scrolls into view (driven from the Timeline: clicking an agent name
   *  navigates here). scrollTarget.nonce re-triggers the scroll even when
   *  the same run is targeted twice in a row. */
  scrollTarget?: ScrollTarget | null;
  severityFilter?: SeverityFilter;
}) {
  const t = useTranslations("prReview.findings");
  const [open, setOpen] = React.useState(defaultOpen);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    if (review.run_id && review.run_id === scrollTarget?.runId) {
      setOpen(true);
      const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      rootRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    }
  }, [scrollTarget?.runId, scrollTarget?.nonce, review.run_id]);
  const del = useDeleteReview(prId);
  const findings = review.findings;
  const counts = React.useMemo(() => countBySeverity(findings), [findings]);
  const blockers = findings.filter((f) => f.severity === "CRITICAL" && !f.dismissed_at).length;
  const verdictColor = review.verdict ? VERDICT_COLOR[review.verdict] ?? "var(--text-muted)" : "var(--text-muted)";
  const total = counts.CRITICAL + counts.WARNING + counts.SUGGESTION;

  return (
    <div
      ref={rootRef}
      id={review.run_id ? `review-run-${review.run_id}` : undefined}
      style={{
        border: "1px solid var(--border)",
        borderRadius: 10,
        background: "var(--bg-surface)",
        marginBottom: 14,
        overflow: "hidden",
        scrollMarginTop: 16,
      }}
    >
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            // Space's default action is page scroll on non-native buttons.
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "13px 16px",
          cursor: "pointer",
          color: "var(--text-primary)",
        }}
      >
        <Icon.Cpu size={15} style={{ color: "var(--text-muted)" }} />
        <span style={{ fontWeight: 600, fontSize: 14 }}>{review.agent_name ?? "Agent"}</span>
        {review.verdict && (
          <Badge color={verdictColor} bg="transparent">
            {review.verdict.replace("_", " ")}
          </Badge>
        )}
        <span
          style={{ fontSize: 12.5, color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: 6 }}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {hasAnyFindings(counts) ? (
            <FindingsHoverCard
              findings={findings}
              aria-label={t("summary", { count: total })}
            >
              <SeverityBadges counts={counts} />
            </FindingsHoverCard>
          ) : (
            <SeverityBadges counts={counts} />
          )}
          {blockers > 0 ? t("blockers", { count: blockers }) : null}
        </span>
        <span style={{ flex: 1 }} />
        {review.score != null && (
          <Badge mono color="var(--text-secondary)">
            {review.score}
          </Badge>
        )}
        <span className="mono" style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {formatWhen(review.created_at)}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm(`Delete this "${review.agent_name ?? "agent"}" review run and its findings?`)) {
              del.mutate(review.id);
            }
          }}
          disabled={del.isPending}
          title="Delete this review run"
          aria-label="Delete this review run"
          style={{
            background: "none",
            border: "none",
            cursor: del.isPending ? "not-allowed" : "pointer",
            color: "var(--text-muted)",
            display: "inline-flex",
            padding: 4,
          }}
        >
          <Icon.Trash size={14} style={del.isPending ? { animation: "ddspin 1s linear infinite" } : undefined} />
        </button>
        <Icon.ChevronDown
          size={16}
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s", color: "var(--text-muted)" }}
        />
      </div>

      {open && (
        <div style={{ padding: "0 16px 16px" }}>
          {review.verdict && (
            <div style={{ marginBottom: 16 }}>
              <VerdictBanner
                verdict={review.verdict as Verdict}
                summary={review.summary}
                score={review.score}
                findingsCount={findings.length}
                blockers={blockers}
                agentName={review.agent_name}
              />
            </div>
          )}
          <FindingsPanel
            findings={findings}
            prId={prId}
            selectedSeverities={severityFilter?.selected ?? []}
            onSeverityChange={severityFilter?.onChange}
          />
        </div>
      )}
    </div>
  );
}

export default ReviewRunAccordion;
