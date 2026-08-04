# Placement Decision Table

Use this when deciding where a new file belongs. Prefer colocation: a module
should live as close as possible to its only consumer (Kent C. Dodds; freeCodeCamp
Next architecture; Josh Comeau). Promote only after a second real consumer —
never “just in case” (Paulund, DevCraftly, Bulletproof React).

## Master table

| Kind of code | Put it here | Promote when |
|---|---|---|
| Route / feature UI | `app/.../_components/<Name>/` | Used by 2+ unrelated routes → `src/components/` |
| App chrome / multi-route widgets | `src/components/` | Truly domain-agnostic primitive → `vendor/ui` |
| UI primitives (Button, Input, …) | `vendor/ui` (`@devdigest/ui`) | Never put product copy or domain rules here |
| Server state + domain orchestration | `lib/hooks/*` calling `lib/api.ts` | — |
| Pure formatters / generic helpers | Next to sole consumer; shared only if domain-agnostic | 2nd real consumer → `lib/` util |
| Feature-only constants | Inside `_components/<Name>/` (e.g. `constants.ts`) | App-wide config only |
| Domain types / API contracts | `@devdigest/shared` (vendored) | Do not duplicate local interfaces |
| Business / stateful logic | Hooks + pure functions outside JSX | Keep `page.tsx` as composition only |
| Colocated tests | Same folder as the unit (`*.test.tsx`) | — |
| i18n strings | `messages/<locale>/…` via next-intl | — |

## Business logic layering

Split by responsibility (React custom hooks docs; Makerkit; Onishi playbook):

| Concern | Home | Notes |
|---|---|---|
| Rendering / markup | Components | Pure presentational where possible |
| State, effects, sync with external systems | Custom hooks (`use*`) | Extract when logic is named intent, not implementation detail |
| Pure domain rules (no React) | Plain functions next to feature or in feature helper | Test without rendering |
| HTTP / transport | `lib/api.ts` (+ thin wrappers in hooks) | Components do not call `fetch` directly |
| Shared contracts | `@devdigest/shared` | Validate at the API boundary |

## Components: when to split

From Thinking in React + SRP heuristics (Comeau, Wieruch, Code With Seb):

- Split when a block has a clear name and reusable boundary.
- Apply the “and” test: “this component fetches **and** formats **and**
  renders three unrelated panels” → split.
- Prefer composition (`children` / slots) over prop bags.
- One primary export per feature folder; small private helpers may stay in-file.

## Constants vs utils vs helpers

| Term | Meaning in this skill | Placement |
|---|---|---|
| **Constants** | Fixed values (enums-like maps, limits, query keys owned by a feature) | Colocate with owner; avoid mega `constants/` dumps |
| **Utils** | Domain-agnostic pure functions (dates, `cn`, string helpers) | Shared `lib/` only after reuse; otherwise next to consumer |
| **Helpers** | Feature-aware pure helpers (shape a Review for a view) | Inside the feature / `_components` folder |

Josh Comeau’s guidance: avoid a junk-drawer `utils` that mixes unrelated
helpers; name files by purpose and keep them near the code that needs them.

## Custom hooks

From [Reusing Logic with Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks):

- Extract when you can name the intent (`useAgentsList`, `useReviewTrace`).
- Share **logic**, not a single shared state instance (each call is independent
  unless you deliberately use Query/cache or context).
- Server-state hooks for the API live under `lib/hooks/` so pages and
  `_components` stay thin.
- UI-local interaction hooks (e.g. keyboard shortcuts in the shell) may live
  next to that component (`components/app-shell/hooks`).

## Naming conventions

| Kind | Convention | Example |
|---|---|---|
| Components / folders | PascalCase | `AgentsListView/`, `AgentCard.tsx` |
| Hooks | `use` + descriptive name | `useAgents`, `useReviewById` |
| Pure helpers / utils | camelCase verb or noun | `formatVerdict.ts` |
| Constants | SCREAMING_SNAKE or descriptive object | `QUERY_KEYS`, `statusLabels` |
| Tests | Same basename + `.test.tsx` | `AgentCard.test.tsx` |
| Private App Router folders | `_` prefix | `_components` |

## Feature-based vs type-based (hybrid this repo uses)

- **Do not** scatter one feature across global `components/`, `hooks/`,
  `utils/` folders only (type-based trap).
- **Do** keep route UI + its tests under `_components/<Name>/`.
- **Do** keep cross-cutting data hooks in `lib/hooks` (shared infrastructure
  for TanStack Query), analogous to Bulletproof’s shared `lib` + feature API
  hooks — here the “API hooks” layer is centralized because the client talks
  to one Fastify API.
