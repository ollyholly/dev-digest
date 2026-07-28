# DevDigest — Onboarding

## What this project is

DevDigest is a **local-first AI pull-request review tool**. You point it at a
GitHub repo, it clones and indexes the code, imports open PRs, and runs one or
more LLM-backed "agents" (reviewers) against a PR's diff. Each run returns
structured, **citation-grounded** findings (severity + score) rather than free
text — every finding must cite a real line in the diff or it's mechanically
dropped before it reaches you.

This repo is also the **course starter template** for a multi-lesson course
that builds the product up incrementally. What you see here is intentionally
a minimal-but-complete slice: "import a PR and run an agent review on it,"
end to end. Larger features (skills, multi-agent review, CI export, memory,
eval pipeline, plugins, dashboards…) are added lesson by lesson — see
[What's *not* here yet](#whats-not-here-yet). The DB schema already has
tables for most of these; they just sit empty until a lesson fills them.

## Goal / product intent

Give a developer a fast, trustworthy first read on a PR: **what's actually
wrong, cited to real lines, with a deterministic severity/score** — instead of
a wall of LLM prose that may or may not be grounded in the diff. Trust is
engineered in, not assumed: grounding gates hallucinated locations, scores are
recomputed from surviving findings (never trusted from the model), and a
shared prompt-injection guard stops a PR's own content (diff/description/
comments) from talking the model out of flagging real issues.

## Stack

No monorepo tooling (no Nx/Turborepo/pnpm workspaces) — **five standalone
packages**, each with its own `package.json` and lockfile. Cross-package code
is shared via **tsconfig path aliases**, not published npm packages.

| Folder | Package | Role | Port |
|---|---|---|---|
| `server/` | `@devdigest/api` | Fastify 5 API + Drizzle ORM over Postgres (pgvector) | 3001 |
| `client/` | `@devdigest/web` | Next.js 15 web app (the "studio" UI) | 3000 |
| `reviewer-core/` | `@devdigest/reviewer-core` | Pure review engine: diff → prompt → LLM → grounded findings | — |
| `e2e/` | `@devdigest/e2e` | Deterministic browser e2e (`agent-browser`) | — |
| `server/src/vendor/shared` | `@devdigest/shared` | Zod contracts shared by every package | — |

**Server:** Fastify 5, Drizzle ORM, `postgres` driver, Postgres 16 +
`pgvector`, `fastify-type-provider-zod` (one Zod schema drives request
validation *and* response serialization), `octokit` (GitHub), `openai` +
`@anthropic-ai/sdk` SDKs, `@ast-grep/napi` + `dependency-cruiser` +
`graphology` (repo-intel: symbol/import-graph indexing), `simple-git`,
`js-tiktoken`, `p-queue`, `fastify-sse-v2` (run-trace streaming), Vitest,
`tsx` (dev runner), TypeScript.

**Client:** Next.js 15 (App Router), React 19, TanStack Query (all server
state), `next-intl` (i18n), Tailwind 4, `recharts` (charts), `mermaid`
(in-app diagram rendering), `react-markdown` + `remark-gfm`, Vitest + jsdom +
Testing Library.

**reviewer-core:** deliberately tiny — `openai` (client, works against
OpenRouter too) + `zod`. No DB, no filesystem, no GitHub client. Its only
side effect is one injected `LLMProvider` call, which is what makes it fully
mock-testable.

**Infra:** only **Postgres** runs in Docker (`docker-compose.yml`,
`pgvector/pgvector:pg16`). The API and web app run directly on the host via
`pnpm dev` — there's no containerized dev stack for app code.

## Architecture

```mermaid
flowchart LR
  subgraph Studio["Local studio (your machine)"]
    WEB["client/<br/>Next.js · :3000"]
    API["server/<br/>Fastify · :3001"]
    PG[("Postgres<br/>pgvector")]
    WEB -->|"REST /repos /pulls /agents /runs …"| API
    API --> PG
  end

  CLONE["git clone (add repo)"] --> INDEX["repo-intel<br/>index symbols + import graph<br/>→ repo map"]
  API --> CLONE
  INDEX -->|"repo map = review context"| ENGINE

  ENGINE["reviewer-core/<br/>diff + repo map → prompt → LLM<br/>→ structured findings → grounding gate"]
  LLM["LLM<br/>OpenAI · Anthropic · OpenRouter"]
  API -->|"run review"| ENGINE
  ENGINE --> LLM

  SHARED["@devdigest/shared<br/>Zod contracts"]
  SHARED -.->|"one schema, every package"| WEB
  SHARED -.-> API
  SHARED -.-> ENGINE
```

