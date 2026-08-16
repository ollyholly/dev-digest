import { Severity, type SmartDiff, type SmartDiffFile, type SmartDiffFinding, type SmartDiffRole } from '@devdigest/shared';
import { classifyFile } from './classify.js';
import { ROLE_ORDER, SPLIT_NAME_BY_ROLE, TOO_BIG_CHANGED_LINES } from './constants.js';

export interface SmartDiffFileInput {
  path: string;
  additions: number;
  deletions: number;
}

export type SmartDiffFindingInput = SmartDiffFinding & { file: string };

function overlayFinding(finding: SmartDiffFindingInput): SmartDiffFinding {
  return {
    id: finding.id,
    start_line: finding.start_line,
    end_line: finding.end_line,
    severity: finding.severity,
    title: finding.title,
  };
}

function indexFindingsByPath(findings: SmartDiffFindingInput[]): Map<string, SmartDiffFinding[]> {
  const byPath = new Map<string, SmartDiffFinding[]>();
  for (const finding of findings) {
    const list = byPath.get(finding.file);
    const overlay = overlayFinding(finding);
    if (list) list.push(overlay);
    else byPath.set(finding.file, [overlay]);
  }
  for (const list of byPath.values()) {
    list.sort(
      (a, b) =>
        Severity.options.indexOf(a.severity) - Severity.options.indexOf(b.severity) ||
        a.start_line - b.start_line,
    );
  }
  return byPath;
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
  const findingsByPath = indexFindingsByPath(findings);

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
