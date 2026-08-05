/** Sub-tabs of the Add Skill drawer, matching skills.json's `drawer.tabs`. */
export const IMPORT_TABS = ["file", "url", "community"] as const;
export type ImportTab = (typeof IMPORT_TABS)[number];

export const DEFAULT_SKILL_TYPE = "custom" as const;
