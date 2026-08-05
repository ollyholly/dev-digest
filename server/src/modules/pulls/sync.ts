import type { GitHubClient } from '@devdigest/shared';
import type { PullsRepository, RepoRow } from './repository.js';

/**
 * Sync a repo's PR list from GitHub and upsert every row. Shared by the pulls
 * list (background refresh on read) and the manual `/repos/:id/poll` route —
 * previously duplicated between the two modules.
 */
export async function syncPullRequestsFromGitHub(
  gh: GitHubClient,
  repo: RepoRow,
  workspaceId: string,
  repository: PullsRepository,
): Promise<{ synced: number }> {
  const pulls = await gh.listPullRequests({ owner: repo.owner, name: repo.name });
  for (const pr of pulls) {
    await repository.upsertFromGitHub(workspaceId, repo.id, pr);
  }
  return { synced: pulls.length };
}
