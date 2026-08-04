# Request Flow

Canonical flow for `@devdigest/api` (aligns with Fastify clean-architecture
boilerplates: Route → Handler/Service → Domain/ports → Repository).

## Happy path

```text
HTTP request
    │
    ▼
modules/<feature>/routes.ts
    │  Zod schema on route (params/body) — invalid → 422 before handler
    │  getContext(req) for tenancy/auth
    │  ONE service method call
    │  Map domain/app errors → status codes
    ▼
modules/<feature>/service.ts
    │  Orchestrate use case
    │  Apply domain rules
    │  Call repositories and/or container ports (GitClient, SecretsProvider, …)
    ▼
repository.ts  and/or  Container ports → adapters
    │
    ▼
Postgres / git / GitHub / LLM / secrets / ripgrep …
```

## Route responsibilities (only)

1. Declare Fastify route + Zod schemas (do not hand-roll `Schema.parse(req.body)`
   when the schema is already on the route — see `server/AGENTS.md`).
2. Resolve request context (`getContext` from `modules/_shared/context.ts`).
3. Call **one** service method with validated input + context.
4. Translate results and errors to HTTP (status, body, SSE kickoff if needed).

Routes are delivery adapters. They are not the place for clone logic, secret
reads, Drizzle queries, or LLM calls.

## Service responsibilities

1. Express the use case in domain language (`addRepo`, `runReview`, …).
2. Depend on **ports** (`GitClient`, `SecretsProvider`, `LLMProvider`, …) and
   **repositories**, typically via `Container` or constructor injection.
3. Keep orchestration testable with `ContainerOverrides` / `adapters/mocks.ts`.
4. May contain pure domain helpers or call feature `helpers.ts`.

## Example: add repo

`POST /repos` → `modules/repos/routes.ts` → `RepoService.add` →
`RepoRepository` + job enqueue → background work uses `container.git` /
`container.secrets` **from the job/service path**, not from the route handler.

## Example: run review

`POST /pulls/:id/review` → `modules/reviews/routes.ts` →
`ReviewService.runReview` → executor uses repos + `container.llm` +
`reviewer-core` — still not from the route body beyond starting the use case.

## Anti-flow (forbidden)

```text
routes.ts ──► container.git.clone(...)     ✗
routes.ts ──► container.db.select(...)     ✗
routes.ts ──► import from adapters/git     ✗
routes.ts ──► new OctokitGitHubClient(...) ✗
```

If a handler needs that capability, add or extend a **service** method and call
that instead.
