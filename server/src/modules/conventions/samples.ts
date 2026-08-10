import { readdir } from 'node:fs/promises';
import { basename, join, relative, resolve, sep } from 'node:path';
import {
  CONFIG_BASENAMES,
  MAX_CHARS_PER_CONFIG,
  MAX_CHARS_PER_FILE,
  SAMPLE_FILE_COUNT,
} from './constants.js';
import { normalizeRepoRelativePath, resolveSafePath } from './verify.js';

const MAX_CONFIG_FILES = 24;
const MAX_CONFIG_SEARCH_DEPTH = 2;
const EXCLUDED_DIRECTORIES = new Set([
  '.git',
  '.next',
  '.turbo',
  'build',
  'coverage',
  'dist',
  'node_modules',
  'vendor',
]);

export interface ConventionSample {
  path: string;
  content: string;
  kind: 'config' | 'code';
}

export interface LoadSamplesOptions {
  clonePath: string;
  rankedPaths: string[];
  readFile: (relativePath: string) => Promise<string>;
  sampleFileCount?: number;
}

export interface LoadedSamples {
  samples: ConventionSample[];
  considered: number;
}

/**
 * Discover explicit style/tooling configs at the clone root and common
 * workspace depths. Symlinked directories/files are not followed.
 */
export async function discoverConfigFiles(clonePath: string): Promise<string[]> {
  const root = resolve(clonePath);
  const found: string[] = [];
  const queue: Array<{ dir: string; depth: number }> = [{ dir: root, depth: 0 }];

  while (queue.length > 0) {
    const current = queue.shift()!;
    let entries;
    try {
      entries = await readdir(current.dir, { withFileTypes: true });
    } catch {
      continue;
    }

    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const fullPath = join(current.dir, entry.name);
      if (entry.isFile() && isConfigBasename(entry.name)) {
        found.push(toPosixPath(relative(root, fullPath)));
        continue;
      }
      if (
        entry.isDirectory() &&
        current.depth < MAX_CONFIG_SEARCH_DEPTH &&
        !EXCLUDED_DIRECTORIES.has(entry.name)
      ) {
        queue.push({ dir: fullPath, depth: current.depth + 1 });
      }
    }
  }

  return [...new Set(found)].sort().slice(0, MAX_CONFIG_FILES);
}

/**
 * Load bounded config + ranked source samples. Every selected path must exist
 * inside the clone after realpath resolution before the injected reader runs.
 */
export async function loadSamples(options: LoadSamplesOptions): Promise<LoadedSamples> {
  const configPaths = await discoverConfigFiles(options.clonePath);
  const configSet = new Set(configPaths);
  const rankedPaths = diversifyRankedPaths(
    options.rankedPaths,
    options.sampleFileCount ?? SAMPLE_FILE_COUNT,
  ).filter((path) => !configSet.has(path));
  const consideredPaths = [
    ...configPaths.map((path) => ({ path, kind: 'config' as const })),
    ...rankedPaths.map((path) => ({ path, kind: 'code' as const })),
  ];

  const samples: ConventionSample[] = [];
  for (const candidate of consideredPaths) {
    try {
      await resolveSafePath(options.clonePath, candidate.path);
      const raw = await options.readFile(candidate.path);
      if (!raw.trim() || raw.includes('\0')) continue;
      const maxChars =
        candidate.kind === 'config' ? MAX_CHARS_PER_CONFIG : MAX_CHARS_PER_FILE;
      samples.push({ ...candidate, content: raw.slice(0, maxChars) });
    } catch {
      // Missing, unreadable, or unsafe files are omitted from the prompt.
    }
  }

  return { samples, considered: consideredPaths.length };
}

/** Select high-ranked paths while giving distinct top-level areas a first pass. */
export function diversifyRankedPaths(paths: string[], limit = SAMPLE_FILE_COUNT): string[] {
  if (limit <= 0) return [];
  const unique = [
    ...new Set(
      paths
        .map((path) => normalizeRepoRelativePath(path))
        .filter((path): path is string => path !== null),
    ),
  ];

  const selected: string[] = [];
  const selectedSet = new Set<string>();
  const seenTopLevels = new Set<string>();
  for (const path of unique) {
    const topLevel = path.includes('/') ? path.slice(0, path.indexOf('/')) : '$root';
    if (seenTopLevels.has(topLevel)) continue;
    seenTopLevels.add(topLevel);
    selected.push(path);
    selectedSet.add(path);
    if (selected.length === limit) return selected;
  }

  for (const path of unique) {
    if (selectedSet.has(path)) continue;
    selected.push(path);
    if (selected.length === limit) break;
  }
  return selected;
}

function isConfigBasename(name: string): boolean {
  const file = basename(name);
  return CONFIG_BASENAMES.some((pattern) => {
    if (!pattern.includes('*')) return file === pattern;
    const parts = pattern.split('*').map(escapeRegex);
    return new RegExp(`^${parts.join('.*')}$`, 'u').test(file);
  });
}

function toPosixPath(path: string): string {
  return sep === '/' ? path : path.split(sep).join('/');
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
