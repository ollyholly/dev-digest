import type { FindingRecord, SeverityCounts } from "@devdigest/shared";
import { CARD_GAP, CARD_MAX_HEIGHT, CARD_WIDTH, SEVERITY_ORDER } from "./constants";

/** Sort findings worst-first (CRITICAL → WARNING → SUGGESTION). */
export function sortBySeverity(findings: FindingRecord[]): FindingRecord[] {
  return [...findings].sort(
    (a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9),
  );
}

export function hasAnyFindings(counts: SeverityCounts | null | undefined): boolean {
  if (!counts) return false;
  return counts.CRITICAL + counts.WARNING + counts.SUGGESTION > 0;
}

export function emptySeverityCounts(): SeverityCounts {
  return { CRITICAL: 0, WARNING: 0, SUGGESTION: 0 };
}

/** Count findings by severity (includes accepted/dismissed). */
export function countFindingsBySeverity(
  findings: { severity: string }[],
): SeverityCounts {
  const c = emptySeverityCounts();
  for (const f of findings) {
    if (f.severity === "CRITICAL") c.CRITICAL += 1;
    else if (f.severity === "WARNING") c.WARNING += 1;
    else if (f.severity === "SUGGESTION") c.SUGGESTION += 1;
  }
  return c;
}

export type PopoverPos = { top: number; left: number; flipUp: boolean };

/**
 * Place a fixed popover below the anchor, flipping above when there is no room
 * and clamping so it never leaves the right (or left) edge of the viewport.
 */
export function popoverPosition(
  anchor: { top: number; left: number; bottom: number; right: number; width: number },
  viewport: { width: number; height: number },
  opts: { width?: number; maxHeight?: number; gap?: number } = {},
): PopoverPos {
  const width = opts.width ?? CARD_WIDTH;
  const maxHeight = opts.maxHeight ?? CARD_MAX_HEIGHT;
  const gap = opts.gap ?? CARD_GAP;

  const spaceBelow = viewport.height - anchor.bottom - gap;
  const flipUp = spaceBelow < Math.min(maxHeight, 160) && anchor.top > spaceBelow;

  let left = anchor.left;
  if (left + width > viewport.width - 8) left = Math.max(8, viewport.width - width - 8);
  if (left < 8) left = 8;

  const top = flipUp ? anchor.top - gap : anchor.bottom + gap;
  return { top, left, flipUp };
}

export function fileLineLabel(f: FindingRecord): string {
  if (f.start_line === f.end_line) return `${f.file}:${f.start_line}`;
  return `${f.file}:${f.start_line}-${f.end_line}`;
}

export function confidencePct(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}
