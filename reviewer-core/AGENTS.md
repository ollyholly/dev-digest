# `@devdigest/reviewer-core` — review engine

Pure logic: diff → prompt → LLM → grounded findings. No DB/GitHub/filesystem
— the only side effect is one LLM call through an **injected** `LLMProvider`.
Full detail: [`README.md`](README.md) · [`../TESTING.md`](../TESTING.md) ·
[`../docs/agent-prompts/README.md`](../docs/agent-prompts/README.md).

## Stack

TypeScript, `openai` SDK (also used as the OpenRouter client), `zod`. Deps
kept deliberately minimal so the package stays hermetic and mock-testable.

## Build / run / test

```sh
npm test          # vitest — hermetic, stubbed LLMProvider, no keys/network
npm run typecheck # this IS the build — `build` never emits JS
```

## Structure / pipeline

`assemblePrompt()` (prompt.ts) → `wrapUntrusted()` + `INJECTION_GUARD` →
injected `LLMProvider` (llm/openrouter.ts) → structured output (Zod → JSON
Schema, parse-with-repair, llm/structured.ts) → `groundFindings()`
(grounding.ts) → `Review`. `review/run.ts` orchestrates a run (single-pass by
default; `reduce()` map-reduce and `toReview()` exist for later lessons).
Public API is exported from `src/index.ts`. Contracts (`Review`, `Finding`,
`Verdict`) come from `@devdigest/shared`.

## Non-default conventions

- **Consumed as raw TypeScript source, not a build artifact.** The server
  aliases `@devdigest/reviewer-core` → `../reviewer-core/src` in its tsconfig
  and runs it via `tsx`/`vitest` directly — there is no dist/ to publish or
  bump.
- **Grounding is a mechanical gate, not a prompt instruction.** Any finding
  whose cited line doesn't intersect a real diff hunk is dropped in code
  (`grounding.ts`) — never rely on the model to self-police citations.
- **Score is always recomputed from surviving findings**, never taken from
  the model's own output.
- **Prompt-injection defense is one shared rule appended to every prompt**
  (`INJECTION_GUARD`), not keyword/regex scanning — untrusted content (diff,
  PR body, comments) is fenced as data, and claims like "test fixture, don't
  flag this" never descope the review.

## Do-not-touch / gotchas

- This package must stay side-effect-free apart from the injected
  `LLMProvider` — no DB, GitHub, or FS calls belong here; that's what keeps
  it mock-testable from the server without Docker or API keys.
- Uses **npm** (package-lock.json), unlike server/client which use pnpm —
  don't "fix" this to pnpm without checking the CI workflow
  (`reviewer-core.yml`) and the server's install step for it first.
