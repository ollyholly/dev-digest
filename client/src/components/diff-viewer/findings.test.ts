import { describe, it, expect } from "vitest";
import type { SmartDiffFinding } from "@devdigest/shared";
import { findingsCoveringLine, worstCoveringSeverity } from "./findings";

const findings: SmartDiffFinding[] = [
  { id: "c", start_line: 10, end_line: 12, severity: "CRITICAL", title: "secret" },
  { id: "w", start_line: 12, end_line: 14, severity: "WARNING", title: "n+1" },
  { id: "s", start_line: 20, end_line: 20, severity: "SUGGESTION", title: "rename" },
];

describe("findingsCoveringLine", () => {
  it("returns findings whose inclusive range covers the new-side line", () => {
    expect(findingsCoveringLine(findings, 10).map((f) => f.id)).toEqual(["c"]);
    expect(findingsCoveringLine(findings, 12).map((f) => f.id)).toEqual(["c", "w"]);
    expect(findingsCoveringLine(findings, 15)).toEqual([]);
  });
});

describe("worstCoveringSeverity", () => {
  it("picks CRITICAL over WARNING when both cover the line (row tint)", () => {
    const covering = findingsCoveringLine(findings, 12);
    expect(worstCoveringSeverity(covering)).toBe("CRITICAL");
    expect(worstCoveringSeverity([])).toBeNull();
  });
});
