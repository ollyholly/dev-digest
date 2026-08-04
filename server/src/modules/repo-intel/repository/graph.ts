/**
 * T3 — import-graph / rank / per-file-facts writes and reads.
 */
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import type { Db } from '../../../db/client.js';
import * as t from '../../../db/schema.js';
import type { FileRankRow } from '../types.js';
import type {
  IndexerEdgeRow,
  IndexerFileFactsRow,
  IndexerFileRankRow,
  ResolvedCallerRow,
} from './types.js';
import { INSERT_CHUNK_SIZE } from './types.js';

export class GraphRepository {
  constructor(private db: Db) {}

  /** Replace the whole import-graph for a repo (full index / incremental). */
  async replaceEdges(repoId: string, edges: IndexerEdgeRow[]): Promise<void> {
    await this.db.delete(t.fileEdges).where(eq(t.fileEdges.repoId, repoId));
    if (edges.length === 0) return;
    const rows = edges.map((e) => ({ repoId, fromFile: e.fromFile, toFile: e.toFile }));
    for (let i = 0; i < rows.length; i += INSERT_CHUNK_SIZE) {
      await this.db.insert(t.fileEdges).values(rows.slice(i, i + INSERT_CHUNK_SIZE));
    }
  }

  /** Replace the whole file_rank table for a repo. */
  async replaceFileRank(repoId: string, rows: IndexerFileRankRow[]): Promise<void> {
    await this.db.delete(t.fileRank).where(eq(t.fileRank.repoId, repoId));
    if (rows.length === 0) return;
    const values = rows.map((r) => ({ repoId, ...r }));
    for (let i = 0; i < values.length; i += INSERT_CHUNK_SIZE) {
      await this.db.insert(t.fileRank).values(values.slice(i, i + INSERT_CHUNK_SIZE));
    }
  }

  /** Replace per-file facts; only rows with at least one endpoint/cron persist. */
  async replaceFileFacts(repoId: string, rows: IndexerFileFactsRow[]): Promise<void> {
    await this.db.delete(t.fileFacts).where(eq(t.fileFacts.repoId, repoId));
    const nonEmpty = rows.filter((r) => r.endpoints.length > 0 || r.crons.length > 0);
    if (nonEmpty.length === 0) return;
    const values = nonEmpty.map((r) => ({
      repoId,
      filePath: r.filePath,
      endpoints: r.endpoints,
      crons: r.crons,
    }));
    for (let i = 0; i < values.length; i += INSERT_CHUNK_SIZE) {
      await this.db.insert(t.fileFacts).values(values.slice(i, i + INSERT_CHUNK_SIZE));
    }
  }

  /**
   * Patch facts for a slice of files (incremental): drop the changed files'
   * rows, then insert the non-empty ones. Unchanged files keep their facts.
   */
  async patchFileFacts(
    repoId: string,
    files: string[],
    rows: IndexerFileFactsRow[],
  ): Promise<void> {
    if (files.length > 0) {
      await this.db
        .delete(t.fileFacts)
        .where(and(eq(t.fileFacts.repoId, repoId), inArray(t.fileFacts.filePath, files)));
    }
    const nonEmpty = rows.filter((r) => r.endpoints.length > 0 || r.crons.length > 0);
    if (nonEmpty.length === 0) return;
    const values = nonEmpty.map((r) => ({
      repoId,
      filePath: r.filePath,
      endpoints: r.endpoints,
      crons: r.crons,
    }));
    for (let i = 0; i < values.length; i += INSERT_CHUNK_SIZE) {
      await this.db.insert(t.fileFacts).values(values.slice(i, i + INSERT_CHUNK_SIZE));
    }
  }

