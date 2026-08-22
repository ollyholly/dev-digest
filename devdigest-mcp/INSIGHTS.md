# devdigest-mcp — Insights

## What Works

## What Doesn't Work

## Codebase Patterns

## Tool & Library Notes

- 2026-08-22: `@modelcontextprotocol/sdk` `registerTool` + full Zod object generics hang or hit TS2589 under Zod 3.25. Register with a narrowed `RegisterToolFn` and pass `schema.shape`; re-`parse` inside the handler (`src/tools/register-tools.ts`).
- 2026-08-22: Prefer local wire Zod in `src/adapter/wire-schemas.ts` over importing `@devdigest/shared` Agent/Review schemas — shared `.default()` fields make `z.infer` (output) disagree with `ZodType<T>` parse results across the dual zod3 path the SDK pulls in.

## Recurring Errors & Fixes

## Decisions

- 2026-08-22: `get_findings` resolves `run_id` → `pr_id` via an in-memory index filled by `run_agent_on_pr`, with fallback scan `GET /repos` → pulls → runs (no dedicated `GET /runs/:id` summary route yet).

## Open Questions

## Session Notes
