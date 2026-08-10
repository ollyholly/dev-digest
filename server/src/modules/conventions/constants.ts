/** Number of rank-selected source files included alongside configuration files. */
export const SAMPLE_FILE_COUNT = 12;

/** Per-file prompt budgets. Configuration files are intentionally smaller. */
export const MAX_CHARS_PER_FILE = 6_000;
export const MAX_CHARS_PER_CONFIG = 3_000;

/** Structured-output and verification limits. */
export const MAX_CANDIDATES = 20;
export const MIN_CONFIDENCE = 0.35;

/**
 * Root/workspace configuration names that carry explicit house-style signals.
 * Wildcard entries are interpreted by `samples.ts`; this remains a plain list
 * so the supported surface is easy to audit.
 */
export const CONFIG_BASENAMES = [
  'eslint.config.*',
  '.eslintrc',
  '.eslintrc.*',
  'prettier.config.*',
  '.prettierrc',
  '.prettierrc.*',
  'tsconfig.json',
  'tsconfig.*.json',
  'jsconfig.json',
  '.editorconfig',
  'biome.json',
  'biome.jsonc',
  'deno.json',
  'deno.jsonc',
  'ruff.toml',
  '.ruff.toml',
  'pyproject.toml',
  'go.mod',
  'rustfmt.toml',
] as const;
