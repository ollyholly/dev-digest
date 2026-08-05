# Conventions Extractor — product ideas & quality upgrades

Companion to `server/specs/conventions-extractor.md`. The base lesson asks
for extract → curate → skill. Most raw model findings are weak; product
leverage is **better sampling, better grounding, better curation UX**, and
**clear promotion paths** — not more LLM calls.

## Ideas ranked by impact

### P0 — ship with v1 (quality gates)

1. **Consistency score, not “model confidence”**  
   Prompt the model for supporting vs counterexample counts; after
   grounding, clamp displayed confidence to verified consistency. Keep a
   **low floor (~0.35)** so *inconsistently followed* house rules still
   surface — those are the most useful skills.

2. **Fingerprint-preserving rescan**  
   Users hate re-accepting the same card. Upsert by normalized rule
   fingerprint; keep accept/reject; refresh evidence + SHA.

3. **One merged skill by default + optional split-by-category**  
   Merged body matches the mockup. When accepted categories ≥ 3 **or**
   draft tokens exceed ~1.5k, offer “Create one skill per category” so
   agents can attach only relevant rules.

4. **Evidence must be clickable and SHA-pinned**  
   Trust collapses without a one-click path to the cited lines on GitHub.

5. **Scan quality strip**  
   Show `proposed → verified → dropped (reason)` and sampled file count
   so users understand why the list is short — mirrors Claude Code
   `/insights` honesty.

### P1 — high-value follow-ups

6. **Config-aware seeding**  
   Parse eslint/prettier/tsconfig into *deterministic* candidate seeds
   (e.g. `semi: false`, `strict: true`) before the LLM call; ask the
   model only to phrase directives + find code evidence. Raises recall
   without a second model.

7. **Directory / language diversity in the 12-file sample**  
   `getConventionSamples` today is pure rank. Cap per top-level folder
   so the model doesn’t only see `src/api/*`.

8. **Multi-evidence rows**  
   Store 2–3 supporting snippets per rule (or counterexamples) so the
   skill body can show “good / bad” pairs like API Contract skills.

9. **Promote → attach in one click**  
   Modal checkbox: “Also link to agent …” (default API Contract or
   General Reviewer). Closes the loop to a reviewable skill faster.

10. **Stale marker after HEAD moves**  
    If `scanned_sha !== repo HEAD`, badge the page “Scan is N commits
    behind” + soft CTA to re-scan without deleting decisions.

### P2 — product expansions (Claude Code `/insights` parallels)

11. **Insight actions beyond Skills**  
    Per candidate: “Add to CLAUDE.md / AGENTS.md snippet”, “Create
    custom skill”, “Ignore pattern”. Same insight, multiple sinks.

12. **PR-diff convention check (conformance lite)**  
    Once a skill exists, a cheap pass flags PRs that violate accepted
    conventions — without a full agent review.

13. **Community convention packs**  
    Export/import grounded convention JSON (plugin contract already
    sketches `PluginConvention`) for org-wide packs.

14. **Human-written seeds**  
    Let users paste 1–2 known house rules; extractor finds evidence and
    siblings — boosts precision when the repo has little signal.

15. **Async extract + cancel**  
    For large monorepos; progress via existing SSE/`JobRunner`.

16. **“Why dropped?” expanders**  
    Per-scan list of drop reasons (path escape, trivial snippet, no match)
    so power users can improve sampling without reading server logs.

17. **Accept-all-above-threshold**  
    One click: accept every pending candidate with confidence ≥ N
    (default 0.7). Still allows undo per card.

18. **Diff-aware re-rank on rescan**  
    Prefer files changed since `scanned_sha` when refreshing samples so
    new house patterns surface faster after a big refactor.

19. **Skill preview before promote**  
    Inline rendered markdown (reuse Skills Preview) beside the editor in
    the create modal so authors see the agent-facing prompt, not only the
    source.

20. **Agent suggestion chip**  
    After promote, soft prompt: “Link to General Reviewer?” with one-click
    attach — without forcing an agent_id in the create form.

## What we deliberately skip

- Auto-accepting high-confidence rows (noise rate is high).
- One skill per candidate by default (prompt bloat; agents ignore
  walls of micro-skills).
- Blind trust of model line numbers (always recompute).
- Second LLM “critic” pass in v1 (cost/latency; grounding is cheaper).

## Success metrics (manual for the course)

| Signal | Target |
|---|---|
| Verified / proposed after grounding | ≥ 50% on seeded `payments-api` |
| User accepts ≥ 1 candidate without editing | Common on first scan |
| Accepted → skill → linked agent → review finds a convention break | Demo path works |
| Rescan keeps prior accepts | No re-click tax |
