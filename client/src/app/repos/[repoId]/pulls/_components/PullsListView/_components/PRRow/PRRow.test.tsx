import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { PrMeta } from "@/lib/types";
import messages from "../../../../../../../../../messages/en/prReview.json";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

import { PRRow } from "./PRRow";

afterEach(cleanup);

const PR: PrMeta = {
  id: "pr1",
  number: 42,
  title: "Add rate limiting to the webhook endpoint",
  author: "alice",
  branch: "feature/rate-limit",
  base: "main",
  head_sha: "abc123",
  additions: 40,
  deletions: 5,
  files_count: 3,
  status: "open",
  opened_at: "2026-08-01T00:00:00Z",
  updated_at: "2026-08-02T00:00:00Z",
  score: null,
  cost_usd: null,
  findings_by_severity: null,
};

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ prReview: messages }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("PRRow (smoke)", () => {
  it("renders title, number, author, and status", () => {
    renderWithIntl(<PRRow pr={PR} repoId="repo1" />);
    expect(screen.getByText("Add rate limiting to the webhook endpoint")).toBeInTheDocument();
    expect(screen.getByText("#42")).toBeInTheDocument();
    expect(screen.getByText("alice")).toBeInTheDocument();
    expect(screen.getByText("Open")).toBeInTheDocument();
    // never reviewed -> score + findings cells both show the em dash placeholder
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(2);
  });

  it("navigates to the PR detail page on click", () => {
    renderWithIntl(<PRRow pr={PR} repoId="repo1" />);
    fireEvent.click(screen.getByText("Add rate limiting to the webhook endpoint"));
    expect(push).toHaveBeenCalledWith("/repos/repo1/pulls/42");
  });

  it("renders a circular score once the PR has been reviewed", () => {
    renderWithIntl(<PRRow pr={{ ...PR, score: 87 }} repoId="repo1" />);
    expect(screen.getByText("87")).toBeInTheDocument();
  });
});
