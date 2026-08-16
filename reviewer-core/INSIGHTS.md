# reviewer-core — Insights

## What Works

## What Doesn't Work

## Codebase Patterns

## Tool & Library Notes

## Recurring Errors & Fixes

## Decisions

- 2026-08-11: When Derived PR intent is present, `assemblePrompt` appends trusted `INTENT_SCOPE_POLICY` (true severity out-of-scope; never demote CRITICAL on low confidence; never invent CRITICAL for unmet PR promises) and renders `## Derived PR intent` via `wrapUntrusted` after PR description.
- 2026-08-16: `assemblePrompt` returns `log` (section/source/chars/approx_tokens only). Callers must not log `assembly` / message bodies for ops telemetry.

## Open Questions

## Session Notes
