# Layers and Folders (DevDigest Client)

Version notes apply to `@devdigest/web` (`client/`). There is no single correct
global folder tree — structure should scale with the app and prefer colocation
(Kent C. Dodds, Josh Comeau, Robin Wieruch, Next.js docs). This repo already
chose a hybrid: thin App Router pages + route-colocated feature UI + shared
lib/hooks and vendor primitives.

## Target tree

```text
client/src/
├── app/                         # Routes only — composition, layouts, metadata
│   └── <route>/
│       ├── page.tsx             # Thin shell (readable in ~30s)
│       └── _components/<Name>/  # Feature/route UI + *.test.tsx
├── components/                  # Cross-route domain UI (app-shell, diff-viewer)
├── lib/
│   ├── api.ts                   # HTTP boundary to the API
│   └── hooks/                   # TanStack Query / domain orchestration
├── i18n/                        # next-intl wiring
├── test/                        # Test helpers for this package
└── vendor/
    ├── ui/                      # @devdigest/ui primitives (no domain copy)
    └── shared/                  # Path to @devdigest/shared contracts
```

## Layer meanings (mapped from FSD / Bulletproof / Makerkit)

| Layer (concept) | DevDigest location | Responsibility |
|---|---|---|
| App / routes | `src/app/**` | URL → UI composition. No business rules in `page.tsx`. |
| Feature / page slice | `app/**/_components/<Name>/` | Route-owned UI, local helpers, colocated tests. |
| Widgets / chrome | `src/components/` | Multi-route domain UI (shell, diff viewer). |
| Shared UI kit | `src/vendor/ui` | Domain-agnostic primitives. |
| API / infrastructure | `src/lib/api.ts` | Fetch/transport only. |
| Model / orchestration | `src/lib/hooks/*` | Server state, mutations, domain hooks. |
| Contracts | `@devdigest/shared` (vendored) | Zod schemas and shared types. |

Do **not** introduce a greenfield top-level `features/` rename. Treat
`_components/<Name>/` as the feature slice for that route.

## Next.js placement rules

From [Next.js Project Structure](https://nextjs.org/docs/app/getting-started/project-structure):

- Folders define routes; only `page` / `route` make a URL public.
- Colocate non-route files under the segment safely.
- Prefer private folders `_folder` for implementation details
  (DevDigest: `_components`).
- Route groups `(group)` organize layouts without changing URLs.
- Code may live outside `app` (`components/`, `lib/`) — this repo does both:
  route UI inside `app`, shared/domain chrome and data layer outside.

## Progression (when reviewing or growing the tree)

1. **Flat** — fine for tiny prototypes; avoid in this package.
2. **Type-based** (`components/`, `hooks/`, `utils/` only) — works early, then
   scatters one feature across many folders (Wieruch, Web Dev Simplified, profy.dev).
3. **Feature / route-based** — group by product slice; DevDigest uses
   `_components` + shared `lib/hooks` for cross-cutting data.
4. **FSD-style layers** — borrow dependency direction and segments
   (`ui` / `api` / `model` / `lib`), not necessarily FSD folder names.

## Concrete examples

- Agents list: `app/agents/page.tsx` + `app/agents/_components/AgentsListView/`
- Agent card: `app/agents/_components/AgentCard/`
- Shell chrome: `components/app-shell/`
- Data hooks: `lib/hooks/agents.ts`, `lib/hooks/reviews.ts`
- Primitives: `vendor/ui/primitives`, `vendor/ui/kit`
