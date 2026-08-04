# Skill routing

Path → skill matrix for DevDigest project skills under `.claude/skills/`.

## Matrix

| Path bucket | Globs | Skills |
|---|---|---|
| UI / client | `client/**` | `frontend-ui-architecture`, `react-best-practices`, `next-best-practices` |
| Client tests | `client/**/*.{test,spec}.{ts,tsx}` | `react-testing-library` (plus UI skills above) |
| API / server | `server/**` | `onion-architecture`, `fastify-best-practices`, `security` |
| DB / schema | `server/src/db/**`, `server/src/db/migrations/**` | `drizzle-orm-patterns`, `postgresql-table-design` |
| Shared Zod contracts | `server/src/vendor/shared/**` | `zod` + fan-out (below) |
| Reviewer engine | `reviewer-core/**` | `typescript-expert`; add `zod` if contracts/schemas; add `security` if LLM/tool IO |
| Cross-cutting TS | secondary only | `typescript-expert` for type-system or module-boundary issues — not always-on |
| Out of scope | `e2e/**`, `.claude/**`, markdown-only | Skip specialized review unless always-on gotchas apply |

Skill directories live at `.claude/skills/<name>/SKILL.md`.

## Rules

1. Select a skill only if at least one changed file matches its bucket
   (after fan-out).
2. Prefer project skills; do not invent review criteria outside them.
3. A path may match multiple skills — run all, then dedupe same-issue findings.
4. Never run UI skills on `server/**` or backend architecture skills on
   `client/**`.
5. Ignore lockfiles for routing (still covered by always-on gotchas).

## Shared-contract fan-out

When any file under `server/src/vendor/shared/**` changes:

1. Always apply `zod`.
2. Grep `client/` and `reviewer-core/` for imports of `@devdigest/shared` /
   changed exported symbols (tsconfig path aliases).
3. Review those **consumer** touchpoints even if they are not in the diff.
4. Flag clear type/usage breakages as **critical**.

## Diff budget / triage

Over budget when **> 40** changed files or a very large line diff
(multi-thousand lines):

1. State the overrun in the report (`Budget: triaged`).
2. Priority order: always-on gotchas → `security` → architecture
   (`onion-architecture`, `frontend-ui-architecture`) → remaining skills on
   the hottest / most sensitive paths.
3. List what was skimmed or skipped so PASS is not mistaken for a full review.

Under budget → `Budget: full` and run every matching skill.
