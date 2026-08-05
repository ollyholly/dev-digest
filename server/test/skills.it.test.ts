import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { startPg, dockerAvailable, type PgFixture } from './helpers/pg.js';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/platform/config.js';
import { seed } from '../src/db/seed.js';
import { MockGitClient, MockGitHubClient } from '../src/adapters/mocks.js';
import type { CommunitySkill } from '@devdigest/shared';
import type { CommunityCatalog } from '../src/adapters/community/types.js';

const hasDocker = await dockerAvailable();
const d = hasDocker ? describe : describe.skip;

if (!hasDocker) {
  // eslint-disable-next-line no-console
  console.warn('[skills] Docker not available — skipping integration tests.');
}

const FIXTURE_CATALOG: CommunitySkill[] = [
  { name: 'fixture-skill', repo: 'fixture-org/fixture-skill', stars: 1, lang: 'any', desc: 'A fixture skill' },
];

class FixtureCommunityCatalog implements CommunityCatalog {
  async search(query?: string): Promise<CommunitySkill[]> {
    if (!query) return FIXTURE_CATALOG;
    const q = query.toLowerCase();
    return FIXTURE_CATALOG.filter((s) => s.name.includes(q) || s.desc.toLowerCase().includes(q));
  }
}

/**
 * Skills CRUD + versions + import paths. Covers: create/update/delete, version
 * snapshots on body change (not on enabled toggle), URL/community import
 * always creating disabled skills, and the community search proxy.
 */
