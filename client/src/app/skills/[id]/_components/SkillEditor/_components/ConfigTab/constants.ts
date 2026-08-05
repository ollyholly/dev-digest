import type { SkillType } from "@devdigest/shared";

/** SkillType select options, in display order — labels resolve via
 *  `t("listItem.type.<value>")`. */
export const SKILL_TYPE_VALUES: readonly SkillType[] = ["rubric", "convention", "security", "custom"];
