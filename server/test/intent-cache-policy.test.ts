import { describe, expect, it } from 'vitest';
import { decideIntentAction, provenanceFromModel } from '../src/modules/intent/cache-policy.js';

describe('provenanceFromModel', () => {
  it('classifies heuristic / seed / llm', () => {
    expect(provenanceFromModel(undefined)).toBe('heuristic');
    expect(provenanceFromModel(null)).toBe('heuristic');
    expect(provenanceFromModel('heuristic')).toBe('heuristic');
    expect(provenanceFromModel('unknown')).toBe('heuristic');
    expect(provenanceFromModel('seed')).toBe('seed');
    expect(provenanceFromModel('deepseek/deepseek-v4-flash')).toBe('llm');
  });
});

describe('decideIntentAction', () => {
  const fp = 'abc';
  const llmRow = {
    inputFingerprint: fp,
    model: 'deepseek/deepseek-v4-flash',
    computedAt: new Date(),
  };
  const heuristicRow = {
    inputFingerprint: fp,
    model: 'heuristic',
    computedAt: new Date(),
  };
  const seedRow = {
    inputFingerprint: fp,
    model: 'seed',
    computedAt: new Date(),
  };

  it('regenerate requires LLM', () => {
    expect(
      decideIntentAction({
        mode: 'regenerate',
        fingerprint: fp,
        existing: llmRow,
        llmAvailable: true,
      }),
    ).toEqual({ action: 'compute_llm' });
    expect(
      decideIntentAction({
        mode: 'regenerate',
        fingerprint: fp,
        existing: llmRow,
        llmAvailable: false,
      }),
    ).toEqual({ action: 'fail_missing_key' });
  });

  it('soft cache-hits LLM and seed on fingerprint match', () => {
    expect(
      decideIntentAction({
        mode: 'soft',
        fingerprint: fp,
        existing: llmRow,
        llmAvailable: true,
      }),
    ).toEqual({ action: 'return_cached' });
    expect(
      decideIntentAction({
        mode: 'soft',
        fingerprint: fp,
        existing: seedRow,
        llmAvailable: true,
      }),
    ).toEqual({ action: 'return_cached' });
  });

  it('soft upgrades sticky heuristic when LLM becomes available', () => {
    expect(
      decideIntentAction({
        mode: 'soft',
        fingerprint: fp,
        existing: heuristicRow,
        llmAvailable: true,
      }),
    ).toEqual({ action: 'compute_llm' });
    expect(
      decideIntentAction({
        mode: 'soft',
        fingerprint: fp,
        existing: heuristicRow,
        llmAvailable: false,
      }),
    ).toEqual({ action: 'return_cached' });
  });

  it('soft recomputes when fingerprint changes', () => {
    expect(
      decideIntentAction({
        mode: 'soft',
        fingerprint: 'other',
        existing: llmRow,
        llmAvailable: true,
      }),
    ).toEqual({ action: 'compute_llm' });
    expect(
      decideIntentAction({
        mode: 'soft',
        fingerprint: 'other',
        existing: llmRow,
        llmAvailable: false,
      }),
    ).toEqual({ action: 'compute_heuristic' });
  });

  it('soft with no row uses LLM or heuristic by availability', () => {
    expect(
      decideIntentAction({
        mode: 'soft',
        fingerprint: fp,
        existing: null,
        llmAvailable: true,
      }),
    ).toEqual({ action: 'compute_llm' });
    expect(
      decideIntentAction({
        mode: 'soft',
        fingerprint: fp,
        existing: null,
        llmAvailable: false,
      }),
    ).toEqual({ action: 'compute_heuristic' });
  });
});
