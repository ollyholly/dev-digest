import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReviewRecord } from "@devdigest/shared";
import messages from "../../../../../../../../messages/en/prReview.json";

vi.mock("../../../../../../../lib/hooks/reviews", () => ({
  useDeleteReview: () => ({ mutate: vi.fn(), isPending: false }),
  useFindingAction: () => ({ mutate: vi.fn(), isPending: false }),
}));

import { ReviewRunAccordion } from "./ReviewRunAccordion";

afterEach(cleanup);

const REVIEW: ReviewRecord = {
  id: "r1",
  pr_id: "pr1",
  agent_id: "a1",
  run_id: "run1",
  agent_name: "Security",
  kind: "review",
  verdict: "request_changes",
  summary: "Found a hardcoded secret.",
  score: 42,
  model: "gpt-4.1",
  grounding: null,
  created_at: "2026-08-01T00:00:00Z",
  findings: [
    {
      id: "f1",
      severity: "CRITICAL",
      category: "security",
      title: "Hardcoded Stripe secret key",
      file: "src/config.ts",
      start_line: 11,
      end_line: 11,
      rationale: "A live Stripe key is committed in source.",
      suggestion: null,
      confidence: 0.95,
      kind: "finding",
      trifecta_components: null,
      evidence: null,
      review_id: "r1",
      accepted_at: null,
      dismissed_at: null,
    },
  ],
};

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ prReview: messages }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("ReviewRunAccordion (smoke)", () => {
  it("renders the collapsed header with agent, verdict, and score", () => {
    renderWithIntl(<ReviewRunAccordion review={REVIEW} prId="pr1" />);
    expect(screen.getByText("Security")).toBeInTheDocument();
    expect(screen.getByText("request changes")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.queryByText("Found a hardcoded secret.")).not.toBeInTheDocument();
  });

  it("expands to show the verdict banner and findings on click", () => {
    renderWithIntl(<ReviewRunAccordion review={REVIEW} prId="pr1" />);
    fireEvent.click(screen.getByText("Security"));
    expect(screen.getByText("Hardcoded Stripe secret key")).toBeInTheDocument();
  });

  it("is expanded by default when defaultOpen is set", () => {
    renderWithIntl(<ReviewRunAccordion review={REVIEW} prId="pr1" defaultOpen />);
    expect(screen.getByText("Hardcoded Stripe secret key")).toBeInTheDocument();
  });

  it("opens and scrolls into view when it matches scrollTarget", () => {
    const scrollIntoView = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
    renderWithIntl(
      <ReviewRunAccordion
        review={REVIEW}
        prId="pr1"
        scrollTarget={{ runId: "run1", nonce: 1 }}
      />,
    );
    expect(screen.getByText("Hardcoded Stripe secret key")).toBeInTheDocument();
    expect(scrollIntoView).toHaveBeenCalled();
  });
});
