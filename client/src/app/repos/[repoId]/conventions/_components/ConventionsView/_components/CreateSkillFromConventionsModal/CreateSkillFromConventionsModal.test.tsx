import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ConventionSkillDraftResult } from "@devdigest/shared";
import messages from "../../../../../../../../../messages/en/conventions.json";

const mocks = vi.hoisted(() => ({
  draftData: null as ConventionSkillDraftResult | null,
  mutateAsync: vi.fn(),
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock("@/lib/hooks/conventions", () => ({
  useConventionSkillDraft: () => ({
    data: mocks.draftData,
    isLoading: false,
    isError: false,
    error: null,
  }),
  usePromoteConventions: () => ({
    mutateAsync: mocks.mutateAsync,
    isPending: false,
  }),
}));

import { CreateSkillFromConventionsModal } from "./CreateSkillFromConventionsModal";

const INITIAL_DRAFT: ConventionSkillDraftResult = {
  mode: "merged",
  repo_name: "acme/payments-api",
  drafts: [
    {
      name: "acme/payments-api conventions",
      description: "House conventions extracted from acme/payments-api.",
      type: "convention",
      body: "# Payments conventions\n\nUse typed errors.",
      evidence_files: ["src/services/payments.ts"],
      accepted_count: 2,
      category: null,
    },
  ],
};

function ModalWithIntl({ onClose }: { onClose: () => void }) {
  return (
    <NextIntlClientProvider locale="en" messages={{ conventions: messages }}>
      <CreateSkillFromConventionsModal
        repoId="repo-1"
        repoName="acme/payments-api"
        acceptedCount={2}
        hasMultipleCategories={false}
        onClose={onClose}
      />
    </NextIntlClientProvider>
  );
}

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.draftData = INITIAL_DRAFT;
  mocks.mutateAsync.mockResolvedValue({
    skills: [{ id: "skill-1" }],
  });
});

describe("CreateSkillFromConventionsModal", () => {
  it("keeps user edits when a late draft arrives and promotes the edited body", async () => {
    const onClose = vi.fn();
    const view = render(<ModalWithIntl onClose={onClose} />);
    const name = await screen.findByRole("textbox", { name: /Name/ });
    const body = screen.getByRole("textbox", { name: /Skill body/ });

    fireEvent.change(name, { target: { value: "payments-house-rules" } });
    fireEvent.change(body, { target: { value: "# Edited rules\n\nKeep this text." } });

    mocks.draftData = {
      ...INITIAL_DRAFT,
      drafts: [
        {
          ...INITIAL_DRAFT.drafts[0]!,
          name: "late-server-name",
          body: "# Late server body",
        },
      ],
    };
    view.rerender(<ModalWithIntl onClose={onClose} />);

    expect(screen.getByRole("textbox", { name: /Name/ })).toHaveValue("payments-house-rules");
    expect(screen.getByRole("textbox", { name: /Skill body/ })).toHaveValue(
      "# Edited rules\n\nKeep this text.",
    );

    fireEvent.click(screen.getByRole("button", { name: "Create skill" }));

    await waitFor(() => {
      expect(mocks.mutateAsync).toHaveBeenCalledWith({
        mode: "merged",
        drafts: [
          {
            name: "payments-house-rules",
            description: "House conventions extracted from acme/payments-api.",
            body: "# Edited rules\n\nKeep this text.",
            enabled: true,
            category: null,
          },
        ],
      });
    });
    expect(onClose).toHaveBeenCalledOnce();
    expect(mocks.push).toHaveBeenCalledWith("/skills/skill-1?tab=config");
  });
});