d('Skills module', () => {
  let pg: PgFixture;

  beforeAll(async () => {
    pg = await startPg();
    await seed(pg.handle.db);
  });
  afterAll(async () => {
    await pg?.stop();
  });

  function makeApp(fetchImpl?: typeof fetch) {
    const config = loadConfig({ ...process.env, NODE_ENV: 'test' } as NodeJS.ProcessEnv);
    if (fetchImpl) vi.stubGlobal('fetch', fetchImpl);
    return buildApp({
      config,
      db: pg.handle.db,
      overrides: {
        git: new MockGitClient(),
        github: new MockGitHubClient(),
        communityCatalog: new FixtureCommunityCatalog(),
      },
    });
  }

  const createBody = {
    name: 'pr-quality-rubric',
    description: 'Rubric for PR quality.',
    type: 'rubric' as const,
    body: '# PR Quality Rubric\nCheck correctness and tests.',
  };

  it('creates a manual skill, enabled by default, at version 1', async () => {
    const app = await makeApp();
    const res = await app.inject({ method: 'POST', url: '/skills', payload: createBody });
    expect(res.statusCode).toBe(201);
    const skill = res.json();
    expect(skill).toMatchObject({
      name: 'pr-quality-rubric',
      type: 'rubric',
      source: 'manual',
      enabled: true,
      version: 1,
    });
    await app.close();
  });

  it('derives the name from the first heading when none is supplied', async () => {
    const app = await makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/skills',
      payload: { type: 'custom', body: '# Derived Name\nSome body.' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().name).toBe('Derived Name');
    await app.close();
  });

  it('updating the body bumps the version and snapshots skill_versions', async () => {
    const app = await makeApp();
    const created = (await app.inject({ method: 'POST', url: '/skills', payload: createBody })).json();

    const updated = await app.inject({
      method: 'PUT',
      url: `/skills/${created.id}`,
      payload: { body: '# PR Quality Rubric\nUpdated body.' },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json().version).toBe(2);

    const versions = (
      await app.inject({ method: 'GET', url: `/skills/${created.id}/versions` })
    ).json();
    expect(versions.map((v: { version: number }) => v.version)).toEqual([2, 1]);
    expect(versions[0].body).toContain('Updated body');
    await app.close();
  });

  it('toggling enabled does NOT create a new version', async () => {
    const app = await makeApp();
    const created = (await app.inject({ method: 'POST', url: '/skills', payload: createBody })).json();

    await app.inject({ method: 'PUT', url: `/skills/${created.id}`, payload: { enabled: false } });

    const versions = (
      await app.inject({ method: 'GET', url: `/skills/${created.id}/versions` })
    ).json();
    expect(versions).toHaveLength(1);
    await app.close();
  });

  it('deletes a skill', async () => {
    const app = await makeApp();
    const created = (await app.inject({ method: 'POST', url: '/skills', payload: createBody })).json();

    const del = await app.inject({ method: 'DELETE', url: `/skills/${created.id}` });
    expect(del.statusCode).toBe(200);

    const get = await app.inject({ method: 'GET', url: `/skills/${created.id}` });
    expect(get.statusCode).toBe(404);
    await app.close();
  });

  it('404s for an unknown skill', async () => {
    const app = await makeApp();
    const ghost = '00000000-0000-0000-0000-000000000000';
    expect((await app.inject({ method: 'GET', url: `/skills/${ghost}` })).statusCode).toBe(404);
    expect((await app.inject({ method: 'PUT', url: `/skills/${ghost}`, payload: { enabled: false } })).statusCode).toBe(404);
    expect((await app.inject({ method: 'DELETE', url: `/skills/${ghost}` })).statusCode).toBe(404);
    expect((await app.inject({ method: 'GET', url: `/skills/${ghost}/versions` })).statusCode).toBe(404);
    expect((await app.inject({ method: 'GET', url: `/skills/${ghost}/agents` })).statusCode).toBe(404);
    await app.close();
  });

  it('imports from a URL and creates the skill DISABLED', async () => {
    const fetchImpl = vi.fn(async () => new Response('# Imported\nBody from URL.', { status: 200 }));
    const app = await makeApp(fetchImpl as unknown as typeof fetch);

    const res = await app.inject({
      method: 'POST',
      url: '/skills/import-url',
      payload: { url: 'https://raw.githubusercontent.com/some-org/some-repo/main/SKILL.md' },
    });
    expect(res.statusCode).toBe(201);
    const skill = res.json();
    expect(skill.source).toBe('imported_url');
    expect(skill.enabled).toBe(false);
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://raw.githubusercontent.com/some-org/some-repo/main/SKILL.md',
      { redirect: 'error' },
    );
    vi.unstubAllGlobals();
    await app.close();
  });

  it('surfaces a fetch failure from URL import as a 502', async () => {
    const fetchImpl = vi.fn(async () => new Response('not found', { status: 404 }));
    const app = await makeApp(fetchImpl as unknown as typeof fetch);

    const res = await app.inject({
      method: 'POST',
      url: '/skills/import-url',
      payload: { url: 'https://raw.githubusercontent.com/some-org/missing/main/SKILL.md' },
    });
    expect(res.statusCode).toBe(502);
    vi.unstubAllGlobals();
    await app.close();
  });

  it('rejects a non-allowlisted host as a validation error (SSRF guard)', async () => {
    const fetchImpl = vi.fn(async () => new Response('should never be reached', { status: 200 }));
    const app = await makeApp(fetchImpl as unknown as typeof fetch);

    const res = await app.inject({
      method: 'POST',
      url: '/skills/import-url',
      payload: { url: 'https://example.com/skills/security.md' },
    });
    expect(res.statusCode).toBe(422);
    expect(fetchImpl).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
    await app.close();
  });

  it('rejects an IP-literal URL outright (not an allowlisted hostname)', async () => {
    const fetchImpl = vi.fn(async () => new Response('should never be reached', { status: 200 }));
    const app = await makeApp(fetchImpl as unknown as typeof fetch);

    const res = await app.inject({
      method: 'POST',
      url: '/skills/import-url',
      payload: { url: 'https://127.0.0.1/SKILL.md' },
    });
    expect(res.statusCode).toBe(422);
    expect(fetchImpl).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
    await app.close();
  });

  it('searches the community catalog without persisting anything', async () => {
    const app = await makeApp();
    const res = await app.inject({ method: 'GET', url: '/skills/community?q=fixture' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(FIXTURE_CATALOG);

    const list = await app.inject({ method: 'GET', url: '/skills' });
    expect(list.json().some((s: { name: string }) => s.name === 'fixture-skill')).toBe(false);
    await app.close();
  });

  it('imports from the community catalog and creates the skill DISABLED', async () => {
    const fetchImpl = vi.fn(async () => new Response('# Fixture Skill\nCommunity body.', { status: 200 }));
    const app = await makeApp(fetchImpl as unknown as typeof fetch);

    const res = await app.inject({
      method: 'POST',
      url: '/skills/import-community',
      payload: { repo: 'fixture-org/fixture-skill' },
    });
    expect(res.statusCode).toBe(201);
    const skill = res.json();
    expect(skill.source).toBe('community');
    expect(skill.enabled).toBe(false);
    expect(skill.name).toBe('fixture-skill');
    vi.unstubAllGlobals();
    await app.close();
  });

  it('rejects importing an unknown community repo', async () => {
    const app = await makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/skills/import-community',
      payload: { repo: 'nonexistent/repo' },
    });
    expect(res.statusCode).toBe(422);
    await app.close();
  });

  it('GET /skills/:id/agents lists agents that have the skill linked', async () => {
    const app = await makeApp();
    const skill = (await app.inject({ method: 'POST', url: '/skills', payload: createBody })).json();
    const agent = (
      await app.inject({
        method: 'POST',
        url: '/agents',
        payload: { name: 'Skill Linker', provider: 'openai', model: 'gpt-4o-mini', system_prompt: 'Review.' },
      })
    ).json();

    await app.inject({
      method: 'POST',
      url: `/agents/${agent.id}/skills`,
      payload: { skill_ids: [skill.id] },
    });

    const res = await app.inject({ method: 'GET', url: `/skills/${skill.id}/agents` });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([{ id: agent.id, name: 'Skill Linker' }]);
    await app.close();
  });
});
