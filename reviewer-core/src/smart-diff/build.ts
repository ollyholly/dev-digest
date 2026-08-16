import type { SmartDiff, SmartDiffFile, SmartDiffFinding, SmartDiffRole } from '@devdigest/shared';
import { classifyFile } from './classify.js';
import { ROLE_ORDER, SPLIT_NAME_BY_ROLE, TOO_BIG_CHANGED_LINES } from './constants.js';

export interface SmartDiffFileInput {
  path: string;
  additions: number;
  deletions: number;
}

export interface SmartDiffFindingInput {
  id: string;
  file: string;
  start_line: number;
  end_line: number;
  severity: SmartDiffFinding['severity'];
  title: string;
}

const SEVERITY_RANK: Record<SmartDiffFinding['severity'], number> = {
  CRITICAL: 0,
  WARNING: 1,
  SUGGESTION: 2,
};

function findingsForPath(
  path: string,
  findings: SmartDiffFindingInput[],
): SmartDiffFinding[] {
  return findings
    .filter((f) => f.file === path)
    .map((f) => ({
      id: f.id,
      start_line: f.start_line,
      end_line: f.end_line,
      severity: f.severity,
      title: f.title,
    }))
    .sort(
      (a, b) =>
        SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || a.start_line - b.start_line,
    );
}

function uniqueLines(findings: SmartDiffFinding[]): number[] {
  return [...new Set(findings.map((f) => f.start_line))].sort((a, b) => a - b);
}

function churn(file: SmartDiffFileInput): number {
  return file.additions + file.deletions;
}

function compareFiles(
  a: SmartDiffFileInput,
  b: SmartDiffFileInput,
  findingsByPath: Map<string, SmartDiffFinding[]>,
): number {
  const aHas = (findingsByPath.get(a.path)?.length ?? 0) > 0 ? 0 : 1;
  const bHas = (findingsByPath.get(b.path)?.length ?? 0) > 0 ? 0 : 1;
  if (aHas !== bHas) return aHas - bHas;
  const churnDelta = churn(b) - churn(a);
  if (churnDelta !== 0) return churnDelta;
  return a.path.localeCompare(b.path);
}

function toSmartDiffFile(
  file: SmartDiffFileInput,
  attached: SmartDiffFinding[],
): SmartDiffFile {
  return {
    path: file.path,
    pseudocode_summary: null,
    additions: file.additions,
    deletions: file.deletions,
    finding_lines: uniqueLines(attached),
    findings: attached,
  };
}

/** Group PR files by role and overlay findings. No I/O, no LLM. */
export function buildSmartDiff(
  files: SmartDiffFileInput[],
  findings: SmartDiffFindingInput[] = [],
): SmartDiff {
  const findingsByPath = new Map<string, SmartDiffFinding[]>();
  for (const file of files) {
    findingsByPath.set(file.path, findingsForPath(file.path, findings));
  }

  const byRole = new Map<SmartDiffRole, SmartDiffFileInput[]>();
  for (const file of files) {
    const role = classifyFile(file.path);
    const list = byRole.get(role);
    if (list) list.push(file);
    else byRole.set(role, [file]);
  }

  const groups = ROLE_ORDER.flatMap((role) => {
    const grouped = byRole.get(role);
    if (!grouped || grouped.length === 0) return [];
    const sorted = [...grouped].sort((a, b) => compareFiles(a, b, findingsByPath));
    return [
      {
        role,
        files: sorted.map((f) => toSmartDiffFile(f, findingsByPath.get(f.path) ?? [])),
      },
    ];
  });

  const total_lines = files.reduce((sum, f) => sum + churn(f), 0);
  const too_big = total_lines >= TOO_BIG_CHANGED_LINES;
  const proposed_splits = too_big
    ? groups.map((g) => ({
        name: SPLIT_NAME_BY_ROLE[g.role],
        files: g.files.map((f) => f.path),
      }))
    : [];

  return {
    groups,
    split_suggestion: { too_big, total_lines, proposed_splits },
  };
}
