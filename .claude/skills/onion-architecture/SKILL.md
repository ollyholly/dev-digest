---
name: onion-architecture
description: >-
  DevDigest backend Onion / ports-and-adapters architecture for @devdigest/api:
  enforce route → service → domain/ports via Container; keep git, secrets,
  code index, LLM, GitHub, and Drizzle behind adapters/repositories at the edge;
  dependencies point inward. Use when adding or changing Fastify modules,
  deciding where routes/services/repositories/adapters belong, wiring the DI
  Container, reviewing backend layering, or preventing adapter/DB calls from
  routes. Do NOT use for Fastify plugin APIs (fastify-best-practices), Drizzle
  SQL idioms (drizzle-orm-patterns), Zod rule catalogs (zod), or performance.
---

# Onion Architecture (Backend)

**Version:** 1.0.0

Enforces layering for `@devdigest/api` (`server/`). Focus: **dependency
direction** and **where code may call what** — not Fastify/Drizzle tutorials.

## Hard rules

1. **Route:** Zod schema → `getContext` → **one** service call → map HTTP status.
2. **Service:** orchestration + domain rules; depends on **ports/repos**, not
   concrete adapter classes.
3. **Repository:** only Drizzle / SQL; no HTTP, LLM, or git.
4. **Adapter:** implements a shared port; constructed in `Container` (or mocks).
5. **Never** import `adapters/*` or call `container.git` / `.secrets` / `.llm` /
   `.db` for business work from `routes.ts`.
6. **New code** always follows `repos` / `agents` / `reviews`. When touching
   leaky modules (`settings`, `pulls`, `polling`, `workspace`), move work into
   a service instead of extending the leak.

## Decision workflow

1. **Identify the ring** (HTTP, application, ports/domain, infrastructure).
   → [references/layers-and-dependency-rule.md](references/layers-and-dependency-rule.md)

2. **Wire the request** route → service → ports/repos.
   → [references/request-flow.md](references/request-flow.md)

3. **External I/O** (git, secrets, index, LLM, GitHub) via Container ports.
   → [references/adapters-and-container.md](references/adapters-and-container.md)

4. **Persistence** only in repositories.
   → [references/persistence-drizzle.md](references/persistence-drizzle.md)

5. **Scan anti-patterns** before merging.
   → [references/anti-patterns.md](references/anti-patterns.md)

## Quick defaults

| Need | Home |
|---|---|
| New HTTP endpoint | `modules/<feature>/routes.ts` (thin) |
| Use case | `modules/<feature>/service.ts` |
| SQL / Drizzle | `modules/<feature>/repository.ts` |
| Port interface | `@devdigest/shared` (`vendor/shared/adapters.ts`) |
| Port implementation | `src/adapters/<name>/` + register in `platform/container.ts` |
| Test doubles | `adapters/mocks.ts` + `ContainerOverrides` |

## Out of scope (sibling skills)

| Concern | Skill |
|---|---|
| Fastify plugins, hooks, lifecycle | `fastify-best-practices` |
| Drizzle schema/query idioms | `drizzle-orm-patterns` |
| Zod validation quality rules | `zod` |
| Frontend UI folder architecture | `frontend-ui-architecture` |

## Sources

Full bibliography: [README.md](README.md).
