# e2e — Insights

## What Works

## What Doesn't Work

## Codebase Patterns

## Tool & Library Notes

## Recurring Errors & Fixes

- 2026-08-16: Flow 05 `wait --text Core` timed out ~30s after `tab=diff` while the other 6 flows passed (GH `browser flows`). agent-browser `wait --text` is case-sensitive against rendered `innerText`; CSS `textTransform: uppercase` on the Core group label makes the node `CORE`. Assert an untransformed unique substring (the subtitle `review closely`) and do not uppercase labels that flows wait on.

## Decisions

## Open Questions

## Session Notes
