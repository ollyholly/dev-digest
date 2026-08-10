# Spec: Conventions Extractor (UI)

## Goal

Skills Lab → Conventions page where a user scans the active repo, curates
candidates (accept / reject / edit), and opens a **Create skill from
conventions** modal that merges accepted findings into an editable Skill
before save — matching the attached design mockups.

## Scope

- In:
  - Nav item under Skills Lab: Conventions →
    `/repos/:repoId/conventions` (repo-scoped deep link).
  - Page chrome: heading “Conventions in {repo}”, subtitle, Re-scan /
    Run extraction, Create skill (enabled when ≥1 accepted).
  - Candidate cards: category badge, editable rule, confidence,
    evidence snippet + GitHub link pinned to `scanned_sha` when present,
    Accept / Reject (tri-state with Undo to pending).
  - Modal “Create skill from conventions”: info banner, name /
    description / type=`convention` / enabled toggle, markdown body
    editor (reuse Skills ConfigTab `MarkdownEditor` patterns), Cancel +
    Create skill; optional “Split by category” when multiple categories.
  - After create: toast / status “Saved as v1 · added to Skills Lab”,
    navigate to `/skills/:id?tab=config`.
  - React Query hooks in `lib/hooks/conventions.ts`; i18n under
    `messages/en/conventions.json` (extend existing stub).
  - Component tests for card actions and modal draft editing.
- Out:
  - Drag-and-drop multi-select (use Accept buttons + count).
  - Live token counter requiring a tokenizer package (show approx
    `ceil(chars/4)` like other surfaces, or omit if no shared util).
  - Building a second markdown editor dependency (CodeMirror/Monaco).

## Acceptance criteria

- [ ] Sidebar shows Conventions; `g c` shortcut optional; active state
      via existing `pathname.includes("/conventions")` helper.
- [ ] Empty state CTA runs extraction; loading / error / candidate list
      states use i18n keys.
- [ ] Accept / Reject update via PATCH; optimistic UI with rollback.
- [ ] Create skill opens modal prefilled from
      `GET …/skill-draft?mode=merged` (server draft); edits stay local
      until promote.
- [ ] Rejected candidates never appear in the draft body.
- [ ] Evidence path is a link to GitHub blob at `scanned_sha` (fallback:
      default branch) — opens in a new tab.
- [ ] Promote calls `POST …/promote` then navigates to the new skill.
- [ ] Visual language matches Skills Lab (dark theme, existing
      `@devdigest/ui` Modal / Button / FormField / Toggle) — no new
      component library.

## Out of scope

- Eval dashboard / Agent Performance nav stubs.
- Recording the demo video inside the repo.

## Boundaries

**Touch:**

- `client/src/vendor/ui/nav.ts` (+ SHORTCUTS)
- `client/src/app/repos/[repoId]/conventions/**`
- `client/src/lib/hooks/conventions.ts`
- `client/messages/en/conventions.json`, `shell.json` if needed
- `client/src/vendor/shared/contracts/knowledge.ts` (keep in sync)

**Do not touch:**

- Unrelated Skills Lab tabs / Agent editor except optional deep-link
  after promote.
- Vendored UI primitives unless a shared bug blocks the modal (prefer
  local styles).

## Gotchas

- Prefer repo-scoped route over global `/conventions` so refresh keeps
  the correct repo.
- Dirty-form guard: late-arriving skill-draft must not overwrite user
  edits in the modal.
- Reuse `MarkdownEditor` from skills ConfigTab via careful import —
  **do not** import across private `_components` of another route; either
  promote the editor to `src/components/` or duplicate the thin overlay
  locally (prefer promote if already reusable).
- i18n catalog already has partial conventions strings — extend, don’t
  hard-code English.

## UI flow (matches mockups)

1. User opens Skills Lab → Conventions for `acme/payments-api`.
2. Clicks **Run extraction** / **Re-scan** → cards appear.
3. Accepts useful cards; rejects noise; may edit rule text inline.
4. Clicks **Create skill** → modal:
   - Banner: “Merged from N accepted conventions in {repo}. Everything
     below is editable before you save.”
   - Fields: Name, Description, Type (`convention`), Enabled.
   - Body: `{name}.md` editor with house-rules markdown.
   - Footer: status hint + Cancel / Create skill (sparkles).
5. On success → Skills Lab skill detail.

## Component map

```
app/repos/[repoId]/conventions/page.tsx
  _components/ConventionsView/
    ConventionsView.tsx
    ConventionCard/
    CreateSkillFromConventionsModal/
    EmptyState / ScanSummary
lib/hooks/conventions.ts
```
