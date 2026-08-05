import type {
  ConventionCandidate,
  ConventionExtractionResult,
  ConventionPromoteInput,
  ConventionPromoteResult,
  ConventionSkillDraft,
  ConventionSkillDraftMode,
  ConventionSkillDraftResult,
  ConventionUpdate,
} from '@devdigest/shared';
import type { Db } from '../../db/client.js';
import type { Container } from '../../platform/container.js';
import { NotFoundError, ValidationError } from '../../platform/errors.js';
import { AgentsRepository } from '../agents/repository.js';
import { resolveFeatureModel } from '../settings/feature-models.js';
import { toSkillDto } from '../skills/helpers.js';
import { SkillsRepository } from '../skills/repository.js';
import { SAMPLE_FILE_COUNT } from './constants.js';
import { fingerprint, toConventionDto } from './helpers.js';
import { buildConventionSystemPrompt, buildConventionUserPrompt } from './prompt.js';
import { loadSamples } from './samples.js';
import { ConventionExtraction } from './schema.js';
import { buildCategoryDrafts, buildMergedDraft } from './skill-body.js';
import { verifyCandidate } from './verify.js';

export type ConventionsServiceDeps = Pick<
  Container,
  | 'conventionsRepo'
  | 'reposRepo'
  | 'skillsRepo'
  | 'agentsRepo'
  | 'repoIntel'
  | 'git'
  | 'llm'
  | 'db'
>;

export class ConventionsService {
  constructor(private container: ConventionsServiceDeps) {}

  async extract(workspaceId: string, repoId: string): Promise<ConventionExtractionResult> {
    const repo = await this.requireRepo(workspaceId, repoId);
    if (!repo.clonePath) throw new ValidationError('Repository must be cloned before extraction');

    const repoRef = { owner: repo.owner, name: repo.name };
    const [rankedPaths, scannedSha] = await Promise.all([
      this.container.repoIntel
        .getConventionSamples(repoId, SAMPLE_FILE_COUNT)
        .catch(() => []),
      this.container.git.currentHead(repoRef).catch(() => null),
    ]);
    const loaded = await loadSamples({
      clonePath: repo.clonePath,
      rankedPaths,
      readFile: (path) => this.container.git.readFile(repoRef, path),
    });

    if (loaded.samples.length === 0) {
      const rows = await this.container.conventionsRepo.upsertExtraction(
        workspaceId,
        repoId,
        [],
      );
      return {
        candidates: rows.map(toConventionDto),
        scanned_sha: scannedSha,
        sampled_files: [],
        considered_files: loaded.considered,
        proposed: 0,
        verified: 0,
        dropped: 0,
        model: null,
      };
    }

    const modelChoice = await resolveFeatureModel(this.container, workspaceId, 'conventions');
    const llm = await this.container.llm(modelChoice.provider);
    const completion = await llm.completeStructured({
      model: modelChoice.model,
      schema: ConventionExtraction,
      schemaName: 'ConventionExtraction',
      messages: [
        { role: 'system', content: buildConventionSystemPrompt() },
        { role: 'user', content: buildConventionUserPrompt(loaded.samples) },
      ],
      temperature: 0,
      maxTokens: 4_000,
      timeoutMs: 120_000,
      maxRetries: 1,
    });

    const samplesByPath = new Map(
      loaded.samples.map((sample) => [sample.path, sample.content] as const),
    );
    const verifiedByFingerprint = new Map<
      string,
      NonNullable<ReturnType<typeof verifyCandidate>>
    >();
    for (const candidate of completion.data.candidates) {
      const verified = verifyCandidate(candidate, samplesByPath);
      if (!verified) continue;
      const candidateFingerprint = fingerprint(verified.rule);
      const prior = verifiedByFingerprint.get(candidateFingerprint);
      if (!prior || verified.confidence > prior.confidence) {
        verifiedByFingerprint.set(candidateFingerprint, verified);
      }
    }

    const verified = [...verifiedByFingerprint.entries()].map(
      ([candidateFingerprint, candidate]) => ({
        ...candidate,
        scannedSha,
        fingerprint: candidateFingerprint,
      }),
    );
    const rows = await this.container.conventionsRepo.upsertExtraction(
      workspaceId,
      repoId,
      verified,
    );
    const proposed = completion.data.candidates.length;

    return {
      candidates: rows.map(toConventionDto),
      scanned_sha: scannedSha,
      sampled_files: loaded.samples.map((sample) => sample.path),
      considered_files: loaded.considered,
      proposed,
      verified: verified.length,
      dropped: proposed - verified.length,
      model: { provider: modelChoice.provider, model: completion.model },
    };
  }

