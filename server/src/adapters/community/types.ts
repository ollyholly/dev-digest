import type { CommunitySkill } from '@devdigest/shared';

/**
 * Port for the community skill catalog (Skills Lab "Search community
 * skills…" import path). A fixed/allowlisted list, not a live crawl —
 * importing from it still goes through `SkillsService.importFromUrl`'s fetch
 * + size-cap + always-disabled rules, this port only supplies the searchable
 * metadata (name/repo/stars/lang/desc) shown in the picker.
 */
export interface CommunityCatalog {
  /** Case-insensitive substring match over name/desc/lang; empty/undefined query returns all. */
  search(query?: string): Promise<CommunitySkill[]>;
}