  /**
   * Resolve `references.decl_file` through the import graph (step 5).
   * A reference `(from_path → to_symbol)` resolves to file `F` iff `from_path`
   * imports `F` AND `F` exports a symbol named `to_symbol` — and ONLY when that
   * candidate is unique. 0 or >1 candidates leave `decl_file = NULL` (which is
   * the honest "unresolved" signal, never a nearest-name guess).
   *
   * `reset: true` (incremental) first clears every decl_file so a changed
   * decl-file can't leave a stale resolution behind; full index inserts rows
   * with NULL decl_file already, so reset is unnecessary there.
   *
   * Quoted `"references"` — it's a SQL reserved word. The query is fully
   * parameterised on repoId (no injection surface).
   */
  async resolveReferences(repoId: string, opts: { reset: boolean }): Promise<void> {
    if (opts.reset) {
      await this.db.execute(
        sql`UPDATE "references" SET decl_file = NULL WHERE repo_id = ${repoId}`,
      );
    }
    await this.db.execute(sql`
      WITH cand AS (
        SELECT r.id AS ref_id, e.to_file AS decl
        FROM "references" r
        JOIN file_edges e ON e.repo_id = r.repo_id AND e.from_file = r.from_path
        JOIN symbols s ON s.repo_id = r.repo_id AND s.path = e.to_file
                      AND s.name = r.to_symbol AND s.exported = true
        WHERE r.repo_id = ${repoId}
        GROUP BY r.id, e.to_file
      ),
      uniq AS (
        SELECT ref_id FROM cand GROUP BY ref_id HAVING count(*) = 1
      )
      UPDATE "references" r
      SET decl_file = c.decl
      FROM cand c
      JOIN uniq u ON u.ref_id = c.ref_id
      WHERE r.id = c.ref_id
    `);
  }

  /** All import edges for a repo (rank graph build + critical-paths). */
  async getEdges(repoId: string): Promise<IndexerEdgeRow[]> {
    return this.db
      .select({ fromFile: t.fileEdges.fromFile, toFile: t.fileEdges.toFile })
      .from(t.fileEdges)
      .where(eq(t.fileEdges.repoId, repoId));
  }

  /** `{path, percentile}` for the given paths (smart-diff / run-executor). */
  async getFileRankFor(repoId: string, paths: string[]): Promise<FileRankRow[]> {
    if (paths.length === 0) return [];
    return this.db
      .select({ path: t.fileRank.filePath, percentile: t.fileRank.percentile })
      .from(t.fileRank)
      .where(and(eq(t.fileRank.repoId, repoId), inArray(t.fileRank.filePath, paths)));
  }

  /** Top `limit` paths by rank DESC (caller filters tests/configs in JS). */
  async getRankedPaths(
    repoId: string,
    limit: number,
  ): Promise<Array<{ path: string; rank: number }>> {
    return this.db
      .select({ path: t.fileRank.filePath, rank: t.fileRank.rank })
      .from(t.fileRank)
      .where(eq(t.fileRank.repoId, repoId))
      .orderBy(desc(t.fileRank.rank))
      .limit(limit);
  }

  /** Resolved cross-file callers of symbols declared in `declFiles`. */
  async getResolvedCallers(
    repoId: string,
    declFiles: string[],
    names: string[],
  ): Promise<ResolvedCallerRow[]> {
    if (declFiles.length === 0 || names.length === 0) return [];
    return this.db
      .select({
        fromPath: t.references.fromPath,
        toSymbol: t.references.toSymbol,
        line: t.references.line,
        rank: t.fileRank.rank,
      })
      .from(t.references)
      .innerJoin(
        t.fileRank,
        and(
          eq(t.fileRank.repoId, t.references.repoId),
          eq(t.fileRank.filePath, t.references.fromPath),
        ),
      )
      .where(
        and(
          eq(t.references.repoId, repoId),
          inArray(t.references.declFile, declFiles),
          inArray(t.references.toSymbol, names),
        ),
      );
  }

  /** Per-file facts (endpoints/crons) for the given files. */
  async getFileFacts(repoId: string, files: string[]): Promise<IndexerFileFactsRow[]> {
    if (files.length === 0) return [];
    const rows = await this.db
      .select({
        filePath: t.fileFacts.filePath,
        endpoints: t.fileFacts.endpoints,
        crons: t.fileFacts.crons,
      })
      .from(t.fileFacts)
      .where(and(eq(t.fileFacts.repoId, repoId), inArray(t.fileFacts.filePath, files)));
    return rows.map((r) => ({
      filePath: r.filePath,
      endpoints: (r.endpoints as string[]) ?? [],
      crons: (r.crons as string[]) ?? [],
    }));
  }
}
