import 'dotenv/config';
import { createDb, type Db } from './client.js';
import * as t from './schema.js';
import { eq, and } from 'drizzle-orm';
import {
  GENERAL_REVIEWER_PROMPT,
  SECURITY_REVIEWER_PROMPT,
  PERFORMANCE_REVIEWER_PROMPT,
  TEST_QUALITY_REVIEWER_PROMPT,
  API_CONTRACT_REVIEWER_PROMPT,
} from './seed-prompts.js';
import {
  UNCOVERED_BRANCHES_SKILL,
  MISSING_CORNER_CASES_SKILL,
  OVER_MOCKING_SKILL,
  FLAKY_TEST_SMELLS_SKILL,
  API_CONTRACT_BREAKING_CHANGE_SKILL,
  API_RESPONSE_SCHEMA_SKILL,
  API_DEPRECATION_POLICY_SKILL,
  API_SEMVER_DISCIPLINE_SKILL,
} from './seed-skills.js';
import { SkillsRepository } from '../modules/skills/repository.js';
import { SkillsService } from '../modules/skills/service.js';
import { AgentsRepository } from '../modules/agents/repository.js';
import { StaticCommunityCatalog } from '../adapters/community/static-list.js';
import { computeIntentFingerprint } from '../modules/intent/fingerprint.js';
import { IntentRepository } from '../modules/intent/repository.js';

/** Default provider/model for the built-in reviewer agents. */
const DEFAULT_PROVIDER = 'openrouter' as const;
const DEFAULT_MODEL = 'deepseek/deepseek-v4-flash';

/**
 * Seed the starter's demo data. Idempotent: re-running upserts the default
 * workspace/user and the demo fixtures.
 *
 * Seeds: default workspace + system user + membership, default settings,
 * demo repo (acme/payments-api), PR #482 with files/commits, a sample review
 * with a few findings, the five built-in agents (General + Security +
 * Performance + Test Quality + API Contract, all on the default
 * openrouter/deepseek-v4-flash provider+model), and the skills linked to the
 * latter two.
 *
 * Course lessons populate the remaining tables (conventions, memory, eval, …)
 * once their features are built — they start empty here.
 */

export const DEFAULT_WORKSPACE_NAME = 'default';
export const SYSTEM_USER_EMAIL = 'you@local';

