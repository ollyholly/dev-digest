import { extname } from 'node:path';
import type { ConventionCandidate, ConventionSkillDraft } from '@devdigest/shared';

type AcceptedConvention = Pick<
  ConventionCandidate,
  | 'category'
  | 'rule'
  | 'evidence_path'
  | 'evidence_snippet'
  | 'evidence_start_line'
  | 'evidence_end_line'
>;

export function buildMergedDraft(
  accepted: AcceptedConvention[],
  repoName: string,
): ConventionSkillDraft {
  const name = `${repoName} conventions`;
  return {
    name,
    description: `House conventions extracted from ${repoName}.`,
    type: 'convention',
    body: buildBody(name, accepted, repoName),
    evidence_files: uniqueEvidenceFiles(accepted),
    accepted_count: accepted.length,
    category: null,
  };
}

export function buildCategoryDrafts(
  accepted: AcceptedConvention[],
  repoName: string,
): ConventionSkillDraft[] {
  const grouped = new Map<string, AcceptedConvention[]>();
  for (const convention of accepted) {
    const category = convention.category.trim() || 'general';
    const group = grouped.get(category) ?? [];
    group.push(convention);
    grouped.set(category, group);
  }

  return [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, conventions]) => {
      const slug = categorySlug(category);
      const name = `${repoName} ${slug} conventions`;
      return {
        name,
        description: `${category} house conventions extracted from ${repoName}.`,
        type: 'convention' as const,
        body: buildBody(name, conventions, repoName),
        evidence_files: uniqueEvidenceFiles(conventions),
        accepted_count: conventions.length,
        category,
      };
    });
}

function buildBody(
  name: string,
  conventions: AcceptedConvention[],
  repoName: string,
): string {
  const grouped = new Map<string, AcceptedConvention[]>();
  for (const convention of conventions) {
    const category = convention.category.trim() || 'general';
    const group = grouped.get(category) ?? [];
    group.push(convention);
    grouped.set(category, group);
  }

  const sections = [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, entries]) => {
      const rules = entries.map(renderConvention).join('\n\n');
      return `## ${categorySlug(category)}\n${rules}`;
    });

  return [
    `# ${name}`,
    `House conventions for \`${repoName}\`. Flag changes that violate any rule below and cite the offending \`file:line\`.`,
    ...sections,
  ].join('\n\n');
}

function renderConvention(convention: AcceptedConvention): string {
  const language = languageForPath(convention.evidence_path);
  const fence = codeFence(convention.evidence_snippet);
  return [
    convention.rule.trim(),
    `Detected in \`${convention.evidence_path}:${convention.evidence_start_line}-${convention.evidence_end_line}\`:`,
    `${fence}${language}\n${convention.evidence_snippet.trim()}\n${fence}`,
  ].join('\n\n');
}

function categorySlug(category: string): string {
  return (
    category
      .normalize('NFKC')
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '') || 'general'
  );
}

function uniqueEvidenceFiles(conventions: AcceptedConvention[]): string[] {
  return [...new Set(conventions.map((convention) => convention.evidence_path))];
}

function codeFence(snippet: string): string {
  const longestRun = Math.max(0, ...[...snippet.matchAll(/`+/g)].map((match) => match[0].length));
  return '`'.repeat(Math.max(3, longestRun + 1));
}

function languageForPath(path: string): string {
  if (path.endsWith('.d.ts')) return 'ts';
  const languages: Record<string, string> = {
    '.bash': 'bash',
    '.c': 'c',
    '.cc': 'cpp',
    '.cpp': 'cpp',
    '.cs': 'csharp',
    '.css': 'css',
    '.go': 'go',
    '.html': 'html',
    '.java': 'java',
    '.js': 'js',
    '.json': 'json',
    '.jsonc': 'jsonc',
    '.jsx': 'jsx',
    '.kt': 'kotlin',
    '.md': 'md',
    '.php': 'php',
    '.py': 'python',
    '.rb': 'ruby',
    '.rs': 'rust',
    '.scss': 'scss',
    '.sh': 'bash',
    '.sql': 'sql',
    '.swift': 'swift',
    '.toml': 'toml',
    '.ts': 'ts',
    '.tsx': 'tsx',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.zsh': 'zsh',
  };
  if (path.endsWith('.editorconfig')) return 'ini';
  return languages[extname(path).toLowerCase()] ?? '';
}
