import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { SearchableSelect } from "./SearchableSelect";

afterEach(cleanup);

const OPTIONS = ["gpt-4.1", "claude-opus", "deepseek-v4"];

describe("SearchableSelect", () => {
  it("renders its trigger as a real, focusable button (keyboard-openable)", () => {
    render(<SearchableSelect value="gpt-4.1" options={OPTIONS} onChange={vi.fn()} />);
    const trigger = screen.getByRole("button", { name: "gpt-4.1" });
    expect(trigger).toHaveAttribute("aria-haspopup", "listbox");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("opens the option list on Enter (native button activation) and marks aria-expanded", () => {
    render(<SearchableSelect value="gpt-4.1" options={OPTIONS} onChange={vi.fn()} />);
    const trigger = screen.getByRole("button", { name: "gpt-4.1" });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("option", { name: "claude-opus" })).toBeInTheDocument();
  });

  it("picks an option and closes", () => {
    const onChange = vi.fn();
    render(<SearchableSelect value="gpt-4.1" options={OPTIONS} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "gpt-4.1" }));
    fireEvent.click(screen.getByRole("option", { name: "deepseek-v4" }));
    expect(onChange).toHaveBeenCalledWith("deepseek-v4");
  });

  it("accepts an explicit id for FormField's htmlFor association", () => {
    render(<SearchableSelect id="model-field" value="gpt-4.1" options={OPTIONS} onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "gpt-4.1" })).toHaveAttribute("id", "model-field");
  });
});
