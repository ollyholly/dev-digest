import type { FindingRecord, Severity, SeverityCounts } from "@devdigest/shared";
import { LOW_CONFIDENCE_THRESHOLD, SEVERITY_ORDER } from "./constants";

const VALID: ReadonlySet<string> = new Set(["CRITICAL", "WARNING", "SUGGESTION"]);

/** Parse `?severity=CRITICAL,WARNING` — unknown tokens ignored. */
export function parseSeverityParam(raw: string | null): Severity[] {
  if (!raw) return [];
  const out: Severity[] = [];
  for (const token of raw.split(",")) {
    const t = token.trim();
    if (VALID.has(t) && !out.includes(t as Severity)) out.push(t as Severity);
  }
  return out;
}

export function serializeSeverityParam(selected: Severity[]): string | null {
  return selected.length > 0 ? selected.join(",") : null;
}

/** Count by severity (includes accepted/dismissed). */
export function countBySeverity(findings: FindingRecord[]): SeverityCounts {
  const c: SeverityCounts = { CRITICAL: 0, WARNING: 0, SUGGESTION: 0 };
  for (const f of findings) {
    if (f.severity === "CRITICAL") c.CRITICAL += 1;
    else if (f.severity === "WARNING") c.WARNING += 1;
    else if (f.severity === "SUGGESTION") c.SUGGESTION += 1;
  }
  return c;
}

/**
 * Confidence filter first, then optional severity selection, then severity sort.
 * Counts for the bar must be taken from the confidence-filtered list only.
 */
export function visibleFindings(
  findings: FindingRecord[],
  hideLow: boolean,
  selected: Severity[] = [],
): FindingRecord[] {
  let shown = findings;
  if (hideLow) shown = shown.filter((f) => f.confidence >= LOW_CONFIDENCE_THRESHOLD);
  if (selected.length > 0) {
    const set = new Set<string>(selected);
    shown = shown.filter((f) => set.has(f.severity));
  }
  return [...shown].sort(
    (a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9),
  );
}

/** Confidence-filtered findings used to drive chip counts. */
export function confidenceFiltered(
  findings: FindingRecord[],
  hideLow: boolean,
): FindingRecord[] {
  if (!hideLow) return findings;
  return findings.filter((f) => f.confidence >= LOW_CONFIDENCE_THRESHOLD);
}
