import type { WireConventionCandidate, WireConventionsResult } from '../adapter/wire-schemas.js';

export type ConventionProjection = {
  id: string;
  category: string;
  rule: string;
  status: WireConventionCandidate['status'];
  confidence: number;
  evidence_path: string;
};

export type ConventionsProjection = {
  repo_id: string;
  scanned_sha: string | null;
  conventions: ConventionProjection[];
};

export function projectConventions(
  repoId: string,
  result: WireConventionsResult,
  statusFilter: 'accepted' | 'pending' | 'rejected' | 'all',
): ConventionsProjection {
  const filtered =
    statusFilter === 'all'
      ? result.candidates
      : result.candidates.filter((c) => c.status === statusFilter);

  return {
    repo_id: repoId,
    scanned_sha: result.scanned_sha,
    conventions: filtered.map((c) => ({
      id: c.id,
      category: c.category,
      rule: c.rule,
      status: c.status,
      confidence: c.confidence,
      evidence_path: c.evidence_path,
    })),
  };
}
