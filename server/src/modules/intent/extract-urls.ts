export type ExtractedUrlKind = 'plan_url' | 'spec_url';

export interface ExtractedUrl {
  kind: ExtractedUrlKind;
  url: string;
  /** Repo-relative path when the link is clearly in-repo (`docs/` / `specs/`). */
  repoPath?: string;
}

const MARKDOWN_LINK = /\[([^\]]*)\]\(([^)\s]+)\)/g;
const BARE_URL = /https?:\/\/[^\s)<>"']+/gi;
const PLAN_SPEC_HINT = /(?:^|\/)(?:plan|spec|design|rfc|adr|docs)(?:\/|$)|plan|spec|design|rfc|adr/i;
const MAX_URLS = 8;

function stripTrailingPunct(url: string): string {
  return url.replace(/[.,;:!?)]+$/, '');
}

function classify(urlOrPath: string): ExtractedUrlKind {
  // Prefer plan_url when the path/query looks like planning docs; else spec_url
  // for markdown / docs-ish hosts; default plan_url for required planning links.
  if (/\.md(?:$|[?#])/i.test(urlOrPath) && !PLAN_SPEC_HINT.test(urlOrPath)) {
    return 'spec_url';
  }
  return 'plan_url';
}

function isPlanOrSpecCandidate(ref: string): boolean {
  return PLAN_SPEC_HINT.test(ref) || /(?:^|\/)(?:docs|specs)\//i.test(ref);
}

/**
 * Extract plan/spec URLs (and repo-relative docs/specs paths) from markdown /
 * bare links in a PR body. Cap at 8. Only refs that look like plan/spec/design
 * docs are returned — required when present.
 */
export function extractPlanSpecUrls(body: string): ExtractedUrl[] {
  if (!body.trim()) return [];

  const seen = new Set<string>();
  const out: ExtractedUrl[] = [];

  const consider = (raw: string) => {
    if (out.length >= MAX_URLS) return;
    const ref = stripTrailingPunct(raw.trim());
    if (!ref || seen.has(ref)) return;
    if (!isPlanOrSpecCandidate(ref)) return;
    seen.add(ref);

    // Repo-relative docs/specs (no scheme).
    if (!/^https?:\/\//i.test(ref) && /^(?:\.\/)?(?:docs|specs)\//i.test(ref)) {
      const repoPath = ref.replace(/^\.\//, '');
      out.push({ kind: classify(repoPath), url: repoPath, repoPath });
      return;
    }

    if (!/^https?:\/\//i.test(ref)) return;
    out.push({ kind: classify(ref), url: ref });
  };

  for (const m of body.matchAll(MARKDOWN_LINK)) {
    if (m[2]) consider(m[2]);
  }
  for (const m of body.matchAll(BARE_URL)) {
    if (m[0]) consider(m[0]);
  }

  return out;
}
