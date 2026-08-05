"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ConventionCandidate,
  ConventionExtractionResult,
  ConventionPromoteInput,
  ConventionPromoteResult,
  ConventionSkillDraftMode,
  ConventionSkillDraftResult,
  ConventionUpdate,
} from "@devdigest/shared";
import { api } from "../api";

const conventionsKey = (repoId: string) => ["conventions", repoId] as const;
const skillDraftKey = (repoId: string) => ["convention-skill-draft", repoId] as const;

function mapCachedCandidate(
  current: ConventionExtractionResult | undefined,
  id: string,
  mapCandidate: (candidate: ConventionCandidate) => ConventionCandidate,
): ConventionExtractionResult | undefined {
  if (!current) return current;
  return {
    ...current,
    candidates: current.candidates.map((candidate) =>
      candidate.id === id ? mapCandidate(candidate) : candidate,
    ),
  };
}

export function useConventions(repoId: string) {
  return useQuery({
    queryKey: conventionsKey(repoId),
    queryFn: () => api.get<ConventionExtractionResult>(`/repos/${repoId}/conventions`),
    enabled: !!repoId,
  });
}

export function useExtractConventions(repoId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      api.post<ConventionExtractionResult>(`/repos/${repoId}/conventions/extract`),
    onSuccess: (result) => {
      queryClient.setQueryData(conventionsKey(repoId), result);
      queryClient.invalidateQueries({ queryKey: skillDraftKey(repoId) });
    },
  });
}

export interface UpdateConventionInput {
  id: string;
  patch: ConventionUpdate;
}

export function useUpdateConvention(repoId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, patch }: UpdateConventionInput) =>
      api.patch<ConventionCandidate>(`/conventions/${id}`, patch),
    onMutate: async ({ id, patch }) => {
      const queryKey = conventionsKey(repoId);
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ConventionExtractionResult>(queryKey);

      queryClient.setQueryData<ConventionExtractionResult>(queryKey, (current) =>
        mapCachedCandidate(current, id, (candidate) => ({
          ...candidate,
          ...patch,
          ...(patch.status ? { accepted: patch.status === "accepted" } : {}),
        })),
      );

      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(conventionsKey(repoId), context.previous);
      }
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<ConventionExtractionResult>(
        conventionsKey(repoId),
        (current) => mapCachedCandidate(current, updated.id, () => updated),
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: conventionsKey(repoId) });
      queryClient.invalidateQueries({ queryKey: skillDraftKey(repoId) });
    },
  });
}

export function useConventionSkillDraft(
  repoId: string,
  mode: ConventionSkillDraftMode,
  enabled: boolean,
) {
  return useQuery({
    queryKey: [...skillDraftKey(repoId), mode],
    queryFn: () =>
      api.get<ConventionSkillDraftResult>(
        `/repos/${repoId}/conventions/skill-draft?mode=${encodeURIComponent(mode)}`,
      ),
    enabled: !!repoId && enabled,
  });
}

export function usePromoteConventions(repoId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ConventionPromoteInput) =>
      api.post<ConventionPromoteResult>(`/repos/${repoId}/conventions/promote`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conventionsKey(repoId) });
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      queryClient.invalidateQueries({ queryKey: skillDraftKey(repoId) });
    },
  });
}
