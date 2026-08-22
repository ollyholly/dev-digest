import type { WireFinding, WireReviewRecord } from '../adapter/wire-schemas.js';

const FINDINGS_CAP = 20;

export type CompactFinding = {
  severity: 'CRITICAL' | 'WARNING' | 'SUGGESTION';
  title: string;
  file: string;
  start_line: number;
  end_line: number;
};

export type CompactVerdict = {
  run_id: string;
  agent_id: string;
  agent_name: string;
  status: 'done';
  verdict: string | null;
  score: number | null;
  summary: string | null;
  severity_counts: { CRITICAL: number; WARNING: number; SUGGESTION: number };
  findings: CompactFinding[];
  findings_truncated?: true;
};

function emptyCounts(): CompactVerdict['severity_counts'] {
  return { CRITICAL: 0, WARNING: 0, SUGGESTION: 0 };
}

function countSeverities(findings: WireFinding[]): CompactVerdict['severity_counts'] {
  const counts = emptyCounts();
  for (const f of findings) {
    counts[f.severity] += 1;
  }
  return counts;
}

function pickReview(reviews: WireReviewRecord[], runId: string): WireReviewRecord | undefined {
  const matches = reviews.filter((r) => r.run_id === runId);
  return matches.find((r) => r.kind === 'review') ?? matches[0];
}

export function projectCompactVerdict(
  review: WireReviewRecord,
  runId: string,
): CompactVerdict {
  const findings = review.findings ?? [];
  const truncated = findings.length > FINDINGS_CAP;
  const sliced = truncated ? findings.slice(0, FINDINGS_CAP) : findings;

  return {
    run_id: runId,
    agent_id: review.agent_id ?? '',
    agent_name: review.agent_name ?? '',
    status: 'done',
    verdict: review.verdict ?? null,
    score: review.score ?? null,
    summary: review.summary ?? null,
    severity_counts: countSeverities(findings),
    findings: sliced.map((f) => ({
      severity: f.severity,
      title: f.title,
      file: f.file,
      start_line: f.start_line,
      end_line: f.end_line,
    })),
    ...(truncated ? { findings_truncated: true as const } : {}),
  };
}

export function projectVerdictFromReviews(
  reviews: WireReviewRecord[],
  runId: string,
  fallback?: { agent_id: string; agent_name: string },
): CompactVerdict | null {
  const review = pickReview(reviews, runId);
  if (!review) {
    if (!fallback) return null;
    return {
      run_id: runId,
      agent_id: fallback.agent_id,
      agent_name: fallback.agent_name,
      status: 'done',
      verdict: null,
      score: null,
      summary: null,
      severity_counts: emptyCounts(),
      findings: [],
    };
  }
  return projectCompactVerdict(review, runId);
}
