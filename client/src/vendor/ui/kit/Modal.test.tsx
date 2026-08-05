import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { Modal } from "./Modal";

afterEach(cleanup);

describe("Modal", () => {
  it("labels the dialog via aria-labelledby pointing at the title", async () => {
    render(<Modal title="Create agent" onClose={vi.fn()}>body</Modal>);
    const dialog = screen.getByRole("dialog");
    const labelledBy = dialog.getAttribute("aria-labelledby");
    expect(labelledBy).toBeTruthy();
    expect(document.getElementById(labelledBy!)).toHaveTextContent("Create agent");
  });

  it("moves focus into the dialog (its first focusable descendant) on open", async () => {
    render(
      <Modal title="Create agent" onClose={vi.fn()}>
        <button>First field</button>
      </Modal>,
    );
    const dialog = screen.getByRole("dialog");
    await waitFor(() => {
      expect(dialog.contains(document.activeElement)).toBe(true);
      expect(document.activeElement).not.toBe(document.body);
    });
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    render(<Modal title="Create agent" onClose={onClose}>body</Modal>);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("restores focus to the previously-focused element on close", async () => {
    const opener = document.createElement("button");
    opener.textContent = "Open";
    document.body.appendChild(opener);
    opener.focus();
    expect(document.activeElement).toBe(opener);

    const { unmount } = render(
      <Modal title="Create agent" onClose={vi.fn()}>
        <button>First field</button>
      </Modal>,
    );
    const dialog = screen.getByRole("dialog");
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));

    unmount();
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
});