  async list(workspaceId: string, repoId: string): Promise<ConventionExtractionResult> {
    await this.requireRepo(workspaceId, repoId);
    const rows = await this.container.conventionsRepo.list(workspaceId, repoId);
    const candidates = rows.map(toConventionDto);
    const scannedSha =
      candidates.find((candidate) => candidate.scanned_sha)?.scanned_sha ?? null;
    const sampledFiles = [
      ...new Set(
        candidates
          .map((candidate) => candidate.evidence_path)
          .filter((path): path is string => Boolean(path)),
      ),
    ];
    return {
      candidates,
      scanned_sha: scannedSha,
      sampled_files: sampledFiles,
      // List has no live model pass — counts reflect currently grounded rows.
      considered_files: sampledFiles.length,
      proposed: candidates.length,
      verified: candidates.length,
      dropped: 0,
      model: null,
    };
  }

  async update(
    workspaceId: string,
    id: string,
    patch: ConventionUpdate,
  ): Promise<ConventionCandidate | undefined> {
    const normalizedPatch: ConventionUpdate = {
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.rule !== undefined ? { rule: requiredTrimmed(patch.rule, 'Rule') } : {}),
      ...(patch.category !== undefined
        ? { category: requiredTrimmed(patch.category, 'Category') }
        : {}),
    };
    const row = await this.container.conventionsRepo.update(workspaceId, id, normalizedPatch);
    return row ? toConventionDto(row) : undefined;
  }

  async skillDraft(
    workspaceId: string,
    repoId: string,
    mode: ConventionSkillDraftMode,
  ): Promise<ConventionSkillDraftResult> {
    const repo = await this.requireRepo(workspaceId, repoId);
    const accepted = (await this.container.conventionsRepo.listAccepted(workspaceId, repoId)).map(
      toConventionDto,
    );
    const drafts =
      accepted.length === 0
        ? []
        : mode === 'by-category'
          ? buildCategoryDrafts(accepted, repo.fullName)
          : [buildMergedDraft(accepted, repo.fullName)];
    return { mode, drafts, repo_name: repo.fullName };
  }

  async promote(
    workspaceId: string,
    repoId: string,
    input: ConventionPromoteInput,
  ): Promise<ConventionPromoteResult> {
    const generated = await this.skillDraft(workspaceId, repoId, input.mode);
    if (generated.drafts.length === 0) {
      throw new ValidationError('Accept at least one convention before promotion');
    }

    if (input.agent_id) {
      const agent = await this.container.agentsRepo.getById(workspaceId, input.agent_id);
      if (!agent) throw new NotFoundError('Agent not found');
    }

    const drafts = resolveDraftOverrides(generated.drafts, input);

    // Skill rows + version snapshots + optional agent link rewrite must commit
    // together — a mid-loop failure must not leave orphaned extracted skills.
    const created = await this.container.db.transaction(async (tx) => {
      const skillsRepo = new SkillsRepository(tx as Db);
      const agentsRepo = new AgentsRepository(tx as Db);
      const rows = [];
      for (const draft of drafts) {
        rows.push(
          await skillsRepo.insert({
            workspaceId,
            name: draft.name,
            description: draft.description,
            type: 'convention',
            source: 'extracted',
            body: draft.body,
            enabled: draft.enabled,
            evidenceFiles: draft.evidence_files,
          }),
        );
      }

      if (input.agent_id) {
        const existingIds = await agentsRepo.skillIdsForAgent(input.agent_id);
        await agentsRepo.setSkills(input.agent_id, [
          ...new Set([...existingIds, ...rows.map((skill) => skill.id)]),
        ]);
      }

      return rows;
    });

    return { skills: created.map(toSkillDto) };
  }

  private async requireRepo(workspaceId: string, repoId: string) {
    const repo = await this.container.reposRepo.getById(workspaceId, repoId);
    if (!repo) throw new NotFoundError('Repository not found');
    return repo;
  }
}

interface ResolvedDraft {
  name: string;
  description: string;
  body: string;
  enabled: boolean;
  evidence_files: string[];
}

function resolveDraftOverrides(
  generated: ConventionSkillDraft[],
  input: ConventionPromoteInput,
): ResolvedDraft[] {
  if (!input.drafts) {
    return generated.map((draft) => ({
      name: draft.name,
      description: draft.description,
      body: draft.body,
      enabled: input.enabled ?? true,
      evidence_files: draft.evidence_files,
    }));
  }

  if (input.drafts.length !== generated.length) {
    throw new ValidationError('Draft overrides must match the generated draft count');
  }

  return generated.map((draft, index) => {
    const override =
      input.mode === 'by-category'
        ? input.drafts!.find((candidate) => candidate.category === draft.category)
        : input.drafts![index];
    if (!override) {
      throw new ValidationError(`Missing draft override for category ${draft.category ?? 'merged'}`);
    }
    return {
      name: requiredTrimmed(override.name, 'Skill name'),
      description: override.description?.trim() ?? draft.description,
      body: requiredTrimmed(override.body, 'Skill body'),
      enabled: override.enabled ?? input.enabled ?? true,
      evidence_files: draft.evidence_files,
    };
  });
}

function requiredTrimmed(value: string, field: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new ValidationError(`${field} must not be empty`);
  return trimmed;
}
