import { buildSmartDiff, type SmartDiffFindingInput } from '@devdigest/reviewer-core';
import { Severity, type SmartDiff } from '@devdigest/shared';
import type { FindingRow } from '../../db/rows.js';
import type { Container } from '../../platform/container.js';
import { NotFoundError } from '../../platform/errors.js';
import { selectWaveFindings } from './helpers.js';

/** Slice of `Container` this service actually depends on. */
export type SmartDiffServiceDeps = Pick<Container, 'pullsRepo' | 'reviewRepo'>;

function toFindingInput(row: FindingRow): SmartDiffFindingInput {
  return {
    id: row.id,
    file: row.file,
    start_line: row.startLine,
    end_line: row.endLine,
    severity: Severity.parse(row.severity),
    title: row.title,
  };
}

/**
 * Smart Diff use-case: load PR files + wave findings, then classify via
 * reviewer-core. Never calls an LLM or writes prompt logs.
 */
export class SmartDiffService {
  constructor(private readonly deps: SmartDiffServiceDeps) {}

  async getSmartDiff(workspaceId: string, prId: string): Promise<SmartDiff> {
    const pull = await this.deps.pullsRepo.getInWorkspace(workspaceId, prId);
    if (!pull) throw new NotFoundError('Pull request not found');

    const [files, reviewRows, runs] = await Promise.all([
      this.deps.pullsRepo.getFiles(prId),
      this.deps.reviewRepo.reviewsForPull(prId),
      this.deps.reviewRepo.listRunHeadShasForPull(prId),
    ]);

    const findings = selectWaveFindings({
      pullHeadSha: pull.headSha,
      reviews: reviewRows.map(({ review, findings: reviewFindings }) => ({
        runId: review.runId,
        findings: reviewFindings.map(toFindingInput),
      })),
      runs,
    });

    return buildSmartDiff(
      files.map((f) => ({ path: f.path, additions: f.additions, deletions: f.deletions })),
      findings,
    );
  }
}
