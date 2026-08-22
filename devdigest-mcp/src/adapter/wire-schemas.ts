import { z } from 'zod';

/** Wire DTOs for the DevDigest API — local Zod (no shared `.default()` input/output skew). */

export const WireAgentSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    provider: z.string(),
    model: z.string(),
    enabled: z.boolean(),
    repo_intel: z.boolean().optional(),
    system_prompt: z.string().optional(),
  })
  .passthrough();
export type WireAgent = z.infer<typeof WireAgentSchema>;

export const WireRepoSchema = z
  .object({
    id: z.string(),
    owner: z.string(),
    name: z.string(),
    full_name: z.string().optional(),
  })
  .passthrough();
export type WireRepo = z.infer<typeof WireRepoSchema>;

export const WirePrMetaSchema = z
  .object({
    id: z.string().nullish(),
    number: z.number().int(),
    title: z.string().optional(),
  })
  .passthrough();
export type WirePrMeta = z.infer<typeof WirePrMetaSchema>;

export const WireRunTargetSchema = z.object({
  run_id: z.string(),
  agent_id: z.string(),
  agent_name: z.string(),
});

export const WireReviewRunResponseSchema = z.object({
  pr_id: z.string(),
  runs: z.array(WireRunTargetSchema),
  reviews: z.array(z.unknown()).optional(),
});
export type WireReviewRunResponse = z.infer<typeof WireReviewRunResponseSchema>;

export const WireRunSummarySchema = z
  .object({
    run_id: z.string(),
    agent_id: z.string().nullable().optional(),
    agent_name: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    error: z.string().nullable().optional(),
  })
  .passthrough();
export type WireRunSummary = z.infer<typeof WireRunSummarySchema>;

export const WireFindingSchema = z
  .object({
    severity: z.enum(['CRITICAL', 'WARNING', 'SUGGESTION']),
    title: z.string(),
    file: z.string(),
    start_line: z.number().int(),
    end_line: z.number().int(),
  })
  .passthrough();
export type WireFinding = z.infer<typeof WireFindingSchema>;

export const WireReviewRecordSchema = z
  .object({
    id: z.string(),
    pr_id: z.string(),
    agent_id: z.string().nullable().optional(),
    run_id: z.string().nullable().optional(),
    agent_name: z.string().nullish(),
    kind: z.enum(['summary', 'review']).optional(),
    verdict: z.string().nullable().optional(),
    summary: z.string().nullable().optional(),
    score: z.number().int().nullable().optional(),
    findings: z.array(WireFindingSchema).optional(),
  })
  .passthrough();
export type WireReviewRecord = z.infer<typeof WireReviewRecordSchema>;

export const WireConventionCandidateSchema = z
  .object({
    id: z.string(),
    category: z.string(),
    rule: z.string(),
    status: z.enum(['pending', 'accepted', 'rejected']),
    confidence: z.number(),
    evidence_path: z.string(),
    scanned_sha: z.string().nullable().optional(),
  })
  .passthrough();
export type WireConventionCandidate = z.infer<typeof WireConventionCandidateSchema>;

export const WireConventionsResultSchema = z.object({
  candidates: z.array(WireConventionCandidateSchema),
  scanned_sha: z.string().nullable(),
});
export type WireConventionsResult = z.infer<typeof WireConventionsResultSchema>;
