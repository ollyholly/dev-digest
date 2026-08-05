import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { extractJson, parseWithRepair, toJsonSchema } from '../src/llm/structured.js';

/**
 * llm/structured.ts turns raw model text into schema-validated data (or a
 * reprompt instruction). It sits directly upstream of the grounding gate, so
 * a bug here (e.g. mis-extracting JSON from a fenced response) would corrupt
 * every finding before grounding ever sees it.
 */

describe('extractJson', () => {
  it('returns already-bare JSON unchanged (aside from trimming)', () => {
    expect(extractJson('  {"a":1}  ')).toBe('{"a":1}');
  });

  it('strips a ```json fence', () => {
    expect(extractJson('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it('strips a bare ``` fence with no language tag', () => {
    expect(extractJson('```\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it('extracts the first balanced object out of surrounding prose', () => {
    expect(extractJson('Sure, here you go: {"a":1} — hope that helps!')).toBe('{"a":1}');
  });

  it('extracts a top-level array when no object is present', () => {
    expect(extractJson('result: [1,2,3] done')).toBe('[1,2,3]');
  });

  it('prefers whichever of { or [ appears first in the text', () => {
    expect(extractJson('prefix [1,2] then {"a":1}')).toBe('[1,2]');
  });

  it('respects nested braces when finding the balanced close', () => {
    const text = 'noise {"a":{"b":1},"c":[1,2,{"d":3}]} trailing junk';
    expect(extractJson(text)).toBe('{"a":{"b":1},"c":[1,2,{"d":3}]}');
  });

  it('falls back to the trimmed remainder when no closing bracket is found', () => {
    expect(extractJson('prefix {"a":1')).toBe('{"a":1');
  });

  it('returns the trimmed text unchanged when it contains no braces at all', () => {
    expect(extractJson('  no json here  ')).toBe('no json here');
  });
});

describe('parseWithRepair', () => {
  const schema = z.object({ verdict: z.enum(['approve', 'request_changes']), score: z.number() });

  it('parses bare, valid JSON that matches the schema', () => {
    const result = parseWithRepair(schema, '{"verdict":"approve","score":90}');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual({ verdict: 'approve', score: 90 });
  });

  it('falls back to fence/brace extraction when the raw text is not directly parseable', () => {
    const raw = 'Here is my review:\n```json\n{"verdict":"approve","score":90}\n```';
    const result = parseWithRepair(schema, raw);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.score).toBe(90);
  });

  it('reports ok:false with a reprompt when the text has no valid JSON at all', () => {
    const result = parseWithRepair(schema, 'not json, sorry');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/not valid JSON/);
      expect(result.repromptMessage).toMatch(/Return ONLY a single valid JSON object/);
    }
  });

  it('reports ok:false with per-field issues when JSON is valid but fails the schema', () => {
    const result = parseWithRepair(schema, '{"verdict":"maybe","score":"high"}');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/verdict/);
      expect(result.error).toMatch(/score/);
      expect(result.repromptMessage).toMatch(/did not match the required schema/);
    }
  });

  it('reports a path-qualified issue for a missing required nested field', () => {
    const nested = z.object({ findings: z.array(z.object({ file: z.string() })) });
    const result = parseWithRepair(nested, '{"findings":[{}]}');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/findings\.0\.file/);
  });
});

describe('toJsonSchema', () => {
  it('converts a Zod object schema into a strict JSON Schema with the given name', () => {
    const schema = z.object({ score: z.number().int() });
    const { schema: jsonSchema, name } = toJsonSchema(schema, 'Review');
    expect(name).toBe('Review');
    expect(jsonSchema).toHaveProperty('properties');
    expect((jsonSchema as { properties: Record<string, unknown> }).properties).toHaveProperty('score');
  });
});
