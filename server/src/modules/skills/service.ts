import type { Container } from '../../platform/container.js';
import type { CommunitySkill, Skill, SkillType, SkillVersion } from '@devdigest/shared';
import { ExternalServiceError, ValidationError } from '../../platform/errors.js';
import { deriveNameFromBody, isSkillConfigChange, toSkillDto, toSkillVersionDto } from './helpers.js';
import { MAX_IMPORTED_BODY_BYTES } from './constants.js';

/**
 * A1 — skills service. Business logic for the Skills Lab page + Skill editor.
 *
 * A skill = name + description + type + body (markdown) + enabled + version.
 * Body changes are versioned via `skill_versions` (repository). Imported
 * skills (URL / community) are ALWAYS created disabled — an untrusted body
 * must be vetted by a human before it can be attached to any agent's prompt.
 */

export interface CreateSkillInput {
  name?: string;
  description?: string;
  type: SkillType;
  body: string;
}

export interface UpdateSkillInput {
  name?: string;
  description?: string;
  type?: SkillType;
  body?: string;
  enabled?: boolean;
}

export interface ImportFromUrlInput {
  url: string;
  type?: SkillType;
}

export interface ImportFromCommunityInput {
  repo: string;
  type?: SkillType;
}

const DEFAULT_IMPORTED_TYPE: SkillType = 'custom';

export class SkillsService {
  private repo: Container['skillsRepo'];

  constructor(private container: Container) {
    this.repo = container.skillsRepo;
  }

  async list(workspaceId: string): Promise<Skill[]> {
    const rows = await this.repo.list(workspaceId);
    return rows.map(toSkillDto);
  }

  async get(workspaceId: string, id: string): Promise<Skill | undefined> {
    const row = await this.repo.getById(workspaceId, id);
    return row ? toSkillDto(row) : undefined;
  }

  /** Delete a skill (and its versions/agent-links, via cascade). */
  async delete(workspaceId: string, id: string): Promise<boolean> {
    return this.repo.deleteById(workspaceId, id);
  }

  /** Create a skill from a pasted/uploaded markdown body — first-party content, enabled by default. */
  async create(workspaceId: string, input: CreateSkillInput): Promise<Skill> {
    if (!input.body.trim()) throw new ValidationError('Skill body must not be empty');
    const name = input.name?.trim() || deriveNameFromBody(input.body) || 'Untitled skill';
    const row = await this.repo.insert({
      workspaceId,
      name,
      description: input.description,
      type: input.type,
      source: 'manual',
      body: input.body,
      enabled: true,
    });
    return toSkillDto(row);
  }

  /**
   * Fetch a skill body from a URL, server-side. Stored `imported_url`,
   * ALWAYS disabled — the untrusted body must be reviewed + enabled manually
   * before it can be attached to an agent (per the vetting UX).
   */
  async importFromUrl(workspaceId: string, input: ImportFromUrlInput): Promise<Skill> {
    const body = await this.fetchSkillBody(input.url);
    const name = deriveNameFromBody(body) || input.url;
    const row = await this.repo.insert({
      workspaceId,
      name,
      description: `Imported from ${input.url}`,
      type: input.type ?? DEFAULT_IMPORTED_TYPE,
      source: 'imported_url',
      body,
      enabled: false,
    });
    return toSkillDto(row);
  }

  /**
   * Import a skill from the community catalog. Same untrusted-by-default
   * rule as URL import: always disabled on create.
   */
  async importFromCommunity(workspaceId: string, input: ImportFromCommunityInput): Promise<Skill> {
    const catalogEntry = await this.findCommunitySkill(input.repo);
    if (!catalogEntry) throw new ValidationError(`Unknown community skill: ${input.repo}`);
    const body = await this.fetchSkillBody(communityRawUrl(catalogEntry));
    const row = await this.repo.insert({
      workspaceId,
      name: catalogEntry.name,
      description: catalogEntry.desc,
      type: input.type ?? DEFAULT_IMPORTED_TYPE,
      source: 'community',
      body,
      enabled: false,
    });
    return toSkillDto(row);
  }

  /** Search the (fixed/allowlisted) community skill catalog — no persistence. */
  async searchCommunity(query?: string): Promise<CommunitySkill[]> {
    const all = await this.container.communityCatalog.search(query);
    return all;
  }

  async update(workspaceId: string, id: string, patch: UpdateSkillInput): Promise<Skill | undefined> {
    const existing = await this.repo.getById(workspaceId, id);
    if (!existing) return undefined;

    const repoPatch = {
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.type !== undefined ? { type: patch.type } : {}),
      ...(patch.body !== undefined ? { body: patch.body } : {}),
      ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}),
    };
    // A config-affecting change (name/description/type/body) bumps the
    // version and snapshots skill_versions — domain rule, decided here.
    const bumpVersion = isSkillConfigChange(existing, repoPatch);
    const row = await this.repo.update(workspaceId, id, repoPatch, { bumpVersion });
    return row ? toSkillDto(row) : undefined;
  }

  /** Version history for a skill, newest first. Undefined ⇒ skill not found (route → 404). */
  async listVersions(workspaceId: string, skillId: string): Promise<SkillVersion[] | undefined> {
    const skill = await this.repo.getById(workspaceId, skillId);
    if (!skill) return undefined;
    const rows = await this.repo.listVersions(skillId);
    return rows.map(toSkillVersionDto);
  }

  /** A single body snapshot. Undefined ⇒ skill not found OR version never recorded (route → 404). */
  async getVersion(
    workspaceId: string,
    skillId: string,
    version: number,
  ): Promise<SkillVersion | undefined> {
    const skill = await this.repo.getById(workspaceId, skillId);
    if (!skill) return undefined;
    const row = await this.repo.getVersion(skillId, version);
    return row ? toSkillVersionDto(row) : undefined;
  }

  /**
   * Agents that have this skill linked — the Stats tab's "Used by" list.
   * Reads through `agentsRepo` (which owns `agent_skills`) rather than
   * duplicating that query here. Undefined ⇒ skill not found (route → 404).
   */
  async agentsUsing(
    workspaceId: string,
    skillId: string,
  ): Promise<{ id: string; name: string }[] | undefined> {
    const skill = await this.repo.getById(workspaceId, skillId);
    if (!skill) return undefined;
    return this.container.agentsRepo.agentsUsingSkill(skillId);
  }

  private async fetchSkillBody(url: string): Promise<string> {
    let res: Response;
    try {
      res = await fetch(url);
    } catch (err) {
      throw new ExternalServiceError(`Could not fetch skill from ${url}`, { cause: String(err) });
    }
    if (!res.ok) {
      throw new ExternalServiceError(`Fetching ${url} failed with status ${res.status}`);
    }
    const text = await res.text();
    if (Buffer.byteLength(text, 'utf8') > MAX_IMPORTED_BODY_BYTES) {
      throw new ValidationError(`Skill body from ${url} exceeds the ${MAX_IMPORTED_BODY_BYTES}-byte limit`);
    }
    if (!text.trim()) throw new ValidationError(`Skill body from ${url} is empty`);
    return text;
  }

  private async findCommunitySkill(repo: string): Promise<CommunitySkill | undefined> {
    const all = await this.container.communityCatalog.search();
    return all.find((s) => s.repo === repo);
  }
}

/** The catalog entry's `repo` is a GitHub `owner/name` slug; resolve to a raw markdown URL. */
function communityRawUrl(entry: CommunitySkill): string {
  return `https://raw.githubusercontent.com/${entry.repo}/main/SKILL.md`;
}
