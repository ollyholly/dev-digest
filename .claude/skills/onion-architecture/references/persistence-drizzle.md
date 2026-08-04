# Persistence (Drizzle) as an Outer Adapter

Drizzle ORM and Postgres are infrastructure. In Onion / Clean Architecture they
belong on the outer ring (Paul Serban; Sentry atomic repositories). Domain and
application code talk to **repositories**, not to `db.select` directly.

## Placement

| Concern | Location |
|---|---|
| Connection / `Db` type | `src/db/client.ts` |
| Table schemas / migrations | `src/db/schema/`, drizzle migrations |
| Feature persistence API | `modules/<feature>/repository.ts` |
| Cross-cutting entity repos | Constructed on `Container` (`agentsRepo`, `reviewRepo`) |
| Use-case orchestration | `modules/<feature>/service.ts` |

## Rules

1. **Only repositories** (and the composition root when constructing them) import
   Drizzle schema tables and run queries.
2. **Services** call repository methods named in domain language
   (`findById`, `insertRun`, `listForRepo`) — not raw SQL builders.
3. **Routes** never touch `container.db` or schema imports.
4. Keep schema in `src/db/schema` — unused future-lesson tables are intentional;
   do not “clean up” empty feature tables (`server/AGENTS.md`).
5. Prefer returning domain-shaped / contract-shaped data from repos; avoid
   leaking Drizzle row types deep into HTTP responses without mapping.

## Transactions

When multiple repos must commit atomically, keep transaction scope in the
**service** (or a unit-of-work helper), and pass a tx handle into repository
methods if needed — do not open transactions inside route handlers (Sentry /
Clean Architecture guidance). Prefer patterns already used in this codebase
when extending them.

## Testing

- Unit tests: mock repositories or use `ContainerOverrides`; no Docker.
- DB-backed tests: must be named `*.it.test.ts` (testcontainers).

## Sibling skill

SQL/schema idioms → `drizzle-orm-patterns`. This file only answers **where**
Drizzle is allowed to appear.
