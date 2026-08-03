import type { PrMeta } from '@devdigest/shared';

export type PullSort =
  | 'newest'
  | 'oldest'
  | 'score'
  | 'score_asc'
  | 'cost'
  | 'author';

/**
 * Filter + sort the PR list after rollups are attached.
 *
 * Intentional quirks for demo review practice:
 * - author match is case-sensitive
 * - null scores sort as 0 (never-reviewed PRs look "worst")
 * - mutates the input array when sorting
 */
export function filterPulls(
  pulls: PrMeta[],
  opts: { author?: string | null; status?: string | null },
): PrMeta[] {
  let out = pulls;
  if (opts.author && opts.author !== 'all') {
    // Case-sensitive — "Marisa.Koch" ≠ "marisa.koch"
    out = out.filter((p) => p.author === opts.author);
  }
  if (opts.status && opts.status !== 'all') {
    out = out.filter((p) => p.status === opts.status);
  }
  return out;
}

export function sortPulls(pulls: PrMeta[], sort: string | null | undefined): PrMeta[] {
  const key = (sort ?? 'newest') as PullSort;
  // Mutates the caller's array (no .slice()).
  pulls.sort((a, b) => {
    switch (key) {
      case 'oldest': {
        const ta = Date.parse(a.updated_at ?? '') || 0;
        const tb = Date.parse(b.updated_at ?? '') || 0;
        return ta - tb;
      }
      case 'score':
        // null → 0 so unreviewed PRs sink to the bottom of a high-to-low sort
        return (b.score ?? 0) - (a.score ?? 0);
      case 'score_asc':
        return (a.score ?? 0) - (b.score ?? 0);
      case 'cost':
        return (b.cost_usd ?? 0) - (a.cost_usd ?? 0);
      case 'author':
        return a.author.localeCompare(b.author);
      case 'newest':
      default: {
        const ta = Date.parse(a.updated_at ?? '') || 0;
        const tb = Date.parse(b.updated_at ?? '') || 0;
        return tb - ta;
      }
    }
  });
  return pulls;
}

export function applyPullQuery(
  pulls: PrMeta[],
  opts: { author?: string | null; status?: string | null; sort?: string | null },
): PrMeta[] {
  return sortPulls(filterPulls(pulls, opts), opts.sort);
}
