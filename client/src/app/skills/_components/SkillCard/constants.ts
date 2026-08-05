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
  rubric: "var(--info)",
  convention: "var(--ok)",
  security: "var(--crit)",
  custom: "var(--text-secondary)",
};
