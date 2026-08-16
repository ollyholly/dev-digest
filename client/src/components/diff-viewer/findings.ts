import type { Severity, SmartDiffFinding } from "@devdigest/shared";

/** Worst-first. Keep in lockstep with `Severity` in `@devdigest/shared`. */
const SEVERITY_ORDER: readonly Severity[] = ["CRITICAL", "WARNING", "SUGGESTION"];

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
    if (SEVERITY_ORDER.indexOf(f.severity) < SEVERITY_ORDER.indexOf(worst.severity)) {
      worst = f;
    }
  }
  return worst.severity;
}
