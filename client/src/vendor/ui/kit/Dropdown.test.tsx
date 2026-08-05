import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { Dropdown } from "./Dropdown";

afterEach(cleanup);

describe("Dropdown", () => {
  it("wires aria-haspopup/aria-expanded onto the trigger, not just the wrapper", () => {
    render(<Dropdown trigger={<button>Add agent</button>} items={[{ label: "Create from scratch" }]} />);
    const trigger = screen.getByText("Add agent");
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("opens on click, exposing a role=menu with role=menuitem entries", () => {
    render(
      <Dropdown
        trigger={<button>Add agent</button>}
        items={[{ label: "Create from scratch" }, { divider: true }, { label: "From template" }]}
      />,
    );
    fireEvent.click(screen.getByText("Add agent"));
    expect(screen.getByText("Add agent")).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Create from scratch" })).toBeInTheDocument();
  });

  it("closes on Escape", () => {
    render(<Dropdown trigger={<button>Add agent</button>} items={[{ label: "Create from scratch" }]} />);
    fireEvent.click(screen.getByText("Add agent"));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("fires the item's onClick and closes the menu", () => {
    const onClick = vi.fn();
    render(<Dropdown trigger={<button>Add agent</button>} items={[{ label: "Create from scratch", onClick }]} />);
    fireEvent.click(screen.getByText("Add agent"));
    fireEvent.click(screen.getByRole("menuitem", { name: "Create from scratch" }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
