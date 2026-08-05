import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../../../../../../messages/en/settings.json";

const mutateAsync = vi.fn();
vi.mock("../../../../../../../lib/hooks", () => ({
  useTestConnection: () => ({ mutateAsync, isPending: false }),
  useSecretsStatus: () => ({ data: { openai: true, anthropic: false } }),
}));

import { SettingsApiKeys } from "./SettingsApiKeys";

afterEach(cleanup);

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ settings: messages }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("SettingsApiKeys (smoke)", () => {
  it("renders one row per provider with its configured/not-set status", () => {
    renderWithIntl(<SettingsApiKeys />);
    expect(screen.getByText("OpenAI API key")).toBeInTheDocument();
    expect(screen.getByText("GitHub PAT (fine-grained)")).toBeInTheDocument();
    expect(screen.getByText("Configured")).toBeInTheDocument();
    expect(screen.getByText("Not set")).toBeInTheDocument();
  });

  it("tests a connection and renders the result", async () => {
    mutateAsync.mockResolvedValueOnce({ ok: true, message: "Connected as octocat" });
    renderWithIntl(<SettingsApiKeys />);
    const [firstTestButton] = screen.getAllByText("Test connection");
    fireEvent.click(firstTestButton!);
    await waitFor(() => expect(screen.getByText("Connected as octocat")).toBeInTheDocument());
    expect(mutateAsync).toHaveBeenCalledWith({ provider: "openai", key: undefined });
  });
});
