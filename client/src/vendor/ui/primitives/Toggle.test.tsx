import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { Toggle } from "./Toggle";

afterEach(cleanup);

describe("Toggle", () => {
  it("exposes role=switch + aria-checked reflecting `on`", () => {
    render(<Toggle on={false} onChange={vi.fn()} />);
    const el = screen.getByRole("switch");
    expect(el).toHaveAttribute("aria-checked", "false");
  });

  it("takes an aria-label so a bare switch (no surrounding <label> text) still has an accessible name", () => {
    render(<Toggle on onChange={vi.fn()} aria-label="Enable repo intel" />);
    expect(screen.getByRole("switch", { name: "Enable repo intel" })).toBeInTheDocument();
  });

  it("calls onChange with the flipped value on click", () => {
    const onChange = vi.fn();
    render(<Toggle on={false} onChange={onChange} aria-label="Enabled" />);
    fireEvent.click(screen.getByRole("switch"));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
