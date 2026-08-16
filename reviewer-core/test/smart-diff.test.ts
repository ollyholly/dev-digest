import { describe, expect, it } from 'vitest';
import { buildSmartDiff } from '../src/smart-diff/build.js';
import { classifyFile } from '../src/smart-diff/classify.js';
import { TOO_BIG_CHANGED_LINES } from '../src/smart-diff/constants.js';

describe('classifyFile', () => {
  it('classifies lockfiles as boilerplate', () => {
    expect(classifyFile('package-lock.json')).toBe('boilerplate');
    expect(classifyFile('pnpm-lock.yaml')).toBe('boilerplate');
    expect(classifyFile('apps/web/yarn.lock')).toBe('boilerplate');
  });

  it('classifies package.json and generated trees as boilerplate', () => {
    expect(classifyFile('package.json')).toBe('boilerplate');
    expect(classifyFile('dist/index.js')).toBe('boilerplate');
    expect(classifyFile('src/__snapshots__/foo.ts.snap')).toBe('boilerplate');
    expect(classifyFile('src/gen/api.generated.ts')).toBe('boilerplate');
  });

  it('classifies index/config/bootstrap files as wiring', () => {
    expect(classifyFile('src/api/public/index.ts')).toBe('wiring');
    expect(classifyFile('src/config.ts')).toBe('wiring');
    expect(classifyFile('src/server.ts')).toBe('wiring');
    expect(classifyFile('docker-compose.yml')).toBe('wiring');
    expect(classifyFile('vite.config.ts')).toBe('wiring');
  });

  it('classifies business-logic paths as core', () => {
    expect(classifyFile('src/middleware/ratelimit.ts')).toBe('core');
    expect(classifyFile('src/api/public/webhooks.ts')).toBe('core');
    expect(classifyFile('src/vendor/shared/contracts/brief.ts')).toBe('core');
  });

  it('classifies a repo-root vendor tree as boilerplate', () => {
    expect(classifyFile('vendor/github.com/foo/bar.go')).toBe('boilerplate');
  });
});

describe('buildSmartDiff', () => {
  it('groups in core → wiring → boilerplate order and omits empty groups', () => {
    const diff = buildSmartDiff([
      { path: 'package-lock.json', additions: 92, deletions: 24 },
      { path: 'src/middleware/ratelimit.ts', additions: 84, deletions: 0 },
      { path: 'src/config.ts', additions: 4, deletions: 0 },
    ]);
    expect(diff.groups.map((g) => g.role)).toEqual(['core', 'wiring', 'boilerplate']);
    expect(diff.groups[0]!.files[0]!.path).toBe('src/middleware/ratelimit.ts');
    expect(diff.groups[2]!.files[0]!.path).toBe('package-lock.json');
    expect(diff.groups[0]!.files[0]!.pseudocode_summary).toBeNull();
  });

  it('attaches findings and sorts files with findings first', () => {
    const diff = buildSmartDiff(
      [
        { path: 'src/a.ts', additions: 10, deletions: 0 },
        { path: 'src/b.ts', additions: 80, deletions: 0 },
      ],
      [
        {
          id: 'f1',
          file: 'src/a.ts',
          start_line: 12,
          end_line: 14,
          severity: 'CRITICAL',
          title: 'secret',
        },
      ],
    );
    const core = diff.groups.find((g) => g.role === 'core')!;
    expect(core.files.map((f) => f.path)).toEqual(['src/a.ts', 'src/b.ts']);
    expect(core.files[0]!.finding_lines).toEqual([12]);
    expect(core.files[0]!.findings[0]!.severity).toBe('CRITICAL');
    expect(core.files[1]!.findings).toEqual([]);
  });

  it('leaves finding_lines empty when there are no findings', () => {
    const diff = buildSmartDiff([{ path: 'src/a.ts', additions: 1, deletions: 0 }]);
    expect(diff.groups[0]!.files[0]!.finding_lines).toEqual([]);
    expect(diff.split_suggestion.too_big).toBe(false);
  });

  it('sets too_big and proposed_splits at the changed-line threshold', () => {
    const diff = buildSmartDiff([
      { path: 'src/core.ts', additions: TOO_BIG_CHANGED_LINES, deletions: 0 },
      { path: 'src/index.ts', additions: 1, deletions: 0 },
    ]);
    expect(diff.split_suggestion.too_big).toBe(true);
    expect(diff.split_suggestion.total_lines).toBe(TOO_BIG_CHANGED_LINES + 1);
    expect(diff.split_suggestion.proposed_splits.map((s) => s.name)).toEqual([
      'Core logic',
      'Wiring',
    ]);
  });
});
