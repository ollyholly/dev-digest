import { createHash } from 'node:crypto';
import type { ConventionCandidate, ConventionStatus } from '@devdigest/shared';
import type { ConventionRow } from '../../db/rows.js';

/** Stable UI/database ordering: actionable pending rows first. */
export const CONVENTION_STATUS_ORDER: Readonly<Record<ConventionStatus, number>> = {
  pending: 0,
  accepted: 1,
  rejected: 2,
};

/** Canonical form used only for identity; the displayed directive keeps casing. */
export function normalizeRule(rule: string): string {
  return rule.normalize('NFKC').trim().toLowerCase().replace(/\s+/gu, ' ');
}

export function fingerprint(rule: string): string {
  return createHash('sha256').update(normalizeRule(rule)).digest('hex');
}

/** Map only mechanically grounded rows to the public candidate contract. */
export function toConventionDto(row: ConventionRow): ConventionCandidate {
  if (
    row.repoId === null ||
    row.evidencePath === null ||
    row.evidenceSnippet === null ||
    row.evidenceStartLine === null ||
    row.evidenceEndLine === null ||
    row.confidence === null
  ) {
    throw new Error(`Convention ${row.id} is missing grounded evidence`);
  }

  const status = row.status as ConventionStatus;
  return {
    id: row.id,
    repo_id: row.repoId,
    category: row.category,
    rule: row.rule,
    evidence_path: row.evidencePath,
    evidence_snippet: row.evidenceSnippet,
    evidence_start_line: row.evidenceStartLine,
    evidence_end_line: row.evidenceEndLine,
    confidence: row.confidence,
    status,
    accepted: status === 'accepted',
    scanned_sha: row.scannedSha,
    fingerprint: row.fingerprint,
    created_at: row.createdAt.toISOString(),
  };
}
