import type { SmartDiffRole } from "@devdigest/shared";

export const ROLE_LABEL_KEY = {
  core: "coreLabel",
  wiring: "wiringLabel",
  boilerplate: "boilerplateLabel",
} as const satisfies Record<SmartDiffRole, string>;

export const ROLE_SUBTITLE_KEY = {
  core: "coreSubtitle",
  wiring: "wiringSubtitle",
  boilerplate: "boilerplateSubtitle",
} as const satisfies Record<SmartDiffRole, string>;

export const ROLE_COLOR: Record<SmartDiffRole, string> = {
  core: "var(--accent)",
  wiring: "var(--warn)",
  boilerplate: "var(--text-muted)",
};
