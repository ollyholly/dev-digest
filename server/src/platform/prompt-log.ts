import type { PromptAssemblyLog } from '@devdigest/reviewer-core';
import type { AppConfig } from './config.js';

/**
 * Prompt-assembly ops logging.
 *
 * Modes (env `DEVDIGEST_PROMPT_LOG`):
 *   - `off` (default) — no prompt assembly lines
 *   - `summary` — one structured line: model, correlation id, totals, sections
 *     (name/source/chars/approx_tokens only)
 *   - `verbose` — summary + one line per section; **development only**. In
 *     production/test, verbose is downgraded to summary with a warn.
 *
 * Never logs prompt bodies, diffs, specs text, or secrets.
 */

export type PromptLogMode = 'off' | 'summary' | 'verbose';

export type PromptLogSink = {
  info: (obj: unknown, msg?: string) => void;
  warn: (obj: unknown, msg?: string) => void;
  debug: (obj: unknown, msg?: string) => void;
};

export function resolvePromptLogMode(
  raw: string | undefined,
  nodeEnv: AppConfig['nodeEnv'],
  log?: PromptLogSink,
): PromptLogMode {
  const v = (raw ?? 'off').trim().toLowerCase();
  if (v === '' || v === '0' || v === 'false' || v === 'off') return 'off';
  if (v === 'verbose' || v === 'debug' || v === 'detailed') {
    if (nodeEnv !== 'development') {
      log?.warn(
        { requested: v, nodeEnv },
        'DEVDIGEST_PROMPT_LOG=verbose ignored outside development; using summary',
      );
      return 'summary';
    }
    return 'verbose';
  }
  if (v === '1' || v === 'true' || v === 'summary' || v === 'on') return 'summary';
  return 'off';
}

export interface PromptAssemblyLogFields {
  correlationId: string;
  model: string;
  chunk?: string;
  log: PromptAssemblyLog;
}

/**
 * Emit safe structured prompt-assembly logs. Callers must pass `log` from
 * assemblePrompt / reviewPullRequest — never the PromptAssembly content.
 */
export function logPromptAssembly(
  sink: PromptLogSink,
  mode: PromptLogMode,
  fields: PromptAssemblyLogFields,
): void {
  if (mode === 'off') return;

  const base = {
    event: 'prompt_assembly',
    correlation_id: fields.correlationId,
    model: fields.model,
    chunk: fields.chunk ?? 'primary',
    system_chars: fields.log.system_chars,
    user_chars: fields.log.user_chars,
    total_chars: fields.log.total_chars,
    approx_tokens: fields.log.approx_tokens,
    section_count: fields.log.sections.length,
    // Safe: name + source + lengths only.
    sections: fields.log.sections.map((s) => ({
      section: s.section,
      source: s.source,
      chars: s.chars,
      approx_tokens: s.approx_tokens,
    })),
  };

  sink.info(base, 'prompt assembly');

  if (mode === 'verbose') {
    // info (not debug): DEVDIGEST_PROMPT_LOG=verbose must be enough locally
    // without also raising LOG_LEVEL.
    for (const s of fields.log.sections) {
      sink.info(
        {
          event: 'prompt_assembly_section',
          correlation_id: fields.correlationId,
          model: fields.model,
          section: s.section,
          source: s.source,
          chars: s.chars,
          approx_tokens: s.approx_tokens,
        },
        'prompt assembly section',
      );
    }
  }
}
