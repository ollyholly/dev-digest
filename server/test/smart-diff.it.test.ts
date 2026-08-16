/**
 * Smart Diff HTTP — GET /pulls/:id/smart-diff.
 * Groups files by role (core first, lockfile in boilerplate), overlays
 * seed-style findings (run_id null), and never calls an LLM.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startPg, dockerAvailable, type PgFixture } from './helpers/pg.js';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/platform/config.js';
import { seed } from '../src/db/seed.js';
import { MockLLMProvider } from '../src/adapters/mocks.js';
import * as t from '../src/db/schema.js';
import type { SmartDiff } from '@devdigest/shared';

const hasDocker = await dockerAvailable();
const d = hasDocker ? describe : describe.skip;

const config = () => loadConfig({ ...process.env, NODE_ENV: 'test' } as NodeJS.ProcessEnv);

let repoSeq = 0;
async function setupRepoAndPr(db: PgFixture['handle']['db'], workspaceId: string) {
  const name = `smart-diff-${repoSeq++}`;
  const [repo] = await db
    .insert(t.repos)
    .values({ workspaceId, owner: 'acme', name, fullName: `acme/${name}` })
    .returning();
  const [pr] = await db
    .insert(t.pullRequests)
    .values({
      workspaceId,
      repoId: repo!.id,
      number: 9,
      title: 'Add rate limiting',
      author: 'marisa.koch',
      branch: 'feat/rl',
      base: 'main',
      headSha: 'deadbeef',
      additions: 85,
      deletions: 24,
      filesCount: 2,
      status: 'open',
    })
    .returning();
  await db.insert(t.prFiles).values([
    { prId: pr!.id, path: 'src/middleware/ratelimit.ts', additions: 84, deletions: 0 },
    { prId: pr!.id, path: 'package-lock.json', additions: 1, deletions: 24 },
  ]);
  return { repo: repo!, pr: pr! };
}

d('smart-diff routes (Testcontainers pg)', () => {
  let pg: PgFixture;
  let workspaceId: string;

  beforeAll(async () => {
    pg = await startPg();
    await seed(pg.handle.db);
    const [ws] = await pg.handle.db.select().from(t.workspaces);
    workspaceId = ws!.id;
  });
  afterAll(async () => {
    await pg?.stop();
  });

  it('GET groups core first and lockfile under boilerplate, without calling the LLM', async () => {
    const llm = new MockLLMProvider('openai');
    const app = await buildApp({
      config: config(),
      db: pg.handle.db,
      overrides: { llm: { openai: llm } },
    });
    const { pr } = await setupRepoAndPr(pg.handle.db, workspaceId);

    const res = await app.inject({ method: 'GET', url: `/pulls/${pr.id}/smart-diff` });
    expect(res.statusCode).toBe(200);
    const body = res.json() as SmartDiff;
    expect(body.groups.map((g) => g.role)).toEqual(['core', 'boilerplate']);
    expect(body.groups[0]!.files[0]!.path).toBe('src/middleware/ratelimit.ts');
    const boilerplate = body.groups.find((g) => g.role === 'boilerplate');
    expect(boilerplate?.files.map((f) => f.path)).toEqual(['package-lock.json']);
    expect(llm.calls.length).toBe(0);
    await app.close();
  });

  it('overlays findings from a seed-style review (run_id null)', async () => {
    const llm = new MockLLMProvider('openai');
    const app = await buildApp({
      config: config(),
      db: pg.handle.db,
      overrides: { llm: { openai: llm } },
    });
    const { pr } = await setupRepoAndPr(pg.handle.db, workspaceId);

    const [review] = await pg.handle.db
      .insert(t.reviews)
      .values({
        workspaceId,
        prId: pr.id,
        kind: 'review',
        runId: null,
        verdict: 'request_changes',
        summary: 'seed',
        score: 50,
        model: 'seed',
      })
      .returning();
    const [inserted] = await pg.handle.db
      .insert(t.findings)
      .values({
        reviewId: review!.id,
        file: 'src/middleware/ratelimit.ts',
        startLine: 10,
        endLine: 12,
        severity: 'CRITICAL',
        category: 'security',
        title: 'Unbounded bucket',
        rationale: 'No cap on tokens.',
        suggestion: 'Cap the bucket size.',
        confidence: 0.9,
      })
      .returning();

    const res = await app.inject({ method: 'GET', url: `/pulls/${pr.id}/smart-diff` });
    expect(res.statusCode).toBe(200);
    const body = res.json() as SmartDiff;
    const coreFile = body.groups.find((g) => g.role === 'core')?.files[0];
    expect(coreFile?.finding_lines).toEqual([10]);
    expect(coreFile?.findings).toEqual([
      {
        id: inserted!.id,
        start_line: 10,
        end_line: 12,
        severity: 'CRITICAL',
        title: 'Unbounded bucket',
      },
    ]);
    expect(llm.calls.length).toBe(0);
    await app.close();
  });
});
