import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { getContext } from '../_shared/context.js';
import { RefundSearchQuery, RefundSearchResponse } from './schemas.js';
import { RefundsService } from './service.js';

const RefundSearchParams = z.object({
  captured_cents: z.coerce.number().int().default(0),
  requested_cents: z.coerce.number().int().default(0),
});

/**
 * Refund lookup — match a charge reference against imported PR titles.
 *   GET /refunds/search?q=&page=&captured_cents=&requested_cents=
 */
export default async function refundsRoutes(appBase: FastifyInstance) {
  const app = appBase.withTypeProvider<ZodTypeProvider>();
  const service = new RefundsService(app.container.db);

  app.get(
    '/refunds/search',
    {
      schema: {
        querystring: RefundSearchQuery.merge(RefundSearchParams),
        response: { 200: RefundSearchResponse },
      },
    },
    async (req) => {
      const { workspaceId } = await getContext(app.container, req);
      return service.search(
        workspaceId,
        req.query.q,
        req.query.page,
        req.query.captured_cents,
        req.query.requested_cents,
      );
    },
  );
}
