import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { SmartDiff } from '@devdigest/shared';
import { getContext } from '../_shared/context.js';
import { IdParams } from '../_shared/schemas.js';
import { SmartDiffService } from './service.js';

/**
 * Smart Diff module — classify a PR's files into core / wiring / boilerplate.
 *   GET /pulls/:id/smart-diff → SmartDiff
 */
export default async function smartDiffRoutes(appBase: FastifyInstance) {
  const app = appBase.withTypeProvider<ZodTypeProvider>();
  const service = new SmartDiffService(app.container);

  app.get(
    '/pulls/:id/smart-diff',
    { schema: { params: IdParams, response: { 200: SmartDiff } } },
    async (req) => {
      const { workspaceId } = await getContext(app.container, req);
      return service.getSmartDiff(workspaceId, req.params.id);
    },
  );
}
