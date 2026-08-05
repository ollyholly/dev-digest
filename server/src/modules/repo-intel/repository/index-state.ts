/**
 * `repo_index_state` reads/writes.
 *
 * IMPORTANT: the `repo_index_state` table is introduced by T2. Until then the
 * raw-SQL probe below MUST swallow `undefined_table` (Postgres 42P01) so the
 * facade keeps returning degraded — never throws.
 */
import { eq } from 'drizzle-orm';
import type { Db } from '../../../db/client.js';
import * as t from '../../../db/schema.js';
import type { DegradedReason, IndexState, IndexStatus } from '../types.js';
import type { IndexStateUpsert } from './types.js';

export class IndexStateRepository {
  constructor(private db: Db) {}

  /**
   * Read the `repo_index_state` row, if any. Tolerant of the table not yet
   * existing (some dev DBs may not have migration 0004 applied) — returns
   * `null` instead of throwing so the facade synthesises a degraded reply.
   *
   * `durationMs` and `reason` live inside `stats` (the schema column set is
   * status/files_indexed/files_skipped/stats/last_indexed_sha/indexer_version/
   * updated_at) — we project them out here so the IndexState shape stays
   * stable for callers.
   */
  async tryGetIndexState(repoId: string): Promise<IndexState | null> {
    try {
      const [row] = await this.db
        .select()
        .from(t.repoIndexState)
        .where(eq(t.repoIndexState.repoId, repoId));
      if (!row) return null;
      const stats = (row.stats ?? {}) as Record<string, unknown>;
      const durationMs = typeof stats.durationMs === 'number' ? stats.durationMs : 0;
      const reason = typeof stats.reason === 'string' ? stats.reason : undefined;
      // A persisted row is the "real" index state. We only mark it `degraded`
      // when the indexer itself stamped status='degraded'|'failed' (e.g. the
      // graph fell over). 'partial' is still a working index — no degraded flag.
      const isDegraded = row.status === 'degraded' || row.status === 'failed';
      return {
        repoId,
        status: row.status as IndexStatus,
        filesIndexed: row.filesIndexed,
        filesSkipped: row.filesSkipped,
        durationMs,
        reason,
        lastIndexedSha: row.lastIndexedSha,
        indexerVersion: row.indexerVersion,
        updatedAt: row.updatedAt,
        degraded: isDegraded ? true : undefined,
        degradedReason: isDegraded
          ? ((stats.degradedReason as DegradedReason | undefined) ?? 'index_failed')
          : undefined,
      };
    } catch {
      // Table missing / schema drift / connection blip — degrade silently. The
      // facade always has a safe synthesised fallback.
      return null;
    }
  }

  /**
   * Upsert one row of `repo_index_state`. PK = repoId, so this is an
   * `INSERT ... ON CONFLICT (repo_id) DO UPDATE` over the full row.
   * `updated_at` is set by the column default on insert and bumped explicitly
   * on conflict so consumers can see when the indexer last touched the row.
   */
  async upsertIndexState(state: IndexStateUpsert): Promise<void> {
    const now = new Date();
    await this.db
      .insert(t.repoIndexState)
      .values({
        repoId: state.repoId,
        lastIndexedSha: state.lastIndexedSha,
        indexerVersion: state.indexerVersion,
        status: state.status,
        filesIndexed: state.filesIndexed,
        filesSkipped: state.filesSkipped,
        stats: state.stats,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: t.repoIndexState.repoId,
        set: {
          lastIndexedSha: state.lastIndexedSha,
          indexerVersion: state.indexerVersion,
          status: state.status,
          filesIndexed: state.filesIndexed,
          filesSkipped: state.filesSkipped,
          stats: state.stats,
          updatedAt: now,
        },
      });
  }

  /**
   * Touch `updated_at` (and stats) on the existing index-state row WITHOUT
   * changing files/sha/status. Used by the incremental refresh's "sha
   * unchanged" branch (step 2).
   */
  async touchIndexState(repoId: string, stats?: Record<string, unknown>): Promise<void> {
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (stats) updates.stats = stats;
    await this.db
      .update(t.repoIndexState)
      .set(updates)
      .where(eq(t.repoIndexState.repoId, repoId));
  }

  /** Update only the `lastIndexedSha` (and bump updated_at) — used by
   * incremental when the diff intersection is empty: code didn't change in
   * any indexed extension, but we still want to remember the new sha. */
  async advanceSha(repoId: string, sha: string): Promise<void> {
    await this.db
      .update(t.repoIndexState)
      .set({ lastIndexedSha: sha, updatedAt: new Date() })
      .where(eq(t.repoIndexState.repoId, repoId));
  }
}
