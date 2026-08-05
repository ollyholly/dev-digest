import type { CommunitySkill } from '@devdigest/shared';
import type { CommunityCatalog } from './types.js';

/**
 * Fixed allowlist of community skills. No live registry exists yet — this is
 * the same "curated, not crawled" trust boundary as the rest of the import
 * paths: every entry here is a repo a maintainer has vetted enough to list,
 * but the imported BODY is still fetched fresh and stored disabled until a
 * human enables it (see SkillsService.importFromCommunity).
 */
const CATALOG: CommunitySkill[] = [
  {
    name: 'secret-leakage-gate',
    repo: 'devdigest-community/secret-leakage-gate',
    stars: 412,
    lang: 'any',
    desc: 'Detects sk_live_, service_role, and other hardcoded credential patterns in a diff.',
  },
  {
    name: 'lethal-trifecta',
    repo: 'devdigest-community/lethal-trifecta',
    stars: 298,
    lang: 'any',
    desc: 'Flags PRs combining private data access, untrusted input, and an external sink.',
  },
  {
    name: 'phantom-api-gate',
    repo: 'devdigest-community/phantom-api-gate',
    stars: 87,
    lang: 'typescript',
    desc: 'Detects imports of functions/modules that do not exist in the diff or repo.',
  },
  {
    name: 'no-then-chains',
    repo: 'devdigest-community/no-then-chains',
    stars: 64,
    lang: 'javascript',
    desc: 'House rule: always use async/await instead of .then() promise chains.',
  },
];

export class StaticCommunityCatalog implements CommunityCatalog {
  constructor(private catalog: CommunitySkill[] = CATALOG) {}

  async search(query?: string): Promise<CommunitySkill[]> {
    const q = query?.trim().toLowerCase();
    if (!q) return this.catalog;
    return this.catalog.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.desc.toLowerCase().includes(q) ||
        s.lang.toLowerCase().includes(q),
    );
  }
}
