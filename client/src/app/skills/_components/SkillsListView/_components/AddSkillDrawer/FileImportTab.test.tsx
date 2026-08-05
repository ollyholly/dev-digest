import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../../../../../messages/en/skills.json";

const mutateAsyncMock = vi.fn();
vi.mock("../../../../../../lib/hooks/skills", () => ({
  useCreateSkill: () => ({ mutateAsync: mutateAsyncMock, isPending: false }),
}));

import { FileImportTab } from "./FileImportTab";

afterEach(() => {
  cleanup();
  mutateAsyncMock.mockReset();
});

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ skills: messages }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("FileImportTab (smoke)", () => {
  it("disables Import until a body is entered", () => {
    renderWithIntl(<FileImportTab onImported={vi.fn()} />);
    expect(screen.getByText("Import skill").closest("button")).toBeDisabled();
  });

  it("submits the pasted name + body via useCreateSkill and calls onImported", async () => {
    mutateAsyncMock.mockResolvedValue({ id: "sk1", name: "my-skill" });
    const onImported = vi.fn();
    renderWithIntl(<FileImportTab onImported={onImported} />);

    fireEvent.change(screen.getByPlaceholderText("pr-quality-rubric"), { target: { value: "my-skill" } });
    fireEvent.change(screen.getByPlaceholderText(/Describe the rule/), { target: { value: "# Rule\nBody." } });
    fireEvent.click(screen.getByText("Import skill"));

    await vi.waitFor(() => expect(onImported).toHaveBeenCalled());
    expect(mutateAsyncMock).toHaveBeenCalledWith({ name: "my-skill", type: "custom", body: "# Rule\nBody." });
  });

  it("omits the name when left blank so the server can derive it from the heading", async () => {
    mutateAsyncMock.mockResolvedValue({ id: "sk1", name: "Derived" });
    renderWithIntl(<FileImportTab onImported={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText(/Describe the rule/), { target: { value: "# Derived\nBody." } });
    fireEvent.click(screen.getByText("Import skill"));

    await vi.waitFor(() => expect(mutateAsyncMock).toHaveBeenCalled());
    expect(mutateAsyncMock).toHaveBeenCalledWith({ name: undefined, type: "custom", body: "# Derived\nBody." });
  });

  it("shows an error note when the import fails", async () => {
    mutateAsyncMock.mockRejectedValue(new Error("boom"));
    renderWithIntl(<FileImportTab onImported={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText(/Describe the rule/), { target: { value: "# X\nY." } });
    fireEvent.click(screen.getByText("Import skill"));

    expect(await screen.findByText("Import failed")).toBeInTheDocument();
  });
});
