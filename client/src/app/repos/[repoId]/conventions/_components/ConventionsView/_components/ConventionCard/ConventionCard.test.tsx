import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ConventionCandidate } from "@devdigest/shared";
import messages from "../../../../../../../../../messages/en/conventions.json";

const mocks = vi.hoisted(() => ({ mutate: vi.fn() }));

vi.mock("@/lib/hooks/conventions", () => ({
  useUpdateConvention: () => ({
    mutate: mocks.mutate,
    isPending: false,
    isError: false,
  }),
}));

import { ConventionCard } from "./ConventionCard";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const CANDIDATE: ConventionCandidate = {
  id: "convention-1",
  repo_id: "repo-1",
  category: "error-handling",
  rule: "Return typed errors from service boundaries.",
  evidence_path: "src/services/payments.ts",
  evidence_snippet: "return new PaymentError(message);",
  evidence_start_line: 41,
  evidence_end_line: 41,
  confidence: 0.92,
  status: "pending",
  accepted: false,
  scanned_sha: "abc123",
  fingerprint: "fingerprint",
  created_at: "2026-08-05T10:00:00.000Z",
};

function renderCard(candidate: ConventionCandidate = CANDIDATE) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ conventions: messages }}>
      <ConventionCard
        candidate={candidate}
        repoId="repo-1"
        repoName="acme/payments-api"
        defaultBranch="main"
      />
    </NextIntlClientProvider>,
  );
}

describe("ConventionCard", () => {
  it("accepts and rejects a pending convention", () => {
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    expect(mocks.mutate).toHaveBeenLastCalledWith({
      id: "convention-1",
      patch: { status: "accepted" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Reject" }));
    expect(mocks.mutate).toHaveBeenLastCalledWith({
      id: "convention-1",
      patch: { status: "rejected" },
    });
  });

  it("undoes an accepted or rejected selection back to pending", () => {
    renderCard({ ...CANDIDATE, status: "accepted", accepted: true });
    fireEvent.click(screen.getByRole("button", { name: "Accepted" }));
    expect(mocks.mutate).toHaveBeenLastCalledWith({
      id: "convention-1",
      patch: { status: "pending" },
    });

    cleanup();
    renderCard({ ...CANDIDATE, status: "rejected", accepted: false });
    fireEvent.click(screen.getByRole("button", { name: "Rejected" }));
    expect(mocks.mutate).toHaveBeenLastCalledWith({
      id: "convention-1",
      patch: { status: "pending" },
    });
  });

  it("links evidence to the scanned commit", () => {
    renderCard();

    expect(
      screen.getByRole("link", {
        name: "Open src/services/payments.ts, lines 41, on GitHub",
      }),
    ).toHaveAttribute(
      "href",
      "https://github.com/acme/payments-api/blob/abc123/src/services/payments.ts#L41",
    );
  });
});
