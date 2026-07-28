# DevDigest

Local-first AI pull-request review tool. Course starter template — a
minimal-but-complete slice ("import a PR, run an agent review") that later
course lessons extend one feature at a time. Full context:
[`README.md`](README.md) · [`docs/ONBOARDING.md`](docs/ONBOARDING.md) ·
[`TESTING.md`](TESTING.md).

## Structure — no monorepo tooling

**Not** an Nx/Turborepo/pnpm-workspace repo. Five standalone packages, each
with its own `package.json` + lockfile. Cross-package sharing is via
**tsconfig path aliases**, not published packages — see each module's
CLAUDE.md before assuming a shared-package convention applies.

| Folder | Package | Docs |
|---|---|---|
| `server/` | `@devdigest/api` (Fastify + Drizzle/Postgres) | [`server/CLAUDE.md`](server/CLAUDE.md) · [`server/README.md`](server/README.md) |
| `client/` | `@devdigest/web` (Next.js 15) | [`client/CLAUDE.md`](client/CLAUDE.md) · [`client/README.md`](client/README.md) |
| `reviewer-core/` | `@devdigest/reviewer-core` (pure review engine) | [`reviewer-core/CLAUDE.md`](reviewer-core/CLAUDE.md) · [`reviewer-core/README.md`](reviewer-core/README.md) |
| `e2e/` | `@devdigest/e2e` (browser e2e) | [`e2e/CLAUDE.md`](e2e/CLAUDE.md) · [`e2e/README.md`](e2e/README.md) |

Only **Postgres** runs in Docker (`docker-compose.yml`). API and web run on
the host via `pnpm dev`.

## Build / run / test

```sh
./scripts/dev.sh          # Postgres + migrate + seed + API :3001 + web :3000
cd server && pnpm test     # unit + integration (see server/CLAUDE.md)
cd client && pnpm test
cd reviewer-core && npm test
cd e2e && ./scripts/e2e.sh # hermetic browser e2e, isolated ports
```

Prereqs: Node ≥ 22, pnpm ≥ 10, Docker (Postgres only).

## Non-default conventions

- **Migrations don't run on boot.** `cd server && pnpm db:migrate` explicitly,
  or first-run requests fail with `relation ... does not exist`.
- **Secrets never go through `process.env`/`AppConfig` in feature code.** They
  live in `~/.devdigest/secrets.json` (mode `0600`) behind one chokepoint,
  `LocalSecretsProvider`. No keys are required just to boot.
- **`@devdigest/shared` (Zod contracts) is vendored, not a workspace package.**
  It lives at `server/src/vendor/shared` and both `client` and
  `reviewer-core` reach it via tsconfig path aliases. Same for
  `@devdigest/ui` (`client/src/vendor/ui`). Changing a contract changes it in
  one physical file but affects multiple packages' type-checks.
- **`reviewer-core` is consumed as TypeScript source**, not a build artifact —
  its `build` script is just `tsc --noEmit`.

## Do-not-touch / gotchas

- Never `docker compose down -v` to "reset" — it deletes the `devdigest_pgdata`
  volume along with every imported repo/review. See Troubleshooting in
  [`README.md`](README.md).
- `server/package.json` is `git skip-worktree` locally — CI inlines raw
  `pnpm exec vitest run ...` rather than relying on committed test scripts.
  Don't assume adding an npm script there changes CI behavior.
- DB schema already has tables for unbuilt features (`skills`, `eval`, `ci`,
  `knowledge`, `context`, `ops`, …) — empty until a future lesson fills them.
  Don't "clean up" what looks like dead schema.
