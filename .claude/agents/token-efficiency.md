# Token-efficient agent pipeline

How the parent (orchestrating) agent should run [researcher](researcher.md) →
[planner](planner.md) → [implementer](implementer.md) → reviewers so **the same
checks still happen** without re-paying for the same tree in every subagent.

This is **Claude/Cursor harness** guidance. It is not the product review-agent
prompts under [`docs/agent-prompts/`](../../docs/agent-prompts/) (see
[`choosing-a-model.md`](../../docs/agent-prompts/choosing-a-model.md) for those).

Grounded in the Intent Layer (L03) session: explore + researcher + planner +
implementer, then architecture-reviewer ∥ plan-verifier on `inherit`, then a
later quality review that re-sent a multi-thousand-line diff plus file copies.

## What actually costs tokens

Subagents start **empty**. They do not see the parent’s conversation. Every
Task call re-reads skills, `INSIGHTS.md`, the plan, and large source files
unless the parent sends a tiny, named pack.

Typical waste in this repo:

| Waste | What happened |
|---|---|
| All agents `model: inherit` | Plan-verifier (grep/checklist) cost the same as implementer |
| Duplicate research | Explore **and** researcher both walked “where is Intent / PR import” |
| Two plan artifacts | Cursor plan + `docs/plans/intent-layer.md` both inlined |
| Reviewers given “uncommitted changes” | Each re-walked the tree instead of a file list |
| Full diff + file dump + live reads | Quality review paid for the same `service.ts` three times |
| Drizzle snapshots in diffs | `migrations/meta/*.json` is thousands of lines of noise |
| Dual vendor trees | Both `brief.ts` copies sent when `diff -q` would suffice |
| Sequential overlapping reviews | Architecture, then a recap of architecture, then thermo-nuclear |

**Keep the checks.** Cut the **re-derivation**.

## Default pipeline (same checks, less spend)

```text
parent/cheap explore     1-page “what exists” (paths only)
        ↓
planner (expensive)      docs/plans/<feature>.md with numbered AC (P1…Pn)
        ↓  user approval
implementer (expensive)  plan path + AC list → code + Done/Deviations + diff --stat
        ↓
parent                   typecheck + existing tests (no LLM)
        ↓
plan-verifier (cheap)  ∥  architecture-reviewer (expensive)
  AC list + spot-check      6–8 named files, matching skill only
        ↓
one quality pass         post-fix diff, exclude snapshots
        ↓
user recap               attach the two report tables; do not re-prompt a
                         subagent to “explain the review”
```

Do **not** run architecture-reviewer and plan-verifier in series. They overlap
on “is it wired”; they diverge on onion vs checklist — that is why both exist,
and only in **parallel**, with **disjoint inputs**.

Skip a second research agent if explore already returned paths + snippets.
Planner’s deliverable **is** `docs/plans/…` — do not pay implementer to rewrite
the plan file as its first beat.

## 1. Short handoffs (not plans, diffs, or recaps)

Never pass the full plan + unified diff + prose recap into the next agent.

**Implementer → reviewers** (about 40–80 lines):

```text
Plan: docs/plans/<feature>.md
Done: P1–P22 except P23 (tests deferred)
Files: server/src/modules/<feature>/**, … (glob or 8–12 paths)
Deviations: <none | one line>
Do not re-read: migrations/meta/*.json, seed fixtures, INSIGHTS.md
```

**Architecture-reviewer** output stays the A-table (ID, severity, evidence).
Do not ask the parent or another agent to expand it into a narrative unless
the user asked for a learning recap.

**Plan-verifier** consumes a **pre-numbered checklist** from the plan. Do not
make it extract requirements from two plan copies.

Parent rule: **do not paste a review report into another agent**. Point at the
subagent id and a 5-row table.

If implementer already filled P1–Pn with `path:line`, plan-verifier only
**spot-checks Partial/Missing and ~3 random PASS rows**.

## 2. Cheaper models for mechanical stages

Agents in this directory default to `model: inherit`. Override on the Task
call when the work is mechanical.

| Stage | Model | Why |
|---|---|---|
| Explore / “where is X” | cheap/fast | Path + snippet lists |
| Dual-vendor `diff -q` | cheap/fast or parent shell | Mechanical |
| Plan-verifier | cheap/fast | Row-by-row grep vs a fixed AC list |
| Test/typecheck summary | none (parent shell) | Exit code + first failure |
| Planner, implementer, architecture-reviewer | expensive (`inherit` or stronger) | Design, code, boundaries |
| One quality / thermo-nuclear pass | expensive | After fixes, not before |

Do not run a frontier model on checklist or glob work.

## 3. Session pack (cache shared context once)

Parent writes **once** per feature (keep it short; paths not bodies):

- 10–15 line module map (e.g. routes → service → repo → `assemblePrompt`)
- File list for reviewers
- `diff -q` result for dual vendor pairs (`server/src/vendor/shared` vs
  `client/src/vendor/shared`) — send “identical” or a small delta, never both
  files
- Which skill to preload: **onion only** if the diff is server-heavy; UI
  architecture only if `client/` changed

Do not tell every subagent to re-read all three `INSIGHTS.md` files. Parent
reads them; the handoff cites one relevant bullet if needed.

## 4. Do not re-send the full diff

Reviewers need a **stat + named files**, not a unified diff of the branch.

```sh
git diff main...HEAD --stat
git diff main...HEAD -- \
  ':(exclude)**/migrations/meta/*.json'
```

Then name 8–12 files. Fingerprint / Zod / route verbs are `rg` work — no
diff required.

Never include:

- `server/src/db/migrations/meta/*.json`
- unchanged seed/showcase unless the AC is about seed
- both copies of a vendored contract when they match

A quality review that already received a diff dump must **not** also receive
copied file trees and then re-Read the same paths.

## 5. Fewer agents when work is sequential

| Sequential pair | What to do instead |
|---|---|
| Explore + researcher | One explore with a 6-bullet question list |
| Planner + implementer “write the plan file” | Planner writes `docs/plans/` |
| Architecture-reviewer then parent restates the same report | User-facing recap = the report |
| Plan-verifier **and** a full quality review on the same untouched diff | Quality review **after** architecture gaps are fixed |
| Implementer self-check + architecture + thermo-nuclear | Architecture (boundaries) + **one** quality pass |

Disjoint file lists when both reviewers run:

- **Architecture:** routes, service, container/ports, fetch/HTTP, run-executor, `prompt.ts`
- **Plan-verifier:** each AC id → one evidence path (no full service read)

## Inputs by agent (budget)

| Agent | Send | Do not send |
|---|---|---|
| Planner | Goal, `INSIGHTS` bullets, existing scaffold paths | Full diffs, review reports |
| Implementer | Plan **path** + AC list + constraints | Second copy of the plan body if the file exists |
| Plan-verifier | AC table + `git diff --stat` + implementer Done/Deviations | Unified diff, onion skill, UI skill |
| Architecture-reviewer | 6–8 paths + one architecture skill | Plan prose, snapshot JSON, vendor duplicates |
| Quality / thermo-nuclear | Post-fix `--stat` + named files, exclude snapshots | Pre-fix tree, architecture essay, full 0013 snapshot |

## Intent Layer leftovers (do not repeat)

- Architecture A1–A5 + plan-verifier P10 were the real gaps; restating those
  reports in a later agent did not add checks.
- Sticky-heuristic / provenance work was a **product** follow-up, not a reason
  to re-run the whole pipeline.
- `P23` tests deferred on purpose — do not launch test-writer “because the
  pipeline includes test-writer” unless tests are in scope.
