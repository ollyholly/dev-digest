import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { startPg, dockerAvailable, type PgFixture } from './helpers/pg.js';
import { waitForPrRuns } from './helpers/runs.js';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/platform/config.js';
import { seed } from '../src/db/seed.js';
import { MockLLMProvider, MockGitClient } from '../src/adapters/mocks.js';
import * as t from '../src/db/schema.js';
import type { Review } from '@devdigest/shared';

const hasDocker = await dockerAvailable();
const d = hasDocker ? describe : describe.skip;

const DIFF = `diff --git a/src/config.ts b/src/config.ts
--- a/src/config.ts
+++ b/src/config.ts
@@ -10,3 +10,4 @@
   port: 3000,
+  stripeKey: "sk_live_xxx",
   redisUrl: x,`;

const EMPTY_REVIEW: Review = { verdict: 'approve', summary: 'nothing to report', score: 100, findings: [] };

/**
 * Proves the run-executor wiring added for the Skills feature: an agent's
 * ENABLED linked skills (in `order`) are resolved into `## Skills / rules` in
 * the assembled prompt, a disabled linked skill is excluded, and an agent
 * with zero enabled skills produces the pre-Skills prompt shape unchanged.
 */
d('Skills wired into the review prompt', () => {
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

  function appWith() {
    return buildApp({
      config: loadConfig({ ...process.env, NODE_ENV: 'test' } as NodeJS.ProcessEnv),
      db: pg.handle.db,
      overrides: {
        git: new MockGitClient({ diff: DIFF }),
        llm: { openai: new MockLLMProvider('openai', { structured: EMPTY_REVIEW }) },
      },
    });
  }

  let repoSeq = 0;
  async function setupRepoAndPr() {
    const name = `skills-fixture-${repoSeq++}`;
    const [repo] = await pg.handle.db
      .insert(t.repos)
      .values({ workspaceId, owner: 'acme', name, fullName: `acme/${name}` })
      .returning();
    const [pr] = await pg.handle.db
      .insert(t.pullRequests)
      .values({
        workspaceId,
        repoId: repo!.id,
        number: 1,
        title: 'Test PR',
        author: 'a',
        branch: 'feat/x',
        base: 'main',
        headSha: 'a1b2c3d4',
        additions: 1,
        deletions: 0,
        filesCount: 1,
        status: 'needs_review',
        body: '',
      })
      .returning();
    await pg.handle.db.insert(t.prFiles).values({
      prId: pr!.id,
      path: 'src/config.ts',
      additions: 1,
      deletions: 0,
      patch: '@@ -10,3 +10,4 @@\n   port: 3000,\n+  stripeKey: "sk_live_xxx",\n   redisUrl: x,',
    });
    return { repo: repo!, pr: pr! };
  }

  async function runAndGetTrace(app: Awaited<ReturnType<typeof appWith>>, prId: string, agentId: string) {
    const started = await app.inject({ method: 'POST', url: `/pulls/${prId}/review`, payload: { agentId } });
    expect(started.statusCode).toBe(200);
    const runId = started.json().runs[0].run_id;
    await waitForPrRuns(pg.handle.db, prId, { expected: 1 });
    const trace = (await app.inject({ method: 'GET', url: `/runs/${runId}/trace` })).json();
    return trace;
  }

  it('an agent with no linked skills omits the Skills section entirely', async () => {
    const app = await appWith();
    const { pr } = await setupRepoAndPr();
    const agent = (
      await app.inject({
        method: 'POST',
        url: '/agents',
        payload: { name: 'No Skills', provider: 'openai', model: 'gpt-4.1', system_prompt: 'Review.' },
      })
    ).json();

    const trace = await runAndGetTrace(app, pr.id, agent.id);
    expect(trace.prompt_assembly.skills).toBeNull();
    expect(trace.prompt_assembly.user).not.toContain('## Skills / rules');
    await app.close();
  });

  it('an enabled linked skill appears in the assembled prompt, in order', async () => {
    const app = await appWith();
    const { pr } = await setupRepoAndPr();
    const agent = (
      await app.inject({
        method: 'POST',
        url: '/agents',
        payload: { name: 'With Skills', provider: 'openai', model: 'gpt-4.1', system_prompt: 'Review.' },
      })
    ).json();

    const skillA = (
      await app.inject({
        method: 'POST',
        url: '/skills',
        payload: { name: 'skill-a', type: 'rubric', body: '# Skill A\nCheck A things.' },
      })
    ).json();
    const skillB = (
      await app.inject({
        method: 'POST',
        url: '/skills',
        payload: { name: 'skill-b', type: 'rubric', body: '# Skill B\nCheck B things.' },
      })
    ).json();

    await app.inject({
      method: 'POST',
      url: `/agents/${agent.id}/skills`,
      payload: { skill_ids: [skillB.id, skillA.id] },
    });

    const trace = await runAndGetTrace(app, pr.id, agent.id);
    expect(trace.prompt_assembly.skills).toContain('Skill A');
    expect(trace.prompt_assembly.skills).toContain('Skill B');
    // order preserved: B was linked first (order 0), A second (order 1)
    expect(trace.prompt_assembly.skills.indexOf('Skill B')).toBeLessThan(
      trace.prompt_assembly.skills.indexOf('Skill A'),
    );
    expect(trace.prompt_assembly.user).toContain('## Skills / rules');
    await app.close();
  });

  it('a disabled linked skill is excluded from the assembled prompt', async () => {
    const app = await appWith();
    const { pr } = await setupRepoAndPr();
    const agent = (
      await app.inject({
        method: 'POST',
        url: '/agents',
        payload: { name: 'Disabled Skill Agent', provider: 'openai', model: 'gpt-4.1', system_prompt: 'Review.' },
      })
    ).json();

    const enabledSkill = (
      await app.inject({
        method: 'POST',
        url: '/skills',
        payload: { name: 'enabled-skill', type: 'rubric', body: '# Enabled Skill\nAlways on.' },
      })
    ).json();
    // imported-from-URL skills are created disabled by default (see skills.it.test.ts)
    const disabledSkill = (
      await app.inject({
        method: 'POST',
        url: '/skills',
        payload: { name: 'disabled-skill', type: 'rubric', body: '# Disabled Skill\nShould not appear.' },
      })
    ).json();
    await app.inject({ method: 'PUT', url: `/skills/${disabledSkill.id}`, payload: { enabled: false } });

    await app.inject({
      method: 'POST',
      url: `/agents/${agent.id}/skills`,
      payload: { skill_ids: [enabledSkill.id, disabledSkill.id] },
    });

    const trace = await runAndGetTrace(app, pr.id, agent.id);
    expect(trace.prompt_assembly.skills).toContain('Enabled Skill');
    expect(trace.prompt_assembly.skills).not.toContain('Disabled Skill');
    await app.close();
  });
});
