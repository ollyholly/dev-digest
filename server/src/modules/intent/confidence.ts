import type { Intent, IntentSource } from '@devdigest/shared';

export interface ConfidenceClampContext {
  hasBody: boolean;
  sources: IntentSource[];
}

/**
 * Post-LLM confidence clamps (code, not prompt):
 * - inferred_from_signals → ≤ 0.45
 * - ticket_grounded with empty body → ≤ 0.75
 * - any failed plan/spec fetch → ≤ 0.6 and append missing_inputs
 * - author_stated with body → allow up to 1.0 (no extra clamp)
 */
export function clampIntentConfidence(
  intent: Intent,
  ctx: ConfidenceClampContext,
): Intent {
  let confidence = intent.confidence;
  const missing = [...intent.missing_inputs];

  if (intent.synthesis_mode === 'inferred_from_signals') {
    confidence = Math.min(confidence, 0.45);
  }

  if (intent.synthesis_mode === 'ticket_grounded' && !ctx.hasBody) {
    confidence = Math.min(confidence, 0.75);
  }

  const failedPlanSpec = ctx.sources.filter(
    (s) =>
      (s.kind === 'plan_url' || s.kind === 'spec_url') && s.fetched_ok === false,
  );
  for (const s of failedPlanSpec) {
    const key = `fetch:${s.ref}`;
    if (!missing.includes(key)) missing.push(key);
  }
  if (failedPlanSpec.length > 0) {
    confidence = Math.min(confidence, 0.6);
  }

  if (!ctx.hasBody && !missing.includes('description')) {
    missing.push('description');
  }

  return {
    ...intent,
    confidence: Math.max(0, Math.min(1, confidence)),
    missing_inputs: missing,
  };
}
