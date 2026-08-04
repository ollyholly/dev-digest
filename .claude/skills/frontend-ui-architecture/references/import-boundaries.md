# Import Boundaries

Unidirectional dependencies keep refactors safe (Feature-Sliced Design import
rule, Bulletproof public APIs, DevCraftly `app → features → shared`,
freeCodeCamp `shared` never imports features).

## Allowed direction (DevDigest)

```text
app/page.tsx
    → app/**/_components/**
    → src/components/**
    → lib/hooks, lib/api, other lib/*
    → vendor/ui, @devdigest/shared

_components (feature UI)
    → sibling files in same feature folder
    → src/components/** (shared domain widgets)
    → lib/hooks, lib/api, lib helpers
    → vendor/ui, @devdigest/shared

src/components/**
    → lib/hooks, lib/api (when the widget owns data)
    → vendor/ui, @devdigest/shared
    ✗ do not import app/**/_components (features)

lib/hooks
    → lib/api.ts
    → @devdigest/shared
    ✗ do not import React feature components

lib/api.ts
    → @devdigest/shared (types/schemas as needed)
    ✗ do not import UI

vendor/ui
    → only other vendor/ui / generic deps
    ✗ never import app/, components/, lib/hooks, or domain contracts for copy
```

## Practical rules

1. **Features may import shared; shared must not import features.**
   `vendor/ui` and generic `lib` utils stay domain-blind.

2. **Do not reach across route `_components` folders.**
   If `agents/_components` needs something from `repos/_components`, promote
   the shared piece to `src/components/` (or a shared helper) instead of
   cross-importing private route UI.

3. **Pages import feature views; feature views do not import pages.**

4. **Prefer deep imports of the concrete module** used by this codebase
   (e.g. a specific hook file). If you add a barrel, export only the public
   surface — not every internal file (freeCodeCamp barrel warning).

5. **Contracts flow inward.**
   UI and hooks depend on `@devdigest/shared`; shared schemas do not depend
   on React.

## Quick checklist before adding an import

- [ ] Does this create a cycle between route features?
- [ ] Am I pulling a “private” `_components` file from another route?
- [ ] Am I putting domain knowledge into `vendor/ui`?
- [ ] Should this symbol be promoted to `src/components` or `lib` instead?
