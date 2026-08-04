---
name: frontend-ui-architecture
description: >-
  DevDigest frontend UI architecture and code organization for the Next.js
  client: where components, hooks, utils, helpers, constants, and business
  logic belong; feature vs type-based layout; colocation; import boundaries;
  data-fetching layers. Use when deciding where a file should live, scaffolding
  a new UI feature, splitting components, placing constants/utils/helpers,
  locating business logic, reviewing folder structure, or organizing App Router
  `_components`. Do NOT use for performance tuning (vercel-react-best-practices),
  React purity/hooks anti-patterns detail (react-best-practices), RSC async API
  quirks (next-best-practices), or visual/a11y polish (frontend-ui-engineering).
---

# Frontend UI Architecture

**Version:** 1.0.0

Architecture and organization for `@devdigest/web` (`client/`). Focus: **where
code lives**, not performance or visual design.

There is no single universally correct folder tree. Scale structure with the
app and prefer **colocation**. This skill maps researched practices onto
DevDigest’s existing hybrid (thin pages + `_components` + `lib/hooks` +
`vendor/ui`) — not a greenfield FSD/Bulletproof rename.

## Decision workflow

1. **Identify the layer** — route shell, feature UI, cross-route widget,
   primitive, hook, transport, or contract.
   → [references/layers-and-folders.md](references/layers-and-folders.md)

2. **Place the file** using the decision table (components, hooks, utils,
   helpers, constants, business logic, naming).
   → [references/placement-decision-table.md](references/placement-decision-table.md)

3. **Wire data correctly** — page/feature → `lib/hooks` → `lib/api.ts` →
   `@devdigest/shared`.
   → [references/data-fetching-layer.md](references/data-fetching-layer.md)

4. **Check import direction** — features may import shared; shared must not
   import features; no cross-route private `_components` imports.
   → [references/import-boundaries.md](references/import-boundaries.md)

5. **Scan anti-patterns** before merging structure changes.
   → [references/anti-patterns.md](references/anti-patterns.md)

## Quick defaults (DevDigest)

| Need | Default home |
|---|---|
| New route UI | `app/<route>/_components/<Name>/` + colocated `*.test.tsx` |
| Thin route entry | `app/<route>/page.tsx` (composition only) |
| Multi-route domain UI | `src/components/<name>/` |
| Primitives | `src/vendor/ui` (`@devdigest/ui`) |
| Server state / API orchestration | `src/lib/hooks/*` → `src/lib/api.ts` |
| Domain contracts | `@devdigest/shared` (vendored) |
| Feature constants / helpers | Next to the feature; promote on 2nd real use |

## Out of scope (use sibling skills)

| Concern | Skill |
|---|---|
| Component purity, derive-don’t-store, hook misuse | `react-best-practices` |
| RSC boundaries, async `params`, Next file conventions detail | `next-best-practices` |
| React/Next performance | `vercel-react-best-practices` / `performance` |
| Visual polish, a11y implementation detail | `frontend-ui-engineering` / `accessibility` |

## Sources

Full bibliography (official docs + architecture articles used to write this
skill): [README.md](README.md).
