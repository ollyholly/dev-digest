# client — Insights

## What Works

## What Doesn't Work

## Codebase Patterns

## Tool & Library Notes

## Recurring Errors & Fixes

## Decisions

- 2026-08-02: Run Cost Badge lives at `src/components/run-cost-badge` (not `@devdigest/ui`). Variants: `compact` (`$0.014` / `—`) for PR list + sidebar Stat; `withTokens` (`9,119 tok · $0.0013`) for RunHistory meta under timestamp. Wire points: `PRRow`, `RunHistory`, `TraceBody` (COST between Tokens and Findings).
- 2026-08-03: Findings hover card lives at `src/components/findings-hover-card` (same cross-route pattern as run-cost-badge). Shared by PR list FINDINGS cell, ReviewRunAccordion header, and RunHistory timeline. Callers own data (lazy `usePrReviews` on list; in-memory on detail). Local SeverityFilterBar chip mirrors Chip visuals with `aria-pressed` — vendored Chip does not forward ARIA props.

## Open Questions

## Session Notes

- 2026-08-03: Lesson doc mentions `costByRun` in FindingsTab — not present in tree; only `findingsByRun` was added. GRID cost track is `72px` (not the lesson's `78px`).
