import { realpath } from 'node:fs/promises';
import { isAbsolute, join, posix, relative, resolve, win32 } from 'node:path';
import { MIN_CONFIDENCE } from './constants.js';
import type { ExtractedConventionCandidate } from './schema.js';

export interface SnippetMatch {
  start: number;
  end: number;
  matched: string;
}

export interface VerifiedConventionCandidate {
  category: string;
  rule: string;
  evidencePath: string;
  evidenceSnippet: string;
  evidenceStartLine: number;
  evidenceEndLine: number;
  confidence: number;
}

/** Normalize a git-style path, rejecting absolute and traversal forms. */
export function normalizeRepoRelativePath(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed || trimmed.includes('\0') || trimmed.includes('\\')) return null;
  if (isAbsolute(trimmed) || posix.isAbsolute(trimmed) || win32.isAbsolute(trimmed)) return null;

  const segments = trimmed.split('/');
  if (segments.some((segment) => segment === '..')) return null;
  const normalized = segments.filter((segment) => segment !== '' && segment !== '.').join('/');
  return normalized || null;
}

/**
 * Resolve a repository-relative path only when both lexical and real paths stay
 * under the clone root. The realpath check rejects symlinks that escape it.
 */
export async function resolveSafePath(clonePath: string, relativePath: string): Promise<string> {
  const safeRelative = normalizeRepoRelativePath(relativePath);
  if (!safeRelative) throw new Error(`Unsafe repository path: ${relativePath}`);

  const lexicalRoot = resolve(clonePath);
  const lexicalTarget = resolve(join(lexicalRoot, ...safeRelative.split('/')));
  if (!isContained(lexicalRoot, lexicalTarget)) {
    throw new Error(`Repository path escapes clone root: ${relativePath}`);
  }

  const [realRoot, realTarget] = await Promise.all([realpath(lexicalRoot), realpath(lexicalTarget)]);
  if (!isContained(realRoot, realTarget)) {
    throw new Error(`Repository path resolves outside clone root: ${relativePath}`);
  }
  return realTarget;
}

/**
 * Find an exact snippet first, then a whitespace-normalized equivalent. Line
 * numbers are always recomputed from the source content (1-based, inclusive).
 */
export function findSnippetInContent(content: string, snippet: string): SnippetMatch | null {
  const needle = snippet.trim();
  if (!needle) return null;

  const exactIndex = content.indexOf(needle);
  if (exactIndex >= 0) return toSnippetMatch(content, exactIndex, needle);

  const tokens = needle.split(/\s+/u).filter(Boolean);
  if (tokens.length === 0) return null;
  const pattern = tokens.map(escapeRegex).join('\\s+');
  const normalizedMatch = new RegExp(pattern, 'u').exec(content);
  if (!normalizedMatch || normalizedMatch.index === undefined) return null;
  return toSnippetMatch(content, normalizedMatch.index, normalizedMatch[0]);
}

/** Reject evidence too small or punctuation-only to ground a real convention. */
export function isTrivialSnippet(snippet: string): boolean {
  const trimmed = snippet.trim();
  if (trimmed.length < 4) return true;
  if (!/[\p{L}\p{N}_]/u.test(trimmed)) return true;
  return /^(?:return|break|continue|pass)?\s*[}\])]*[;,]?\s*$/u.test(trimmed);
}

/**
 * Ground one model candidate exclusively against already-loaded samples.
 * This function performs no filesystem reads: an unknown path is rejected.
 */
export function verifyCandidate(
  candidate: ExtractedConventionCandidate,
  samplesByPath: ReadonlyMap<string, string>,
): VerifiedConventionCandidate | null {
  if (candidate.confidence < MIN_CONFIDENCE || isTrivialSnippet(candidate.evidence_snippet)) {
    return null;
  }

  const evidencePath = normalizeRepoRelativePath(candidate.evidence_path);
  if (!evidencePath) return null;
  const content = samplesByPath.get(evidencePath);
  if (content === undefined) return null;

  const match = findSnippetInContent(content, candidate.evidence_snippet);
  if (!match || isTrivialSnippet(match.matched)) return null;

  const rule = candidate.rule.trim().replace(/\s+/gu, ' ');
  if (!rule) return null;

  const category =
    candidate.category
      .normalize('NFKC')
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '') || 'general';

  return {
    category,
    rule,
    evidencePath,
    evidenceSnippet: match.matched,
    evidenceStartLine: match.start,
    evidenceEndLine: match.end,
    confidence: candidate.confidence,
  };
}

function isContained(root: string, target: string): boolean {
  const rel = relative(root, target);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

function toSnippetMatch(content: string, index: number, matched: string): SnippetMatch {
  const start = countNewlines(content.slice(0, index)) + 1;
  const end = start + countNewlines(matched);
  return { start, end, matched };
}

function countNewlines(value: string): number {
  return value.split('\n').length - 1;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
