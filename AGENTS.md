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

Each of `client/`, `server/`, and `reviewer-core/` owns package-local
`docs/` (reference) and `specs/` (planning contracts). `e2e/specs/` is
**flow tests only** — planning specs for product changes live in the
sibling packages; see [`e2e/docs/`](e2e/docs/README.md).

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

## Session Protocol

- **Before your first response**, read the `INSIGHTS.md` of whichever
  module(s) the request concerns (`client/`, `server/`, `reviewer-core/`,
  `e2e/`) and treat its contents as high-confidence guidance unless told
  otherwise. See [`.claude/skills/engineering-insights/SKILL.md`](.claude/skills/engineering-insights/SKILL.md).
- **At the end of a substantive session**, record any new, non-obvious
  finding to that module's `INSIGHTS.md` — append-only, skip if already
  present, skip entirely if nothing new was learned.

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
- **Lockfiles** (`**/pnpm-lock.yaml`, `**/package-lock.json`,
  `skills-lock.json`) — never hand-edit; only update via the package manager
  (`pnpm install` / `npm install`) when dependencies intentionally change.
- **Migrations** (`server/src/db/migrations/**`) — never edit committed
  migration SQL; schema changes go through Drizzle generate → a **new**
  migration file.

## Cursor Cloud specific instructions

Dependencies are refreshed automatically on VM startup by the update script
(`pnpm install` in `server/` + `client/`, `npm ci` in `reviewer-core/` +
`e2e/`). Standard build/run/test commands live in [`README.md`](README.md),
[`TESTING.md`](TESTING.md), and each package's docs — use those. Only the
non-obvious, cloud-specific caveats are below.

- **Docker has no systemd here.** Postgres runs in Docker, but this VM has no
  init system, so the daemon is not auto-started. Start it once per session with
  `sudo dockerd` inside a background tmux session; the socket is world-usable, so
  plain `docker` / `docker compose` then work without `sudo`.
- **Bring the stack up** with `./scripts/dev.sh` (Postgres → migrate → seed →
  API `:3001` + web `:3000`). It runs in the foreground, so launch it in tmux.
  `./scripts/dev.sh --db-only` does just Postgres + migrate + seed; then run
  `pnpm dev` in `server/` and `client/` in their own tmux panes if you want them
  separated. Seeded data (repo `acme/payments-api`, PR #482 with a review +
  findings, three built-in agents) lives in the `devdigest_pgdata` Docker volume
  and survives daemon restarts, so migrate/seed are usually already applied.
- **Do not reinstall deps while the API dev server is running.** `server`'s
  `tsx watch` also watches `reviewer-core/node_modules` (it imports
  `reviewer-core` as TS source). `pnpm install` / `npm ci` wipes that tree and
  the API crashes mid-restart with `ERR_MODULE_NOT_FOUND`. Reinstall first, then
  start `pnpm dev`.
- **`pnpm install` is noisy but harmless.** With `node-linker=hoisted` it
  reports removing/re-adding ~130 packages on every run and prints "Ignored build
  scripts" (esbuild/sharp/…). The resulting tree is fully functional
  (typecheck/tests/servers all pass) — no need to run `pnpm approve-builds`.
- **No API keys are needed to boot, run tests, or exercise the UI.** LLM
  (OpenAI/Anthropic/OpenRouter) and GitHub keys are only required to import real
  PRs or run an actual review. The seeded diff/findings/agents cover the UI
  without any keys.
- **Server integration tests need Docker** (`*.it.test.ts` start their own
  testcontainers Postgres). Run the split as `pnpm exec vitest run --exclude
  '**/*.it.test.ts'` (unit) and `pnpm exec vitest run .it.test` (integration).
