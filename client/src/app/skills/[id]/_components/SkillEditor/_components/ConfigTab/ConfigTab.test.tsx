import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { Skill } from "@devdigest/shared";
import messages from "../../../../../../../../messages/en/skills.json";

const updateMock = vi.fn();
vi.mock("@/lib/hooks/skills", () => ({
  useUpdateSkill: () => ({ mutate: updateMock, isPending: false, isSuccess: false, data: undefined }),
}));

import { ConfigTab } from "./ConfigTab";

afterEach(() => {
  cleanup();
  updateMock.mockClear();
});

const SKILL: Skill = {
  id: "sk1",
  name: "PR Quality Rubric",
  description: "Evaluates overall PR quality",
  type: "rubric",
  source: "manual",
  body: "# PR Quality Rubric\nSome rules.",
  enabled: true,
  version: 3,
};

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ skills: messages }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("Skill ConfigTab (smoke)", () => {
  it("renders the form fields seeded from the skill", () => {
    renderWithIntl(<ConfigTab skill={SKILL} />);
    expect(screen.getByDisplayValue("PR Quality Rubric")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Evaluates overall PR quality")).toBeInTheDocument();
    expect(screen.getByDisplayValue(/# PR Quality Rubric/)).toBeInTheDocument();
  });

  it("shows the kebab-cased filename derived from the name", () => {
    renderWithIntl(<ConfigTab skill={SKILL} />);
    expect(screen.getByText("pr-quality-rubric.md")).toBeInTheDocument();
  });

  it("shows no 'unsaved' badge until the body is edited", () => {
    renderWithIntl(<ConfigTab skill={SKILL} />);
    expect(screen.queryByText("unsaved")).not.toBeInTheDocument();
  });

  it("shows an 'unsaved' badge once the body diverges from the saved value", () => {
    renderWithIntl(<ConfigTab skill={SKILL} />);
    const textarea = screen.getByDisplayValue(/# PR Quality Rubric/);
    fireEvent.change(textarea, { target: { value: "# Changed" } });
    expect(screen.getByText("unsaved")).toBeInTheDocument();
  });

  it("shows a rough token estimate for the current body", () => {
    renderWithIntl(<ConfigTab skill={SKILL} />);
    // "# PR Quality Rubric\nSome rules." is 32 chars -> ceil(32/4) = 8 tokens
    expect(screen.getByText("8 tokens")).toBeInTheDocument();
  });

  it("save button calls useUpdateSkill with the edited fields", () => {
    renderWithIntl(<ConfigTab skill={SKILL} />);
    fireEvent.change(screen.getByDisplayValue("PR Quality Rubric"), { target: { value: "Renamed Rubric" } });
    fireEvent.click(screen.getByText("Save"));
    expect(updateMock).toHaveBeenCalledWith({
      id: "sk1",
      patch: {
        name: "Renamed Rubric",
        description: "Evaluates overall PR quality",
        type: "rubric",
        body: "# PR Quality Rubric\nSome rules.",
        enabled: true,
      },
    });
  });
});
