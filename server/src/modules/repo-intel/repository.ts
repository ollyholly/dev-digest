/**
 * repo-intel repository — Drizzle-only facade over five responsibility-split
 * sub-repositories in `./repository/`:
 *   - `basics.ts`     — minimal repo lookup (clone path, owner/name).
 *   - `index-state.ts`— `repo_index_state` reads/writes.
 *   - `symbols.ts`    — `symbols`/`references` cache reads + T2 indexer writes.
 *   - `graph.ts`      — T3 import-graph / rank / per-file-facts.
 *   - `repo-map.ts`   — repo-map candidate reads + cache.
 *
 * `RepoIntelService` and the indexer pipeline (`pipeline/full.ts`,
 * `pipeline/incremental.ts`) depend on THIS single class — the split above is
 * purely a file-size/organisation concern, not a change to the public
 * surface, so no call site needs updating.
 */
import type { Db } from '../../db/client.js';
import type { IndexState } from './types.js';
import { RepoBasicsRepository } from './repository/basics.js';
import { IndexStateRepository } from './repository/index-state.js';
import { SymbolsRepository } from './repository/symbols.js';
import { GraphRepository } from './repository/graph.js';
import { RepoMapRepository } from './repository/repo-map.js';
import type {
  CachedReferenceRow,
  CachedSymbolRow,
  FullSymbolRow,
  IndexerEdgeRow,
  IndexerFileFactsRow,
  IndexerFileRankRow,
  IndexerReferenceRow,
  IndexerSymbolRow,
  IndexStateUpsert,
  RepoBasics,
  RepoMapCandidateRow,
  ResolvedCallerRow,
} from './repository/types.js';
import type { FileRankRow } from './types.js';

export * from './repository/types.js';

export class RepoIntelRepository {
  private readonly basicsRepo: RepoBasicsRepository;
  private readonly indexStateRepo: IndexStateRepository;
  private readonly symbolsRepo: SymbolsRepository;
  private readonly graphRepo: GraphRepository;
  private readonly repoMapRepo: RepoMapRepository;

  constructor(db: Db) {
    this.basicsRepo = new RepoBasicsRepository(db);
    this.indexStateRepo = new IndexStateRepository(db);
    this.symbolsRepo = new SymbolsRepository(db);
    this.graphRepo = new GraphRepository(db);
    this.repoMapRepo = new RepoMapRepository(db);
  }

  // --- basics ---------------------------------------------------------------
  getRepoBasics(repoId: string): Promise<RepoBasics | null> {
    return this.basicsRepo.getRepoBasics(repoId);
  }

  // --- index state ------------------------------------------------------
  tryGetIndexState(repoId: string): Promise<IndexState | null> {
    return this.indexStateRepo.tryGetIndexState(repoId);
  }

  upsertIndexState(state: IndexStateUpsert): Promise<void> {
    return this.indexStateRepo.upsertIndexState(state);
  }

  touchIndexState(repoId: string, stats?: Record<string, unknown>): Promise<void> {
    return this.indexStateRepo.touchIndexState(repoId, stats);
  }

  advanceSha(repoId: string, sha: string): Promise<void> {
    return this.indexStateRepo.advanceSha(repoId, sha);
  }

  // --- symbols / references ----------------------------------------------
  getCachedSymbols(repoId: string): Promise<CachedSymbolRow[]> {
    return this.symbolsRepo.getCachedSymbols(repoId);
  }

  getCachedSymbolsForFiles(repoId: string, paths: string[]): Promise<CachedSymbolRow[]> {
    return this.symbolsRepo.getCachedSymbolsForFiles(repoId, paths);
  }

  getCachedReferencesTo(repoId: string, toSymbols: string[]): Promise<CachedReferenceRow[]> {
    return this.symbolsRepo.getCachedReferencesTo(repoId, toSymbols);
  }

  getSymbolRows(repoId: string, paths: string[]): Promise<FullSymbolRow[]> {
    return this.symbolsRepo.getSymbolRows(repoId, paths);
  }

  deleteAllForRepo(repoId: string): Promise<void> {
    return this.symbolsRepo.deleteAllForRepo(repoId);
  }

  deleteForFiles(repoId: string, paths: string[]): Promise<void> {
    return this.symbolsRepo.deleteForFiles(repoId, paths);
  }

  insertSymbols(rows: IndexerSymbolRow[]): Promise<void> {
    return this.symbolsRepo.insertSymbols(rows);
  }

  insertReferences(rows: IndexerReferenceRow[]): Promise<void> {
    return this.symbolsRepo.insertReferences(rows);
  }

  // --- T3 graph / rank / facts ---------------------------------------------
  replaceEdges(repoId: string, edges: IndexerEdgeRow[]): Promise<void> {
    return this.graphRepo.replaceEdges(repoId, edges);
  }

  replaceFileRank(repoId: string, rows: IndexerFileRankRow[]): Promise<void> {
    return this.graphRepo.replaceFileRank(repoId, rows);
  }

  replaceFileFacts(repoId: string, rows: IndexerFileFactsRow[]): Promise<void> {
    return this.graphRepo.replaceFileFacts(repoId, rows);
  }

  patchFileFacts(repoId: string, files: string[], rows: IndexerFileFactsRow[]): Promise<void> {
    return this.graphRepo.patchFileFacts(repoId, files, rows);
  }

  resolveReferences(repoId: string, opts: { reset: boolean }): Promise<void> {
    return this.graphRepo.resolveReferences(repoId, opts);
  }

  getEdges(repoId: string): Promise<IndexerEdgeRow[]> {
    return this.graphRepo.getEdges(repoId);
  }

  getFileRankFor(repoId: string, paths: string[]): Promise<FileRankRow[]> {
    return this.graphRepo.getFileRankFor(repoId, paths);
  }

  getRankedPaths(repoId: string, limit: number): Promise<Array<{ path: string; rank: number }>> {
    return this.graphRepo.getRankedPaths(repoId, limit);
  }

  getResolvedCallers(
    repoId: string,
    declFiles: string[],
    names: string[],
  ): Promise<ResolvedCallerRow[]> {
    return this.graphRepo.getResolvedCallers(repoId, declFiles, names);
  }

  getFileFacts(repoId: string, files: string[]): Promise<IndexerFileFactsRow[]> {
    return this.graphRepo.getFileFacts(repoId, files);
  }

  // --- repo-map -------------------------------------------------------------
  getRepoMapCandidates(repoId: string): Promise<RepoMapCandidateRow[]> {
    return this.repoMapRepo.getRepoMapCandidates(repoId);
  }

  getRepoMapCache(
    repoId: string,
    commitSha: string,
    tokenBudget: number,
  ): Promise<{ mapText: string; tokenCount: number } | null> {
    return this.repoMapRepo.getRepoMapCache(repoId, commitSha, tokenBudget);
  }

  putRepoMapCache(
    repoId: string,
    commitSha: string,
    tokenBudget: number,
    mapText: string,
    tokenCount: number,
  ): Promise<void> {
    return this.repoMapRepo.putRepoMapCache(repoId, commitSha, tokenBudget, mapText, tokenCount);
  }

  deleteRepoMapCache(repoId: string): Promise<void> {
    return this.repoMapRepo.deleteRepoMapCache(repoId);
  }
}
