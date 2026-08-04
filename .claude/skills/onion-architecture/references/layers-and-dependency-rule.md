# Layers and the Dependency Rule

**Version notes:** Applies to `@devdigest/api` (`server/`). Codifies Onion /
ports-and-adapters principles (Palermo, Graça, Uncle Bob) onto the existing
module layout — **not** a greenfield `src/domain/` package rewrite.

## The rule

All coupling points **inward**. Outer code may depend on inner abstractions;
inner code must not depend on outer concrete infrastructure.

Inner layers define **ports** (interfaces). Outer layers provide **adapters**
(implementations). The composition root wires them at runtime.

## DevDigest ring map

```text
server/src/
├── modules/<feature>/
│   ├── routes.ts          # OUTER — Fastify HTTP delivery
│   ├── service.ts         # APPLICATION — use cases / orchestration
│   ├── repository.ts      # OUTER — Drizzle persistence adapter
│   └── helpers.ts         # optional pure helpers for the feature
├── platform/
│   └── container.ts       # COMPOSITION ROOT — constructs adapters, repos
├── adapters/              # OUTER — git, secrets, github, llm, codeindex, …
├── db/                    # OUTER — Drizzle client + schema
└── vendor/shared/
    └── adapters.ts        # INNER — port interfaces (@devdigest/shared)
```

| Onion / Clean concept | DevDigest home |
|---|---|
| Delivery (HTTP) | `modules/*/routes.ts` |
| Application / use cases | `modules/*/service.ts` (+ e.g. `run-executor.ts`) |
| Domain + port interfaces | Port types in `@devdigest/shared`; domain rules in services or small helpers |
| Infrastructure adapters | `src/adapters/**` |
| Persistence adapter | `modules/*/repository.ts` |
| Composition root / IoC | `platform/container.ts` → `app.container` |

## What each ring may know

| Ring | May import / call | Must not |
|---|---|---|
| Routes | Service, Zod route schemas, `getContext`, HTTP/status helpers | `adapters/*`, `db` queries, `container.git` / `.secrets` / `.llm` / `.db` for business work |
| Services | Port types, repositories, `Container` port getters, pure helpers | Concrete adapter classes (`SimpleGitClient`, `OctokitGitHubClient`, …) |
| Repositories | `Db`, Drizzle schema, domain-shaped DTOs | Fastify, LLM, git, secrets, HTTP |
| Adapters | External SDKs, port interfaces they implement | Feature `routes.ts` / calling back into HTTP |
| Container | All adapter constructors, shared repos | — (this is the only place that “knows everyone”) |

## Good exemplars in this repo

- `modules/repos` — routes → `RepoService` → repository + jobs / git via container
- `modules/agents`, `modules/reviews` — services orchestrate; repos persist

## Known leaks (do not copy)

Some older modules (`settings`, `pulls`, `polling`, `workspace`) still use
`container.db` or adapters from routes. When you **touch** them, move work into
a service. For **new** code, always follow the good path.
