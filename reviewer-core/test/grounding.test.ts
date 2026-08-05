import { describe, it, expect } from 'vitest';
import type { DiffHunk, Finding, UnifiedDiff } from '@devdigest/shared';
import { buildLineIndex, groundFindings, groundingSummary } from '../src/grounding.js';

/**
 * grounding.ts is the mandatory mechanical gate for diff-findings: it is what
 * turns a model's self-reported "I found a bug on line 42" into something we
 * can actually trust, by checking the line is really part of a changed hunk.
 * These tests pin both the line-intersection logic and the full-file-kind
 * exemption (secret_leak / lethal_trifecta / phantom / hook).
 */

function hunk(overrides: Partial<DiffHunk> = {}): DiffHunk {
  return {
    file: 'src/x.ts',
    oldStart: 1,
    oldLines: 0,
    newStart: 10,
    newLines: 3,
    newLineNumbers: [10, 11, 12],
    ...overrides,
  };
}

function diff(files: UnifiedDiff['files']): UnifiedDiff {
  return { raw: '', files };
}

function finding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: 'f1',
    severity: 'CRITICAL',
    category: 'security',
    title: 'a finding',
    file: 'src/x.ts',
    start_line: 11,
    end_line: 11,
    rationale: 'because',
    confidence: 0.9,
    ...overrides,
  };
}

describe('buildLineIndex', () => {
  it('indexes every line listed in a hunk\'s newLineNumbers', () => {
    const d = diff([{ path: 'src/x.ts', additions: 3, deletions: 0, hunks: [hunk()] }]);
    const idx = buildLineIndex(d);
    expect(idx.get('src/x.ts')).toEqual(new Set([10, 11, 12]));
  });

  it("falls back to the hunk's declared new range when newLineNumbers is empty", () => {
    const d = diff([
      {
        path: 'src/x.ts',
        additions: 3,
        deletions: 0,
        hunks: [hunk({ newLineNumbers: [], newStart: 20, newLines: 3 })],
      },
    ]);
    const idx = buildLineIndex(d);
    expect(idx.get('src/x.ts')).toEqual(new Set([20, 21, 22]));
  });

  it('treats a zero-line hunk (pure deletion) as covering exactly newStart', () => {
    const d = diff([
      {
        path: 'src/x.ts',
        additions: 0,
        deletions: 5,
        hunks: [hunk({ newLineNumbers: [], newStart: 7, newLines: 0 })],
      },
    ]);
    const idx = buildLineIndex(d);
    expect(idx.get('src/x.ts')).toEqual(new Set([7]));
  });

  it('keeps separate line sets per file', () => {
    const d = diff([
      { path: 'a.ts', additions: 1, deletions: 0, hunks: [hunk({ file: 'a.ts', newLineNumbers: [1] })] },
      { path: 'b.ts', additions: 1, deletions: 0, hunks: [hunk({ file: 'b.ts', newLineNumbers: [99] })] },
    ]);
    const idx = buildLineIndex(d);
    expect(idx.get('a.ts')).toEqual(new Set([1]));
    expect(idx.get('b.ts')).toEqual(new Set([99]));
  });
});

describe('groundFindings', () => {
  const baseDiff = diff([{ path: 'src/x.ts', additions: 3, deletions: 0, hunks: [hunk()] }]);

  it('keeps a finding whose range intersects a real hunk', () => {
    const { kept, dropped } = groundFindings([finding({ start_line: 11, end_line: 11 })], baseDiff);
    expect(kept).toHaveLength(1);
    expect(dropped).toHaveLength(0);
  });

  it('keeps a finding whose range partially overlaps a hunk', () => {
    const { kept } = groundFindings([finding({ start_line: 5, end_line: 10 })], baseDiff);
    expect(kept).toHaveLength(1);
  });

  it('drops a finding on a line not covered by any hunk (hallucinated location)', () => {
    const { kept, dropped } = groundFindings([finding({ start_line: 999, end_line: 999 })], baseDiff);
    expect(kept).toHaveLength(0);
    expect(dropped).toHaveLength(1);
    expect(dropped[0]!.reason).toMatch(/do not intersect/);
  });

  it("drops a finding whose file isn't part of the diff at all", () => {
    const { kept, dropped } = groundFindings(
      [finding({ file: 'src/unrelated.ts', start_line: 11, end_line: 11 })],
      baseDiff,
    );
    expect(kept).toHaveLength(0);
    expect(dropped[0]!.reason).toMatch(/not present in diff/);
  });

  it('handles a reversed range (end_line < start_line) via min/max normalization', () => {
    const { kept } = groundFindings([finding({ start_line: 12, end_line: 10 })], baseDiff);
    expect(kept).toHaveLength(1);
  });

  it.each(['secret_leak', 'lethal_trifecta', 'phantom', 'hook'] as const)(
    "exempts full-file kind '%s' from line-intersection, requiring only the file to be present",
    (kind) => {
      const { kept, dropped } = groundFindings(
        [finding({ kind, start_line: 999, end_line: 999 })],
        baseDiff,
      );
      expect(kept).toHaveLength(1);
      expect(dropped).toHaveLength(0);
    },
  );

  it('still drops a full-file-kind finding if its file is not in the diff', () => {
    const { kept, dropped } = groundFindings(
      [finding({ kind: 'secret_leak', file: 'src/unrelated.ts' })],
      baseDiff,
    );
    expect(kept).toHaveLength(0);
    expect(dropped).toHaveLength(1);
  });

  it('grounds a mixed batch independently per finding', () => {
    const { kept, dropped } = groundFindings(
      [
        finding({ id: 'good', start_line: 11, end_line: 11 }),
        finding({ id: 'bad', start_line: 999, end_line: 999 }),
      ],
      baseDiff,
    );
    expect(kept.map((f) => f.id)).toEqual(['good']);
    expect(dropped.map((d) => d.finding.id)).toEqual(['bad']);
  });
});

describe('groundingSummary', () => {
  it('formats kept/total as "kept/total passed"', () => {
    const result = groundFindings(
      [
        finding({ id: 'a', start_line: 11, end_line: 11 }),
        finding({ id: 'b', start_line: 999, end_line: 999 }),
      ],
      diff([{ path: 'src/x.ts', additions: 3, deletions: 0, hunks: [hunk()] }]),
    );
    expect(groundingSummary(result)).toBe('1/2 passed');
  });

  it('reports "0/0 passed" for an empty finding set', () => {
    expect(groundingSummary({ kept: [], dropped: [] })).toBe('0/0 passed');
  });
});
