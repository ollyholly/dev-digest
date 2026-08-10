import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildApp } from '../src/app.js';
import { MockGitClient, MockLLMProvider } from '../src/adapters/mocks.js';
import { seed } from '../src/db/seed.js';
import { RepoRepository } from '../src/modules/repos/repository.js';
import type { RepoIntel } from '../src/modules/repo-intel/types.js';
import { loadConfig } from '../src/platform/config.js';
import { dockerAvailable, startPg, type PgFixture } from './helpers/pg.js';

const hasDocker = await dockerAvailable();
const d = hasDocker ? describe : describe.skip;

if (!hasDocker) {
  console.warn('[conventions] Docker not available — skipping integration tests.');
}

d('Conventions module', () => {
  let pg: PgFixture;
  let clonePath: string;
  let repoId: string;

  const configContent = [
    '{',
    '  "rules": {',
    '    "semi": ["error", "always"]',
    '  }',
    '}',
  ].join('\n');
  const sourceContent = [
    "import type { Repo } from '@devdigest/shared';",
    '',
    'export function repoName(repo: Repo): string {',
    '  return repo.full_name;',
    '}',
  ].join('\n');

  const llm = new MockLLMProvider('openai', {
    structuredBySchema: {
      ConventionExtraction: {
        candidates: [
          {
            category: 'formatting',
            rule: 'Terminate statements with semicolons.',
            evidence_path: '.eslintrc.json',
            evidence_snippet: '"semi": ["error", "always"]',
            evidence_start_line: 100,
            evidence_end_line: 100,
            confidence: 0.91,
            supporting_count: 8,
          },
          {
            category: 'imports',
            rule: 'Use type-only imports for shared contracts.',
            evidence_path: 'src/service.ts',
            evidence_snippet: "import type { Repo } from '@devdigest/shared';",
            evidence_start_line: 100,
            evidence_end_line: 100,
            confidence: 0.84,
          },
          {
            category: 'security',
            rule: 'Read secrets from neighboring repositories.',
            evidence_path: '../outside.ts',
            evidence_snippet: 'export const secret = true;',
            evidence_start_line: 1,
            evidence_end_line: 1,
            confidence: 0.99,
          },
        ],
      },
    },
  });

  beforeAll(async () => {
    pg = await startPg();
    await seed(pg.handle.db);
    clonePath = await mkdtemp(join(tmpdir(), 'conventions-it-'));
    await mkdir(join(clonePath, 'src'));
    await Promise.all([
      writeFile(join(clonePath, '.eslintrc.json'), configContent),
      writeFile(join(clonePath, 'src/service.ts'), sourceContent),
    ]);

    const repos = new RepoRepository(pg.handle.db);
    const [repo] = await repos.list((await pg.handle.db.query.workspaces.findFirst())!.id);
    repoId = repo!.id;
    await repos.updateClonePath(repoId, clonePath);
  });

  afterAll(async () => {
    await Promise.all([
      pg?.stop(),
      clonePath ? rm(clonePath, { recursive: true, force: true }) : Promise.resolve(),
    ]);
  });

  it('extracts, curates, drafts, promotes, and merge-links grounded conventions', async () => {
    const repoIntel = {
      getConventionSamples: async () => ['src/service.ts'],
    } as unknown as RepoIntel;
    const git = new MockGitClient({
      files: {
        '.eslintrc.json': configContent,
        'src/service.ts': sourceContent,
      },
      head: 'fixture-sha',
    });
    const config = loadConfig({ ...process.env, NODE_ENV: 'test' } as NodeJS.ProcessEnv);
    const app = await buildApp({
      config,
      db: pg.handle.db,
      overrides: {
        git,
        repoIntel,
        llm: { openrouter: llm },
      },
    });

    try {
      const extract = await app.inject({
        method: 'POST',
        url: `/repos/${repoId}/conventions/extract`,
      });
      expect(extract.statusCode).toBe(200);
      expect(extract.json()).toMatchObject({
        scanned_sha: 'fixture-sha',
        sampled_files: ['.eslintrc.json', 'src/service.ts'],
        considered_files: 2,
        proposed: 3,
        verified: 2,
        dropped: 1,
        model: {
          provider: 'openrouter',
          model: 'deepseek/deepseek-v4-flash',
        },
      });

      const candidates = extract.json().candidates as Array<{
        id: string;
        rule: string;
        status: string;
        evidence_start_line: number;
      }>;
      expect(candidates).toHaveLength(2);
      expect(candidates.every((candidate) => candidate.status === 'pending')).toBe(true);
      expect(candidates.map((candidate) => candidate.evidence_start_line)).toEqual([3, 1]);

      const listed = await app.inject({
        method: 'GET',
        url: `/repos/${repoId}/conventions`,
      });
      expect(listed.statusCode).toBe(200);
      expect(listed.json()).toMatchObject({
        scanned_sha: 'fixture-sha',
        candidates: expect.any(Array),
        proposed: 2,
        verified: 2,
        dropped: 0,
        model: null,
      });
      expect(listed.json().candidates).toHaveLength(2);

      const formatting = candidates.find((candidate) => candidate.rule.includes('semicolons'))!;
      const imports = candidates.find((candidate) => candidate.rule.includes('type-only'))!;
      expect(
        (
          await app.inject({
            method: 'PATCH',
            url: `/conventions/${formatting.id}`,
            payload: { status: 'accepted', rule: 'Always terminate statements with semicolons.' },
          })
        ).statusCode,
      ).toBe(200);
      expect(
        (
          await app.inject({
            method: 'PATCH',
            url: `/conventions/${imports.id}`,
            payload: { status: 'rejected' },
          })
        ).statusCode,
      ).toBe(200);

      const rescan = await app.inject({
        method: 'POST',
        url: `/repos/${repoId}/conventions/extract`,
      });
      expect(rescan.statusCode).toBe(200);
      const rescanned = rescan.json().candidates as Array<{
        rule: string;
        status: string;
      }>;
      expect(rescanned).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule: 'Always terminate statements with semicolons.',
            status: 'accepted',
          }),
          expect.objectContaining({ status: 'rejected' }),
        ]),
      );

      const draftResponse = await app.inject({
        method: 'GET',
        url: `/repos/${repoId}/conventions/skill-draft?mode=merged`,
      });
      expect(draftResponse.statusCode).toBe(200);
      const draft = draftResponse.json().drafts[0];
      expect(draft.accepted_count).toBe(1);
      expect(draft.body).toContain('Always terminate statements with semicolons.');
      expect(draft.body).not.toContain('type-only imports');

      const existingSkill = (
        await app.inject({
          method: 'POST',
          url: '/skills',
          payload: {
            name: 'Existing linked skill',
            type: 'custom',
            body: '# Existing\nKeep this link.',
          },
        })
      ).json();
      const agent = (
        await app.inject({
          method: 'POST',
          url: '/agents',
          payload: {
            name: 'Convention reviewer',
            provider: 'openai',
            model: 'gpt-4o-mini',
            system_prompt: 'Review against linked conventions.',
          },
        })
      ).json();
      await app.inject({
        method: 'POST',
        url: `/agents/${agent.id}/skills`,
        payload: { skill_ids: [existingSkill.id] },
      });

      const promote = await app.inject({
        method: 'POST',
        url: `/repos/${repoId}/conventions/promote`,
        payload: {
          mode: 'merged',
          agent_id: agent.id,
          drafts: [
            {
              name: 'Payments API conventions',
              description: 'Curated repository conventions.',
              body: `${draft.body}\n\nReview these rules consistently.`,
              enabled: true,
              category: null,
            },
          ],
        },
      });
      expect(promote.statusCode).toBe(201);
      const [skill] = promote.json().skills;
      expect(skill).toMatchObject({
        name: 'Payments API conventions',
        source: 'extracted',
        type: 'convention',
        enabled: true,
        evidence_files: ['.eslintrc.json'],
      });

      const links = (
        await app.inject({ method: 'GET', url: `/agents/${agent.id}/skills` })
      ).json();
      expect(links.map((link: { skill_id: string }) => link.skill_id)).toEqual([
        existingSkill.id,
        skill.id,
      ]);
    } finally {
      await app.close();
    }
  });
});
