/**
 * Path patterns and thresholds for deterministic Smart Diff classification.
 * Keep every regex / basename / directory name here — classify.ts must not
 * inline new patterns.
 */

import type { SmartDiffRole } from '@devdigest/shared';

/** Group render order: business logic first, generated last. */
export const ROLE_ORDER: readonly SmartDiffRole[] = ['core', 'wiring', 'boilerplate'];

/** Changed-line total at or above which we suggest splitting the PR. */
export const TOO_BIG_CHANGED_LINES = 400;

/** Suggested split names keyed by role (shown when too_big). */
export const SPLIT_NAME_BY_ROLE: Record<SmartDiffRole, string> = {
  core: 'Core logic',
  wiring: 'Wiring',
  boilerplate: 'Boilerplate',
};

/** Lockfile basenames — always boilerplate. */
export const LOCKFILE_BASENAMES: ReadonlySet<string> = new Set([
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'bun.lock',
  'bun.lockb',
  'Cargo.lock',
  'go.sum',
  'poetry.lock',
  'composer.lock',
  'Gemfile.lock',
  'uv.lock',
]);

/** Manifest that is mechanical in review (not business logic). */
export const BOILERPLATE_BASENAMES: ReadonlySet<string> = new Set(['package.json']);

/** Directory names that mark generated / vendored trees. */
export const BOILERPLATE_DIR_NAMES: ReadonlySet<string> = new Set([
  'dist',
  'build',
  'coverage',
  'vendor',
  '__snapshots__',
]);

export const MINIFIED_JS_RE = /\.min\.js$/i;
export const SNAPSHOT_FILE_RE = /\.snap$/i;
export const GENERATED_FILE_RE = /\.generated\.[^.]+$/i;
export const PROTOBUF_GO_RE = /\.pb\.go$/i;

/** Exact basenames treated as wiring (config / bootstrap). */
export const WIRING_BASENAMES: ReadonlySet<string> = new Set([
  'index.ts',
  'index.tsx',
  'index.js',
  'index.jsx',
  'main.ts',
  'main.tsx',
  'main.js',
  'server.ts',
  'server.js',
  'app.ts',
  'app.tsx',
  'app.js',
  'routes.ts',
]);

/** `config.ts`, `.env.example`-style, `src/config.json`, etc. */
export const WIRING_CONFIG_BASENAME_RE = /^config\.[^.]+$/i;

/** `vite.config.ts`, `eslint.config.mjs`, `tailwind.config.js`, … */
export const WIRING_TOOL_CONFIG_RE = /\.config\.(js|ts|mjs|cjs)$/i;

export const WIRING_TSCONFIG_RE = /^tsconfig.*\.json$/i;
export const WIRING_COMPOSE_RE = /^docker-compose.*\.(yml|yaml)$/i;
