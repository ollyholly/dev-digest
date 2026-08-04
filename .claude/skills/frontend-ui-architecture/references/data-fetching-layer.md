# Data-Fetching Layer

DevDigest’s web client is a Next.js App Router UI over a separate Fastify API
(`NEXT_PUBLIC_API_BASE`). Architecture sources (Onishi playbook, Makerkit,
Bulletproof `api/` + React Query, freeCodeCamp) agree: keep routes thin and
put network/orchestration behind a dedicated layer.

## Flow

```text
page.tsx / _components
        │
        ▼
  lib/hooks/*          ← TanStack Query keys, queries, mutations, domain orchestration
        │
        ▼
  lib/api.ts           ← HTTP helpers against the API
        │
        ▼
  @devdigest/shared    ← Zod contracts / types (vendored)
```

## Rules

1. **Pages compose; they do not own fetch details.**
   `app/**/page.tsx` wires layouts and feature views. Avoid inline `fetch` or
   Query setup in the page beyond calling a hook or rendering a client view
   that uses hooks.

2. **Every server-state read/write goes through `lib/hooks/*`.**
   Hooks call `lib/api.ts`. This matches `client/AGENTS.md` and keeps
   caching/invalidation in one place.

3. **Components do not invent parallel API clients.**
   No ad-hoc `fetch` in `_components` or `components/` unless it is a
   temporary spike — prefer extending `api.ts` + a hook.

4. **Contracts live in `@devdigest/shared`.**
   Do not redefine `Review`, `Finding`, etc. locally. Validate/parse at the
   boundary when ingesting API payloads.

5. **Client vs server components.**
   Push `'use client'` to interactive leaves (freeCodeCamp / Next guidance).
   Data hooks that need browser Query providers live under client boundaries;
   keep presentational trees as Server Components when they only receive props.

6. **Feature-local vs shared hooks.**
   - Cross-route domain data → `lib/hooks/<domain>.ts` (e.g. `agents.ts`,
     `reviews.ts`).
   - Pure UI state for one widget → colocated hook next to that widget.

## Examples

| Need | Place |
|---|---|
| List agents from API | `lib/hooks/agents.ts` → used by `AgentsListView` |
| Review detail / run review | `lib/hooks/reviews.ts` |
| Diff viewer local UI state | Inside `components/diff-viewer/` |
| HTTP paths / fetch wrappers | `lib/api.ts` |

## What not to do

- Fat `page.tsx` with Query + mapping + three panels of JSX.
- Calling the API from a presentational leaf that should only receive props.
- Duplicating response types instead of shared Zod contracts.
- Putting transport logic inside `vendor/ui`.
