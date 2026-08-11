import type {
  EnsureIntentResponse,
  Intent,
  IntentSource,
  PrIntentRecord,
} from '@devdigest/shared';
import { Intent as IntentSchema } from '@devdigest/shared';
import type { LLMProvider } from '@devdigest/shared';
import type { Container } from '../../platform/container.js';
import { NotFoundError, MissingApiKeyError, isMissingApiKeyError } from '../../platform/errors.js';
import { resolveFeatureModel } from '../settings/feature-models.js';
import { decideIntentAction, type IntentEnsureMode } from './cache-policy.js';
import { clampIntentConfidence } from './confidence.js';
import { extractPlanSpecUrls } from './extract-urls.js';
import { computeIntentFingerprint } from './fingerprint.js';
import { fetchIntentSources, type FetchedSourceContent } from './fetch-sources.js';
import { buildHeuristicIntent } from './heuristic.js';
import {
  extractLinkedIssueNumber,
  gatherCommitSubjects,
  gatherFilePaths,
} from './helpers.js';
import { IntentRepository, rowToPrIntentRecord, type PrIntentRow } from './repository.js';

const MAX_BODY_FOR_LLM = 6_000;
const MAX_AUX_TEXT = 4_000;

/** Minimal pino-compatible logger for intent cache/compute lines. */
export type IntentLogger = {
  info: (obj: unknown, msg?: string) => void;
  warn?: (obj: unknown, msg?: string) => void;
};

const INTENT_SYSTEM = `You derive structured PR intent for an AI code reviewer.
Return ONLY the Intent schema fields.
Rules:
- Summarize motivation in "intent" (1–3 sentences).
- List concrete in_scope / out_of_scope bullets.
- Set synthesis_mode: author_stated when the PR description clearly states goals; ticket_grounded when a linked issue/ticket is the primary source; inferred_from_signals when synthesizing from title/paths/commits only.
- If the PR description is missing/empty, use synthesis_mode inferred_from_signals and include "description" in missing_inputs.
- Prefer linked ticket text over a vague description when the ticket was fetched successfully.
- risk_areas: up to 8 short tags (≤32 chars each), e.g. api, auth, abuse.
- sources: echo the signal kinds you relied on (title, description, linked_issue, plan_url, spec_url, file_paths, commit_messages) with short refs.
- confidence: 0–1 reflecting evidence quality (you may be clamped later in code).
- NEVER invent CRITICAL review findings; you only classify intent/scope.
- Do NOT request or assume access to a unified diff.`;

