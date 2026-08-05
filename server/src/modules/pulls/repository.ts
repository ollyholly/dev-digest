import { and, desc, eq, inArray } from 'drizzle-orm';
import type { Db } from '../../db/client.js';
import * as t from '../../db/schema.js';
import type { PrMeta } from '@devdigest/shared';

/**
 * F1 — pulls data-access layer. The ONLY place that touches `pull_requests` /
 * `pr_files` / `pr_commits` (plus the read-only rollup joins the PR list
 * needs). Every workspace-scoped query filters by `workspaceId`.
 */

export type RepoRow = typeof t.repos.$inferSelect;
export type PullRequestRow = typeof t.pullRequests.$inferSelect;
export type PrFileRow = typeof t.prFiles.$inferSelect;
export type PrCommitRow = typeof t.prCommits.$inferSelect;

export interface PrReviewScoreRow {
  prId: string;
  score: number | null;
}

export interface PrFindingSeverityRow {
  prId: string;
  severity: string;
}

export interface PrRunCostRow {
  prId: string | null;
  headSha: string | null;
  costUsd: number | null;
  status: string | null;
}

export interface InsertPrFile {
  path: string;
  additions: number;
  deletions: number;
  patch: string | null;
}

export interface InsertPrCommit {
  sha: string;
  message: string;
  author: string;
  committedAt: Date | null;
}

export class PullsRepository {
  constructor(private db: Db) {}

  async getRepoInWorkspace(workspaceId: string, repoId: string): Promise<RepoRow | undefined> {
    const [repo] = await this.db
      .select()
      .from(t.repos)
      .where(and(eq(t.repos.workspaceId, workspaceId), eq(t.repos.id, repoId)));
    return repo;
  }

  async getRepoById(repoId: string): Promise<RepoRow | undefined> {
    const [repo] = await this.db.select().from(t.repos).where(eq(t.repos.id, repoId));
    return repo;
  }

  async listForRepo(repoId: string): Promise<PullRequestRow[]> {
    return this.db.select().from(t.pullRequests).where(eq(t.pullRequests.repoId, repoId));
  }

  async getInWorkspace(workspaceId: string, id: string): Promise<PullRequestRow | undefined> {
    const [pr] = await this.db
      .select()
      .from(t.pullRequests)
      .where(and(eq(t.pullRequests.workspaceId, workspaceId), eq(t.pullRequests.id, id)));
    return pr;
  }

  /** Upsert one PR synced from GitHub — shared by the pulls-list sync and manual polling. */
  async upsertFromGitHub(workspaceId: string, repoId: string, pr: PrMeta): Promise<void> {
    await this.db
      .insert(t.pullRequests)
      .values({
        workspaceId,
        repoId,
        number: pr.number,
        title: pr.title,
        author: pr.author,
        branch: pr.branch,
        base: pr.base,
        headSha: pr.head_sha,
        additions: pr.additions,
        deletions: pr.deletions,
        filesCount: pr.files_count,
        status: pr.status,
        openedAt: pr.opened_at ? new Date(pr.opened_at) : null,
        updatedAt: pr.updated_at ? new Date(pr.updated_at) : null,
      })
      .onConflictDoUpdate({
        target: [t.pullRequests.repoId, t.pullRequests.number],
        set: {
          title: pr.title,
          headSha: pr.head_sha,
          status: pr.status,
          updatedAt: pr.updated_at ? new Date(pr.updated_at) : null,
        },
      });
  }

  async updateDiffStats(
    id: string,
    stats: { additions: number; deletions: number; filesCount: number },
  ): Promise<void> {
    await this.db.update(t.pullRequests).set(stats).where(eq(t.pullRequests.id, id));
  }

  /** Latest `review`-kind row per PR (newest-first; caller keeps the first seen). */
  async getReviewScores(prIds: string[]): Promise<PrReviewScoreRow[]> {
    if (prIds.length === 0) return [];
    return this.db
      .select({ prId: t.reviews.prId, score: t.reviews.score })
      .from(t.reviews)
      .where(and(inArray(t.reviews.prId, prIds), eq(t.reviews.kind, 'review')))
      .orderBy(desc(t.reviews.createdAt));
  }

  async getFindingSeverities(prIds: string[]): Promise<PrFindingSeverityRow[]> {
    if (prIds.length === 0) return [];
    return this.db
      .select({ prId: t.reviews.prId, severity: t.findings.severity })
      .from(t.findings)
      .innerJoin(t.reviews, eq(t.findings.reviewId, t.reviews.id))
      .where(inArray(t.reviews.prId, prIds));
  }

  async getRunCosts(prIds: string[]): Promise<PrRunCostRow[]> {
    if (prIds.length === 0) return [];
    return this.db
      .select({
        prId: t.agentRuns.prId,
        headSha: t.agentRuns.headSha,
        costUsd: t.agentRuns.costUsd,
        status: t.agentRuns.status,
      })
      .from(t.agentRuns)
      .where(inArray(t.agentRuns.prId, prIds));
  }

  async replaceFiles(prId: string, files: InsertPrFile[]): Promise<void> {
    await this.db.delete(t.prFiles).where(eq(t.prFiles.prId, prId));
    if (files.length > 0) {
      await this.db.insert(t.prFiles).values(files.map((f) => ({ prId, ...f })));
    }
  }

  async replaceCommits(prId: string, commits: InsertPrCommit[]): Promise<void> {
    await this.db.delete(t.prCommits).where(eq(t.prCommits.prId, prId));
    if (commits.length > 0) {
      await this.db.insert(t.prCommits).values(commits.map((c) => ({ prId, ...c })));
    }
  }

  async updateDetail(
    prId: string,
    values: { body: string | null; additions: number; deletions: number; filesCount: number },
  ): Promise<void> {
    await this.db.update(t.pullRequests).set(values).where(eq(t.pullRequests.id, prId));
  }

  async getFiles(prId: string): Promise<PrFileRow[]> {
    return this.db.select().from(t.prFiles).where(eq(t.prFiles.prId, prId));
  }

  async getCommits(prId: string): Promise<PrCommitRow[]> {
    return this.db.select().from(t.prCommits).where(eq(t.prCommits.prId, prId));
  }
}
