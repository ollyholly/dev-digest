import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { Skill } from "@devdigest/shared";
import messages from "../../../../../messages/en/skills.json";

vi.mock("../../../../lib/hooks/skills", () => ({
  useDeleteSkill: () => ({ mutate: vi.fn(), isPending: false }),
}));

import { SkillCard } from "./SkillCard";

afterEach(cleanup);

const SKILL: Skill = {
  id: "sk1",
  name: "pr-quality-rubric",
  description: "Rubric for evaluating overall PR quality",
  type: "rubric",
  source: "manual",
  body: "# PR Quality Rubric",
  enabled: true,
  version: 5,
};

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ skills: messages }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("SkillCard (smoke)", () => {
  it("renders the skill name, type badge, and source badge", () => {
    renderWithIntl(<SkillCard skill={SKILL} />);
    expect(screen.getByText("pr-quality-rubric")).toBeInTheDocument();
    expect(screen.getByText("rubric")).toBeInTheDocument();
    expect(screen.getByText("Manual")).toBeInTheDocument();
  });

  it("falls back to a placeholder when description is empty", () => {
    renderWithIntl(<SkillCard skill={{ ...SKILL, description: "" }} />);
    expect(screen.getByText("No description")).toBeInTheDocument();
  });

  it("flags an untrusted, not-yet-enabled imported skill as needing vetting", () => {
    renderWithIntl(<SkillCard skill={{ ...SKILL, source: "imported_url", enabled: false }} />);
    expect(screen.getByText(/needs vetting/)).toBeInTheDocument();
  });

  it("does NOT flag a disabled MANUAL skill as needing vetting", () => {
    renderWithIntl(<SkillCard skill={{ ...SKILL, enabled: false }} />);
    expect(screen.queryByText(/needs vetting/)).not.toBeInTheDocument();
  });

  it("does NOT flag an imported skill that has already been enabled", () => {
    renderWithIntl(<SkillCard skill={{ ...SKILL, source: "community", enabled: true }} />);
    expect(screen.queryByText(/needs vetting/)).not.toBeInTheDocument();
  });

  it("is keyboard-openable (role=button, Enter/Space activate onClick)", () => {
    const onClick = vi.fn();
    renderWithIntl(<SkillCard skill={SKILL} onClick={onClick} />);
    const card = screen.getByText("pr-quality-rubric").closest('[role="button"]')!;
    fireEvent.keyDown(card, { key: "Enter" });
    expect(onClick).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(card, { key: " " });
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("gives the enable/disable toggle an accessible name derived from the skill", () => {
    renderWithIntl(<SkillCard skill={SKILL} onToggle={vi.fn()} />);
    expect(screen.getByRole("switch", { name: 'Disable skill "pr-quality-rubric"' })).toBeInTheDocument();
  });
});
