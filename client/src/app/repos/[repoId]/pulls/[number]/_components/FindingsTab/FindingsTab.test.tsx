import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { FindingRecord, ReviewRecord } from "@devdigest/shared";
import type { useCancelRun } from "@/lib/hooks/reviews";
import messages from "../../../../../../../../messages/en/prReview.json";

vi.mock("../../../../../../../lib/hooks/reviews", () => ({
  useDeleteReview: () => ({ mutate: vi.fn(), isPending: false }),
  useFindingAction: () => ({ mutate: vi.fn(), isPending: false }),
  useRunEvents: () => ({ events: [], running: false }),
}));

import { FindingsTab } from "./FindingsTab";

afterEach(cleanup);

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ prReview: messages }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

const REVIEW: ReviewRecord = {
  id: "r1",
  pr_id: "pr1",
  agent_id: "a1",
  run_id: "run1",
  agent_name: "Security",
  kind: "review",
  verdict: "approve",
  summary: "Looks good.",
  score: 90,
  model: "gpt-4.1",
  grounding: null,
  created_at: "2026-08-01T00:00:00Z",
  findings: [],
};

const cancelMutation = {
  mutate: vi.fn(),
  isPending: false,
} as unknown as ReturnType<typeof useCancelRun>;

describe("FindingsTab (smoke)", () => {
  it("shows the empty state when there are no runs yet", () => {
    renderWithIntl(
      <FindingsTab
        prId="pr1"
        liveRun={{ ids: [], running: false }}
        lethalTrifecta={[]}
        runs={[]}
        prRuns={[]}
        prCommits={[]}
        cancelMutation={cancelMutation}
        onOpenTrace={vi.fn()}
        onDelete={vi.fn()}
        onRunDone={vi.fn()}
      />,
    );
    expect(screen.getByText("No findings yet")).toBeInTheDocument();
  });

  it("renders one ReviewRunAccordion per run", () => {
    renderWithIntl(
      <FindingsTab
        prId="pr1"
        liveRun={{ ids: [], running: false }}
        lethalTrifecta={[]}
        runs={[REVIEW]}
        prRuns={[]}
        prCommits={[]}
        cancelMutation={cancelMutation}
        onOpenTrace={vi.fn()}
        onDelete={vi.fn()}
        onRunDone={vi.fn()}
      />,
    );
    expect(screen.getAllByText("Security").length).toBeGreaterThan(0);
  });

  it("shows a live-review banner and a cancel action while a run is in progress", () => {
    renderWithIntl(
      <FindingsTab
        prId="pr1"
        liveRun={{ ids: ["run1"], running: true }}
        lethalTrifecta={[]}
        runs={[]}
        prRuns={[]}
        prCommits={[]}
        cancelMutation={cancelMutation}
        onOpenTrace={vi.fn()}
        onDelete={vi.fn()}
        onRunDone={vi.fn()}
      />,
    );
    expect(screen.getByText("Review in progress…")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Cancel"));
    expect(cancelMutation.mutate).toHaveBeenCalledWith("run1");
  });

  it("surfaces a lethal-trifecta warning banner", () => {
    renderWithIntl(
      <FindingsTab
        prId="pr1"
        liveRun={{ ids: [], running: false }}
        lethalTrifecta={[{} as unknown as FindingRecord]}
        runs={[]}
        prRuns={[]}
        prCommits={[]}
        cancelMutation={cancelMutation}
        onOpenTrace={vi.fn()}
        onDelete={vi.fn()}
        onRunDone={vi.fn()}
      />,
    );
    expect(screen.getByText("Lethal Trifecta detected")).toBeInTheDocument();
  });
});
