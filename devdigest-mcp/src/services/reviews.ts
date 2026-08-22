import type { WireRunSummary } from '../adapter/wire-schemas.js';
import type { McpConfig } from '../config.js';
import type { DevDigestApiPort } from '../port/devdigest-api.js';
import {
  projectVerdictFromReviews,
  type CompactVerdict,
} from '../projections/reviews.js';

const TERMINAL = new Set(['done', 'failed', 'cancelled']);

export type ReviewsServiceDeps = {
  api: DevDigestApiPort;
  config: Pick<McpConfig, 'pollIntervalMs' | 'runTimeoutMs'>;
  /** Injectable for unit tests. */
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
};

export type RunAndWaitSuccess = { ok: true; verdict: CompactVerdict };
export type RunAndWaitFailure = {
  ok: false;
  payload: {
    run_id: string;
    status: string;
    message: string;
    error?: string | null;
  };
};
export type RunAndWaitResult = RunAndWaitSuccess | RunAndWaitFailure;

/**
 * Review orchestration: resolve PR number → UUID, start run, poll until
 * terminal status or timeout, project compact verdict.
 */
export class ReviewsService {
  private readonly api: DevDigestApiPort;
  private readonly pollIntervalMs: number;
  private readonly runTimeoutMs: number;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly now: () => number;
  /** run_id → pr_id, filled on start / discovery for get_findings. */
  private readonly runIndex = new Map<string, string>();

  constructor(deps: ReviewsServiceDeps) {
    this.api = deps.api;
    this.pollIntervalMs = deps.config.pollIntervalMs;
    this.runTimeoutMs = deps.config.runTimeoutMs;
    this.sleep = deps.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
    this.now = deps.now ?? (() => Date.now());
  }

  rememberRun(runId: string, prId: string): void {
    this.runIndex.set(runId, prId);
  }

  async runAndWait(input: {
    repo_id: string;
    pr_number: number;
    agent_id: string;
  }): Promise<RunAndWaitResult> {
    const prId = await this.resolvePrId(input.repo_id, input.pr_number);
    const started = await this.api.startReview(prId, input.agent_id);
    const target = started.runs[0];
    if (!target) {
      return {
        ok: false,
        payload: {
          run_id: '',
          status: 'failed',
          message: 'API returned no runs for the review request',
        },
      };
    }

    this.rememberRun(target.run_id, prId);

    const deadline = this.now() + this.runTimeoutMs;
    let last: WireRunSummary | undefined;

    while (this.now() < deadline) {
      const runs = await this.api.listRuns(prId);
      last = runs.find((r) => r.run_id === target.run_id);
      if (last?.status && TERMINAL.has(last.status)) break;
      await this.sleep(this.pollIntervalMs);
    }

    if (!last?.status || !TERMINAL.has(last.status)) {
      return {
        ok: false,
        payload: {
          run_id: target.run_id,
          status: 'timeout',
          message: `Review still running after ${this.runTimeoutMs}ms; call get_findings with this run_id later.`,
        },
      };
    }

    if (last.status === 'failed' || last.status === 'cancelled') {
      return {
        ok: false,
        payload: {
          run_id: target.run_id,
          status: last.status,
          message: last.error ?? `Review run ${last.status}`,
          error: last.error,
        },
      };
    }

    const reviews = await this.api.listReviews(prId);
    const verdict = projectVerdictFromReviews(reviews, target.run_id, {
      agent_id: target.agent_id,
      agent_name: target.agent_name,
    });
    if (!verdict) {
      return {
        ok: false,
        payload: {
          run_id: target.run_id,
          status: 'failed',
          message: 'Run completed but no review record was found',
        },
      };
    }
    return { ok: true, verdict };
  }

  async getFindingsByRunId(runId: string): Promise<CompactVerdict> {
    const prId = await this.resolvePrIdForRun(runId);
    const reviews = await this.api.listReviews(prId);
    const runs = await this.api.listRuns(prId);
    const run = runs.find((r) => r.run_id === runId);
    const verdict = projectVerdictFromReviews(reviews, runId, {
      agent_id: run?.agent_id ?? '',
      agent_name: run?.agent_name ?? '',
    });
    if (!verdict) {
      throw new Error(`No review found for run_id ${runId}`);
    }
    return verdict;
  }

  private async resolvePrId(repoId: string, prNumber: number): Promise<string> {
    const pulls = await this.api.listPulls(repoId);
    const match = pulls.find((p) => p.number === prNumber);
    if (!match?.id) {
      throw new Error(`Pull request #${prNumber} not found in repo ${repoId}`);
    }
    return match.id;
  }

  private async resolvePrIdForRun(runId: string): Promise<string> {
    const cached = this.runIndex.get(runId);
    if (cached) return cached;

    const repos = await this.api.listRepos();
    for (const repo of repos) {
      const pulls = await this.api.listPulls(repo.id);
      for (const pull of pulls) {
        if (!pull.id) continue;
        const runs = await this.api.listRuns(pull.id);
        for (const run of runs) {
          this.rememberRun(run.run_id, pull.id);
          if (run.run_id === runId) return pull.id;
        }
      }
    }
    throw new Error(`Could not resolve run_id ${runId} to a pull request`);
  }
}
