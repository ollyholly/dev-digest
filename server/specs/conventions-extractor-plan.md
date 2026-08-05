# Implementation plan — Conventions Extractor + API Contract skills

Ordered work plan for `cursor/conventions-extractor-4168`. Specs:
`server/specs/conventions-extractor.md`,
`client/specs/conventions-extractor.md`,
`server/specs/conventions-extractor-product-ideas.md`.

Skills Lab already ships on `main` (CRUD, agent linking, review injection,
seeded API Contract Reviewer + one breaking-change skill). This plan adds
the extractor and completes the lab’s multi-skill API reviewer content.

## Phase 0 — contracts & schema

1. Extend `ConventionCandidate` (+ extraction envelope, update, draft,
   promote schemas) in `server/src/vendor/shared/contracts/knowledge.ts`.
2. Mirror the same edits in `client/src/vendor/shared/contracts/knowledge.ts`.
3. Expand `conventions` table columns in `schema/knowledge.ts`.
4. `cd server && pnpm exec drizzle-kit generate` → commit **new** migration
   only.
5. Lower Conventions feature-model default toward a cheap OpenRouter flash
   model (override still wins).

## Phase 1 — server module

```
modules/conventions/
  routes.ts
  service.ts
  repository.ts
  helpers.ts
  constants.ts
  samples.ts      # config discovery + bounded reads
  verify.ts       # path containment + snippet grounding
  skill-body.ts   # markdown assembly for drafts
  prompt.ts       # extraction system/user prompts
  schema.ts       # LLM structured Zod (ConventionExtraction)
```

1. Repository: list / replace-upsert / patch status+rule / load accepted.
2. Service: extract, list, update, skillDraft, promote (calls skillsRepo
   with `source: 'extracted'`; optional `agentsRepo.setSkills` merge).
3. Wire `conventionsRepo` on `Container`; register routes in `modules/index.ts`.
4. Tests:
   - unit: `verify.ts`, fingerprint/dedupe, skill-body
   - `conventions.it.test.ts`: extract with MockLLM + temp files,
     accept, draft excludes rejected, promote creates skill

## Phase 2 — client UI

1. Add NAV Conventions → `/repos/:repoId/conventions`.
2. Build `ConventionsView` + `ConventionCard` +
   `CreateSkillFromConventionsModal` per client spec / mockups.
3. Hooks: `useConventions`, `useExtractConventions`, `useUpdateConvention`,
   `useConventionSkillDraft`, `usePromoteConventions`.
4. Extend i18n; component tests for accept/reject and modal.

## Phase 3 — API Contract Reviewer skills pack

Seed / docs already have the agent + `api-contract-breaking-change`.
Add three more directive skills (good/bad examples in body):

| Skill | Focus |
|---|---|
| `api-contract-breaking-change` | (existing) remove/rename public contract |
| `api-response-schema` | response shape / nullability / types |
| `api-semver-discipline` | when a change needs a major bump |
| `api-deprecation-policy` | mark deprecated instead of silent delete |

1. Bodies in `server/src/db/seed-skills.ts` + `docs/agent-prompts/skills/`.
2. Seed links all four to API Contract Reviewer (order preserved).
3. Document one skill as URL-importable in the PR (manual path for demos);
   keep seed authoritative for hermetic boots.
4. Optional: tiny fixture note under `docs/` for A/B review experiment
   (with skills vs without) — no requirement to commit a live PR.

## Phase 4 — verify & PR

1. `cd server && pnpm exec vitest run --exclude '**/*.it.test.ts'`
2. Integration tests with Docker if available.
3. `cd client && pnpm test` + typecheck both packages.
4. Run `.claude/skills/pr-self-review` before opening the PR.
5. PR description: human-readable feature summary first, then Demo
   (screenshots/video), Flow, Architecture, Schema/API, Grounding &
   security, Product decisions, API Contract Reviewer, Testing, Known
   limitations.

## Non-goals this iteration

- Async JobRunner extract
- e2e hermetic flow JSON
- Changing `getConventionSamples` ranking algorithm beyond optional
  diversity helper inside the conventions module
