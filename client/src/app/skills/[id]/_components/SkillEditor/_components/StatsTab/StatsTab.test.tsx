import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { Skill } from "@devdigest/shared";
import messages from "../../../../../../../../messages/en/skills.json";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));

let useSkillAgentsMock: () => { data: { id: string; name: string }[] | undefined; isLoading: boolean };
vi.mock("@/lib/hooks/skills", () => ({
  useSkillAgents: () => useSkillAgentsMock(),
}));

import { StatsTab } from "./StatsTab";

afterEach(() => {
  cleanup();
  pushMock.mockClear();
});

const SKILL: Skill = {
  id: "sk1",
  name: "pr-quality-rubric",
  description: "",
  type: "rubric",
  source: "manual",
  body: "# Rubric",
  enabled: true,
  version: 1,
};

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ skills: messages }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("Skill StatsTab (smoke)", () => {
  it("shows a real 'Used by' count from the agents list", () => {
    useSkillAgentsMock = () => ({ data: [{ id: "a1", name: "Security Reviewer" }], isLoading: false });
    renderWithIntl(<StatsTab skill={SKILL} />);
    expect(screen.getByText("1 agent")).toBeInTheDocument();
    expect(screen.getByText("Security Reviewer")).toBeInTheDocument();
  });

  it("renders a placeholder, not a fabricated number, for pull frequency/accept rate/findings", () => {
    useSkillAgentsMock = () => ({ data: [], isLoading: false });
    renderWithIntl(<StatsTab skill={SKILL} />);
    const placeholders = screen.getAllByText("Not enough run history yet");
    // Pull Frequency, Accept Rate, Findings (30D), Findings by category
    expect(placeholders.length).toBeGreaterThanOrEqual(4);
  });

  it("clicking Open on an agent row navigates to that agent's editor", () => {
    useSkillAgentsMock = () => ({ data: [{ id: "agent-42", name: "Test Quality Reviewer" }], isLoading: false });
    renderWithIntl(<StatsTab skill={SKILL} />);
    fireEvent.click(screen.getByText("Open"));
    expect(pushMock).toHaveBeenCalledWith("/agents/agent-42");
  });

  it("shows an empty state when no agent uses this skill", () => {
    useSkillAgentsMock = () => ({ data: [], isLoading: false });
    renderWithIntl(<StatsTab skill={SKILL} />);
    expect(screen.getByText("0 agents")).toBeInTheDocument();
  });
});
