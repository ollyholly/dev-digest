/* hooks/intent.ts — React Query hooks for PR intent ensure / cache. */
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import type { EnsureIntentResponse, PrIntentRecord } from "@devdigest/shared";

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
