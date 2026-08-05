import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { SeverityCounts } from "@devdigest/shared";
import messages from "../../../../../../../../messages/en/prReview.json";
import { SeverityFilterBar } from "./SeverityFilterBar";

afterEach(cleanup);

const COUNTS: SeverityCounts = { CRITICAL: 2, WARNING: 1, SUGGESTION: 0 };

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ prReview: messages }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("SeverityFilterBar (smoke)", () => {
  it("renders one toggle chip per severity with its count", () => {
    renderWithIntl(<SeverityFilterBar counts={COUNTS} selected={[]} onChange={vi.fn()} />);
    expect(screen.getByText("Critical")).toBeInTheDocument();
    expect(screen.getByText("Warning")).toBeInTheDocument();
    expect(screen.getByText("Suggestion")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("marks selected severities as pressed", () => {
    renderWithIntl(<SeverityFilterBar counts={COUNTS} selected={["CRITICAL"]} onChange={vi.fn()} />);
    expect(screen.getByText("Critical").closest("button")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Warning").closest("button")).toHaveAttribute("aria-pressed", "false");
  });

  it("adds a severity to the selection on click", () => {
    const onChange = vi.fn();
    renderWithIntl(<SeverityFilterBar counts={COUNTS} selected={[]} onChange={onChange} />);
    fireEvent.click(screen.getByText("Warning"));
    expect(onChange).toHaveBeenCalledWith(["WARNING"]);
  });

  it("removes an already-selected severity on click", () => {
    const onChange = vi.fn();
    renderWithIntl(
      <SeverityFilterBar counts={COUNTS} selected={["CRITICAL", "WARNING"]} onChange={onChange} />,
    );
    fireEvent.click(screen.getByText("Critical"));
    expect(onChange).toHaveBeenCalledWith(["WARNING"]);
  });
});
