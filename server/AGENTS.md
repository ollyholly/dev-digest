# `@devdigest/api` — server

Fastify 5 + Drizzle ORM over Postgres (pgvector). Imports repos/PRs, runs
`repo-intel` indexing, stores agents, executes reviews via `reviewer-core`.
Full detail: [`README.md`](README.md) · [`../TESTING.md`](../TESTING.md) ·
[`../docs/agent-prompts/README.md`](../docs/agent-prompts/README.md) (prompt
conventions every agent must follow).

## Stack

Fastify 5 (`@fastify/helmet`, `@fastify/rate-limit`, `@fastify/cors`,
`fastify-sse-v2`), Drizzle ORM + `postgres` driver, `fastify-type-provider-zod`
(one Zod schema drives request validation **and** response serialization),
`octokit`, `@anthropic-ai/sdk` + `openai` SDKs, `@ast-grep/napi` +
`dependency-cruiser` + `graphology` (repo-intel), `tsx` (dev runner), Vitest.

## Build / run / test

```sh
pnpm dev            # :3001, tsx watch
pnpm db:migrate     # NOT run automatically on boot
pnpm db:seed        # idempotent demo data
pnpm exec vitest run --exclude '**/*.it.test.ts'   # unit, no Docker
pnpm exec vitest run .it.test                      # integration, needs Docker (testcontainers)
pnpm test           # both
pnpm typecheck
```

## Structure

Feature modules under `src/modules/<name>/` (routes.ts + service.ts +
repository.ts), registered statically in `src/modules/index.ts` — not
filesystem autoload. Modules: `settings`, `repos`, `pulls`, `polling`,
`workspace`, `agents`, `reviews`, `repoIntel`. Adapters (LLM, GitHub, git,
ast-grep, secrets) sit behind a DI container (`src/platform/container.ts`) so
tests swap in `src/adapters/mocks.ts` — no network/keys in unit tests.

## Non-default conventions

- Routes validate via zod `params`/`body` schemas — never hand-roll
  `Schema.parse(req.body)` in a handler; invalid input 422s before the
  handler runs.
- Secrets are **not** part of `AppConfig`/`loadConfig` — go through
  `SecretsProvider` (`src/adapters/secrets/local.ts`,
  `~/.devdigest/secrets.json`, mode `0600`), `process.env` as fallback only.
- Grounding is mandatory and mechanical: a finding whose cited line isn't in
  the diff is dropped (`groundFindings`), and score is recomputed from
  survivors — never trust the model's self-reported score.
- Prompt-injection defense is one shared `INJECTION_GUARD` appended to every
  system prompt (`reviewer-core/prompt.ts`), not keyword scanning — a denylist
  only catches one phrasing.
- `REPO_INTEL_ENABLED` (default `true`) and a per-agent `repo_intel` toggle
  gate repo-map enrichment; an unindexed repo silently degrades to diff-only.

## Do-not-touch / gotchas

- **`server/package.json` is `git skip-worktree`** locally — CI does not rely
  on committed `test:*` scripts, it inlines `vitest run` invocations directly.
- A DB-backed test **must** be named `*.it.test.ts` or the unit/integration
  split breaks silently.
- `src/db/schema/` has tables for future lessons (`skills`, `eval`, `ci`,
  `knowledge`, `context`, `ops`) — unused by design, not dead code.
- `server/clones/**` is runtime data (git-ignored, imported repo checkouts) —
  never touch from tests.
