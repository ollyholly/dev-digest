import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { EnsureIntentResponse, PrIntentRecord } from '@devdigest/shared';
import { getContext } from '../_shared/context.js';
import { IdParams } from '../_shared/schemas.js';
import { NotFoundError } from '../../platform/errors.js';
import { IntentService } from './service.js';

const EnsureIntentBody = z.object({
  force: z.boolean().optional(),
});

/**
 * Intent module — derive / cache / regenerate PR intent.
 *   GET  /pulls/:id/intent → PrIntentRecord | 404
 *   POST /pulls/:id/intent → EnsureIntentResponse ({ force?: boolean })
 */
export default async function intentRoutes(appBase: FastifyInstance) {
  const app = appBase.withTypeProvider<ZodTypeProvider>();
  const service = new IntentService(app.container);

  app.get(
    '/pulls/:id/intent',
    { schema: { params: IdParams, response: { 200: PrIntentRecord } } },
    async (req) => {
      const { workspaceId } = await getContext(app.container, req);
      const cached = await service.getCached(workspaceId, req.params.id);
      if (!cached) throw new NotFoundError('Intent not found');
      return cached;
    },
  );

  app.post(
    '/pulls/:id/intent',
    {
      schema: {
        params: IdParams,
        body: EnsureIntentBody,
        response: { 200: EnsureIntentResponse },
      },
    },
    async (req) => {
      const { workspaceId } = await getContext(app.container, req);
      return service.ensureIntent(
        req.params.id,
        workspaceId,
        req.body?.force ?? false,
        req.log,
      );
    },
  );
}
