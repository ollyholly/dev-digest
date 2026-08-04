import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../../../../../../../messages/en/prReview.json";
import { FilterBar } from "./FilterBar";

afterEach(cleanup);

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ prReview: messages }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("FilterBar (smoke)", () => {
  it("renders a search box with an accessible name and the status chips", () => {
    renderWithIntl(
      <FilterBar
        statusFilter={{ active: "all", onChange: vi.fn() }}
        search={{ query: "", onChange: vi.fn() }}
        sort={{ value: "newest", onChange: vi.fn() }}
        refresh={{ onClick: vi.fn(), pending: false }}
      />,
    );
    expect(screen.getByRole("textbox", { name: "Filter pull requests…" })).toBeInTheDocument();
    expect(screen.getByText("All")).toBeInTheDocument();
    expect(screen.getByText("Needs review")).toBeInTheDocument();
    expect(screen.getByText("Refresh")).toBeInTheDocument();
  });

  it("marks the active status chip as pressed for assistive tech", () => {
    renderWithIntl(
      <FilterBar
        statusFilter={{ active: "stale", onChange: vi.fn() }}
        search={{ query: "", onChange: vi.fn() }}
        sort={{ value: "newest", onChange: vi.fn() }}
        refresh={{ onClick: vi.fn(), pending: false }}
      />,
    );
    expect(screen.getByText("Stale").closest("button")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("All").closest("button")).toHaveAttribute("aria-pressed", "false");
  });

  it("fires onChange callbacks for search, status, and sort", () => {
    const onSearch = vi.fn();
    const onStatus = vi.fn();
    renderWithIntl(
      <FilterBar
        statusFilter={{ active: "all", onChange: onStatus }}
        search={{ query: "", onChange: onSearch }}
        sort={{ value: "newest", onChange: vi.fn() }}
        refresh={{ onClick: vi.fn(), pending: false }}
      />,
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Filter pull requests…" }), {
      target: { value: "auth" },
    });
    expect(onSearch).toHaveBeenCalledWith("auth");

    fireEvent.click(screen.getByText("Reviewed"));
    expect(onStatus).toHaveBeenCalledWith("reviewed");
  });

  it("disables the refresh button and shows the refreshing label while pending", () => {
    renderWithIntl(
      <FilterBar
        statusFilter={{ active: "all", onChange: vi.fn() }}
        search={{ query: "", onChange: vi.fn() }}
        sort={{ value: "newest", onChange: vi.fn() }}
        refresh={{ onClick: vi.fn(), pending: true }}
      />,
    );
    expect(screen.getByText("Refreshing…").closest("button")).toBeDisabled();
  });
});
