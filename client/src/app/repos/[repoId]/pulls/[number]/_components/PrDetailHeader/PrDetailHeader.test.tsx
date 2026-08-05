import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { PrDetail } from "@/lib/types";
import messages from "../../../../../../../../messages/en/prReview.json";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
vi.mock("../../../../../../../lib/hooks/agents", () => ({
  useAgents: () => ({ data: [] }),
}));
vi.mock("../../../../../../../lib/hooks/reviews", () => ({
  useRunReview: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const openSpy = vi.fn();
vi.stubGlobal("open", openSpy);

import { PrDetailHeader } from "./PrDetailHeader";
import { GithubLinkProvider } from "../PrDetailView/GithubLinkContext";

afterEach(cleanup);

const PR: PrDetail = {
  id: "pr1",
  number: 42,
  title: "Add rate limiting",
  author: "alice",
  branch: "feature/rl",
  base: "main",
  head_sha: "abc123",
  additions: 12,
  deletions: 3,
  files_count: 2,
  status: "open",
  opened_at: null,
  updated_at: null,
  score: null,
  cost_usd: null,
  findings_by_severity: null,
  body: null,
  files: [],
  commits: [],
  linked_issue: null,
};

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ prReview: messages }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("PrDetailHeader (smoke)", () => {
  it("renders title, branch, and tabs", () => {
    renderWithIntl(
      <PrDetailHeader
        pr={PR}
        prId="pr1"
        tab="overview"
        findingsCount={0}
        onSetTab={vi.fn()}
        onRunStart={vi.fn()}
        onRunsStarted={vi.fn()}
      />,
    );
    expect(screen.getByText("Add rate limiting")).toBeInTheDocument();
    expect(screen.getByText("#42")).toBeInTheDocument();
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Files changed")).toBeInTheDocument();
  });

  it("disables the GitHub link when repoFullName isn't known yet", () => {
    renderWithIntl(
      <PrDetailHeader
        pr={PR}
        prId="pr1"
        tab="overview"
        findingsCount={0}
        onSetTab={vi.fn()}
        onRunStart={vi.fn()}
        onRunsStarted={vi.fn()}
      />,
    );
    expect(screen.getByText("View on GitHub").closest("button")).toBeDisabled();
  });

  it("opens the GitHub PR URL derived from the GithubLinkContext", () => {
    renderWithIntl(
      <GithubLinkProvider repoFullName="acme/payments-api" headSha="abc123">
        <PrDetailHeader
          pr={PR}
          prId="pr1"
          tab="overview"
          findingsCount={0}
          onSetTab={vi.fn()}
          onRunStart={vi.fn()}
          onRunsStarted={vi.fn()}
        />
      </GithubLinkProvider>,
    );
    const link = screen.getByText("View on GitHub").closest("button")!;
    expect(link).not.toBeDisabled();
    fireEvent.click(link);
    expect(openSpy).toHaveBeenCalledWith(
      "https://github.com/acme/payments-api/pull/42",
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("calls onSetTab when a tab is clicked", () => {
    const onSetTab = vi.fn();
    renderWithIntl(
      <PrDetailHeader
        pr={PR}
        prId="pr1"
        tab="overview"
        findingsCount={3}
        onSetTab={onSetTab}
        onRunStart={vi.fn()}
        onRunsStarted={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("Agent runs"));
    expect(onSetTab).toHaveBeenCalledWith("findings");
  });

  it("shows a stale-PR banner for merged/closed PRs", () => {
    renderWithIntl(
      <PrDetailHeader
        pr={{ ...PR, status: "merged" }}
        prId="pr1"
        tab="overview"
        findingsCount={0}
        onSetTab={vi.fn()}
        onRunStart={vi.fn()}
        onRunsStarted={vi.fn()}
      />,
    );
    expect(screen.getByText(/already merged/)).toBeInTheDocument();
  });
});
