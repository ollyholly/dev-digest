import { describe, expect, it, vi } from 'vitest';
import type {
  WirePrMeta,
  WireReviewRecord,
  WireReviewRunResponse,
  WireRunSummary,
} from '../src/adapter/wire-schemas.js';
import type { DevDigestApiPort } from '../src/port/devdigest-api.js';
import { ReviewsService } from '../src/services/reviews.js';

function pull(overrides: Partial<WirePrMeta> & Pick<WirePrMeta, 'id' | 'number'>): WirePrMeta {
  return {
    title: 't',
    ...overrides,
  };
}

function run(
  overrides: Partial<WireRunSummary> & Pick<WireRunSummary, 'run_id' | 'status'>,
): WireRunSummary {
  return {
    agent_id: 'agent-1',
    agent_name: 'General',
    error: null,
    ...overrides,
  };
}

function review(overrides: Partial<WireReviewRecord> = {}): WireReviewRecord {
  return {
    id: 'rev-1',
    pr_id: 'pr-1',
    agent_id: 'agent-1',
    run_id: 'run-1',
    agent_name: 'General',
    kind: 'review',
    verdict: 'request_changes',
    summary: 'Needs work',
    score: 42,
    findings: [
      {
        severity: 'CRITICAL',
        title: 'Null deref',
        file: 'src/a.ts',
        start_line: 10,
        end_line: 12,
      },
    ],
    ...overrides,
  };
}

function mockApi(partial: Partial<DevDigestApiPort>): DevDigestApiPort {
  return {
    healthCheck: vi.fn(async () => true),
    listAgents: vi.fn(async () => []),
    listRepos: vi.fn(async () => []),
    listPulls: vi.fn(async () => []),
    startReview: vi.fn(async () => ({
      pr_id: 'pr-1',
      runs: [],
    })),
    listRuns: vi.fn(async () => []),
    listReviews: vi.fn(async () => []),
    listConventions: vi.fn(async () => ({
      candidates: [],
      scanned_sha: null,
    })),
    ...partial,
  };
}

describe('ReviewsService.runAndWait', () => {
  it('returns compact verdict when run reaches done', async () => {
    let polls = 0;
    const api = mockApi({
      listPulls: vi.fn(async () => [pull({ id: 'pr-1', number: 482 })]),
      startReview: vi.fn(async (): Promise<WireReviewRunResponse> => ({
        pr_id: 'pr-1',
        runs: [{ run_id: 'run-1', agent_id: 'agent-1', agent_name: 'General' }],
      })),
      listRuns: vi.fn(async () => {
        polls += 1;
        if (polls < 2) return [run({ run_id: 'run-1', status: 'running' })];
        return [run({ run_id: 'run-1', status: 'done' })];
      }),
      listReviews: vi.fn(async () => [review()]),
    });

    const sleep = vi.fn(async () => undefined);
    let t = 0;
    const svc = new ReviewsService({
      api,
      config: { pollIntervalMs: 2_000, runTimeoutMs: 120_000 },
      sleep,
      now: () => {
        t += 1;
        return t * 1_000;
      },
    });

    const result = await svc.runAndWait({
      repo_id: 'repo-1',
      pr_number: 482,
      agent_id: 'agent-1',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.verdict.run_id).toBe('run-1');
    expect(result.verdict.severity_counts.CRITICAL).toBe(1);
    expect(sleep).toHaveBeenCalled();
  });

  it('returns timeout with run_id when still running after deadline', async () => {
    const api = mockApi({
      listPulls: vi.fn(async () => [pull({ id: 'pr-1', number: 482 })]),
      startReview: vi.fn(async () => ({
        pr_id: 'pr-1',
        runs: [{ run_id: 'run-timeout', agent_id: 'agent-1', agent_name: 'General' }],
      })),
      listRuns: vi.fn(async () => [run({ run_id: 'run-timeout', status: 'running' })]),
    });

    let now = 0;
    const svc = new ReviewsService({
      api,
      config: { pollIntervalMs: 2_000, runTimeoutMs: 120_000 },
      sleep: async () => {
        now += 2_000;
      },
      now: () => now,
    });

    const result = await svc.runAndWait({
      repo_id: 'repo-1',
      pr_number: 482,
      agent_id: 'agent-1',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.payload.status).toBe('timeout');
    expect(result.payload.run_id).toBe('run-timeout');
  });

  it('returns failed payload when run fails', async () => {
    const api = mockApi({
      listPulls: vi.fn(async () => [pull({ id: 'pr-1', number: 482 })]),
      startReview: vi.fn(async () => ({
        pr_id: 'pr-1',
        runs: [{ run_id: 'run-fail', agent_id: 'agent-1', agent_name: 'General' }],
      })),
      listRuns: vi.fn(async () => [
        run({ run_id: 'run-fail', status: 'failed', error: 'missing API key' }),
      ]),
    });

    const svc = new ReviewsService({
      api,
      config: { pollIntervalMs: 2_000, runTimeoutMs: 120_000 },
      sleep: async () => undefined,
      now: () => 0,
    });

    const result = await svc.runAndWait({
      repo_id: 'repo-1',
      pr_number: 482,
      agent_id: 'agent-1',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.payload.status).toBe('failed');
    expect(result.payload.message).toContain('missing API key');
  });
});
