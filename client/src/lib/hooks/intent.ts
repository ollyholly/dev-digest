/* hooks/intent.ts — React Query hooks for PR intent ensure / cache. */
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import type { EnsureIntentResponse, Intent, PrIntentRecord } from "@devdigest/shared";

/** Strip persistence metadata from a cached / ensure record. */
export function intentFromPrRecord(record: PrIntentRecord): Intent {
  return {
    intent: record.intent,
    in_scope: record.in_scope,
    out_of_scope: record.out_of_scope,
    confidence: record.confidence,
    synthesis_mode: record.synthesis_mode,
    risk_areas: record.risk_areas,
    sources: record.sources,
    missing_inputs: record.missing_inputs,
  };
}

export function usePrIntent(prId: string | null | undefined) {
  return useQuery({
    queryKey: ["pr-intent", prId],
    queryFn: () => api.get<PrIntentRecord>(`/pulls/${prId}/intent`),
    enabled: !!prId,
    retry: false,
  });
}

/** Lazy ensure (force:false) or regenerate (force:true). */
export function useEnsureIntent(prId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (opts?: { force?: boolean }) =>
      api.post<EnsureIntentResponse>(`/pulls/${prId}/intent`, {
        force: opts?.force ?? false,
      }),
    onSuccess: (data) => {
      qc.setQueryData(["pr-intent", prId], {
        pr_id: data.pr_id,
        ...data.intent,
        model: data.model,
        computed_at: data.computed_at,
      } satisfies PrIntentRecord);
      qc.invalidateQueries({ queryKey: ["pr-intent", prId] });
    },
  });
}
