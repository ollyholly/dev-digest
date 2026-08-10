# Spec: Conventions Extractor (API + pipeline)

## Goal

Scan a cloned repository for house-style conventions, ground each candidate
against real file evidence, let the user accept / reject / edit them, and
promote accepted candidates into one or more Skills Lab skills (`source:
extracted`, `type: convention`) that agents can link for reviews.

## Scope

- In:
  - Extend the scaffolded `conventions` table (new migration — never edit
    committed SQL) with category, tri-state status, evidence line range,
    scanned SHA, fingerprint, timestamps, and a repo-scoped index.
  - Shared Zod contracts for candidates, extraction result, updates, and
    skill-draft / promote payloads (server + client physical copies).
  - New Fastify module `modules/conventions/` (route → service → repository)
    registered in `modules/index.ts`, wired through `Container`.
  - Deterministic sampling: root/workspace configs (eslint, prettier,
    tsconfig, editorconfig, …) + top-12 files via
    `repoIntel.getConventionSamples(repoId, 12)`.
  - One structured LLM call (`ConventionExtraction`) via the Conventions
    feature-model setting (cheap default: prefer OpenRouter flash when no
    override).
  - Mechanical evidence verification: path containment (clone root +
    realpath), snippet match (exact / whitespace-normalized), recompute
    line spans, reject trivial snippets, drop unverified candidates.
  - Deduplicate by normalized fingerprint; preserve user decisions across
    rescans when fingerprints match.
  - Server-built skill draft from **accepted** rows only; promote creates
    skill(s) with `source: extracted` and optional agent link.
  - Unit + integration tests (mock LLM, mock git/repo-intel).
- Out:
  - Background / async extraction jobs with progress SSE (sync extract is
    acceptable for v1; document latency).
  - Separate `convention_extractions` / `convention_evidence` tables (v1 keeps
    one evidence snippet per row; follow-up if multi-evidence is needed).
  - Auto-linking every extracted skill to every agent.
  - Browser e2e flow (optional follow-up under `e2e/specs/`).

## Acceptance criteria

- [ ] `POST /repos/:id/conventions/extract` samples configs + top files,
      calls the model, grounds candidates, persists them, returns an
      envelope with candidates + scan metadata (`scanned_sha`,
      `sampled_files`, `proposed` / `verified` / `dropped` counts).
- [ ] `GET /repos/:id/conventions` lists workspace+repo scoped candidates
      ordered pending → accepted → rejected, then confidence desc.
- [ ] `PATCH /conventions/:id` updates `status` and/or editable `rule` /
      `category` only — evidence fields are immutable.
- [ ] `GET /repos/:id/conventions/skill-draft?mode=merged|by-category`
      returns editable draft(s) derived **only** from accepted candidates
      (server-side; rejects ignored).
- [ ] `POST /repos/:id/conventions/promote` creates skill(s) transactionally
      (`source: extracted`, `type: convention`, `evidence_files` populated),
      optionally links to an agent, returns created skill id(s).
- [ ] Candidates without verifiable evidence never reach the DB / UI list.
- [ ] Rescan upserts by fingerprint: prior accept/reject survives; fresh
      pending rows replace unmatched pending; empty verified set does **not**
      wipe curated data.
- [ ] Integration test covers extract → accept → skill-draft → promote with
      `MockLLMProvider` + fixture clone content.
- [ ] Path traversal / symlink escape from model-supplied paths is rejected.

## Out of scope

- Changing reviewer-core prompt assembly (skills injection already works).
- Reworking Skills Lab CRUD / Agent Skills tab (reuse as-is).
- Demo video recording (manual; documented in PR).

## Boundaries

**Touch:**

- `server/src/db/schema/knowledge.ts` + new migration via Drizzle generate
- `server/src/vendor/shared/contracts/knowledge.ts` (+ client copy)
- `server/src/modules/conventions/**` (new)
- `server/src/modules/index.ts`, `platform/container.ts`
- `server/src/modules/settings/feature-models.ts` (cheap default for
  conventions if still pointing at a heavy model)
- `server/test/conventions*.test.ts`
- `docs/agent-prompts/` only if expanding API Contract Reviewer content

**Do not touch:**

- Committed migration SQL files
- Lockfiles unless a dependency is intentionally added (prefer none)
- `reviewer-core` (no engine change required)
- Unrelated empty schema tables (`memory`, `eval`, `ci`, …)

## Gotchas

- Skills Lab already landed: promote must call `SkillsService` /
  `skillsRepo` with `source: 'extracted'`, not invent a parallel skill
  store.
- `ConventionCandidate` currently requires non-null evidence; align DB
  nullability with the contract (evidence always present after grounding).
- Client `vendor/shared/contracts/knowledge.ts` is a **physical duplicate** —
  edit both copies.
- `server/package.json` is skip-worktree locally; CI inlines vitest — add
  `*.it.test.ts` / unit tests by file name, not by assuming a new npm script.
- Model-controlled paths must never be `join(clonePath, path)` without
  containment checks (lexical + realpath under the clone root).
- Onion: routes stay thin; sampling, LLM, verify, and promote live in the
  service; repository is Drizzle-only.

## API contract (v1)

| Method | Path | Notes |
|---|---|---|
| `POST` | `/repos/:id/conventions/extract` | Sync extract; 200 envelope |
| `GET` | `/repos/:id/conventions` | List + scan summary |
| `PATCH` | `/conventions/:id` | `{ status?, rule?, category? }` |
| `GET` | `/repos/:id/conventions/skill-draft` | Query `mode=merged\|by-category` |
| `POST` | `/repos/:id/conventions/promote` | Body: `{ mode, name?, description?, enabled?, agent_id?, drafts? }` |

### Candidate DTO

```ts
{
  id: string;
  repo_id: string;
  category: string;          // e. for naming | error-handling | async | …
  rule: string;              // editable directive text
  evidence_path: string;
  evidence_snippet: string;
  evidence_start_line: number;
  evidence_end_line: number;
  confidence: number;        // 0–1, consistency-oriented after grounding
  status: 'pending' | 'accepted' | 'rejected';
  scanned_sha: string | null;
  fingerprint: string;
  created_at: string;
}
```

### Extraction envelope

```ts
{
  candidates: ConventionCandidate[];
  scanned_sha: string | null;
  sampled_files: string[];
  considered_files: number;
  proposed: number;
  verified: number;
  dropped: number;
  model: { provider: string; model: string } | null;
}
```

## Pipeline

```
configs + getConventionSamples(12)
        → read bounded text (server sample IDs)
        → completeStructured(ConventionExtraction)
        → verify each candidate against loaded samples
        → fingerprint + dedupe
        → upsert preserving status for matching fingerprints
        → return envelope
```

## Security

- Sample paths are server-chosen; model cites sample ids / paths from the
  prompt only — post-verify still enforces clone-root containment.
- Untrusted repo text is fenced; shared injection guard applied to the
  extraction system prompt.
- Promote never trusts a client-only candidate set without re-reading
  accepted rows (unless `drafts` override body text **after** server
  re-validates accepted ids).
