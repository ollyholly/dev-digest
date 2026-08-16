import type { Severity, SmartDiffFinding } from "@devdigest/shared";

const SEVERITY_RANK: Record<Severity, number> = {
  CRITICAL: 3,
  WARNING: 2,
  SUGGESTION: 1,
};

/** Findings whose `[start_line, end_line]` includes the new-side line. */
export function findingsCoveringLine(
  findings: readonly SmartDiffFinding[],
  line: number,
): SmartDiffFinding[] {
  return findings.filter((f) => line >= f.start_line && line <= f.end_line);
}

/** Highest-severity finding in the set, or null when empty. */
export function worstCoveringSeverity(findings: readonly SmartDiffFinding[]): Severity | null {
  if (findings.length === 0) return null;
  let worst = findings[0]!;
  for (const f of findings) {
    if (SEVERITY_RANK[f.severity] > SEVERITY_RANK[worst.severity]) worst = f;
  }
  return worst.severity;
}
