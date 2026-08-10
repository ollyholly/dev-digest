import { z } from 'zod';
import { MAX_CANDIDATES } from './constants.js';

/** Structured output requested from the conventions extraction model. */
export const ConventionExtraction = z.object({
  candidates: z
    .array(
      z.object({
        category: z.string(),
        rule: z.string(),
        evidence_path: z.string(),
        evidence_snippet: z.string(),
        evidence_start_line: z.number().int(),
        evidence_end_line: z.number().int(),
        confidence: z.number().min(0).max(1),
        supporting_count: z.number().int().optional(),
        counterexample_count: z.number().int().optional(),
      }),
    )
    .max(MAX_CANDIDATES),
});

export type ConventionExtraction = z.infer<typeof ConventionExtraction>;
export type ExtractedConventionCandidate = ConventionExtraction['candidates'][number];
