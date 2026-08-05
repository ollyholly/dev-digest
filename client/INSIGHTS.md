# client — Insights

## What Works

## What Doesn't Work

## Codebase Patterns

## Tool & Library Notes

## Recurring Errors & Fixes

## Decisions

- 2026-08-02: Run Cost Badge lives at `src/components/run-cost-badge` (not `@devdigest/ui`). Variants: `compact` (`$0.014` / `—`) for PR list + sidebar Stat; `withTokens` (`9,119 tok · $0.0013`) for RunHistory meta under timestamp. Wire points: `PRRow`, `RunHistory`, `TraceBody` (COST between Tokens and Findings).
- 2026-08-03: Findings hover card lives at `src/components/findings-hover-card` (same cross-route pattern as run-cost-badge). Shared by PR list FINDINGS cell, ReviewRunAccordion header, and RunHistory timeline. Callers own data (lazy `usePrReviews` on list; in-memory on detail). Local SeverityFilterBar chip mirrors Chip visuals with `aria-pressed` — vendored Chip does not forward ARIA props.
- 2026-08-05: Skills Lab built at `src/app/skills/` (list) + `src/app/skills/[id]/` (5-tab detail: Config/Preview/Evals/Stats/Versions), mirroring `src/app/agents/` structure exactly (`*ListView`/`*EditorView`/`*Editor` + `_components/<Tab>` + `?tab=` state via a `useSkillEditorTab` hook). Evals tab is a stub (`EmptyState`, no data fetch) and Versions tab is deliberately read-only (no Diff/Restore, even though a design mockup showed them) — both are scope decisions, not omissions. Stats tab's "Used by" count/agent-list is real (`GET /skills/:id/agents`); Pull Frequency/Accept Rate/Findings(30D) render a `stats.noData` placeholder since no eval/stats aggregation feature exists yet — never fabricate those numbers.
- 2026-08-05: `client/src/vendor/shared/contracts/knowledge.ts` is a **physical duplicate** of `server/src/vendor/shared/contracts/knowledge.ts`, not a symlink or path-alias — confirmed by `diff`, the two copies had already drifted (missing `AgentVersion`/`AgentVersionConfig` client-side, differing comments) before this session. Any new/changed type in that file must be manually copied to both locations; no sync script exists. `reviewer-core`'s copy is a real tsconfig path alias into `server/`'s file, not a third duplicate.
- 2026-08-05: No drag-and-drop library exists in this repo (checked `package.json`). The Agent editor's Skills tab reorders linked skills with plain up/down `ArrowUp`/`ArrowDown` icon buttons instead — don't add a DnD dependency for this without asking first.

## Open Questions

## Session Notes

- 2026-08-03: Lesson doc mentions `costByRun` in FindingsTab — not present in tree; only `findingsByRun` was added. GRID cost track is `72px` (not the lesson's `78px`).
