/**
 * Repo-map candidate reads + cache reads/writes.
 */
import { and, asc, desc, eq, isNotNull } from 'drizzle-orm';
import type { Db } from '../../../db/client.js';
import * as t from '../../../db/schema.js';
import type { RepoMapCandidateRow } from './types.js';

export class RepoMapRepository {
  constructor(private db: Db) {}

  /** Repo-map candidates: symbols with a signature, joined to rank, ordered. */
  async getRepoMapCandidates(repoId: string): Promise<RepoMapCandidateRow[]> {
    return this.db
      .select({
        path: t.symbols.path,
        name: t.symbols.name,
        exported: t.symbols.exported,
        signature: t.symbols.signature,
        rank: t.fileRank.rank,
      })
      .from(t.symbols)
      .innerJoin(
        t.fileRank,
        and(eq(t.fileRank.repoId, t.symbols.repoId), eq(t.fileRank.filePath, t.symbols.path)),
      )
      .where(and(eq(t.symbols.repoId, repoId), isNotNull(t.symbols.signature)))
      .orderBy(
        desc(t.fileRank.rank),
        desc(t.symbols.exported),
        asc(t.symbols.line),
        asc(t.symbols.name),
      );
  }

  /** Repo-map cache read by PK. */
  async getRepoMapCache(
    repoId: string,
    commitSha: string,
    tokenBudget: number,
  ): Promise<{ mapText: string; tokenCount: number } | null> {
    const [row] = await this.db
      .select({ mapText: t.repoMapCache.mapText, tokenCount: t.repoMapCache.tokenCount })
      .from(t.repoMapCache)
      .where(
        and(
          eq(t.repoMapCache.repoId, repoId),
          eq(t.repoMapCache.commitSha, commitSha),
          eq(t.repoMapCache.tokenBudget, tokenBudget),
        ),
      );
    return row ?? null;
  }

  /** Repo-map cache upsert by (repoId, commitSha, tokenBudget). */
  async putRepoMapCache(
    repoId: string,
    commitSha: string,
    tokenBudget: number,
    mapText: string,
    tokenCount: number,
  ): Promise<void> {
    await this.db
      .insert(t.repoMapCache)
      .values({ repoId, commitSha, tokenBudget, mapText, tokenCount })
      .onConflictDoUpdate({
        target: [t.repoMapCache.repoId, t.repoMapCache.commitSha, t.repoMapCache.tokenBudget],
        set: { mapText, tokenCount, createdAt: new Date() },
      });
  }

  /** Drop the whole repo-map cache for a repo (SHA moved / repo reindex). */
  async deleteRepoMapCache(repoId: string): Promise<void> {
    await this.db.delete(t.repoMapCache).where(eq(t.repoMapCache.repoId, repoId));
  }
}
