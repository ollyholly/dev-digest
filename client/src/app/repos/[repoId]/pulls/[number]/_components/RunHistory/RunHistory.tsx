"use client";

import type { FindingRecord, PrCommit, RunSummary } from "@devdigest/shared";
import { tsOf, type TimelineItem } from "./helpers";
import { CommitRow } from "./_components/CommitRow";
import { RunRow } from "./_components/RunRow";

/**
 * PR timeline — every agent run interleaved with the PR's commits, newest-first
 * and DB-backed so it survives reload. Showing commits between runs makes it
 * clear which commit each review ran against. Failed runs show their error
 * inline; clicking a run row opens its trace.
 */
export function RunHistory({
  runs,
  commits = [],
  findingsByRun,
  onOpenTrace,
  onGoToReview,
  onDelete,
}: {
  runs: RunSummary[];
  commits?: PrCommit[];
  /** Optional client join of review findings by run_id. Absence → plain-text fallback. */
  findingsByRun?: Map<string, FindingRecord[]>;
  onOpenTrace: (runId: string) => void;
  onGoToReview?: (runId: string) => void;
  onDelete?: (runId: string) => void;
}) {
  if (runs.length === 0 && commits.length === 0) return null;

  const items: TimelineItem[] = [
    ...runs.map((run) => ({ kind: "run" as const, ts: tsOf(run.ran_at), run })),
    ...commits.map((commit) => ({
      kind: "commit" as const,
      ts: tsOf(commit.committed_at),
      commit,
    })),
  ].sort((a, b) => b.ts - a.ts);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((item) => {
        if (item.kind === "commit") {
          return <CommitRow key={`commit:${item.commit.sha}`} commit={item.commit} />;
        }

        const r = item.run;
        // Map absent → undefined (plain text). Map present without entry → undefined
        // (review deleted; keep denormalized findings_count). Map with entry → array.
        const findings =
          findingsByRun == null
            ? undefined
            : findingsByRun.has(r.run_id)
              ? (findingsByRun.get(r.run_id) ?? [])
              : undefined;

        return (
          <RunRow
            key={`run:${r.run_id}`}
            run={r}
            findings={findings}
            onOpenTrace={onOpenTrace}
            onGoToReview={onGoToReview}
            onDelete={onDelete}
          />
        );
      })}
    </div>
  );
}
