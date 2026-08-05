import { describe, it, expect, vi } from 'vitest';

vi.mock('node:dns/promises', () => ({
  lookup: vi.fn(async () => [{ address: '185.199.108.133', family: 4 }]),
}));

import { SkillsService, type SkillsServiceDeps } from '../src/modules/skills/service.js';
import { ValidationError } from '../src/platform/errors.js';
import { MAX_IMPORTED_BODY_BYTES } from '../src/modules/skills/constants.js';
import type { SkillRow } from '../src/db/rows.js';
import type { InsertSkill } from '../src/modules/skills/repository.js';

function makeDeps(insert: (input: InsertSkill) => Promise<SkillRow>): SkillsServiceDeps {
  return {
    skillsRepo: { insert } as unknown as SkillsServiceDeps['skillsRepo'],
    communityCatalog: { search: async () => [] },
    agentsRepo: {} as unknown as SkillsServiceDeps['agentsRepo'],
  };
}

const NOW = '2026-01-01T00:00:00.000Z';
function fakeRow(input: InsertSkill): SkillRow {
  return {
    id: 'sk-1',
    workspaceId: input.workspaceId,
    name: input.name,
    description: input.description ?? '',
    type: input.type,
    source: input.source,
    body: input.body,
    enabled: input.enabled ?? true,
    version: 1,
    evidenceFiles: null,
    createdAt: NOW,
    updatedAt: NOW,
  } as unknown as SkillRow;
}

describe('SkillsService.importFromUrl — body size cap', () => {
  it('rejects an oversized body without buffering the whole thing (streaming cap)', async () => {
    const bigBody = 'x'.repeat(MAX_IMPORTED_BODY_BYTES + 1);
    const fetchImpl = vi.fn(async () => new Response(bigBody, { status: 200 }));
    vi.stubGlobal('fetch', fetchImpl);

    const insert = vi.fn(async (input: InsertSkill) => fakeRow(input));
    const service = new SkillsService(makeDeps(insert));

    await expect(
      service.importFromUrl('ws1', { url: 'https://raw.githubusercontent.com/org/repo/main/SKILL.md' }),
    ).rejects.toThrow(ValidationError);
    expect(insert).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it('accepts a body under the cap and stores it disabled', async () => {
    const fetchImpl = vi.fn(async () => new Response('# Small skill\nBody.', { status: 200 }));
    vi.stubGlobal('fetch', fetchImpl);

    const insert = vi.fn(async (input: InsertSkill) => fakeRow(input));
    const service = new SkillsService(makeDeps(insert));

    const skill = await service.importFromUrl('ws1', {
      url: 'https://raw.githubusercontent.com/org/repo/main/SKILL.md',
    });
    expect(skill.enabled).toBe(false);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ enabled: false, source: 'imported_url' }));

    vi.unstubAllGlobals();
  });
});
