# Architecture Anti-Patterns

Avoid these when organizing or reviewing `@devdigest/web` code. Sources agree
there is no one true tree — but these failure modes show up repeatedly
(Wieruch, Comeau, Kent C. Dodds, profy.dev screaming architecture, Bulletproof,
Next.js docs, Makerkit).

## 1. Fat pages

**Bad:** `page.tsx` fetches data, maps domain objects, and renders a large UI tree.

**Good:** Thin page that composes `_components/<Name>/` (and shared widgets).
Orchestration lives in hooks.

## 2. Type-based dumping

**Bad:** Every new file goes into global `components/`, `hooks/`, or `utils/`
by file type, so one feature is scattered across four folders.

**Good:** Colocate route UI under `app/.../_components/<Name>/` with its test.
Use global folders only for truly shared layers (`lib/hooks`, `components/`,
`vendor/ui`).

## 3. Premature `shared/` / junk-drawer utils

**Bad:** Create `lib/utils/misc.ts` “for later” or park feature-specific helpers
next to unrelated date formatters.

**Good:** Keep helpers next to the sole consumer. Promote on the **second real
use**, and only if the helper is still cohesive (Paulund, Comeau).

## 4. Domain logic in primitives

**Bad:** `vendor/ui` Button that knows about Review verdicts or agent status copy.

**Good:** Primitives stay generic; domain labels and rules stay in feature UI
or hooks.

## 5. Cross-feature private imports

**Bad:** `app/repos/...` imports `app/agents/_components/AgentCard` internals.

**Good:** Promote shared UI to `src/components/` or pass data down from a
common parent.

## 6. Fetch in presentational leaves

**Bad:** Deep child calls `fetch` / opens its own Query with hardcoded URLs.

**Good:** `lib/hooks` + `lib/api.ts`; children receive props or a focused hook
at the feature boundary.

## 7. Duplicated contracts

**Bad:** Hand-written `type Review = { ... }` in the client that drifts from
the API.

**Good:** `@devdigest/shared` Zod schemas / inferred types.

## 8. Ignoring Next private-folder intent

**Bad:** Putting routable-looking folders under `app/` that collide with future
special files, or growing large non-UI trees without `_` when the team
standard is `_components`.

**Good:** Follow repo convention: feature UI under `_components`; know
[Next.js private folders](https://nextjs.org/docs/app/getting-started/project-structure#private-folders).

## 9. “And”-test failures

**Bad:** One component named vaguely (`Panel`, `Manager`) that loads data,
formats it, and owns three unrelated interactions.

**Good:** Split by responsibility; compose with children/slots (Thinking in
React; Comeau).

## 10. Skipping the name test for hooks

**Bad:** `useEffect` soup copied between components with no extractable name.

**Good:** Extract `useSomething` when the intent is clear (official React
custom hooks guide). Leave trivial one-off state in the component.
