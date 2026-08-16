import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { PrFile, SmartDiff } from "@devdigest/shared";
import prReview from "../../../../../../../../messages/en/prReview.json";
import shell from "../../../../../../../../messages/en/shell.json";

const CORE_PATCH = `@@ -10,2 +10,3 @@
 context
+CORE_PATCH_MARKER
 still
`;

const BOILER_PATCH = `@@ -1,0 +1,1 @@
+BOILERPLATE_PATCH_MARKER
`;

const SMART_DIFF: SmartDiff = {
  groups: [
    {
      role: "core",
      files: [
        {
          path: "src/pay.ts",
          pseudocode_summary: null,
          additions: 500,
          deletions: 0,
          finding_lines: [11],
          findings: [
            {
              id: "f1",
              start_line: 11,
              end_line: 11,
              severity: "CRITICAL",
              title: "Hardcoded secret",
            },
          ],
        },
      ],
    },
    {
      role: "boilerplate",
      files: [
        {
          path: "package-lock.json",
          pseudocode_summary: null,
          additions: 1,
          deletions: 0,
          finding_lines: [1],
          findings: [
            {
              id: "f2",
              start_line: 1,
              end_line: 1,
              severity: "SUGGESTION",
              title: "lockfile churn",
            },
          ],
        },
      ],
    },
  ],
  split_suggestion: { too_big: true, total_lines: 501, proposed_splits: [] },
};

const FILES: PrFile[] = [
  { path: "src/pay.ts", additions: 500, deletions: 0, patch: CORE_PATCH },
  { path: "package-lock.json", additions: 1, deletions: 0, patch: BOILER_PATCH },
];

vi.mock("@/lib/hooks/smart-diff", () => ({
  useSmartDiff: () => ({ data: SMART_DIFF, isPending: false, isError: false }),
}));

import { SmartDiffViewer } from "./SmartDiffViewer";

afterEach(cleanup);

function renderViewer() {
  return render(
    <NextIntlClientProvider locale="en" messages={{ prReview, shell }}>
      <SmartDiffViewer prId="pr1" files={FILES} />
    </NextIntlClientProvider>,
  );
}

describe("SmartDiffViewer", () => {
  it("expands core files with findings, keeps boilerplate collapsed, and shows the findings badge", () => {
    renderViewer();

    expect(screen.getByText("Core")).toBeInTheDocument();
    expect(screen.getByText("Boilerplate")).toBeInTheDocument();
    expect(screen.getByText("CORE_PATCH_MARKER")).toBeInTheDocument();
    expect(screen.queryByText("BOILERPLATE_PATCH_MARKER")).not.toBeInTheDocument();
    expect(screen.getAllByText("1 finding").length).toBeGreaterThan(0);
    expect(
      screen.getByText("This PR is large (501 changed lines)"),
    ).toBeInTheDocument();
  });
});
