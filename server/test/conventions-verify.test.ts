import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fingerprint } from '../src/modules/conventions/helpers.js';
import type { ExtractedConventionCandidate } from '../src/modules/conventions/schema.js';
import {
  findSnippetInContent,
  isTrivialSnippet,
  resolveSafePath,
  verifyCandidate,
} from '../src/modules/conventions/verify.js';

const candidate: ExtractedConventionCandidate = {
  category: 'Error Handling',
  rule: 'Use typed errors for recoverable failures.',
  evidence_path: 'src/errors.ts',
  evidence_snippet: 'throw new ValidationError(message);',
  evidence_start_line: 999,
  evidence_end_line: 999,
  confidence: 0.9,
};

describe('conventions evidence verification', () => {
  let root: string;
  let outside: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'conventions-clone-'));
    outside = await mkdtemp(join(tmpdir(), 'conventions-outside-'));
    await mkdir(join(root, 'src'));
    await writeFile(join(root, 'src/errors.ts'), 'export function fail(message: string) {\n  throw new ValidationError(message);\n}\n');
    await writeFile(join(outside, 'secret.ts'), 'export const secret = true;\n');
  });

  afterEach(async () => {
    await Promise.all([
      rm(root, { recursive: true, force: true }),
      rm(outside, { recursive: true, force: true }),
    ]);
  });

  it('recomputes exact and whitespace-normalized source line spans', () => {
    const content = [
      'export function fail(message: string) {',
      '  throw new ValidationError(',
      '    message,',
      '  );',
      '}',
    ].join('\n');

    expect(findSnippetInContent(content, 'message,')).toEqual({
      start: 3,
      end: 3,
      matched: 'message,',
    });
    expect(
      findSnippetInContent(content, 'throw new ValidationError( message, );'),
    ).toEqual({
      start: 2,
      end: 4,
      matched: 'throw new ValidationError(\n    message,\n  );',
    });
  });

  it('grounds only non-trivial evidence from the provided samples map', () => {
    const content = 'export function fail(message: string) {\n  throw new ValidationError(message);\n}\n';
    const samples = new Map([['src/errors.ts', content]]);
    const verified = verifyCandidate(candidate, samples);

    expect(verified).toMatchObject({
      category: 'error-handling',
      evidencePath: 'src/errors.ts',
      evidenceStartLine: 2,
      evidenceEndLine: 2,
      confidence: 0.9,
    });
    // Legacy prompt labels used "kind:path"; strip known prefixes so those
    // still ground against bare samples-map keys.
    expect(
      verifyCandidate({ ...candidate, evidence_path: 'code:src/errors.ts' }, samples),
    ).toMatchObject({ evidencePath: 'src/errors.ts' });
    expect(
      verifyCandidate({ ...candidate, evidence_path: 'config:src/errors.ts' }, samples),
    ).toMatchObject({ evidencePath: 'src/errors.ts' });
    expect(verifyCandidate({ ...candidate, evidence_path: 'src/other.ts' }, new Map())).toBeNull();
    expect(
      verifyCandidate(
        { ...candidate, evidence_path: '../secret.ts' },
        new Map([['../secret.ts', candidate.evidence_snippet]]),
      ),
    ).toBeNull();
    expect(
      verifyCandidate(
        { ...candidate, evidence_snippet: '});' },
        samples,
      ),
    ).toBeNull();
    expect(isTrivialSnippet('}')).toBe(true);
  });

  it('rejects lexical traversal and symlinks escaping the clone', async () => {
    await expect(resolveSafePath(root, '../secret.ts')).rejects.toThrow(/Unsafe repository path/);

    await symlink(join(outside, 'secret.ts'), join(root, 'linked-secret.ts'));
    await expect(resolveSafePath(root, 'linked-secret.ts')).rejects.toThrow(
      /resolves outside clone root/,
    );

    await expect(resolveSafePath(root, 'src/errors.ts')).resolves.toBe(
      join(root, 'src/errors.ts'),
    );
  });

  it('fingerprints normalized directive text deterministically', () => {
    expect(fingerprint('  Use typed errors.  ')).toBe(fingerprint('use   typed errors.'));
    expect(fingerprint('Use typed errors.')).not.toBe(fingerprint('Use error codes.'));
  });
});
