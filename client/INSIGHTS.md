# client — Insights

## What Works

## What Doesn't Work

## Codebase Patterns

## Tool & Library Notes

## Recurring Errors & Fixes

- 2026-08-05: The checked-in conventions list endpoint currently returns `ConventionCandidate[]` (`server/src/modules/conventions/service.ts:132-135`), while extraction and the advertised GET contract use `ConventionExtractionResult`. `client/src/lib/hooks/conventions.ts` intentionally accepts both shapes, and `ConventionsView` renders scan metrics only for the full result — do not fabricate missing proposed/verified/dropped counts or remove compatibility until the list API is aligned.
- 2026-08-05: Supersedes the list-shape mismatch note above — `GET /repos/:id/conventions` now returns `ConventionExtractionResult` (candidates + scan fields derived from stored rows). Client hooks consume only that envelope.

## Decisions

- 2026-08-02: Run Cost Badge lives at `src/components/run-cost-badge` (not `@devdigest/ui`). Variants: `compact` (`$0.014` / `—`) for PR list + sidebar Stat; `withTokens` (`9,119 tok · $0.0013`) for RunHistory meta under timestamp. Wire points: `PRRow`, `RunHistory`, `TraceBody` (COST between Tokens and Findings).
- 2026-08-03: Findings hover card lives at `src/components/findings-hover-card` (same cross-route pattern as run-cost-badge). Shared by PR list FINDINGS cell, ReviewRunAccordion header, and RunHistory timeline. Callers own data (lazy `usePrReviews` on list; in-memory on detail). Local SeverityFilterBar chip mirrors Chip visuals with `aria-pressed` — vendored Chip does not forward ARIA props.
- 2026-08-05: Skills Lab built at `src/app/skills/` (list) + `src/app/skills/[id]/` (5-tab detail: Config/Preview/Evals/Stats/Versions), mirroring `src/app/agents/` structure exactly (`*ListView`/`*EditorView`/`*Editor` + `_components/<Tab>` + `?tab=` state via a `useSkillEditorTab` hook). Evals tab is a stub (`EmptyState`, no data fetch) and Versions tab is deliberately read-only (no Diff/Restore, even though a design mockup showed them) — both are scope decisions, not omissions. Stats tab's "Used by" count/agent-list is real (`GET /skills/:id/agents`); Pull Frequency/Accept Rate/Findings(30D) render a `stats.noData` placeholder since no eval/stats aggregation feature exists yet — never fabricate those numbers.
- 2026-08-05: `client/src/vendor/shared/contracts/knowledge.ts` is a **physical duplicate** of `server/src/vendor/shared/contracts/knowledge.ts`, not a symlink or path-alias — confirmed by `diff`, the two copies had drifted (client was missing `AgentVersion`/`AgentVersionConfig`) and were resynced this session. Any new/changed type in that file must be manually copied to both locations; no sync script exists, and it's easy to add a type to only one side without either package's typecheck catching it (both sides typecheck independently). `reviewer-core`'s copy is a real tsconfig path alias into `server/`'s file, not a third duplicate.
- 2026-08-05: No drag-and-drop library exists in this repo (checked `package.json`). The Agent editor's Skills tab reorders linked skills with plain up/down `ArrowUp`/`ArrowDown` icon buttons instead — don't add a DnD dependency for this without asking first.
- 2026-08-05: SkillsTab's reorder buttons (`AgentEditor/_components/SkillsTab`) must derive `canMoveUp`/`canMoveDown`/swap-target from the FULL linked-skill order, never from the post-filter `visibleLinked` array — when a filter string hides sibling rows, an index computed against the filtered list points at the wrong neighbor and silently produces an unexpected reorder. The visible row must still look up its position via `linkedIds.indexOf(sk.id)` against the unfiltered order. Covered by a regression test asserting a reorder while filtered swaps against the correct full-order neighbor.
- 2026-08-05: `@devdigest/ui`'s `Markdown` component (`src/vendor/ui/primitives/Markdown.tsx`) had `components` overrides only for `p`/`strong`/`code`/`a` — `h1`–`h3`/`ul`/`ol`/`li` had NO overrides, so this app's global styles strip their default browser styling and they render as unstyled flat text (confirmed via `agent-browser` DOM inspection: `document.querySelectorAll('.dd-md h2, .dd-md ul, .dd-md li')` returned zero elements on real bulleted skill content). Fixed by adding explicit style overrides for all of them. Since `Markdown` is shared UI kit, this fix affects every consumer, not just Skills Preview — check other markdown-rendering surfaces (agent output, PR descriptions) render correctly too if touching this file again.
- 2026-08-05: Skill body editor (`ConfigTab`) got a lightweight, dependency-free markdown syntax-highlight overlay (`ConfigTab/highlight.tsx` + `MarkdownEditor.tsx`) — a transparent `<textarea>` (visible caret only, `color: transparent`) layered via CSS grid over a `<pre>`-like `<div aria-hidden>` that renders the same text tokenized by a small regex tokenizer (headings/list-markers/inline-code/bold only, not a full markdown grammar). Chosen over adding CodeMirror/Monaco per this repo's "no third-party component library without asking" convention — confirmed with user before implementing. The two layers MUST share identical font/line-height/padding or the highlight drifts from the real caret; scroll position is synced manually via `onScroll`.
- 2026-08-05: `TYPE_COLOR.rubric` (`SkillCard/constants.ts`) was `var(--info)`, a muted gray (`#6b7280`) shared globally with severity badges — it read as near-monochrome next to `convention`'s saturated green and `security`'s red. Swapped to `var(--accent)` (the brand blue) since `--info` is a shared/global token not meant to be repurposed per-feature; don't reuse severity/status colors for unrelated categorical badges.
- 2026-08-05: `SkillCard` gained a `compact` prop (hides description + badge row, tighter padding) for the skill-detail page's left rail — the original always-full-size card was too tall/heavy for a narrow list-of-many-items rail. Default (no prop) is unchanged for the `/skills` grid page.

## Open Questions

## Session Notes

- 2026-08-03: Lesson doc mentions `costByRun` in FindingsTab — not present in tree; only `findingsByRun` was added. GRID cost track is `72px` (not the lesson's `78px`).
