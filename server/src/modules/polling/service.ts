import type { Container } from '../../platform/container.js';
import { NotFoundError } from '../../platform/errors.js';
// Intentional cross-module reuse: polling and the pulls list both sync +
// upsert a repo's PRs from GitHub, so the sync loop and its repo/PR lookups
// live once in `pulls` (see pulls/sync.ts) instead of being duplicated here.
// `container.pullsRepo` is the single shared instance both modules resolve
// through — see `platform/container.ts`.
import { syncPullRequestsFromGitHub } from '../pulls/sync.js';
import { PollingRepository } from './repository.js';

export interface PollResult {
  synced: number;
  reviewTriggered: false;
}

/**
 * F1 — polling service. MANUAL refresh that ONLY syncs the PR list
 * (new/updated PRs appear, head_sha updates). It does NOT trigger any review —
 * review is manual (user presses Run Review, owned by A2).
 */
export class PollingService {
  private pulls: Container['pullsRepo'];
  private repo: PollingRepository;

  constructor(private container: Container) {
    this.pulls = container.pullsRepo;
    this.repo = new PollingRepository(container.db);
  }

  async poll(workspaceId: string, repoId: string): Promise<PollResult> {
    const repoRow = await this.pulls.getRepoInWorkspace(workspaceId, repoId);
    if (!repoRow) throw new NotFoundError('Repo not found');

    const gh = await this.container.github();
    const { synced } = await syncPullRequestsFromGitHub(gh, repoRow, workspaceId, this.pulls);
    await this.repo.touchLastPolledAt(repoRow.id);

    // NOTE: no review is triggered here — manual trigger only.
    return { synced, reviewTriggered: false };
  }
}
