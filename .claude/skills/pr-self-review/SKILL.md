---
name: pr-self-review
description: >-
  Local pre-PR gate for DevDigest: review open branch/working-tree changes by
  routing project skills to matching path buckets (UI skills on client/,
  backend/architecture skills on server/), run mechanical preflight and
  always-on gotcha checks, then soft-block opening a GitHub PR if any critical
  finding exists. Use before `gh pr create` / push-for-PR, when the user asks
  to open a pull request, or manually via /pr-self-review, "PR Self Review",
  "self-review local changes", or "gate this branch for critical findings".
---

# PR Self Review

Orchestrate a local review of open changes before opening a GitHub PR.
This is an **agent soft-gate** (refuse `gh pr create` / push-for-PR on
critical findings) — not a git hook or CI required check.

**Related tools:** `no-mistakes`, CodeRabbit, and Bugbot remain optional and
separate. This skill is the DevDigest skill-routing gate only.

## Workflow

### 1. Preconditions

- Work from the repository root.
- Detect the default base branch (`main` or `master`; prefer the remote
  default if known).
- If the user asked only for uncommitted review, skip merge-base history.

### 2. Collect changed files and hunks

```sh
git rev-parse --abbrev-ref HEAD
git merge-base HEAD origin/<base>   # or origin/main, origin/master
git diff --name-only <merge-base>...HEAD
git diff --name-only HEAD
git diff --name-only --cached
git diff <merge-base>               # primary review input: hunks
```

Union name-only paths (committed + staged + unstaged). Ignore lockfiles for
skill routing (still scan them in always-on gotchas). Prefer **hunks** as the
review input; open full files only when a finding needs surrounding context.

Empty union → report “nothing to review” and do **not** block.

### 3. Preflight and always-on gotchas

Read [references/preflight-and-gotchas.md](references/preflight-and-gotchas.md).

1. Run package-scoped mechanical checks for buckets present in the diff.
2. Scan the diff for DevDigest gotchas (secrets, migration edits, etc.).

Preflight failures caused by the diff and confirmed gotchas are **critical**.

### 4. Route skills

Read [references/skill-routing.md](references/skill-routing.md).

1. Bucket paths (`client/`, `server/`, `reviewer-core/`, shared contracts).
2. Apply **shared-contract fan-out** when `server/src/vendor/shared/**` changes.
3. If over **diff budget** (>40 files or multi-thousand-line diff), triage:
   gotchas → security → architecture → remaining hot paths; list skips in the
   report.
4. Announce: “Running X skills on Y files”.

Load only matching project skills under `.claude/skills/`. Do not invent
criteria outside those skills. Do not run UI skills on `server/**` or backend
architecture skills on `client/**`.

### 5. Hunk-first scoped reviews

For each selected skill:

1. Read that skill’s `SKILL.md` (and only references it requires for review).
2. Review the matching file subset via hunks first.
3. Emit findings with stable IDs; map severities per
   [references/finding-format.md](references/finding-format.md).
4. Dedupe findings that describe the same issue.

### 6. Report

Emit the report template from `finding-format.md` (PASS or BLOCK).

**Critical** findings block PR open. High / medium / low are reported only.

### 7. Soft gate and override

When this run is part of opening a PR:

- **Any critical:** stop. Do **not** run `gh pr create` or push-for-PR.
  Show the findings table.
- **No critical:** continue with the normal PR-creation flow.
- **Override:** only if the user explicitly says to open anyway / override
  critical findings. Proceed and note which criticals were accepted.

Manual `/pr-self-review` uses the same review and verdict; take no PR action
unless the user also asked to open one.
