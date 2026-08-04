# `@devdigest/e2e` — docs

Notes about the hermetic runner, seeded-data assumptions, and locator
conventions that do not belong in [`AGENTS.md`](../AGENTS.md).

**Start here:** [`../README.md`](../README.md) · [`../../TESTING.md`](../../TESTING.md).

## Specs vs flows (important)

- **`e2e/specs/*.flow.json`** — agent-browser **flow tests** only (ordered CLI
  steps). Not product/planning specs.
- **Product / planning specs** live under sibling packages:
  [`../../client/specs/`](../../client/specs/),
  [`../../server/specs/`](../../server/specs/),
  [`../../reviewer-core/specs/`](../../reviewer-core/specs/).

Do not add planning-spec templates under `e2e/specs/` — that directory is
reserved for flow JSON the runner executes.
