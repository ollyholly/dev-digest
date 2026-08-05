# `@devdigest/ui` — design system

The DevDigest web app's component library. One import surface, one stylesheet,
themed entirely through CSS variables.

## Usage

```tsx
// once, at the app root (e.g. app/layout.tsx):
import "@devdigest/ui/styles.css";

// anywhere:
import { Button, Card, SeverityBadge, LineChart } from "@devdigest/ui";
```

Everything is re-exported from the single barrel `index.ts` — **always import
from `@devdigest/ui`**, never reach into a layer file directly. The TS path
alias is configured in `tsconfig.json` (`@devdigest/ui` → `src/vendor/ui`).

## Layout

The library is organized into layers. Each layer is a folder with **one file
per component** plus a barrel `index.ts`; a few standalone, cross-feature
components live as flat files at the root.

| Layer | Folder | What's in it |
|-------|--------|--------------|
| **Tokens** | `primitives/tokens.ts` | `Severity`/`Category` unions, the `SEV` & `CAT` maps (color + icon + label), `ButtonProps` |
| **Primitives** | `primitives/` | `Button`, `IconBtn`, `Badge`/`SeverityBadge`/`CategoryTag`, `Chip`, `Avatar`, `ConfidenceNum`, `MonoLink`, `ProgressBar`/`PercentProgress`, `CircularScore`, `Toggle`, `Kbd`, `SectionLabel`, `Card`, `EmptyState`, `Skeleton`, `ErrorState`, `Markdown` |
| **Kit** | `kit/` | `Drawer`, `Modal`, `Tabs`, `Dropdown`, `FormField`, `TextInput`, `SelectInput`, `SearchableSelect`, `Textarea`, `Checkbox` |
| **Charts** | `charts/` | `Sparkline`, `LineChart`, `Donut`, `BarRow`, `MetricCard` (Recharts + lightweight inline SVG) |
| **Shell** | `shell/` | `AppFrame`, `Sidebar`, `Topbar`, `NavItem`, `RepoSwitcher` — the app frame |
| **Command palette** | `command-palette/` | `CommandPalette` (Cmd+K), `ShortcutsHelp` (`?`) |
| **Icons** | `icons.tsx` | `Icon` registry + `IconName` type (single source; not split) |
| **Nav** | `nav.ts` | `NAV`, `SETTINGS_SECTIONS`, `SHORTCUTS`, `resolveHref()` — route/shortcut config |
| **Standalone** | `LiveLogStream.tsx`, `ExportWizardSteps.tsx` | cross-feature components without a natural layer |

## Tokens & theming

Visual tokens are **CSS variables** defined in `styles.css` and switched by the
`data-theme` attribute (dark/light). Components never hard-code colors — they
reference vars like `var(--accent)`, `var(--text-muted)`, `var(--border)`.

Severity/category semantics are centralized in `primitives/tokens.ts`:

- `SEV[severity]` → `{ c, bg, icon, label }` for `CRITICAL | WARNING | SUGGESTION | INFO`
  (maps to `--crit`/`--crit-bg`, `--warn`/`--warn-bg`, `--sugg`/`--sugg-bg`, `--info`/`--info-bg`).
- `CAT[category]` → `{ icon, label }` for `bug | security | perf | style | test`.

Use `SeverityBadge` / `CategoryTag` rather than reading the maps directly when
you just need the rendered chip.

## Accepted domain-specific exceptions

`@devdigest/ui` is meant to be domain-agnostic, but a few pieces intentionally
encode DevDigest's review vocabulary rather than pure design tokens. These are
deliberate, not oversights — moving them would either fragment a
widely-reused badge across many call sites or break internal coupling inside
this package itself:

- **`primitives/tokens.ts` (`Severity`/`Category`, `SEV`/`CAT`) and
  `primitives/Badge.tsx` (`SeverityBadge`/`CategoryTag`)** — these bake in the
  finding severity/category taxonomy. Kept here because `SeverityBadge` /
  `CategoryTag` are consumed from ~10 call sites across `app/` and
  `components/` (`FindingCard`, `FindingPopoverItem`, `SeverityBadges`, the
  showcase, …) as *the* canonical rendering of a severity/category chip;
  splitting the render primitive from its token map across a package
  boundary would just relocate the coupling, not remove it. `Severity` here
  is intentionally a superset (`CRITICAL | WARNING | SUGGESTION | INFO`) of
  `@devdigest/shared`'s `Severity` (`CRITICAL | WARNING | SUGGESTION`) — see
  the "Severity superset" note below.
- **`nav.ts` (`NAV`, `SETTINGS_SECTIONS`, `SHORTCUTS`, product copy like
  "Accept finding")** — `shell/Sidebar.tsx`, `shell/NavItem.tsx`, and
  `command-palette/ShortcutsHelp.tsx` read this config directly, so it isn't
  just consumed by the app — the design system's own shell components are
  built around it. Treat `nav.ts` as this app's single navigation config
  living inside the shell it configures, not a generic primitive; do not add
  a second nav config elsewhere.

Domain-specific code that had **no** such internal coupling was moved out:
`AutoTriggerStatus` ("Auto-review" product copy + a `Settings` deep-link) now
lives at `src/components/auto-trigger-status/` since nothing inside
`@devdigest/ui` depended on it.

### Severity superset (by design, not a bug)

`primitives/tokens.ts`'s `Severity` includes `INFO` on top of
`@devdigest/shared`'s `CRITICAL | WARNING | SUGGESTION`. This is deliberate:
`INFO` is a **UI-only** severity level (used e.g. for informational chips in
the showcase / design system) that the review pipeline never emits over the
API. Code that receives a real `Severity` from `@devdigest/shared` and passes
it into a UI component consuming this wider type is safe — the UI type is a
superset, so every valid API value is also a valid UI value. Do not remove
`INFO` to "match" the API contract; it is only unreachable in the other
direction (UI code must not assume every UI `Severity` came from the API).

## Showcase

Every component is rendered (in both themes) by the **`Gallery`** component
at `src/dev/showcase/Showcase.tsx` — dev tooling, not a mounted product
route (there is no `/showcase` page). The smoke test
(`src/test/smoke.test.tsx`) mounts that gallery, so a broken export or render
fails CI. When you add or change a component, add it to the showcase.

## Conventions

- **One component per file**, named in PascalCase; the layer's `index.ts` is the
  only re-export point.
- **Inline styles** keyed off CSS variables (no per-component stylesheet).
- Prop types are exported alongside the component when consumers need them
  (e.g. `ButtonProps`, `Command`, `ChartSeries`).