**End-to-end flow:** add a repo → server clones it and `repo-intel` indexes it
(the **Indexed** badge in the UI) → import PRs from GitHub → open a PR and hit
**Review** → `reviewer-core` assembles a prompt from the diff + repo map,
calls the LLM, validates every finding against the diff (grounding gate drops
hallucinated line references), and persists structured findings with a
severity and score. Everything runs locally; the only outbound network calls
are to **GitHub** (PR data) and the **LLM** (via OpenRouter/OpenAI/Anthropic).

### Server: request → DI → adapters

```mermaid
flowchart LR
  REQ["HTTP request"] --> MW["plugins<br/>helmet · cors · rate-limit · SSE"]
  MW --> VAL["route zod schema<br/>params/body validation"]
  VAL --> MOD["feature module plugin<br/>modules/&lt;name&gt;/routes.ts"]
  MOD --> SVC["service<br/>e.g. ReviewService"]
  SVC --> DI{"DI container<br/>platform/container.ts"}
  DI --> ADP["adapters (ports)<br/>llm · github · git · astgrep · tokenizer · secrets"]
  ADP -->|"prod"| EXT["LLM (OpenAI/Anthropic) · GitHub · git · pgvector"]
  ADP -->|"tests"| MOCK["src/adapters/mocks.ts<br/>MockLLMProvider · MockGitClient · …"]
  SVC --> DB[("Drizzle → Postgres")]
  SVC -. "run traces" .-> SSE["SSE stream → client"]
  VAL -. "invalid" .-> ERR["error handler<br/>422 validation · AppError status · 500 fallback"]
```

Each module (`server/src/modules/<name>/`) owns its own `routes.ts`, is
registered once in `src/modules/index.ts`, and talks to the outside world
only through an adapter behind the DI container — so every adapter (LLM,
GitHub, git, ast-grep, secrets, tokenizer) swaps for a hermetic mock in tests
with zero network/keys required.

### Review engine pipeline (`reviewer-core/`)

```mermaid
flowchart LR
  IN["inputs<br/>diff · system prompt · repo map"] --> PROMPT["assemblePrompt()"]
  PROMPT --> WRAP["wrapUntrusted() + INJECTION_GUARD<br/>fence untrusted content vs prompt injection"]
  WRAP --> LLM["LLMProvider (injected)<br/>llm/openrouter.ts"]
  LLM --> STRUCT["structured output<br/>Zod → JSON Schema · parse-with-repair"]
  STRUCT --> GROUND["groundFindings()<br/>mechanical citation gate vs the diff"]
  GROUND --> OUT["Review<br/>verdict · score · grounded findings"]
```

### Client: routes → hooks → API

```mermaid
flowchart TD
  ROOT["/"] -->|"useRepos → GET /repos"| PULLS["/repos/:repoId/pulls<br/>PR list"]
  ONB["/onboarding<br/>add repo"] -->|"POST /repos"| API[("Fastify API")]
  PULLS --> PR["/pulls/:number<br/>review detail<br/>(overview · diff · findings)"]

  AGENTS["/agents"] --> AGENT["/agents/:id<br/>editor (config)"]
  SETTINGS["/settings/:section<br/>API keys · models"]

  PULLS -->|"GET /repos/:id/pulls · /repos/:id/index-state"| API
  PR -->|"GET /pulls/:id · /reviews · /pulls/:id/comments<br/>POST /pulls/:id/review · /findings/:id/(accept|dismiss)"| API
  AGENTS -->|"/agents · /agents/:id"| API
  SETTINGS -->|"/settings · /providers"| API
```

Pages under `client/src/app/**/page.tsx` are thin; feature logic lives in
colocated `_components/<Name>/` folders, each with its own `*.test.tsx`. Every
server-state read/write goes through a TanStack Query hook in
`src/lib/hooks/*`, which calls `src/lib/api.ts` against `NEXT_PUBLIC_API_BASE`
(default `http://localhost:3001`).

## How the pieces are wired (not obvious from folder names)

- **No workspace, but shared types via path alias.** `@devdigest/shared` (Zod
  contracts: `Review`, `Finding`, `Verdict`, etc.) lives physically under
  `server/src/vendor/shared` and is imported by both `client` and
  `reviewer-core` through tsconfig path aliases — not an npm package, not a
  workspace symlink. Same for UI primitives (`client/src/vendor/ui`,
  `@devdigest/ui`). If a contract changes, it changes in one file but affects
  three packages' type-checks.