interface GatheredSignals {
  title: string;
  body: string;
  hasBody: boolean;
  paths: string[];
  commitSubjects: string[];
  issueNumber?: number;
  extractedUrls: ReturnType<typeof extractPlanSpecUrls>;
  fingerprint: string;
  repo: { owner: string; name: string };
}

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

  /**
   * Best-effort soft ensure for review runs — returns undefined on any failure
   * so agent execution can continue without an intent section.
   */
  async loadIntentBestEffort(
    prId: string,
    workspaceId: string,
    logger?: IntentLogger,
  ): Promise<Intent | undefined> {
    try {
      const ensured = await this.ensureIntent(prId, workspaceId, false, logger);
      return ensured.intent;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger?.warn?.({ prId, err: msg }, 'intent: best-effort ensure failed');
      return undefined;
    }
  }

  async ensureIntent(
    prId: string,
    workspaceId: string,
    force = false,
    logger?: IntentLogger,
  ): Promise<EnsureIntentResponse> {
    const mode: IntentEnsureMode = force ? 'regenerate' : 'soft';
    const signals = await this.gatherSignals(prId, workspaceId);
    const existing = await this.intents.getByPrId(prId);

    const choice = await resolveFeatureModel(this.container, workspaceId, 'review_intent');
    const llmResolution = await this.tryResolveLlm(choice.provider);
    const llmAvailable = llmResolution.ok;

    logger?.info(
      { prId, provider: choice.provider, model: choice.model, mode, llmAvailable },
      'intent: resolved feature model',
    );

    const decision = decideIntentAction({
      mode,
      fingerprint: signals.fingerprint,
      existing: existing
        ? {
            inputFingerprint: existing.inputFingerprint,
            model: existing.model,
            computedAt: existing.computedAt,
          }
        : null,
      llmAvailable,
    });

    switch (decision.action) {
      case 'return_cached':
        return this.cachedResponse(prId, existing!, logger, 'intent: cache hit');
      case 'fail_missing_key':
        throw llmResolution.ok
          ? new MissingApiKeyError(`${choice.provider.toUpperCase()}_API_KEY`)
          : llmResolution.err;
      case 'compute_heuristic':
        return this.persistHeuristic({
          prId,
          fingerprint: signals.fingerprint,
          title: signals.title,
          body: signals.body,
          paths: signals.paths,
          commitSubjects: signals.commitSubjects,
          sources: await this.assembleSources(signals),
          logger,
        });
      case 'compute_llm': {
        if (!llmResolution.ok) {
          throw llmResolution.err;
        }
        return this.computeViaLlm({
          prId,
          signals,
          llm: llmResolution.llm,
          model: choice.model,
          logger,
        });
      }
      default: {
        const _exhaustive: never = decision;
        return _exhaustive;
      }
    }
  }

  private async gatherSignals(prId: string, workspaceId: string): Promise<GatheredSignals> {
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
    const extractedUrls = extractPlanSpecUrls(body);
    const fingerprint = computeIntentFingerprint({
      title: pull.title,
      body,
      issueKey: issueNumber !== undefined ? String(issueNumber) : '',
      urls: extractedUrls.map((u) => u.url),
      paths,
      commits: commitSubjects,
    });

    return {
      title: pull.title,
      body,
      hasBody,
      paths,
      commitSubjects,
      ...(issueNumber !== undefined ? { issueNumber } : {}),
      extractedUrls,
      fingerprint,
      repo: { owner: repo.owner, name: repo.name },
    };
  }

  private async tryResolveLlm(
    provider: 'openai' | 'anthropic' | 'openrouter',
  ): Promise<{ ok: true; llm: LLMProvider } | { ok: false; err: MissingApiKeyError }> {
    try {
      return { ok: true, llm: await this.container.llm(provider) };
    } catch (err) {
      if (isMissingApiKeyError(err)) return { ok: false, err };
      throw err;
    }
  }

  private async assembleSources(signals: GatheredSignals): Promise<IntentSource[]> {
    const { contents } = await fetchIntentSources({
      container: this.container,
      repo: signals.repo,
      ...(signals.issueNumber !== undefined ? { issueNumber: signals.issueNumber } : {}),
      urls: signals.extractedUrls,
    });
    return [...localSources(signals), ...contents.map((c) => c.source)];
  }

  private async computeViaLlm(opts: {
    prId: string;
    signals: GatheredSignals;
    llm: LLMProvider;
    model: string;
    logger?: IntentLogger;
  }): Promise<EnsureIntentResponse> {
    const { signals, llm, model, prId, logger } = opts;
    const { issue, contents } = await fetchIntentSources({
      container: this.container,
      repo: signals.repo,
      ...(signals.issueNumber !== undefined ? { issueNumber: signals.issueNumber } : {}),
      urls: signals.extractedUrls,
    });
    const sources = [...localSources(signals), ...contents.map((c) => c.source)];
    const userPrompt = buildIntentUserPrompt(signals, issue, contents, sources);

    const result = await llm.completeStructured<Intent>({
      model,
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
        sources: mergeSources(sources, result.data.sources),
      },
      { hasBody: signals.hasBody, sources },
    );

    if (!signals.hasBody && intent.synthesis_mode !== 'inferred_from_signals') {
      intent = { ...intent, synthesis_mode: 'inferred_from_signals' };
      intent = clampIntentConfidence(intent, { hasBody: signals.hasBody, sources });
    }

    const computedAt = new Date();
    await this.intents.upsert(prId, intent, {
      inputFingerprint: signals.fingerprint,
      model,
      computedAt,
    });

    logger?.info(
      {
        prId,
        model,
        confidence: intent.confidence,
        cacheHit: false,
        synthesis_mode: intent.synthesis_mode,
      },
      'intent: computed',
    );

    return {
      pr_id: prId,
      status: 'llm',
      model,
      computed_at: computedAt.toISOString(),
      intent,
    };
  }

  private cachedResponse(
    prId: string,
    existing: PrIntentRow,
    logger: IntentLogger | undefined,
    msg: string,
  ): EnsureIntentResponse {
    const record = rowToPrIntentRecord(existing);
    const model = existing.model ?? 'unknown';
    const computedAt = (existing.computedAt ?? new Date()).toISOString();
    logger?.info(
      {
        prId,
        model,
        confidence: record.confidence,
        cacheHit: true,
        synthesis_mode: record.synthesis_mode,
      },
      msg,
    );
    return {
      pr_id: prId,
      status: 'cached',
      model,
      computed_at: computedAt,
      intent: intentFromRecord(record),
    };
  }

  private async persistHeuristic(opts: {
    prId: string;
    fingerprint: string;
    title: string;
    body: string;
    paths: string[];
    commitSubjects: string[];
    sources: IntentSource[];
    logger?: IntentLogger;
  }): Promise<EnsureIntentResponse> {
    const intent = buildHeuristicIntent({
      title: opts.title,
      body: opts.body,
      paths: opts.paths,
      commitSubjects: opts.commitSubjects,
      sources: opts.sources,
    });
    const computedAt = new Date();
    const model = 'heuristic';
    await this.intents.upsert(opts.prId, intent, {
      inputFingerprint: opts.fingerprint,
      model,
      computedAt,
    });
    opts.logger?.info(
      {
        prId: opts.prId,
        model,
        confidence: intent.confidence,
        cacheHit: false,
        synthesis_mode: intent.synthesis_mode,
      },
      'intent: heuristic (llm unavailable)',
    );
    return {
      pr_id: opts.prId,
      status: 'heuristic',
      model,
      computed_at: computedAt.toISOString(),
      intent,
    };
  }
}

