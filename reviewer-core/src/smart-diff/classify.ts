import type { SmartDiffRole } from '@devdigest/shared';
import {
  BOILERPLATE_BASENAMES,
  BOILERPLATE_DIR_NAMES,
  GENERATED_FILE_RE,
  LOCKFILE_BASENAMES,
  MINIFIED_JS_RE,
  PROTOBUF_GO_RE,
  SNAPSHOT_FILE_RE,
  WIRING_BASENAMES,
  WIRING_COMPOSE_RE,
  WIRING_CONFIG_BASENAME_RE,
  WIRING_TOOL_CONFIG_RE,
  WIRING_TSCONFIG_RE,
} from './constants.js';

/** POSIX-ify so Windows separators cannot dodge directory-name checks. */
export function normalizeRepoPath(path: string): string {
  return path.replace(/\\/g, '/');
}

export function pathBasename(path: string): string {
  const n = normalizeRepoPath(path);
  const slash = n.lastIndexOf('/');
  return slash === -1 ? n : n.slice(slash + 1);
}

function isBoilerplate(path: string): boolean {
  const n = normalizeRepoPath(path);
  const base = pathBasename(n);
  if (LOCKFILE_BASENAMES.has(base) || BOILERPLATE_BASENAMES.has(base)) return true;
  if (MINIFIED_JS_RE.test(base) || SNAPSHOT_FILE_RE.test(base)) return true;
  if (GENERATED_FILE_RE.test(base) || PROTOBUF_GO_RE.test(base)) return true;
  if (n === 'vendor' || n.startsWith('vendor/')) return true;
  return n.split('/').some((seg) => BOILERPLATE_DIR_NAMES.has(seg));
}

function isWiring(path: string): boolean {
  const base = pathBasename(path);
  if (WIRING_BASENAMES.has(base)) return true;
  if (WIRING_CONFIG_BASENAME_RE.test(base)) return true;
  if (WIRING_TOOL_CONFIG_RE.test(base)) return true;
  if (WIRING_TSCONFIG_RE.test(base)) return true;
  if (WIRING_COMPOSE_RE.test(base)) return true;
  return false;
}

/**
 * Deterministic role for a changed file. Boilerplate wins over wiring so a
 * generated `index.js` under `dist/` is not treated as app bootstrap.
 */
export function classifyFile(path: string): SmartDiffRole {
  if (isBoilerplate(path)) return 'boilerplate';
  if (isWiring(path)) return 'wiring';
  return 'core';
}
