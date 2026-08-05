import type { IconName } from "@devdigest/ui";
import type { SkillType } from "@devdigest/shared";

/** Icon + accent color per skill type — same glyph used on the card, the
 *  detail-page header, and the Agent editor's Skills tab list. */
export const TYPE_ICON: Record<SkillType, IconName> = {
  rubric: "FileText",
  convention: "ListChecks",
  security: "Shield",
  custom: "Wrench",
};

export const TYPE_COLOR: Record<SkillType, string> = {
  // `--info` (a muted gray, shared with severity badges elsewhere) reads as
  // near-monochrome next to convention/security's saturated colors — use the
  // brand accent blue instead so rubric is visually distinct in the list.
  rubric: "var(--accent)",
  convention: "var(--ok)",
  security: "var(--crit)",
  custom: "var(--text-secondary)",
};
