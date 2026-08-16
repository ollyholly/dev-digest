import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { PrFile, SmartDiff } from "@devdigest/shared";
import prReview from "../../../../../../../../messages/en/prReview.json";
import shell from "../../../../../../../../messages/en/shell.json";

const CORE_PATCH = `@@ -10,2 +10,3 @@
 context
+CORE_PATCH_MARKER
 still
`;

const ORIG_PATCH = `@@ -1,0 +1,1 @@
+ORIG_FIRST_MARKER
`;

const SMART_DIFF: SmartDiff = {
  groups: [
    {
      role: "core",
      files: [
        {
          path: "src/pay.ts",
          pseudocode_summary: null,
          additions: 1,
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
          finding_lines: [],
          findings: [],
        },
      ],
    },
  ],
  split_suggestion: { too_big: false, total_lines: 2, proposed_splits: [] },
};

const FILES: PrFile[] = [
  { path: "z-original-first.ts", additions: 1, deletions: 0, patch: ORIG_PATCH },
  { path: "src/pay.ts", additions: 1, deletions: 0, patch: CORE_PATCH },
];

vi.mock("@/lib/hooks/reviews", () => ({
  usePrComments: () => ({ data: [] }),
  useCreatePrComment: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("@/lib/hooks/smart-diff", () => ({
  useSmartDiff: () => ({ data: SMART_DIFF, isPending: false, isError: false }),
}));

import { DiffTab } from "./DiffTab";

afterEach(cleanup);

function renderTab() {
  return render(
    <NextIntlClientProvider locale="en" messages={{ prReview, shell }}>
      <DiffTab prId="pr1" filesCount={2} files={FILES} />
    </NextIntlClientProvider>,
  );
}

describe("DiffTab", () => {
  it("defaults to Smart order and toggles to Original order (ungrouped files)", () => {
    renderTab();

    const smart = screen.getByRole("button", { name: "Smart order" });
    const original = screen.getByRole("button", { name: "Original order" });
    expect(smart).toHaveAttribute("aria-pressed", "true");
    expect(original).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("Core")).toBeInTheDocument();
    expect(screen.getByText("src/pay.ts")).toBeInTheDocument();

    fireEvent.click(original);
    expect(original).toHaveAttribute("aria-pressed", "true");
    expect(smart).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByText("Core")).not.toBeInTheDocument();
    expect(screen.getByText("z-original-first.ts")).toBeInTheDocument();
    expect(screen.getByText("ORIG_FIRST_MARKER")).toBeInTheDocument();
  });
});
