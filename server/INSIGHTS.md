# server — Insights

## What Works

## What Doesn't Work

## Codebase Patterns

## Tool & Library Notes

## Recurring Errors & Fixes

- 2026-08-05: `AgentsService` ctor takes `Container` and reads `container.agentsRepo` — constructing with `{ db }` leaves `this.repo` undefined (`Cannot read properties of undefined (reading 'getById')`). Integration tests must pass `{ agentsRepo: new AgentsRepository(db) }` (see `test/agents-versions.it.test.ts`).

## Decisions

- 2026-08-02: Run Cost Badge (surfaces: PR list COST column, timeline under timestamp, trace sidebar Stats). Persist `agent_runs.cost_usd` + `head_sha` at run time — never recompute from tokens×price on read. PR-list cost = wave sum (`head_sha === last_reviewed_sha`) with fallback to all completed runs; null → "—" not "$0.00". Shared UI: `client/src/components/run-cost-badge` (`compact` | `withTokens`). Migration `0010_open_mercury.sql` re-adds `cost_usd` (dropped in 0009) and adds `head_sha`.
- 2026-08-03: PR-list `findings_by_severity` is COST-style (every review of the PR), not latest-only like SCORE. `rollupSeverities` returns shared uppercase `SeverityCounts`. `findings.review_id` indexed in migration `0011_complete_violations.sql` — first findings join on the list path.
- 2026-08-05: Skills feature — new `modules/skills/` (routes/service/repository/helpers/constants) mirrors `modules/agents/` exactly (route→service→repo, `bumpVersion` decided by the service not the repo). `skills`/`skill_versions`/`agent_skills` tables and the `Skill`/`SkillType`/`SkillSource`/`AgentSkillLink` contracts were ALREADY pre-scaffolded before this session — only the CRUD module, run-time wiring, and UI were missing. The critical gap: `run-executor.ts` never resolved an agent's linked skills into `reviewPullRequest({ skills })` — `reviewer-core`'s `assemblePrompt()` already supported it. Fix: fetch `agentsRepo.linkedSkills(agent.id)`, filter `enabled`, map to `.skill.body` (already ordered), pass as `skills` when non-empty. `AgentsRepository.agentsUsingSkill(skillId)` added (reverse of `linkedSkills`) for the Skill detail page's real "Used by" count — `SkillsRepository` deliberately never touches `agent_skills` (ownership split preserved: skills module owns `skills`/`skill_versions`, agents module owns `agent_skills`). URL/community skill imports always create the skill `enabled: false` — the untrusted-content vetting gate is enforced at persistence time, not in the UI.
- 2026-08-05: `server/tsconfig.json`'s `include` was `["src/**/*.ts"]` only — standalone CLI scripts under `server/scripts/` were silently excluded from `pnpm typecheck`. Widened to `["src/**/*.ts", "scripts/**/*.ts"]` when adding `scripts/pr-self-review.ts`. Check this include list before assuming a new top-level dir gets typechecked.
- 2026-08-05: `SkillsService.importFromUrl` (`modules/skills/service.ts`) originally called raw `fetch(url)` on a fully user-supplied URL with zero restriction — an SSRF hole (cloud metadata 169.254.169.254, localhost, RFC1918 ranges all reachable server-side). Fixed with `modules/skills/url-guard.ts`'s `assertSafeImportUrl`: https-only, hostname allowlist (`raw.githubusercontent.com`/`gist.githubusercontent.com` — matches what `communityRawUrl` already constructs), plus a resolved-IP check (not just hostname) via `dns/promises.lookup` to close the DNS-rebinding gap, and `fetch(url, { redirect: 'error' })` since a followed redirect isn't re-validated. Also switched the body-size cap from post-buffer (`res.text()` then check `Buffer.byteLength`) to a streaming reader that aborts mid-read — the prior code buffered the full response before ever checking `MAX_IMPORTED_BODY_BYTES`. If a future skill-import path needs a genuinely arbitrary host, this allowlist must be revisited deliberately, not bypassed.
- 2026-08-05: `SkillsService`'s constructor took the full `Container` class, so seed/CLI code that only needs `.create()` (which only touches `skillsRepo`) had to `as unknown as Container` cast a partial object — no type safety at all. Fixed by exporting `SkillsServiceDeps = Pick<Container, 'skillsRepo' | 'communityCatalog' | 'agentsRepo'>` from the service module and typing the constructor against that instead of the concrete `Container` class. A real `Container` still satisfies it structurally (no route-layer changes needed), but callers outside the DI graph (seed.ts) can now build a properly-typed deps object instead of casting through `unknown`.

## Open Questions

## Session Notes
