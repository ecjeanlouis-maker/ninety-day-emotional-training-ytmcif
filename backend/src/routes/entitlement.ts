import type { FastifyRequest, FastifyReply } from 'fastify';
import type { App } from '../index.js';
import { resolveEntitlement } from '../lib/entitlement.js';

export function registerEntitlementRoutes(app: App) {
  const requireAuth = app.requireAuth();

  app.fastify.get(
    '/api/entitlement',
    {
      schema: {
        description: 'Get normalized entitlement state for the authenticated user',
        tags: ['entitlement'],
        response: {
          200: {
            type: 'object',
            properties: {
              isPremium: { type: 'boolean' },
              status: { type: 'string' },
              validUntil: { type: 'string', nullable: true },
              reason: { type: 'string' },
              days_1_7_access: { type: 'boolean' },
              days_8_90_access: { type: 'boolean' },
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, '[entitlement] GET /api/entitlement');
      const result = await resolveEntitlement(app, session.user.id);
      return reply.send(result);
    }
  );
}
