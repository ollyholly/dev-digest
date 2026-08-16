import { describe, expect, it, vi } from 'vitest';
import { logPromptAssembly, resolvePromptLogMode } from '../src/platform/prompt-log.js';
import type { PromptAssemblyLog } from '@devdigest/reviewer-core';

function sink() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  };
}

const sampleLog: PromptAssemblyLog = {
  sections: [
    { section: 'Diff to review', source: 'diff', chars: 42, approx_tokens: 11 },
    { section: 'Project context', source: 'specs', chars: 99, approx_tokens: 25 },
  ],
  system_chars: 10,
  user_chars: 141,
  total_chars: 151,
  approx_tokens: 38,
};

describe('resolvePromptLogMode', () => {
  it('defaults to off', () => {
    expect(resolvePromptLogMode(undefined, 'development')).toBe('off');
    expect(resolvePromptLogMode('', 'development')).toBe('off');
    expect(resolvePromptLogMode('off', 'development')).toBe('off');
  });

  it('accepts summary aliases', () => {
    expect(resolvePromptLogMode('summary', 'development')).toBe('summary');
    expect(resolvePromptLogMode('on', 'production')).toBe('summary');
  });

  it('allows verbose only in development', () => {
    expect(resolvePromptLogMode('verbose', 'development')).toBe('verbose');
    expect(resolvePromptLogMode('detailed', 'development')).toBe('verbose');
  });

  it('downgrades verbose outside development', () => {
    const log = sink();
    expect(resolvePromptLogMode('verbose', 'production', log)).toBe('summary');
    expect(resolvePromptLogMode('verbose', 'test', log)).toBe('summary');
    expect(log.warn).toHaveBeenCalled();
  });
});

describe('logPromptAssembly', () => {
  it('emits nothing when off', () => {
    const log = sink();
    logPromptAssembly(log, 'off', {
      correlationId: 'run-1',
      model: 'deepseek/deepseek-v4-flash',
      log: sampleLog,
    });
    expect(log.info).not.toHaveBeenCalled();
  });

  it('summary includes section/source/lengths, model, and correlation id — never bodies', () => {
    const log = sink();
    logPromptAssembly(log, 'summary', {
      correlationId: 'run-1',
      model: 'deepseek/deepseek-v4-flash',
      log: sampleLog,
    });
    expect(log.info).toHaveBeenCalledTimes(1);
    const [fields, msg] = log.info.mock.calls[0]!;
    expect(msg).toBe('prompt assembly');
    expect(fields).toMatchObject({
      event: 'prompt_assembly',
      correlation_id: 'run-1',
      model: 'deepseek/deepseek-v4-flash',
      sections: [
        { section: 'Diff to review', source: 'diff', chars: 42, approx_tokens: 11 },
        { section: 'Project context', source: 'specs', chars: 99, approx_tokens: 25 },
      ],
    });
    const serialized = JSON.stringify(fields);
    expect(serialized).not.toMatch(/diff body|sk_live|BEGIN PRIVATE/i);
    expect(fields).not.toHaveProperty('user');
    expect(fields).not.toHaveProperty('system');
    expect(fields).not.toHaveProperty('assembly');
  });

  it('verbose adds one info line per section', () => {
    const log = sink();
    logPromptAssembly(log, 'verbose', {
      correlationId: 'run-1',
      model: 'm',
      log: sampleLog,
    });
    expect(log.info).toHaveBeenCalledTimes(1 + sampleLog.sections.length);
    expect(log.debug).not.toHaveBeenCalled();
    expect(log.info.mock.calls[1]![0]).toMatchObject({
      event: 'prompt_assembly_section',
      correlation_id: 'run-1',
      source: 'diff',
    });
  });
});
