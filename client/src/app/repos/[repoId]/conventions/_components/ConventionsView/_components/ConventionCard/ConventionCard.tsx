"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Badge, Button, ConfidenceNum, Icon } from "@devdigest/ui";
import type { ConventionCandidate, ConventionStatus } from "@devdigest/shared";
import { githubBlobUrl } from "@/lib/github-urls";
import { useUpdateConvention } from "@/lib/hooks/conventions";
import { s } from "./styles";

export interface ConventionCardProps {
  candidate: ConventionCandidate;
  repoId: string;
  repoName: string;
  defaultBranch: string;
  scanSha?: string | null;
}

export function ConventionCard({
  candidate,
  repoId,
  repoName,
  defaultBranch,
  scanSha,
}: ConventionCardProps) {
  const t = useTranslations("conventions");
  const update = useUpdateConvention(repoId);
  const [rule, setRule] = React.useState(candidate.rule);
  const accepted = candidate.status === "accepted";
  const rejected = candidate.status === "rejected";
  const blobRef = candidate.scanned_sha ?? scanSha ?? defaultBranch;
  const evidenceUrl = githubBlobUrl(
    repoName,
    blobRef,
    candidate.evidence_path,
    candidate.evidence_start_line,
    candidate.evidence_end_line,
  );
  const lineRange =
    candidate.evidence_start_line === candidate.evidence_end_line
      ? `${candidate.evidence_start_line}`
      : `${candidate.evidence_start_line}-${candidate.evidence_end_line}`;

  const setStatus = (status: ConventionStatus) => {
    update.mutate({ id: candidate.id, patch: { status } });
  };

  const saveRule = () => {
    const nextRule = rule.trim();
    if (!nextRule) {
      setRule(candidate.rule);
      return;
    }
    if (nextRule === candidate.rule) return;

    setRule(nextRule);
    update.mutate(
      { id: candidate.id, patch: { rule: nextRule } },
      { onError: () => setRule(candidate.rule) },
    );
  };

  return (
    <article style={s.card(rejected)}>
      <div style={s.topRow}>
        <Badge color="var(--accent)" bg="var(--accent-bg)" icon="Tag">
          {candidate.category}
        </Badge>
        <span style={s.confidence}>
          <ConfidenceNum value={candidate.confidence} />
        </span>
      </div>

      <textarea
        value={rule}
        onChange={(event) => setRule(event.target.value)}
        onBlur={saveRule}
        aria-label={t("card.editRule")}
        disabled={update.isPending}
        rows={2}
        style={s.rule}
      />

      <div style={s.evidence}>
        <div style={s.evidenceHeader}>
          <span>{t("card.evidence")}</span>
          <a
            href={evidenceUrl}
            target="_blank"
            rel="noreferrer"
            style={s.evidenceLink}
            aria-label={t("card.openEvidence", {
              path: candidate.evidence_path,
              lines: lineRange,
            })}
          >
            <span className="mono">
              {candidate.evidence_path}:{lineRange}
            </span>
            <Icon.ExternalLink size={11} />
          </a>
        </div>
        <pre style={s.snippet}>{candidate.evidence_snippet}</pre>
      </div>

      {update.isError && (
        <div role="alert" style={{ color: "var(--crit)", fontSize: 12, marginTop: 9 }}>
          {t("card.updateFailed")}
        </div>
      )}

      <div style={s.actions}>
        <Button
          size="sm"
          kind={accepted ? "primary" : "secondary"}
          icon="Check"
          aria-pressed={accepted}
          disabled={update.isPending}
          onClick={() => setStatus(accepted ? "pending" : "accepted")}
        >
          {accepted ? t("card.accepted") : t("card.accept")}
        </Button>
        <Button
          size="sm"
          kind={rejected ? "danger" : "secondary"}
          icon="X"
          aria-pressed={rejected}
          disabled={update.isPending}
          onClick={() => setStatus(rejected ? "pending" : "rejected")}
        >
          {rejected ? t("card.rejected") : t("card.reject")}
        </Button>
      </div>
    </article>
  );
}
