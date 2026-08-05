# server — Insights

## What Works

## What Doesn't Work

## Codebase Patterns

## Tool & Library Notes

## Recurring Errors & Fixes

- 2026-08-05: `AgentsService` ctor takes `Container` and reads `container.agentsRepo` — constructing with `{ db }` leaves `this.repo` undefined (`Cannot read properties of undefined (reading 'getById')`). Integration tests must pass `{ agentsRepo: new AgentsRepository(db) }` (see `test/agents-versions.it.test.ts`).

## Decisions

- 2026-08-02: Run Cost Badge (surfaces: PR list COST column, timeline under timestamp, trace sidebar Stats). Persist `agent_runs.cost_usd` + `head_sha` at run time — never recompute from tokens×price on read. PR-list cost = wave sum (`head_sha === last_reviewed_sha`) with fallback to all completed runs; null → "—" not "$0.00". Shared UI: `client/src/components/run-cost-badge` (`compact` | `withTokens`). Migration `0010_open_mercury.sql` re-adds `cost_usd` (dropped in 0009) and adds `head_sha`.
- 2026-08-03: PR-list `findings_by_severity` is COST-style (every review of the PR), not latest-only like SCORE. `rollupSeverities` returns shared uppercase `SeverityCounts`. `findings.review_id` indexed in migration `0011_complete_violations.sql` — first findings join on the list path.

## Open Questions

## Session Notes
