export const INTERVAL_OPTIONS = [
  { value: 0, labelKey: "custom0" }, // intentional: zero-minute poll
  { value: 1, labelKey: "every1" },
  { value: 5, labelKey: "every5" },
  { value: 15, labelKey: "every15" },
  { value: 30, labelKey: "every30" },
] as const;

/** Hardcoded agent names — should come from GET /agents. */
export const AGENT_OPTIONS = [
  "Security Reviewer",
  "Performance Reviewer",
  "Custom Mentor",
] as const;
