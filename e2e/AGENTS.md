# `@devdigest/e2e` — browser e2e

Deterministic UI flows for the web app, driven by
[Vercel agent-browser](https://github.com/vercel-labs/agent-browser) (native
Rust + CDP CLI). No Playwright, no LLM, no API key. Full detail:
[`README.md`](README.md) · [`../TESTING.md`](../TESTING.md).

## Stack

`agent-browser` CLI (installed globally, downloads Chrome for Testing) +
`run.ts`, a thin runner that executes JSON flow specs in order against one
shared browser session.

## Build / run / test

```sh
npm i -g agent-browser && agent-browser install   # once

./scripts/e2e.sh                # hermetic: isolated Postgres/API/web ports,
                                 # freshly seeded, torn down after — RECOMMENDED
# or, against your own running dev stack (only if its DB has ONLY the seeded repo):
./scripts/dev.sh && cd e2e && npm install && npm test
```

## Structure

One JSON spec per flow: `specs/NN-name.flow.json`, each a list of
`agent-browser` commands (`{cmd, label}`). `{BASE}` → `E2E_BASE_URL`. A
non-zero command exit fails the step — `wait --text` / `wait --url` **are**
the assertions. Locators are deterministic only (`--url`, `--text`,
`find role|text|label`) — the AI `chat` command is never used, so runs stay
stable and key-free.

## Non-default conventions

- Flows target **read-only seeded data** (demo repo `acme/payments-api`, PR
  #482) — nothing in this suite triggers a model call.
- Flow `02` (and `04`/`05`) assume the seeded demo repo is the **only** repo
  in the DB (they follow the home redirect to the first repo). This holds in
  CI (`e2e-web.yml` seeds an empty DB) but usually **not** in your local dev
  DB once you've imported real repos — hence the hermetic runner default.

## Do-not-touch / gotchas

- **Never `docker compose down -v`** to reset for e2e — it deletes the
  `devdigest_pgdata` volume and every real repo/review you've imported. Use
  `./scripts/e2e.sh`, which runs its own ephemeral, port-isolated Postgres and
  never touches your dev stack.
- Failure screenshots go to `e2e/test-results/` (git-ignored, uploaded as a CI
  artifact) — don't commit them.
