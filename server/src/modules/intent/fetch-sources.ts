import type { IntentSource, IssueMeta, RepoRef } from '@devdigest/shared';
import type { Container } from '../../platform/container.js';
import type { ExtractedUrl } from './extract-urls.js';

const FETCH_TIMEOUT_MS = 5_000;
const FETCH_MAX_BYTES = 64 * 1024;

/** Hosts allowed for plan/spec HTTP fetches (passed to Container.http). */
export const INTENT_HTTP_ALLOWED_HOSTS = new Set([
  'github.com',
  'www.github.com',
  'raw.githubusercontent.com',
  'gist.githubusercontent.com',
]);

export interface FetchedSourceContent {
  source: IntentSource;
  /** Truncated body text when fetch succeeded. */
  text?: string;
}

function safeRepoRelativePath(rel: string): string | null {
  const cleaned = rel.replace(/^\/+/, '').replace(/\\/g, '/');
  if (!cleaned || cleaned.includes('..') || cleaned.startsWith('/')) return null;
  if (!/^(?:docs|specs)\//i.test(cleaned)) return null;
  return cleaned;
}

async function fetchOneUrl(
  container: Container,
  repo: RepoRef,
  u: ExtractedUrl,
): Promise<FetchedSourceContent> {
  const kind = u.kind;
  if (u.repoPath) {
    const safe = safeRepoRelativePath(u.repoPath);
    if (!safe) {
      return { source: { kind, ref: u.repoPath, fetched_ok: false } };
    }
    try {
      const text = await container.git.readFile(repo, safe);
      return {
        source: { kind, ref: safe, fetched_ok: true },
        text: text.slice(0, FETCH_MAX_BYTES),
      };
    } catch {
      return { source: { kind, ref: safe, fetched_ok: false } };
    }
  }

  const result = await container.http.getText(u.url, {
    timeoutMs: FETCH_TIMEOUT_MS,
    maxBytes: FETCH_MAX_BYTES,
    allowedHosts: INTENT_HTTP_ALLOWED_HOSTS,
    blockPrivateIps: true,
  });
  return {
    source: { kind, ref: u.url, fetched_ok: result.ok },
    ...(result.text !== undefined ? { text: result.text } : {}),
  };
}

/**
 * Fetch linked issue + plan/spec sources. Best-effort; each source gets
 * `fetched_ok` when a network/fs attempt was made.
 *
 * HTTP goes through `container.http` (SafeHttpClient) — allowlist, DNS
 * private-IP check, 5s timeout, 64 KiB streamed cap. Plan/spec URLs are
 * fetched in parallel after the linked-issue attempt.
 */
export async function fetchIntentSources(opts: {
  container: Container;
  repo: RepoRef;
  issueNumber?: number;
  urls: ExtractedUrl[];
}): Promise<{ issue?: IssueMeta; contents: FetchedSourceContent[] }> {
  const contents: FetchedSourceContent[] = [];
  let issue: IssueMeta | undefined;

  if (opts.issueNumber !== undefined) {
    const ref = `#${opts.issueNumber}`;
    try {
      const gh = await opts.container.github();
      issue = await gh.getIssue(opts.repo, opts.issueNumber);
      contents.push({
        source: { kind: 'linked_issue', ref, fetched_ok: true },
        text: [`#${issue.number} ${issue.title}`, issue.body ?? ''].join('\n\n'),
      });
    } catch {
      contents.push({ source: { kind: 'linked_issue', ref, fetched_ok: false } });
    }
  }

  const urlResults = await Promise.all(
    opts.urls.map((u) => fetchOneUrl(opts.container, opts.repo, u)),
  );
  contents.push(...urlResults);

  return { issue, contents };
}