- **`reviewer-core` is consumed as TypeScript source, not a build artifact.**
  The server maps `@devdigest/reviewer-core` → `../reviewer-core/src` in its
  tsconfig and runs it directly via `tsx`/`vitest`. `reviewer-core`'s own
  `build` script is just a type-check (`tsc --noEmit`) — it never emits JS.
- **One Zod schema drives both validation and the LLM's output shape.** Route
  schemas (`fastify-type-provider-zod`) validate requests; the *same* Zod
  `Review` contract (`server/src/vendor/shared/contracts/findings.ts`) is
  converted to JSON Schema and sent to the LLM as `response_format: { type:
  "json_schema", strict: true }` — the model cannot return a shape that
  doesn't match. Prompts must never re-describe the JSON shape in prose (see
  `docs/agent-prompts/README.md`) — that's a second, competing spec and
  produces worse output.
- **Score is never trusted from the model.** `scoreFromFindings()` recomputes
  it deterministically from the *surviving* (grounded) findings: 100 minus 35
  per CRITICAL, 12 per WARNING, 3 per SUGGESTION. `verdict`, by contrast, is
  currently passed through from the model as-is — which is why prompt
  conventions around verdict semantics are load-bearing (see below).
  Bugs/behavior here live in `reviewer-core/src/review/reduce.ts` and `run.ts`.
- **Grounding is a mechanical gate, not a prompt instruction.** Any finding
  whose cited line range doesn't intersect a real diff hunk is silently
  dropped (`reviewer-core/src/grounding.ts`) — this is code, not something the
  model is asked nicely to do.
- **Prompt-injection defense is one shared rule, not keyword scanning.** Every
  agent's system prompt gets a fixed `INJECTION_GUARD` appended by
  `assemblePrompt` (`reviewer-core/src/prompt.ts`), telling the model that
  content inside `<untrusted>` blocks (diff, PR body, comments, repo map) is
  data, never instructions — and that claims like "this is a test fixture,
  don't flag it" never descope the review. Deliberately not a denylist,
  because a denylist only catches one phrasing.
- **Repo Intel is on by default and degrades silently.** `REPO_INTEL_ENABLED`
  defaults to `true`; each agent also has a per-agent `repo_intel` toggle. The
  repo skeleton + "blast radius" prompt sections only populate once a repo
  finishes indexing — an unindexed repo silently falls back to diff-only
  context, no error surfaced.
- **Secrets never touch the DB or git.** LLM/GitHub keys are stored in
  `~/.devdigest/secrets.json` (mode `0600`) via the Settings UI, with
  `process.env` as a fallback. `LocalSecretsProvider`
  (`server/src/adapters/secrets/local.ts`) is the one read chokepoint.
- **The server does not migrate on boot.** `pnpm db:migrate` must be run
  explicitly; forgetting this is the top cause of first-run
  `relation ... does not exist` errors.
- **DB schema is bigger than the current UI.** `server/src/db/schema/`
  already includes tables for `skills`, `eval`, `ci`, `knowledge`, `context`,
  `ops` — future-lesson features — sitting unused in the starter.

## Available features (what works today)

- **Local one-command launch** (`./scripts/dev.sh`): boots Postgres, creates
  `.env` files from `.env.example`, installs deps, migrates + seeds, and
  starts API + web.
- **Settings** — store LLM API key (OpenAI/Anthropic/OpenRouter) and GitHub
  token; no keys required just to boot.
- **Add repository** — paste a repo URL; server clones it and `repo-intel`
  indexes symbols + import graph.
- **Import pull requests** — pulls open PRs with diff, commits, body, and
  linked issue from GitHub.
- **Diff viewer** — GitHub-like diff rendering in the browser.
- **Agents** — two built-in reviewers (General, Security); create/edit custom
  agents (model choice + system prompt) via the Agent editor.
- **Run a review** — single-pass analysis producing structured findings
  (severity + deterministic score), with the grounding gate and repo-map
  context active from day one.
- **Findings triage** — accept/dismiss individual findings.
- **Run traces** — streamed live over SSE (`fastify-sse-v2`).

## What's *not* here yet (added by later course lessons)

