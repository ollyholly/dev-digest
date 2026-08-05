import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../../../../../../messages/en/settings.json";

const update = { mutate: vi.fn() };
vi.mock("../../../../../../../lib/hooks", () => ({
  useSettings: () => ({ data: { feature_models: {} } }),
  useUpdateSettings: () => update,
}));
vi.mock("../../../../../../../lib/hooks/agents", () => ({
  useProviderModels: () => ({ data: [] }),
}));

import { SettingsModels } from "./SettingsModels";

afterEach(cleanup);

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ settings: messages }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("SettingsModels (smoke)", () => {
  it("renders one picker per feature, tagged 'default' when unset", () => {
    renderWithIntl(<SettingsModels />);
    expect(screen.getByText("Onboarding Tour")).toBeInTheDocument();
    expect(screen.getByText("PR Review · Intent")).toBeInTheDocument();
    expect(screen.getAllByText("default").length).toBeGreaterThan(0);
  });

  it("shows the no-key note when the OpenRouter model list is empty", () => {
    renderWithIntl(<SettingsModels />);
    expect(
      screen.getByText("Add an OpenRouter API key under API Keys to load the model list and prices."),
    ).toBeInTheDocument();
  });
});
