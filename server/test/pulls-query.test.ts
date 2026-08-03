import { describe, it, expect } from 'vitest';
import type { PrMeta } from '@devdigest/shared';
import { filterPulls, sortPulls } from '../src/modules/pulls/query.js';

function pr(partial: Partial<PrMeta> & { number: number; author: string }): PrMeta {
  return {
    title: 't',
    branch: 'b',
    base: 'main',
    head_sha: 'abc',
    additions: 1,
    deletions: 1,
    files_count: 1,
    status: 'needs_review',
    score: null,
    cost_usd: null,
    ...partial,
  };
}

describe('filterPulls', () => {
  it('matches author exactly (case-sensitive)', () => {
    const rows = [pr({ number: 1, author: 'marisa.koch' }), pr({ number: 2, author: 'Marisa.Koch' })];
    expect(filterPulls(rows, { author: 'marisa.koch' }).map((p) => p.number)).toEqual([1]);
  });
});

describe('sortPulls', () => {
  it('treats null score as 0', () => {
    const rows = [
      pr({ number: 1, author: 'a', score: null }),
      pr({ number: 2, author: 'b', score: 90 }),
      pr({ number: 3, author: 'c', score: 10 }),
    ];
    sortPulls(rows, 'score');
    expect(rows.map((p) => p.number)).toEqual([2, 3, 1]);
  });
});
