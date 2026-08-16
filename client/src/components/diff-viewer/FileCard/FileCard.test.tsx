import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { SmartDiffFinding } from "@devdigest/shared";
import shell from "../../../../messages/en/shell.json";
import { FileCard } from "./FileCard";

afterEach(cleanup);

const PATCH = `@@ -10,2 +10,3 @@
 context
+SECRET_LINE
 still
`;

const FINDINGS: SmartDiffFinding[] = [
  { id: "f1", start_line: 11, end_line: 11, severity: "CRITICAL", title: "Hardcoded secret" },
];

function renderCard() {
  return render(
    <NextIntlClientProvider locale="en" messages={{ shell }}>
      <FileCard
        file={{ path: "src/pay.ts", additions: 1, deletions: 0, patch: PATCH }}
        findings={FINDINGS}
        defaultOpen={false}
      />
    </NextIntlClientProvider>,
  );
}

describe("FileCard", () => {
  it("expands and exposes data-diff-line when the findings badge is clicked", () => {
    Element.prototype.scrollIntoView = vi.fn();
    renderCard();

    expect(screen.queryByText("SECRET_LINE")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "1 finding" }));

    expect(screen.getByText("SECRET_LINE")).toBeInTheDocument();
    expect(document.querySelector('[data-diff-line="src/pay.ts:11"]')).toBeTruthy();
  });
});
