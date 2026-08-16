import { describe, expect, it } from 'vitest';
import {
  selectWaveFindings,
  type WaveFinding,
  type WaveReview,
  type WaveRun,
} from '../src/modules/smart-diff/helpers.js';

const HEAD = 'abc123';
const OLD_SHA = 'old999';

function finding(over: Partial<WaveFinding> & Pick<WaveFinding, 'id' | 'title'>): WaveFinding {
  return {
    file: 'src/core.ts',
    startLine: 10,
    endLine: 12,
    severity: 'CRITICAL',
    ...over,
  };
}

function review(
  id: string,
  runId: string | null,
  findings: WaveFinding[],
): WaveReview {
  return { id, runId, findings };
}

function run(id: string, over: Partial<WaveRun> = {}): WaveRun {
  return { id, headSha: HEAD, status: 'done', ...over };
}

describe('selectWaveFindings', () => {
  it('overlays findings from completed runs matching the PR head SHA', () => {
    const waveFinding = finding({ id: 'wave-f', title: 'wave finding' });
    const seedFinding = finding({ id: 'seed-f', title: 'seed finding' });
    const result = selectWaveFindings({
      pullHeadSha: HEAD,
      reviews: [
        review('r-wave', 'run-wave', [waveFinding]),
        review('r-seed', null, [seedFinding]),
      ],
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
      reviews: [
        review('r-wave', 'run-wave', [waveFinding]),
        review('r-stale', 'run-stale', [staleFinding]),
      ],
      runs: [run('run-wave'), run('run-stale', { headSha: OLD_SHA })],
    });
    expect(result.map((f) => f.id)).toEqual(['wave-f']);
  });

  it('falls back to seed/legacy reviews (runId == null) when no matching wave exists', () => {
    const seedFinding = finding({ id: 'seed-f', title: 'seed' });
    const staleFinding = finding({ id: 'stale-f', title: 'stale' });
    const result = selectWaveFindings({
      pullHeadSha: HEAD,
      reviews: [
        review('r-seed', null, [seedFinding]),
        review('r-stale', 'run-stale', [staleFinding]),
      ],
      runs: [run('run-stale', { headSha: OLD_SHA })],
    });
    expect(result.map((f) => f.id)).toEqual(['seed-f']);
  });

  it('returns [] when there is no matching wave and no seed reviews', () => {
    const result = selectWaveFindings({
      pullHeadSha: HEAD,
      reviews: [review('r-stale', 'run-stale', [finding({ id: 'stale-f', title: 'stale' })])],
      runs: [run('run-stale', { headSha: OLD_SHA })],
    });
    expect(result).toEqual([]);
  });

  it('does not treat running or failed matching-SHA runs as a wave', () => {
    const seedFinding = finding({ id: 'seed-f', title: 'seed' });
    const result = selectWaveFindings({
      pullHeadSha: HEAD,
      reviews: [
        review('r-seed', null, [seedFinding]),
        review('r-running', 'run-running', [finding({ id: 'run-f', title: 'in flight' })]),
      ],
      runs: [run('run-running', { status: 'running' })],
    });
    expect(result.map((f) => f.id)).toEqual(['seed-f']);
  });

  it('returns [] for a matching wave even if those reviews have no findings (no seed mix-in)', () => {
    const result = selectWaveFindings({
      pullHeadSha: HEAD,
      reviews: [
        review('r-wave', 'run-wave', []),
        review('r-seed', null, [finding({ id: 'seed-f', title: 'seed' })]),
      ],
      runs: [run('run-wave')],
    });
    expect(result).toEqual([]);
  });
});
