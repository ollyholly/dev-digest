import { describe, it, expect } from "vitest";
import type { FindingRecord } from "@devdigest/shared";
import {
  countBySeverity,
  parseSeverityParam,
  serializeSeverityParam,
  visibleFindings,
  confidenceFiltered,
} from "./helpers";

function f(
  partial: Partial<FindingRecord> & {
    id: string;
    severity: FindingRecord["severity"];
    confidence?: number;
  },
): FindingRecord {
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
    confidence: partial.confidence ?? 0.9,
    kind: "finding",
    ...partial,
  };
}

describe("parseSeverityParam", () => {
  it("parses comma list and ignores unknown tokens", () => {
    expect(parseSeverityParam("CRITICAL,WEIRD,WARNING")).toEqual(["CRITICAL", "WARNING"]);
  });
  it("returns empty for null/empty", () => {
    expect(parseSeverityParam(null)).toEqual([]);
    expect(parseSeverityParam("")).toEqual([]);
  });
});

describe("serializeSeverityParam", () => {
  it("joins or returns null", () => {
    expect(serializeSeverityParam(["CRITICAL", "WARNING"])).toBe("CRITICAL,WARNING");
    expect(serializeSeverityParam([])).toBeNull();
  });
});

describe("countBySeverity", () => {
  it("includes dismissed findings", () => {
    expect(
      countBySeverity([
        f({ id: "1", severity: "CRITICAL", dismissed_at: "2020-01-01" }),
        f({ id: "2", severity: "WARNING" }),
        f({ id: "3", severity: "SUGGESTION" }),
      ]),
    ).toEqual({ CRITICAL: 1, WARNING: 1, SUGGESTION: 1 });
  });
});

describe("visibleFindings filter order", () => {
  const rows = [
    f({ id: "c-low", severity: "CRITICAL", confidence: 0.4 }),
    f({ id: "c", severity: "CRITICAL", confidence: 0.9 }),
    f({ id: "w", severity: "WARNING", confidence: 0.9 }),
    f({ id: "s", severity: "SUGGESTION", confidence: 0.9 }),
  ];

  it("applies confidence before severity selection", () => {
    const shown = visibleFindings(rows, true, ["CRITICAL"]);
    expect(shown.map((x) => x.id)).toEqual(["c"]);
  });

  it("chip counts match confidence-filtered list, not severity selection", () => {
    const conf = confidenceFiltered(rows, true);
    expect(countBySeverity(conf)).toEqual({ CRITICAL: 1, WARNING: 1, SUGGESTION: 1 });
    // Selecting CRITICAL does not change the count input:
    expect(countBySeverity(conf).CRITICAL).toBe(
      visibleFindings(rows, true, ["CRITICAL"]).length,
    );
  });
});
