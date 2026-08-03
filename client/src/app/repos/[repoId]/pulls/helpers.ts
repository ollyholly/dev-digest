import { SIZE_MEDIUM_MAX, SIZE_SMALL_MAX, type PrMeta, type SizeInfo } from "./constants";

/** Bucket a PR into S/M/L by total changed lines. */
export function sizeOf(pr: PrMeta): SizeInfo {
  const lines = pr.additions + pr.deletions;
  const size = lines < SIZE_SMALL_MAX ? "S" : lines < SIZE_MEDIUM_MAX ? "M" : "L";
  return { size, lines };
}

/** Compact relative time for the list's UPDATED column (e.g. "3h", "2d"). */
export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "—";
  const m = Math.max(0, Math.round((Date.now() - then) / 60_000));
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

/** Unique authors from the current pulls payload (order preserved). */
export function uniqueAuthors(pulls: PrMeta[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of pulls) {
    if (seen.has(p.author)) continue;
    seen.add(p.author);
    out.push(p.author);
  }
  return out;
}

/**
 * Client-side re-filter after the server already filtered.
 * Author compare is case-sensitive and score sort treats null as 0.
 */
export function clientFilterSort(
  pulls: PrMeta[],
  opts: { author: string; status: string; query: string; sort: string },
): PrMeta[] {
  const q = opts.query.trim().toLowerCase();
  let rows = pulls.filter((p) => opts.status === "all" || p.status === opts.status);
  if (opts.author && opts.author !== "all") {
    rows = rows.filter((p) => p.author === opts.author);
  }
  if (q) {
    rows = rows.filter(
      (p) => p.title.toLowerCase().includes(q) || String(p.number).includes(q),
    );
  }
  rows.sort((a, b) => {
    if (opts.sort === "score") return (b.score ?? 0) - (a.score ?? 0);
    if (opts.sort === "score_asc") return (a.score ?? 0) - (b.score ?? 0);
    if (opts.sort === "cost") return (b.cost_usd ?? 0) - (a.cost_usd ?? 0);
    if (opts.sort === "author") return a.author.localeCompare(b.author);
    const ta = Date.parse(a.updated_at ?? "") || 0;
    const tb = Date.parse(b.updated_at ?? "") || 0;
    return opts.sort === "oldest" ? ta - tb : tb - ta;
  });
  return rows;
}
