import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RunCostBadge } from "./RunCostBadge";
import { formatUsd } from "./helpers";

describe("formatUsd", () => {
  it("returns an em dash when cost is missing (never $0.00)", () => {
    expect(formatUsd(null)).toBe("—");
    expect(formatUsd(undefined)).toBe("—");
  });

  it("uses 3 decimals for typical costs and 4 for sub-cent amounts", () => {
    expect(formatUsd(0.014)).toBe("$0.014");
    expect(formatUsd(0.0013)).toBe("$0.0013");
  });
});

describe("RunCostBadge", () => {
  it("compact variant renders $ or —", () => {
    const { rerender } = render(<RunCostBadge costUsd={0.014} variant="compact" />);
    expect(screen.getByText("$0.014")).toBeInTheDocument();
    rerender(<RunCostBadge costUsd={null} variant="compact" />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("withTokens variant shows tok · cost, or — when cost is unknown", () => {
    render(
      <RunCostBadge costUsd={0.0013} tokensIn={8000} tokensOut={1119} variant="withTokens" />,
    );
    expect(screen.getByText(/9,119 tok/)).toBeInTheDocument();
    expect(screen.getByText(/\$0\.0013/)).toBeInTheDocument();
  });
});
