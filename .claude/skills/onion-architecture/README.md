# Onion Architecture Skill (Backend)

**Version:** 1.0.0

Agent skill that **enforces** Onion / ports-and-adapters layering for DevDigest’s
Fastify API (`server/` / `@devdigest/api`):

- **Route → service → domain/ports** via the DI `Container`
- **Adapters** (git, secrets, code index, LLM, GitHub, …) and **Drizzle
  repositories** only at the outer edge
- **Dependencies point inward** — never call an adapter or `container.db` from a
  route for business work

This skill maps researched Onion/Clean Architecture practices onto the
existing module layout. It does **not** require a greenfield `src/domain/` tree
or a new DI library (keep the hand-rolled `Container`).

## Usage

Agents: load `SKILL.md`, then open the relevant `references/` file.

Humans: use this README for the source list; use `SKILL.md` for the checklist.

## File structure

```text
onion-architecture/
├── SKILL.md
├── README.md                 # This file + bibliography
├── metadata.json             # Version + reference URLs
└── references/
    ├── layers-and-dependency-rule.md
    ├── request-flow.md
    ├── adapters-and-container.md
    ├── persistence-drizzle.md
    └── anti-patterns.md
```

## Themes covered

1. Concentric layers and the inward dependency rule
2. Fastify routes as thin delivery adapters
3. Services as application/use-case orchestration
4. Ports in `@devdigest/shared`; adapters under `src/adapters/`
5. Composition root (`platform/container.ts`) and test overrides
6. Drizzle confined to repositories
7. Anti-patterns (adapter-in-route, db-in-handler, concrete `new` in services)

## References

### Onion / Clean / Hexagonal (canonical)

1. [Jeffrey Palermo — The Onion Architecture: Part 1](https://jeffreypalermo.com/2008/07/the-onion-architecture-part-1/)
2. [Herberto Graça — Onion Architecture](https://herbertograca.com/2017/09/21/onion-architecture/)
3. [Herberto Graça — DDD, Hexagonal, Onion, Clean, CQRS…](https://herbertograca.com/2017/11/16/explicit-architecture-01-ddd-hexagonal-onion-clean-cqrs-how-i-put-it-all-together/)
4. [Robert C. Martin — The Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
5. [NDepend — Onion Architecture: Going Beyond Layers](https://blog.ndepend.com/onion-architecture-layers/)
6. [Design Patterns in Action — Onion Architecture](https://designpatternsinaction.com/enterprise/onion-architecture)
7. [TMS — What Is Onion Architecture?](https://tms-outsource.com/blog/posts/onion-architecture/)

### Node / Fastify / DI

8. [Remo Jansen — Onion Architecture in Node.js + TypeScript + InversifyJS](https://dev.to/remojansen/implementing-the-onion-architecture-in-nodejs-with-typescript-and-inversifyjs-10ad) — apply DIP/DI ideas to the hand-rolled `Container`; do not adopt Inversify for this repo
9. [marcoturi/fastify-boilerplate](https://github.com/marcoturi/fastify-boilerplate/) — Route → Handler → Domain → Repository; inward dependencies
10. [Mamunahmedbd/fastify-boilerplate](https://github.com/Mamunahmedbd/fastify-boilerplate) — Clean Architecture + Fastify DI notes

### Persistence / Drizzle as outer adapter

11. [Paul Serban — Drizzle ORM Best Practices (repository as adapter)](https://www.paulserban.eu/blog/post/drizzle-orm-best-practices-principles-patterns-and-real-world-case-studies/)
12. [Sentry — Atomic Repositories in Clean Architecture and TypeScript](https://blog.sentry.io/atomic-repositories-in-clean-architecture-and-typescript/)

### In-repo grounding

- [`server/AGENTS.md`](../../../server/AGENTS.md) — module layout, DI, secrets, Zod-on-routes
- [`server/README.md`](../../../server/README.md) — request & DI flow

### Related in-repo skills (not duplicated here)

- `.claude/skills/fastify-best-practices` — Fastify APIs
- `.claude/skills/drizzle-orm-patterns` — Drizzle query/schema patterns
- `.claude/skills/zod` — Zod validation rules
- `.claude/skills/frontend-ui-architecture` — client folder architecture

## Repo conventions this skill encodes

Feature modules under `src/modules/<name>/` (`routes` + `service` +
`repository`), static registry in `src/modules/index.ts`, adapters behind
`src/platform/container.ts`, ports in `@devdigest/shared`.
