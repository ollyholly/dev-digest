import type { Container } from '../../platform/container.js';
import type { GitHubClient, PrCommentInput, PrDetail, PrMeta, PrReviewComment } from '@devdigest/shared';
import { AppError, NotFoundError } from '../../platform/errors.js';
import { syncPullRequestsFromGitHub } from './sync.js';
import { deriveReviewStatus, rollupPrCost, rollupSeverities } from './status.js';

/** Freshly-imported PRs land with zeroed diff stats (not on GitHub's list
 * payload) — backfill at most this many per list request from the detail
 * endpoint so the list shows real size/± counts without an unbounded fan-out. */
const DIFF_STAT_BACKFILL_LIMIT = 10;

/** Minimal structured-logging surface the service needs — satisfied by
 * Fastify's request logger (`req.log`) without depending on its concrete type. */
export interface SoftFailureLogger {
  warn(obj: unknown, msg: string): void;
}

const noopLogger: SoftFailureLogger = { warn: () => {} };

/**
 * F1 — pulls service. Business logic for the Pull Requests feature:
 *   - list PRs for a repo (GitHub sync is best-effort; local-first read)
 *   - PR detail (files/commits/body), refreshed from GitHub when reachable
 *   - inline review comments (proxied live to GitHub, no local persistence)
 *
 * No HTTP routing and no raw SQL live here — persistence goes through
 * PullsRepository; the GitHub sync loop is shared with `polling` via `sync.ts`.
 */
export class PullsService {
  private repo: Container['pullsRepo'];

  constructor(private container: Container) {
    this.repo = container.pullsRepo;
  }

  private async tryGitHub(log: SoftFailureLogger, warnMsg: string): Promise<GitHubClient | null> {
    try {
      return await this.container.github();
    } catch (err) {
      log.warn({ err }, warnMsg);
      return null;
    }
  }

  async list(workspaceId: string, repoId: string, log: SoftFailureLogger = noopLogger): Promise<PrMeta[]> {
    const repoRow = await this.repo.getRepoInWorkspace(workspaceId, repoId);
    if (!repoRow) throw new NotFoundError('Repo not found');

    // Local-first: sync from GitHub when a token is configured, but never
    // fail the read — already-imported/seeded PRs stay viewable offline.
    const gh = await this.tryGitHub(log, 'GitHub client unavailable (no token / offline); serving persisted PRs');
    if (gh) {
      try {
        await syncPullRequestsFromGitHub(gh, repoRow, workspaceId, this.repo);
      } catch (err) {
        log.warn({ err }, 'GitHub PR sync skipped (no token / offline); serving persisted PRs');
      }
    }

    const rows = await this.repo.listForRepo(repoRow.id);

    if (gh) {
      const needStats = rows
        .filter((r) => r.additions === 0 && r.deletions === 0 && r.filesCount === 0)
        .slice(0, DIFF_STAT_BACKFILL_LIMIT);
      for (const r of needStats) {
        try {
          const detail = await gh.getPullRequest({ owner: repoRow.owner, name: repoRow.name }, r.number);
          await this.repo.updateDiffStats(r.id, {
            additions: detail.additions,
            deletions: detail.deletions,
            filesCount: detail.files_count,
          });
          r.additions = detail.additions;
          r.deletions = detail.deletions;
          r.filesCount = detail.files_count;
        } catch (err) {
          log.warn({ err, number: r.number }, 'PR diff-stat backfill skipped');
        }
      }
    }

    // Latest-review SCORE per PR for the list's score ring. Computed on read
    // from reviews (no FK denorm); the list is small, so one IN-query + JS
    // grouping is cheap.
    const prIds = rows.map((r) => r.id);
    const latestReviewByPr = new Map<string, { score: number | null }>();
    /** PRs that have at least one review row (drives null vs zeros for findings). */
    const reviewedPrIds = new Set<string>();
    const reviewRows = await this.repo.getReviewScores(prIds);
    // Rows are newest-first → first seen per PR is the latest review.
    for (const rv of reviewRows) {
      reviewedPrIds.add(rv.prId);
      if (!latestReviewByPr.has(rv.prId)) latestReviewByPr.set(rv.prId, { score: rv.score });
    }

    // FINDINGS column: severity tally across every review of the PR (COST-style
    // union, not latest-only). null = never reviewed; zeros = reviewed clean.
    const findingsByPr = new Map<string, ReturnType<typeof rollupSeverities>>();
    const findingRows = await this.repo.getFindingSeverities(prIds);
    const groupedFindings = new Map<string, { severity: string }[]>();
    for (const f of findingRows) {
      const list = groupedFindings.get(f.prId) ?? [];
      list.push({ severity: f.severity });
      groupedFindings.set(f.prId, list);
    }
    for (const prId of reviewedPrIds) {
      findingsByPr.set(prId, rollupSeverities(groupedFindings.get(prId) ?? []));
    }

    // COST column: wave sum (runs for lastReviewedSha) with fallback to all
    // completed runs. Persisted cost_usd only — never recomputed from tokens.
    const runsByPr = new Map<
      string,
      { headSha: string | null; costUsd: number | null; status: string | null }[]
    >();
    const runRows = await this.repo.getRunCosts(prIds);
    for (const run of runRows) {
      if (!run.prId) continue;
      const list = runsByPr.get(run.prId) ?? [];
      list.push({ headSha: run.headSha, costUsd: run.costUsd, status: run.status });
      runsByPr.set(run.prId, list);
    }

    const now = Date.now();
    return rows.map((r) => {
      const review = latestReviewByPr.get(r.id);
      return {
        id: r.id,
        number: r.number,
        title: r.title,
        author: r.author,
        branch: r.branch,
        base: r.base,
        head_sha: r.headSha,
        additions: r.additions,
        deletions: r.deletions,
        files_count: r.filesCount,
        status: deriveReviewStatus({
          ghStatus: r.status,
          lastReviewedSha: r.lastReviewedSha,
          headSha: r.headSha,
          updatedAt: r.updatedAt,
          now,
        }),
        opened_at: r.openedAt?.toISOString() ?? null,
        updated_at: r.updatedAt?.toISOString() ?? null,
        score: review ? review.score : null,
        cost_usd: rollupPrCost({
          lastReviewedSha: r.lastReviewedSha,
          runs: runsByPr.get(r.id) ?? [],
        }),
        findings_by_severity: findingsByPr.get(r.id) ?? null,
      };
    });
  }

