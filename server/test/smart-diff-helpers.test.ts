import { describe, expect, it } from 'vitest';
import type { SmartDiffFindingInput } from '@devdigest/reviewer-core';
import type { RunHeadSha } from '../src/modules/reviews/repository/run.repo.js';
import { selectWaveFindings, type WaveReview } from '../src/modules/smart-diff/helpers.js';

const HEAD = 'abc123';
const OLD_SHA = 'old999';

function finding(
  over: Partial<SmartDiffFindingInput> & Pick<SmartDiffFindingInput, 'id' | 'title'>,
): SmartDiffFindingInput {
  return {
    file: 'src/core.ts',
    start_line: 10,
    end_line: 12,
    severity: 'CRITICAL',
    ...over,
  };
}

function review(runId: string | null, findings: SmartDiffFindingInput[]): WaveReview {
  return { runId, findings };
}

function run(id: string, over: Partial<RunHeadSha> = {}): RunHeadSha {
  return { id, headSha: HEAD, status: 'done', ...over };
}

describe('selectWaveFindings', () => {
  it('overlays findings from completed runs matching the PR head SHA', () => {
    const waveFinding = finding({ id: 'wave-f', title: 'wave finding' });
    const seedFinding = finding({ id: 'seed-f', title: 'seed finding' });
    const result = selectWaveFindings({
      pullHeadSha: HEAD,
      reviews: [review('run-wave', [waveFinding]), review(null, [seedFinding])],
      runs: [run('run-wave')],
    });
    expect(result).toEqual([
      {
        id: 'wave-f',
        file: 'src/core.ts',
        start_line: 10,
        end_line: 12,
        severity: 'CRITICAL',
        title: 'wave finding',
      },
    ]);
  });

  it('does not overlay stale-SHA findings when a matching wave exists', () => {
    const waveFinding = finding({ id: 'wave-f', title: 'current' });
    const staleFinding = finding({ id: 'stale-f', title: 'stale' });
    const result = selectWaveFindings({
      pullHeadSha: HEAD,
      reviews: [review('run-wave', [waveFinding]), review('run-stale', [staleFinding])],
      runs: [run('run-wave'), run('run-stale', { headSha: OLD_SHA })],
    });
    expect(result.map((f) => f.id)).toEqual(['wave-f']);
  });

  it('falls back to seed/legacy reviews (runId == null) when no matching wave exists', () => {
    const seedFinding = finding({ id: 'seed-f', title: 'seed' });
    const staleFinding = finding({ id: 'stale-f', title: 'stale' });
    const result = selectWaveFindings({
      pullHeadSha: HEAD,
      reviews: [review(null, [seedFinding]), review('run-stale', [staleFinding])],
      runs: [run('run-stale', { headSha: OLD_SHA })],
    });
    expect(result.map((f) => f.id)).toEqual(['seed-f']);
  });

  it('returns [] when there is no matching wave and no seed reviews', () => {
    const result = selectWaveFindings({
      pullHeadSha: HEAD,
      reviews: [review('run-stale', [finding({ id: 'stale-f', title: 'stale' })])],
      runs: [run('run-stale', { headSha: OLD_SHA })],
    });
    expect(result).toEqual([]);
  });

  it('does not treat running or failed matching-SHA runs as a wave', () => {
    const seedFinding = finding({ id: 'seed-f', title: 'seed' });
    const result = selectWaveFindings({
      pullHeadSha: HEAD,
      reviews: [
        review(null, [seedFinding]),
        review('run-running', [finding({ id: 'run-f', title: 'in flight' })]),
      ],
      runs: [run('run-running', { status: 'running' })],
    });
    expect(result.map((f) => f.id)).toEqual(['seed-f']);
  });

  it('returns [] for a matching wave even if those reviews have no findings (no seed mix-in)', () => {
    const result = selectWaveFindings({
      pullHeadSha: HEAD,
      reviews: [review('run-wave', []), review(null, [finding({ id: 'seed-f', title: 'seed' })])],
      runs: [run('run-wave')],
    });
    expect(result).toEqual([]);
  });
});
