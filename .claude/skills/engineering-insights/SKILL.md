---
name: engineering-insights
description: "Reads and records module-scoped engineering learnings (INSIGHTS.md) so future sessions inherit past discoveries instead of relearning them. Triggers automatically at the start of any session touching client/, server/, reviewer-core/, or e2e/ (read their INSIGHTS.md first) and at session end when something substantive happened. Also invoked manually as /engineering-insights."
---

# Engineering Insights

Each standalone package owns one `INSIGHTS.md` — an append-only, durable
memory of what past sessions in that module discovered. This skill governs
both ends of the loop: read it before you touch the module, write to it
before you finish.

## Module scope

Write to the file of the package the work actually touched:

| Work touched | File |
|---|---|
| client (`@devdigest/web`) | `client/INSIGHTS.md` |
| server (`@devdigest/api`, incl. repo-intel) | `server/INSIGHTS.md` |
| reviewer-core (`@devdigest/reviewer-core`) | `reviewer-core/INSIGHTS.md` |
| e2e (`@devdigest/e2e`) | `e2e/INSIGHTS.md` |
| spans several packages | write the relevant part to each file |
| pure root config / CI only | usually not a module insight — skip it |

Never write insights into this `SKILL.md` itself.

## Read trigger

Before your first response in a session, determine which module(s) the
request concerns (folder mentioned, file path touched, or subject matter) and
read that module's `INSIGHTS.md` in full. If it contains anything relevant,
say so in one line before answering — this both forces you to actually use
it and confirms to the user that the read happened. Skip the summary if the
file is empty or nothing in it applies.

## Write trigger

At the end of a session or task, add entries only if something substantive
happened: a bug plus its fix, a non-obvious codebase pattern, a decision made
for a specific reason, a dead end worth not repeating. A session that was
merely long, or that only touched typos/formatting/pure Q&A, gets nothing
written — say explicitly that there's nothing new to record rather than
padding the file.

**Before writing, re-read the target section.** If the insight (or a close
paraphrase) is already there, don't duplicate it — optionally bump its date
if this session reconfirmed it.

## Workflow

1. **Gate check.** Did the session produce something substantial — a
   problem solved, a decision made, a non-obvious discovery? If not, write
   nothing and stop.
2. **Read first.** Open the touched module's `INSIGHTS.md` before drafting
   anything.
3. **Draft ≤5 candidates**, ranked by signal (corrections and gotchas
   highest, nice-to-know patterns lowest). Each candidate = the exact
   proposed line + its target section + `file:line` evidence.
4. **Dedup.** Drop any candidate already covered by an existing entry. If
   reality contradicts an old entry, add a new dated note that supersedes
   it — never edit the old one.
5. **Append** the survivors. If nothing substantial survives the gate and
   dedup steps, write nothing.
6. **Summary.** One line: what was written, to which file, what was skipped.

## Entry template

```md
- YYYY-MM-DD: <claim, in one line, with file:line or command evidence where applicable>
```

Sections, fixed for every module:

```md
# <module> — Insights

## What Works
## What Doesn't Work
## Codebase Patterns
## Tool & Library Notes
## Recurring Errors & Fixes
## Decisions
## Open Questions
## Session Notes
```

## The bar

An entry must be actionable **cold** — the next session reads it and knows
what to do without re-deriving anything.

| ✗ Noise | ✓ Insight |
|---|---|
| "e2e tests can be flaky" | "flows assume exactly one seeded repo — flow 02 follows the home redirect to the *first* one, so the dev DB fails 02/04/05; use `npm run e2e:hermetic`" |
| "be careful with migrations" | "`relation … does not exist` on a fresh clone means migrations were skipped — they do not run on boot. `cd server && pnpm db:migrate`" |
| "Promises can be tricky" | "`Promise.all()` over the ingest pipeline times out past ~30 items — use `Promise.allSettled()` in batches of 10" |

**The test: if it would be obvious to anyone reading the code, don't write it.**
Generic advice is the failure mode — "use async carefully" is true everywhere
and therefore useful nowhere.

## Non-destructive write contract (hard rule)

This skill is append-only and must never clobber existing content:

- **Re-read the target `INSIGHTS.md` immediately before writing** — its
  state may have changed since the session started.
- **Insert with an anchored `Edit`** that adds the new bullet under the
  correct `##` heading. Never use the `Write` tool on an existing
  `INSIGHTS.md` — `Write` replaces the whole file and would destroy every
  prior entry.
- **Preserve verbatim** the `# <module> — Insights` header, every section
  heading, and every entry already in the file. New content is only ever
  *added*.
- Idempotent: if an equivalent entry already exists, skip it (no duplicate,
  no rewrite).

## Keeping the files lean

- Roughly **30 entries per file** before splitting into domain-specific
  files (e.g. `server/docs/INSIGHTS-repo-intel.md`). Past that, signal drops.
- Pruning is **maintenance, not a per-session task** — do it out of band
  (e.g. monthly), not as part of a normal write.
- When an entry becomes stable reference material, **promote it into
  `<module>/docs/` and delete it here.** That's what keeps these files short.
- An entry that no longer holds is worse than no entry. Correct it with a new
  dated line rather than silently deleting — append-only applies to
  corrections too.

## Anti-patterns

- Writing an entry because the session was long, rather than because
  something was learned.
- A title instead of content — "fixed the SSE bug" tells the next session
  nothing. Write the claim, not the label.
- Filing everything under `What Works`.
- Appending a fifth variation of an entry that already exists.
- Recording what `AGENTS.md`, `README.md`, or `docs/` already says.

## What this skill does not do

It captures insights only. It does not review code, write documentation,
update `specs/`, or run tests. `INSIGHTS.md` is not a session diary — it
holds durable findings, not a record of what happened.

## Manual invocation

`/engineering-insights` runs the write trigger on demand, for a mid-session
wrap-up without waiting for the session to end.
