/**
 * Mechanically enforces the dependency-direction rules documented in
 * `.claude/skills/onion-architecture/` for `@devdigest/api`:
 *   - routes.ts: schema -> getContext -> one service call -> status mapping.
 *     Must never import adapters or touch Drizzle/SQL directly.
 *   - repository.ts: Drizzle/SQL only — no HTTP, LLM, or git adapters.
 *   - service.ts / pipeline/*.ts: depend on ports (via the Container), not
 *     concrete adapter classes.
 *   - src/platform/** (the Container composition root) is exempt — it is the
 *     one place allowed to construct concrete adapters.
 *
 * Run: `pnpm depcruise` (or `pnpm exec depcruise --config .dependency-cruiser.cjs src`).
 *
 * @type {import('dependency-cruiser').IConfiguration}
 */
module.exports = {
  forbidden: [
    {
      name: 'routes-no-adapters',
      severity: 'error',
      comment:
        "Route handlers must call exactly one service method and never import adapters directly — see onion-architecture skill rule 5 (never call container.git/.secrets/.llm/.db for business work from routes.ts).",
      from: { path: '^src/modules/[^/]+/routes\\.ts$' },
      to: { path: '^src/adapters/' },
    },
    {
      name: 'routes-no-drizzle',
      severity: 'error',
      comment:
        'Routes must not touch Drizzle/SQL directly — only repository.ts may (onion-architecture skill rule 1/3).',
      from: { path: '^src/modules/[^/]+/routes\\.ts$' },
      to: { path: '(^src/db/schema|/drizzle-orm/)' },
    },
    {
      name: 'repository-no-adapters',
      severity: 'error',
      comment:
        'repository.ts is Drizzle/SQL only — no HTTP, LLM, or git adapters (onion-architecture skill rule 3).',
      from: { path: '^src/modules/[^/]+/repository(\\.ts$|/.*\\.ts$)' },
      to: { path: '^src/adapters/' },
    },
    {
      name: 'service-no-concrete-adapters',
      severity: 'error',
      comment:
        'Services depend on ports/repos, not concrete adapter classes (onion-architecture skill rule 2) — obtain them from the Container instead of importing the adapter module.',
      from: { path: '^src/modules/[^/]+/(service|pipeline/.*)\\.ts$' },
      to: { path: '^src/adapters/' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
  },
};
