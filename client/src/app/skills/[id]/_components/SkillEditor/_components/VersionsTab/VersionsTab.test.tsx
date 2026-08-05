import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { Skill, SkillVersion } from "@devdigest/shared";
import messages from "../../../../../../../../messages/en/skills.json";

let useSkillVersionsMock: () => { data: SkillVersion[] | undefined; isLoading: boolean };
vi.mock("@/lib/hooks/skills", () => ({
  useSkillVersions: () => useSkillVersionsMock(),
}));

import { VersionsTab } from "./VersionsTab";

afterEach(cleanup);

const SKILL: Skill = {
  id: "sk1",
  name: "pr-quality-rubric",
  description: "",
  type: "rubric",
  source: "manual",
  body: "# Rubric",
  enabled: true,
  version: 2,
};

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ skills: messages }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("Skill VersionsTab (smoke)", () => {
  it("lists versions newest-first, marking only the highest version as current", () => {
    useSkillVersionsMock = () => ({
      data: [
        { skill_id: "sk1", version: 1, body: "v1", created_at: "2026-01-01T00:00:00Z" },
        { skill_id: "sk1", version: 2, body: "v2", created_at: "2026-02-01T00:00:00Z" },
      ],
      isLoading: false,
    });
    renderWithIntl(<VersionsTab skill={SKILL} />);

    const v1Badge = screen.getByText("v1");
    const v2Badge = screen.getByText("v2");
    expect(v1Badge).toBeInTheDocument();
    expect(v2Badge).toBeInTheDocument();
    // v2 (highest) is marked Current; v1 is not.
    expect(v2Badge.closest("div")?.textContent).toContain("Current");
    expect(v1Badge.closest("div")?.textContent).not.toContain("Current");
  });

  it("does NOT render Diff or Restore buttons (deliberately deferred)", () => {
    useSkillVersionsMock = () => ({
      data: [{ skill_id: "sk1", version: 1, body: "v1", created_at: "2026-01-01T00:00:00Z" }],
      isLoading: false,
    });
    renderWithIntl(<VersionsTab skill={SKILL} />);
    expect(screen.queryByText("Diff")).not.toBeInTheDocument();
    expect(screen.queryByText("Restore")).not.toBeInTheDocument();
  });

  it("shows an empty state when there is no version history", () => {
    useSkillVersionsMock = () => ({ data: [], isLoading: false });
    renderWithIntl(<VersionsTab skill={SKILL} />);
    expect(screen.getByText("No version history yet")).toBeInTheDocument();
  });

  it("shows the version count badge next to the title", () => {
    useSkillVersionsMock = () => ({
      data: [
        { skill_id: "sk1", version: 1, body: "v1", created_at: "2026-01-01T00:00:00Z" },
        { skill_id: "sk1", version: 2, body: "v2", created_at: "2026-02-01T00:00:00Z" },
      ],
      isLoading: false,
    });
    renderWithIntl(<VersionsTab skill={SKILL} />);
    expect(screen.getByText("Version history")).toBeInTheDocument();
    expect(screen.getByText("2 versions")).toBeInTheDocument();
  });
});
