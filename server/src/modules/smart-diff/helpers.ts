/**
 * Pure wave-selection for Smart Diff overlays. No DB / network / Container.
 *
 * Matching completed runs (status === 'done' AND headSha === PR head) win.
 * Seed/legacy reviews (runId == null) are a fallback only when no such wave
 * exists. Stale-SHA findings are never mixed into a matching wave.
 */
import type { SmartDiffFindingInput } from '@devdigest/reviewer-core';

export interface WaveFinding {
  id: string;
  file: string;
  startLine: number;
  endLine: number;
  severity: string;
  title: string;
}

export interface WaveReview {
  id: string;
  runId: string | null;
  findings: WaveFinding[];
}

export interface WaveRun {
  id: string;
  headSha: string | null;
  status: string | null;
}

export interface SelectWaveFindingsArgs {
  pullHeadSha: string;
  reviews: WaveReview[];
  runs: WaveRun[];
}

function toFindingInput(finding: WaveFinding): SmartDiffFindingInput {
  return {
    id: finding.id,
    file: finding.file,
    start_line: finding.startLine,
    end_line: finding.endLine,
    severity: finding.severity as SmartDiffFindingInput['severity'],
    title: finding.title,
  };
}

function flatten(reviews: WaveReview[]): SmartDiffFindingInput[] {
  return reviews.flatMap((review) => review.findings.map(toFindingInput));
}

export function selectWaveFindings(args: SelectWaveFindingsArgs): SmartDiffFindingInput[] {
  const { pullHeadSha, reviews, runs } = args;

  const matchingRunIds = new Set(
    runs.filter((run) => run.status === 'done' && run.headSha === pullHeadSha).map((run) => run.id),
  );

  if (matchingRunIds.size > 0) {
    return flatten(reviews.filter((review) => review.runId !== null && matchingRunIds.has(review.runId)));
  }

  const seedReviews = reviews.filter((review) => review.runId == null);
  if (seedReviews.length > 0) {
    return flatten(seedReviews);
  }

  return [];
}
