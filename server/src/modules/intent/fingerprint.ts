import { createHash } from 'node:crypto';

/** Inputs that participate in the intent cache key. */
export interface IntentFingerprintInput {
  title: string;
  body: string;
  issueKey: string;
  urls: string[];
  paths: string[];
  commits: string[];
}

function norm(s: string): string {
  return s.replace(/\r\n/g, '\n').trim();
}

/**
 * SHA-256 hex of `title|body|issueKey|urlsSorted|pathsSorted|commitsSorted`.
 * Order-insensitive for list fields (sorted before join).
 */
export function computeIntentFingerprint(input: IntentFingerprintInput): string {
  const payload = [
    norm(input.title),
    norm(input.body),
    norm(input.issueKey),
    [...input.urls].map(norm).sort().join(','),
    [...input.paths].map(norm).sort().join(','),
    [...input.commits].map(norm).sort().join(','),
  ].join('|');
  return createHash('sha256').update(payload, 'utf8').digest('hex');
}
