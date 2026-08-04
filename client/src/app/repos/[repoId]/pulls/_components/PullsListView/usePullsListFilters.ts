import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { PrMeta } from "./constants";

/** Open PRs carry a derived review status; everything else is merged/closed. */
const OPEN_STATUSES = new Set(["needs_review", "reviewed", "stale"]);

/**
 * Owns the PR list's filter/sort/query-param state and derives the filtered,
 * sorted rows plus header counts. `status` lives in the URL (`?status=`) so
 * it survives navigation; `query`/`sort` are local, ephemeral UI state.
 */
export function usePullsListFilters(repoId: string, pulls: PrMeta[] | undefined) {
  const search = useSearchParams();
  const router = useRouter();

  // Default to "needs review" — the most actionable filter on open.
  const status = search.get("status") ?? "needs_review";
  const setStatus = (k: string) => {
    const sp = new URLSearchParams(search.toString());
    sp.set("status", k); // always explicit so "all" sticks over the needs_review default
    router.replace(`/repos/${repoId}/pulls?${sp.toString()}`);
  };

  const [query, setQuery] = React.useState("");
  const [sort, setSort] = React.useState("newest");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return (pulls ?? [])
      .filter((p) => status === "all" || p.status === status)
      .filter((p) => !q || p.title.toLowerCase().includes(q) || String(p.number).includes(q))
      .slice()
      .sort((a, b) => {
        const ta = Date.parse(a.updated_at ?? "") || 0;
        const tb = Date.parse(b.updated_at ?? "") || 0;
        return sort === "oldest" ? ta - tb : tb - ta;
      });
  }, [pulls, status, query, sort]);

  const openCount = React.useMemo(
    () => (pulls ?? []).filter((p) => OPEN_STATUSES.has(p.status)).length,
    [pulls],
  );
  const needsReviewCount = React.useMemo(
    () => (pulls ?? []).filter((p) => p.status === "needs_review").length,
    [pulls],
  );

  return {
    status,
    setStatus,
    query,
    setQuery,
    sort,
    setSort,
    filtered,
    openCount,
    needsReviewCount,
  };
}
