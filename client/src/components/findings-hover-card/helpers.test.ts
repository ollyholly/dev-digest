import { describe, it, expect } from "vitest";
import type { FindingRecord } from "@devdigest/shared";
import { popoverPosition, sortBySeverity, countFindingsBySeverity } from "./helpers";

function finding(partial: Partial<FindingRecord> & { id: string; severity: FindingRecord["severity"] }): FindingRecord {
  return {
    review_id: "r1",
    accepted_at: null,
    dismissed_at: null,
    category: "bug",
    title: "t",
    file: "a.ts",
    start_line: 1,
    end_line: 1,
    rationale: "why",
    suggestion: null,
    confidence: 0.9,
    kind: "finding",
    ...partial,
  };
}

describe("sortBySeverity", () => {
  it("orders CRITICAL before WARNING before SUGGESTION", () => {
    const sorted = sortBySeverity([
      finding({ id: "s", severity: "SUGGESTION" }),
      finding({ id: "c", severity: "CRITICAL" }),
      finding({ id: "w", severity: "WARNING" }),
    ]);
    expect(sorted.map((f) => f.id)).toEqual(["c", "w", "s"]);
  });
});

describe("countFindingsBySeverity", () => {
  it("tallies all severities including dismissed", () => {
    expect(
      countFindingsBySeverity([
        { severity: "CRITICAL" },
        { severity: "WARNING" },
        { severity: "WARNING" },
        { severity: "SUGGESTION" },
        { severity: "WEIRD" },
      ]),
    ).toEqual({ CRITICAL: 1, WARNING: 2, SUGGESTION: 1 });
  });
});

describe("popoverPosition", () => {
  const anchor = { top: 100, left: 40, bottom: 120, right: 140, width: 100 };

  it("places below when there is room", () => {
    const pos = popoverPosition(anchor, { width: 800, height: 800 });
    expect(pos.flipUp).toBe(false);
    expect(pos.top).toBeGreaterThan(anchor.bottom);
  });

  it("flips above near the bottom of the viewport", () => {
    const low = { top: 700, left: 40, bottom: 720, right: 140, width: 100 };
    const pos = popoverPosition(low, { width: 800, height: 750 });
    expect(pos.flipUp).toBe(true);
  });

  it("clamps so the card never leaves the right edge", () => {
    const nearRight = { top: 100, left: 700, bottom: 120, right: 800, width: 100 };
    const pos = popoverPosition(nearRight, { width: 800, height: 800 });
    expect(pos.left + 360).toBeLessThanOrEqual(800 - 8);
  });
});
