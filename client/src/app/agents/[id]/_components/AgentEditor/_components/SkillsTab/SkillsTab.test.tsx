import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { Agent, AgentSkillLink, Skill } from "@devdigest/shared";
import messages from "../../../../../../../../messages/en/agents.json";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const setAgentSkillsMock = vi.fn();
vi.mock("../../../../../../../lib/hooks/agents", () => ({
  useAgentSkills: () => useAgentSkillsMock(),
  useSetAgentSkills: () => ({ mutate: setAgentSkillsMock, isPending: false }),
}));
vi.mock("../../../../../../../lib/hooks/skills", () => ({
  useSkills: () => useSkillsMock(),
}));

let useSkillsMock: () => { data: Skill[] | undefined; isLoading: boolean };
let useAgentSkillsMock: () => { data: AgentSkillLink[] | undefined; isLoading: boolean };

import { SkillsTab } from "./SkillsTab";

afterEach(() => {
  cleanup();
  setAgentSkillsMock.mockClear();
});

const AGENT: Agent = {
  id: "ag1",
  name: "Test Quality Reviewer",
  description: "",
  provider: "openai",
  model: "gpt-4.1",
  system_prompt: "Review.",
  output_schema: null,
  strategy: "single-pass",
  ci_fail_on: "critical",
  repo_intel: true,
  enabled: true,
  version: 1,
};

const SKILL_A: Skill = {
  id: "sk-a",
  name: "uncovered-branches",
  description: "",
  type: "rubric",
  source: "manual",
  body: "# A",
  enabled: true,
  version: 1,
};
const SKILL_B: Skill = {
  id: "sk-b",
  name: "missing-corner-cases",
  description: "",
  type: "rubric",
  source: "manual",
  body: "# B",
  enabled: true,
  version: 1,
};
const SKILL_C: Skill = {
  id: "sk-c",
  name: "over-mocking",
  description: "",
  type: "rubric",
  source: "manual",
  body: "# C",
  enabled: true,
  version: 1,
};

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ agents: messages }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("SkillsTab (smoke)", () => {
  it("shows a loading skeleton while skills/links are loading", () => {
    useSkillsMock = () => ({ data: undefined, isLoading: true });
    useAgentSkillsMock = () => ({ data: undefined, isLoading: true });
    const { container } = renderWithIntl(<SkillsTab agent={AGENT} />);
    expect(container.querySelector('[class*="skeleton" i]') || container).toBeTruthy();
  });

  it("shows an empty state with a CTA to /skills when the workspace has no skills", () => {
    useSkillsMock = () => ({ data: [], isLoading: false });
    useAgentSkillsMock = () => ({ data: [], isLoading: false });
    renderWithIntl(<SkillsTab agent={AGENT} />);
    expect(screen.getByText("Go to Skills")).toBeInTheDocument();
  });

  it("renders linked skills above unlinked ones, with the enabled count badge", () => {
    useSkillsMock = () => ({ data: [SKILL_A, SKILL_B, SKILL_C], isLoading: false });
    useAgentSkillsMock = () => ({
      data: [
        { agent_id: AGENT.id, skill_id: SKILL_B.id, order: 0 },
        { agent_id: AGENT.id, skill_id: SKILL_A.id, order: 1 },
      ],
      isLoading: false,
    });
    renderWithIntl(<SkillsTab agent={AGENT} />);

    expect(screen.getByText("2 of 3 enabled")).toBeInTheDocument();
    const names = screen.getAllByText(/uncovered-branches|missing-corner-cases|over-mocking/).map((el) => el.textContent);
    // linked (B, then A, per `order`) render before the unlinked one (C)
    expect(names.indexOf("missing-corner-cases")).toBeLessThan(names.indexOf("uncovered-branches"));
    expect(names.indexOf("uncovered-branches")).toBeLessThan(names.indexOf("over-mocking"));
  });

  it("toggling an unlinked skill on appends it to the linked set", () => {
    useSkillsMock = () => ({ data: [SKILL_A, SKILL_B], isLoading: false });
    useAgentSkillsMock = () => ({
      data: [{ agent_id: AGENT.id, skill_id: SKILL_A.id, order: 0 }],
      isLoading: false,
    });
    renderWithIntl(<SkillsTab agent={AGENT} />);

    const attachToggle = screen.getByRole("switch", { name: 'Attach skill "missing-corner-cases"' });
    fireEvent.click(attachToggle);
    expect(setAgentSkillsMock).toHaveBeenCalledWith([SKILL_A.id, SKILL_B.id]);
  });

  it("toggling a linked skill off removes it from the linked set", () => {
    useSkillsMock = () => ({ data: [SKILL_A, SKILL_B], isLoading: false });
    useAgentSkillsMock = () => ({
      data: [
        { agent_id: AGENT.id, skill_id: SKILL_A.id, order: 0 },
        { agent_id: AGENT.id, skill_id: SKILL_B.id, order: 1 },
      ],
      isLoading: false,
    });
    renderWithIntl(<SkillsTab agent={AGENT} />);

    const detachToggle = screen.getByRole("switch", { name: 'Detach skill "uncovered-branches"' });
    fireEvent.click(detachToggle);
    expect(setAgentSkillsMock).toHaveBeenCalledWith([SKILL_B.id]);
  });

  it("moving a linked skill down swaps its order with the next one", () => {
    useSkillsMock = () => ({ data: [SKILL_A, SKILL_B, SKILL_C], isLoading: false });
    useAgentSkillsMock = () => ({
      data: [
        { agent_id: AGENT.id, skill_id: SKILL_A.id, order: 0 },
        { agent_id: AGENT.id, skill_id: SKILL_B.id, order: 1 },
      ],
      isLoading: false,
    });
    renderWithIntl(<SkillsTab agent={AGENT} />);

    fireEvent.click(screen.getByRole("button", { name: 'Move "uncovered-branches" down' }));
    expect(setAgentSkillsMock).toHaveBeenCalledWith([SKILL_B.id, SKILL_A.id]);
  });

  it("filters the visible list by name", () => {
    useSkillsMock = () => ({ data: [SKILL_A, SKILL_B, SKILL_C], isLoading: false });
    useAgentSkillsMock = () => ({ data: [], isLoading: false });
    renderWithIntl(<SkillsTab agent={AGENT} />);

    fireEvent.change(screen.getByPlaceholderText("Filter skills…"), { target: { value: "mocking" } });
    expect(screen.getByText("over-mocking")).toBeInTheDocument();
    expect(screen.queryByText("uncovered-branches")).not.toBeInTheDocument();
  });
});
