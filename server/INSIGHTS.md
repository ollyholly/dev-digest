# server — Insights

## What Works

## What Doesn't Work

## Codebase Patterns

## Tool & Library Notes

## Recurring Errors & Fixes

## Decisions

- 2026-08-02: Run Cost Badge (surfaces: PR list COST column, timeline under timestamp, trace sidebar Stats). Persist `agent_runs.cost_usd` + `head_sha` at run time — never recompute from tokens×price on read. PR-list cost = wave sum (`head_sha === last_reviewed_sha`) with fallback to all completed runs; null → "—" not "$0.00". Shared UI: `client/src/components/run-cost-badge` (`compact` | `withTokens`). Migration `0010_open_mercury.sql` re-adds `cost_usd` (dropped in 0009) and adds `head_sha`.

## Open Questions

## Session Notes
