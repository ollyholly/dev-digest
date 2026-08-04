import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { FindingRecord, Severity } from "@devdigest/shared";
import {
  usePrReviews,
  useCancelRun,
  usePrActiveRuns,
  usePrRuns,
  useDeleteRun,
} from "@/lib/hooks/reviews";
import {
  parseSeverityParam,
  serializeSeverityParam,
} from "../FindingsPanel/helpers";

/**
 * PR detail page orchestration: tab/trace/severity query-param state plus the
 * server-sourced live-run tracking (active runs, run history, cancel/delete).
 * Colocated with `PrDetailView` — extracted out of `page.tsx` so the route
 * entry stays a thin composition (frontend-ui-architecture: query-param /
 * live-run orchestration belongs in a hook, not the page body).
 */
export function usePrDetailOrchestration(
  repoId: string,
  number: string,
  prId: string | null,
) {
  const search = useSearchParams();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: reviews, refetch: refetchReviews } = usePrReviews(prId);

  // Live run tracking is SERVER-SOURCED (agent_runs status='running'):
  // survives navigation AND reload, and self-clears via polling when runs
  // finish.
  const { data: activeRuns } = usePrActiveRuns(prId);
  const { data: prRuns } = usePrRuns(prId);
  const deleteRun = useDeleteRun(prId);
  const cancel = useCancelRun();
  const liveRunIds = (activeRuns ?? []).map((r) => r.run_id);
  const reviewRunning = liveRunIds.length > 0;

  const invalidateActiveRuns = React.useCallback(() => {
    if (prId) qc.invalidateQueries({ queryKey: ["pr-active-runs", prId] });
  }, [qc, prId]);
  // When a run settles (done OR failed) refresh the full run history too, so
  // a just-failed run shows up in "Run history" immediately — no reload.
  const invalidateRunHistory = React.useCallback(() => {
    if (prId) qc.invalidateQueries({ queryKey: ["pr-runs", prId] });
  }, [qc, prId]);

  const tab = search.get("tab") ?? "overview";
  const traceRunId = search.get("trace");
  const selectedSeverities = React.useMemo(
    () => parseSeverityParam(search.get("severity")),
    [search],
  );

  const setParam = React.useCallback(
    (key: string, val: string | null) => {
      const sp = new URLSearchParams(search.toString());
      if (val == null) sp.delete(key);
      else sp.set(key, val);
      router.replace(
        `/repos/${repoId}/pulls/${number}${sp.toString() ? `?${sp.toString()}` : ""}`,
      );
    },
    [search, router, repoId, number],
  );
  const setTab = React.useCallback((t: string) => setParam("tab", t), [setParam]);
  const onSeverityChange = React.useCallback(
    (next: Severity[]) => setParam("severity", serializeSeverityParam(next)),
    [setParam],
  );

  // Reviews come newest-first; each is its own run (grouped into accordions).
  const runs = React.useMemo(() => reviews ?? [], [reviews]);
  const allFindings: FindingRecord[] = React.useMemo(
    () => runs.flatMap((r) => r.findings),
    [runs],
  );
  const lethalTrifecta = React.useMemo(
    () => allFindings.filter((f) => f.kind === "lethal_trifecta"),
    [allFindings],
  );

  return {
    tab,
    traceRunId,
    selectedSeverities,
    setTab,
    setParam,
    onSeverityChange,
    refetchReviews,
    prRuns,
    deleteRun,
    cancel,
    liveRunIds,
    reviewRunning,
    invalidateActiveRuns,
    invalidateRunHistory,
    runs,
    lethalTrifecta,
    findingsCount: allFindings.length,
  };
}
