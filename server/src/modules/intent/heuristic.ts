import type { Intent, IntentSource } from '@devdigest/shared';
import { clampIntentConfidence } from './confidence.js';

/**
 * Offline / no-API-key intent from local signals only.
 * Used when the review_intent LLM provider key is missing so Overview still
 * works on seeded data and offline demos (course: no keys required to boot).
 */
export function buildHeuristicIntent(opts: {
  title: string;
  body: string;
  paths: string[];
  commitSubjects: string[];
  sources: IntentSource[];
}): Intent {
  const hasBody = opts.body.trim().length > 0;
  const firstLine = hasBody
    ? (opts.body.trim().split(/\r?\n/, 1)[0] ?? opts.body).trim().slice(0, 280)
    : '';

  const pathHint =
    opts.paths.length > 0
      ? opts.paths.slice(0, 3).join(', ') + (opts.paths.length > 3 ? '…' : '')
      : '';

  const intentText = firstLine
    ? firstLine
    : pathHint
      ? `Inferred change touching ${pathHint} (from title: ${opts.title}).`
      : `Inferred from title: ${opts.title}`;

  const in_scope: string[] = [];
  if (opts.title.trim()) in_scope.push(opts.title.trim());
  for (const p of opts.paths.slice(0, 5)) in_scope.push(`Touch ${p}`);
  for (const c of opts.commitSubjects.slice(0, 3)) in_scope.push(`Commit: ${c}`);

  const missing = ['llm'];
  if (!hasBody) missing.push('description');

  const raw: Intent = {
    intent: intentText,
    in_scope: in_scope.length > 0 ? in_scope : [opts.title || 'Unknown change'],
    out_of_scope: [],
    confidence: 0.4,
    synthesis_mode: 'inferred_from_signals',
    risk_areas: [],
    sources: opts.sources,
    missing_inputs: missing,
  };

  return clampIntentConfidence(raw, { hasBody, sources: opts.sources });
}
