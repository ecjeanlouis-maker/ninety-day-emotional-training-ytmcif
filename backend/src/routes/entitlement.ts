import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { computeEntitlement } from '../lib/entitlement.js';

export function registerEntitlementRoutes(app: App) {
  const requireAuth = app.requireAuth();

  app.fastify.get('/api/entitlement', {
    schema: {
      description: 'Get normalized entitlement state for the authenticated user',
      tags: ['entitlement'],
      response: {
        200: {
          type: 'object',
          properties: {
            is_premium: { type: 'boolean' },
            status: { type: 'string' },
            valid_until: { type: ['string', 'null'] },
            reason: { type: 'string' },
            days_1_7_access: { type: 'boolean' },
            days_8_90_access: { type: 'boolean' },
          },
        },
        401: { type: 'object', properties: { error: { type: 'string' } } },
        404: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    app.logger.info({ path: '/api/entitlement' }, 'GET /api/entitlement');
    const session = await requireAuth(request, reply);
    if (!session) return;

    const rows = await app.db
      .select()
      .from(schema.userProfiles)
      .where(eq(schema.userProfiles.userId, session.user.id));

    if (rows.length === 0) {
      app.logger.info({ userId: session.user.id }, 'No profile found, returning default free entitlement');
      return reply.send({
        is_premium: false,
        status: 'free',
        valid_until: null,
        reason: 'no_profile',
        days_1_7_access: true,
        days_8_90_access: false,
      });
    }

    const entitlement = computeEntitlement(rows[0]);
    app.logger.info({ userId: session.user.id, entitlement }, 'Entitlement computed');
    return reply.send({
      is_premium: entitlement.isPremium,
      status: entitlement.status,
      valid_until: entitlement.validUntil,
      reason: entitlement.reason,
      days_1_7_access: true,
      days_8_90_access: entitlement.isPremium,
    });
  });
}
