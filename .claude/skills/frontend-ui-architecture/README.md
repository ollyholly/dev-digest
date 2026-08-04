# Frontend UI Architecture Skill

**Version:** 1.0.0

Agent skill for **architecture and code organization** in DevDigest’s Next.js
client (`client/` / `@devdigest/web`): where components, hooks, utils, helpers,
constants, and business logic belong; how to colocate; how dependency direction
works; how the data-fetching layer is layered.

This is **not** a performance skill and **not** a visual-design skill. Sibling
skills cover React anti-patterns, Next RSC/async APIs, and UI polish.

## Design stance

Researched sources agree: there is no single “correct” folder structure.
Structure should **scale with project size** and lean on **colocation**. Rules
here are adapted to DevDigest’s existing layout (thin `page.tsx`, private
`_components/`, `lib/hooks`, `vendor/ui`) — not a literal Feature-Sliced Design
or Bulletproof React folder rename.

## Usage

For agents: load `SKILL.md`, then open the relevant file under `references/`
for the decision at hand.

For humans: start with `SKILL.md` for the workflow; use this README for the
source list.

## File structure

```text
frontend-ui-architecture/
├── SKILL.md                              # Triggers, version, workflow
├── README.md                             # This file + bibliography
├── metadata.json                         # Version + reference URLs
└── references/
    ├── layers-and-folders.md             # Layer map + DevDigest tree
    ├── placement-decision-table.md       # Components / hooks / utils / logic
    ├── data-fetching-layer.md            # page → hooks → api → contracts
    ├── import-boundaries.md              # Allowed dependency direction
    └── anti-patterns.md                  # Structural failure modes
```

## Themes covered

1. Project structure (flat → type-based → feature/route-based → layered)
2. Feature-based vs type-based (hybrid used here)
3. Where business logic lives (UI / hooks / pure functions / API)
4. Component splitting (SRP, “and” test, composition)
5. Constants, utils, helpers (colocate vs promote; no junk drawers)
6. Custom hooks (when to extract; name test)
7. Naming conventions
8. Colocation as a cross-cutting rule
9. Next.js App Router (private folders, route groups, thin `app/`)

## References

### Official

1. [Next.js — Project Structure](https://nextjs.org/docs/app/getting-started/project-structure)
2. [React — Thinking in React](https://react.dev/learn/thinking-in-react)
3. [React — Reusing Logic with Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks)
4. [React — Sharing State Between Components](https://react.dev/learn/sharing-state-between-components)
5. [React — Extracting State Logic into a Reducer](https://react.dev/learn/extracting-state-logic-into-a-reducer)
6. [Feature-Sliced Design — Overview](https://feature-sliced.design/docs/get-started/overview)
7. [Bulletproof React — Project Structure](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md)

### Architecture guides (primary corpus)

8. [Kent C. Dodds — Colocation](https://kentcdodds.com/blog/colocation)
9. [Josh W. Comeau — Delightful React File/Directory Structure](https://www.joshwcomeau.com/react/file-structure/)
10. [Robin Wieruch — React Folder Structure](https://www.robinwieruch.de/react-folder-structure/)
11. [profy.dev — React Folder Structures & Screaming Architecture](https://profy.dev/article/react-folder-structure)
12. [Makerkit — Next.js App Router Project Structure](https://makerkit.dev/blog/tutorials/nextjs-app-router-project-structure)
13. [freeCodeCamp — Reusable Architecture for Large Next.js Applications](https://www.freecodecamp.org/news/reusable-architecture-for-large-nextjs-applications/)
14. [DEV — The Next.js 15 App Router Project Structure That Scales](https://dev.to/krunal_groovy/the-nextjs-15-app-router-project-structure-that-scales-with-examples-47ha)
15. [DEV — Production-Ready Next.js App Router Architecture Playbook](https://dev.to/yukionishi1129/building-a-production-ready-nextjs-app-router-architecture-a-complete-playbook-3f3h)
16. [YukiOnishi1129/next-app-router-architecture — docs](https://github.com/YukiOnishi1129/next-app-router-architecture/tree/main/docs)
17. [Web Dev Simplified — React Folder Structure](https://blog.webdevsimplified.com/2022-07/react-folder-structure/)
18. [Paulund — Structuring Large React Apps](https://paulund.co.uk/notebook/react/structuring-large-react-apps)
19. [DevCraftly — Project Structure & Conventions](https://devcraftly.com/react/project-structure-best-practices/)
20. [Code With Seb — Modular Feature Design in React](https://www.codewithseb.com/blog/modular-feature-design-react-plug-and-play)

### Related in-repo skills (not duplicated here)

- `.claude/skills/react-best-practices` — component/hooks quality rules
- `.claude/skills/next-best-practices` — Next file conventions & RSC details
- Personal/global: `vercel-react-best-practices` — performance

## Repo conventions this skill encodes

See also [`client/AGENTS.md`](../../../client/AGENTS.md): thin pages, colocated
`_components`, server state via `lib/hooks` → `lib/api.ts`, chrome in
`components/app-shell`, primitives in `vendor/ui`.