function localSources(signals: GatheredSignals): IntentSource[] {
  return [
    { kind: 'title', ref: signals.title, fetched_ok: null },
    ...(signals.hasBody ? [{ kind: 'description' as const, ref: 'body', fetched_ok: null }] : []),
    ...(signals.paths.length > 0
      ? [{ kind: 'file_paths' as const, ref: `${signals.paths.length} paths`, fetched_ok: null }]
      : []),
    ...(signals.commitSubjects.length > 0
      ? [
          {
            kind: 'commit_messages' as const,
            ref: `${signals.commitSubjects.length} commits`,
            fetched_ok: null,
          },
        ]
      : []),
  ];
}

function buildIntentUserPrompt(
  signals: GatheredSignals,
  issue: { number: number; title: string; body?: string | null } | undefined,
  contents: FetchedSourceContent[],
  sources: IntentSource[],
): string {
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

  return [
    `PR title: ${signals.title}`,
    signals.hasBody
      ? `PR description:\n${signals.body.slice(0, MAX_BODY_FOR_LLM)}`
      : 'PR description: (empty)',
    ticketBlock ? `Linked ticket:\n${ticketBlock}` : null,
    planBlocks ? `Plan/spec documents:\n${planBlocks}` : null,
    signals.paths.length
      ? `Changed file paths (capped):\n${signals.paths.map((p) => `- ${p}`).join('\n')}`
      : null,
    signals.commitSubjects.length
      ? `Commit subjects (capped):\n${signals.commitSubjects.map((c) => `- ${c}`).join('\n')}`
      : null,
    `Known sources JSON hint: ${JSON.stringify(sources)}`,
    !signals.hasBody
      ? 'NOTE: description missing — use synthesis_mode inferred_from_signals and include description in missing_inputs.'
      : null,
  ]
    .filter(Boolean)
    .join('\n\n');
}

/** Strip persistence metadata from a PrIntentRecord. */
export function intentFromRecord(record: PrIntentRecord): Intent {
  return {
    intent: record.intent,
    in_scope: record.in_scope,
    out_of_scope: record.out_of_scope,
    confidence: record.confidence,
    synthesis_mode: record.synthesis_mode,
    risk_areas: record.risk_areas,
    sources: record.sources,
    missing_inputs: record.missing_inputs,
  };
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
    byKey.set(key, {
      ...prev,
      ...s,
      fetched_ok: prev.fetched_ok !== undefined ? prev.fetched_ok : s.fetched_ok,
    });
  }
  return [...byKey.values()];
}
