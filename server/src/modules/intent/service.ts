import type {
  EnsureIntentResponse,
  Intent,
  IntentSource,
  PrIntentRecord,
} from '@devdigest/shared';
import { Intent as IntentSchema } from '@devdigest/shared';
import type { Container } from '../../platform/container.js';
import { NotFoundError } from '../../platform/errors.js';
import { resolveFeatureModel } from '../settings/feature-models.js';
import { clampIntentConfidence } from './confidence.js';
import { extractPlanSpecUrls } from './extract-urls.js';
import { computeIntentFingerprint } from './fingerprint.js';
import { fetchIntentSources } from './fetch-sources.js';
import {
  extractLinkedIssueNumber,
  gatherCommitSubjects,
  gatherFilePaths,
} from './helpers.js';
import { IntentRepository, rowToPrIntentRecord } from './repository.js';

const MAX_BODY_FOR_LLM = 6_000;
const MAX_AUX_TEXT = 4_000;

/** Minimal pino-compatible logger for intent cache/compute lines. */
export type IntentLogger = {
  info: (obj: unknown, msg?: string) => void;
};

const INTENT_SYSTEM = `You derive structured PR intent for an AI code reviewer.
Return ONLY the Intent schema fields.
Rules:
- Summarize motivation in "intent" (1–3 sentences).
- List concrete in_scope / out_of_scope bullets.
- Set synthesis_mode: author_stated when the PR description clearly states goals; ticket_grounded when a linked issue/ticket is the primary source; inferred_from_signals when synthesizing from title/paths/commits only.
- If the PR description is missing/empty, use inferred_from_signals and include "description" in missing_inputs.
- Prefer linked ticket text over a vague description when the ticket was fetched successfully.
- risk_areas: up to 8 short tags (≤32 chars each), e.g. api, auth, abuse.
- sources: echo the signal kinds you relied on (title, description, linked_issue, plan_url, spec_url, file_paths, commit_messages) with short refs.
- confidence: 0–1 reflecting evidence quality (you may be clamped later in code).
- NEVER invent CRITICAL review findings; you only classify intent/scope.
- Do NOT request or assume access to a unified diff.`;

export class IntentService {
  private readonly intents: IntentRepository;
  private readonly pulls: Container['pullsRepo'];

  constructor(private container: Container) {
    this.intents = new IntentRepository(container.db);
    this.pulls = container.pullsRepo;
  }

  async getCached(workspaceId: string, prId: string): Promise<PrIntentRecord | undefined> {
    const pull = await this.pulls.getInWorkspace(workspaceId, prId);
    if (!pull) throw new NotFoundError('Pull request not found');
    const row = await this.intents.getByPrId(prId);
    return row ? rowToPrIntentRecord(row) : undefined;
  }

