import { and, asc, desc, eq, isNotNull, sql } from 'drizzle-orm';
import type { ConventionStatus, ConventionUpdate } from '@devdigest/shared';
import type { Db } from '../../db/client.js';
import * as t from '../../db/schema.js';
import type { ConventionRow } from '../../db/rows.js';

export type { ConventionRow };

export interface ExtractionConvention {
  category: string;
  rule: string;
  evidencePath: string;
  evidenceSnippet: string;
  evidenceStartLine: number;
  evidenceEndLine: number;
  confidence: number;
  scannedSha: string | null;
  fingerprint: string;
}

const statusOrder = sql<number>`case ${t.conventions.status}
  when 'pending' then 0
  when 'accepted' then 1
  when 'rejected' then 2
  else 3
end`;

/** Drizzle-only persistence for grounded, repo-scoped convention candidates. */
export class ConventionsRepository {
  constructor(private db: Db) {}

  async list(workspaceId: string, repoId: string): Promise<ConventionRow[]> {
    return this.db
      .select()
      .from(t.conventions)
      .where(groundedRepoWhere(workspaceId, repoId))
      .orderBy(asc(statusOrder), desc(t.conventions.confidence), asc(t.conventions.createdAt));
  }

  async getById(workspaceId: string, id: string): Promise<ConventionRow | undefined> {
    const [row] = await this.db
      .select()
      .from(t.conventions)
      .where(
        and(
          eq(t.conventions.workspaceId, workspaceId),
          eq(t.conventions.id, id),
          isNotNull(t.conventions.repoId),
          isNotNull(t.conventions.evidencePath),
          isNotNull(t.conventions.evidenceSnippet),
          isNotNull(t.conventions.evidenceStartLine),
          isNotNull(t.conventions.evidenceEndLine),
          isNotNull(t.conventions.confidence),
        ),
      );
    return row;
  }

  /**
   * Refresh extraction-owned rows by fingerprint. Matching curated rows keep
   * their status and edited rule/category; unmatched accepted/rejected rows are
   * never deleted. Pending rows are replaced by the fresh verified set.
   */
  async upsertExtraction(
    workspaceId: string,
    repoId: string,
    candidates: ExtractionConvention[],
  ): Promise<ConventionRow[]> {
    return this.db.transaction(async (tx) => {
      const existing = await tx
        .select()
        .from(t.conventions)
        .where(
          and(
            eq(t.conventions.workspaceId, workspaceId),
            eq(t.conventions.repoId, repoId),
          ),
        );
      const pendingIdsToKeep = new Set<string>();

      for (const candidate of candidates) {
        const matches = existing.filter((row) => row.fingerprint === candidate.fingerprint);
        const matched = chooseFingerprintKeeper(matches);
        if (matched) {
          const curated = matched.status !== 'pending';
          await tx
            .update(t.conventions)
            .set({
              category: curated ? matched.category : candidate.category,
              rule: curated ? matched.rule : candidate.rule,
              evidencePath: candidate.evidencePath,
              evidenceSnippet: candidate.evidenceSnippet,
              evidenceStartLine: candidate.evidenceStartLine,
              evidenceEndLine: candidate.evidenceEndLine,
              confidence: candidate.confidence,
              scannedSha: candidate.scannedSha,
              accepted: matched.status === 'accepted',
            })
            .where(eq(t.conventions.id, matched.id));
          if (matched.status === 'pending') pendingIdsToKeep.add(matched.id);
          continue;
        }

        await tx.insert(t.conventions).values({
          workspaceId,
          repoId,
          category: candidate.category,
          rule: candidate.rule,
          evidencePath: candidate.evidencePath,
          evidenceSnippet: candidate.evidenceSnippet,
          evidenceStartLine: candidate.evidenceStartLine,
          evidenceEndLine: candidate.evidenceEndLine,
          confidence: candidate.confidence,
          status: 'pending',
          accepted: false,
          scannedSha: candidate.scannedSha,
          fingerprint: candidate.fingerprint,
        });
      }

      const stalePendingIds = existing
        .filter((row) => row.status === 'pending' && !pendingIdsToKeep.has(row.id))
        .map((row) => row.id);
      for (const id of stalePendingIds) {
        await tx.delete(t.conventions).where(eq(t.conventions.id, id));
      }

      return tx
        .select()
        .from(t.conventions)
        .where(groundedRepoWhere(workspaceId, repoId))
        .orderBy(asc(statusOrder), desc(t.conventions.confidence), asc(t.conventions.createdAt));
    });
  }

  async update(
    workspaceId: string,
    id: string,
    patch: ConventionUpdate,
  ): Promise<ConventionRow | undefined> {
    const existing = await this.getById(workspaceId, id);
    if (!existing) return undefined;
    const status = patch.status ?? (existing.status as ConventionStatus);
    const [row] = await this.db
      .update(t.conventions)
      .set({
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.rule !== undefined ? { rule: patch.rule } : {}),
        ...(patch.category !== undefined ? { category: patch.category } : {}),
        accepted: status === 'accepted',
      })
      .where(
        and(eq(t.conventions.workspaceId, workspaceId), eq(t.conventions.id, id)),
      )
      .returning();
    return row;
  }

  async listAccepted(workspaceId: string, repoId: string): Promise<ConventionRow[]> {
    return this.db
      .select()
      .from(t.conventions)
      .where(and(groundedRepoWhere(workspaceId, repoId), eq(t.conventions.status, 'accepted')))
      .orderBy(asc(t.conventions.category), desc(t.conventions.confidence));
  }
}

function groundedRepoWhere(workspaceId: string, repoId: string) {
  return and(
    eq(t.conventions.workspaceId, workspaceId),
    eq(t.conventions.repoId, repoId),
    isNotNull(t.conventions.evidencePath),
    isNotNull(t.conventions.evidenceSnippet),
    isNotNull(t.conventions.evidenceStartLine),
    isNotNull(t.conventions.evidenceEndLine),
    isNotNull(t.conventions.confidence),
  )!;
}

function chooseFingerprintKeeper(rows: ConventionRow[]): ConventionRow | undefined {
  return (
    rows.find((row) => row.status === 'accepted') ??
    rows.find((row) => row.status === 'rejected') ??
    rows.find((row) => row.status === 'pending')
  );
}
