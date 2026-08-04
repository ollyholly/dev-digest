/**
 * `symbols` / `references` cache reads (blast) and T2 indexer-pipeline writes.
 */
import { and, eq, inArray } from 'drizzle-orm';
import type { Db } from '../../../db/client.js';
import * as t from '../../../db/schema.js';
import { clampIndexedName } from '../../../db/schema/context.js';
import type {
  CachedReferenceRow,
  CachedSymbolRow,
  FullSymbolRow,
  IndexerReferenceRow,
  IndexerSymbolRow,
} from './types.js';
import { INSERT_CHUNK_SIZE } from './types.js';

export class SymbolsRepository {
  constructor(private db: Db) {}

  /** All cached symbols for a repo (from blast's persistence). */
  async getCachedSymbols(repoId: string): Promise<CachedSymbolRow[]> {
    return this.db
      .select({
        path: t.symbols.path,
        name: t.symbols.name,
        kind: t.symbols.kind,
        line: t.symbols.line,
      })
      .from(t.symbols)
      .where(eq(t.symbols.repoId, repoId));
  }

  /** Cached symbols restricted to the given file paths. */
  async getCachedSymbolsForFiles(repoId: string, paths: string[]): Promise<CachedSymbolRow[]> {
    if (paths.length === 0) return [];
    return this.db
      .select({
        path: t.symbols.path,
        name: t.symbols.name,
        kind: t.symbols.kind,
        line: t.symbols.line,
      })
      .from(t.symbols)
      .where(and(eq(t.symbols.repoId, repoId), inArray(t.symbols.path, paths)));
  }

  /** Cached references whose `toSymbol` matches any of the given names. */
  async getCachedReferencesTo(
    repoId: string,
    toSymbols: string[],
  ): Promise<CachedReferenceRow[]> {
    if (toSymbols.length === 0) return [];
    return this.db
      .select({
        fromPath: t.references.fromPath,
        toSymbol: t.references.toSymbol,
        line: t.references.line,
      })
      .from(t.references)
      .where(
        and(eq(t.references.repoId, repoId), inArray(t.references.toSymbol, toSymbols)),
      );
  }

  /** Full symbol rows (T2 columns) for the given files. */
  async getSymbolRows(repoId: string, paths: string[]): Promise<FullSymbolRow[]> {
    if (paths.length === 0) return [];
    return this.db
      .select({
        path: t.symbols.path,
        name: t.symbols.name,
        kind: t.symbols.kind,
        line: t.symbols.line,
        endLine: t.symbols.endLine,
        exported: t.symbols.exported,
        signature: t.symbols.signature,
      })
      .from(t.symbols)
      .where(and(eq(t.symbols.repoId, repoId), inArray(t.symbols.path, paths)));
  }

  // -------------------------------------------------------------------------
  // T2 indexer-pipeline writes.
  // -------------------------------------------------------------------------

  /** Wipe every cached symbol + reference row for a repo (full-index reset). */
  async deleteAllForRepo(repoId: string): Promise<void> {
    await this.db.delete(t.symbols).where(eq(t.symbols.repoId, repoId));
    await this.db.delete(t.references).where(eq(t.references.repoId, repoId));
  }

  /**
   * Wipe symbols whose `path` is in `paths` and references whose `fromPath`
   * is in `paths`. Used by the incremental indexer before re-parsing a slice.
   * Inline-empty guard keeps the no-op refresh path zero-DB.
   */
  async deleteForFiles(repoId: string, paths: string[]): Promise<void> {
    if (paths.length === 0) return;
    await this.db
      .delete(t.symbols)
      .where(and(eq(t.symbols.repoId, repoId), inArray(t.symbols.path, paths)));
    await this.db
      .delete(t.references)
      .where(
        and(eq(t.references.repoId, repoId), inArray(t.references.fromPath, paths)),
      );
  }

  /** Batched insert into `symbols`. Uses the same chunk size as blast. */
  async insertSymbols(rows: IndexerSymbolRow[]): Promise<void> {
    if (rows.length === 0) return;
    // Clamp the indexed `name` so a pathological multi-KB identifier can't blow
    // the btree row-size limit and crash the indexer (see clampIndexedName).
    const safe = rows.map((r) => ({ ...r, name: clampIndexedName(r.name) }));
    for (let i = 0; i < safe.length; i += INSERT_CHUNK_SIZE) {
      await this.db.insert(t.symbols).values(safe.slice(i, i + INSERT_CHUNK_SIZE));
    }
  }

  /** Batched insert into `references`. */
  async insertReferences(rows: IndexerReferenceRow[]): Promise<void> {
    if (rows.length === 0) return;
    const safe = rows.map((r) => ({ ...r, toSymbol: clampIndexedName(r.toSymbol) }));
    for (let i = 0; i < safe.length; i += INSERT_CHUNK_SIZE) {
      await this.db.insert(t.references).values(safe.slice(i, i + INSERT_CHUNK_SIZE));
    }
  }
}
