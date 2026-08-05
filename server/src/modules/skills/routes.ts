import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { SkillType } from '@devdigest/shared';
import { getContext } from '../_shared/context.js';
import { IdParams } from '../_shared/schemas.js';
import { NotFoundError } from '../../platform/errors.js';
import { SkillsService } from './service.js';

/**
 * A1 — skills module (owner A1).
 *   GET    /skills                   → list (workspace-scoped)
 *   GET    /skills/:id               → one skill
 *   POST   /skills                   → create from a pasted/uploaded markdown body
 *   POST   /skills/import-url        → fetch a body from a URL (created disabled)
 *   GET    /skills/community         → search the community catalog (no persistence)
 *   POST   /skills/import-community  → import a catalog entry (created disabled)
 *   PUT    /skills/:id               → update (name/description/type/body/enabled)
 *   DELETE /skills/:id               → delete
 *   GET    /skills/:id/versions      → body history (newest first)
 *   GET    /skills/:id/versions/:version → one body snapshot
 *   GET    /skills/:id/agents        → agents that have this skill linked
 */

/** `/skills/:id/versions/:version` — id is a uuid, version a positive integer. */
const VersionParams = z.object({
  id: z.string().uuid(),
  version: z.coerce.number().int().positive(),
});

const CreateSkillBody = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  type: SkillType,
  body: z.string().min(1),
});

const UpdateSkillBody = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  type: SkillType.optional(),
  body: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
});

const ImportUrlBody = z.object({
  url: z.string().url(),
  type: SkillType.optional(),
});

const ImportCommunityBody = z.object({
  repo: z.string().min(1),
  type: SkillType.optional(),
});

const CommunitySearchQuery = z.object({ q: z.string().optional() });

export default async function skillsRoutes(appBase: FastifyInstance) {
  const app = appBase.withTypeProvider<ZodTypeProvider>();
  const service = new SkillsService(app.container);

  app.get('/skills', async (req) => {
    const { workspaceId } = await getContext(app.container, req);
    return service.list(workspaceId);
  });

  // Static sub-routes must be registered before `/skills/:id` so Fastify's
  // router doesn't try to parse "community" as a uuid id.
  app.get('/skills/community', { schema: { querystring: CommunitySearchQuery } }, async (req) => {
    await getContext(app.container, req);
    return service.searchCommunity(req.query.q);
  });

  app.post(
    '/skills/import-url',
    { schema: { body: ImportUrlBody } },
    async (req, reply) => {
      const { workspaceId } = await getContext(app.container, req);
      const skill = await service.importFromUrl(workspaceId, req.body);
      reply.status(201);
      return skill;
    },
  );

  app.post(
    '/skills/import-community',
    { schema: { body: ImportCommunityBody } },
    async (req, reply) => {
      const { workspaceId } = await getContext(app.container, req);
      const skill = await service.importFromCommunity(workspaceId, req.body);
      reply.status(201);
      return skill;
    },
  );

  app.get('/skills/:id', { schema: { params: IdParams } }, async (req) => {
    const { workspaceId } = await getContext(app.container, req);
    const skill = await service.get(workspaceId, req.params.id);
    if (!skill) throw new NotFoundError('Skill not found');
    return skill;
  });

  app.post('/skills', { schema: { body: CreateSkillBody } }, async (req, reply) => {
    const { workspaceId } = await getContext(app.container, req);
    const skill = await service.create(workspaceId, req.body);
    reply.status(201);
    return skill;
  });

  app.put(
    '/skills/:id',
    { schema: { params: IdParams, body: UpdateSkillBody } },
    async (req) => {
      const { workspaceId } = await getContext(app.container, req);
      const skill = await service.update(workspaceId, req.params.id, req.body);
      if (!skill) throw new NotFoundError('Skill not found');
      return skill;
    },
  );

  app.delete('/skills/:id', { schema: { params: IdParams } }, async (req) => {
    const { workspaceId } = await getContext(app.container, req);
    const ok = await service.delete(workspaceId, req.params.id);
    if (!ok) throw new NotFoundError('Skill not found');
    return { ok: true };
  });

  app.get('/skills/:id/versions', { schema: { params: IdParams } }, async (req) => {
    const { workspaceId } = await getContext(app.container, req);
    const versions = await service.listVersions(workspaceId, req.params.id);
    if (!versions) throw new NotFoundError('Skill not found');
    return versions;
  });

  app.get(
    '/skills/:id/versions/:version',
    { schema: { params: VersionParams } },
    async (req) => {
      const { workspaceId } = await getContext(app.container, req);
      const version = await service.getVersion(workspaceId, req.params.id, req.params.version);
      if (!version) throw new NotFoundError('Skill version not found');
      return version;
    },
  );

  app.get('/skills/:id/agents', { schema: { params: IdParams } }, async (req) => {
    const { workspaceId } = await getContext(app.container, req);
    const agents = await service.agentsUsing(workspaceId, req.params.id);
    if (!agents) throw new NotFoundError('Skill not found');
    return agents;
  });
}
