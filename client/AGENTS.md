# `@devdigest/web` — client

Next.js 15 (App Router) + React 19 studio UI: import repos, browse PRs, run
and read AI reviews, author agents. Full detail: [`README.md`](README.md) ·
[`../TESTING.md`](../TESTING.md).

## Stack

Next.js 15 App Router, React 19, TanStack Query (all server state),
`next-intl` (messages in `messages/<locale>/*.json`), Tailwind 4, `recharts`,
`mermaid`, `react-markdown`. Vitest + jsdom + Testing Library for tests.

## Build / run / test

```sh
pnpm dev         # :3000
pnpm build
pnpm test        # vitest + jsdom, fetch mocked — no API/browser needed
pnpm typecheck
```

## Structure

Pages (`src/app/**/page.tsx`) are thin; feature logic lives in colocated
`_components/<Name>/` folders, each with its own `*.test.tsx`. Every
server-state read/write goes through a hook in `src/lib/hooks/*`, which calls
`src/lib/api.ts` against `NEXT_PUBLIC_API_BASE` (default
`http://localhost:3001`). Cross-cutting chrome (nav, breadcrumbs, shortcuts)
lives in `src/components/app-shell`.

**Knowledge:** [`docs/`](docs/README.md) (read when promoting durable
reference) · [`specs/`](specs/README.md) (read/write when planning a
multi-file UI feature).

## Non-default conventions

- **No third-party component library.** UI primitives are an in-house kit
  vendored at `src/vendor/ui` (`@devdigest/ui`), not MUI/Chakra/shadcn.
- **Shared contracts are vendored, not workspace-linked.** `@devdigest/shared`
  (Zod schemas: `Review`, `Finding`, `Verdict`, …) lives physically at
  `server/src/vendor/shared` and is reached here via a tsconfig path alias —
  changing a contract means editing that one file, not a package in
  `client/`.
- Real browser journeys (client + API + seeded DB) are covered by
  [`../e2e`](../e2e/README.md), not by anything in this package — don't try
  to add Playwright-style browser tests here.

## Do-not-touch / gotchas

- `pnpm test` mocks `fetch` — it never talks to a running API. If a test
  seems to need live data, it's testing the wrong layer.
- i18n message bundles exist for several not-yet-built features (blast,
  brief, conformance, eval, memory, skills, ci, agentPerformance) — the
  catalog is ahead of the UI by design.
- **`pnpm-lock.yaml`** — never hand-edit; only update via `pnpm install` when
  dependencies intentionally change.
