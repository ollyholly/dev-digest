# Preflight and always-on gotchas

Run after collecting the changed-file set, before loading review skill bodies.
Do not reinstall dependencies. Do not start Docker unless integration tests
are required by the diff.

## Mechanical preflight (touched packages only)

Failures caused by the diff are **critical** (ids like
`preflight-client-typecheck-1`). If failure looks environmental (missing
Postgres, corrupt `node_modules`), document it, ask the user, and do not
treat it as a silent PASS.

### `client/**` touched

Prefer typecheck first:

```sh
cd client && pnpm typecheck
```

Also run tests when test files changed or when typecheck is clean and the
diff is small enough that `pnpm test` is practical:

```sh
cd client && pnpm test
```

### `server/**` touched

```sh
cd server && pnpm typecheck
```

Unit tests (exclude integration by default):

```sh
cd server && pnpm exec vitest run --exclude '**/*.it.test.ts'
```

If the diff changes `*.it.test.ts` or clearly needs a live DB, run
integration only when Docker/Postgres is already available:

```sh
cd server && pnpm exec vitest run .it.test
```

Do not start `dockerd` solely for this gate unless the user asked for
integration coverage.

### `reviewer-core/**` touched

```sh
cd reviewer-core && npm run typecheck
cd reviewer-core && npm test
```

### Multiple packages

Run each touched package’s preflight. Aggregate failures into separate
finding rows.

## Always-on gotcha checks

Scan the diff (and for lockfiles, the name-only list) independent of skill
routing. Confirmed hits are usually **critical**.

| Check | What to look for | Example ID |
|---|---|---|
| Secrets in diff | API keys, tokens, private key material, `~/.devdigest/secrets.json` contents | `gotcha-secret-in-diff-1` |
| Secrets via env in feature code | New `process.env` / `AppConfig` reads for secrets in feature code (LLM/GitHub keys must go through `LocalSecretsProvider`) | `gotcha-secret-env-1` |
| Migration rewrite | Edits to **existing** files under `server/src/db/migrations/**` (new migration files from Drizzle generate are OK) | `gotcha-migration-edit-1` |
| Volume wipe | Scripts/docs/commands that run `docker compose down -v` | `gotcha-compose-down-v-1` |
| Hand-edited lockfiles | Direct edits to `**/pnpm-lock.yaml`, `**/package-lock.json`, `skills-lock.json` without a corresponding package-manager install intent | `gotcha-lockfile-1` |

### Notes

- Boot-time config that already documents non-secret env (ports, `DATABASE_URL`
  for local Docker) is not automatically critical — flag **secret** material
  and new secret channeling through `process.env` in feature modules.
- Never suggest `docker compose down -v` as a fix.
- Empty future-lesson tables in schema are intentional — do not flag as dead
  code in this gate.