  async ensureIntent(
    prId: string,
    workspaceId: string,
    force = false,
    logger?: IntentLogger,
  ): Promise<EnsureIntentResponse> {
    const pull = await this.pulls.getInWorkspace(workspaceId, prId);
    if (!pull) throw new NotFoundError('Pull request not found');
    const repo = await this.pulls.getRepoById(pull.repoId);
    if (!repo) throw new NotFoundError('Repository not found');

    const files = await this.pulls.getFiles(prId);
    const commits = await this.pulls.getCommits(prId);
    const paths = gatherFilePaths(files.map((f) => f.path));
    const commitSubjects = gatherCommitSubjects(commits.map((c) => c.message));
    const body = pull.body ?? '';
    const hasBody = body.trim().length > 0;
    const issueNumber = extractLinkedIssueNumber(body);
    const issueKey = issueNumber !== undefined ? String(issueNumber) : '';
    const extractedUrls = extractPlanSpecUrls(body);
    const urlRefs = extractedUrls.map((u) => u.url);

    const fingerprint = computeIntentFingerprint({
      title: pull.title,
      body,
      issueKey,
      urls: urlRefs,
      paths,
      commits: commitSubjects,
    });

    const existing = await this.intents.getByPrId(prId);
    if (
      !force &&
      existing &&
      existing.inputFingerprint === fingerprint &&
      existing.computedAt
    ) {
      const intent = rowToPrIntentRecord(existing);
      const model = existing.model ?? 'unknown';
      const computedAt = existing.computedAt.toISOString();
      logger?.info(
        {
          prId,
          model,
          confidence: intent.confidence,
          cacheHit: true,
          synthesis_mode: intent.synthesis_mode,
        },
        'intent: cache hit',
      );
      return {
        pr_id: prId,
        status: 'cached',
        model,
        computed_at: computedAt,
        intent: {
          intent: intent.intent,
          in_scope: intent.in_scope,
          out_of_scope: intent.out_of_scope,
          confidence: intent.confidence,
          synthesis_mode: intent.synthesis_mode,
          risk_areas: intent.risk_areas,
          sources: intent.sources,
          missing_inputs: intent.missing_inputs,
        },
      };
    }

    const { issue, contents } = await fetchIntentSources({
      container: this.container,
      repo: { owner: repo.owner, name: repo.name },
      ...(issueNumber !== undefined ? { issueNumber } : {}),
      urls: extractedUrls,
    });

    const localSources: IntentSource[] = [
      { kind: 'title', ref: pull.title },
      ...(hasBody ? [{ kind: 'description' as const, ref: 'body' }] : []),
      ...(paths.length > 0 ? [{ kind: 'file_paths' as const, ref: `${paths.length} paths` }] : []),
      ...(commitSubjects.length > 0
        ? [{ kind: 'commit_messages' as const, ref: `${commitSubjects.length} commits` }]
        : []),
    ];
    const fetchedSources = contents.map((c) => c.source);
    const sources: IntentSource[] = [...localSources, ...fetchedSources];

    const choice = await resolveFeatureModel(this.container, workspaceId, 'review_intent');
    const llm = await this.container.llm(choice.provider);

    const ticketBlock =
      issue && contents.find((c) => c.source.kind === 'linked_issue' && c.source.fetched_ok)
        ? contents.find((c) => c.source.kind === 'linked_issue')?.text?.slice(0, MAX_AUX_TEXT)
        : undefined;

    const planBlocks = contents
      .filter(
        (c) =>
          (c.source.kind === 'plan_url' || c.source.kind === 'spec_url') &&
          c.source.fetched_ok &&
          c.text,
      )
      .map((c) => `### ${c.source.ref}\n${(c.text ?? '').slice(0, MAX_AUX_TEXT)}`)
      .join('\n\n');

    const userPrompt = [
      `PR title: ${pull.title}`,
      hasBody
        ? `PR description:\n${body.slice(0, MAX_BODY_FOR_LLM)}`
        : 'PR description: (empty)',
      ticketBlock ? `Linked ticket:\n${ticketBlock}` : null,
      planBlocks ? `Plan/spec documents:\n${planBlocks}` : null,
      paths.length ? `Changed file paths (capped):\n${paths.map((p) => `- ${p}`).join('\n')}` : null,
      commitSubjects.length
        ? `Commit subjects (capped):\n${commitSubjects.map((c) => `- ${c}`).join('\n')}`
        : null,
      `Known sources JSON hint: ${JSON.stringify(sources)}`,
      !hasBody
        ? 'NOTE: description missing — use synthesis_mode inferred_from_signals and include description in missing_inputs.'
        : null,
    ]
      .filter(Boolean)
      .join('\n\n');

    const result = await llm.completeStructured<Intent>({
      model: choice.model,
      schema: IntentSchema,
      schemaName: 'Intent',
      messages: [
        { role: 'system', content: INTENT_SYSTEM },
        { role: 'user', content: userPrompt },
      ],
      maxRetries: 1,
    });

    let intent = clampIntentConfidence(
      {
        ...result.data,
        // Prefer our assembled sources (with fetched_ok) over model invention.
        sources: mergeSources(sources, result.data.sources),
      },
      { hasBody, sources },
    );

    if (!hasBody && intent.synthesis_mode !== 'inferred_from_signals') {
      intent = { ...intent, synthesis_mode: 'inferred_from_signals' };
      intent = clampIntentConfidence(intent, { hasBody, sources });
    }

    const computedAt = new Date();
    await this.intents.upsert(prId, intent, {
      inputFingerprint: fingerprint,
      model: choice.model,
      computedAt,
    });

    logger?.info(
      {
        prId,
        model: choice.model,
        confidence: intent.confidence,
        cacheHit: false,
        synthesis_mode: intent.synthesis_mode,
      },
      'intent: computed',
    );

    return {
      pr_id: prId,
      status: 'computed',
      model: choice.model,
      computed_at: computedAt.toISOString(),
      intent,
    };
  }
}

function mergeSources(primary: IntentSource[], fromModel: IntentSource[]): IntentSource[] {
  const byKey = new Map<string, IntentSource>();
  for (const s of [...primary, ...fromModel]) {
    const key = `${s.kind}|${s.ref}`;
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, s);
      continue;
    }
    // Keep fetched_ok from primary when present.
    byKey.set(key, {
      ...prev,
      ...s,
      ...(prev.fetched_ok !== undefined ? { fetched_ok: prev.fetched_ok } : {}),
    });
  }
  return [...byKey.values()];
}
