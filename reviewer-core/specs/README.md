# `@devdigest/reviewer-core` — specs

Planning contracts for review-engine work: goal, acceptance criteria, and
blast radius before implementation. Copy [`_TEMPLATE.md`](_TEMPLATE.md) into a
new file (e.g. `grounding-hunk-edge.md`) and fill it in.

**Not** browser e2e flows — those live in [`../../e2e/specs/`](../../e2e/specs/)
as `*.flow.json` for `agent-browser`.

**When to read / write:** before changing the prompt → LLM → grounding
pipeline, or when handing work to an agent so scope and “done” are explicit.