export async function seed(db: Db): Promise<{ workspaceId: string; userId: string }> {
  // ---- workspace + user (no-auth defaults) ----
  let [ws] = await db
    .select()
    .from(t.workspaces)
    .where(eq(t.workspaces.name, DEFAULT_WORKSPACE_NAME));
  if (!ws) {
    [ws] = await db
      .insert(t.workspaces)
      .values({ name: DEFAULT_WORKSPACE_NAME })
      .returning();
  }
  const workspaceId = ws!.id;

  let [user] = await db.select().from(t.users).where(eq(t.users.email, SYSTEM_USER_EMAIL));
  if (!user) {
    [user] = await db
      .insert(t.users)
      .values({ email: SYSTEM_USER_EMAIL, name: 'You' })
      .returning();
  }
  const userId = user!.id;

  await db
    .insert(t.workspaceMembers)
    .values({ workspaceId, userId, role: 'owner' })
    .onConflictDoNothing();

  // ---- default settings ----
  const defaultSettings: Record<string, unknown> = {
    polling_interval_min: 5,
    theme: 'dark',
    density: 'regular',
    sync_to_folder: true,
  };
  for (const [key, value] of Object.entries(defaultSettings)) {
    await db
      .insert(t.settings)
      .values({ workspaceId, userId, key, value })
      .onConflictDoNothing();
  }

  // ---- demo repo (acme/payments-api) ----
  let [repo] = await db
    .select()
    .from(t.repos)
    .where(and(eq(t.repos.workspaceId, workspaceId), eq(t.repos.fullName, 'acme/payments-api')));
  if (!repo) {
    [repo] = await db
      .insert(t.repos)
      .values({
        workspaceId,
        owner: 'acme',
        name: 'payments-api',
        fullName: 'acme/payments-api',
        defaultBranch: 'main',
        clonePath: null,
        createdBy: userId,
      })
      .returning();
  }
  const repoId = repo!.id;

  // ---- PR #482 (rate limiting) ----
  let [pr] = await db
    .select()
    .from(t.pullRequests)
    .where(and(eq(t.pullRequests.repoId, repoId), eq(t.pullRequests.number, 482)));
  if (!pr) {
    [pr] = await db
      .insert(t.pullRequests)
      .values({
        workspaceId,
        repoId,
        number: 482,
        title: 'Add rate limiting to public API endpoints',
        author: 'marisa.koch',
        branch: 'feat/rate-limit-public',
        base: 'main',
        headSha: 'a1b2c3d4e5f6',
        additions: 247,
        deletions: 38,
        filesCount: 9,
        status: 'needs_review',
        body: 'Add rate limiting to public API endpoints to prevent abuse from unauthenticated clients.',
      })
      .returning();

    // pr_files (subset)
    await db.insert(t.prFiles).values([
      { prId: pr!.id, path: 'src/middleware/ratelimit.ts', additions: 84, deletions: 0 },
      { prId: pr!.id, path: 'src/api/public/webhooks.ts', additions: 31, deletions: 6 },
      { prId: pr!.id, path: 'src/config.ts', additions: 4, deletions: 0 },
      { prId: pr!.id, path: 'src/api/users.ts', additions: 7, deletions: 2 },
    ]);

    // pr_commits
    await db.insert(t.prCommits).values({
      prId: pr!.id,
      sha: 'a1b2c3d4e5f6',
      message: 'Add token-bucket rate limiter',
      author: 'marisa.koch',
    });

    // a sample review + findings so the PR shows results before the first run
    const [review] = await db
      .insert(t.reviews)
      .values({
        workspaceId,
        prId: pr!.id,
        kind: 'review',
        verdict: 'request_changes',
        summary:
          'Solid middleware approach, but a Stripe secret key is committed in plaintext and the user-list endpoint introduces an N+1 query under the new limiter.',
        score: 61,
        model: 'seed',
      })
      .returning();

    await db.insert(t.findings).values([
      {
        reviewId: review!.id,
        file: 'src/config.ts',
        startLine: 12,
        endLine: 12,
        severity: 'CRITICAL',
        category: 'security',
        title: 'Hardcoded Stripe secret key in commit',
        rationale: 'Line 12 contains a literal `sk_live_` Stripe secret key.',
        suggestion: 'Move to env var and rotate the key immediately.',
        confidence: 0.98,
      },
      {
        reviewId: review!.id,
        file: 'src/api/users.ts',
        startLine: 45,
        endLine: 52,
        severity: 'WARNING',
        category: 'perf',
        title: 'N+1 query in user list endpoint',
        rationale: 'Loop issues one query per user → N+1.',
        suggestion: 'Use a single IN query and group in memory.',
        confidence: 0.86,
      },
    ]);
  }

  // Seed PR intent for #482 (idempotent upsert — works on re-seed too).
  {
    const seedTitle = 'Add rate limiting to public API endpoints';
    const seedBody =
      'Add rate limiting to public API endpoints to prevent abuse from unauthenticated clients.';
    const seedPaths = [
      'src/middleware/ratelimit.ts',
      'src/api/public/webhooks.ts',
      'src/config.ts',
      'src/api/users.ts',
    ];
    const seedCommits = ['Add token-bucket rate limiter'];
    const fingerprint = computeIntentFingerprint({
      title: seedTitle,
      body: seedBody,
      issueKey: '',
      urls: [],
      paths: seedPaths,
      commits: seedCommits,
    });
    const intents = new IntentRepository(db);
    await intents.upsert(
      pr!.id,
      {
        intent:
          'Add token-bucket rate limiting on public API endpoints to curb abuse from unauthenticated clients.',
        in_scope: [
          'Public API middleware rate limiter',
          'Apply limits to unauthenticated webhook/public routes',
          'Config knobs for bucket size / refill',
        ],
        out_of_scope: [
          'Authenticated session auth redesign',
          'Billing / quota product features',
        ],
        confidence: 0.82,
        synthesis_mode: 'author_stated',
        risk_areas: ['api', 'abuse', 'middleware'],
        sources: [
          { kind: 'title', ref: seedTitle },
          { kind: 'description', ref: 'body' },
          { kind: 'file_paths', ref: `${seedPaths.length} paths` },
          { kind: 'commit_messages', ref: '1 commits' },
        ],
        missing_inputs: [],
      },
      { inputFingerprint: fingerprint, model: 'seed', computedAt: new Date() },
    );
  }

  // ---- built-in agents (the three starter presets) ----
  // Prompt bodies live in ./seed-prompts.ts (mirrored in docs/agent-prompts/*.md).
  const seedAgents: Array<typeof t.agents.$inferInsert> = [
    {
      workspaceId,
      name: 'General Reviewer',
      description: 'Reviews a PR diff for bugs, correctness, and clarity.',
      provider: DEFAULT_PROVIDER,
      model: DEFAULT_MODEL,
      systemPrompt: GENERAL_REVIEWER_PROMPT,
      enabled: true,
      version: 1,
      createdBy: userId,
    },
    {
      workspaceId,
      name: 'Security Reviewer',
      description: 'Flags secrets, injection, SSRF and the lethal trifecta before merge.',
      provider: DEFAULT_PROVIDER,
      model: DEFAULT_MODEL,
      systemPrompt: SECURITY_REVIEWER_PROMPT,
      enabled: true,
      version: 1,
      createdBy: userId,
    },
    {
      workspaceId,
      name: 'Performance Reviewer',
      description: 'Catches N+1 queries, missing indexes, and hot-path allocations.',
      provider: DEFAULT_PROVIDER,
      model: DEFAULT_MODEL,
      systemPrompt: PERFORMANCE_REVIEWER_PROMPT,
      enabled: true,
      version: 1,
      createdBy: userId,
    },
    {
      workspaceId,
      name: 'Test Quality Reviewer',
      description: 'Checks test quality: uncovered branches, missing corner cases, over-mocking, and flaky tests.',
      provider: DEFAULT_PROVIDER,
      model: DEFAULT_MODEL,
      systemPrompt: TEST_QUALITY_REVIEWER_PROMPT,
      enabled: true,
      version: 1,
      createdBy: userId,
    },
    {
      workspaceId,
      name: 'API Contract Reviewer',
      description: 'Checks API compatibility, response schemas, deprecations, and version discipline.',
      provider: DEFAULT_PROVIDER,
      model: DEFAULT_MODEL,
      systemPrompt: API_CONTRACT_REVIEWER_PROMPT,
      enabled: true,
      version: 1,
      createdBy: userId,
    },
  ];
  for (const a of seedAgents) {
    const [existing] = await db
      .select()
      .from(t.agents)
      .where(and(eq(t.agents.workspaceId, workspaceId), eq(t.agents.name, a.name)));
    if (!existing) await db.insert(t.agents).values(a);
  }

  // ---- built-in skills for Test Quality Reviewer + API Contract Reviewer ----
  // Skill bodies live in ./seed-skills.ts. `flaky-test-smells` is seeded via
  // SkillsService.create (the same code path the Skills Lab "Import from
  // file" UI calls) so the seed data exercises the import path end-to-end,
  // per the control experiment's "at least one skill via import" requirement;
  // the rest are inserted directly since they're first-party manual content.
  const skillsRepo = new SkillsRepository(db);
  const agentsRepo = new AgentsRepository(db);
  const skillsService = new SkillsService({ skillsRepo, agentsRepo, communityCatalog: new StaticCommunityCatalog() });

  const directSkills: Array<{ name: string; description: string; type: 'rubric' | 'convention'; body: string }> = [
    {
      name: 'uncovered-branches',
      description: 'Flags conditionals/branches introduced by a diff with no driving test.',
      type: 'rubric',
      body: UNCOVERED_BRANCHES_SKILL,
    },
    {
      name: 'missing-corner-cases',
      description: 'Flags boundary inputs the code handles but the diff never tests.',
      type: 'rubric',
      body: MISSING_CORNER_CASES_SKILL,
    },
    {
      name: 'over-mocking',
      description: 'Flags tests that mock the exact unit or dependency they claim to exercise.',
      type: 'rubric',
      body: OVER_MOCKING_SKILL,
    },
    {
      name: 'api-contract-breaking-change',
      description: 'Flags route/schema changes that break an existing caller.',
      type: 'convention',
      body: API_CONTRACT_BREAKING_CHANGE_SKILL,
    },
    {
      name: 'api-response-schema',
      description: 'Flags incompatible response types, requiredness, nullability, and envelopes.',
      type: 'convention',
      body: API_RESPONSE_SCHEMA_SKILL,
    },
    {
      name: 'api-deprecation-policy',
      description: 'Requires a compatibility window before routes or fields are removed.',
      type: 'convention',
      body: API_DEPRECATION_POLICY_SKILL,
    },
    {
      name: 'api-semver-discipline',
      description: 'Requires a major or parallel version for released breaking API changes.',
      type: 'convention',
      body: API_SEMVER_DISCIPLINE_SKILL,
    },
  ];
  const skillIds: Record<string, string> = {};
  for (const s of directSkills) {
    const [existing] = await db
      .select()
      .from(t.skills)
      .where(and(eq(t.skills.workspaceId, workspaceId), eq(t.skills.name, s.name)));
    skillIds[s.name] = existing?.id ?? (await skillsRepo.insert({ workspaceId, ...s, source: 'manual' })).id;
  }
  {
    const [existing] = await db
      .select()
      .from(t.skills)
      .where(and(eq(t.skills.workspaceId, workspaceId), eq(t.skills.name, 'flaky-test-smells')));
    skillIds['flaky-test-smells'] =
      existing?.id ??
      (
        await skillsService.create(workspaceId, {
          name: 'flaky-test-smells',
          description: 'Flags non-deterministic tests: real timers, unseeded randomness, shared state.',
          type: 'rubric',
          body: FLAKY_TEST_SMELLS_SKILL,
        })
      ).id;
  }

  // ---- link skills to their agents (order matters — see agents.skills.orderHint) ----
  const [testQualityAgent] = await db
    .select()
    .from(t.agents)
    .where(and(eq(t.agents.workspaceId, workspaceId), eq(t.agents.name, 'Test Quality Reviewer')));
  if (testQualityAgent) {
    await agentsRepo.setSkills(testQualityAgent.id, [
      skillIds['uncovered-branches']!,
      skillIds['missing-corner-cases']!,
      skillIds['over-mocking']!,
      skillIds['flaky-test-smells']!,
    ]);
  }

  const [apiContractAgent] = await db
    .select()
    .from(t.agents)
    .where(and(eq(t.agents.workspaceId, workspaceId), eq(t.agents.name, 'API Contract Reviewer')));
  if (apiContractAgent) {
    await agentsRepo.setSkills(apiContractAgent.id, [
      skillIds['api-contract-breaking-change']!,
      skillIds['api-response-schema']!,
      skillIds['api-deprecation-policy']!,
      skillIds['api-semver-discipline']!,
    ]);
  }

  return { workspaceId, userId };
}

// CLI entrypoint
if (import.meta.url === `file://${process.argv[1]}`) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }
  const handle = createDb(url);
  seed(handle.db)
    .then(async (r) => {
      console.log('✓ seeded', r);
      await handle.close();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('✗ seed failed:', err);
      await handle.close();
      process.exit(1);
    });
}