  async detail(workspaceId: string, id: string, log: SoftFailureLogger = noopLogger): Promise<PrDetail> {
    const pr = await this.repo.getInWorkspace(workspaceId, id);
    if (!pr) throw new NotFoundError('Pull request not found');
    const repoRow = await this.repo.getRepoById(pr.repoId);
    if (!repoRow) throw new NotFoundError('Repo not found');

    // Local-first: refresh detail from GitHub when a token is configured;
    // otherwise serve the persisted files/commits/body (seeded or previously
    // imported) so PR detail works offline.
    try {
      const gh = await this.container.github();
      const detail = await gh.getPullRequest({ owner: repoRow.owner, name: repoRow.name }, pr.number);

      await this.repo.replaceFiles(
        pr.id,
        detail.files.map((f) => ({
          path: f.path,
          additions: f.additions,
          deletions: f.deletions,
          patch: f.patch ?? null,
        })),
      );
      await this.repo.replaceCommits(
        pr.id,
        detail.commits.map((c) => ({
          sha: c.sha,
          message: c.message,
          author: c.author,
          committedAt: c.committed_at ? new Date(c.committed_at) : null,
        })),
      );
      await this.repo.updateDetail(pr.id, {
        // Diff stats aren't on GitHub's PR-list payload — backfill them from
        // the detail fetch so the Pull Requests list shows real size/files.
        body: detail.body ?? null,
        additions: detail.additions,
        deletions: detail.deletions,
        filesCount: detail.files_count,
      });

      return { ...detail, id: pr.id };
    } catch (err) {
      log.warn({ err }, 'GitHub PR detail refresh skipped (no token / offline); serving persisted detail');
      const files = await this.repo.getFiles(pr.id);
      const commits = await this.repo.getCommits(pr.id);
      return {
        id: pr.id,
        number: pr.number,
        title: pr.title,
        author: pr.author,
        branch: pr.branch,
        base: pr.base,
        head_sha: pr.headSha,
        additions: pr.additions,
        deletions: pr.deletions,
        files_count: pr.filesCount,
        status: pr.status as PrDetail['status'],
        opened_at: pr.openedAt?.toISOString() ?? null,
        updated_at: pr.updatedAt?.toISOString() ?? null,
        body: pr.body ?? null,
        files: files.map((f) => ({
          path: f.path,
          additions: f.additions,
          deletions: f.deletions,
          patch: f.patch ?? null,
        })),
        commits: commits.map((c) => ({
          sha: c.sha,
          message: c.message,
          author: c.author,
          committed_at: c.committedAt?.toISOString() ?? null,
        })),
      };
    }
  }

  private async resolvePrAndRepo(id: string, workspaceId: string) {
    const pr = await this.repo.getInWorkspace(workspaceId, id);
    if (!pr) throw new NotFoundError('Pull request not found');
    const repoRow = await this.repo.getRepoById(pr.repoId);
    if (!repoRow) throw new NotFoundError('Repo not found');
    return { pr, repo: repoRow };
  }

  // ---- Inline review comments (Files changed tab) -------------------------
  // Proxied live to GitHub (no local persistence): reads reflect existing PR
  // comments; creates post immediately. Keeps the tab in lock-step with
  // GitHub and avoids a stale local mirror.

  async listComments(
    workspaceId: string,
    id: string,
    log: SoftFailureLogger = noopLogger,
  ): Promise<PrReviewComment[]> {
    const { pr, repo: repoRow } = await this.resolvePrAndRepo(id, workspaceId);
    const gh = await this.tryGitHub(log, 'GitHub client unavailable; serving no PR comments');
    if (!gh) return [];
    try {
      return await gh.listReviewComments({ owner: repoRow.owner, name: repoRow.name }, pr.number);
    } catch (err) {
      log.warn({ err }, 'GitHub review-comments fetch skipped (offline / error)');
      return [];
    }
  }

  async createComment(workspaceId: string, id: string, input: PrCommentInput): Promise<PrReviewComment> {
    const { pr, repo: repoRow } = await this.resolvePrAndRepo(id, workspaceId);
    let gh: GitHubClient;
    try {
      gh = await this.container.github();
    } catch {
      throw new AppError('github_unavailable', 'Connect a GitHub token to post comments.', 400);
    }
    try {
      return await gh.createReviewComment({ owner: repoRow.owner, name: repoRow.name }, pr.number, {
        commitId: pr.headSha,
        path: input.path,
        line: input.line,
        ...(input.side ? { side: input.side } : {}),
        body: input.body,
        ...(input.in_reply_to != null ? { inReplyTo: input.in_reply_to } : {}),
      });
    } catch (err) {
      // GitHub rejects comments on lines outside the diff / on closed PRs (422).
      const msg = err instanceof Error ? err.message : 'Failed to post the comment to GitHub.';
      throw new AppError('github_comment_failed', msg, 400, { cause: String(err) });
    }
  }
}
