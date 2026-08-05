import { describe, expect, it } from 'vitest';
import type { ConventionCandidate } from '@devdigest/shared';
import {
  buildCategoryDrafts,
  buildMergedDraft,
} from '../src/modules/conventions/skill-body.js';

const accepted: ConventionCandidate[] = [
  {
    id: 'c1',
    repo_id: 'r1',
    category: 'error-handling',
    rule: 'Throw typed application errors at service boundaries.',
    evidence_path: 'src/errors.ts',
    evidence_snippet: 'throw new ValidationError(message);',
    evidence_start_line: 8,
    evidence_end_line: 8,
    confidence: 0.91,
    status: 'accepted',
    accepted: true,
    scanned_sha: 'abc123',
    fingerprint: 'fp1',
    created_at: '2026-08-05T00:00:00.000Z',
  },
  {
    id: 'c2',
    repo_id: 'r1',
    category: 'imports',
    rule: 'Use explicit type-only imports for shared contracts.',
    evidence_path: 'src/service.ts',
    evidence_snippet: "import type { Repo } from '@devdigest/shared';",
    evidence_start_line: 1,
    evidence_end_line: 1,
    confidence: 0.84,
    status: 'accepted',
    accepted: true,
    scanned_sha: 'abc123',
    fingerprint: 'fp2',
    created_at: '2026-08-05T00:00:00.000Z',
  },
];

describe('conventions skill body', () => {
  it('builds a merged markdown skill with grounded rules and evidence files', () => {
    const draft = buildMergedDraft(accepted, 'acme/payments-api');

    expect(draft).toMatchObject({
      name: 'acme/payments-api conventions',
      type: 'convention',
      accepted_count: 2,
      category: null,
      evidence_files: ['src/errors.ts', 'src/service.ts'],
    });
    expect(draft.body).toContain('# acme/payments-api conventions');
    expect(draft.body).toContain('House conventions for `acme/payments-api`.');
    expect(draft.body).toContain('## error-handling');
    expect(draft.body).toContain('Detected in `src/errors.ts:8-8`:');
    expect(draft.body).toContain('```ts\nthrow new ValidationError(message);\n```');
    expect(draft.body).toContain('## imports');
  });

  it('splits category drafts without leaking rules across categories', () => {
    const drafts = buildCategoryDrafts(accepted, 'acme/payments-api');

    expect(drafts.map((draft) => draft.category)).toEqual(['error-handling', 'imports']);
    expect(drafts[0]).toMatchObject({
      accepted_count: 1,
      evidence_files: ['src/errors.ts'],
    });
    expect(drafts[0]!.body).toContain('typed application errors');
    expect(drafts[0]!.body).not.toContain('type-only imports');
    expect(drafts[1]!.body).toContain('type-only imports');
    expect(drafts[1]!.body).not.toContain('typed application errors');
  });

  it('uses a longer markdown fence when evidence contains backticks', () => {
    const withFence = [
      {
        ...accepted[0]!,
        evidence_snippet: 'const example = ```value```;',
      },
    ];
    const draft = buildMergedDraft(withFence, 'repo');
    expect(draft.body).toContain('````ts\nconst example = ```value```;\n````');
  });
});
