# Architecture Anti-Patterns

Forbid these when writing or reviewing `@devdigest/api` code. Sources: Palermo
dependency rule, Graça / Clean Architecture inward deps, Fastify clean
boilerplates, DevDigest `server/AGENTS.md`.

## 1. Adapter call from a route

**Bad:** `routes.ts` calls `container.git`, `container.secrets`, `container.llm()`,
`container.github()`, or imports `adapters/*`.

**Good:** Route → service method; service uses Container ports.

## 2. Drizzle / `container.db` in a handler

**Bad:** `settings`/`pulls`-style handlers that `select`/`update` in the route.

**Good:** `repository.ts` owns queries; service coordinates.

## 3. Concrete adapter construction in a service

**Bad:** `new OctokitGitHubClient(...)` or `new SimpleGitClient(...)` inside a
feature service for production paths.

**Good:** `container.github()` / `container.git` (wired in composition root).
Tests inject mocks via `ContainerOverrides`.

## 4. Importing `adapters/*` from routes

**Bad:** `import { SimpleGitClient } from '../../adapters/git/simple-git.js'` in
`routes.ts`.

**Good:** No adapter imports in routes. Ports live in `@devdigest/shared`.

## 5. Fat route (business rules in HTTP layer)

**Bad:** Handler validates ad hoc, clones a repo, updates DB, and formats a DTO.

**Good:** Thin handler; service owns the use case; repository/adapters at the
edge.

## 6. Re-parsing bodies after route schema validation

**Bad:** Schema already on the Fastify route, then `RunRequest.parse(req.body)`
again in the handler (unless there is a deliberate second boundary).

**Good:** Trust the type-provider / route schema; parse only at true boundaries.

## 7. Secrets via `AppConfig` / `process.env` in feature code

**Bad:** Reading API keys from config objects in modules.

**Good:** `SecretsProvider` through Container (`adapters/secrets/local.ts`).

## 8. Cross-module folder reach-ins

**Bad:** Importing another module’s private `repository.ts` implementation
details instead of shared Container repos or a defined service API.

**Good:** `container.agentsRepo` / `container.reviewRepo` or an explicit service
collaboration.

## 9. Copying leaky legacy modules

**Bad:** Using `settings`/`polling`/`workspace` fat-route style as a template
for a new feature.

**Good:** Copy `repos` / `agents` / `reviews` structure: `routes` + `service` +
`repository`.

## 10. Putting domain rules in adapters

**Bad:** Git or LLM adapter decides product policy (who may review, scoring
rules).

**Good:** Adapters translate I/O; services/domain helpers own policy
(`groundFindings`, agent toggles, etc. stay in platform/modules).
