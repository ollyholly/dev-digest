/**
 * Pure cache / provenance policy for PR intent ensure.
 *
 * Soft ensure may return cached LLM/seed rows, upgrade sticky heuristic when
 * an LLM key becomes available, or fall back to heuristic offline.
 * Regenerate always requires an LLM and never writes heuristic.
 */

export type IntentEnsureMode = 'soft' | 'regenerate';

export type IntentProvenance = 'llm' | 'heuristic' | 'seed';

export type IntentCacheDecision =
  | { action: 'return_cached' }
  | { action: 'compute_llm' }
  | { action: 'compute_heuristic' }
  | { action: 'fail_missing_key' };

export interface IntentCacheRowMeta {
  inputFingerprint: string | null;
  model: string | null;
  computedAt: Date | null;
}

/** Classify persisted `model` into provenance. */
export function provenanceFromModel(model: string | null | undefined): IntentProvenance {
  if (!model || model === 'heuristic' || model === 'unknown') return 'heuristic';
  if (model === 'seed') return 'seed';
  return 'llm';
}

/**
 * Decide the next ensure step from mode, fingerprint match, row provenance,
 * and whether the review_intent provider key is available.
 */
export function decideIntentAction(opts: {
  mode: IntentEnsureMode;
  fingerprint: string;
  existing: IntentCacheRowMeta | null | undefined;
  llmAvailable: boolean;
}): IntentCacheDecision {
  if (opts.mode === 'regenerate') {
    return opts.llmAvailable ? { action: 'compute_llm' } : { action: 'fail_missing_key' };
  }

  const existing = opts.existing;
  const fingerprintMatch = Boolean(
    existing &&
      existing.inputFingerprint === opts.fingerprint &&
      existing.computedAt,
  );

  if (fingerprintMatch && existing) {
    const provenance = provenanceFromModel(existing.model);
    switch (provenance) {
      case 'llm':
      case 'seed':
        return { action: 'return_cached' };
      case 'heuristic':
        // Sticky heuristic upgrades when a key appears.
        return opts.llmAvailable
          ? { action: 'compute_llm' }
          : { action: 'return_cached' };
      default: {
        const _exhaustive: never = provenance;
        return _exhaustive;
      }
    }
  }

  return opts.llmAvailable ? { action: 'compute_llm' } : { action: 'compute_heuristic' };
}
