/**
 * `RepoIntelService.getTopFilesByRank` / `getCriticalPaths` — rank-driven
 * file sampling and dependency-chain reads. Split out of `service.ts`.
 */
import type { Container } from '../../../platform/container.js';
import type { RepoIntelRepository } from '../repository.js';

/** How many top-ranked files seed `getCriticalPaths` dependency chains. */
const CRITICAL_PATH_ROOTS = 5;

/**
 * Path kinds excluded from rank-driven file samples (conventions/onboarding):
 * tests, configs, declaration files, migrations, generated dirs. Substring
 * match on the repo-relative path (kept deliberately simple + deterministic).
 */
const JUNK_PATH_PATTERNS = [
  '.test.',
  '.spec.',
  '.d.ts',
  '__tests__/',
  '__mocks__/',
  '/test/',
  '/tests/',
  '/migrations/',
  '/__fixtures__/',
  '.config.',
  'vitest.',
  'jest.',
  'eslint',
  'prettier',
] as const;

function isJunkPath(path: string): boolean {
  const lower = path.toLowerCase();
  return JUNK_PATH_PATTERNS.some((p) => lower.includes(p));
}

/**
 * Top-N file paths by rank DESC, dropping tests/configs/migrations and any
 * caller-supplied `exclude` substrings. Over-fetches by 10× before filtering
 * so the post-filter still yields N where possible.
 */
export async function getTopFilesByRank(
  container: Container,
  repository: RepoIntelRepository,
  repoId: string,
  n: number,
  opts?: { exclude?: string[] },
): Promise<string[]> {
  if (!container.config.repoIntelEnabled) return [];
  if (n <= 0) return [];
  const exclude = opts?.exclude ?? [];
  const rows = await repository.getRankedPaths(repoId, Math.max(n * 10, 100));
  const out: string[] = [];
  for (const r of rows) {
    if (isJunkPath(r.path)) continue;
    if (exclude.some((e) => r.path.includes(e))) continue;
    out.push(r.path);
    if (out.length >= n) break;
  }
  return out;
}

/**
 * Dependency chains from the highest-ranked files (onboarding reading-path).
 * For each of the top roots, greedily follow the highest-ranked import target
 * up to BFS_DEPTH hops. Pure read over `file_edges` + `file_rank`.
 */
export async function getCriticalPaths(
  container: Container,
  repository: RepoIntelRepository,
  repoId: string,
  bfsDepth: number,
): Promise<string[][]> {
  if (!container.config.repoIntelEnabled) return [];
  const edges = await repository.getEdges(repoId);
  if (edges.length === 0) return [];

  const ranked = await repository.getRankedPaths(repoId, 100_000);
  const rankOf = new Map(ranked.map((r) => [r.path, r.rank]));

  // Adjacency importer → imported.
  const adj = new Map<string, string[]>();
  for (const e of edges) {
    const arr = adj.get(e.fromFile);
    if (arr) arr.push(e.toFile);
    else adj.set(e.fromFile, [e.toFile]);
  }

  const roots = ranked.slice(0, CRITICAL_PATH_ROOTS).map((r) => r.path);
  const paths: string[][] = [];
  const seenPaths = new Set<string>();
  for (const root of roots) {
    const chain = [root];
    const inChain = new Set(chain);
    let cur = root;
    for (let depth = 0; depth < bfsDepth; depth += 1) {
      const next = (adj.get(cur) ?? [])
        .filter((t) => !inChain.has(t))
        .sort((a, b) => (rankOf.get(b) ?? 0) - (rankOf.get(a) ?? 0))[0];
      if (!next) break;
      chain.push(next);
      inChain.add(next);
      cur = next;
    }
    if (chain.length < 2) continue;
    const key = chain.join('>');
    if (seenPaths.has(key)) continue;
    seenPaths.add(key);
    paths.push(chain);
  }
  return paths;
}
