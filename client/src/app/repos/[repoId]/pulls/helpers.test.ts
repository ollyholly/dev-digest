import { describe, it, expect } from "vitest";
import type { PrMeta } from "./constants";
import { clientFilterSort, uniqueAuthors } from "./helpers";

function pr(partial: Partial<PrMeta> & { number: number; author: string }): PrMeta {
  return {
    title: "t",
    branch: "b",
    base: "main",
    head_sha: "abc",
    additions: 1,
    deletions: 1,
    files_count: 1,
    status: "needs_review",
    score: null,
    cost_usd: null,
    ...partial,
  };
}

describe("uniqueAuthors", () => {
  it("dedupes preserving first-seen order", () => {
    expect(
      uniqueAuthors([
        pr({ number: 1, author: "a" }),
        pr({ number: 2, author: "b" }),
        pr({ number: 3, author: "a" }),
      ]),
    ).toEqual(["a", "b"]);
  });
});

describe("clientFilterSort", () => {
  it("keeps case-sensitive author match", () => {
    const rows = [pr({ number: 1, author: "Ada" }), pr({ number: 2, author: "ada" })];
    expect(
      clientFilterSort(rows, { author: "ada", status: "all", query: "", sort: "newest" }).map(
        (p) => p.number,
      ),
    ).toEqual([2]);
  });
});
