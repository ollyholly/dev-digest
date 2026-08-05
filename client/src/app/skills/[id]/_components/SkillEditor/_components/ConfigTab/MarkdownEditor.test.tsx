import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MarkdownEditor } from "./MarkdownEditor";

afterEach(cleanup);

describe("MarkdownEditor (smoke)", () => {
  it("renders the textarea with the given value", () => {
    render(<MarkdownEditor value="# Title" onChange={vi.fn()} rows={10} />);
    expect(screen.getByDisplayValue("# Title")).toBeInTheDocument();
  });

  it("calls onChange when the textarea is edited", () => {
    const onChange = vi.fn();
    render(<MarkdownEditor value="# Title" onChange={onChange} rows={10} />);
    fireEvent.change(screen.getByDisplayValue("# Title"), { target: { value: "# Changed" } });
    expect(onChange).toHaveBeenCalledWith("# Changed");
  });

  it("renders a highlight overlay that visually duplicates heading/list text (hidden from a11y tree)", () => {
    const { container } = render(
      <MarkdownEditor value={"# Heading\n- item one"} onChange={vi.fn()} rows={10} />,
    );
    const overlay = container.querySelector('[aria-hidden="true"]');
    expect(overlay).toBeTruthy();
    expect(overlay?.textContent).toContain("Heading");
    expect(overlay?.textContent).toContain("item one");
  });
});