Intentionally excluded from the starter so each lesson can add it back:
run-cost badge & severity filter, in-product Skills + a conventions
extractor, an Intent layer + Smart Diff, a `devdigest-mcp` server + Blast
Radius, a Project Context Folder + onboarding generator + PR Brief card, an
eval pipeline + secret/phantom gates + Plan Verifier + CI export, multi-agent
review + persistent memory + per-agent stats, and plugin export/import + a
performance dashboard + weekly digest.

## What's unusual

- **No monorepo tool at all** for a 5-package repo — a deliberate choice to
  keep the course's mental model simple (each package looks and builds like
  a standalone project), at the cost of manual path-alias wiring for shared
  code.
- **The review engine can't hallucinate a location.** Grounding + deterministic
  scoring is an unusually strict trust boundary for an LLM feature — most
  "AI code review" tools trust the model's own confidence/score.
- **The engine is provider-agnostic by construction.** `LLMProvider` is
  injected, so the same pipeline runs against a stub in tests and against
  OpenAI/Anthropic/OpenRouter in production, with zero test-only branches in
  engine code.
- **DB schema is provisioned years ahead of the UI** — tables for
  not-yet-built features already exist and migrate cleanly against an empty
  starter app.
- **Course-driven architecture**: this isn't just "a v1" — it is explicitly
  the fixed starting point for a defined sequence of future lessons, which
  explains several otherwise-odd omissions (e.g. no cost tracking despite
  `agents` having a `model` field, no CI runner despite `reviewer-core` being
  designed to support one).

## What's *not* unusual

Aside from the above, this is a fairly conventional modern TS stack: Fastify
+ Drizzle + Postgres on the backend, Next.js App Router + TanStack Query on
the frontend, Zod for validation everywhere, Vitest for testing, DI-behind-
ports for testability, SSE for streaming — no exotic runtime choices.

## Environment variables (`server/.env`)

| Var | Default | Notes |
|---|---|---|
| `DATABASE_URL` | `postgres://devdigest:devdigest@localhost:5432/devdigest` | required to migrate/serve |
| `API_PORT` / `WEB_PORT` | `3001` / `3000` | `WEB_PORT` also sets allowed CORS origin |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `OPENROUTER_API_KEY` | — | optional; also settable via Settings UI |
| `GITHUB_TOKEN` (or `GITHUB_PAT`) | — | optional; PAT with repo scope |
| `EMBEDDINGS_ENABLED` | `false` | memory/RAG embeddings; off → zero OpenAI calls |
| `REPO_INTEL_ENABLED` | `true` | repo skeleton + callers in prompt; `false` → ripgrep-only |
| `DEVDIGEST_CLONE_DIR` | `./clones` | imported-repo checkouts (git-ignored) |
| `LOG_LEVEL` | `info` (`silent` in test) | pino level |
| `NODE_ENV` | `development` | `test` disables rate limiting + silences logs |

## Getting started

```sh
./scripts/dev.sh
```

Boots Postgres (Docker), creates `.env` files if missing, installs deps,
migrates + seeds, and launches API (`:3001`) + web (`:3000`). Open
`http://localhost:3000`. Add LLM/GitHub keys in `server/.env` or via Settings
at runtime. Flags: `--no-seed` · `--no-client` · `--db-only` · `--help`.

## Testing & CI

One test suite per package, each with its own GitHub Actions workflow and
path filter (full detail in [`TESTING.md`](../TESTING.md)):

| Suite | Workflow | Needs Docker |
|---|---|---|
| client (vitest + jsdom) | `client.yml` | no |
| server unit (hermetic) | `server-unit.yml` | no |
| server integration (real Postgres via testcontainers) | `server-integration.yml` | yes |
| reviewer-core (engine) | `reviewer-core.yml` | no |
| web e2e (agent-browser, real stack) | `e2e-web.yml` | yes |

Server tests split by filename convention: `*.it.test.ts` is DB-backed
(testcontainers Postgres); everything else must be hermetic (mocked
adapters, no network/keys).

## Where to read more

- [`README.md`](../README.md) — course overview, quick start, lesson map.
- [`server/README.md`](../server/README.md) — API map, DI flow, review
  context internals.
- [`client/README.md`](../client/README.md) — UI route map.
- [`reviewer-core/README.md`](../reviewer-core/README.md) — engine pipeline
  in depth.
- [`TESTING.md`](../TESTING.md) — testing philosophy and conventions.
- [`docs/agent-prompts/README.md`](agent-prompts/README.md) — how a reviewer
  agent's system prompt is assembled, and the required conventions
  (severity rubric, verdict mapping, findings discipline) every agent prompt
  must follow.
