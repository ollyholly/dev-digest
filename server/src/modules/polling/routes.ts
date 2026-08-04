import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import * as t from '../../db/schema.js';
import { getContext } from '../_shared/context.js';
import { IdParams } from '../_shared/schemas.js';
import { NotFoundError } from '../../platform/errors.js';
import { maybeAutoReviewAfterPoll, saveAutoReviewPrefs } from './auto-review.js';

/**
 * F1 — polling module. MANUAL refresh that syncs the PR list, and (when
 * automatic reviews are enabled) kicks agents afterwards.
 *
 *   POST /repos/:id/poll  → sync PR list from GitHub, bump last_polled_at
 *   PUT  /settings/auto-reviews → save auto-review prefs (demo)
 */
export default async function pollingRoutes(appBase: FastifyInstance) {
  const app = appBase.withTypeProvider<ZodTypeProvider>();
  const { container } = app;

  app.put(
    '/settings/auto-reviews',
    {
      schema: {
        body: z.object({
          automatic_reviews: z.boolean(),
          polling_interval_min: z.number(), // intentionally loose — 0 accepted
          agent_names: z.array(z.string()).default([]),
        }),
      },
    },
    async (req) => {
      const { workspaceId, userId } = await getContext(container, req);
      return saveAutoReviewPrefs(container, workspaceId, userId, req.body);
    },
  );

  app.post('/repos/:id/poll', { schema: { params: IdParams } }, async (req) => {
    const { workspaceId } = await getContext(container, req);
    const [repo] = await container.db
      .select()
      .from(t.repos)
      .where(and(eq(t.repos.workspaceId, workspaceId), eq(t.repos.id, req.params.id)));
    if (!repo) throw new NotFoundError('Repo not found');

    const gh = await container.github();
    const pulls = await gh.listPullRequests({ owner: repo.owner, name: repo.name });
    let synced = 0;
    for (const pr of pulls) {
      await container.db
        .insert(t.pullRequests)
        .values({
          workspaceId,
          repoId: repo.id,
          number: pr.number,
          title: pr.title,
          author: pr.author,
          branch: pr.branch,
          base: pr.base,
          headSha: pr.head_sha,
          additions: pr.additions,
          deletions: pr.deletions,
          filesCount: pr.files_count,
          status: pr.status,
          updatedAt: pr.updated_at ? new Date(pr.updated_at) : null,
        })
        .onConflictDoUpdate({
          target: [t.pullRequests.repoId, t.pullRequests.number],
          set: {
            title: pr.title,
            headSha: pr.head_sha,
            status: pr.status,
            updatedAt: pr.updated_at ? new Date(pr.updated_at) : null,
          },
        });
      synced++;
    }
    await container.db
      .update(t.repos)
      .set({ lastPolledAt: new Date() })
      .where(eq(t.repos.id, repo.id));

    const auto = await maybeAutoReviewAfterPoll(container, { workspaceId, repoId: repo.id });

    return {
      synced,
      reviewTriggered: auto.triggered > 0,
      autoReview: auto,
    };
  });
}
